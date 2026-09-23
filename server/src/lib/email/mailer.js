import net from "net";
import tls from "tls";
import config from "../../config/env.js";

const waitForResponse = (socket) =>
  new Promise((resolve, reject) => {
    let buffer = "";
    const onData = (chunk) => {
      buffer += chunk.toString("utf8");
      const lines = buffer.split(/\r?\n/);
      if (lines.length < 2) return;
      const complete = lines[lines.length - 2];
      if (/^\d{3} /.test(complete)) {
        cleanup();
        resolve({ code: Number(complete.slice(0, 3)), text: buffer.trim() });
      }
    };
    const onError = (err) => { cleanup(); reject(err); };
    const cleanup = () => {
      socket.off("data", onData);
      socket.off("error", onError);
    };
    socket.on("data", onData);
    socket.on("error", onError);
  });

const sendCommand = async (socket, command, expectedCodes) => {
  socket.write(`${command}\r\n`);
  const response = await waitForResponse(socket);
  if (!expectedCodes.includes(response.code)) {
    throw new Error(`SMTP ${response.code}: ${response.text}`);
  }
  return response;
};

const connect = () => new Promise((resolve, reject) => {
  const options = {
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    ...(config.SMTP_SECURE ? { servername: config.SMTP_HOST } : {}),
  };
  const socket = config.SMTP_SECURE ? tls.connect(options) : net.connect(options);
  socket.once("connect", () => resolve(socket));
  socket.once("secureConnect", () => resolve(socket));
  socket.once("error", reject);
});

const escapeHeader = (value) => String(value).replace(/[\r\n]/g, " ");
const encodeSubject = (subject) => `=?UTF-8?B?${Buffer.from(subject, "utf8").toString("base64")}?=`;

export const sendEmail = async ({ to, subject, html, text }) => {
  if (!config.SMTP_HOST || !config.SMTP_USER || !config.SMTP_PASS) {
    throw new Error("Email service is not configured. Set SMTP_HOST, SMTP_USER and SMTP_PASS.");
  }

  const socket = await connect();
  socket.setTimeout(15000);

  try {
    const greeting = await waitForResponse(socket);
    if (greeting.code !== 220) throw new Error(`SMTP ${greeting.code}: ${greeting.text}`);

    await sendCommand(socket, `EHLO ${escapeHeader(config.SMTP_HOST)}`, [250]);

    if (!config.SMTP_SECURE) {
      await sendCommand(socket, "STARTTLS", [220]);
      const secureSocket = tls.connect({ socket, servername: config.SMTP_HOST });
      await new Promise((resolve, reject) => {
        secureSocket.once("secureConnect", resolve);
        secureSocket.once("error", reject);
      });
      await sendCommand(secureSocket, `EHLO ${escapeHeader(config.SMTP_HOST)}`, [250]);
      await sendCommand(secureSocket, "AUTH LOGIN", [334]);
      await sendCommand(secureSocket, Buffer.from(config.SMTP_USER).toString("base64"), [334]);
      await sendCommand(secureSocket, Buffer.from(config.SMTP_PASS).toString("base64"), [235]);
      await sendCommand(secureSocket, `MAIL FROM:<${escapeHeader(config.SMTP_USER)}>`, [250]);
      await sendCommand(secureSocket, `RCPT TO:<${escapeHeader(to)}>`, [250, 251]);
      await sendCommand(secureSocket, "DATA", [354]);
      secureSocket.write(buildMessage({ to, subject, html, text }));
      secureSocket.write("\r\n.\r\n");
      await waitForResponse(secureSocket);
      await sendCommand(secureSocket, "QUIT", [221]);
      secureSocket.end();
      return;
    }

    await sendCommand(socket, "AUTH LOGIN", [334]);
    await sendCommand(socket, Buffer.from(config.SMTP_USER).toString("base64"), [334]);
    await sendCommand(socket, Buffer.from(config.SMTP_PASS).toString("base64"), [235]);
    await sendCommand(socket, `MAIL FROM:<${escapeHeader(config.SMTP_USER)}>`, [250]);
    await sendCommand(socket, `RCPT TO:<${escapeHeader(to)}>`, [250, 251]);
    await sendCommand(socket, "DATA", [354]);
    socket.write(buildMessage({ to, subject, html, text }));
    socket.write("\r\n.\r\n");
    await waitForResponse(socket);
    await sendCommand(socket, "QUIT", [221]);
  } finally {
    socket.destroy();
  }
};

const buildMessage = ({ to, subject, html, text }) => {
  const boundary = `----=_SoloLeveling_${Date.now().toString(36)}`;
  const body = [
    `From: ${escapeHeader(config.EMAIL_FROM)}`,
    `To: ${escapeHeader(to)}`,
    `Subject: ${encodeSubject(subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    text,
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    html,
    `--${boundary}--`,
  ].join("\r\n");

  // SMTP requires lines beginning with a dot to be dot-stuffed.
  return body.replace(/^\./gm, "..");
};

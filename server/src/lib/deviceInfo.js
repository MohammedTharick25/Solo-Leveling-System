const firstMatch = (ua, patterns, fallback) => {
  for (const [regex, value] of patterns) {
    if (regex.test(ua)) return typeof value === "function" ? value(ua) : value;
  }
  return fallback;
};

export const getClientIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) return String(forwarded).split(",")[0].trim();
  return req.ip || req.socket?.remoteAddress || "Unknown";
};

export const parseDeviceInfo = (userAgent = "") => {
  const ua = String(userAgent);
  const browser = firstMatch(
    ua,
    [
      [/Edg\//i, "Microsoft Edge"],
      [/OPR\//i, "Opera"],
      [/Chrome\//i, "Chrome"],
      [/Firefox\//i, "Firefox"],
      [/Safari\//i, "Safari"],
      [/MSIE|Trident/i, "Internet Explorer"],
    ],
    "Unknown browser",
  );

  let os = firstMatch(
    ua,
    [
      [/Windows NT 10/i, "Windows 10/11"],
      [/Windows NT 6\.3/i, "Windows 8.1"],
      [/Windows NT 6\.1/i, "Windows 7"],
      [/Android/i, "Android"],
      [/iPhone|iPad|iPod/i, "iOS"],
      [/Mac OS X/i, "macOS"],
      [/Linux/i, "Linux"],
    ],
    "Unknown OS",
  );

  const device = /iPad/i.test(ua)
    ? "Tablet"
    : /iPhone|Android.*Mobile|Mobile/i.test(ua)
      ? "Mobile"
      : /Android/i.test(ua)
        ? "Tablet"
        : "Desktop";

  let model = "";
  if (/Android/i.test(ua)) {
    const match = ua.match(/Android[^;)]*;\s*(?:[a-z]{2}(?:-[A-Z]{2})?;\s*)?(?:wv;\s*)?([^;)]+?)(?:\s+Build\/[^;)]+)?[;)]/i);
    if (match?.[1]) model = match[1].trim();
  } else if (/iPhone/i.test(ua)) {
    model = "iPhone";
  } else if (/iPad/i.test(ua)) {
    model = "iPad";
  } else if (/Windows/i.test(ua)) {
    model = "Windows";
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    model = "Mac";
  } else if (/Linux/i.test(ua)) {
    model = "Linux PC";
  }

  const deviceName = model ? `${model} · ${device}` : device;

  return { device, browser, os, model: model || device, deviceName };
};

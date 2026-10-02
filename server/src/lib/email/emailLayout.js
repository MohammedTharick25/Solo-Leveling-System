import config from "../../config/env.js";

export const escapeEmailHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

export const getEmailLogoUrl = () => {
  const baseUrl = String(config.CLIENT_URL || config.PRODUCTION_URL || "").replace(/\/+$/, "");
  return baseUrl ? `${baseUrl}/logo.png` : "";
};

export const renderEmailButton = (url, label) => `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 20px">
    <tr><td align="center" bgcolor="#0891b2" style="border-radius:9px;box-shadow:0 6px 20px rgba(8,145,178,.22)">
      <a href="${escapeEmailHtml(url)}" style="display:inline-block;padding:13px 22px;border:1px solid #22d3ee;border-radius:9px;color:#ecfeff;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;line-height:20px;text-decoration:none">${escapeEmailHtml(label)}</a>
    </td></tr>
  </table>`;

export const renderBrandedEmail = ({ preheader, eyebrow, title, content, footer }) => {
  const logoUrl = getEmailLogoUrl();
  const logo = logoUrl
    ? `<img src="${escapeEmailHtml(logoUrl)}" width="42" height="42" alt="Solo Leveling" style="display:block;width:42px;height:42px;border:0;border-radius:10px">`
    : "";

  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"><title>${escapeEmailHtml(title)}</title></head>
<body style="margin:0;padding:0;background-color:#030712;color:#e2e8f0;font-family:Arial,Helvetica,sans-serif;-webkit-font-smoothing:antialiased">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeEmailHtml(preheader)}&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#030712" style="width:100%;background-color:#030712;padding:28px 12px 36px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:620px;background-color:#0b1220;border:1px solid #1e293b;border-radius:16px;overflow:hidden">
<tr><td style="padding:22px 24px;border-bottom:1px solid #1e293b;background-color:#07111f;background-image:linear-gradient(110deg,#07111f 0%,#0b1a2b 56%,#07111f 100%)">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
${logo ? `<td valign="middle" style="padding-right:12px">${logo}</td>` : ""}
<td valign="middle"><p style="margin:0;color:#67e8f9;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:800;letter-spacing:3px;line-height:18px">SOLO LEVELING</p><p style="margin:3px 0 0;color:#94a3b8;font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:2px;line-height:14px">THE SYSTEM <span style="color:#34d399">&#8226; ONLINE</span></p></td>
</tr></table>
</td></tr>
<tr><td style="padding:28px 24px 30px">
<p style="margin:0 0 10px;color:#22d3ee;font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:700;letter-spacing:2px;line-height:16px;text-transform:uppercase">${escapeEmailHtml(eyebrow)}</p>
<h1 style="margin:0 0 18px;color:#f8fafc;font-family:Arial,Helvetica,sans-serif;font-size:25px;font-weight:700;letter-spacing:0;line-height:1.25">${escapeEmailHtml(title)}</h1>
${content}
</td></tr>
<tr><td style="padding:16px 24px;border-top:1px solid #1e293b;background-color:#080f1d">
<p style="margin:0;color:#64748b;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.7">${escapeEmailHtml(footer)}</p>
<p style="margin:9px 0 0;color:#475569;font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:1.6">Solo Leveling System &middot; Your progress, your pace.</p>
</td></tr>
</table>
<p style="margin:14px 0 0;color:#475569;font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:1.5">This message was sent automatically. Please do not reply.</p>
</td></tr></table>
</body></html>`;
};

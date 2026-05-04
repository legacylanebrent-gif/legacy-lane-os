/**
 * Shared HTML email template helpers for Legacy Lane OS
 * Import inline — no local imports across functions, copy what you need.
 */

export function emailWrapper({ title, preheader = '', bodyContent }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}</div>` : ''}
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1e293b 0%,#334155 100%);padding:28px 32px;text-align:center;">
            <div style="font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:bold;color:#ffffff;letter-spacing:1px;">Legacy Lane</div>
            <div style="font-size:12px;color:#f97316;margin-top:4px;letter-spacing:2px;text-transform:uppercase;">OS Platform</div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 32px;">
            ${bodyContent}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;text-align:center;">
            <p style="margin:0 0 6px 0;font-size:13px;color:#64748b;">Legacy Lane OS &nbsp;|&nbsp; Referral Exchange Platform</p>
            <p style="margin:0;font-size:12px;color:#94a3b8;">This is an automated message. Please do not reply directly to this email.<br/>
            Questions? Contact us at <a href="mailto:support@legacylane.com" style="color:#f97316;text-decoration:none;">support@legacylane.com</a></p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function heading(text) {
  return `<h2 style="margin:0 0 16px 0;font-size:22px;color:#1e293b;font-family:Georgia,serif;">${text}</h2>`;
}

export function paragraph(text) {
  return `<p style="margin:0 0 16px 0;font-size:15px;color:#475569;line-height:1.7;">${text}</p>`;
}

export function infoBox(rows) {
  const rowsHtml = rows.map(([label, value]) => `
    <tr>
      <td style="padding:8px 12px;font-size:13px;color:#64748b;font-weight:600;white-space:nowrap;width:40%;">${label}</td>
      <td style="padding:8px 12px;font-size:14px;color:#1e293b;">${value}</td>
    </tr>`).join('');
  return `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:24px;">
    <tbody>${rowsHtml}</tbody>
  </table>`;
}

export function ctaButton(label, url) {
  return `<div style="text-align:center;margin:28px 0;">
    <a href="${url}" style="display:inline-block;background:#f97316;color:#ffffff;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:0.3px;">${label}</a>
  </div>`;
}

export function divider() {
  return `<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />`;
}

export function badge(text, color = '#f97316') {
  return `<span style="display:inline-block;background:${color}20;color:${color};border:1px solid ${color}40;border-radius:20px;padding:3px 12px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">${text}</span>`;
}
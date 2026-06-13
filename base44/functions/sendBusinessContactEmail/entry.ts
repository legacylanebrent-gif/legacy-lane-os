import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function buildMimeMessage({ from, to, subject, replyTo, textBody, htmlBody }) {
  const boundary = `boundary_${Date.now()}_${Math.random().toString(36).substring(2)}`;

  const encodedSubject = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;

  const headers = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodedSubject}`,
    `Reply-To: ${replyTo || from}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    btoa(unescape(encodeURIComponent(textBody))),
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    btoa(unescape(encodeURIComponent(htmlBody))),
    '',
    `--${boundary}--`,
  ].join('\r\n');

  return headers;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json();
    const { toEmail, toName, fromName, fromEmail, message, subject: rawSubject } = body;

    if (!toEmail || !fromEmail || !message) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const subject = rawSubject || `Message from ${fromName || 'a visitor'} via EstateSalen.com`;

    const from = fromName
      ? `${fromName} <${fromEmail}>`
      : fromEmail;

    const to = toName ? `${toName} <${toEmail}>` : toEmail;

    const textBody = [
      `You received a new message from ${fromName || 'a visitor'} (${fromEmail}) via EstateSalen.com:`,
      '',
      message,
      '',
      '---',
      'Sent via EstateSalen.com Business Profile',
    ].join('\n');

    const htmlBody = [
      '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">',
      '  <h2 style="color: #1e293b;">New message from EstateSalen.com</h2>',
      `  <p><strong>From:</strong> ${fromName || 'Visitor'} (${fromEmail})</p>`,
      '  <hr style="border: 1px solid #e2e8f0;" />',
      `  <div style="padding: 16px 0;">${message.replace(/\n/g, '<br>')}</div>`,
      '  <hr style="border: 1px solid #e2e8f0;" />',
      '  <p style="color: #94a3b8; font-size: 12px;">Sent via your EstateSalen.com Business Profile</p>',
      '</div>',
    ].join('\n');

    const raw = buildMimeMessage({ from, to, subject, replyTo: fromEmail, textBody, htmlBody });
    const rawEncoded = btoa(raw)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Get the shared Gmail connection (app builder's Gmail)
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');

    const gmailRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: rawEncoded }),
    });

    if (!gmailRes.ok) {
      const err = await gmailRes.text();
      console.error('Gmail API error:', err);
      return Response.json({ error: 'Failed to send email' }, { status: 500 });
    }

    const result = await gmailRes.json();
    return Response.json({ success: true, messageId: result.id });
  } catch (error) {
    console.error('sendBusinessContactEmail error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
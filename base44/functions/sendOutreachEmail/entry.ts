import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import OpenAI from 'npm:openai';

const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });

// Build RFC 2822 email and base64url encode it
function buildRawEmail({ from, to, subject, body, inReplyTo, references, threadId }) {
  const boundary = `boundary_${Date.now()}`;
  let headers = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset="UTF-8"`,
  ];
  if (inReplyTo) headers.push(`In-Reply-To: ${inReplyTo}`);
  if (references) headers.push(`References: ${references}`);

  const raw = headers.join('\r\n') + '\r\n\r\n' + body;
  return btoa(unescape(encodeURIComponent(raw)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function generateEmailCopy(company, emailNum, template, previousSubject) {
  const templatePrompts = {
    value_first: `You are an outreach specialist for EstateSalen.com, a platform that helps estate sale operators grow their business with professional tools, marketing, and lead generation. Write email #${emailNum} of a 3-email cold outreach sequence to convert "${company.company_name}" (${company.city}, ${company.state}) into a paid operator subscriber. 

Email #1: Lead with value — mention the platform helps estate sale companies get more clients, manage sales professionally, and grow their reputation. Be warm, specific to their location, and end with a soft CTA to learn more or hop on a quick call.
Email #2: Social proof / follow-up — mention other operators in their area are using it, reference a benefit like marketing automation or client referrals. CTA is a 15-min call.
Email #3: Final nudge — keep it short, acknowledge they're busy, offer a free demo or trial, and close the door politely.

Write email #${emailNum} only. Return JSON: { "subject": "...", "body": "..." }`,
    pain_point: `You are writing cold outreach email #${emailNum} for EstateSalen.com targeting "${company.company_name}" in ${company.city}, ${company.state}. The platform solves common estate sale operator pain points: no-show clients, poor marketing reach, manual inventory tracking, and low repeat business. Email #1 opens with a specific pain point. Email #2 follows up with a solution story. Email #3 is a brief final check-in. Write email #${emailNum} only. Return JSON: { "subject": "...", "body": "..." }`,
    direct: `Write a direct, brief cold outreach email #${emailNum} to "${company.company_name}" (${company.city}, ${company.state}) from EstateSalen.com. We help estate sale companies get more clients and run more professional operations. Be concise. Email #1 is the intro. Email #2 is a quick follow-up. Email #3 is a final one-liner. Write email #${emailNum} only. Return JSON: { "subject": "...", "body": "..." }`,
  };

  const prompt = templatePrompts[template] || templatePrompts.value_first;
  const systemPrompt = emailNum > 1 && previousSubject
    ? `${prompt}\n\nNote: The previous email had subject: "${previousSubject}" — the reply subject should use "Re: ${previousSubject}" format.`
    : prompt;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: systemPrompt }],
    response_format: { type: 'json_object' },
  });

  return JSON.parse(response.choices[0].message.content);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const { sequence_id, email_num = 1 } = await req.json();
    if (!sequence_id) return Response.json({ error: 'sequence_id required' }, { status: 400 });

    const sequence = await base44.asServiceRole.entities.OutreachSequence.get(sequence_id);
    if (!sequence) return Response.json({ error: 'Sequence not found' }, { status: 404 });

    if (['replied', 'booked', 'not_interested', 'unsubscribed'].includes(sequence.sequence_status)) {
      return Response.json({ skipped: true, reason: `Sequence is in status: ${sequence.sequence_status}` });
    }

    const lead = await base44.asServiceRole.entities.FutureOperatorLead.get(sequence.lead_id);
    const company = lead || { company_name: sequence.company_name, city: sequence.city, state: sequence.state };

    // Generate AI email copy
    const previousSubject = email_num > 1 ? sequence.email_1_subject : null;
    const { subject, body } = await generateEmailCopy(company, email_num, sequence.sequence_template || 'value_first', previousSubject);

    // Get Gmail access token
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');

    // Get sender profile
    const profileRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const profile = await profileRes.json();
    const fromEmail = profile.emailAddress;

    // Build raw email
    const inReplyTo = email_num > 1 ? sequence.gmail_message_id : null;
    const rawEmail = buildRawEmail({
      from: fromEmail,
      to: sequence.contact_email,
      subject: email_num > 1 ? `Re: ${sequence.email_1_subject}` : subject,
      body,
      inReplyTo,
      references: inReplyTo,
    });

    // Send via Gmail API
    const sendPayload = { raw: rawEmail };
    if (email_num > 1 && sequence.gmail_thread_id) {
      sendPayload.threadId = sequence.gmail_thread_id;
    }

    const sendRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(sendPayload),
    });

    if (!sendRes.ok) {
      const err = await sendRes.text();
      throw new Error(`Gmail send failed: ${err}`);
    }

    const sent = await sendRes.json();

    // Update sequence record
    const now = new Date().toISOString();
    const statusMap = { 1: 'email_1_sent', 2: 'email_2_sent', 3: 'email_3_sent' };
    const updateData = {
      sequence_status: statusMap[email_num] || 'email_1_sent',
      [`email_${email_num}_sent_at`]: now,
      [`email_${email_num}_subject`]: email_num > 1 ? `Re: ${sequence.email_1_subject}` : subject,
      [`email_${email_num}_body`]: body,
    };

    // Capture thread/message ID from first email for reply tracking
    if (email_num === 1) {
      updateData.gmail_thread_id = sent.threadId;
      // Fetch the sent message to get Message-ID header
      const msgRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${sent.id}?format=metadata&metadataHeaders=Message-ID`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (msgRes.ok) {
        const msgData = await msgRes.json();
        const msgIdHeader = msgData.payload?.headers?.find(h => h.name === 'Message-ID');
        if (msgIdHeader) updateData.gmail_message_id = msgIdHeader.value;
      }
    }

    await base44.asServiceRole.entities.OutreachSequence.update(sequence_id, updateData);

    // Update the lead's outreach status
    if (lead) {
      await base44.asServiceRole.entities.FutureOperatorLead.update(sequence.lead_id, {
        audience_sync_status: statusMap[email_num] || 'email_1_sent',
      });
    }

    return Response.json({ success: true, email_num, subject: updateData[`email_${email_num}_subject`], gmail_id: sent.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const base44 = createClientFromRequest(req);

    const messageIds = body.data?.new_message_ids ?? [];
    if (messageIds.length === 0) return Response.json({ ok: true, skipped: 'no new messages' });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');
    const authHeader = { Authorization: `Bearer ${accessToken}` };

    for (const messageId of messageIds) {
      const res = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=metadata&metadataHeaders=From,Subject,In-Reply-To,References`,
        { headers: authHeader }
      );
      if (!res.ok) continue;
      const message = await res.json();

      const headers = message.payload?.headers || [];
      const getHeader = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';

      const inReplyTo = getHeader('In-Reply-To');
      const references = getHeader('References');
      const from = getHeader('From');
      const snippet = message.snippet || '';
      const threadId = message.threadId;

      if (!inReplyTo && !references && !threadId) continue;

      // Find matching sequence by thread ID or message ID
      let sequences = [];
      if (threadId) {
        sequences = await base44.asServiceRole.entities.OutreachSequence.filter({ gmail_thread_id: threadId });
      }
      if (sequences.length === 0 && inReplyTo) {
        sequences = await base44.asServiceRole.entities.OutreachSequence.filter({ gmail_message_id: inReplyTo });
      }

      for (const seq of sequences) {
        // Skip if already marked replied/booked/not_interested
        if (['replied', 'booked', 'not_interested'].includes(seq.sequence_status)) continue;

        const now = new Date().toISOString();
        await base44.asServiceRole.entities.OutreachSequence.update(seq.id, {
          sequence_status: 'replied',
          last_reply_at: now,
          last_reply_snippet: snippet.slice(0, 500),
        });

        // Update the lead too
        if (seq.lead_id) {
          await base44.asServiceRole.entities.FutureOperatorLead.update(seq.lead_id, {
            audience_sync_status: 'replied',
          });
        }
      }
    }

    return Response.json({ ok: true, processed: messageIds.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
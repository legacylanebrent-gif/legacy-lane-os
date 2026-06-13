import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data } = body;

    // Only process new messages
    if (event.type !== 'create' || !data) {
      return Response.json({ processed: false, reason: 'not a create event' });
    }

    const { id, sender_id, sender_name, recipient_id, message } = data;

    // Skip if no message content
    if (!message || !message.trim()) {
      return Response.json({ processed: false, reason: 'empty message' });
    }

    // Check sender history — how many messages have they sent before this one?
    const allMessages = await base44.asServiceRole.entities.Message.filter(
      { sender_id },
      '-created_date',
      50
    );
    const priorMessages = allMessages.filter(m => m.id !== id);
    const isFirstTimeSender = priorMessages.length === 0;

    // Check for prior spam flags against this sender
    const priorSpamCount = priorMessages.filter(m => m.spam_flag).length;
    const isRepeatOffender = priorSpamCount >= 2;

    // If repeat offender with 3+ flags, auto-block without LLM
    if (priorSpamCount >= 3) {
      await base44.asServiceRole.entities.Message.update(id, {
        spam_flag: true,
        spam_score: 100,
        flagged_by: 'system'
      });
      
      await base44.asServiceRole.entities.Notification.create({
        user_id: recipient_id,
        type: 'system',
        title: '🚫 Message Blocked',
        message: `A message from ${sender_name || 'a user'} was automatically blocked due to repeated spam violations.`,
        link_to_page: 'Messages'
      });

      return Response.json({ 
        processed: true, 
        blocked: true, 
        reason: 'repeat_offender_auto_blocked',
        priorViolations: priorSpamCount 
      });
    }

    // Analyze with LLM for spam detection
    const llmResult = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyze this message for spam. Consider: commercial solicitation, phishing attempts, 
off-platform contact requests (phone numbers, external links), MLM/recruitment pitches, 
copy-paste unsolicited marketing, cryptocurrency scams, fake job offers.

Sender context:
- Is first-time sender: ${isFirstTimeSender ? 'YES (high risk)' : 'NO'}
- Prior spam violations: ${priorSpamCount}
- Sender name: ${sender_name || 'unknown'}

Message: "${message.substring(0, 1000)}"

Respond with a JSON object containing:
- spam_likelihood: number 0-100
- spam_category: string (commercial_solicit, phishing, off_platform_contact, mlm_recruitment, 
  crypto_scam, fake_job, generic_spam, clean)
- explanation: string (brief rationale)
- should_block: boolean (true if clearly malicious/phishing/scam, false otherwise)`,
      response_json_schema: {
        type: 'object',
        properties: {
          spam_likelihood: { type: 'number' },
          spam_category: { type: 'string' },
          explanation: { type: 'string' },
          should_block: { type: 'boolean' }
        },
        required: ['spam_likelihood', 'spam_category', 'explanation', 'should_block']
      }
    });

    const { spam_likelihood, spam_category, explanation, should_block } = llmResult;

    // Determine action based on score thresholds
    // First-time senders: stricter threshold (30)
    // Known senders: higher threshold (60)
    // Any should_block=true from LLM: immediate block
    const threshold = isFirstTimeSender ? 30 : 60;
    const isSpam = should_block || spam_likelihood >= threshold;

    if (isSpam) {
      // Flag the message
      await base44.asServiceRole.entities.Message.update(id, {
        spam_flag: true,
        spam_score: spam_likelihood,
        flagged_by: 'system'
      });

      // Notify recipient
      await base44.asServiceRole.entities.Notification.create({
        user_id: recipient_id,
        type: 'system',
        title: '⚠️ Potential Spam Detected',
        message: `A message from ${sender_name || 'a user'} was flagged as potential spam (${spam_category}). It has been hidden.`,
        link_to_page: 'Messages'
      });

      // Notify admins about the violation
      const admins = await base44.asServiceRole.entities.User.filter(
        { role: 'admin' },
        undefined,
        5
      );
      
      for (const admin of admins) {
        await base44.asServiceRole.entities.Notification.create({
          user_id: admin.id,
          type: 'system',
          title: '🚨 Spam Message Detected',
          message: `Sender: ${sender_name || 'unknown'} | Category: ${spam_category} | Score: ${spam_likelihood} | First-time: ${isFirstTimeSender} | Prior violations: ${priorSpamCount}\n\nReason: ${explanation}`,
          link_to_page: 'Messages',
          related_entity_type: 'Message',
          related_entity_id: id
        });
      }

      return Response.json({
        processed: true,
        flagged: true,
        spam_likelihood,
        spam_category,
        explanation,
        isFirstTimeSender,
        priorViolations: priorSpamCount + 1
      });
    }

    // Clean message — no action needed
    return Response.json({
      processed: true,
      flagged: false,
      spam_likelihood,
      explanation
    });

  } catch (error) {
    console.error('detectMessageSpam error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data } = body;

    // Only process new comments
    if (event.type !== 'create' || !data) {
      return Response.json({ processed: false, reason: 'not a create event' });
    }

    const { id, story_id, author_id, author_name, content } = data;

    if (!content || !content.trim()) {
      return Response.json({ processed: false, reason: 'empty comment' });
    }

    // Check commenter history — prior comments and prior violations
    const allComments = await base44.asServiceRole.entities.CoolFindComment.filter(
      { author_id },
      '-created_date',
      50
    );
    const priorComments = allComments.filter(c => c.id !== id);
    const isFirstTimeCommenter = priorComments.length === 0;

    // Check for prior spam/toxicity flags
    const priorViolations = priorComments.filter(c => c.status === 'hidden' || c.status === 'removed' || c.spam_score >= 50 || c.toxicity_score >= 50);
    const priorViolationCount = priorViolations.length;

    // Repeat offender with 3+ violations → auto-block without LLM
    if (priorViolationCount >= 3) {
      await base44.asServiceRole.entities.CoolFindComment.update(id, {
        status: 'hidden',
        spam_score: 100,
        flagged_by: 'system',
        moderation_action: 'auto_hidden',
        moderation_notes: 'Auto-hidden: repeat offender (3+ prior violations)'
      });

      // Notify admins
      const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' }, undefined, 5);
      for (const admin of admins) {
        await base44.asServiceRole.entities.Notification.create({
          user_id: admin.id,
          type: 'system',
          title: '🚫 Repeat Offender Comment Blocked',
          message: `A comment from ${author_name || 'a user'} was auto-blocked due to repeated violations (${priorViolationCount} prior). The user may need a ban review.`,
          link_to_page: 'AdminCoolFinds',
          related_entity_type: 'CoolFindComment',
          related_entity_id: id
        });
      }

      return Response.json({
        processed: true,
        blocked: true,
        reason: 'repeat_offender_auto_blocked',
        priorViolations: priorViolationCount
      });
    }

    // Analyze with LLM for BOTH spam AND toxicity/negativity
    const llmResult = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyze this blog comment for spam AND toxic/negative behavior.

Comment: "${content.substring(0, 1500)}"

Commenter context:
- Is first-time commenter: ${isFirstTimeCommenter ? 'YES' : 'NO'}
- Prior violations: ${priorViolationCount}
- Commenter name: ${author_name || 'unknown'}

SPAM detection — look for: commercial solicitation, phishing, off-platform contact requests (phone numbers, external links), MLM/recruitment, crypto scams, unsolicited marketing, bot-like copy-paste.

TOXICITY detection — look for: personal attacks, harassment, hate speech, bullying, excessive negativity, name-calling, derogatory language toward the author or other commenters, trolling.

Respond with a JSON object:
- spam_likelihood: number 0-100
- spam_category: string (commercial_solicit, phishing, off_platform_contact, generic_spam, clean)
- toxicity_likelihood: number 0-100
- toxicity_category: string (harassment, hate_speech, personal_attack, excessive_negativity, clean)
- explanation: string (brief rationale)
- should_hide: boolean (true if clearly spam, phishing, hate speech, or severe personal attack)
- should_warn_user: boolean (true if borderline negative but not ban-worthy — needs a warning)`,
      response_json_schema: {
        type: 'object',
        properties: {
          spam_likelihood: { type: 'number' },
          spam_category: { type: 'string' },
          toxicity_likelihood: { type: 'number' },
          toxicity_category: { type: 'string' },
          explanation: { type: 'string' },
          should_hide: { type: 'boolean' },
          should_warn_user: { type: 'boolean' }
        },
        required: ['spam_likelihood', 'spam_category', 'toxicity_likelihood', 'toxicity_category', 'explanation', 'should_hide', 'should_warn_user']
      }
    });

    const { spam_likelihood, spam_category, toxicity_likelihood, toxicity_category, explanation, should_hide, should_warn_user } = llmResult;

    // Determine action thresholds
    // First-time commenters: stricter (spam 30, toxicity 40)
    // Known commenters: more lenient (spam 60, toxicity 60)
    const spamThreshold = isFirstTimeCommenter ? 30 : 60;
    const toxicityThreshold = isFirstTimeCommenter ? 40 : 60;

    const isSpam = should_hide || spam_likelihood >= spamThreshold;
    const isToxic = toxicity_likelihood >= toxicityThreshold;
    const needsFlag = isSpam || isToxic;

    if (needsFlag) {
      // Determine the worse category for flagging
      const primaryCategory = spam_likelihood >= toxicity_likelihood ? spam_category : toxicity_category;
      const flagReason = isSpam ? 'spam' : 'toxicity';

      // Hide if spam or severe toxicity; flag for review if borderline toxicity
      const newStatus = isSpam || should_hide ? 'hidden' : 'flagged';

      await base44.asServiceRole.entities.CoolFindComment.update(id, {
        status: newStatus,
        spam_score: spam_likelihood,
        spam_category,
        toxicity_score: toxicity_likelihood,
        toxicity_category,
        flagged_by: 'system',
        moderation_notes: `Auto-${newStatus}: ${flagReason} (${primaryCategory}). ${explanation}`
      });

      // Notify admins
      const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' }, undefined, 5);
      for (const admin of admins) {
        await base44.asServiceRole.entities.Notification.create({
          user_id: admin.id,
          type: 'system',
          title: newStatus === 'hidden' ? '🚨 Comment Auto-Hidden' : '⚠️ Comment Flagged for Review',
          message: `Author: ${author_name || 'unknown'} | Spam: ${spam_likelihood} (${spam_category}) | Toxicity: ${toxicity_likelihood} (${toxicity_category}) | First-time: ${isFirstTimeCommenter} | Prior: ${priorViolationCount}\n\nReason: ${explanation}\n\nComment: "${content.substring(0, 200)}"`,
          link_to_page: 'AdminCoolFinds',
          related_entity_type: 'CoolFindComment',
          related_entity_id: id
        });
      }

      // If should_warn_user, create an AdminTask for the moderation agent
      if (should_warn_user && !isSpam) {
        await base44.asServiceRole.entities.AdminTask.create({
          title: `Review borderline comment by ${author_name || 'unknown'}`,
          description: `Comment on story ${story_id} flagged for review. Toxicity: ${toxicity_likelihood} (${toxicity_category}). Consider warning the user. Comment: "${content.substring(0, 300)}"`,
          status: 'pending',
          priority: 'medium',
          related_entity_type: 'CoolFindComment',
          related_entity_id: id
        });
      }

      return Response.json({
        processed: true,
        flagged: true,
        hidden: newStatus === 'hidden',
        spam_likelihood,
        spam_category,
        toxicity_likelihood,
        toxicity_category,
        explanation,
        isFirstTimeCommenter,
        priorViolations: priorViolationCount
      });
    }

    // Clean comment — no action needed
    return Response.json({
      processed: true,
      flagged: false,
      spam_likelihood,
      toxicity_likelihood,
      explanation
    });

  } catch (error) {
    console.error('detectCommentSpam error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
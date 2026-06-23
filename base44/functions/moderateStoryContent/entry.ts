import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data } = body;

    // Only process new stories
    if (event.type !== 'create' || !data) {
      return Response.json({ processed: false, reason: 'not a create event' });
    }

    const { id, title, story_content, author_company_name } = data;

    if (!story_content || !story_content.trim()) {
      return Response.json({ processed: false, reason: 'empty content' });
    }

    // Analyze with LLM to detect and remove contact information
    const llmResult = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyze this story submission for prohibited contact information and remove it.

MODERATION RULES:
- REMOVE all phone numbers (any format: 555-123-4567, (555) 123-4567, 555.123.4567, etc.)
- REMOVE all email addresses (anything with @)
- REMOVE all website URLs (http://, https://, www., .com, .net, etc.)
- REMOVE social media handles (@username, facebook.com/, instagram.com/, etc.)
- REMOVE physical addresses beyond city/state (no street addresses)
- REMOVE QR codes or links to external contact forms
- KEEP company names (e.g., "Johnson Estate Sales" is fine)
- KEEP general calls to action like "comment below" or "reach out" WITHOUT specific contact info
- KEEP city and state locations (e.g., "Portland, OR" is fine)

If ANY contact info is found and removed, explain what was removed.

Story Title: "${title || '(none)'}"
Company Name: "${author_company_name || '(none)'}"
Story Content: "${story_content.substring(0, 3000)}"

Respond with a JSON object:
- cleaned_content: the story content with all contact info removed/rewritten
- contact_info_found: boolean (true if any contact info was detected and removed)
- removed_items: array of strings describing what was removed (e.g., "phone number 555-123-4567", "email address john@example.com")
- violation_severity: string ("none", "minor", "moderate", "severe") based on how much contact info was found
- should_flag_for_review: boolean (true if severe violation or suspicious pattern)`,
      response_json_schema: {
        type: 'object',
        properties: {
          cleaned_content: { type: 'string' },
          contact_info_found: { type: 'boolean' },
          removed_items: { type: 'array', items: { type: 'string' } },
          violation_severity: { type: 'string' },
          should_flag_for_review: { type: 'boolean' }
        },
        required: ['cleaned_content', 'contact_info_found', 'removed_items', 'violation_severity', 'should_flag_for_review']
      }
    });

    const { cleaned_content, contact_info_found, removed_items, violation_severity, should_flag_for_review } = llmResult;

    // Update the story with cleaned content
    const updateData = {
      story_content: cleaned_content,
      moderation_status: contact_info_found ? 'content_modified' : 'clean'
    };

    if (should_flag_for_review) {
      updateData.status = 'draft'; // Keep as draft for admin review
      updateData.moderation_notes = `Contact info removed: ${removed_items.join(', ')}`;
      updateData.requires_admin_review = true;
    }

    await base44.asServiceRole.entities.CoolFindStory.update(id, updateData);

    // Notify admins if severe violation or flagged
    if (should_flag_for_review || violation_severity === 'severe') {
      const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' }, undefined, 5);
      for (const admin of admins) {
        await base44.asServiceRole.entities.Notification.create({
          user_id: admin.id,
          type: 'system',
          title: `⚠️ Story Flagged - Contact Info Removed`,
          message: `Title: "${title}"\nCompany: ${author_company_name || 'Unknown'}\nSeverity: ${violation_severity}\nRemoved: ${removed_items.join(', ')}\n\nStory requires review before publishing.`,
          link_to_page: 'AdminCoolFinds',
          related_entity_type: 'CoolFindStory',
          related_entity_id: id
        });
      }
    }

    return Response.json({
      processed: true,
      contact_info_found,
      removed_items,
      violation_severity,
      flagged: should_flag_for_review
    });

  } catch (error) {
    console.error('moderateStoryContent error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
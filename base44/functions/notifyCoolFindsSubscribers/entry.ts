import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    // Only process new published stories
    if (event.type !== 'create' || !data || data.status !== 'published') {
      return Response.json({ processed: false, reason: 'not a published story' });
    }

    const { id, title, excerpt, author_company_name } = data;

    // Get all users who opted into in-app notifications for Cool Finds
    const preferences = await base44.asServiceRole.entities.EmailPreferences.filter({
      cool_finds_blog_in_app: true
    });

    if (preferences.length === 0) {
      return Response.json({ notified: 0, reason: 'no subscribers' });
    }

    // Create in-app notifications for all subscribers
    let notifiedCount = 0;
    const errors = [];

    for (const pref of preferences) {
      try {
        await base44.entities.Notification.create({
          user_id: pref.user_id,
          type: 'cool_finds_blog',
          title: `🔍 New Cool Find: ${title}`,
          message: `${author_company_name || 'Someone'} just shared a new discovery! ${excerpt ? excerpt.substring(0, 100) + '...' : 'Check it out now.'}`,
          link_to_page: 'CoolFindsDetail',
          link_params: { slug: data.slug || id },
          related_entity_type: 'CoolFindStory',
          related_entity_id: id
        });
        notifiedCount++;
      } catch (err) {
        console.error(`Error notifying ${pref.user_id}:`, err);
        errors.push({ user_id: pref.user_id, error: err.message });
      }
    }

    return Response.json({
      notified: notifiedCount,
      storyTitle: title,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('notifyCoolFindsSubscribers error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
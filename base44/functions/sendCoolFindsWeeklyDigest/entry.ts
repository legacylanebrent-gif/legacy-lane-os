import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get all users who opted into Cool Finds blog email notifications
    const preferences = await base44.asServiceRole.entities.EmailPreferences.filter({
      cool_finds_blog_email: true
    });

    if (preferences.length === 0) {
      return Response.json({ sent: 0, reason: 'no subscribers' });
    }

    // Get this week's published stories (last 7 days)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const stories = await base44.asServiceRole.entities.CoolFindStory.filter(
      {
        status: 'published',
        published_at: { $gte: oneWeekAgo.toISOString() }
      },
      '-published_at',
      50
    );

    if (stories.length === 0) {
      return Response.json({ sent: 0, reason: 'no new stories this week' });
    }

    // Group stories by category for better organization
    const storiesByCategory = {};
    stories.forEach(story => {
      const cat = story.category || 'general';
      if (!storiesByCategory[cat]) {
        storiesByCategory[cat] = [];
      }
      storiesByCategory[cat].push(story);
    });

    // Build email content
    const storyListHtml = Object.entries(storiesByCategory).map(([category, categoryStories]) => {
      const categoryLabel = category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      return `
        <div style="margin-bottom: 24px;">
          <h3 style="color: #6b21a8; font-family: Georgia, serif; margin-bottom: 12px; font-size: 18px;">
            ${categoryLabel} (${categoryStories.length})
          </h3>
          <ul style="list-style: none; padding: 0;">
            ${categoryStories.map(story => `
              <li style="margin-bottom: 12px; padding-left: 12px; border-left: 3px solid #fb923c;">
                <a href="${process.env.BASE44_APP_URL || 'https://estatesalen.com'}/cool-finds/${story.slug || story.id}" 
                   style="color: #1e293b; text-decoration: none; font-weight: 600; font-size: 15px;">
                  ${story.title}
                </a>
                ${story.excerpt ? `<p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">${story.excerpt.substring(0, 120)}...</p>` : ''}
                <p style="color: #94a3b8; font-size: 12px; margin: 4px 0 0 0;">
                  by ${story.author_company_name || 'Anonymous'} • ${new Date(story.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              </li>
            `).join('')}
          </ul>
        </div>
      `;
    }).join('');

    const emailBody = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #6b21a8 0%, #7c3aed 100%); padding: 32px; border-radius: 12px; margin-bottom: 24px; text-align: center;">
            <h1 style="color: white; font-family: Georgia, serif; font-size: 28px; margin: 0 0 8px 0;">
              ✨ Cool Finds Weekly Digest
            </h1>
            <p style="color: #e9d5ff; margin: 0; font-size: 16px;">
              ${stories.length} new ${stories.length === 1 ? 'story' : 'stories'} from estate sale companies and users across the country
            </p>
          </div>

          ${storyListHtml}

          <div style="background: #f8fafc; padding: 24px; border-radius: 8px; margin-top: 32px; text-align: center;">
            <h3 style="color: #6b21a8; font-family: Georgia, serif; margin: 0 0 12px 0; font-size: 18px;">
              Have a cool find to share?
            </h3>
            <p style="color: #64748b; font-size: 14px; margin: 0 0 16px 0;">
              Submit your own discovery story and be featured in next week's digest!
            </p>
            <a href="${process.env.BASE44_APP_URL || 'https://estatesalen.com'}/CoolFindsSubmit" 
               style="display: inline-block; background: #fb923c; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 14px;">
              Submit Your Story
            </a>
          </div>

          <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid #e2e8f0; text-align: center;">
            <p style="color: #94a3b8; font-size: 12px; margin: 0;">
              You're receiving this because you opted into Cool Finds blog notifications.
              <br>
              <a href="${process.env.BASE44_APP_URL || 'https://estatesalen.com'}/NotificationSettings" 
                 style="color: #6b21a8; text-decoration: underline;">
                Update email preferences
              </a>
            </p>
          </div>
        </body>
      </html>
    `;

    // Send emails to all subscribers
    let sentCount = 0;
    const errors = [];

    for (const pref of preferences) {
      try {
        await base44.integrations.Core.SendEmail({
          to: pref.user_email,
          subject: `🔍 ${stories.length} New Cool Finds This Week!`,
          body: emailBody
        });

        // Log the send
        await base44.entities.Notification.create({
          user_id: pref.user_id,
          type: 'email',
          title: 'Cool Finds Weekly Digest Sent',
          message: `Check your inbox for ${stories.length} new cool finds stories this week.`,
          link_to_page: 'CoolFindsBlog',
          related_entity_type: 'CoolFindStory',
          related_entity_id: stories[0]?.id
        });

        sentCount++;
      } catch (err) {
        console.error(`Error sending to ${pref.user_email}:`, err);
        errors.push({ email: pref.user_email, error: err.message });
      }
    }

    return Response.json({
      sent: sentCount,
      totalStories: stories.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('sendCoolFindsWeeklyDigest error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * publishTerritoryFBPost
 *
 * Publishes an approved TerritoryFBPost to its Facebook Page via the Graph API.
 * Requires: { post_id: string }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { post_id } = await req.json();
    if (!post_id) return Response.json({ error: 'post_id required' }, { status: 400 });

    const posts = await base44.asServiceRole.entities.TerritoryFBPost.filter({ id: post_id });
    const post = posts[0];
    if (!post) return Response.json({ error: 'Post not found' }, { status: 404 });

    if (post.approval_status !== 'approved') {
      return Response.json({ error: 'Post must be approved before publishing' }, { status: 400 });
    }

    // Load the territory page for the access token
    const pages = await base44.asServiceRole.entities.TerritoryFBPage.filter({ id: post.territory_fb_page_id });
    const page = pages[0];
    if (!page) return Response.json({ error: 'Territory page not found' }, { status: 404 });

    if (!page.fb_page_id || !page.fb_page_access_token) {
      return Response.json({ error: 'Facebook page credentials not configured for this territory' }, { status: 400 });
    }

    // Build the FB Graph API payload
    const fbPayload = {
      message: post.ai_caption,
      access_token: page.fb_page_access_token
    };

    // If we have an AI image, post as a photo post
    let fbResponse;
    if (post.ai_image_url) {
      const photoPayload = new URLSearchParams({
        url: post.ai_image_url,
        caption: post.ai_caption,
        access_token: page.fb_page_access_token
      });
      fbResponse = await fetch(
        `https://graph.facebook.com/v19.0/${page.fb_page_id}/photos`,
        { method: 'POST', body: photoPayload }
      );
    } else {
      fbResponse = await fetch(
        `https://graph.facebook.com/v19.0/${page.fb_page_id}/feed`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fbPayload)
        }
      );
    }

    const fbData = await fbResponse.json();

    if (fbData.error) {
      await base44.asServiceRole.entities.TerritoryFBPost.update(post_id, {
        publish_status: 'failed',
        error_message: fbData.error.message
      });
      return Response.json({ error: fbData.error.message, fb_error: fbData.error }, { status: 400 });
    }

    // Update post record
    await base44.asServiceRole.entities.TerritoryFBPost.update(post_id, {
      publish_status: 'posted',
      fb_post_id: fbData.post_id || fbData.id,
      posted_at: new Date().toISOString(),
      error_message: null
    });

    // Increment counter on the territory page
    await base44.asServiceRole.entities.TerritoryFBPage.update(page.id, {
      total_posts_sent: (page.total_posts_sent || 0) + 1,
      last_post_sent_at: new Date().toISOString()
    });

    return Response.json({ success: true, fb_post_id: fbData.post_id || fbData.id });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
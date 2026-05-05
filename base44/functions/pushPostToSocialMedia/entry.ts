import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { platform, campaign_id, caption, image_url, credentials } = await req.json();

  if (!platform || !caption) {
    return Response.json({ error: 'Missing platform or caption' }, { status: 400 });
  }

  try {
    let result;

    if (platform === 'facebook') {
      const { page_access_token, page_id } = credentials;
      if (!page_access_token || !page_id) return Response.json({ error: 'Missing Facebook credentials' }, { status: 400 });

      let endpoint, body;
      if (image_url) {
        endpoint = `https://graph.facebook.com/v19.0/${page_id}/photos`;
        body = new URLSearchParams({ url: image_url, caption, access_token: page_access_token });
      } else {
        endpoint = `https://graph.facebook.com/v19.0/${page_id}/feed`;
        body = new URLSearchParams({ message: caption, access_token: page_access_token });
      }

      const res = await fetch(endpoint, { method: 'POST', body });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      result = { post_id: data.id, message: `Published to Facebook! Post ID: ${data.id}` };

    } else if (platform === 'instagram') {
      const { access_token, ig_user_id } = credentials;
      if (!access_token || !ig_user_id) return Response.json({ error: 'Missing Instagram credentials' }, { status: 400 });

      if (!image_url) return Response.json({ error: 'Instagram requires an image' }, { status: 400 });

      // Step 1: Create media container
      const containerRes = await fetch(`https://graph.facebook.com/v19.0/${ig_user_id}/media`, {
        method: 'POST',
        body: new URLSearchParams({ image_url, caption, access_token }),
      });
      const container = await containerRes.json();
      if (container.error) throw new Error(container.error.message);

      // Step 2: Publish
      const publishRes = await fetch(`https://graph.facebook.com/v19.0/${ig_user_id}/media_publish`, {
        method: 'POST',
        body: new URLSearchParams({ creation_id: container.id, access_token }),
      });
      const published = await publishRes.json();
      if (published.error) throw new Error(published.error.message);
      result = { post_id: published.id, message: `Published to Instagram! Post ID: ${published.id}` };

    } else if (platform === 'linkedin') {
      const { access_token, organization_urn } = credentials;
      if (!access_token || !organization_urn) return Response.json({ error: 'Missing LinkedIn credentials' }, { status: 400 });

      const postBody = {
        author: organization_urn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: caption },
            shareMediaCategory: image_url ? 'IMAGE' : 'NONE',
            ...(image_url ? {
              media: [{
                status: 'READY',
                originalUrl: image_url,
              }]
            } : {}),
          },
        },
        visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
      };

      const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${access_token}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify(postBody),
      });
      const data = await res.json();
      if (data.status >= 400) throw new Error(data.message || 'LinkedIn API error');
      result = { post_id: data.id, message: `Published to LinkedIn! Post ID: ${data.id}` };

    } else if (platform === 'twitter') {
      const { api_key, api_secret, access_token, access_secret } = credentials;
      if (!api_key || !api_secret || !access_token || !access_secret) {
        return Response.json({ error: 'Missing Twitter/X credentials' }, { status: 400 });
      }

      // OAuth 1.0a signature
      const tweetText = caption.slice(0, 280);
      const url = 'https://api.twitter.com/2/tweets';
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const nonce = crypto.randomUUID().replace(/-/g, '');

      const oauthParams = {
        oauth_consumer_key: api_key,
        oauth_nonce: nonce,
        oauth_signature_method: 'HMAC-SHA256',
        oauth_timestamp: timestamp,
        oauth_token: access_token,
        oauth_version: '1.0',
      };

      const paramString = Object.keys(oauthParams).sort().map(k => `${encodeURIComponent(k)}=${encodeURIComponent(oauthParams[k])}`).join('&');
      const baseString = `POST&${encodeURIComponent(url)}&${encodeURIComponent(paramString)}`;
      const signingKey = `${encodeURIComponent(api_secret)}&${encodeURIComponent(access_secret)}`;

      const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(signingKey), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
      const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(baseString));
      const signature = btoa(String.fromCharCode(...new Uint8Array(sig)));

      const authHeader = 'OAuth ' + Object.keys(oauthParams).sort().map(k =>
        `${encodeURIComponent(k)}="${encodeURIComponent(oauthParams[k])}"`
      ).join(', ') + `, oauth_signature="${encodeURIComponent(signature)}"`;

      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: tweetText }),
      });
      const data = await res.json();
      if (data.errors || data.error) throw new Error(JSON.stringify(data.errors || data.error));
      result = { post_id: data.data?.id, message: `Published to Twitter/X! Tweet ID: ${data.data?.id}` };

    } else if (platform === 'tiktok') {
      const { access_token, open_id } = credentials;
      if (!access_token || !open_id) return Response.json({ error: 'Missing TikTok credentials' }, { status: 400 });

      // TikTok Content Posting API (photo post)
      const res = await fetch('https://open.tiktokapis.com/v2/post/publish/content/init/', {
        method: 'POST',
        headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json; charset=UTF-8' },
        body: JSON.stringify({
          post_info: {
            title: caption.slice(0, 150),
            privacy_level: 'PUBLIC_TO_EVERYONE',
            disable_duet: false,
            disable_comment: false,
            disable_stitch: false,
          },
          source_info: { source: 'PULL_FROM_URL', photo_cover_index: 0, photo_images: [image_url || ''] },
          post_mode: 'DIRECT_POST',
          media_type: 'PHOTO',
        }),
      });
      const data = await res.json();
      if (data.error?.code && data.error.code !== 'ok') throw new Error(data.error.message);
      result = { message: `Published to TikTok! Publish ID: ${data.data?.publish_id || 'submitted'}` };

    } else {
      return Response.json({ error: `Platform "${platform}" not supported` }, { status: 400 });
    }

    return Response.json({ success: true, ...result });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get Gmail connection for this user
    const connectorId = '69df540595ec58f54b5cdf10'; // Agent Gmail
    const { accessToken } = await base44.asServiceRole.connectors.getCurrentAppUserConnection(connectorId);

    // Fetch messages from Gmail
    const listRes = await fetch('https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=50', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const listData = await listRes.json();
    const messages = listData.messages || [];

    // Process each message
    const syncedContacts = [];
    for (const msg of messages.slice(0, 20)) {
      const msgRes = await fetch(`https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const msgData = await msgRes.json();
      const headers = msgData.payload?.headers || [];
      
      const fromHeader = headers.find(h => h.name === 'From')?.value || '';
      const email = fromHeader.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0];
      const name = fromHeader.replace(/<.*>/, '').trim();
      const subject = headers.find(h => h.name === 'Subject')?.value || '';
      const date = headers.find(h => h.name === 'Date')?.value || '';

      if (email) {
        // Save/update contact
        const existing = await base44.entities.Contact.filter({ email });
        if (existing.length === 0) {
          await base44.entities.Contact.create({
            email,
            full_name: name || email,
            source: 'gmail'
          });
        }

        syncedContacts.push({ email, name, subject, date });
      }
    }

    return Response.json({ 
      success: true, 
      syncedCount: syncedContacts.length,
      contacts: syncedContacts 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
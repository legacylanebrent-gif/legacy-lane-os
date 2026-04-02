import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all connections for this user
    const connections = await base44.entities.Connection.filter({
      account_owner_id: user.id
    });

    // Group connections by email
    const emailGroups = {};
    connections.forEach(conn => {
      const email = conn.connected_user_email?.toLowerCase();
      if (email) {
        if (!emailGroups[email]) {
          emailGroups[email] = [];
        }
        emailGroups[email].push(conn);
      }
    });

    // Find and remove duplicates
    const duplicatesRemoved = [];
    for (const [email, conns] of Object.entries(emailGroups)) {
      if (conns.length > 1) {
        // Sort by created_date (keep oldest) or by most complete record
        conns.sort((a, b) => {
          // Prefer connections with more data
          const scoreA = (a.connected_user_phone ? 1 : 0) + (a.notes ? 1 : 0) + (a.tags?.length || 0);
          const scoreB = (b.connected_user_phone ? 1 : 0) + (b.notes ? 1 : 0) + (b.tags?.length || 0);
          
          if (scoreA !== scoreB) return scoreB - scoreA;
          
          // Then by created date (keep oldest)
          return new Date(a.created_date) - new Date(b.created_date);
        });

        // Keep the first one, delete the rest
        const toKeep = conns[0];
        const toDelete = conns.slice(1);

        for (const conn of toDelete) {
          await base44.entities.Connection.delete(conn.id);
          duplicatesRemoved.push({
            id: conn.id,
            email: conn.connected_user_email,
            name: conn.connected_user_name
          });
        }
      }
    }

    return Response.json({
      success: true,
      duplicatesRemoved: duplicatesRemoved.length,
      details: duplicatesRemoved
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
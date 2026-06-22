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

    const normalizePhone = (phone) => {
      if (!phone) return null;
      const digits = phone.replace(/\D/g, '');
      if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
      return digits.length >= 10 ? digits : null;
    };

    const scoreConnection = (conn) => {
      return (conn.connected_user_phone ? 1 : 0) +
             (conn.notes ? 1 : 0) +
             (conn.tags?.length || 0) +
             (conn.connected_user_name && conn.connected_user_name !== 'Unnamed' ? 1 : 0) +
             (conn.lifetime_value ? 1 : 0);
    };

    const seenKeys = new Set();
    const duplicatesRemoved = [];

    // Group by email (normalized lowercase)
    const emailGroups = {};
    connections.forEach(conn => {
      const email = conn.connected_user_email?.toLowerCase().trim();
      if (email) {
        if (!emailGroups[email]) emailGroups[email] = [];
        emailGroups[email].push(conn);
      }
    });

    // Group by phone (normalized digits)
    const phoneGroups = {};
    connections.forEach(conn => {
      const phone = normalizePhone(conn.connected_user_phone);
      if (phone) {
        if (!phoneGroups[phone]) phoneGroups[phone] = [];
        phoneGroups[phone].push(conn);
      }
    });

    // Process email groups
    for (const [email, conns] of Object.entries(emailGroups)) {
      if (conns.length > 1) {
        conns.sort((a, b) => {
          const scoreA = scoreConnection(a);
          const scoreB = scoreConnection(b);
          if (scoreA !== scoreB) return scoreB - scoreA;
          return new Date(a.created_date) - new Date(b.created_date);
        });

        const toKeep = conns[0];
        seenKeys.add(toKeep.id);
        const toDelete = conns.slice(1);

        for (const conn of toDelete) {
          if (seenKeys.has(conn.id)) continue;
          seenKeys.add(conn.id);
          await base44.entities.Connection.delete(conn.id);
          duplicatesRemoved.push({
            id: conn.id,
            email: conn.connected_user_email,
            name: conn.connected_user_name,
            matchedBy: 'email'
          });
        }
      }
    }

    // Process phone groups (catch duplicates with different emails but same phone)
    for (const [phone, conns] of Object.entries(phoneGroups)) {
      if (conns.length > 1) {
        conns.sort((a, b) => {
          const scoreA = scoreConnection(a);
          const scoreB = scoreConnection(b);
          if (scoreA !== scoreB) return scoreB - scoreA;
          return new Date(a.created_date) - new Date(b.created_date);
        });

        const toKeep = conns[0];
        const toDelete = conns.slice(1);

        for (const conn of toDelete) {
          if (seenKeys.has(conn.id)) continue;
          seenKeys.add(conn.id);
          await base44.entities.Connection.delete(conn.id);
          duplicatesRemoved.push({
            id: conn.id,
            email: conn.connected_user_email,
            name: conn.connected_user_name,
            matchedBy: 'phone'
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
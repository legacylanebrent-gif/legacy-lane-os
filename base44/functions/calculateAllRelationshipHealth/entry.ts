import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all connections for this user
    const connections = await base44.entities.Connection.filter({ 
      account_owner_id: user.id,
      status: 'connected'
    });

    const healthRecords = [];

    // Calculate health for each connection
    for (const connection of connections) {
      try {
        // Simulate calling calculateRelationshipHealth logic inline
        const allMessages = await base44.entities.Message.list('-created_date', 1000);
        const conversationMessages = allMessages.filter(m =>
          (m.sender_id === connection.account_owner_id && m.recipient_id === connection.connected_user_id) ||
          (m.sender_id === connection.connected_user_id && m.recipient_id === connection.account_owner_id)
        );

        const now = new Date();
        const messagesSent = conversationMessages.filter(m => m.sender_id === connection.account_owner_id).length;
        const messagesReceived = conversationMessages.filter(m => m.recipient_id === connection.account_owner_id).length;
        const totalMessages = messagesSent + messagesReceived;

        const lastMessage = conversationMessages.length > 0 ? conversationMessages[0] : null;
        const lastInteractionDate = lastMessage ? new Date(lastMessage.created_date) : null;
        const daysSinceLastContact = lastInteractionDate 
          ? Math.floor((now - lastInteractionDate.getTime()) / (1000 * 60 * 60 * 24))
          : 999;

        // Simplified health score calculation
        let healthScore = 50;
        if (totalMessages >= 20) healthScore += 15;
        else if (totalMessages >= 10) healthScore += 10;
        
        if (daysSinceLastContact <= 7) healthScore += 25;
        else if (daysSinceLastContact <= 14) healthScore += 15;
        else if (daysSinceLastContact <= 30) healthScore += 10;

        healthScore = Math.max(0, Math.min(100, healthScore));

        let partnershipStatus = 'prospect';
        if (totalMessages > 20 && daysSinceLastContact <= 7) partnershipStatus = 'active_partner';
        else if (daysSinceLastContact > 60) partnershipStatus = 'at_risk';
        else if (totalMessages > 5) partnershipStatus = 'initial_contact';

        // Determine next follow-up
        let nextFollowUpDate = null;
        if (daysSinceLastContact > 30) nextFollowUpDate = now.toISOString().split('T')[0];
        else if (daysSinceLastContact > 14) {
          const date = new Date(now);
          date.setDate(date.getDate() + 3);
          nextFollowUpDate = date.toISOString().split('T')[0];
        } else if (daysSinceLastContact > 7) {
          const date = new Date(now);
          date.setDate(date.getDate() + 7);
          nextFollowUpDate = date.toISOString().split('T')[0];
        } else {
          const date = new Date(now);
          date.setDate(date.getDate() + 14);
          nextFollowUpDate = date.toISOString().split('T')[0];
        }

        // Upsert health record
        const existingHealth = await base44.entities.RelationshipHealth.filter({ connection_id: connection.id });
        
        const healthData = {
          connection_id: connection.id,
          health_score: healthScore,
          engagement_level: healthScore >= 80 ? 'very_high' : healthScore >= 65 ? 'high' : healthScore >= 45 ? 'moderate' : healthScore >= 25 ? 'low' : 'very_low',
          last_interaction_date: lastInteractionDate ? lastInteractionDate.toISOString() : null,
          days_since_last_contact: daysSinceLastContact,
          total_messages_exchanged: totalMessages,
          partnership_status: partnershipStatus,
          next_follow_up_date: nextFollowUpDate,
          relationship_stage: totalMessages >= 20 && daysSinceLastContact <= 7 ? 'growth' : totalMessages >= 10 ? 'commitment' : totalMessages >= 5 ? 'exploration' : 'awareness',
          calculated_at: now.toISOString()
        };

        let healthRecord;
        if (existingHealth.length > 0) {
          healthRecord = await base44.entities.RelationshipHealth.update(existingHealth[0].id, healthData);
        } else {
          healthRecord = await base44.entities.RelationshipHealth.create(healthData);
        }

        healthRecords.push({
          connection,
          health: healthRecord
        });

      } catch (error) {
        console.error(`Error processing connection ${connection.id}:`, error);
      }
    }

    // Sort by health score (lowest first - prioritize at-risk relationships)
    healthRecords.sort((a, b) => a.health.health_score - b.health.health_score);

    return Response.json({
      success: true,
      total_connections: connections.length,
      health_records: healthRecords,
      summary: {
        very_high: healthRecords.filter(r => r.health.health_score >= 80).length,
        high: healthRecords.filter(r => r.health.health_score >= 65 && r.health.health_score < 80).length,
        moderate: healthRecords.filter(r => r.health.health_score >= 45 && r.health.health_score < 65).length,
        low: healthRecords.filter(r => r.health.health_score >= 25 && r.health.health_score < 45).length,
        very_low: healthRecords.filter(r => r.health.health_score < 25).length,
        at_risk: healthRecords.filter(r => r.health.partnership_status === 'at_risk').length,
        needs_followup: healthRecords.filter(r => r.health.next_follow_up_date <= new Date().toISOString().split('T')[0]).length
      }
    });

  } catch (error) {
    console.error('Error calculating all relationship health:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
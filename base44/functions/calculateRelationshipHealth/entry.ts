import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { connection_id } = await req.json();

    if (!connection_id) {
      return Response.json({ error: 'connection_id required' }, { status: 400 });
    }

    // Get connection details
    const connections = await base44.entities.Connection.filter({ id: connection_id });
    if (connections.length === 0) {
      return Response.json({ error: 'Connection not found' }, { status: 404 });
    }

    const connection = connections[0];

    // Get all messages between these users
    const allMessages = await base44.entities.Message.list('-created_date', 1000);
    const conversationMessages = allMessages.filter(m =>
      (m.sender_id === connection.account_owner_id && m.recipient_id === connection.connected_user_id) ||
      (m.sender_id === connection.connected_user_id && m.recipient_id === connection.account_owner_id)
    );

    // Calculate metrics
    const now = new Date();
    const messagesSent = conversationMessages.filter(m => m.sender_id === connection.account_owner_id).length;
    const messagesReceived = conversationMessages.filter(m => m.recipient_id === connection.account_owner_id).length;
    
    // Calculate response times
    let totalResponseTime = 0;
    let responseCount = 0;
    
    for (let i = 1; i < conversationMessages.length; i++) {
      const current = conversationMessages[i];
      const previous = conversationMessages[i - 1];
      
      if (current.sender_id !== previous.sender_id) {
        const currentTime = new Date(current.created_date).getTime();
        const previousTime = new Date(previous.created_date).getTime();
        const responseTimeHours = (currentTime - previousTime) / (1000 * 60 * 60);
        
        if (responseTimeHours > 0 && responseTimeHours < 720) { // Ignore responses > 30 days
          totalResponseTime += responseTimeHours;
          responseCount++;
        }
      }
    }

    const avgResponseTime = responseCount > 0 ? totalResponseTime / responseCount : null;

    // Get last interaction
    const lastMessage = conversationMessages.length > 0 ? conversationMessages[0] : null;
    const lastInteractionDate = lastMessage ? new Date(lastMessage.created_date) : null;
    const daysSinceLastContact = lastInteractionDate 
      ? Math.floor((now - lastInteractionDate.getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    // Calculate health score (0-100)
    let healthScore = 50; // Base score

    // Engagement bonus (0-20 points)
    const totalMessages = messagesSent + messagesReceived;
    if (totalMessages >= 50) healthScore += 20;
    else if (totalMessages >= 20) healthScore += 15;
    else if (totalMessages >= 10) healthScore += 10;
    else if (totalMessages >= 5) healthScore += 5;

    // Recency bonus (0-25 points)
    if (daysSinceLastContact <= 3) healthScore += 25;
    else if (daysSinceLastContact <= 7) healthScore += 20;
    else if (daysSinceLastContact <= 14) healthScore += 15;
    else if (daysSinceLastContact <= 30) healthScore += 10;
    else if (daysSinceLastContact <= 60) healthScore += 5;

    // Response time bonus (0-15 points)
    if (avgResponseTime !== null) {
      if (avgResponseTime <= 2) healthScore += 15;
      else if (avgResponseTime <= 6) healthScore += 12;
      else if (avgResponseTime <= 24) healthScore += 8;
      else if (avgResponseTime <= 48) healthScore += 4;
    }

    // Balance penalty (if one-sided conversation)
    if (totalMessages > 0) {
      const ratio = Math.min(messagesSent, messagesReceived) / Math.max(messagesSent, messagesReceived);
      if (ratio < 0.3) healthScore -= 15;
      else if (ratio < 0.5) healthScore -= 8;
      else if (ratio < 0.7) healthScore -= 3;
    }

    healthScore = Math.max(0, Math.min(100, healthScore));

    // Determine engagement level
    let engagementLevel = 'moderate';
    if (healthScore >= 80) engagementLevel = 'very_high';
    else if (healthScore >= 65) engagementLevel = 'high';
    else if (healthScore >= 45) engagementLevel = 'moderate';
    else if (healthScore >= 25) engagementLevel = 'low';
    else engagementLevel = 'very_low';

    // Determine partnership status
    let partnershipStatus = 'prospect';
    if (connection.connection_type === 'referral' && totalMessages > 10) {
      partnershipStatus = 'active_partner';
    } else if (totalMessages > 20 && daysSinceLastContact <= 7) {
      partnershipStatus = 'active_partner';
    } else if (daysSinceLastContact > 60) {
      partnershipStatus = 'at_risk';
    } else if (totalMessages > 5) {
      partnershipStatus = 'initial_contact';
    }

    // Determine relationship stage
    let relationshipStage = 'awareness';
    if (totalMessages >= 50 && daysSinceLastContact <= 7) relationshipStage = 'growth';
    else if (totalMessages >= 20) relationshipStage = 'commitment';
    else if (totalMessages >= 10) relationshipStage = 'exploration';
    else if (daysSinceLastContact > 60) relationshipStage = 'decline';

    // Calculate next follow-up date
    let nextFollowUpDate = null;
    if (daysSinceLastContact > 30) nextFollowUpDate = now.toISOString().split('T')[0]; // Today
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

    // Generate AI insights
    const aiInsights = {
      strengths: [],
      concerns: [],
      recommendations: []
    };

    if (totalMessages >= 20) {
      aiInsights.strengths.push('Strong communication history');
    }
    if (avgResponseTime !== null && avgResponseTime <= 6) {
      aiInsights.strengths.push('Excellent response time');
    }
    if (messagesSent > 0 && messagesReceived > 0 && Math.abs(messagesSent - messagesReceived) / (messagesSent + messagesReceived) < 0.2) {
      aiInsights.strengths.push('Balanced two-way communication');
    }

    if (daysSinceLastContact > 30) {
      aiInsights.concerns.push('No recent contact - relationship may be cooling');
      aiInsights.recommendations.push('Send a check-in message or share relevant update');
    }
    if (avgResponseTime !== null && avgResponseTime > 48) {
      aiInsights.concerns.push('Slow response times may indicate low engagement');
      aiInsights.recommendations.push('Consider more concise, action-oriented messages');
    }
    if (messagesSent > messagesReceived * 2) {
      aiInsights.concerns.push('Communication appears one-sided');
      aiInsights.recommendations.push('Focus on providing value before requesting engagement');
    }

    if (partnershipStatus === 'active_partner' && daysSinceLastContact <= 7) {
      aiInsights.recommendations.push('Relationship is healthy - consider discussing new opportunities');
    }
    if (relationshipStage === 'exploration' && totalMessages >= 10) {
      aiInsights.recommendations.push('Good momentum - suggest a call or meeting to deepen partnership');
    }

    // Upsert relationship health record
    const existingHealth = await base44.entities.RelationshipHealth.filter({ connection_id });
    
    const healthData = {
      connection_id,
      health_score: healthScore,
      engagement_level: engagementLevel,
      last_interaction_date: lastInteractionDate ? lastInteractionDate.toISOString() : null,
      days_since_last_contact: daysSinceLastContact,
      total_messages_exchanged: totalMessages,
      avg_response_time_hours: avgResponseTime,
      partnership_status: partnershipStatus,
      referrals_sent: 0, // Would need to calculate from ReferralLead entity
      referrals_received: 0,
      revenue_generated: 0, // Would need to calculate from RevenueEvent entity
      next_follow_up_date: nextFollowUpDate,
      relationship_stage: relationshipStage,
      ai_insights_json: aiInsights,
      calculated_at: now.toISOString()
    };

    let healthRecord;
    if (existingHealth.length > 0) {
      healthRecord = await base44.entities.RelationshipHealth.update(existingHealth[0].id, healthData);
    } else {
      healthRecord = await base44.entities.RelationshipHealth.create(healthData);
    }

    return Response.json({
      success: true,
      health_record: healthRecord,
      metrics: {
        messages_sent: messagesSent,
        messages_received: messagesReceived,
        total_messages: totalMessages,
        avg_response_time_hours: avgResponseTime,
        days_since_last_contact: daysSinceLastContact,
        health_score: healthScore,
        engagement_level: engagementLevel,
        partnership_status: partnershipStatus,
        relationship_stage: relationshipStage,
        next_follow_up_date: nextFollowUpDate,
        ai_insights: aiInsights
      }
    });

  } catch (error) {
    console.error('Error calculating relationship health:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
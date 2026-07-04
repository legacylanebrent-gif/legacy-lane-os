import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ─────────────────────────────────────────────
// logRecoveryEvent
// Called by the frontend RecoveryAgent whenever an error is caught.
// Logs the event to AgentRecoveryEvent, creates a LaunchIssue if critical,
// and notifies the admin team.
// ─────────────────────────────────────────────

const SUPER_AGENT_MAP = {
  api_failure: 'Recovery Agent',
  database_failure: 'Recovery Agent',
  missing_data: 'Recovery Agent',
  permissions_error: 'Customer Success Agent',
  subscription_failure: 'Financial Ops Agent',
  payment_failure: 'Financial Ops Agent',
  broken_route: 'Recovery Agent',
  page_404: 'Recovery Agent',
  blank_page: 'Recovery Agent',
  ai_timeout: 'Recovery Agent',
  automation_failure: 'Admin Ops Agent',
  crm_failure: 'Lead Conversion Agent',
  inventory_failure: 'Inventory Pricing Agent',
  marketplace_failure: 'Recovery Agent',
  search_failure: 'Recovery Agent',
  lead_failure: 'Lead Conversion Agent',
  image_recognition_failure: 'Inventory Pricing Agent',
  pos_failure: 'Recovery Agent',
  qr_failure: 'Recovery Agent',
  sync_failure: 'Recovery Agent',
  react_render_error: 'Recovery Agent',
  network_error: 'Recovery Agent',
  other: 'Recovery Agent',
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Auth optional — public app may have anonymous users
    let user = null;
    try {
      user = await base44.auth.me();
    } catch { /* anonymous user */ }

    const body = await req.json().catch(() => ({}));
    const {
      event_type = 'other',
      severity = 'medium',
      page_url = '',
      page_module = '',
      action_attempted = '',
      error_message = '',
      error_stack = '',
      browser = '',
      device = '',
      session_id = '',
    } = body;

    const assignedAgent = SUPER_AGENT_MAP[event_type] || 'Recovery Agent';
    const now = new Date().toISOString();

    const recoveryMessage = 'Looks like something didn\'t go as planned. I\'ve already reported the issue to the EstateSalen team and I\'ll help you continue.';

    // 1. Create AgentRecoveryEvent
    const recoveryEvent = await base44.asServiceRole.entities.AgentRecoveryEvent.create({
      event_type,
      severity,
      user_id: user?.id || null,
      user_email: user?.email || null,
      user_role: user?.primary_account_type || null,
      company_name: user?.company_name || null,
      session_id,
      page_url,
      page_module,
      action_attempted,
      error_message,
      error_stack,
      browser,
      device,
      recovery_message_shown: recoveryMessage,
      recovery_action_taken: 'retry_offered',
      assigned_super_agent: assignedAgent,
      status: 'recovered',
      timestamp: now,
    });

    // 2. Create LaunchIssue for high/critical severity
    if (severity === 'critical' || severity === 'high') {
      const roleMap = {
        consumer: 'consumer',
        estate_sale_operator: 'estate_sale_company',
        real_estate_agent: 'referral_partner',
        vendor: 'vendor',
        reseller: 'reseller',
        admin: 'admin',
      };
      const affectedRole = user?.primary_account_type ? (roleMap[user.primary_account_type] || 'all_roles') : 'guest';

      await base44.asServiceRole.entities.LaunchIssue.create({
        issue_title: `${event_type.replace(/_/g, ' ')} on ${page_module || page_url || 'unknown page'}`,
        issue_description: `User attempted: ${action_attempted || 'unknown action'}. Error: ${error_message || 'No error message'}`,
        affected_role: affectedRole,
        affected_module: page_module || 'unknown',
        affected_page: page_url,
        severity,
        status: 'open',
        assigned_super_agent: assignedAgent,
        is_launch_blocker: severity === 'critical',
        verification_status: 'unverified',
        recovery_event_id: recoveryEvent.id,
        error_message,
        estimated_complexity: severity === 'critical' ? 'critical' : 'medium',
        user_id: user?.id || null,
        session_id,
        browser,
        device,
        tags: [event_type, assignedAgent],
      });
    }

    // 3. Create an admin notification
    try {
      await base44.asServiceRole.entities.Notification.create({
        user_id: null,
        title: `Recovery Event: ${event_type.replace(/_/g, ' ')}`,
        message: `${severity.toUpperCase()} — ${action_attempted || 'Unknown action'} on ${page_module || page_url}. Assigned to ${assignedAgent}.`,
        type: 'system_alert',
        is_read: false,
        created_at: now,
        metadata: {
          recovery_event_id: recoveryEvent.id,
          event_type,
          severity,
          page_url,
        },
      });
    } catch (e) {
      console.error('Failed to create notification:', e.message);
    }

    return Response.json({
      success: true,
      recovery_event_id: recoveryEvent.id,
      recovery_message: recoveryMessage,
      assigned_agent: assignedAgent,
    });
  } catch (error) {
    console.error('logRecoveryEvent error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
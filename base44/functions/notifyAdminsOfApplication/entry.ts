import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { applicant_user_id, applicant_name, applicant_email, application_type, details } = await req.json();

    // Find all admin users (service role can do this)
    const adminUsers = await base44.asServiceRole.entities.User.filter({ role: 'admin' });

    const titles = {
      company_claim: '🏢 New Company Claim Submitted',
      reseller: '🛒 New Reseller Application',
      agent_territory: '🏡 New Agent Territory Application',
    };
    const messages = {
      company_claim: `${applicant_name || applicant_email} has claimed ${details || 'a company'}. Pending verification in Admin Users.`,
      reseller: `${applicant_name || applicant_email} has applied to become a Reseller. Review in Admin Users.`,
      agent_territory: `${applicant_name || applicant_email} has submitted a territory application. Details: ${details}`,
    };

    const title = titles[application_type] || 'New Application';
    const message = messages[application_type] || `New application from ${applicant_name || applicant_email}.`;

    // Notify each admin
    for (const admin of adminUsers) {
      await base44.asServiceRole.entities.Notification.create({
        user_id: admin.id,
        type: 'system',
        title,
        message,
        link_to_page: 'AdminUsers',
        read: false,
      });
    }

    // Also send email to admins
    for (const admin of adminUsers) {
      if (admin.email) {
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: admin.email,
            from_name: 'EstateSalen.com',
            subject: title,
            body: `<p>Hi ${admin.full_name || 'Admin'},</p><p>${message}</p><p>Log in to review and approve or deny this application.</p>`,
          });
        } catch (e) {
          console.error('Email failed for admin:', admin.email, e.message);
        }
      }
    }

    return Response.json({ success: true, notified: adminUsers.length });
  } catch (error) {
    console.error('notifyAdminsOfApplication error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
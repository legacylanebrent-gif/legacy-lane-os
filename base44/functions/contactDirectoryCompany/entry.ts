import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// A directory visitor asking to reach a listed company. Nothing is sent to the
// company from here: the request lands with EstateSalen admins as a lead, and an
// admin makes the introduction. The company never receives the visitor's
// details from this app directly.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    const name = (body.name || '').trim();
    const email = (body.email || '').trim();
    const message = (body.message || '').trim();
    const companyName = (body.company_name || '').trim();

    if (!name || !email || !companyName) {
      return Response.json({ error: 'Your name, email and the company are required.' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: 'That email address does not look right.' }, { status: 400 });
    }

    const details = [
      `Directory contact request for ${companyName}`,
      body.company_city || body.company_state ? `Company location: ${[body.company_city, body.company_state].filter(Boolean).join(', ')}` : '',
      body.company_phone ? `Company phone: ${body.company_phone}` : '',
      body.company_email ? `Company email: ${body.company_email}` : '',
      body.phone ? `Visitor phone: ${body.phone}` : '',
      message ? `Visitor message: ${message}` : '',
    ].filter(Boolean).join('\n');

    const lead = await base44.asServiceRole.entities.Lead.create({
      source: 'website',
      intent: 'estate_sale',
      contact_name: name,
      contact_email: email,
      contact_phone: (body.phone || '').trim(),
      source_details: details,
      notes: `Company introduction requested through the company directory. Admin should introduce EstateSalen to ${companyName} and pass along this lead.`,
    });

    const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    const notifications = (admins || []).map(admin => ({
      user_id: admin.id,
      type: 'new_lead',
      title: 'Directory contact request',
      message: `${name} asked to reach ${companyName}. Introduce EstateSalen and pass the lead along.`,
      read: false,
      link_to_page: 'CRM',
      related_entity_type: 'Lead',
      related_entity_id: lead.id,
    }));
    if (notifications.length > 0) {
      await base44.asServiceRole.entities.Notification.bulkCreate(notifications);
    }

    const adminEmails = (admins || []).map(a => a.email).filter(Boolean);
    if (adminEmails.length > 0) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: adminEmails.join(','),
        subject: `Directory contact request: ${companyName}`,
        body: `A visitor wants to reach ${companyName}.\n\nVisitor: ${name}\nEmail: ${email}\nPhone: ${(body.phone || 'not given')}\n\n${message ? `Message:\n${message}\n\n` : ''}Please introduce EstateSalen and pass this lead to the company.\n\nThe lead is saved in your CRM.`,
      }).catch(() => null);
    }

    return Response.json({ ok: true, lead_id: lead.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
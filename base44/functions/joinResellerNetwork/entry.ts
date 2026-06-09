import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const joinLog = new Map();
function isRateLimited(email) {
  const now = Date.now();
  const reqs = (joinLog.get(email) || []).filter(t => now - t < 3600000);
  reqs.push(now);
  joinLog.set(email, reqs);
  return reqs.length > 5;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { business_name, contact_name, email, phone, website, city, state, zip,
            business_type, lead_types, service_states, plan } = body;

    if (!business_name || !contact_name || !email) {
      return Response.json({ error: 'business_name, contact_name, and email are required' }, { status: 400 });
    }
    if (isRateLimited(email)) {
      return Response.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    // Check for existing profile
    const existing = await base44.asServiceRole.entities.ResellerProfile.filter({ email });
    if (existing.length > 0) {
      return Response.json({ error: 'An account with this email already exists. Please contact support.', already_exists: true }, { status: 409 });
    }

    const isNetwork = plan === 'network_member';

    const profile = await base44.asServiceRole.entities.ResellerProfile.create({
      business_name,
      contact_name,
      email,
      phone: phone || '',
      website: website || '',
      city: city || '',
      state: state || '',
      zip: zip || '',
      business_type: business_type || 'other',
      lead_types: lead_types || [],
      service_states: service_states || (state ? [state] : []),
      membership_status: isNetwork ? 'network_member' : 'free',
      subscription_status: isNetwork ? 'trial' : 'none',
      lead_notifications_enabled: isNetwork,
      claimed_listing: true,
      is_active: true
    });

    // Notify admin
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: 'admin@estatesalen.com',
        subject: `New Reseller Network ${isNetwork ? 'Member' : 'Free Profile'}: ${business_name}`,
        body: `Name: ${contact_name}\nBusiness: ${business_name}\nEmail: ${email}\nPhone: ${phone || 'N/A'}\nLocation: ${city}, ${state}\nPlan: ${plan}\nLead Types: ${(lead_types || []).join(', ')}`
      });
    } catch { /* non-blocking */ }

    return Response.json({
      success: true,
      profile_id: profile.id,
      plan,
      message: isNetwork
        ? 'Welcome to the EstateSalen Reseller Network! You will begin receiving lead notifications in your service area.'
        : 'Your free directory profile has been created. Upgrade to the Reseller Network to receive lead notifications.'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
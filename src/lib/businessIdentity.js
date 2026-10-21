// ── CANONICAL BUSINESS IDENTITY RESOLUTION (Chapter 7 P1) ───────────────────
// COMPANY = CANONICAL TRUTH. Legacy User/tenant fields remain only as
// documented fallbacks for records where canonical Company data is absent.
// Every fallback below is deliberate and documented — do not add new
// authoritative identity stores.
//
// resolveBusinessIdentity(user, company) — pure resolver, no I/O.
// loadBusinessIdentity(sdk, user) — fetches the operator's canonical Company
//   (by user.company_id) and returns { company, identity }.

export function resolveBusinessIdentity(user, company) {
  const c = company || {};
  const u = user || {};

  const pick = (canonical, ...legacy) => {
    if (canonical !== undefined && canonical !== null && String(canonical).trim() !== '') return canonical;
    return legacy.find(v => v !== undefined && v !== null && String(v).trim() !== '') || '';
  };

  return {
    // Canonical: Company.display_name → Company.legal_name → legacy User.company_name → User.full_name
    displayName: pick(c.display_name, c.legal_name, u.company_name, u.full_name),
    legalName: pick(c.legal_name, u.company_name),
    // Canonical: Company.logo_url → legacy User logo fields (signs/PDFs read these historically)
    logoUrl: pick(c.logo_url, u.logo_dark, u.logo_light, u.company_logo_url, u.company_logo),
    // Canonical: Company.phone → legacy User.business_phone(_2) → User.phone
    phone: pick(c.phone, u.business_phone, u.business_phone_2, u.phone),
    email: pick(c.email, u.email),
    websiteUrl: pick(c.website_url, u.website),
    serviceAreaNotes: pick(c.service_area_notes),
    companyId: pick(c.id, u.company_id),
  };
}

export async function loadBusinessIdentity(sdk, user) {
  let company = null;
  try {
    if (user?.company_id) {
      const res = await sdk.entities.Company.filter({ id: user.company_id });
      company = Array.isArray(res) && res.length ? res[0] : null;
    }
  } catch (e) {
    // Canonical lookup failed → documented legacy fallback applies below.
  }
  return { company, identity: resolveBusinessIdentity(user, company) };
}
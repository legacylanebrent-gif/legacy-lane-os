// Phase 3D.4 (Parts 1/2/5) — credential→Company authority for ALL legacy bridge paths.
//
// An operator may own Sales across multiple Companies (this exact situation is
// what Phase 3D.3 exposed). Legacy paths that selected Sales by operator_id
// leaked cross-Company data. The authenticated credential resolves ONE
// authoritative Company:
//   1. apiKeyRecord.company_id — explicit credential→Company binding (preferred)
//   2. the operator's single active Company (primary contact) — only when unambiguous
// Fail closed when no unambiguous Company can be derived.
// Client-supplied company_id is NEVER read or trusted anywhere.
export async function resolveCredentialCompany(base44, apiKeyRecord) {
  if (!apiKeyRecord) return { ok: false, reason: 'no_credential' };
  if (apiKeyRecord.company_id) {
    const company = await base44.asServiceRole.entities.Company.get(apiKeyRecord.company_id).catch(() => null);
    if (company && company.status === 'active') {
      return { ok: true, company_id: company.id, company_name: company.display_name || company.legal_name || apiKeyRecord.operator_name || null };
    }
    return { ok: false, reason: 'credential_company_inactive_or_missing' };
  }
  const page = await base44.asServiceRole.entities.Company.filter(
    { primary_contact_user_id: apiKeyRecord.operator_id, status: 'active' }).catch(() => []);
  const companies = page.items || page;
  if (companies.length === 1) {
    return { ok: true, company_id: companies[0].id, company_name: companies[0].display_name || companies[0].legal_name || apiKeyRecord.operator_name || null };
  }
  return { ok: false, reason: companies.length > 1 ? 'operator_owns_multiple_companies_no_credential_binding' : 'no_company_resolvable_from_credential' };
}
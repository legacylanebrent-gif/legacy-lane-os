// Chapter 11 P1 — shared vocabulary + deterministic matching for the
// operator's professional referral network. The Contact entity is the
// canonical professional record (NO separate partner entity).
// Doctrines encoded here:
// - UNKNOWN CAPABILITY IS NOT SUPPORTED CAPABILITY.
// - AN OFFICE ADDRESS IS NOT A SERVICE AREA.
// - This is deterministic SEARCH/FILTER — never called "AI matching".

export const SERVICE_CATEGORIES = [
  { key: "real_estate", label: "Real Estate" },
  { key: "elder_law", label: "Elder Law" },
  { key: "probate_estate_law", label: "Probate / Estate Law" },
  { key: "organizing", label: "Organizing" },
  { key: "senior_move", label: "Senior Move Management" },
  { key: "moving", label: "Moving" },
  { key: "cleanout", label: "Cleanout" },
  { key: "donation", label: "Donation" },
  { key: "appraisal", label: "Appraisal" },
  { key: "auction", label: "Auction" },
  { key: "consignment", label: "Consignment" },
  { key: "buyout", label: "Buyout" },
  { key: "jewelry", label: "Jewelry" },
  { key: "fine_art", label: "Fine Art" },
  { key: "coins", label: "Coins" },
  { key: "vehicles", label: "Vehicles" },
  { key: "collectibles_specialty", label: "Collectibles / Specialty" },
  { key: "contractor_home_services", label: "Contractor / Home Services" },
  { key: "accounting_tax", label: "Accounting / Tax" },
  { key: "other", label: "Other" },
];

export const categoryLabel = (key) =>
  (SERVICE_CATEGORIES.find((c) => c.key === key) || {}).label || key;

export const PROFESSIONAL_ROLES = [
  "referral", "agent", "attorney", "cpa", "insurance", "payroll",
  "bookkeeper", "tax_adviser", "employment_adviser", "contractor", "vendor",
];

export const isProfessionalContact = (c) =>
  (c.roles || []).some((r) => PROFESSIONAL_ROLES.includes(r)) ||
  ((c.professional_profile || {}).service_categories || []).length > 0;

export const getProfile = (c) => c.professional_profile || {};

export const LICENSE_STATUSES = [
  { key: "NOT_APPLICABLE", label: "Not Applicable" },
  { key: "NOT_VERIFIED", label: "Not Verified" },
  { key: "VERIFIED", label: "Verified" },
  { key: "REVIEW_NEEDED", label: "Review Needed" },
];

export const OUTCOME_OPTIONS = [
  { key: "INTRODUCED", label: "Introduced" },
  { key: "CONTACTED", label: "Provider Contacted" },
  { key: "ACCEPTED", label: "Provider Accepted" },
  { key: "DECLINED", label: "Provider Declined" },
  { key: "UNAVAILABLE", label: "Provider Unavailable" },
  { key: "CLIENT_CHOSE_PROVIDER", label: "Client Chose This Provider" },
  { key: "CLIENT_CHOSE_OTHER", label: "Client Chose Someone Else" },
  { key: "SERVICE_COMPLETED", label: "Service Completed" },
  { key: "NO_RESPONSE", label: "No Response" },
  { key: "CANCELLED", label: "Cancelled" },
  { key: "UNKNOWN_FOLLOW_UP_NEEDED", label: "Unknown — Follow-up Needed" },
];

export const outcomeLabel = (key) =>
  (OUTCOME_OPTIONS.find((o) => o.key === key) || {}).label || key || "Introduced";

// The ONLY client fields that may be shared in an introduction — the
// minimum-necessary allow-list. Access codes, keys, financials, settlement,
// family matters, private notes, inventory, and documents are never here.
export const AUTHORIZED_FIELD_OPTIONS = [
  { key: "client_name", label: "Client name" },
  { key: "preferred_contact_method", label: "Preferred contact method" },
  { key: "general_need", label: "General need" },
  { key: "property_city", label: "Property city" },
  { key: "brief_authorized_context", label: "Brief authorized context" },
];

const normCounty = (s) =>
  String(s || "").toLowerCase().trim().replace(/\s+county$/i, "").trim();
const normState = (s) => String(s || "").trim().toUpperCase();

export const hasServiceAreaData = (profile) => {
  const sa = profile.service_area || {};
  return Boolean(
    (sa.states || []).length || (sa.counties || []).length ||
    (sa.cities || []).length || (sa.zip_codes || []).length
  );
};

// Deterministic geographic coverage. Returns { tier, reasons } with
// tier: "confirmed" | "unknown" | "not_covered" — never a fabricated match.
export const geoCoverage = (profile, { state, county, zip }) => {
  const sa = profile.service_area || {};
  const reasons = [];
  if (zip && (sa.zip_codes || []).map(String).includes(String(zip))) {
    reasons.push(`SERVES ZIP ${zip}`);
  } else if (county && (sa.counties || []).map(normCounty).includes(normCounty(county))) {
    reasons.push(`SERVES ${String(county).toUpperCase()} COUNTY`);
  }
  if (reasons.length === 0 && state) {
    const st = normState(state);
    const inState = (sa.states || []).map(normState).includes(st);
    const hasFiner = (sa.counties || []).length > 0 || (sa.zip_codes || []).length > 0;
    if (inState && !hasFiner) reasons.push(`STATEWIDE COVERAGE (${st})`);
  }
  if (reasons.length > 0) return { tier: "confirmed", reasons };
  if (!hasServiceAreaData(profile)) return { tier: "unknown", reasons: [] };
  // Declared service areas exist and do not cover this location — this is NOT
  // presented as an appropriate match.
  return { tier: "not_covered", reasons: [] };
};

// Build the deterministic result set for a Who Can Help query. Pure filter —
// no scores, no quality ranking, no fabricated availability.
export const matchProviders = (contacts, { category, state, county, zip }) => {
  const confirmed = [];
  const unknownArea = [];
  for (const c of contacts) {
    const p = getProfile(c);
    if (!(p.service_categories || []).includes(category)) continue;
    const g = geoCoverage(p, { state, county, zip });
    if (g.tier === "confirmed") {
      confirmed.push({ contact: c, reasons: g.reasons, areaTier: "confirmed" });
    } else if (g.tier === "unknown") {
      unknownArea.push({
        contact: c,
        reasons: ["SERVICE AREA UNKNOWN — VERIFY COVERAGE DIRECTLY"],
        areaTier: "unknown",
      });
    }
  }
  const byName = (a, b) =>
    (a.contact.last_name || "").localeCompare(b.contact.last_name || "");
  return { confirmed: confirmed.sort(byName), unknownArea: unknownArea.sort(byName) };
};

// Non-geographic deterministic reasons shown beside every result.
export const providerReasons = (profile) => {
  const out = [];
  const lim = profile.limitations || {};
  if ((lim.does_not_handle || []).length) out.push("LIMITATIONS ON RECORD — REVIEW BEFORE REFERRING");
  if (lim.travel_limits) out.push(`TRAVEL LIMITS: ${lim.travel_limits}`);
  if (lim.availability_constraints) out.push(`AVAILABILITY: ${lim.availability_constraints}`);
  if ((profile.preferences || {}).preferred_project_types) {
    out.push(`PREFERS: ${profile.preferences.preferred_project_types}`);
  }
  return out;
};

export const displayName = (c) => {
  const p = getProfile(c);
  const person = [c.first_name, c.last_name].filter(Boolean).join(" ") || "Unnamed";
  return p.organization_name ? `${p.organization_name} — ${person}` : person;
};

export const serviceAreaSummary = (profile) => {
  const sa = profile.service_area || {};
  const parts = [];
  if ((sa.states || []).length) parts.push(`States: ${sa.states.join(", ")}`);
  if ((sa.counties || []).length) parts.push(`Counties: ${sa.counties.join(", ")}`);
  if ((sa.cities || []).length) parts.push(`Cities: ${sa.cities.join(", ")}`);
  if ((sa.zip_codes || []).length) parts.push(`ZIPs: ${sa.zip_codes.join(", ")}`);
  if (sa.radius_miles) parts.push(`Radius: ${sa.radius_miles} mi`);
  if (sa.notes) parts.push(`Notes: ${sa.notes}`);
  return parts.join(" · ") || "SERVICE AREA UNKNOWN";
};

// Introduction text — ONLY the fields the operator recorded the client as
// authorizing. Nothing else is included by construction.
export const buildIntroductionText = ({ providerName, clientName, preferredContact, generalNeed, propertyCity, briefContext }) => {
  const lines = [];
  lines.push(`Hello ${providerName},`);
  lines.push(`I'd like to introduce ${clientName || "a client I'm helping"}${propertyCity ? ` (${propertyCity})` : ""}.`);
  if (generalNeed) lines.push(`They could use help with: ${generalNeed}.`);
  if (preferredContact) lines.push(`Preferred contact: ${preferredContact}.`);
  if (briefContext) lines.push(briefContext);
  lines.push("Please reach out when you can. Thank you!");
  return lines.filter(Boolean).join("\n");
};

// Client-facing provider summary — PUBLIC-SAFE FIELDS ONLY. Private fit
// notes, experience history, licensing review notes, and compensation are
// excluded by construction. Not an endorsement.
export const buildClientSummaryText = (provider) => {
  const p = getProfile(provider);
  const lines = [];
  lines.push(p.organization_name || `${provider.first_name} ${provider.last_name}`.trim());
  const cats = (p.service_categories || []).map(categoryLabel);
  if (cats.length) lines.push(`Services: ${cats.join(", ")}`);
  if (provider.phone) lines.push(`Phone: ${provider.phone}`);
  if (provider.email) lines.push(`Email: ${provider.email}`);
  lines.push(serviceAreaSummary(p));
  lines.push("(Shared as an option — not an endorsement. Please contact them directly.)");
  return lines.filter(Boolean).join("\n");
};

export const genPartnerToken = () => {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const buf = new Uint8Array(20);
  crypto.getRandomValues(buf);
  return Array.from(buf).map((b) => alphabet[b % alphabet.length]).join("");
};

// Chapter 11 → Chapter 10 attribution mapping for the partner intake.
export const categoryToReferralSourceType = (category) => ({
  real_estate: "real_estate_agent",
  elder_law: "attorney",
  probate_estate_law: "attorney",
  accounting_tax: "attorney",
  organizing: "professional_organizer",
  senior_move: "senior_move_manager",
  moving: "senior_move_manager",
}[category] || "other");
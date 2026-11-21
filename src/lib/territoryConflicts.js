/**
 * Territory overlap detection for agent territory applications.
 *
 * An agent's territory is expressed two ways on AgentTerritoryApplication:
 *   - cities_requested / county_requested  (what they asked for, free text)
 *   - territory_cities / territory_municipalities (the expanded town list an admin assigned)
 *
 * Overlap is a plain token comparison on normalized place names. It is a review
 * signal for the admin, never an automatic grant or refusal: two agents may share
 * a county on purpose (preferred, non-exclusive agents), so the decision stays human.
 */

const splitList = (value) =>
  String(value || '')
    .split(/[,;\n]/)
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);

const normCounty = (value) => {
  const c = String(value || '').trim().toLowerCase().replace(/\s+county$/, '');
  return c ? `${c} county` : '';
};

export function territoryTokens(app) {
  const tokens = new Set();
  if (!app) return tokens;

  (app.territory_cities || []).forEach((city) => {
    const c = String(city || '').trim().toLowerCase();
    if (c) tokens.add(c);
  });

  splitList(app.cities_requested).forEach((c) => tokens.add(c));

  const county = normCounty(app.county_requested);
  if (county) tokens.add(county);

  return tokens;
}

/**
 * Overlapping already-approved applications for one applicant.
 * @returns {Array<{id: string, name: string, shared: string[]}>}
 */
export function findTerritoryConflicts(app, approvedApps = []) {
  const mine = territoryTokens(app);
  if (mine.size === 0) return [];

  return approvedApps
    .filter((other) => other && other.id !== app?.id)
    .map((other) => {
      const theirs = territoryTokens(other);
      const shared = [...mine].filter((token) => theirs.has(token));
      return {
        id: other.id,
        name: other.name || other.email || 'Unnamed agent',
        county: other.county_requested || '',
        shared,
      };
    })
    .filter((entry) => entry.shared.length > 0);
}

export function isExclusive(app) {
  return app?.interested_in === 'exclusive';
}
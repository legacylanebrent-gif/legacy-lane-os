# EstateSalen Phase 3C Certification Report — Multi-Tenant Website Runtime

Date: 2026-10-11 (UTC)
Scope: hostname → tenant resolution, publication-aware content serving, safe public projections, lifecycle/entitlement enforcement, admin diagnostics. Host audit performed against the live published runtime.

## Host Audit
- Live published runtime exposes a trusted forwarded-host header (`x-forwarded-host`) for both the app host and a custom domain — the resolver's hostname source is valid on the published domain.

## Certification Results

### Resolution & Isolation — PASS
- Resolve Site A/B by hostname: correct tenant, company, destination, entitlement snapshot.
- Cache bleed A↔B: no cross-contamination; correct site served per host on rapid alternation.
- Sale A1 detail served with its OWN inventory only; A2 never mixed in.
- Cross-sale access blocked: tenant B cannot read tenant A's sale by slug AND by raw id (`os_<id>` resolution enforces `company_id` and `destination_id` match).
- Custom domain of the same tenant resolves to the same site; an unknown host → 404 `unknown_host`.
- Malformed inputs (no hostname / bad host / non-existent host) → 400/404, never content.
- Hostname-override attack (X-Base44-App-Url) ignored: hostname is authoritative from forwarded headers.
- Exposure audit: `public_id` = `os_<canonical sale id>`; no internal ids, no scraped data, no operator contact info, no AI synopsis, no operational fields in any projection.

### Publication-Aware Visibility — PASS
- A sale published to Site A's destination is visible on A; unpublished → gone from the site listing AND detail; republished → back.
- Canonical sale data is byte-intact after the publish/unpublish/republish cycle.
- Sale B1 published to B only: never visible on A (destination-scoped).

### Lifecycle & Entitlement — PASS
- Tenant suspension → runtime 503 `site_unavailable` (site_name suppressed); reactivation → site back.
  - Fixed during certification: context cache TTL 15s → 5s. Documented suspension propagation bound: ≤5 seconds.
- Domain detach (disconnected) → hostname unresolvable (404 tombstone semantics — no operator content, no distinguishing signal); remaining domains of the same tenant keep serving; simulated reconnection restores service.
- Company ineligible (`inactive`) → runtime 503 for that company's site only; other companies unaffected; restored → back.
- Entitlement sweep (admin): company with no entitled member → sweep suspends its tenants → runtime down; entitlement restored + reactivation → site back.
  - Note: in the synthetic world both companies share the builder user, whose REAL active subscription legitimately pooled entitlement — the sweep was exercised via a synthetic member with no subscriptions (no real data mutated).
- Admin diagnostics: resolves full runtime state — resolution path, entitlement tier/allowance, domains, tracked published sales.

### Regressions
- Phase 3B control-plane battery (provisioning idempotency, slug conflicts, cross-destination invariants, lifecycle transitions, private lead ingestion) certified separately in ESTATESALEN_PHASE_3B_CERTIFICATION_REPORT.md; provision/domain/lead code paths are unchanged by 3C.
- Phase 2 canonical sale integrity verified post publish-cycle.

## Known Bounds (documented behavior, by design)
- Suspension/company-ineligibility propagation ≤5s (context cache TTL 5s).
- Disconnected domain = unresolvable (404), not 503 — tombstone semantics.
- Publication `update_pending`/currentness surfaced in diagnostics; staleness flagging is advisory.

## Cleanup
- Residue-free: 2 companies, 2 tenants, 3 domains, 2 subscriptions, 2 destinations, 2 publications, 4 sales, 1 lead — all deleted; verified zero remaining by direct queries. Runtime returns 404 for all certification hostnames. The builder's real subscription record was left intact.

## Verdict
**Phase 3C CERTIFIED.** The multi-tenant runtime is ready for Phase 3D (LLS reference template abstraction).
// ─────────────────────────────────────────────────────────────
// houszuPartnerSync — operations surface for the ONE-WAY
// EstateSalen -> Houszu person sync.
//
// Actions (admin only):
//   contract  — fetch the machine-readable Houszu contract summary
//   health    — authenticated liveness probe (which partner app)
//   flush     — drain the durable outbox (also runs on a schedule)
//   status    — delivery ledger counts + parked / auth failures
//   retry     — re-queue parked records
//
// The partner credential is read inside the shared module from the
// server secret store and never appears in a response or a log.
// ─────────────────────────────────────────────────────────────
import { createClientFromRequest } from "npm:@base44/sdk@0.8.54";
import {
  callPartner,
  flushOutbox,
  getContract,
  health,
  partnerToken,
} from "../../shared/houszuPersonSync.ts";

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth
      .me()
      .catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "status");
    const service = base44.asServiceRole;

    if (action === "contract") {
      const out = await getContract();
      const contract = (out.body && out.body.contract) || {};
      return Response.json({
        ok: out.ok,
        http_status: out.status,
        api_version: contract.api_version || out.body?.api_version || null,
        has_ingest_consumer_activity: !!(
          contract.operations && contract.operations.ingest_consumer_activity
        ),
        operations: contract.operations ? Object.keys(contract.operations) : [],
        accepts_contact_details: JSON.stringify(
          contract.operations?.ingest_consumer_activity || {}
        ).includes("contact_details"),
      });
    }

    if (action === "health") {
      const out = await health();
      return Response.json({
        ok: out.ok,
        http_status: out.status,
        partner_app: out.data?.partner_app || out.body?.partner_app || null,
        credential_id: out.data?.credential_id || out.body?.credential_id || null,
        api_version: out.data?.api_version || out.body?.api_version || null,
        error_code: out.errorCode,
        error_message: out.errorMessage,
        credential_configured: !!partnerToken(),
      });
    }

    if (action === "flush") {
      const limit = Number(body.limit);
      const summary = await flushOutbox(base44, {
        limit: Number.isFinite(limit) && limit > 0 ? Math.min(limit, 20) : 10,
      });
      return Response.json({ ok: true, ...summary });
    }

    if (action === "retry") {
      const ids = Array.isArray(body.ids) ? body.ids : [];
      const query = ids.length
        ? { id: { $in: ids } }
        : { status: { $in: ["parked", "permanent"] } };
      const page = await service.entities.HouszuPartnerOutbox.filter(query, { limit: 50 });
      const records = page.items || page || [];
      const now = new Date().toISOString();
      let requeued = 0;
      for (const record of records) {
        // A permanent refusal stays permanent unless the caller names it explicitly.
        if (record.status === "permanent" && !ids.includes(record.id)) continue;
        await service.entities.HouszuPartnerOutbox.update(record.id, {
          status: "pending",
          attempts: 0,
          next_attempt_at: now,
          error_code: null,
          error_message: null,
        });
        requeued += 1;
      }
      return Response.json({ ok: true, requeued });
    }

    // status (default)
    const statuses = ["pending", "processing", "sent", "failed", "permanent", "parked", "auth_failed"];
    const counts = {};
    for (const status of statuses) {
      counts[status] = await service.entities.HouszuPartnerOutbox.count({ status });
    }
    const problems = await service.entities.HouszuPartnerOutbox.filter(
      { status: { $in: ["parked", "auth_failed", "permanent"] } },
      { sort: "-updated_date", limit: 20 }
    );
    return Response.json({
      ok: true,
      credential_configured: !!partnerToken(),
      counts,
      problems: (problems.items || problems || []).map((r) => ({
        id: r.id,
        request_id: r.request_id,
        business_action: r.business_action,
        contact_email: r.contact_email,
        status: r.status,
        http_status: r.http_status,
        error_code: r.error_code,
        error_message: r.error_message,
        attempts: r.attempts,
        contact_status: r.contact_status,
        contact_id: r.contact_id,
        updated_date: r.updated_date,
      })),
    });
  } catch (error) {
    console.error("[houszuPartnerSync] error:", (error && error.message) || error);
    return Response.json({ error: (error && error.message) || "Unexpected error" }, { status: 500 });
  }
}
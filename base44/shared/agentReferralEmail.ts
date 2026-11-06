// Agent lead-notification email for an Estate Sale Company Owner's client
// referral. Transactional, one email per matched agent. Brand values follow
// the app's live theme (cyan header band, Georgia headings, estatesalen.com).
const APP_URL = "https://estatesalen.com";
const LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69471382fc72e5b50c72fcc7/4988b3f54_logo.png";

const TIMELINE_LABELS = {
  within_30_days: "Within 30 days",
  one_to_three_months: "1 to 3 months",
  three_to_six_months: "3 to 6 months",
  six_plus_months: "6+ months",
  unknown: "Not stated",
};

function esc(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function firstNameOf(fullName) {
  const clean = String(fullName || "").trim();
  if (!clean) return "there";
  return clean.split(/\s+/)[0];
}

export function buildAgentReferralEmail({
  agentName,
  clientName,
  clientEmail,
  clientPhone,
  propertyAddress,
  propertyCity,
  propertyState,
  propertyZip,
  county,
  timeline,
  needNotes,
  operatorName,
  operatorEmail,
}) {
  const place = [propertyCity, propertyState].filter(Boolean).join(", ");
  const fullAddress = [propertyAddress, place, propertyZip].filter(Boolean).join(", ");
  const subject = `New client referral in ${place || "your area"}`;
  const rows = [
    ["Client", clientName],
    ["Property", fullAddress],
    ["County", county],
    ["Timeline", TIMELINE_LABELS[timeline] || TIMELINE_LABELS.unknown],
    ["Client email", clientEmail],
    ["Client phone", clientPhone],
    ["Referred by", operatorName],
    ["Notes", needNotes],
  ].filter(([, value]) => String(value || "").trim());

  const detailRows = rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#64748b;width:38%;vertical-align:top;">${esc(label)}</td>
          <td style="padding:10px 14px;border-bottom:1px solid #e5e7eb;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#0f172a;vertical-align:top;">${esc(value)}</td>
        </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background-color:#ffffff;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;border:1px solid #e5e7eb;">
        <tr>
          <td style="background-color:#06b6d4;padding:18px 24px;">
            <img src="${LOGO_URL}" alt="EstateSalen" height="32" style="height:32px;display:inline-block;vertical-align:middle;border:0;" />
            <span style="font-family:Georgia,Arial,serif;font-size:20px;font-weight:700;color:#000000;vertical-align:middle;padding-left:10px;">EstateSalen</span>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 24px 8px;">
            <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#06b6d4;font-weight:700;">Client referral</p>
            <h1 style="margin:0;font-family:Georgia,Arial,serif;font-size:28px;line-height:1.25;color:#0f172a;">New client referral in ${esc(place || "your area")}</h1>
            <p style="margin:10px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#64748b;">
              Hi ${esc(firstNameOf(agentName))}, ${esc(operatorName || "An estate sale company")} shared a client who may need help with a sale in your area.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 24px 8px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;background-color:#f8fafc;">
              ${detailRows}
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 24px 0;">
            <a href="${APP_URL}" style="display:inline-block;background-color:#06b6d4;color:#000000;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;text-decoration:none;padding:14px 28px;">View in EstateSalen</a>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 24px 32px;">
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:#64748b;">
              Reply to this email to reach ${esc(operatorName || "the referring company")} directly. You are receiving this because your business is listed as serving ${esc(propertyCity || "this city")}.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background-color:#f8fafc;border-top:1px solid #e5e7eb;padding:16px 24px;">
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#64748b;">
              EstateSalen · <a href="${APP_URL}" style="color:#06b6d4;text-decoration:none;">estatesalen.com</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const text = [
    `New client referral in ${place || "your area"}`,
    "",
    `Hi ${firstNameOf(agentName)}, ${operatorName || "An estate sale company"} shared a client who may need help with a sale in your area.`,
    "",
    ...rows.map(([label, value]) => `${label}: ${value}`),
    "",
    `Reply to this email to reach ${operatorName || "the referring company"} directly.`,
    `You are receiving this because your business is listed as serving ${propertyCity || "this city"}.`,
    "",
    `EstateSalen · ${APP_URL}`,
  ].join("\n");

  return { subject, html, text, replyTo: operatorEmail || "" };
}
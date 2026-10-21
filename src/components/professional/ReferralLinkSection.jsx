import React, { useEffect, useState } from "react";
import qrcode from "qrcode";
import { Button } from "@/components/ui/button";
import { Copy, Check, QrCode, Download, Loader2 } from "lucide-react";
import { genPartnerToken } from "@/components/professional/professionalNetworkModel";

// Attributed partner referral link + QR. The TOKEN identifies the referring
// PROFESSIONAL — never a single client — so many clients may reuse the same
// link; each seller inquiry remains its own inquiry. Same URL feeds the QR;
// no second attribution system.
export default function ReferralLinkSection({ contact, onSaved }) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrUrl, setQrUrl] = useState("");
  const token = contact.partner_referral_token || "";
  const link = token ? `${window.location.origin}/PartnerReferral?prf=${token}` : "";

  useEffect(() => {
    if (link) {
      qrcode.toDataURL(link, { width: 256, margin: 2, errorCorrectionLevel: "H" })
        .then(setQrUrl).catch(() => setQrUrl(""));
    } else {
      setQrUrl("");
    }
  }, [link]);

  const generate = async () => {
    setBusy(true);
    try {
      const { base44 } = await import("@/api/base44Client");
      const updated = await base44.entities.Contact.update(contact.id, {
        partner_referral_token: genPartnerToken(),
      });
      onSaved(updated);
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        Inquiries through this link are attributed to {contact.first_name || "this professional"} in your sale
        pipeline — the seller never has to type who referred them. Regenerating replaces the old link.
      </p>
      {!token ? (
        <Button onClick={generate} disabled={busy} size="sm">
          {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <QrCode className="w-4 h-4 mr-1" />}
          Generate Referral Link & QR
        </Button>
      ) : (
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <div className="flex-1 min-w-0 space-y-2">
            <div className="border rounded-md p-2 bg-slate-50 break-all text-xs font-mono">{link}</div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={copy}>
                {copied ? <Check className="w-4 h-4 mr-1 text-emerald-600" /> : <Copy className="w-4 h-4 mr-1" />}
                {copied ? "Copied" : "Copy Link"}
              </Button>
              {qrUrl && (
                <a href={qrUrl} download={`referral-qr-${contact.last_name || "partner"}.png`}>
                  <Button size="sm" variant="outline"><Download className="w-4 h-4 mr-1" /> Download QR</Button>
                </a>
              )}
              <Button size="sm" variant="outline" onClick={generate} disabled={busy}>Regenerate</Button>
            </div>
          </div>
          {qrUrl && <img src={qrUrl} alt="Partner referral QR code" className="w-40 h-40 border rounded-md" />}
        </div>
      )}
    </div>
  );
}
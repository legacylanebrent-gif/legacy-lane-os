import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { buildClientSummaryText, displayName } from "@/components/professional/professionalNetworkModel";

// Client-facing provider option summary — PUBLIC-SAFE FIELDS ONLY. Private
// fit notes, experience history, licensing review notes, and compensation
// are excluded by construction (buildClientSummaryText). Not an endorsement.
export default function ClientSummaryDialog({ provider, onClose }) {
  const [copied, setCopied] = useState(false);
  const text = buildClientSummaryText(provider);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Client-Facing Provider Summary</DialogTitle>
          <p className="text-xs text-slate-500">{displayName(provider)}</p>
        </DialogHeader>
        <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
          Public-safe fields only — your private notes, experience history, licensing review notes, and any
          compensation arrangements are never included. Review before sharing. This is an option, not an endorsement.
        </p>
        <textarea readOnly value={text}
          className="w-full text-sm rounded-md border border-slate-200 px-2 py-2 h-48 bg-slate-50" />
        <Button size="sm" variant="outline" onClick={copy} className="w-full">
          {copied ? <Check className="w-4 h-4 mr-1 text-emerald-600" /> : <Copy className="w-4 h-4 mr-1" />}
          {copied ? "Copied" : "Copy Summary"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
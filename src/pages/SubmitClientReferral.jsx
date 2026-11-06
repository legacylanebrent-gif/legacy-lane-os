import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ClientReferralForm from "@/components/referrals/ClientReferralForm";
import MySubmittedReferrals from "@/components/referrals/MySubmittedReferrals";
import ReferralEstimateDisclosure from "@/components/referrals/ReferralEstimateDisclosure";
import { UserPlus, History } from "lucide-react";

export default function SubmitClientReferral() {
  const [userId, setUserId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    base44.auth.me().then((me) => setUserId(me?.id || null)).catch(() => setUserId(null));
  }, []);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-8">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-cyan-100 p-2">
          <UserPlus className="h-5 w-5 text-cyan-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Submit a Client Referral</h1>
          <p className="mt-1 text-sm text-slate-600">
            Send a client who needs help to the real estate agents serving their city. The referral is saved as a
            lead and the agents for that city are emailed automatically.
          </p>
        </div>
      </div>

      <ReferralEstimateDisclosure className="mt-4" />

      <Card className="mt-6">
        <CardContent className="pt-6">
          <ClientReferralForm onSubmitted={() => setRefreshKey((key) => key + 1)} />
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base text-slate-800">
            <History className="h-4 w-4 text-cyan-600" /> Your submitted referrals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MySubmittedReferrals userId={userId} refreshKey={refreshKey} />
        </CardContent>
      </Card>

      <p className="mt-4 text-xs text-slate-500">
        Prefer to let the client fill it in themselves? Send them your referral link from your Professional Network
        profile so their inquiry is attributed to you.
      </p>
    </div>
  );
}
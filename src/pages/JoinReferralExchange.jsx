import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StepIndicator from '@/components/referralagreement/StepIndicator';
import Step1Summary from '@/components/referralagreement/Step1Summary';
import Step2Acknowledgements from '@/components/referralagreement/Step2Acknowledgements';
import Step3Terms from '@/components/referralagreement/Step3Terms';
import Step4Signature from '@/components/referralagreement/Step4Signature';

export default function JoinReferralExchange() {
  const [user, setUser] = useState(null);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [existingAgreement, setExistingAgreement] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const u = await base44.auth.me();
      setUser(u);
      if (u) {
        const existing = await base44.entities.MasterReferralAgreement.filter({ user_id: u.id, status: 'active' });
        if (existing.length > 0) setExistingAgreement(existing[0]);
      }
      setLoading(false);
    })();
  }, []);

  const handleSubmit = async ({ signed_name }) => {
    setSubmitting(true);
    const now = new Date().toISOString();
    const agreementId = `MRA-${Date.now()}-${user.id.slice(-6).toUpperCase()}`;

    await base44.entities.MasterReferralAgreement.create({
      agreement_id: agreementId,
      user_id: user.id,
      user_type: user.primary_account_type === 'real_estate_agent' ? 'agent' : 'operator',
      signed_name,
      signed_email: user.email,
      signed_timestamp: now,
      signed_ip: '',
      status: 'active',
    });

    setSubmitting(false);
    setDone(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (existingAgreement) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl border border-slate-100 p-10 text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-slate-900">Already Enrolled</h2>
          <p className="text-slate-500 text-sm">
            You signed the Master Referral Participation Agreement on{' '}
            {existingAgreement.signed_timestamp
              ? new Date(existingAgreement.signed_timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
              : 'a previous date'}.
          </p>
          <p className="text-xs text-slate-400">Agreement ID: {existingAgreement.agreement_id}</p>
          <Button
            onClick={() => window.history.back()}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-xl"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl border border-slate-100 p-10 text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <div>
            <h2 className="text-2xl font-serif font-bold text-slate-900">You're In</h2>
            <p className="text-lg text-slate-600 mt-2">You now have access to the Referral Exchange.</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-600 text-left space-y-2">
            <p>✓ Master Referral Participation Agreement signed</p>
            <p>✓ Non-circumvention protections active</p>
            <p>✓ Lead access enabled</p>
          </div>
          <Button
            onClick={() => window.history.back()}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-xl"
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-start justify-center px-6 py-12">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold text-slate-900">Join Referral Exchange</h1>
          <p className="text-sm text-slate-500 mt-1">Master Referral Participation Agreement</p>
        </div>

        <StepIndicator currentStep={step} />

        {step === 1 && <Step1Summary onNext={() => setStep(2)} />}
        {step === 2 && <Step2Acknowledgements onNext={() => setStep(3)} />}
        {step === 3 && <Step3Terms onNext={() => setStep(4)} />}
        {step === 4 && <Step4Signature user={user} onSubmit={handleSubmit} submitting={submitting} />}
      </div>
    </div>
  );
}
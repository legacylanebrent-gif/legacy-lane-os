import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Building2, CheckCircle, AlertCircle } from 'lucide-react';

export default function ClaimCompanyModal({ operator, open, onClose }) {
  const [step, setStep] = useState('form'); // 'form' | 'success' | 'login'
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
  });

  const handleClaim = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const isAuth = await base44.auth.isAuthenticated();
    if (!isAuth) {
      // Redirect to login with return URL
      const returnUrl = `${window.location.pathname}${window.location.search}&claim=${operator.id}`;
      base44.auth.redirectToLogin(returnUrl);
      return;
    }

    const user = await base44.auth.me();

    // Update user to pending operator status
    await base44.auth.updateMe({
      primary_account_type: 'estate_sale_operator',
      operator_status: 'pending_verification',
      claimed_company_id: operator.id,
      claimed_company_name: operator.company_name,
      company_name: operator.company_name,
      company_city: operator.city,
      company_state: operator.state,
      company_phone: operator.phone || formData.phone,
    });

    // Mark the FutureEstateOperator as claimed
    await base44.entities.FutureEstateOperator.update(operator.id, {
      outreach_status: 'replied',
      enrichment_notes: `Claimed by user ${user.email} on ${new Date().toISOString()}. Pending verification.`,
    });

    // Notify admins via backend (service role can find admin users)
    try {
      await base44.functions.invoke('notifyAdminsOfApplication', {
        applicant_user_id: user.id,
        applicant_name: user.full_name,
        applicant_email: user.email,
        application_type: 'company_claim',
        details: `${operator.company_name} (${operator.city}, ${operator.state})`,
      });
    } catch (err) {
      console.error('Failed to notify admins:', err);
    }

    // Send confirmation in-app notification to the claimant
    try {
      await base44.entities.Notification.create({
        user_id: user.id,
        type: 'system',
        title: '✅ Company Claim Received',
        message: `Your claim for ${operator.company_name} has been submitted. Our team will review and approve your access within 1–2 business days.`,
        link_to_page: 'MyProfile',
        read: false,
      });
    } catch (err) {
      console.error('Failed to send confirmation notification:', err);
    }

    setStep('success');
    setSubmitting(false);
  };

  const handleClose = () => {
    setStep('form');
    setFormData({ full_name: '', email: '', phone: '' });
    onClose();
  };

  if (!operator) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Building2 className="w-5 h-5 text-orange-500" />
            Claim Your Company
          </DialogTitle>
        </DialogHeader>

        {step === 'form' && (
          <div className="space-y-4">
            {/* Company info */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="font-semibold text-slate-900">{operator.company_name}</p>
              <p className="text-sm text-slate-600">{operator.city}, {operator.state}</p>
              {operator.phone && <p className="text-sm text-slate-500">{operator.phone}</p>}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">
                After claiming, your account will be set to <strong>Pending Verification</strong>. Our team will review and approve your access within 1–2 business days.
              </p>
            </div>

            <form onSubmit={handleClaim} className="space-y-3">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Your Full Name *</label>
                <Input
                  required
                  value={formData.full_name}
                  onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Jane Smith"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Your Email *</label>
                <Input
                  type="email"
                  required
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="jane@yourcompany.com"
                />
              </div>
              {!operator.phone && (
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-1">Company Phone *</label>
                  <Input
                    required
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                  />
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Claim This Company'}
              </Button>
              <p className="text-xs text-slate-500 text-center">
                You'll be redirected to sign in or create an account if needed.
              </p>
            </form>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-9 h-9 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900">Claim Submitted!</h3>
            <p className="text-slate-600 text-sm">
              Your claim for <strong>{operator.company_name}</strong> has been received. Your account is now set to <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">Pending Verification</Badge>
            </p>
            <p className="text-slate-500 text-xs">
              Our team will verify your ownership and approve your full access within 1–2 business days.
            </p>
            <Button onClick={handleClose} className="w-full">Close</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Mail, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

const ROLE_OPTIONS = [
  { value: 'team_admin', label: 'Team Admin', description: 'Full operator access, manages other team members' },
  { value: 'team_member', label: 'Team Member', description: 'Operational access to sales, inventory, POS' },
  { value: 'team_marketer', label: 'Team Marketer', description: 'Marketing campaigns, statistics, VIP events' },
];

export default function InviteTeamMemberModal({ open, onClose, operator, onSuccess }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('team_member');
  const companyName = operator?.company_name || operator?.full_name || 'our company';
  const [personalNote, setPersonalNote] = useState(
    `Hi! I'd like to invite you to join the ${companyName} team on EstateSalen.com. We use this platform to manage our estate sales and I think you'll find it easy and powerful to work with. Looking forward to having you on board!`
  );
  const [step, setStep] = useState('form'); // 'form' | 'checking' | 'result'
  const [result, setResult] = useState(null); // { type: 'new' | 'existing', user?: object }
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const reset = () => {
    setEmail('');
    setRole('team_member');
    setPersonalNote(`Hi! I'd like to invite you to join the ${companyName} team on EstateSalen.com. We use this platform to manage our estate sales and I think you'll find it easy and powerful to work with. Looking forward to having you on board!`);
    setStep('form');
    setResult(null);
    setSending(false);
    setDone(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const checkEmail = async () => {
    if (!email || !role) return;
    setStep('checking');
    try {
      // Search all users for this email
      const allUsers = await base44.entities.User.list('-created_date', 1000);
      const existing = allUsers.find(u => u.email?.toLowerCase() === email.toLowerCase());
      if (existing) {
        setResult({ type: 'existing', user: existing });
      } else {
        setResult({ type: 'new' });
      }
      setStep('result');
    } catch (err) {
      console.error(err);
      setStep('form');
      alert('Error checking email. Please try again.');
    }
  };

  const handleSend = async () => {
    setSending(true);
    const roleLabel = ROLE_OPTIONS.find(r => r.value === role)?.label || role;
    const companyName = operator?.company_name || operator?.full_name || 'our company';

    try {
      if (result?.type === 'existing') {
        // Update existing user: assign team role + operator_id
        await base44.entities.User.update(result.user.id, {
          primary_account_type: role,
          operator_id: operator.id,
          team_permissions: {}
        });

        // Send custom notification email
        await base44.integrations.Core.SendEmail({
          to: email,
          subject: `You've been added to the ${companyName} team on EstateSalen.com`,
          body: `Hi ${result.user.full_name || 'there'},

You have been added to the ${companyName} team on EstateSalen.com as a ${roleLabel}.

${personalNote ? `A personal note from ${companyName}:\n"${personalNote}"\n` : ''}
Log in to your existing account to access your new team dashboard:
https://estatesalen.com

Your role gives you access to specific areas of ${companyName}'s operations. Your team manager can adjust your permissions at any time.

Welcome to the team!
— The EstateSalen.com Team`
        });

      } else {
        // New user: use Base44 invite system
        await base44.users.inviteUser(email, 'user');

        // Also send a custom welcome email with context
        await base44.integrations.Core.SendEmail({
          to: email,
          subject: `You're invited to join the ${companyName} team on EstateSalen.com`,
          body: `Hi there,

You've been invited to join the ${companyName} team on EstateSalen.com as a ${roleLabel}.

${personalNote ? `A personal note from ${companyName}:\n"${personalNote}"\n` : ''}
Please check your inbox for a separate registration email from EstateSalen.com to create your account. Once registered, you'll have access to your team dashboard and the tools assigned to your role.

If you have any questions, reach out to your team manager at ${operator?.email || companyName}.

We're excited to have you on board!
— The EstateSalen.com Team`
        });

        // Pre-create a placeholder record so operator_id + role are set once they register
        // We store pending invite info on a flag — when admin sets up the new user they can link them
      }

      setDone(true);
    } catch (err) {
      console.error(err);
      alert('Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const selectedRoleInfo = ROLE_OPTIONS.find(r => r.value === role);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-orange-600" />
            Invite Team Member
          </DialogTitle>
        </DialogHeader>

        {done ? (
          <div className="py-8 text-center space-y-3">
            <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto" />
            <p className="text-lg font-semibold text-slate-800">Invitation Sent!</p>
            <p className="text-sm text-slate-500">
              {result?.type === 'existing'
                ? `${email} has been added to your team and notified by email.`
                : `An invitation and welcome email have been sent to ${email}.`}
            </p>
            <div className="flex gap-2 justify-center pt-2">
              <Button variant="outline" onClick={handleClose}>Close</Button>
              <Button className="bg-orange-600 hover:bg-orange-700" onClick={() => { reset(); onSuccess?.(); }}>
                Invite Another
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5 mt-2">
            {/* Email */}
            <div>
              <Label>Email Address</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="email"
                  placeholder="teammate@email.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setStep('form'); setResult(null); }}
                  disabled={step === 'checking'}
                />
              </div>
            </div>

            {/* Role */}
            <div>
              <Label>Team Role</Label>
              <Select value={role} onValueChange={(v) => { setRole(v); setStep('form'); setResult(null); }}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedRoleInfo && (
                <p className="text-xs text-slate-500 mt-1">{selectedRoleInfo.description}</p>
              )}
            </div>

            {/* Personal note */}
            <div>
              <Label>Personal Note <span className="text-slate-400 font-normal">(optional)</span></Label>
              <Textarea
                value={personalNote}
                onChange={(e) => setPersonalNote(e.target.value)}
                className="mt-1 text-sm"
                rows={4}
              />
            </div>

            {/* Check result banner */}
            {step === 'result' && result && (
              <div className={`rounded-lg p-3 flex items-start gap-3 text-sm ${
                result.type === 'existing'
                  ? 'bg-blue-50 border border-blue-200 text-blue-800'
                  : 'bg-amber-50 border border-amber-200 text-amber-800'
              }`}>
                {result.type === 'existing' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-600" />
                    <div>
                      <p className="font-medium">Existing user found: {result.user.full_name}</p>
                      <p className="text-xs mt-0.5">
                        Currently registered as <Badge className="text-xs bg-slate-100 text-slate-700">{result.user.primary_account_type?.replace(/_/g, ' ')}</Badge>.
                        Their role will be updated to <Badge className="text-xs bg-purple-100 text-purple-700">{role.replace(/_/g, ' ')}</Badge> and linked to your company.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-600" />
                    <div>
                      <p className="font-medium">New user — not yet registered</p>
                      <p className="text-xs mt-0.5">They'll receive a platform invite email + your custom welcome message. Once they register, link them to your team via User Management.</p>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 justify-end pt-2 border-t">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              {step !== 'result' ? (
                <Button
                  onClick={checkEmail}
                  disabled={!email || !role || step === 'checking'}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {step === 'checking' ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Checking...</>
                  ) : (
                    <><Mail className="w-4 h-4 mr-2" />Check & Continue</>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleSend}
                  disabled={sending}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {sending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</>
                  ) : (
                    <><UserPlus className="w-4 h-4 mr-2" />
                    {result?.type === 'existing' ? 'Add to Team & Notify' : 'Send Invitation'}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Mail, CheckCircle2, AlertCircle, Loader2, MessageSquare, Copy, Smartphone, ArrowLeft } from 'lucide-react';

const ROLE_OPTIONS = [
  { value: 'team_admin', label: 'Team Admin', description: 'Full Estate Sale Company Owner access, manages other team members' },
  { value: 'team_member', label: 'Team Member', description: 'Operational access to sales, inventory, POS' },
  { value: 'team_marketer', label: 'Team Marketer', description: 'Marketing campaigns, statistics, VIP events' },
];

function generateInviteCode() {
  return 'teaminv-' + Math.random().toString(36).substring(2, 10).toUpperCase();
}

export default function InviteTeamMemberModal({ open, onClose, operator, onSuccess }) {
  const [inviteType, setInviteType] = useState(null); // null = choice screen, 'email' | 'text'
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('team_member');
  const companyName = operator?.company_name || operator?.full_name || 'our company';

  const defaultNote = `Hi! I'm inviting you to my team on EstateSalen.com. We use this platform to manage our estate sales and other business operations. Click the link to register and when onboarding, choose Team Member and you will be auto-linked to my team. Send me a text or email once you have completed the process!`;

  const [personalNote, setPersonalNote] = useState(defaultNote);
  const [step, setStep] = useState('form'); // 'form' | 'checking' | 'result'
  const [result, setResult] = useState(null); // { type: 'new' | 'existing', user?: object }
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);

  const buildSmsMessage = () => {
    const roleLabel = ROLE_OPTIONS.find(r => r.value === role)?.label || role;
    const inviteCode = generateInviteCode();
    return `Hi! ${companyName} is inviting you to join our team on EstateSalen.com as a ${roleLabel}. We use this platform to manage our estate sales and business operations. When you register at https://estatesalen.com, choose Team Member during onboarding and enter this invite code: ${inviteCode}. This will auto-link you to our team.${personalNote ? `\n\nPersonal note: ${personalNote}` : ''}\n\nSend me a text once you're set up!`;
  };

  const reset = () => {
    setInviteType(null);
    setEmail('');
    setPhone('');
    setRole('team_member');
    setPersonalNote(defaultNote);
    setStep('form');
    setResult(null);
    setSending(false);
    setDone(false);
    setCopied(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const goBack = () => {
    if (done) {
      reset();
    } else if (inviteType && step !== 'checking') {
      setInviteType(null);
      setStep('form');
      setResult(null);
    }
  };

  const checkEmail = async () => {
    if (!email || !role) return;
    setStep('checking');
    try {
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

  const handleEmailSend = async () => {
    setSending(true);
    const roleLabel = ROLE_OPTIONS.find(r => r.value === role)?.label || role;

    try {
      // Create PendingTeamInvite record to track this invite
      const inviteCode = generateInviteCode();
      await base44.entities.PendingTeamInvite.create({
        operator_id: operator.id,
        company_name: companyName,
        invite_type: 'email',
        contact_email: email,
        role,
        personal_note: personalNote,
        invite_code: inviteCode,
      });

      if (result?.type === 'existing') {
        await base44.entities.User.update(result.user.id, {
          primary_account_type: role,
          operator_id: operator.id,
          team_permissions: {}
        });

        await base44.integrations.Core.SendEmail({
          to: email,
          subject: `You've been added to the ${companyName} team on EstateSalen.com`,
          body: `Hi ${result.user.full_name || 'there'},

You have been added to the ${companyName} team on EstateSalen.com as a ${roleLabel}.

${personalNote ? `A personal note from ${companyName}:\n"${personalNote}"\n` : ''}
Log in to your existing account to access your new team dashboard:
https://estatesalen.com

Your invite code is: ${inviteCode}
Use this code during onboarding if you need to re-verify your team link.

Your role gives you access to specific areas of ${companyName}'s operations. Your team manager can adjust your permissions at any time.

Welcome to the team!
— The EstateSalen.com Team`
        });

        // Link the invite to this user
        const invite = await base44.entities.PendingTeamInvite.filter({ operator_id: operator.id, contact_email: email, status: 'pending' }, '-created_date', 1);
        if (invite.length > 0) {
          await base44.entities.PendingTeamInvite.update(invite[0].id, { status: 'accepted', invited_user_id: result.user.id });
        }

      } else {
        await base44.users.inviteUser(email, 'user');

        await base44.integrations.Core.SendEmail({
          to: email,
          subject: `You're invited to join the ${companyName} team on EstateSalen.com`,
          body: `Hi there,

You've been invited to join the ${companyName} team on EstateSalen.com as a ${roleLabel}.

${personalNote ? `A personal note from ${companyName}:\n"${personalNote}"\n` : ''}
Please check your inbox for a separate registration email from EstateSalen.com to create your account. Once registered, you'll have access to your team dashboard and the tools assigned to your role.

Your invite code is: ${inviteCode}
During onboarding, enter this code to auto-link to our team. This ensures you're connected even if you sign up with a different email.

If you have any questions, reach out to your team manager at ${operator?.email || companyName}.

We're excited to have you on board!
— The EstateSalen.com Team`
        });
      }

      setDone(true);
    } catch (err) {
      console.error(err);
      alert('Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleTextSend = async () => {
    setSending(true);
    try {
      const inviteCode = generateInviteCode();
      // Create PendingTeamInvite record
      await base44.entities.PendingTeamInvite.create({
        operator_id: operator.id,
        company_name: companyName,
        invite_type: 'text',
        contact_phone: phone,
        role,
        personal_note: personalNote,
        invite_code: inviteCode,
      });

      setDone(true);
    } catch (err) {
      console.error(err);
      alert('Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const smsMessage = buildSmsMessage();
  const smsHref = `sms:${phone}?body=${encodeURIComponent(smsMessage)}`;
  const selectedRoleInfo = ROLE_OPTIONS.find(r => r.value === role);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {(inviteType || done) ? (
              <button onClick={goBack} className="hover:bg-slate-100 rounded-full p-1 -ml-1">
                <ArrowLeft className="w-4 h-4 text-slate-500" />
              </button>
            ) : (
              <UserPlus className="w-5 h-5 text-orange-600" />
            )}
            {done ? 'Invitation Sent!' : inviteType === 'text' ? 'Send Text Invite' : inviteType === 'email' ? 'Send Email Invite' : 'Invite Team Member'}
          </DialogTitle>
        </DialogHeader>

        {/* ── Choice Screen ── */}
        {!inviteType && !done && (
          <div className="space-y-4 mt-2">
            <p className="text-sm text-slate-600">Choose how you'd like to invite your team member:</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setInviteType('text')}
                className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-slate-200 hover:border-green-400 hover:bg-green-50 transition-all text-center"
              >
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800">Text Invite</p>
                  <p className="text-xs text-slate-500 mt-1">Send an SMS from your phone</p>
                </div>
              </button>
              <button
                onClick={() => setInviteType('email')}
                className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-slate-200 hover:border-orange-400 hover:bg-orange-50 transition-all text-center"
              >
                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                  <Mail className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800">Email Invite</p>
                  <p className="text-xs text-slate-500 mt-1">Send via EstateSalen email</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ── Done Screen ── */}
        {done && (
          <div className="py-8 text-center space-y-3">
            <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto" />
            <p className="text-lg font-semibold text-slate-800">Invitation {inviteType === 'text' ? 'Prepared' : 'Sent'}!</p>
            {inviteType === 'text' ? (
              <p className="text-sm text-slate-500">
                Your invite for {phone} has been saved. The recipient will be auto-linked when they register.
              </p>
            ) : (
              <p className="text-sm text-slate-500">
                {result?.type === 'existing'
                  ? `${email} has been added to your team and notified by email.`
                  : `An invitation and welcome email have been sent to ${email}.`}
              </p>
            )}
            <div className="flex gap-2 justify-center pt-2">
              <Button variant="outline" onClick={handleClose}>Close</Button>
              <Button className="bg-orange-600 hover:bg-orange-700" onClick={() => { reset(); onSuccess?.(); }}>
                Invite Another
              </Button>
            </div>
          </div>
        )}

        {/* ── Text Invite Flow ── */}
        {inviteType === 'text' && !done && (
          <div className="space-y-5 mt-2">
            {/* Phone */}
            <div>
              <Label>Phone Number</Label>
              <Input
                type="tel"
                placeholder="(555) 123-4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            {/* Role */}
            <div>
              <Label>Team Role</Label>
              <Select value={role} onValueChange={setRole}>
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
              <Label>Personal Note <span className="text-slate-400 font-normal">(included in message)</span></Label>
              <Textarea
                value={personalNote}
                onChange={(e) => setPersonalNote(e.target.value)}
                className="mt-1 text-sm"
                rows={3}
              />
            </div>

            {/* SMS Preview */}
            <div>
              <Label>Message Preview</Label>
              <div className="mt-1 p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm text-slate-700 whitespace-pre-wrap max-h-40 overflow-y-auto">
                {smsMessage}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end pt-2 border-t">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button
                variant="outline"
                onClick={() => { navigator.clipboard.writeText(smsMessage); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                className="border-slate-300"
              >
                <Copy className="w-4 h-4 mr-1" />
                {copied ? 'Copied!' : 'Copy Message'}
              </Button>
              <Button
                onClick={handleTextSend}
                disabled={!phone || sending}
                className="bg-green-600 hover:bg-green-700"
              >
                {sending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
                ) : (
                  <><Smartphone className="w-4 h-4 mr-2" />Save & Open SMS</>
                )}
              </Button>
            </div>

            {phone && (
              <a
                href={smsHref}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center text-sm text-green-600 hover:text-green-700 underline mt-1"
              >
                Or tap here to open your messaging app directly
              </a>
            )}
          </div>
        )}

        {/* ── Email Invite Flow ── */}
        {inviteType === 'email' && !done && (
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
                      <p className="text-xs mt-0.5">They'll receive a platform invite email + your custom welcome message with an invite code to auto-link. Works even if they sign up with a different email.</p>
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
                  onClick={handleEmailSend}
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
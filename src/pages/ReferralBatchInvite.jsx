import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Upload, FileText, CheckCircle, XCircle, Loader2, ArrowLeft, Mail, Users
} from 'lucide-react';
import { Link } from 'react-router-dom';
import BatchEmailTemplateSelector from '@/components/referrals/BatchEmailTemplateSelector';

function parseEmails(csvText) {
  const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const emails = [];
  const invalid = [];

  for (const line of lines) {
    // Support: plain email, "Name,email", "email,Name" columns
    const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''));
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const emailPart = parts.find(p => emailRegex.test(p));
    const namePart  = parts.find(p => !emailRegex.test(p) && p.length > 0);

    if (emailPart) {
      emails.push({ email: emailPart, name: namePart || '' });
    } else if (line.length > 0 && line !== 'email' && line !== 'Email') {
      invalid.push(line);
    }
  }
  return { emails, invalid };
}

export default function ReferralBatchInvite() {
  const [user, setUser]             = useState(null);
  const [contacts, setContacts]     = useState([]);
  const [invalid, setInvalid]       = useState([]);
  const [template, setTemplate]     = useState(null);
  const [sending, setSending]       = useState(false);
  const [results, setResults]       = useState(null); // {sent, failed}
  const [dragOver, setDragOver]     = useState(false);
  const fileRef = useRef();

  React.useEffect(() => {
    base44.auth.me().then(me => setUser(me));
  }, []);

  const referralCode = user?.id?.slice(-8).toUpperCase() || 'XXXXXXXX';
  const referralLink = `${window.location.origin}/OperatorPackages?ref=${referralCode}`;

  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const { emails, invalid: inv } = parseEmails(e.target.result);
      setContacts(emails);
      setInvalid(inv);
      setResults(null);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const removeContact = (idx) => setContacts(c => c.filter((_, i) => i !== idx));

  const handleSendAll = async () => {
    if (!template || contacts.length === 0) return;
    setSending(true);
    let sent = 0, failed = 0;

    for (const contact of contacts) {
      try {
        const subject = template.subject;
        const body = template.body
          .replace(/\{\{name\}\}/g, contact.name || 'there')
          .replace(/\{\{referral_link\}\}/g, referralLink)
          .replace(/\{\{referral_code\}\}/g, referralCode)
          .replace(/\{\{sender_name\}\}/g, user?.full_name || 'Your contact');

        await base44.integrations.Core.SendEmail({ to: contact.email, subject, body });

        await base44.entities.Referral.create({
          referrer_id: user.id,
          referrer_name: user.full_name,
          referrer_email: user.email,
          referral_code: referralCode,
          referred_email: contact.email,
          referred_company_name: contact.name || '',
          status: 'pending',
          reward_status: 'pending',
        });

        sent++;
      } catch {
        failed++;
      }
    }

    setResults({ sent, failed });
    setSending(false);
    if (sent > 0) setContacts([]);
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/ReferralDashboard" className="text-slate-400 hover:text-slate-700 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-4xl font-serif font-bold text-slate-900">Batch Invite</h1>
          <p className="text-slate-500 mt-1">Upload a CSV of contacts and send personalized referral invites in one click.</p>
        </div>
      </div>

      {/* Success banner */}
      {results && (
        <div className={`rounded-2xl px-6 py-4 flex items-center gap-4 ${results.failed === 0 ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
          <CheckCircle className={`w-6 h-6 flex-shrink-0 ${results.failed === 0 ? 'text-green-600' : 'text-yellow-600'}`} />
          <div>
            <p className="font-semibold text-slate-900">{results.sent} invite{results.sent !== 1 ? 's' : ''} sent successfully!</p>
            {results.failed > 0 && <p className="text-sm text-yellow-700">{results.failed} failed to send.</p>}
          </div>
          <Link to="/ReferralDashboard" className="ml-auto text-sm font-semibold text-orange-600 hover:underline">
            View Dashboard →
          </Link>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-8">
        {/* LEFT — Upload */}
        <div className="space-y-5">
          <h2 className="font-bold text-slate-800 flex items-center gap-2"><FileText className="w-4 h-4" /> Step 1: Upload Contacts</h2>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current.click()}
            className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors ${
              dragOver ? 'border-orange-400 bg-orange-50' : 'border-slate-300 hover:border-orange-400 hover:bg-orange-50'
            }`}
          >
            <Upload className="w-10 h-10 mx-auto text-slate-300 mb-3" />
            <p className="font-semibold text-slate-700">Drop your CSV here</p>
            <p className="text-sm text-slate-400 mt-1">or click to browse</p>
            <p className="text-xs text-slate-300 mt-3">Supported formats: email per line, or Name,Email columns</p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={e => handleFile(e.target.files[0])}
            />
          </div>

          {/* Template download */}
          <button
            onClick={() => {
              const csv = 'Name,Email\nJohn Smith,john@example.com\nJane Doe,jane@example.com';
              const blob = new Blob([csv], { type: 'text/csv' });
              const a = document.createElement('a');
              a.href = URL.createObjectURL(blob);
              a.download = 'referral_contacts_template.csv';
              a.click();
            }}
            className="text-sm text-orange-600 hover:underline font-medium"
          >
            ↓ Download CSV template
          </button>

          {/* Invalid rows */}
          {invalid.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-red-700 mb-1">{invalid.length} rows skipped (invalid email):</p>
              <ul className="text-xs text-red-500 space-y-0.5 max-h-24 overflow-y-auto">
                {invalid.map((r, i) => <li key={i} className="font-mono truncate">{r}</li>)}
              </ul>
            </div>
          )}

          {/* Contact list */}
          {contacts.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                  <Users className="w-4 h-4" /> {contacts.length} contact{contacts.length !== 1 ? 's' : ''} ready
                </p>
                <button onClick={() => setContacts([])} className="text-xs text-red-400 hover:text-red-600">Clear all</button>
              </div>
              <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                {contacts.map((c, i) => (
                  <div key={i} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                    <div className="min-w-0">
                      {c.name && <p className="text-sm font-medium text-slate-700 truncate">{c.name}</p>}
                      <p className="text-xs text-slate-500 truncate">{c.email}</p>
                    </div>
                    <button onClick={() => removeContact(i)} className="ml-2 text-slate-300 hover:text-red-400 flex-shrink-0">
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — Template */}
        <div className="space-y-5">
          <h2 className="font-bold text-slate-800 flex items-center gap-2"><Mail className="w-4 h-4" /> Step 2: Choose Email Template</h2>
          <BatchEmailTemplateSelector
            referralLink={referralLink}
            referralCode={referralCode}
            senderName={user?.full_name || ''}
            selected={template}
            onSelect={setTemplate}
          />
        </div>
      </div>

      {/* Send button */}
      <div className="border-t pt-6 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {contacts.length > 0 && template
            ? `Ready to send ${contacts.length} invite${contacts.length !== 1 ? 's' : ''} using "${template.name}"`
            : 'Upload contacts and select a template to continue'}
        </p>
        <Button
          onClick={handleSendAll}
          disabled={sending || contacts.length === 0 || !template}
          className="bg-orange-600 hover:bg-orange-700 text-white gap-2 px-8"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
          {sending ? `Sending…` : `Send ${contacts.length > 0 ? contacts.length : ''} Invite${contacts.length !== 1 ? 's' : ''}`}
        </Button>
      </div>
    </div>
  );
}
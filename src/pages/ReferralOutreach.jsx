import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Mail, Send, CheckCircle2, Clock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function ReferralOutreach() {
  const [referrals, setReferrals] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const user = await base44.auth.me();
      const refData = await base44.entities.Referral.filter({ user_id: user.id }, '-created_date');
      const leadData = await base44.entities.Lead.filter({ referral_eligible: true });
      setReferrals(refData || []);
      setLeads(leadData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOutreach = async () => {
    if (!selectedLead || !message) {
      alert('Please fill in all fields');
      return;
    }

    setSending(true);
    try {
      // Create referral record
      await base44.entities.Referral.create({
        contact_id: selectedLead.id,
        status: 'pending',
        outreach_message: message,
        outreach_date: new Date().toISOString()
      });

      // Send email via Gmail integration
      await base44.functions.invoke('sendReferralEmail', {
        leadId: selectedLead.id,
        message: message
      });

      setShowModal(false);
      setSelectedLead(null);
      setMessage('');
      await loadData();
      alert('Outreach sent successfully!');
    } catch (error) {
      console.error('Error sending outreach:', error);
      alert('Failed to send outreach');
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  const pendingOutreach = leads.filter(l => !referrals.some(r => r.contact_id === l.id));
  const completedOutreach = referrals.filter(r => r.status === 'completed');

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Mail className="w-8 h-8" />
          Referral Partner Outreach
        </h1>
        <Button 
          onClick={() => { setSelectedLead(null); setShowModal(true); }}
          className="bg-orange-600 hover:bg-orange-700"
        >
          <Send className="w-4 h-4 mr-2" />
          New Outreach
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-600">Total Leads</div>
            <div className="text-3xl font-bold">{leads.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-600">Pending Outreach</div>
            <div className="text-3xl font-bold text-blue-600">{pendingOutreach.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-600">Completed</div>
            <div className="text-3xl font-bold text-green-600">{completedOutreach.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Outreach */}
      {pendingOutreach.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Leads Pending Outreach ({pendingOutreach.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingOutreach.map(lead => (
                <div key={lead.id} className="border rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{lead.contact_name}</div>
                    <div className="text-sm text-slate-600">{lead.contact_email}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      {lead.property_address && `${lead.property_address}, Est. Value: $${lead.estimated_value?.toLocaleString()}`}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => { setSelectedLead(lead); setShowModal(true); }}
                    className="bg-cyan-600 hover:bg-cyan-700"
                  >
                    <Mail className="w-4 h-4 mr-1" />
                    Reach Out
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completed Outreach */}
      {completedOutreach.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Completed Outreach ({completedOutreach.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {completedOutreach.slice(0, 5).map(ref => (
                <div key={ref.id} className="flex items-center justify-between p-2 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="text-sm">{ref.contact_name}</span>
                  </div>
                  <Badge>Completed</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Outreach Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Referral Outreach</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedLead && (
              <div className="p-3 bg-slate-50 rounded-lg">
                <div className="font-medium">{selectedLead.contact_name}</div>
                <div className="text-sm text-slate-600">{selectedLead.contact_email}</div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">Message</label>
              <Textarea
                placeholder="Personalize your outreach message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="h-32"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={handleOutreach} 
                disabled={sending}
                className="flex-1 bg-orange-600 hover:bg-orange-700"
              >
                {sending ? 'Sending...' : 'Send Outreach'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
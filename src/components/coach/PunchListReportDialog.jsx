import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, CheckCircle, Loader2, Wrench } from 'lucide-react';
import { CATEGORY_LABELS } from '@/lib/punchList';

const REPORT_CATEGORIES = ['operator', 'consumer', 'public_experience', 'payments', 'data', 'other'];

export default function PunchListReportDialog({ open, onOpenChange, prefill = '' }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState(prefill);
  const [category, setCategory] = useState('operator');
  const [severity, setSeverity] = useState('medium');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const reset = () => {
    setTitle('');
    setDescription('');
    setCategory('operator');
    setSeverity('medium');
    setError('');
    setDone(false);
  };

  const handleClose = (next) => {
    if (submitting) return;
    if (!next) reset();
    onOpenChange(next);
  };

  const handleSubmit = async () => {
    if (title.trim().length < 4) {
      setError('Give the issue a short title first.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await base44.functions.invoke('aiCoach', {
        action: 'create_punch_list_item',
        punch_list: { title: title.trim(), description: description.trim(), category, severity },
      });
      if (res.data?.error) {
        setError(res.data.message || 'That could not be submitted.');
        return;
      }
      setDone(true);
      setTitle('');
      setDescription('');
    } catch (submitError) {
      setError(submitError?.response?.data?.message || 'That could not be submitted. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-orange-600" />
            Report an Issue
          </DialogTitle>
        </DialogHeader>

        {done ? (
          <div className="space-y-4">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-800">
              <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>Added to the punch list. Our team reviews it and gets it fixed.</span>
            </div>
            <DialogFooter>
              <Button onClick={() => handleClose(false)} className="bg-orange-600 hover:bg-orange-700">Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Something not working right? Describe it and it goes straight to the team's fix list.
              </p>
              <div>
                <Label>What is wrong? *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Bundle prices save as the wrong total"
                  disabled={submitting}
                />
              </div>
              <div>
                <Label>Details</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What you clicked, what you expected, what happened instead..."
                  className="min-h-24"
                  disabled={submitting}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Area</Label>
                  <Select value={category} onValueChange={setCategory} disabled={submitting}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {REPORT_CATEGORIES.map((key) => (
                        <SelectItem key={key} value={key}>{CATEGORY_LABELS[key]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>How urgent?</Label>
                  <Select value={severity} onValueChange={setSeverity} disabled={submitting}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">Critical — can't work</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => handleClose(false)} disabled={submitting}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={submitting} className="bg-orange-600 hover:bg-orange-700">
                {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {submitting ? 'Submitting...' : 'Submit to fix list'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
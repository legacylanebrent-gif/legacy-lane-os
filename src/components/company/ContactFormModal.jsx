import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2, Mail, Send } from 'lucide-react';

export default function ContactFormModal({ open, onClose, business }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim() || !email.trim() || !message.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    setSending(true);
    try {
      await base44.functions.invoke('sendBusinessContactEmail', {
        toEmail: business.email,
        toName: business.company_name || business.full_name,
        fromName: name,
        fromEmail: email,
        subject: subject || `Inquiry from ${name}`,
        message: message,
      });
      setSent(true);
    } catch (err) {
      setError('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setName('');
    setEmail('');
    setSubject('');
    setMessage('');
    setSent(false);
    setError('');
    onClose();
  };

  const companyName = business?.company_name || business?.full_name || 'this company';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Contact {companyName}</DialogTitle>
          <DialogDescription>
            {sent
              ? 'Your message has been sent! They will reply to your email address.'
              : `Send a message to ${companyName}. They'll receive it via email and can reply directly to you.`}
          </DialogDescription>
        </DialogHeader>

        {sent ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <Mail className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-slate-600">Your message was sent successfully to {companyName}.</p>
            <Button onClick={handleClose} className="mt-2">Close</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                placeholder="Your name *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <Input
                type="email"
                placeholder="Your email address *"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Input
                placeholder="Subject (optional)"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div>
              <Textarea
                placeholder="Your message *"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                required
              />
            </div>

            {error && (
              <p className="text-red-600 text-sm">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full bg-orange-600 hover:bg-orange-700 gap-2"
              disabled={sending}
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Message
                </>
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
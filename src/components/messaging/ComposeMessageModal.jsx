import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, Loader2 } from 'lucide-react';

export default function ComposeMessageModal({ open, onClose, currentUser, recipientId = null, recipientName = null }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [formData, setFormData] = useState({
    recipient_id: recipientId || '',
    subject: '',
    content: ''
  });

  useEffect(() => {
    if (open) {
      loadUsers();
      if (recipientId && recipientName) {
        setFormData(prev => ({ ...prev, recipient_id: recipientId }));
      }
    }
  }, [open, recipientId, recipientName]);

  const loadUsers = async () => {
    try {
      const allUsers = await base44.entities.User.list();
      // Filter out current user
      const otherUsers = allUsers.filter(u => u.id !== currentUser.id);
      setUsers(otherUsers);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const recipient = users.find(u => u.id === formData.recipient_id);
      
      await base44.entities.Message.create({
        sender_id: currentUser.id,
        sender_name: currentUser.full_name,
        sender_email: currentUser.email,
        recipient_id: formData.recipient_id,
        recipient_name: recipient?.full_name || 'User',
        recipient_email: recipient?.email,
        subject: formData.subject,
        content: formData.content,
        read: false,
        type: 'internal'
      });

      // Create notification for recipient
      await base44.entities.Notification.create({
        user_id: formData.recipient_id,
        type: 'message',
        title: 'New Message',
        message: `${currentUser.full_name} sent you a message: ${formData.subject}`,
        link: createPageUrl('Messages'),
        read: false
      });

      setFormData({ recipient_id: '', subject: '', content: '' });
      onClose();
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const selectedUser = users.find(u => u.id === formData.recipient_id);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Compose Message</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSend} className="space-y-4 mt-4">
          <div>
            <Label>To *</Label>
            {recipientId && recipientName ? (
              <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="font-medium text-slate-900">{recipientName}</p>
              </div>
            ) : (
              <Select
                value={formData.recipient_id}
                onValueChange={(value) => setFormData({ ...formData, recipient_id: value })}
                disabled={loadingUsers}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingUsers ? "Loading users..." : "Select recipient..."} />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      <div>
                        <p className="font-medium">{user.full_name || user.email}</p>
                        <p className="text-xs text-slate-500">
                          {user.primary_account_type || user.primary_role || 'User'} • {user.email}
                        </p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div>
            <Label>Subject *</Label>
            <Input
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="Message subject"
              required
            />
          </div>

          <div>
            <Label>Message *</Label>
            <Textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Type your message here..."
              rows={8}
              required
            />
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" className="bg-orange-600 hover:bg-orange-700" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Message
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
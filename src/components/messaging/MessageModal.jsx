import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Send, X, Image as ImageIcon } from 'lucide-react';
import { format } from 'date-fns';

export default function MessageModal({ open, onClose, recipient, relatedEntity, savedImages, allImages }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [selectedPhotos, setSelectedPhotos] = useState([]);

  useEffect(() => {
    if (open && recipient) {
      loadUser();
      loadConversation();
    }
  }, [open, recipient]);

  const loadUser = async () => {
    const user = await base44.auth.me();
    setCurrentUser(user);
  };

  const loadConversation = async () => {
    if (!recipient?.id) return;

    try {
      const user = await base44.auth.me();
      
      // Load existing messages between these users
      const allMessages = await base44.entities.Message.list('-created_date', 100);
      const conversation = allMessages.filter(m => 
        (m.sender_id === user.id && m.recipient_id === recipient.id) ||
        (m.sender_id === recipient.id && m.recipient_id === user.id)
      );

      if (conversation.length > 0) {
        setConversationId(conversation[0].conversation_id);
        setMessages(conversation.reverse());
        
        // Mark messages as read
        const unreadMessages = conversation.filter(m => 
          m.recipient_id === user.id && !m.read
        );
        for (const msg of unreadMessages) {
          await base44.entities.Message.update(msg.id, { read: true });
        }
      } else {
        // Generate new conversation ID
        setConversationId(`conv_${Date.now()}_${user.id}_${recipient.id}`);
      }

      // Set default subject if related entity provided
      if (relatedEntity && !subject) {
        setSubject(`Re: ${relatedEntity.title || relatedEntity.name || 'Inquiry'}`);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !currentUser || !recipient) return;

    setLoading(true);
    try {
      const messageData = {
        sender_id: currentUser.id,
        sender_name: currentUser.full_name,
        recipient_id: recipient.id,
        recipient_name: recipient.full_name || recipient.company_name || 'User',
        subject: subject || 'Message',
        message: newMessage,
        conversation_id: conversationId,
        read: false
      };

      if (relatedEntity) {
        messageData.related_entity_type = relatedEntity.type;
        messageData.related_entity_id = relatedEntity.id;
      }

      // Add selected photos to message
      if (selectedPhotos.length > 0) {
        const photoUrls = selectedPhotos.map(idx => {
          const img = allImages[idx];
          return typeof img === 'string' ? img : img?.url;
        }).filter(Boolean);
        if (photoUrls.length > 0) {
          messageData.file_urls = photoUrls;
        }
      }

      const created = await base44.entities.Message.create(messageData);
      setMessages([...messages, created]);
      setNewMessage('');
      setSelectedPhotos([]);
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Message {recipient?.full_name || recipient?.company_name || 'User'}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 max-h-[calc(90vh-8rem)] overflow-y-auto pr-2">
          {messages.length === 0 && (
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Subject</label>
              <Input
                placeholder="Message subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
          )}

          {messages.length > 0 && (
            <ScrollArea className="h-64 sm:h-80 border rounded-lg p-4">
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_id === currentUser?.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        msg.sender_id === currentUser?.id
                          ? 'bg-orange-600 text-white'
                          : 'bg-slate-100 text-slate-900'
                      }`}
                    >
                      <div className="text-xs opacity-75 mb-1">
                        {msg.sender_name} • {format(new Date(msg.created_date), 'MMM d, h:mm a')}
                      </div>
                      <div className="whitespace-pre-wrap">{msg.message}</div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          <div className="space-y-2">
            <Textarea
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              rows={3}
              className="resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  handleSend();
                }
              }}
            />

            {savedImages && savedImages.length > 0 && allImages && (
              <div className="border rounded-lg p-3 bg-slate-50">
                <div className="flex items-center gap-2 mb-3">
                  <ImageIcon className="w-4 h-4 text-slate-600" />
                  <span className="text-sm font-medium text-slate-700">
                    Attach Saved Photos ({selectedPhotos.length} selected)
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {savedImages.map((imageIndex) => {
                    const imageUrl = typeof allImages[imageIndex] === 'string' 
                      ? allImages[imageIndex] 
                      : allImages[imageIndex]?.url;
                    const isSelected = selectedPhotos.includes(imageIndex);
                    
                    return (
                      <div 
                        key={imageIndex} 
                        className="relative cursor-pointer"
                        onClick={() => {
                          setSelectedPhotos(prev =>
                            prev.includes(imageIndex)
                              ? prev.filter(i => i !== imageIndex)
                              : [...prev, imageIndex]
                          );
                        }}
                      >
                        <div
                          className={`w-full aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                            isSelected
                              ? 'border-orange-600 ring-2 ring-orange-200'
                              : 'border-slate-200 hover:border-slate-400'
                          }`}
                        >
                          <img
                            src={imageUrl}
                            alt={`Photo ${imageIndex + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="absolute top-1 right-1 pointer-events-none">
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            isSelected 
                              ? 'bg-orange-600 border-orange-600' 
                              : 'bg-white border-slate-300'
                          }`}>
                            {isSelected && (
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </div>
                        <div className="absolute bottom-1 left-1 right-1 bg-black/70 text-white text-xs px-1 py-0.5 rounded text-center pointer-events-none">
                          Photo {imageIndex + 1}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-500">Press Ctrl+Enter to send</span>
              <Button
                onClick={handleSend}
                disabled={loading || !newMessage.trim()}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <Send className="w-4 h-4 mr-2" />
                Send {selectedPhotos.length > 0 && `(${selectedPhotos.length} photo${selectedPhotos.length > 1 ? 's' : ''})`}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
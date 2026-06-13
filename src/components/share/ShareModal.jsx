import React, { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';

const SOCIALS = [
  {
    name: 'Facebook',
    icon: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/facebook.svg',
    color: '#1877F2',
    shareUrl: (url, title) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(title)}`,
  },
  {
    name: 'X (Twitter)',
    icon: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/x.svg',
    color: '#000000',
    shareUrl: (url, title) =>
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
  },
  {
    name: 'Email',
    icon: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/gmail.svg',
    color: '#EA4335',
    shareUrl: (url, title) =>
      `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`Check out this estate sale: ${url}`)}`,
  },
  {
    name: 'SMS',
    icon: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/messages.svg',
    color: '#34B7F1',
    shareUrl: (url, title) =>
      `sms:?body=${encodeURIComponent(`${title}\n${url}`)}`,
  },
  {
    name: 'WhatsApp',
    icon: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/whatsapp.svg',
    color: '#25D366',
    shareUrl: (url, title) =>
      `https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`,
  },
];

export default function ShareModal({ open, onClose, url, title }) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for insecure contexts
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">Share This Sale</h3>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {SOCIALS.map((social) => (
              <a
                key={social.name}
                href={social.shareUrl(url, title)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-slate-50 transition-colors group"
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: social.color + '15' }}
                >
                  <img src={social.icon} alt={social.name} className="w-6 h-6" />
                </div>
                <span className="text-xs text-slate-600 group-hover:text-slate-900 font-medium">
                  {social.name}
                </span>
              </a>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-200">
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0 bg-slate-50 rounded-lg px-3 py-2 text-sm text-slate-600 truncate">
                {url}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyLink}
                className="flex-shrink-0"
                title="Copy link"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
            {copied && (
              <p className="text-xs text-green-600 mt-1 ml-1">Link copied!</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
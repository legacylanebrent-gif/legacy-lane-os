import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { X, Send, Loader2, Sparkles, MessageCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function GuideAIBot({ guideContext }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await base44.functions.invoke('guideAIChat', {
        guideContext,
        messages: newMessages,
      });
      const reply = res.data?.reply || res.data?.error || 'Sorry, I had trouble responding. Please try again.';
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I ran into an issue. Please try again in a moment.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickPrompts = [
    'What should I do first?',
    'How long does this process take?',
    'Do I need a lawyer?',
  ];

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(true)}
        className={`fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-700 hover:to-amber-600 text-white font-semibold text-sm px-4 py-3 rounded-full shadow-2xl transition-all duration-200 hover:scale-105 ${open ? 'opacity-0 pointer-events-none scale-90' : 'opacity-100'}`}
        aria-label="Ask AI Guide"
      >
        <Sparkles className="w-4 h-4" />
        Ask AI Guide
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
      </button>

      {/* Chat panel */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm sm:bg-transparent sm:backdrop-blur-0"
            onClick={() => setOpen(false)}
          />
          <div className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 z-50 w-full sm:w-[400px] h-[80vh] sm:h-[600px] sm:max-h-[85vh] bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-900 to-slate-800 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-amber-400 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm leading-tight">AI Guide</p>
                  <p className="text-slate-400 text-xs leading-tight truncate max-w-[200px]">{guideContext.title}</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
              {messages.length === 0 ? (
                <div className="text-center py-6">
                  <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center mb-3">
                    <MessageCircle className="w-6 h-6 text-orange-600" />
                  </div>
                  <p className="text-slate-700 font-semibold text-sm mb-1">Ask me anything about</p>
                  <p className="text-slate-500 text-xs mb-4 px-4">{guideContext.title}</p>
                  <div className="space-y-2">
                    {quickPrompts.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => { setInput(q); }}
                        className="block w-full text-left text-xs text-slate-600 bg-white border border-slate-200 rounded-lg px-3 py-2 hover:border-orange-300 hover:bg-orange-50 transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-orange-600 text-white rounded-br-md'
                          : 'bg-white border border-slate-200 text-slate-700 rounded-bl-md'
                      }`}
                    >
                      {msg.role === 'user' ? (
                        msg.content
                      ) : (
                        <ReactMarkdown className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">{msg.content}</ReactMarkdown>
                      )}
                    </div>
                  </div>
                ))
              )}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                    <span className="text-xs text-slate-400">Thinking...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="flex-shrink-0 border-t border-slate-200 p-3 bg-white">
              <div className="flex items-end gap-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a question about this guide..."
                  className="min-h-[40px] max-h-[120px] resize-none text-sm"
                  rows={1}
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  size="icon"
                  className="bg-orange-600 hover:bg-orange-700 flex-shrink-0 h-10 w-10"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5 text-center">AI guidance — not legal, tax, or financial advice.</p>
            </div>
          </div>
        </>
      )}
    </>
  );
}
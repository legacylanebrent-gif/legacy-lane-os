import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Copy, Check, RefreshCw, Lightbulb, MessageCircle, Loader2 } from 'lucide-react';

const CATEGORY_META = {
  promote: {
    label: 'Promote My Business',
    icon: <Sparkles className="w-4 h-4 text-amber-500" />,
    description: 'Build your brand and credibility between sales — no sale announcements, just business.',
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  discussion: {
    label: 'Start a Conversation',
    icon: <MessageCircle className="w-4 h-4 text-cyan-600" />,
    description: 'Fun, engaging posts that get neighbors commenting and keep your name visible.',
    badge: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  },
};

function PostCard({ post }) {
  const [copied, setCopied] = useState(false);
  const meta = CATEGORY_META[post.category] || CATEGORY_META.promote;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(post.text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = post.text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <Card className="flex flex-col">
      <CardContent className="p-4 flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-2">
          {meta.icon}
          <Badge variant="outline" className={`text-[10px] ${meta.badge}`}>{meta.label}</Badge>
        </div>
        <p className="text-sm text-slate-800 whitespace-pre-wrap flex-1">{post.text}</p>
        {post.why && <p className="text-xs text-slate-400 mt-2 italic">{post.why}</p>}
        <Button variant="outline" size="sm" onClick={handleCopy} className="mt-3 self-start text-xs">
          {copied ? <Check className="w-3 h-3 mr-1 text-green-600" /> : <Copy className="w-3 h-3 mr-1" />}
          {copied ? 'Copied!' : 'Copy post'}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function OperatorMarketingHub() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(null);

  const cacheKey = (uid) => `mh_post_ideas_${uid}`;
  const loadCache = (uid) => {
    try { return JSON.parse(localStorage.getItem(cacheKey(uid)) || 'null'); } catch { return null; }
  };
  const saveCache = (uid, data) => {
    try { localStorage.setItem(cacheKey(uid), JSON.stringify(data)); } catch { /* ignore */ }
  };

  const generate = useCallback(async (user, existing, opts = {}) => {
    setGenerating(true);
    setError(null);
    try {
      const payload = {
        company_name: user.company_name || user.full_name,
        city: user.city,
        state: user.state,
        specialty: user.specialty || user.company_type,
        used: (opts.reset ? [] : existing).slice(-12).map(p => p.text),
      };
      const res = await base44.functions.invoke('generateOperatorPostIdeas', payload);
      const fresh = res.data.posts || [];
      if (!fresh.length) throw new Error('No ideas came back — try again.');
      const next = opts.reset ? fresh : [...existing, ...fresh];
      setPosts(next);
      saveCache(user.id, next);
      return next;
    } catch (e) {
      console.error('Error generating post ideas:', e);
      setError(e.message || 'Something went wrong. Try again.');
    } finally {
      setGenerating(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const user = await base44.auth.me();
        setProfile(user);
        const cached = loadCache(user.id);
        if (cached && cached.length) {
          setPosts(cached);
        } else {
          await generate(user, [], { reset: true });
        }
      } catch (e) {
        console.error('Error loading marketing hub:', e);
        setError('Could not load your ideas. Try again.');
      } finally {
        setLoading(false);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const promote = posts.filter(p => p.category === 'promote');
  const discussion = posts.filter(p => p.category === 'discussion');

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center text-slate-500 text-sm">
        <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading your marketing hub...
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-900 flex items-center gap-2">
            <Lightbulb className="w-6 h-6 text-amber-500" /> Marketing Hub
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Ready-to-post social ideas tailored to {profile?.company_name || profile?.full_name || 'your company'}.
            Fun and engaging — not sale announcements. Copy one and paste it anywhere.
          </p>
        </div>
        <Button
          onClick={() => generate(profile, posts)}
          disabled={generating}
          className="bg-amber-600 hover:bg-amber-700 text-white"
        >
          {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Generate more ideas
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md p-3">{error}</div>
      )}

      {['promote', 'discussion'].map(cat => {
        const meta = CATEGORY_META[cat];
        const list = cat === 'promote' ? promote : discussion;
        return (
          <section key={cat}>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  {meta.icon} {meta.label}
                  <Badge variant="outline" className="text-[10px]">{list.length}</Badge>
                </CardTitle>
                <p className="text-xs text-slate-400">{meta.description}</p>
              </CardHeader>
              <CardContent>
                {list.length === 0 ? (
                  <p className="text-sm text-slate-400 py-4 text-center">
                    {generating ? 'Cooking up ideas...' : 'No ideas yet — hit "Generate more ideas" above.'}
                  </p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {list.map((post, i) => <PostCard key={`${cat}-${i}-${post.text.slice(0, 12)}`} post={post} />)}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        );
      })}

      {generating && (
        <div className="flex items-center justify-center gap-2 text-sm text-slate-400 py-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Writing fresh posts for you...
        </div>
      )}
    </div>
  );
}
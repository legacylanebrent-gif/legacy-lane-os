import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageCircle, Send, Loader2, AlertTriangle, ShieldCheck, Trash2 } from 'lucide-react';

export default function CoolFindsComments({ storyId, user }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (storyId) loadComments();
  }, [storyId]);

  // Subscribe to realtime comment updates
  useEffect(() => {
    if (!storyId) return;
    const unsubscribe = base44.entities.CoolFindComment.subscribe((event) => {
      if (event.data?.story_id === storyId) {
        loadComments();
      }
    });
    return unsubscribe;
  }, [storyId]);

  const loadComments = async () => {
    try {
      const data = await base44.entities.CoolFindComment.filter(
        { story_id: storyId, status: 'visible' },
        '-created_date',
        100
      );
      setComments(data || []);
    } catch (e) {
      console.error('Error loading comments:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      base44.auth.redirectToLogin(window.location.href);
      return;
    }
    if (!newComment.trim()) return;
    if (newComment.trim().length > 1000) {
      setError('Comment must be 1000 characters or less.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await base44.entities.CoolFindComment.create({
        story_id: storyId,
        author_id: user.id,
        author_name: user.full_name || 'Anonymous',
        content: newComment.trim(),
        status: 'visible'
      });
      setNewComment('');
      // Comment will appear via realtime subscription or reload
      loadComments();
    } catch (e) {
      console.error('Error posting comment:', e);
      setError('Failed to post comment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId) => {
    try {
      await base44.entities.CoolFindComment.delete(commentId);
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (e) {
      console.error('Error deleting comment:', e);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <div className="mt-12 pt-8 border-t border-slate-200">
      <h3 className="text-xl font-serif font-bold text-slate-900 mb-6 flex items-center gap-2">
        <MessageCircle className="w-5 h-5 text-purple-600" />
        Comments ({comments.length})
      </h3>

      {/* Comment input — registered users only */}
      {user ? (
        <div className="mb-8">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Share your thoughts on this cool find..."
            maxLength={1000}
            className="mb-2 resize-none"
            rows={3}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">{newComment.length}/1000</span>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !newComment.trim()}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Post Comment
            </Button>
          </div>
          {error && (
            <p className="text-sm text-red-600 mt-2 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" /> {error}
            </p>
          )}
          <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> Comments are monitored by our AI moderation system for spam and inappropriate content.
          </p>
        </div>
      ) : (
        <div className="mb-8 p-4 bg-slate-50 rounded-lg text-center">
          <p className="text-sm text-slate-600 mb-3">Sign in to join the conversation and share your thoughts.</p>
          <Button
            onClick={() => base44.auth.redirectToLogin(window.location.href)}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            Sign In to Comment
          </Button>
        </div>
      )}

      {/* Comments list */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-slate-400 text-center py-8 text-sm">No comments yet. Be the first to share your thoughts!</p>
      ) : (
        <div className="space-y-4">
          {comments.map(comment => (
            <div key={comment.id} className="flex gap-3">
              <Avatar className="h-9 w-9 flex-shrink-0">
                <AvatarFallback className="bg-purple-100 text-purple-700 text-sm font-medium">
                  {getInitials(comment.author_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm text-slate-900">{comment.author_name || 'Anonymous'}</span>
                    <span className="text-xs text-slate-400">{formatDate(comment.created_date)}</span>
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap break-words">{comment.content}</p>
                </div>
                {user && (user.id === comment.author_id || user.role === 'admin') && (
                  <button
                    onClick={() => handleDelete(comment.id)}
                    className="text-xs text-slate-400 hover:text-red-600 mt-1 flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
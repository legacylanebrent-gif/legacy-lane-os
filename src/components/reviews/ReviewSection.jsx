import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Star } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

/**
 * Reusable review section for marketplace items and company profiles.
 * Props:
 *   reviewType: 'marketplace_item' | 'company'
 *   targetId:   item_id (marketplace) | company_id/operator user id (company)
 *   sellerId:   the seller/operator user id (for RLS scoping)
 */
export default function ReviewSection({ reviewType, targetId, sellerId }) {
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');

  useEffect(() => {
    base44.auth.isAuthenticated().then(authed => {
      if (authed) base44.auth.me().then(setUser).catch(() => {});
    });
    loadReviews();
  }, [targetId]);

  const loadReviews = async () => {
    if (!targetId) return;
    try {
      setLoading(true);
      const filter = reviewType === 'marketplace_item'
        ? { review_type: 'marketplace_item', item_id: targetId }
        : { review_type: 'company', company_id: targetId };
      const data = await base44.entities.Review.filter(filter, '-created_date', 50);
      setReviews(data || []);
    } catch (e) {
      console.error('Error loading reviews:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({ title: 'Please sign in to leave a review', variant: 'destructive' });
      return;
    }
    if (!comment.trim()) {
      toast({ title: 'Please write a comment', variant: 'destructive' });
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        review_type: reviewType,
        rating,
        title: title.trim() || null,
        comment: comment.trim(),
        reviewer_id: user.id,
        reviewer_name: user.full_name || user.company_name || 'Anonymous',
        verified_purchase: false,
      };

      if (reviewType === 'marketplace_item') {
        payload.item_id = targetId;
        payload.seller_id = sellerId;
      } else {
        payload.company_id = targetId;
        payload.seller_id = sellerId;
      }

      // Mark as verified if the user has a completed purchase/order for this item/company
      try {
        if (reviewType === 'marketplace_item') {
          const purchases = await base44.entities.Purchase.filter({
            marketplace_item_id: targetId,
            buyer_id: user.id,
            status: 'COMPLETED',
          });
          payload.verified_purchase = purchases.length > 0;
        } else {
          const orders = await base44.entities.Order.filter({
            buyer_id: user.id,
            status: { $in: ['completed', 'delivered'] },
          });
          payload.verified_purchase = orders.some(o =>
            (o.items || []).some(it => it.seller_id === sellerId)
          );
        }
      } catch (verifyErr) {
        // Non-blocking — submit as unverified if the check fails
        console.warn('Could not verify purchase:', verifyErr);
      }

      await base44.entities.Review.create(payload);
      toast({ title: 'Review submitted! Thank you.' });
      setShowForm(false);
      setTitle('');
      setComment('');
      setRating(5);
      loadReviews();
    } catch (e) {
      toast({ title: 'Failed to submit review', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : null;

  const StarRow = ({ value, interactive, onChange, onHover, size = 'w-5 h-5' }) => (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n}
          className={`${size} cursor-${interactive ? 'pointer' : 'default'} transition-colors ${
            n <= (interactive ? (hoverRating || rating) : value)
              ? 'fill-amber-400 text-amber-400'
              : 'fill-slate-200 text-slate-200'
          }`}
          onClick={interactive ? () => onChange(n) : undefined}
          onMouseEnter={interactive ? () => onHover(n) : undefined}
          onMouseLeave={interactive ? () => onHover(0) : undefined}
        />
      ))}
    </div>
  );

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-slate-900">
          Reviews {avgRating && <span className="text-amber-500 ml-1">★ {avgRating}</span>}
          <span className="text-sm font-normal text-slate-400 ml-1">({reviews.length})</span>
        </h2>
        {user && user.id !== sellerId && (
          <Button
            variant="outline"
            onClick={() => setShowForm(!showForm)}
            className="border-orange-300 text-orange-700 hover:bg-orange-50"
          >
            {showForm ? 'Cancel' : 'Write a Review'}
          </Button>
        )}
      </div>

      {/* Review Form */}
      {showForm && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Your Rating</label>
            <StarRow value={rating} interactive onChange={setRating} onHover={setHoverRating} size="w-7 h-7" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title (optional)</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Summarize your experience" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Your Review</label>
            <Textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Share details about your experience..."
              className="min-h-28"
            />
          </div>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !comment.trim()}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {submitting ? 'Submitting...' : 'Submit Review'}
          </Button>
        </div>
      )}

      {/* Review List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="bg-white border rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-1/3 mb-2" />
              <div className="h-3 bg-slate-100 rounded w-1/4 mb-3" />
              <div className="h-3 bg-slate-100 rounded w-full" />
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
          <Star className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-500 text-sm">No reviews yet. Be the first to share your experience!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map(review => (
            <div key={review.id} className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-800 text-sm">
                    {review.reviewer_name || 'Anonymous'}
                  </span>
                  {review.verified_purchase && (
                    <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">
                      Verified Purchase
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-400">
                  {review.created_date ? new Date(review.created_date).toLocaleDateString() : ''}
                </span>
              </div>
              <div className="mb-2">
                <StarRow value={review.rating} size="w-4 h-4" />
              </div>
              {review.title && (
                <p className="font-medium text-slate-800 text-sm mb-1">{review.title}</p>
              )}
              {review.comment && (
                <p className="text-slate-600 text-sm whitespace-pre-wrap">{review.comment}</p>
              )}
              {review.seller_response && (
                <div className="mt-3 bg-slate-50 border-l-2 border-slate-300 pl-3 py-2">
                  <p className="text-xs font-semibold text-slate-600 mb-0.5">Seller Response</p>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">{review.seller_response}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Heart, Users } from 'lucide-react';

export default function FollowCompanyButton({ operatorId, operatorName, operatorCity, operatorState, currentUser }) {
  const [following, setFollowing] = useState(false);
  const [followId, setFollowId] = useState(null);
  const [followerCount, setFollowerCount] = useState(null);
  const [busy, setBusy] = useState(false);

  const isOwnCompany = currentUser && currentUser.id === operatorId;

  useEffect(() => {
    if (!operatorId) return;
    let cancelled = false;
    (async () => {
      try {
        const followers = await base44.entities.CompanyFollow.filter({ operator_id: operatorId });
        if (cancelled) return;
        setFollowerCount(followers.length);
        const mine = currentUser ? followers.find(f => f.consumer_user_id === currentUser.id) : null;
        setFollowing(!!mine);
        setFollowId(mine?.id || null);
      } catch (e) {
        // Follow count is not essential — leave it hidden rather than block the page
      }
    })();
    return () => { cancelled = true; };
  }, [operatorId, currentUser?.id]);

  const toggleFollow = async () => {
    if (!currentUser) {
      base44.auth.redirectToLogin(window.location.href);
      return;
    }
    setBusy(true);
    try {
      if (following && followId) {
        await base44.entities.CompanyFollow.delete(followId);
        setFollowing(false);
        setFollowId(null);
        setFollowerCount(c => (typeof c === 'number' ? Math.max(0, c - 1) : c));
      } else {
        const created = await base44.entities.CompanyFollow.create({
          consumer_user_id: currentUser.id,
          operator_id: operatorId,
          operator_name: operatorName || '',
          operator_city: operatorCity || '',
          operator_state: operatorState || '',
          notify_email: true,
          notify_sms: false,
          notify_inapp: true,
          auto_favorite: false
        });
        setFollowing(true);
        setFollowId(created.id);
        setFollowerCount(c => (typeof c === 'number' ? c + 1 : c));
      }
    } catch (err) {
      console.error('Error toggling company follow:', err);
    } finally {
      setBusy(false);
    }
  };

  if (!operatorId || isOwnCompany) return null;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <Button
        onClick={toggleFollow}
        disabled={busy}
        variant={following ? 'outline' : 'default'}
        className={following ? 'gap-2' : 'gap-2 bg-orange-600 hover:bg-orange-700'}
      >
        <Heart className={`w-4 h-4 ${following ? 'fill-orange-500 text-orange-500' : ''}`} />
        {busy ? 'Saving…' : following ? 'Following' : 'Follow Company'}
      </Button>
      {typeof followerCount === 'number' && followerCount > 0 && (
        <span className="inline-flex items-center gap-1 text-sm text-slate-500">
          <Users className="w-4 h-4" />
          {followerCount} {followerCount === 1 ? 'follower' : 'followers'}
        </span>
      )}
    </div>
  );
}
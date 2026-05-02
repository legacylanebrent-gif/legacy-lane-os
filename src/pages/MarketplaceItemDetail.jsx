import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Heart, MapPin, Phone, Mail, MessageSquare, Clock, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function MarketplaceItemDetail() {
  const [searchParams] = useSearchParams();
  const itemId = searchParams.get('id');

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bids, setBids] = useState([]);
  const [isWatched, setIsWatched] = useState(false);
  const [user, setUser] = useState(null);
  const [timeLeft, setTimeLeft] = useState('');

  // Bidding state
  const [bidAmount, setBidAmount] = useState('');
  const [autoBidMax, setAutoBidMax] = useState('');
  const [useAutoBid, setUseAutoBid] = useState(false);
  const [bidError, setBidError] = useState('');
  const [bidSuccess, setBidSuccess] = useState('');
  const [submittingBid, setSubmittingBid] = useState(false);

  // Message state
  const [showMessage, setShowMessage] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [messageType, setMessageType] = useState('QUESTION');

  useEffect(() => {
    loadData();
  }, [itemId]);

  useEffect(() => {
    if (item?.listing_type === 'AUCTION') {
      const updateTimer = () => {
        const now = new Date();
        const end = new Date(item.auction_end_date);
        const diff = end - now;

        if (diff <= 0) {
          setTimeLeft('Auction ended');
        } else {
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
          const minutes = Math.floor((diff / 1000 / 60) % 60);
          const seconds = Math.floor((diff / 1000) % 60);

          setTimeLeft(
            days > 0
              ? `${days}d ${hours}h ${minutes}m`
              : `${hours}h ${minutes}m ${seconds}s`,
          );
        }
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }
  }, [item]);

  const loadData = async () => {
    try {
      setLoading(true);
      const me = await base44.auth.me();
      setUser(me);

      const itemData = await base44.entities.MarketplaceItem.filter({ id: itemId });
      if (itemData.length > 0) {
        const mi = itemData[0];

        // Fetch linked Item record to get title, description, images, category, etc.
        let merged = { ...mi };
        if (mi.item_id) {
          const linkedItems = await base44.entities.Item.filter({ id: mi.item_id });
          if (linkedItems.length > 0) {
            const li = linkedItems[0];
            merged = {
              ...li,           // base item fields (title, description, images, category, condition)
              ...mi,           // marketplace fields win (price, listing_type, shipping, etc.)
              image_url: (li.images || [])[0] || mi.image_url || null,
              images: li.images || [],
            };
          }
        }

        // Fetch seller name + location
        if (mi.operator_id) {
          const sellers = await base44.entities.User.filter({ id: mi.operator_id });
          if (sellers.length > 0) {
            const seller = sellers[0];
            merged.operator_name = seller.company_name || seller.full_name || 'Unknown Seller';
            merged.operator_city = seller.city || seller.location_city || null;
            merged.operator_state = seller.state || seller.location_state || null;
          }
        }

        setItem(merged);

        // Load bids if auction
        if (mi.listing_type === 'AUCTION') {
          const bidData = await base44.entities.Bid.filter(
            { marketplace_item_id: itemId },
            '-created_date',
          );
          setBids(bidData || []);
        }
      }
    } catch (error) {
      console.error('Error loading item:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceBid = async () => {
    setBidError('');
    setBidSuccess('');

    if (!user) {
      setBidError('Please sign in to bid');
      return;
    }

    if (user.id === item.operator_id) {
      setBidError('You cannot bid on your own item');
      return;
    }

    const amount = parseFloat(bidAmount);
    if (!amount || amount <= 0) {
      setBidError('Please enter a valid bid amount');
      return;
    }

    if (item.auction_type === 'AUTO_BID' && useAutoBid) {
      const max = parseFloat(autoBidMax);
      if (!max || max < amount) {
        setBidError('Max auto-bid must be greater than or equal to bid amount');
        return;
      }

      try {
        setSubmittingBid(true);
        await base44.entities.Bid.create({
          marketplace_item_id: itemId,
          bidder_id: user.id,
          bid_amount: amount,
          bid_type: 'AUTO',
          max_auto_bid: max,
          is_winning_bid: false,
        });
        setBidSuccess(`Auto-bid placed! Maximum: $${max.toLocaleString()}`);
        setBidAmount('');
        setAutoBidMax('');
        loadData();
      } catch (error) {
        setBidError('Failed to place bid: ' + error.message);
      } finally {
        setSubmittingBid(false);
      }
    } else {
      try {
        setSubmittingBid(true);
        await base44.entities.Bid.create({
          marketplace_item_id: itemId,
          bidder_id: user.id,
          bid_amount: amount,
          bid_type: 'MANUAL',
          is_winning_bid: false,
        });
        setBidSuccess(`Bid placed: $${amount.toLocaleString()}`);
        setBidAmount('');
        loadData();
      } catch (error) {
        setBidError('Failed to place bid: ' + error.message);
      } finally {
        setSubmittingBid(false);
      }
    }
  };

  const handleBuyNow = async () => {
    if (!user) {
      alert('Please sign in to purchase');
      return;
    }

    try {
      await base44.entities.Purchase.create({
        marketplace_item_id: itemId,
        seller_id: item.operator_id,
        buyer_id: user.id,
        purchase_type: 'FIXED_PRICE',
        final_price: item.price,
        shipping_option_chosen: item.shipping_option === 'SHIPS_ONLY' ? 'SHIP' : 'LOCAL_PICKUP',
        shipping_cost_paid: item.shipping_option === 'SHIPS_ONLY' ? item.shipping_cost : 0,
        status: 'PENDING_PAYMENT_OFFLINE',
      });

      alert('Purchase complete! Next steps have been sent to your email. Contact the seller to arrange payment and delivery.');
      loadData();
    } catch (error) {
      alert('Error completing purchase: ' + error.message);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;

    try {
      await base44.entities.ItemMessage.create({
        marketplace_item_id: itemId,
        from_user_id: user.id,
        to_user_id: item.operator_id,
        message_text: messageText,
        message_type: messageType,
        is_read: false,
      });

      setMessageText('');
      setShowMessage(false);
      alert('Message sent to seller!');
    } catch (error) {
      alert('Error sending message: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-cream-50 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <Skeleton className="h-96 w-full mb-8" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-cream-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Item not found</h2>
          <p className="text-slate-600">The item you're looking for doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  const isAuction = item.listing_type === 'AUCTION';
  const highestBid = bids.length > 0 ? Math.max(...bids.map(b => b.bid_amount)) : item.reserve_price;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-cream-50 py-12">
      <div className="max-w-5xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Image & Gallery */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
              <div className="aspect-square bg-slate-100 flex items-center justify-center">
                {item.images?.length > 0 || item.image_url ? (
                  <img src={item.images?.[0] || item.image_url} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-slate-400">No image available</span>
                )}
              </div>
              {item.images?.length > 1 && (
                <div className="flex gap-2 p-3 overflow-x-auto border-t">
                  {item.images.map((url, idx) => (
                    <img key={idx} src={url} alt="" className="w-16 h-16 object-cover rounded-lg flex-shrink-0 border-2 border-slate-200 cursor-pointer hover:border-orange-400 transition-colors" />
                  ))}
                </div>
              )}

              {/* Details */}
              <div className="p-6">
                <div className="mb-4 flex flex-wrap gap-2">
                  <Badge className="bg-gold-600">{isAuction ? item.auction_type + ' Auction' : 'Fixed Price'}</Badge>
                  {item.shipping_option === 'LOCAL_PICKUP_ONLY' && (
                    <Badge className="bg-sage-600 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      Local Pickup Only
                    </Badge>
                  )}
                  {item.shipping_option === 'BOTH' && (
                    <Badge className="bg-blue-600">Ships & Local Pickup</Badge>
                  )}
                </div>

                <h1 className="text-3xl font-bold text-slate-900 mb-2">{item.title}</h1>
                <p className="text-slate-600 mb-6">{item.description}</p>

                {/* Seller Info */}
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-sm text-slate-600 mb-2">Sold by</p>
                  <p className="font-semibold text-slate-900">{item.operator_name || item.seller_name || 'Estate Sale Operator'}</p>
                  {(item.operator_city || item.operator_state) && (
                    <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" />
                      {[item.operator_city, item.operator_state].filter(Boolean).join(', ')}
                    </p>
                  )}
                  {item.pickup_location_zip && (
                    <p className="text-sm text-slate-600 mt-2">
                      📍 Local pickup available in {item.pickup_location_zip}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar: Bidding/Purchase */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-8 space-y-6">
              {/* Price / Auction Timer */}
              {isAuction ? (
                <>
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Current Bid</p>
                    <p className="text-3xl font-bold text-gold-600">${highestBid?.toLocaleString() || item.reserve_price?.toLocaleString()}</p>
                    <p className="text-xs text-slate-500 mt-1">{bids.length} bids</p>
                  </div>

                  {/* Auction Timer */}
                  <div className="bg-red-50 rounded-lg p-3 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-red-600" />
                    <div>
                      <p className="text-xs text-red-600 font-semibold">Time Left</p>
                      <p className="text-sm font-bold text-red-700">{timeLeft}</p>
                    </div>
                  </div>

                  {/* Bid Form */}
                  <div className="space-y-3">
                    {item.auction_type === 'SIMPLE' || item.auction_type === 'AUTO_BID' ? (
                      <>
                        <Input
                          type="number"
                          placeholder={`Minimum: $${(highestBid + 5)?.toLocaleString()}`}
                          value={bidAmount}
                          onChange={e => setBidAmount(e.target.value)}
                          className="font-semibold"
                        />

                        {item.auction_type === 'AUTO_BID' && (
                          <>
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={useAutoBid}
                                onChange={e => setUseAutoBid(e.target.checked)}
                              />
                              <span className="text-sm text-slate-700">Use auto-bid (proxy)</span>
                            </label>
                            {useAutoBid && (
                              <Input
                                type="number"
                                placeholder="Maximum bid amount"
                                value={autoBidMax}
                                onChange={e => setAutoBidMax(e.target.value)}
                                className="text-sm"
                              />
                            )}
                          </>
                        )}

                        <Button
                          onClick={handlePlaceBid}
                          disabled={submittingBid || !bidAmount}
                          className="w-full bg-gold-600 hover:bg-gold-700"
                        >
                          {submittingBid ? 'Placing bid...' : 'Place Bid'}
                        </Button>
                      </>
                    ) : (
                      <Input
                        type="number"
                        placeholder="Enter your sealed bid"
                        value={bidAmount}
                        onChange={e => setBidAmount(e.target.value)}
                        className="font-semibold"
                      />
                    )}

                    {bidError && <p className="text-xs text-red-600">{bidError}</p>}
                    {bidSuccess && <p className="text-xs text-green-600">{bidSuccess}</p>}
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Price</p>
                    <p className="text-3xl font-bold text-gold-600">${item.price?.toLocaleString()}</p>
                    {item.shipping_option !== 'LOCAL_PICKUP_ONLY' && (
                      <p className="text-xs text-slate-500 mt-1">
                        {item.shipping_cost > 0 ? `+ $${item.shipping_cost} shipping` : 'Free shipping'}
                      </p>
                    )}
                  </div>

                  <Button onClick={handleBuyNow} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3">
                    Add to Cart
                  </Button>
                  <Button onClick={handleBuyNow} className="w-full bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-semibold">
                    Buy Now
                  </Button>
                </>
              )}

              {/* Wishlist Button */}
              <Button
                variant="outline"
                className="w-full flex items-center justify-center gap-2"
                onClick={() => setIsWatched(!isWatched)}
              >
                <Heart className={`w-4 h-4 ${isWatched ? 'fill-red-500' : ''}`} />
                {isWatched ? 'Watching' : 'Add to Watchlist'}
              </Button>

              {/* Message Button */}
              <Button
                variant="outline"
                className="w-full flex items-center justify-center gap-2"
                onClick={() => setShowMessage(!showMessage)}
              >
                <MessageSquare className="w-4 h-4" />
                Ask Seller a Question
              </Button>

              {/* Message Form */}
              {showMessage && (
                <div className="space-y-3 border-t pt-4">
                  <select
                    value={messageType}
                    onChange={e => setMessageType(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg"
                  >
                    <option value="QUESTION">Question</option>
                    <option value="OFFER">Make an Offer</option>
                    <option value="NEGOTIATION">Negotiate</option>
                  </select>

                  <Textarea
                    placeholder="Type your message..."
                    value={messageText}
                    onChange={e => setMessageText(e.target.value)}
                    className="text-sm min-h-24"
                  />

                  <Button
                    onClick={handleSendMessage}
                    disabled={!messageText.trim()}
                    className="w-full bg-sage-600"
                  >
                    Send Message
                  </Button>
                </div>
              )}

              {/* Recent Bids */}
              {isAuction && bids.length > 0 && (
                <div className="border-t pt-4">
                  <p className="text-sm font-semibold text-slate-900 mb-3">Recent Bids</p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {bids.slice(0, 5).map((bid, idx) => (
                      <div key={idx} className="flex justify-between text-xs">
                        <span className="text-slate-600">Bid #{bids.length - idx}</span>
                        <span className="font-semibold text-slate-900">
                          ${bid.bid_amount?.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
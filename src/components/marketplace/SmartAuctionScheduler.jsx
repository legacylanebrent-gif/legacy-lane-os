import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sparkles, Calendar, Clock, Loader2, CheckCircle } from 'lucide-react';

export default function SmartAuctionScheduler({ category, title, price, condition, onScheduleSet }) {
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [accepted, setAccepted] = useState(false);

  const getSuggestion = async () => {
    setLoading(true);
    setSuggestion(null);
    setAccepted(false);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an estate sale auction scheduling expert. Based on the following item, suggest the optimal auction start and end date/time to maximize bids and final sale price.

Item Details:
- Title: ${title || 'Unknown'}
- Category: ${category || 'other'}
- Price / Estimated Value: $${price || 'unknown'}
- Condition: ${condition || 'used_good'}
- Today's Date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

Rules:
- Auctions should run 3–7 days
- End on a Sunday or Saturday evening (7pm–9pm ET) when possible — weekends drive the most bids
- Start on a Thursday or Friday for most categories
- For high-value antiques/art/jewelry, suggest a 5–7 day run
- For everyday items, 3 days is sufficient
- Return dates in YYYY-MM-DD format and times in HH:MM (24h) format

Return a JSON object with:
{
  "start_date": "YYYY-MM-DD",
  "start_time": "HH:MM",
  "end_date": "YYYY-MM-DD",
  "end_time": "HH:MM",
  "rationale": "One sentence explaining why these dates/times are optimal for this item."
}`,
        response_json_schema: {
          type: 'object',
          properties: {
            start_date: { type: 'string' },
            start_time: { type: 'string' },
            end_date: { type: 'string' },
            end_time: { type: 'string' },
            rationale: { type: 'string' }
          }
        }
      });

      setSuggestion(result);
      setStartDate(result.start_date || '');
      setStartTime(result.start_time || '');
      setEndDate(result.end_date || '');
      setEndTime(result.end_time || '');
    } catch (err) {
      console.error('Error getting auction suggestion:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = () => {
    const start = startDate && startTime ? `${startDate}T${startTime}:00` : null;
    const end = endDate && endTime ? `${endDate}T${endTime}:00` : null;
    onScheduleSet({ auction_start_date: start, auction_end_date: end });
    setAccepted(true);
  };

  return (
    <div className="border border-purple-100 rounded-lg p-4 bg-purple-50/40 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-purple-700 uppercase tracking-wide flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Auction Schedule
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={getSuggestion}
          disabled={loading}
          className="border-purple-300 text-purple-700 hover:bg-purple-100 text-xs"
        >
          {loading ? (
            <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Analyzing...</>
          ) : (
            <><Sparkles className="w-3 h-3 mr-1" /> AI Suggest Dates</>
          )}
        </Button>
      </div>

      {suggestion && (
        <div className="bg-purple-100/60 border border-purple-200 rounded-md p-3 text-sm text-purple-800">
          <p className="font-medium mb-1 flex items-center gap-1"><Sparkles className="w-3 h-3" /> AI Recommendation</p>
          <p className="text-xs text-purple-700">{suggestion.rationale}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-slate-600">Start Date</Label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setAccepted(false); }}
            className="h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs text-slate-600">Start Time</Label>
          <Input
            type="time"
            value={startTime}
            onChange={(e) => { setStartTime(e.target.value); setAccepted(false); }}
            className="h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs text-slate-600">End Date</Label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setAccepted(false); }}
            className="h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs text-slate-600">End Time</Label>
          <Input
            type="time"
            value={endTime}
            onChange={(e) => { setEndTime(e.target.value); setAccepted(false); }}
            className="h-8 text-sm"
          />
        </div>
      </div>

      {(startDate && endDate) && (
        <Button
          type="button"
          size="sm"
          onClick={handleAccept}
          className={accepted ? 'bg-green-600 hover:bg-green-700 w-full' : 'bg-purple-600 hover:bg-purple-700 w-full'}
        >
          {accepted ? (
            <><CheckCircle className="w-3 h-3 mr-1" /> Schedule Confirmed</>
          ) : (
            <><Clock className="w-3 h-3 mr-1" /> Use This Schedule</>
          )}
        </Button>
      )}
    </div>
  );
}
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ChevronDown, ChevronUp, Trash2, GripVertical, Star, TrendingUp, Eye, Award, BookOpen, DollarSign } from 'lucide-react';

const BUY_COLORS = {
  strong_buy: 'bg-green-600 text-white',
  buy: 'bg-green-100 text-green-800',
  watch: 'bg-amber-100 text-amber-800',
  pass: 'bg-slate-100 text-slate-600',
  skip: 'bg-red-100 text-red-700',
};

const SCORE_BAR_COLOR = (score) =>
  score >= 70 ? 'bg-green-500' : score >= 50 ? 'bg-amber-500' : score >= 30 ? 'bg-orange-400' : 'bg-slate-300';

function ScoreBar({ label, value }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-slate-500 w-28 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${SCORE_BAR_COLOR(value)}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-slate-700 font-semibold w-8 text-right">{Math.round(value)}</span>
    </div>
  );
}

export default function VideoItemCard({ item, index, onRemove, onNotesChange, dragHandleProps }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className={`border-2 transition-all ${item.admin_selected ? 'border-violet-200' : 'border-slate-200 opacity-60'}`}>
      <CardContent className="p-0">
        {/* Header row */}
        <div className="flex items-center gap-3 p-4">
          <div {...(dragHandleProps || {})} className="cursor-grab text-slate-300 hover:text-slate-500 flex-shrink-0">
            <GripVertical className="w-5 h-5" />
          </div>
          <div className="flex-shrink-0 w-7 h-7 rounded-full bg-violet-100 text-violet-700 text-xs font-bold flex items-center justify-center">
            {index}
          </div>

          {item.image_url && (
            <img src={item.image_url} alt={item.title} className="w-16 h-16 object-cover rounded-lg flex-shrink-0" loading="lazy" />
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <h3 className="font-bold text-slate-900 text-sm line-clamp-1">{item.title}</h3>
                <div className="flex flex-wrap gap-1 mt-1">
                  {item.brand && <Badge variant="outline" className="text-xs">{item.brand}</Badge>}
                  {item.category && <Badge variant="secondary" className="text-xs">{item.category}</Badge>}
                  {item.era && <Badge className="bg-amber-100 text-amber-800 text-xs">{item.era}</Badge>}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {item.average_market_value && (
                  <span className="text-green-700 font-bold text-sm">${item.average_market_value?.toFixed(0)}</span>
                )}
                <Badge className={`text-xs ${BUY_COLORS[item.ai_buy_or_pass_recommendation] || BUY_COLORS.watch}`}>
                  {(item.ai_buy_or_pass_recommendation || 'watch').replace('_', ' ').toUpperCase()}
                </Badge>
                <div className="w-10 h-10 rounded-full border-2 border-violet-300 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-black text-violet-700">{Math.round(item.total_video_score)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <Button variant="ghost" size="icon" onClick={() => setExpanded(!expanded)} className="h-8 w-8">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onRemove(item.id)} className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Expanded details */}
        {expanded && (
          <div className="border-t border-slate-100 p-4 space-y-4">
            {/* Scores */}
            <div>
              <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2 flex items-center gap-1"><Star className="w-3 h-3" /> Score Breakdown</h4>
              <div className="space-y-1.5">
                <ScoreBar label="Uniqueness" value={item.uniqueness_score} />
                <ScoreBar label="Value" value={item.value_score} />
                <ScoreBar label="Visual Appeal" value={item.visual_score} />
                <ScoreBar label="Collector Interest" value={item.collector_interest_score} />
                <ScoreBar label="Research Depth" value={item.research_depth_score} />
                <ScoreBar label="Keyword/SEO" value={item.keyword_score} />
                <ScoreBar label="Resale Potential" value={item.resale_score} />
              </div>
            </div>

            {/* Value data */}
            {(item.value_low || item.value_high) && (
              <div>
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2 flex items-center gap-1"><DollarSign className="w-3 h-3" /> Value Data</h4>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-slate-50 rounded-lg p-2">
                    <div className="font-bold text-slate-700">{item.value_low ? '$' + item.value_low : '—'}</div>
                    <div className="text-slate-400">Low</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-2">
                    <div className="font-bold text-green-700">{item.average_market_value ? '$' + item.average_market_value : '—'}</div>
                    <div className="text-green-500">Avg</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-2">
                    <div className="font-bold text-blue-700">{item.value_high ? '$' + item.value_high : '—'}</div>
                    <div className="text-blue-400">High</div>
                  </div>
                </div>
              </div>
            )}

            {/* AI Research */}
            {item.ai_research_summary && (
              <div>
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1 flex items-center gap-1"><BookOpen className="w-3 h-3" /> Research Summary</h4>
                <p className="text-sm text-slate-700 leading-relaxed">{item.ai_research_summary}</p>
              </div>
            )}

            {item.ai_value_summary && (
              <div>
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Value Summary</h4>
                <p className="text-sm text-slate-700">{item.ai_value_summary}</p>
              </div>
            )}

            {/* Video Segment Script */}
            {item.ai_video_segment_script && (
              <div>
                <h4 className="text-xs font-bold text-violet-600 uppercase tracking-wide mb-1 flex items-center gap-1"><Eye className="w-3 h-3" /> Video Segment Script</h4>
                <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 text-sm text-slate-700 italic leading-relaxed">
                  {item.ai_video_segment_script}
                </div>
              </div>
            )}

            {/* SERP Sources */}
            {item.serpapi_sources?.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2 flex items-center gap-1"><Award className="w-3 h-3" /> Market Sources</h4>
                <div className="space-y-1">
                  {item.serpapi_sources.slice(0, 4).map((s, i) => (
                    <div key={i} className="flex items-center justify-between text-xs bg-slate-50 rounded px-2 py-1">
                      <span className="text-slate-700 truncate flex-1">{s.title}</span>
                      <span className="text-green-600 font-semibold ml-2 flex-shrink-0">{s.price}</span>
                      <span className="text-slate-400 ml-2 flex-shrink-0">{s.source}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Admin notes */}
            <div>
              <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">Admin Notes</h4>
              <Textarea
                placeholder="Internal notes about this item..."
                value={item.admin_notes || ''}
                onChange={e => onNotesChange(item.id, e.target.value)}
                className="text-xs h-16 resize-none"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
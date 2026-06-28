import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, RefreshCw, Sparkles, ExternalLink, AlertTriangle, CheckCircle2, X, Image as ImageIcon, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function AdminBlogSelector() {
  const [suggestions, setSuggestions] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState('all');
  const [result, setResult] = useState(null);
  const [preview, setPreview] = useState(null);

  const loadSuggestions = async () => {
    setLoading(true);
    try {
      const all = await base44.entities.BlogTopicSuggestion.list('-created_date', 200);
      setSuggestions(all);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => { loadSuggestions(); }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke('suggestBlogTopics', {});
      setResult(res.data);
      await loadSuggestions();
    } catch (err) {
      setResult({ error: err.message });
    }
    setGenerating(false);
  };

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const filtered = getFilteredSuggestions();
    const allIds = new Set(filtered.map(s => s.id));
    if (filtered.every(s => selected.has(s.id))) {
      setSelected(new Set());
    } else {
      setSelected(allIds);
    }
  };

  const handleCreate = async () => {
    if (!selected.size) return;
    setCreating(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke('approveSelectedBlogTopics', {
        suggestion_ids: [...selected],
      });
      setResult(res.data);
      setSelected(new Set());
      await loadSuggestions();
    } catch (err) {
      setResult({ error: err.message });
    }
    setCreating(false);
  };

  const getFilteredSuggestions = () => {
    let filtered = suggestions;
    if (filter === 'pending') filtered = filtered.filter(s => s.status === 'pending');
    if (filter === 'created') filtered = filtered.filter(s => s.status === 'created');
    if (filter === 'dismissed') filtered = filtered.filter(s => s.status === 'dismissed');
    if (filter === 'duplicates') filtered = filtered.filter(s => s.duplicate_of_title);
    if (filter === 'unique') filtered = filtered.filter(s => !s.duplicate_of_title);
    if (filter === 'high_confidence') filtered = filtered.filter(s => s.confidence_score >= 80);
    if (filter === 'elite') filtered = filtered.filter(s => s.subscription_tier === 'premium' || s.subscription_tier === 'enterprise');
    return filtered;
  };

  const filtered = getFilteredSuggestions();
  const pendingCount = suggestions.filter(s => s.status === 'pending').length;
  const createdCount = suggestions.filter(s => s.status === 'created').length;
  const dupCount = suggestions.filter(s => s.duplicate_of_title).length;
  const eliteCount = suggestions.filter(s => s.subscription_tier === 'premium' || s.subscription_tier === 'enterprise').length;

  const batches = [...new Set(suggestions.map(s => s.batch_id).filter(Boolean))];

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Blog Topic Selector</h1>
          <p className="text-sm text-slate-500 mt-1">
            Review AI-suggested blog topics, dismiss duplicates, and approve posts for creation
          </p>
        </div>
        <Button
          onClick={handleGenerate}
          disabled={generating}
          className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white w-full sm:w-auto"
        >
          {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
          {generating ? 'Generating...' : 'Run Topic Discovery'}
        </Button>
      </div>

      {/* Stats bar */}
      <div className="flex gap-4 mb-4 flex-wrap">
        <Card className="flex-1 min-w-[120px]">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-slate-700">{suggestions.length}</div>
            <div className="text-xs text-slate-500">Total</div>
          </CardContent>
        </Card>
        <Card className="flex-1 min-w-[120px]">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-orange-600">{pendingCount}</div>
            <div className="text-xs text-slate-500">Pending</div>
          </CardContent>
        </Card>
        <Card className="flex-1 min-w-[120px]">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-green-600">{createdCount}</div>
            <div className="text-xs text-slate-500">Created</div>
          </CardContent>
        </Card>
        <Card className="flex-1 min-w-[120px]">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-amber-600">{dupCount}</div>
            <div className="text-xs text-slate-500">Duplicates</div>
          </CardContent>
        </Card>
        <Card className="flex-1 min-w-[120px]">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-purple-600">{eliteCount}</div>
            <div className="text-xs text-slate-500">Elite</div>
          </CardContent>
        </Card>
        <Card className="flex-1 min-w-[120px]">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-blue-600">{batches.length}</div>
            <div className="text-xs text-slate-500">Batches</div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Suggestions</SelectItem>
            <SelectItem value="pending">Pending Only</SelectItem>
            <SelectItem value="created">Created Only</SelectItem>
            <SelectItem value="dismissed">Dismissed</SelectItem>
            <SelectItem value="duplicates">Potential Duplicates</SelectItem>
            <SelectItem value="unique">Unique Only</SelectItem>
            <SelectItem value="high_confidence">High Confidence (80+)</SelectItem>
            <SelectItem value="elite">Elite Tier Only</SelectItem>
          </SelectContent>
        </Select>

        {filtered.length > 0 && (
          <Button variant="outline" size="sm" onClick={toggleSelectAll}>
            {filtered.every(s => selected.has(s.id)) ? 'Deselect All' : 'Select All Visible'}
          </Button>
        )}

        <Button
          onClick={handleCreate}
          disabled={!selected.size || creating}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
          {creating ? 'Creating...' : `Create ${selected.size} Selected`}
        </Button>
      </div>

      {/* Result message */}
      {result && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${result.error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {result.error ? result.error : result.message || 'Operation complete'}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Sparkles className="w-8 h-8 mx-auto mb-2" />
          <p>No blog topic suggestions yet</p>
          <p className="text-sm">Click "Run Topic Discovery" to generate suggestions</p>
        </div>
      ) : (
        <div className="overflow-x-auto border rounded-xl">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="p-3 text-left w-10">
                  <Checkbox
                    checked={filtered.length > 0 && filtered.every(s => selected.has(s.id))}
                    onCheckedChange={toggleSelectAll}
                  />
                </th>
                <th className="p-3 text-left font-medium text-slate-600">Title</th>
                <th className="p-3 text-left font-medium text-slate-600 hidden md:table-cell">Company</th>
                <th className="p-3 text-center font-medium text-slate-600 hidden lg:table-cell w-20">Tier</th>
                <th className="p-3 text-left font-medium text-slate-600 hidden lg:table-cell">Keyword</th>
                <th className="p-3 text-center font-medium text-slate-600 w-20">Score</th>
                <th className="p-3 text-left font-medium text-slate-600 hidden xl:table-cell">Duplicate</th>
                <th className="p-3 text-center font-medium text-slate-600 w-24">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => {
                const isDup = !!s.duplicate_of_title;
                const isCreated = s.status === 'created';
                const isDismissed = s.status === 'dismissed';
                const isDisabled = isCreated || isDismissed;

                return (
                  <tr key={s.id} className={`border-b hover:bg-slate-50 ${isDisabled ? 'opacity-50' : ''}`}>
                    <td className="p-3">
                      {!isDisabled && (
                        <Checkbox
                          checked={selected.has(s.id)}
                          onCheckedChange={() => toggleSelect(s.id)}
                        />
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex items-start gap-2">
                        {s.image_url && (
                          <img src={s.image_url} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0 hidden sm:block" />
                        )}
                        <div className="flex-1 min-w-0">
                          <button
                            onClick={() => setPreview(s)}
                            className={`font-medium text-left hover:text-orange-600 transition-colors ${isDup ? 'text-amber-700' : 'text-slate-800'}`}
                          >
                            {s.title}
                          </button>
                          <div className="text-xs text-slate-400 mt-0.5">{s.angle}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-slate-600 hidden md:table-cell">
                      <div>{s.company_name}</div>
                      <div className="text-xs text-slate-400">{s.company_city}{s.company_state ? ', ' + s.company_state : ''}</div>
                    </td>
                    <td className="p-3 text-center hidden lg:table-cell">
                      {s.subscription_tier === 'enterprise' ? (
                        <Badge className="bg-purple-100 text-purple-700 text-xs font-semibold">Elite</Badge>
                      ) : s.subscription_tier === 'premium' ? (
                        <Badge className="bg-purple-100 text-purple-700 text-xs font-semibold">Elite</Badge>
                      ) : s.subscription_tier === 'pro' ? (
                        <Badge className="bg-blue-100 text-blue-700 text-xs">Pro</Badge>
                      ) : s.subscription_tier === 'basic' ? (
                        <Badge className="bg-slate-100 text-slate-600 text-xs">Starter</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-slate-400">—</Badge>
                      )}
                    </td>
                    <td className="p-3 hidden lg:table-cell">
                      <Badge variant="outline" className="text-xs">{s.target_keyword}</Badge>
                    </td>
                    <td className="p-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        s.confidence_score >= 80 ? 'bg-green-100 text-green-700' :
                        s.confidence_score >= 60 ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {s.confidence_score}
                      </span>
                    </td>
                    <td className="p-3 hidden xl:table-cell">
                      {isDup ? (
                        <div className="flex items-start gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <div className="text-xs text-amber-700">{s.duplicate_similarity_pct}% match</div>
                            <div className="text-xs text-slate-400 truncate max-w-[180px]">{s.duplicate_of_title}</div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-green-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Unique
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {isCreated ? (
                        <Badge className="bg-green-100 text-green-700 text-xs">Created</Badge>
                      ) : isDismissed ? (
                        <Badge className="bg-slate-100 text-slate-500 text-xs">Dismissed</Badge>
                      ) : (
                        <Badge className="bg-orange-100 text-orange-700 text-xs">Pending</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        )}

        {/* Preview Dialog */}
        <Dialog open={!!preview} onOpenChange={() => setPreview(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {preview && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg">{preview.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                {preview.image_url && (
                  <img src={preview.image_url} alt="" className="w-full max-h-64 rounded-lg object-cover" />
                )}
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="font-medium text-slate-500">Company</span>
                    <p>{preview.company_name}</p>
                    <p className="text-xs text-slate-400">{preview.company_city}{preview.company_state ? ', ' + preview.company_state : ''}</p>
                  </div>
                  <div>
                    <span className="font-medium text-slate-500">Target Keyword</span>
                    <p><Badge variant="outline" className="text-xs">{preview.target_keyword}</Badge></p>
                  </div>
                  <div>
                    <span className="font-medium text-slate-500">Confidence Score</span>
                    <p className="font-bold">{preview.confidence_score}/100</p>
                  </div>
                  <div>
                    <span className="font-medium text-slate-500">Subscription Tier</span>
                    <p className="capitalize">{preview.subscription_tier || 'standard'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-slate-500">Word Count Target</span>
                    <p>{preview.word_count_target || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-slate-500">Slug</span>
                    <p className="text-xs text-slate-400 truncate">{preview.slug}</p>
                  </div>
                </div>

                <div>
                  <span className="font-medium text-slate-500">Editorial Angle</span>
                  <p className="text-slate-700 mt-0.5">{preview.angle}</p>
                </div>

                <div>
                  <span className="font-medium text-slate-500">SEO Reasoning</span>
                  <p className="text-slate-700 mt-0.5">{preview.reasoning}</p>
                </div>

                {preview.related_brands?.length > 0 && (
                  <div>
                    <span className="font-medium text-slate-500">Related Brands</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {preview.related_brands.map(b => (
                        <Badge key={b} variant="secondary" className="text-xs">{b}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {preview.related_categories?.length > 0 && (
                  <div>
                    <span className="font-medium text-slate-500">Related Categories</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {preview.related_categories.map(c => (
                        <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {preview.duplicate_of_title && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <span className="font-medium text-amber-700 flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" /> Potential Duplicate ({preview.duplicate_similarity_pct}% match)
                    </span>
                    <p className="text-amber-600 mt-1">{preview.duplicate_of_title}</p>
                  </div>
                )}

                {preview.company_profile_url && (
                  <a
                    href={preview.company_profile_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-orange-600 hover:text-orange-700 text-sm"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> View Company Profile
                  </a>
                )}
              </div>
            </>
          )}
        </DialogContent>
        </Dialog>

        </div>
        );
        }
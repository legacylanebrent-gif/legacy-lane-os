import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, TrendingUp, Target, Zap } from 'lucide-react';

export default function SEOBoostDashboard() {
  const [boosts, setBoosts] = useState([]);
  const [items, setItems] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const boostData = await base44.entities.SEOBoost.filter({ status: 'active' }, '-created_date', 100);
      setBoosts(boostData || []);

      // Load item titles
      const itemMap = {};
      for (const boost of boostData) {
        if (boost.item_id && !itemMap[boost.item_id]) {
          const item = await base44.entities.Item.filter({ id: boost.item_id });
          if (item.length > 0) itemMap[boost.item_id] = item[0].title;
        }
      }
      setItems(itemMap);
    } catch (error) {
      console.error('Error loading boosts:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredBoosts = boosts.filter(b =>
    items[b.item_id]?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.primary_keyword?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.keywords?.some(k => k.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const stats = {
    totalBoosts: boosts.length,
    avgSEOScore: boosts.length > 0 ? Math.round(boosts.reduce((sum, b) => sum + (b.seo_score || 0), 0) / boosts.length) : 0,
    totalReach: boosts.reduce((sum, b) => sum + (b.estimated_organic_reach || 0), 0),
    highScoring: boosts.filter(b => b.seo_score >= 75).length
  };

  if (loading) return <div className="p-8 text-center">Loading SEO data...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Zap className="w-8 h-8 text-yellow-500" />
          SEO Boost Dashboard
        </h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-600">Total Boosts</div>
            <div className="text-3xl font-bold">{stats.totalBoosts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-600">Avg SEO Score</div>
            <div className="text-3xl font-bold text-green-600">{stats.avgSEOScore}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-600">Est. Monthly Reach</div>
            <div className="text-3xl font-bold text-blue-600">{(stats.totalReach / 1000).toFixed(1)}K</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-slate-600">High Scoring</div>
            <div className="text-3xl font-bold text-purple-600">{stats.highScoring}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
        <Input
          placeholder="Search boosts by title, keyword..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Boosts List */}
      <Card>
        <CardHeader>
          <CardTitle>SEO Optimized Items ({filteredBoosts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredBoosts.length === 0 ? (
            <p className="text-slate-600 text-center py-8">No SEO boosts found</p>
          ) : (
            <div className="space-y-4">
              {filteredBoosts.map(boost => (
                <div key={boost.id} className="border rounded-lg p-4 hover:bg-slate-50 transition">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900">{items[boost.item_id] || 'Item'}</h3>
                      <p className="text-sm text-slate-600 mt-1">
                        <Target className="w-4 h-4 inline mr-1" />
                        Primary: <span className="font-medium">{boost.primary_keyword}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">{boost.seo_score}</div>
                      <div className="text-xs text-slate-600">SEO Score</div>
                    </div>
                  </div>

                  {/* Keywords */}
                  <div className="mb-3 flex flex-wrap gap-2">
                    {boost.secondary_keywords?.slice(0, 3).map((kw, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {kw}
                      </Badge>
                    ))}
                  </div>

                  {/* Meta Info */}
                  <div className="grid grid-cols-3 gap-4 pt-3 border-t text-xs text-slate-600">
                    <div>
                      <div className="font-semibold">Meta Description</div>
                      <p className="text-xs line-clamp-2">{boost.meta_description}</p>
                    </div>
                    <div>
                      <div className="font-semibold flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        Est. Reach
                      </div>
                      <p className="text-sm font-bold">{boost.estimated_organic_reach?.toLocaleString() || 0} visits/mo</p>
                    </div>
                    <div>
                      <div className="font-semibold">Competition</div>
                      <p className="text-sm">{boost.category_insights?.competition || 'Medium'}</p>
                    </div>
                  </div>

                  {/* Suggested Title */}
                  {boost.suggested_title && (
                    <div className="mt-3 p-2 bg-blue-50 rounded text-sm">
                      <div className="text-xs font-semibold text-blue-700 mb-1">Suggested Title</div>
                      <p className="text-blue-900">{boost.suggested_title}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
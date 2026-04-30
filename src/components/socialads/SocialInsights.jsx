import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { TrendingUp, Eye, Heart, Share2, MessageCircle, RefreshCw, Loader2, BarChart3, Globe } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';

const PLATFORM_COLORS = {
  facebook: '#1877F2',
  instagram: '#E1306C',
  tiktok: '#010101',
  youtube: '#FF0000',
  pinterest: '#E60023',
  linkedin: '#0A66C2',
  twitter: '#1DA1F2',
  facebook_ads: '#1d4ed8',
};

const COLORS = ['#1877F2', '#E1306C', '#010101', '#FF0000', '#E60023', '#0A66C2', '#1DA1F2'];

const MOCK_POSTS = [
  { id: 1, platform: 'facebook', content: 'Big estate sale this Saturday in Scottsdale! Furniture, jewelry, antiques and more.', date: '2026-04-28', likes: 124, comments: 31, shares: 48, reach: 3200, clicks: 89 },
  { id: 2, platform: 'instagram', content: 'Check out this stunning Victorian dresser found at today\'s estate sale 🪞✨', date: '2026-04-27', likes: 312, comments: 54, shares: 22, reach: 5800, clicks: 134 },
  { id: 3, platform: 'facebook', content: 'New listing alert: 4-bedroom home with full estate contents available. Call now!', date: '2026-04-26', likes: 67, comments: 18, shares: 29, reach: 1900, clicks: 52 },
  { id: 4, platform: 'tiktok', content: 'Watch us price this rare coin collection using AI 🪙🤖', date: '2026-04-25', likes: 890, comments: 112, shares: 203, reach: 18400, clicks: 441 },
  { id: 5, platform: 'instagram', content: 'Before and after staging! This living room is now sale-ready ✅', date: '2026-04-24', likes: 543, comments: 78, shares: 61, reach: 9200, clicks: 198 },
  { id: 6, platform: 'linkedin', content: 'Legacy Lane OS helps estate sale operators go digital. Join 300+ operators nationwide.', date: '2026-04-23', likes: 89, comments: 23, shares: 41, reach: 2100, clicks: 76 },
];

const MOCK_TREND = [
  { date: 'Apr 22', reach: 4200, engagement: 180, clicks: 62 },
  { date: 'Apr 23', reach: 5100, engagement: 213, clicks: 88 },
  { date: 'Apr 24', reach: 9200, engagement: 682, clicks: 198 },
  { date: 'Apr 25', reach: 18400, engagement: 1205, clicks: 441 },
  { date: 'Apr 26', reach: 1900, engagement: 114, clicks: 52 },
  { date: 'Apr 27', reach: 5800, engagement: 388, clicks: 134 },
  { date: 'Apr 28', reach: 3200, engagement: 203, clicks: 89 },
];

export default function SocialInsights({ user }) {
  const [platform, setPlatform] = useState('all');
  const [loading, setLoading] = useState(false);
  const [posts] = useState(MOCK_POSTS);

  const connectedPlatforms = Object.keys(user?.social_media_credentials || {}).filter(k => {
    const creds = user.social_media_credentials[k];
    return creds && Object.values(creds).some(v => v);
  });

  const filteredPosts = platform === 'all' ? posts : posts.filter(p => p.platform === platform);

  const totalReach = filteredPosts.reduce((s, p) => s + p.reach, 0);
  const totalEngagement = filteredPosts.reduce((s, p) => s + p.likes + p.comments + p.shares, 0);
  const totalClicks = filteredPosts.reduce((s, p) => s + p.clicks, 0);
  const avgEngRate = filteredPosts.length > 0 ? ((totalEngagement / totalReach) * 100).toFixed(2) : 0;

  const byPlatformData = connectedPlatforms.map(p => ({
    name: p.charAt(0).toUpperCase() + p.slice(1),
    posts: posts.filter(post => post.platform === p).length,
    reach: posts.filter(post => post.platform === p).reduce((s, post) => s + post.reach, 0),
  })).filter(p => p.name !== 'Facebook_ads');

  return (
    <div className="space-y-6">
      {/* Connected platforms badge strip */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-sm text-slate-500 font-medium">Connected Platforms:</span>
        {connectedPlatforms.length === 0 ? (
          <span className="text-sm text-slate-400">No social platforms connected yet. Add them in My Profile → Social Media.</span>
        ) : connectedPlatforms.map(p => (
          <Badge key={p} style={{ backgroundColor: PLATFORM_COLORS[p] + '20', color: PLATFORM_COLORS[p], borderColor: PLATFORM_COLORS[p] + '40' }}
            className="border text-xs px-2 py-0.5 capitalize"
          >
            {p === 'facebook_ads' ? 'Facebook Ads' : p}
          </Badge>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Reach', value: totalReach.toLocaleString(), icon: Eye, color: 'text-blue-700 bg-blue-50' },
          { label: 'Engagements', value: totalEngagement.toLocaleString(), icon: Heart, color: 'text-pink-700 bg-pink-50' },
          { label: 'Link Clicks', value: totalClicks.toLocaleString(), icon: Globe, color: 'text-orange-700 bg-orange-50' },
          { label: 'Avg Eng. Rate', value: `${avgEngRate}%`, icon: TrendingUp, color: 'text-green-700 bg-green-50' },
        ].map(k => (
          <Card key={k.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${k.color}`}>
                <k.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500">{k.label}</p>
                <p className="text-xl font-bold text-slate-900">{k.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="trend">
        <TabsList>
          <TabsTrigger value="trend">Trend</TabsTrigger>
          <TabsTrigger value="by_platform">By Platform</TabsTrigger>
          <TabsTrigger value="posts">Recent Posts</TabsTrigger>
        </TabsList>

        <TabsContent value="trend" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-blue-700" /> 7-Day Reach & Engagement Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={MOCK_TREND}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="reach" stroke="#1877F2" strokeWidth={2} name="Reach" dot={false} />
                  <Line type="monotone" dataKey="engagement" stroke="#E1306C" strokeWidth={2} name="Engagements" dot={false} />
                  <Line type="monotone" dataKey="clicks" stroke="#f97316" strokeWidth={2} name="Clicks" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="by_platform" className="mt-4">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Reach by Platform</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={byPlatformData} dataKey="reach" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {byPlatformData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Posts by Platform</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={byPlatformData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="posts" fill="#1877F2" name="Posts" radius={[4, 4, 0, 0]}>
                      {byPlatformData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="posts" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Recent Posts Performance</span>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Platforms</SelectItem>
                    {connectedPlatforms.filter(p => p !== 'facebook_ads').map(p => (
                      <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredPosts.map(post => (
                  <div key={post.id} className="border border-slate-200 rounded-xl p-4 hover:shadow-sm transition-all">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge style={{ backgroundColor: PLATFORM_COLORS[post.platform] + '20', color: PLATFORM_COLORS[post.platform] }} className="border text-xs capitalize">
                            {post.platform}
                          </Badge>
                          <span className="text-xs text-slate-400">{post.date}</span>
                        </div>
                        <p className="text-sm text-slate-700 line-clamp-2">{post.content}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-5 gap-2 text-center">
                      {[
                        { icon: Eye, label: 'Reach', value: post.reach.toLocaleString() },
                        { icon: Heart, label: 'Likes', value: post.likes },
                        { icon: MessageCircle, label: 'Comments', value: post.comments },
                        { icon: Share2, label: 'Shares', value: post.shares },
                        { icon: Globe, label: 'Clicks', value: post.clicks },
                      ].map(m => (
                        <div key={m.label} className="bg-slate-50 rounded-lg p-2">
                          <m.icon className="w-3.5 h-3.5 mx-auto mb-1 text-slate-500" />
                          <p className="text-xs font-bold text-slate-900">{m.value}</p>
                          <p className="text-xs text-slate-400">{m.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
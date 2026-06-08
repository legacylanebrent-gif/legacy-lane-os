import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Heart, Search, DollarSign, MapPin, Package, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import UniversalHeader from '@/components/layout/UniversalHeader';
import SharedFooter from '@/components/layout/SharedFooter';
import SEOHead from '@/components/seo/SEOHead';
import SEOBreadcrumb from '@/components/seo/SEOBreadcrumb';

export default function WantedItemsPage() {
  const [items, setItems] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.isAuthenticated().then(authed => {
      if (authed) base44.auth.me().then(setUser).catch(() => {});
    });
    base44.entities.WantedItem.filter({ status: 'active', public_visibility: true }, '-created_date', 100)
      .then(data => { setItems(data); setFiltered(data); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!search.trim()) { setFiltered(items); return; }
    const q = search.toLowerCase();
    setFiltered(items.filter(i =>
      i.title?.toLowerCase().includes(q) ||
      i.brand?.toLowerCase().includes(q) ||
      i.category?.toLowerCase().includes(q)
    ));
  }, [search, items]);

  const canonical = 'https://estatesalen.com/wanted';
  const crumbs = [{ label: 'Home', href: '/' }, { label: 'Wanted Items' }];
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Wanted Estate Sale Items — Buyer Demand Board | EstateSalen',
    description: 'Browse what buyers are looking for at estate sales. List your own wanted items.',
    url: canonical,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-orange-50 to-cyan-50">
      <SEOHead
        title="Wanted Estate Sale Items — Buyer Demand Board | EstateSalen"
        description="See what buyers are searching for at estate sales nationwide. Post your own wanted listing for free."
        canonical={canonical}
        jsonLd={jsonLd}
      />
      <UniversalHeader user={user} isAuthenticated={!!user} />

      <div className="max-w-5xl mx-auto px-4 py-12">
        <SEOBreadcrumb crumbs={crumbs} />
        <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <Heart className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h1 className="text-3xl font-serif font-bold text-slate-900">Wanted Items</h1>
              <p className="text-slate-500">What buyers are looking for at estate sales</p>
            </div>
          </div>
          {user && (
            <Link to="/Dashboard">
              <Button className="bg-orange-600 hover:bg-orange-700 gap-2">
                <Plus className="w-4 h-4" /> Post Wanted Listing
              </Button>
            </Link>
          )}
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input placeholder="Search wanted items..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => <div key={i} className="h-40 bg-slate-200 rounded-2xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">No wanted listings found.</div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {filtered.map(item => (
              <Card key={item.id} className="hover:shadow-lg transition-shadow border-2 border-transparent hover:border-red-200">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900 mb-1 line-clamp-2">{item.title}</h3>
                      {item.description && <p className="text-sm text-slate-600 line-clamp-2 mb-2">{item.description}</p>}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {item.brand && <Badge variant="outline" className="text-xs">{item.brand}</Badge>}
                        {item.category && <Badge variant="secondary" className="text-xs">{item.category}</Badge>}
                        {item.condition && item.condition !== 'any' && <Badge className="bg-slate-100 text-slate-600 text-xs capitalize">{item.condition.replace(/_/g, ' ')}</Badge>}
                      </div>
                    </div>
                    {item.image_url && (
                      <img src={item.image_url} alt={item.title} className="w-20 h-20 object-cover rounded-lg flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-3 text-sm text-slate-500">
                    {(item.budget_min || item.budget_max) && (
                      <span className="flex items-center gap-1 text-green-600 font-medium">
                        <DollarSign className="w-3 h-3" />
                        {item.budget_min && item.budget_max ? `$${item.budget_min}–$${item.budget_max}` : item.budget_max ? `Up to $${item.budget_max}` : `$${item.budget_min}+`}
                      </span>
                    )}
                    {item.distance && (
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{item.distance} mi radius</span>
                    )}
                    {item.shipping_ok && <Badge className="bg-blue-100 text-blue-700 text-xs">Ships OK</Badge>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <SharedFooter />
    </div>
  );
}
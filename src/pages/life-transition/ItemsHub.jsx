import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import SharedFooter from '@/components/layout/SharedFooter';
import UniversalHeader from '@/components/layout/UniversalHeader';
import SEBreadcrumb from '@/components/seo-engine/SEBreadcrumb';
import { Search } from 'lucide-react';

export default function ItemsHub() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    base44.entities.ItemKnowledgeBase.filter({ status: 'published' }, '-created_date', 100).then(setItems);
  }, []);

  const filtered = items.filter(i =>
    i.item_name?.toLowerCase().includes(search.toLowerCase()) ||
    i.category?.toLowerCase().includes(search.toLowerCase()) ||
    i.brand?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-white">
      <UniversalHeader />
      <SEBreadcrumb crumbs={[{ label: 'Item Value Guides' }]} />

      <section className="bg-gradient-to-br from-slate-900 to-slate-800 py-12 px-4 text-center">
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white mb-3">Estate Sale Item Value & Identification Guides</h1>
        <p className="text-slate-300 max-w-2xl mx-auto">Free guides on identifying, valuing, and selling common estate sale items — furniture, collectibles, jewelry, art, and more.</p>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="relative max-w-md mx-auto mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <Input className="pl-9" placeholder="Search items, brands, categories..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {filtered.length > 0 ? (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
            {filtered.map(item => (
              <Link key={item.id} to={`/items/${item.item_slug}`}>
                <Card className="hover:shadow-md transition-shadow h-full">
                  <CardContent className="p-5">
                    <Badge className="mb-2 text-xs bg-slate-100 text-slate-600">{item.category}</Badge>
                    <h3 className="font-semibold text-slate-900 mb-1">{item.item_name}</h3>
                    {item.brand && <p className="text-xs text-slate-500 mb-2">{item.brand} {item.era ? `· ${item.era}` : ''}</p>}
                    {item.value_guide && <p className="text-xs text-slate-600 line-clamp-2">{item.value_guide}</p>}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-slate-500">
            <p className="text-lg font-semibold mb-2">Item guides coming soon</p>
            <p className="text-sm">We're building out our item knowledge base. Check back soon for detailed guides on antiques, collectibles, furniture, and more.</p>
          </div>
        )}
      </div>
      <SharedFooter />
    </div>
  );
}
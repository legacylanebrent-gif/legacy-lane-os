import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { BookOpen, Loader2, GraduationCap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const CATEGORIES = [
  { value: 'all', label: 'All Training' },
  { value: 'for_operators', label: 'Business & Operations' },
  { value: 'estate_sale_process', label: 'Estate Sale Process' },
  { value: 'pricing_and_value', label: 'Pricing & Value' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'cleanout_and_donations', label: 'Cleanout & Donations' },
  { value: 'probate_101', label: 'Probate 101' },
  { value: 'legal_and_tax', label: 'Legal & Tax' },
  { value: 'for_buyers', label: 'For Buyers' },
  { value: 'general', label: 'General' },
];

const CATEGORY_COLORS = {
  for_operators: 'bg-blue-100 text-blue-700',
  estate_sale_process: 'bg-purple-100 text-purple-700',
  pricing_and_value: 'bg-green-100 text-green-700',
  marketing: 'bg-orange-100 text-orange-700',
  cleanout_and_donations: 'bg-teal-100 text-teal-700',
  probate_101: 'bg-indigo-100 text-indigo-700',
  legal_and_tax: 'bg-red-100 text-red-700',
  for_buyers: 'bg-pink-100 text-pink-700',
  general: 'bg-slate-100 text-slate-700',
};

function getCategoryLabel(cat) {
  const found = CATEGORIES.find(c => c.value === cat);
  return found ? found.label : cat;
}

export default function TrainingBlog() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    base44.entities.EstateSaleUniversityArticle.filter({ status: 'published' }, '-created_date', 200)
      .then(setArticles)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = activeCategory === 'all'
    ? articles
    : articles.filter(a => a.category === activeCategory);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
          <GraduationCap className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-3xl font-serif font-bold text-slate-900">Training Blog</h1>
          <p className="text-slate-500">Marketing and business training resources for estate sale professionals</p>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {CATEGORIES.map(cat => (
          <button
            key={cat.value}
            onClick={() => setActiveCategory(cat.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeCategory === cat.value
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No training articles in this category yet.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(article => (
            <Link key={article.id} to={`/training/${article.slug}`}>
              <Card className="h-full hover:shadow-xl transition-shadow cursor-pointer group overflow-hidden flex flex-col">
                <CardContent className="p-5 flex flex-col h-full">
                  <Badge className={`self-start mb-3 ${CATEGORY_COLORS[article.category] || CATEGORY_COLORS.general}`}>
                    {getCategoryLabel(article.category)}
                  </Badge>
                  <h2 className="font-serif font-bold text-slate-900 text-lg mb-2 line-clamp-3 group-hover:text-blue-600 transition-colors">
                    {article.title}
                  </h2>
                  {article.seo_description && (
                    <p className="text-sm text-slate-600 line-clamp-3 flex-1 mb-3">{article.seo_description}</p>
                  )}
                  <span className="text-sm text-blue-600 font-semibold mt-auto flex items-center gap-1">
                    Read Article →
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
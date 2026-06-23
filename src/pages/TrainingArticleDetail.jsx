import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Loader2, ArrowLeft, GraduationCap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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

const CATEGORY_LABELS = {
  for_operators: 'Business & Operations',
  estate_sale_process: 'Estate Sale Process',
  pricing_and_value: 'Pricing & Value',
  marketing: 'Marketing',
  cleanout_and_donations: 'Cleanout & Donations',
  probate_101: 'Probate 101',
  legal_and_tax: 'Legal & Tax',
  for_buyers: 'For Buyers',
  general: 'General',
};

export default function TrainingArticleDetail() {
  const { slug } = useParams();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.EstateSaleUniversityArticle.filter({ slug, status: 'published' }, '-created_date', 1)
      .then(results => setArticle(results[0] || null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <GraduationCap className="w-12 h-12 mx-auto mb-4 text-slate-300" />
        <h1 className="text-2xl font-serif font-bold text-slate-900 mb-2">Article Not Found</h1>
        <p className="text-slate-500 mb-6">This training article may have been moved or is no longer available.</p>
        <Link to="/TrainingBlog" className="text-blue-600 font-semibold hover:underline">← Back to Training Blog</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link to="/TrainingBlog" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-6">
        <ArrowLeft className="w-4 h-4" /> All Training Articles
      </Link>

      <Badge className={`mb-4 ${CATEGORY_COLORS[article.category] || CATEGORY_COLORS.general}`}>
        {CATEGORY_LABELS[article.category] || article.category}
      </Badge>

      <h1 className="text-3xl sm:text-4xl font-serif font-bold text-slate-900 mb-3">{article.title}</h1>

      {article.seo_description && (
        <p className="text-lg text-slate-600 mb-8 pb-8 border-b border-slate-100">{article.seo_description}</p>
      )}

      <div className="prose prose-slate prose-lg max-w-none whitespace-pre-wrap text-slate-700">
        {article.article_content}
      </div>

      {article.faq_json && article.faq_json.length > 0 && (
        <div className="mt-12 pt-8 border-t border-slate-100">
          <h2 className="text-xl font-serif font-bold text-slate-900 mb-6">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {article.faq_json.map((faq, i) => (
              <div key={i}>
                <h3 className="font-semibold text-slate-800">{faq.question}</h3>
                <p className="text-slate-600 mt-2">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-12 pt-8 border-t border-slate-100 text-center">
        <Link to="/TrainingBlog" className="text-blue-600 font-semibold hover:underline">
          ← Back to all training articles
        </Link>
      </div>
    </div>
  );
}
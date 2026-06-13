import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2 } from 'lucide-react';

export default function CategorySuggestions({ category, onSelectSubcategory, onSelectEra }) {
  const [loading, setLoading] = useState(false);
  const [subcategories, setSubcategories] = useState([]);
  const [eras, setEras] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!category) {
      setSubcategories([]);
      setEras([]);
      setError(null);
      return;
    }

    let cancelled = false;
    const fetchSuggestions = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await base44.functions.invoke('suggestCategoryRefinements', { category });
        const data = res.data;
        if (!cancelled) {
          setSubcategories(data.subcategories || []);
          setEras(data.eras || []);
        }
      } catch (e) {
        if (!cancelled) {
          setError('Could not load suggestions');
          setSubcategories([]);
          setEras([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchSuggestions();
    return () => { cancelled = true; };
  }, [category]);

  if (!category) return null;
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
        <Loader2 className="w-3 h-3 animate-spin" />
        <Sparkles className="w-3 h-3" />
        Generating AI suggestions for "{category}"...
      </div>
    );
  }
  if (error) return null;

  return (
    <div className="space-y-2">
      {subcategories.length > 0 && (
        <div>
          <p className="text-xs text-slate-400 mb-1.5 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" /> Suggested subcategories:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {subcategories.map((sc, i) => (
              <Badge
                key={i}
                variant="outline"
                className="cursor-pointer hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700 transition-colors text-xs"
                onClick={() => onSelectSubcategory(sc)}
              >
                {sc}
              </Badge>
            ))}
          </div>
        </div>
      )}
      {eras.length > 0 && (
        <div>
          <p className="text-xs text-slate-400 mb-1.5 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-purple-500" /> Suggested eras:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {eras.map((er, i) => (
              <Badge
                key={i}
                variant="secondary"
                className="cursor-pointer hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 transition-colors text-xs"
                onClick={() => onSelectEra(er)}
              >
                {er}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Eye, FileText, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function BlogContentGenerator({ onRefresh }) {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('draft');
  const [preview, setPreview] = useState(null);

  const loadBlogs = async () => {
    setLoading(true);
    const all = await base44.entities.SEOPage.filter({ page_type: 'blog' }, '-created_date', 500);
    setBlogs(all);
    setLoading(false);
  };

  useEffect(() => { loadBlogs(); }, []);

  const filtered = blogs.filter(b => {
    if (filter === 'all') return true;
    return b.status === filter;
  });

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ({blogs.length})</SelectItem>
              <SelectItem value="draft">Drafts ({blogs.filter(b => b.status === 'draft').length})</SelectItem>
              <SelectItem value="published">Published ({blogs.filter(b => b.status === 'published').length})</SelectItem>
              <SelectItem value="archived">Archived ({blogs.filter(b => b.status === 'archived').length})</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-slate-500">{filtered.length} results</span>
        </div>
        <Button onClick={loadBlogs} variant="outline" size="sm">Refresh</Button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <FileText className="w-8 h-8 mx-auto mb-2" />
          <p>No blog posts found</p>
        </div>
      ) : (
        <div className="overflow-x-auto border rounded-xl">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="p-3 text-left font-medium text-slate-600">Title</th>
                <th className="p-3 text-left font-medium text-slate-600 hidden md:table-cell">Slug</th>
                <th className="p-3 text-center font-medium text-slate-600 w-20">Status</th>
                <th className="p-3 text-center font-medium text-slate-600 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(b => (
                <tr key={b.id} className="border-b hover:bg-slate-50">
                  <td className="p-3">
                    <div>
                      <div className="font-medium text-slate-800">{b.title}</div>
                      {b.meta_description && (
                        <div className="text-xs text-slate-400 truncate max-w-md mt-0.5">{b.meta_description}</div>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-slate-500 text-xs hidden md:table-cell">{b.slug}</td>
                  <td className="p-3 text-center">
                    <Badge className={
                      b.status === 'published' ? 'bg-green-100 text-green-700 text-xs' :
                      b.status === 'archived' ? 'bg-slate-100 text-slate-500 text-xs' :
                      'bg-orange-100 text-orange-700 text-xs'
                    }>
                      {b.status}
                    </Badge>
                  </td>
                  <td className="p-3 text-center">
                    <Button variant="ghost" size="sm" onClick={() => setPreview(b)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!preview} onOpenChange={() => setPreview(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          {preview && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">{preview.title}</DialogTitle>
                <p className="text-sm text-slate-500 mt-1">{preview.meta_description}</p>
                {preview.slug && (
                  <p className="text-xs text-slate-400 mt-1">Slug: {preview.slug}</p>
                )}
              </DialogHeader>

              <div className="space-y-4 mt-4">
                {preview.image_url && (
                  <img src={preview.image_url} alt="" className="w-full max-h-72 rounded-lg object-cover" />
                )}

                {preview.intro_content && (
                  <div className="bg-slate-50 rounded-lg p-4 border">
                    <span className="text-xs font-medium text-slate-500 uppercase">Intro</span>
                    <div className="prose prose-sm max-w-none mt-1">
                      {preview.intro_content}
                    </div>
                  </div>
                )}

                {preview.main_content && (
                  <div>
                    <span className="text-xs font-medium text-slate-500 uppercase">Content</span>
                    <div className="prose prose-sm max-w-none mt-1 bg-white border rounded-lg p-4">
                      <ReactMarkdown>{preview.main_content}</ReactMarkdown>
                    </div>
                  </div>
                )}

                {preview.faq_json?.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-slate-500 uppercase">FAQ ({preview.faq_json.length})</span>
                    <div className="space-y-2 mt-1">
                      {preview.faq_json.map((faq, i) => (
                        <div key={i} className="bg-slate-50 rounded-lg p-3 border">
                          <p className="font-medium text-sm">{faq.question}</p>
                          <p className="text-sm text-slate-600 mt-1">{faq.answer}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {preview.canonical_url && (
                  <a href={preview.canonical_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-orange-600 hover:text-orange-700 text-sm">
                    <ExternalLink className="w-3.5 h-3.5" /> View live page
                  </a>
                )}

                <div className="flex items-center gap-4 text-xs text-slate-400 pt-2 border-t">
                  <span>Status: <Badge className="ml-1 text-xs">{preview.status}</Badge></span>
                  {preview.published_at && <span>Published: {new Date(preview.published_at).toLocaleDateString()}</span>}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
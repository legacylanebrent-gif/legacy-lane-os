import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Wand2, Loader2, Sparkles, Check, X } from 'lucide-react';

export default function AIStoryAssistance({ title, storyContent, whereFound, onApplyAI }) {
  const [generating, setGenerating] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    if (!storyContent || storyContent.trim().length < 10) {
      setError('Please write at least a few sentences about your find first.');
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const prompt = `You are a professional blog writer for an estate sale community blog called "Cool Finds & Crazy Stories."
A user has submitted a rough draft of a story about something they found. Rewrite and enhance it into a compelling, well-structured blog post.

User's original title: "${title || '(none provided)'}"
Where found: "${whereFound || '(not specified)'}"
User's original story:
"""
${storyContent}
"""

Instructions:
- Write an engaging, polished blog post (300-600 words).
- Use a conversational, enthusiastic tone — like sharing a discovery with friends.
- Structure with short paragraphs. You may use a brief intro, the discovery story, and what makes it special.
- Do NOT invent facts that contradict the user's story. Enhance the writing, not the facts.
- Create a catchy, click-worthy blog title (max 80 characters).

Return JSON with:
- "title": the suggested blog title
- "story_content": the full enhanced blog post body (plain text, no markdown headers)`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            story_content: { type: 'string' },
          },
          required: ['title', 'story_content'],
        },
      });

      setAiResult(result);
    } catch (e) {
      console.error('AI story assistance error:', e);
      setError('Could not generate AI suggestions. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleApply = () => {
    if (aiResult) {
      onApplyAI(aiResult.title, aiResult.story_content);
      setAiResult(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <Button
        type="button"
        variant="outline"
        onClick={handleGenerate}
        disabled={generating}
        className="border-purple-300 text-purple-700 hover:bg-purple-50 hover:text-purple-800"
      >
        {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
        {generating ? 'Generating...' : 'AI Story Assistance'}
      </Button>

      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}

      {aiResult && (
        <div className="border border-purple-200 rounded-lg p-4 bg-gradient-to-br from-purple-50 to-indigo-50">
          <div className="flex items-center justify-between mb-3">
            <Badge className="bg-purple-600 text-white">
              <Sparkles className="w-3 h-3 mr-1" /> AI Suggested Version
            </Badge>
            <button
              type="button"
              onClick={() => setAiResult(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mb-3">
            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Suggested Title</p>
            <p className="text-sm font-semibold text-slate-900">{aiResult.title}</p>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Suggested Story</p>
            <Textarea
              readOnly
              value={aiResult.story_content}
              className="bg-white/70 text-sm min-h-[180px] resize-y"
            />
          </div>

          <Button
            type="button"
            onClick={handleApply}
            className="w-full mt-3 bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Check className="w-4 h-4 mr-2" /> Use AI Version
          </Button>
          <p className="text-xs text-slate-400 mt-2 text-center">
            Clicking "Use AI Version" will replace your title and story with the AI suggestions. You can still edit before submitting.
          </p>
        </div>
      )}

      {!aiResult && !generating && (
        <p className="text-xs text-slate-400">
          Let AI rewrite your story into a polished, engaging blog post with a catchy title.
        </p>
      )}
    </div>
  );
}
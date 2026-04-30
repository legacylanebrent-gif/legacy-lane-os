import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import OpenAI from 'npm:openai';

const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });

const DEFAULT_MODEL = Deno.env.get('OPENAI_DEFAULT_MODEL') || 'gpt-4o';
const IMAGE_MODEL = Deno.env.get('OPENAI_IMAGE_MODEL') || 'gpt-image-1';
const EMBEDDING_MODEL = Deno.env.get('OPENAI_EMBEDDING_MODEL') || 'text-embedding-3-small';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { mode, messages, prompt, data } = await req.json();

  if (mode === 'chat') {
    const completion = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful business assistant for Legacy Lane OS, an estate sale and real estate platform. Help users with questions about their business, estate sales, leads, expenses, and platform features.'
        },
        ...messages
      ]
    });
    return Response.json({ reply: completion.choices[0].message.content });
  }

  if (mode === 'generate') {
    const completion = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are an expert content writer specializing in real estate, estate sales, and business communications. Generate professional, compelling content.'
        },
        { role: 'user', content: prompt }
      ]
    });
    return Response.json({ content: completion.choices[0].message.content });
  }

  if (mode === 'analyze') {
    const completion = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a business data analyst. Analyze the provided data and give clear, actionable insights, trends, and recommendations in a structured format.'
        },
        {
          role: 'user',
          content: `Analyze this business data and provide key insights, trends, and recommendations:\n\n${JSON.stringify(data, null, 2)}`
        }
      ]
    });
    return Response.json({ analysis: completion.choices[0].message.content });
  }

  return Response.json({ error: 'Invalid mode' }, { status: 400 });
});
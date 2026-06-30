import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { guideContext, messages } = body;

    if (!guideContext || !guideContext.title) {
      return Response.json({ error: 'Guide context is required' }, { status: 400 });
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: 'Messages array is required' }, { status: 400 });
    }

    // Build a system prompt that makes the AI an expert guide on this specific topic
    const systemPrompt = `You are a compassionate, knowledgeable AI guide on EstateSalen.com, a platform that helps families navigate life transitions and estate matters.

RIGHT NOW, the user is reading this guide page:
- Title: ${guideContext.title}
- Subtitle: ${guideContext.subtitle || 'N/A'}
- Summary: ${guideContext.intro || 'N/A'}

Your role:
1. Answer questions specifically related to the topic of "${guideContext.title}".
2. Be warm, empathetic, and practical — many users are going through difficult life transitions (loss of a loved one, downsizing, divorce, foreclosure, etc.).
3. Keep answers concise and actionable. Use short paragraphs or bullet points when helpful.
4. If the user asks about something completely unrelated to estate transitions or this guide topic, gently redirect them back to the guide topic.
5. You are NOT a lawyer, tax professional, or financial advisor. Always recommend consulting a licensed professional for legal, tax, or financial decisions.
6. If the user seems to need professional help (estate sale company, realtor, cleanout service, etc.), mention that EstateSalen can connect them with local professionals and point them to the "Get Free Help" section on the page.
7. Never invent specific laws, deadlines, or procedures — give general guidance and advise checking local regulations.

Be conversational, supportive, and genuinely helpful. The person on the other end may be stressed or grieving.`;

    // Build conversation for the LLM
    const conversation = [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content
      }))
    ];

    const base44 = createClientFromRequest(req);
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: conversation.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n\n'),
      model: 'gpt_5_mini',
    });

    return Response.json({ reply: typeof result === 'string' ? result : result?.text || JSON.stringify(result) });
  } catch (error) {
    console.error('guideAIChat error:', error);
    return Response.json({ error: error.message || 'Something went wrong' }, { status: 500 });
  }
});
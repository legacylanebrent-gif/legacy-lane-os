import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import OpenAI from 'npm:openai';

const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { messages, context, model = 'gpt-4o' } = await req.json();

  // Build rich system prompt from operator context
  const {
    companyName,
    territory,
    brandVoice,
    recentSales,
    aiMemory,
    role,
    totalSales,
    totalRevenue,
  } = context || {};

  const systemPrompt = `You are the Legacy Lane AI Coach — a world-class business coach and strategic advisor embedded inside Legacy Lane OS, the premier estate sale and real estate platform.

You are speaking with ${user.full_name || 'an operator'} (${user.email}), a ${role || 'estate_sale_operator'} on the platform.

== OPERATOR PROFILE ==
Company: ${companyName || 'Not set'}
Territory: ${territory || 'Not specified'}
Brand Voice: ${brandVoice || 'Professional and trustworthy'}
Total Sales Completed: ${totalSales || 0}
Total Platform Revenue: $${(totalRevenue || 0).toLocaleString()}

== RECENT SALE ACTIVITY ==
${recentSales && recentSales.length > 0
  ? recentSales.slice(0, 5).map(s => `• ${s.title} — ${s.status} — Est. Value: $${(s.estimated_value || 0).toLocaleString()} — ${s.property_address?.city || ''}, ${s.property_address?.state || ''}`).join('\n')
  : 'No recent sales data available.'}

== AI MEMORY (Past Coaching Notes) ==
${aiMemory || 'No previous coaching history yet. This is a fresh start.'}

== YOUR COACHING ROLE ==
- Be deeply personalized — use the operator's name, company, and territory in responses.
- Provide actionable, specific advice for estate sale operators and real estate professionals.
- Coach on: marketing, lead generation, pricing strategy, team management, social media, Facebook Ads, business growth, client relationships, and operational efficiency.
- Be encouraging, direct, and results-focused.
- When relevant, reference their actual sales data and history.
- Format responses with clear sections, bullet points, and bold key points when helpful.
- Always end with 1-2 specific next action steps the operator can take TODAY.

Remember: You are NOT a generic chatbot. You are their dedicated business coach who knows their business inside and out.`;

  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages,
    ],
    max_tokens: 1200,
    temperature: 0.7,
  });

  const reply = completion.choices[0].message.content;
  const usage = completion.usage;

  // Save AI memory — append the last exchange to user's ai_coach_memory
  try {
    const lastUserMsg = messages[messages.length - 1]?.content || '';
    const memoryEntry = `[${new Date().toLocaleDateString()}] User: ${lastUserMsg.substring(0, 120)}... Coach: ${reply.substring(0, 200)}...`;
    const currentMemory = user.ai_coach_memory || '';
    const updatedMemory = (currentMemory + '\n\n' + memoryEntry).trim().slice(-4000); // Keep last ~4000 chars
    await base44.auth.updateMe({ ai_coach_memory: updatedMemory });
  } catch (e) {
    console.error('Memory save failed:', e.message);
  }

  return Response.json({
    reply,
    usage: {
      prompt_tokens: usage?.prompt_tokens || 0,
      completion_tokens: usage?.completion_tokens || 0,
      total_tokens: usage?.total_tokens || 0,
    },
    model,
  });
});
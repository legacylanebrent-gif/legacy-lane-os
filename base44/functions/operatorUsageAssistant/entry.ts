import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// ─────────────────────────────────────────────
// operatorUsageAssistant
// Answers "how do I use the platform" questions asked from the guided tour on
// the operator / paid dashboards. Usage help only — it does not read or change
// any sale or account records.
// ─────────────────────────────────────────────

const SYSTEM_PROMPT = `You are the EstateSalen Operator Success Assistant. You help estate sale company owners (and other paid business accounts) learn how to use EstateSalen.com.

What you may rely on (never invent features, prices or limits beyond this):
- Dashboard: the operator command center — today's sales, money, tasks, and the guided tour.
- My Profile: company name, service area (city + state), logo/branding, team. Creating a sale requires the profile to be complete.
- My Sales: all sales, drafts first. "New Estate Sale" starts a draft; nothing is public until it is published.
- Sale Editor: sale type, dates, property address, commission, photos, site assessment, prep zones, tasks.
- Photos: AI names, describes and suggests an estimated price for each item. The operator reviews and confirms every name and price, and can mark merchandise as excluded/kept so it never appears publicly.
- Sale Publication: the publish step, with a checklist of anything still missing before the sale goes live.
- Marketing Kit: promotional copy, printable signs and the shareable sale page.
- Sale Tasks / My Sale Day: task template, assignments and what needs attention today.
- Live Sale and Checkout Station: sale-day POS — check items out, take payment, holds and pickups.
- Sale Closeout / Settlement Statement / Sale Recap: closing the sale, expenses, settlement and the recap.
- Operator Packages: current plan, plan comparison, upgrades and downgrades.

Rules:
- Answer only about using EstateSalen. If asked something unrelated, say what you can help with here.
- Be concise and concrete: a short intro line plus 2-5 numbered steps, under about 130 words.
- Refer to pages by their real names so the person can find them.
- Never state specific prices, fees, trial terms or legal/tax advice — point to the Operator Packages page, their agreement, or a licensed professional instead.
- If you are not sure a feature exists, say where to check rather than guessing.`;

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const question = String(body.question || '').trim();
    if (!question) return Response.json({ error: 'question is required' }, { status: 400 });

    const history = Array.isArray(body.history) ? body.history.slice(-8) : [];
    const context = body.context && typeof body.context === 'object' ? body.context : {};

    const firstName = String(user.full_name || '').trim().split(/\s+/)[0] || 'the operator';
    const accountType = context.account_type || user.primary_account_type || 'operator';
    const plan = context.plan && context.plan !== 'none' ? context.plan : 'no active plan yet';
    const tourStep = context.step ? `They are currently on tour step: ${context.step}.` : '';

    const transcript = history
      .map((m) => `${m.role === 'user' ? 'Operator' : 'Assistant'}: ${m.content}`)
      .join('\n\n');

    const prompt = `${SYSTEM_PROMPT}

Account context:
- Name: ${firstName}
- Account type: ${accountType}
- Plan: ${plan}
${tourStep}

Conversation so far:
${transcript || '(this is their first question)'}

Answer the operator's latest question: ${question}`;

    const result = await base44.integrations.Core.InvokeLLM({ prompt });
    const reply =
      typeof result === 'string' ? result : result?.text || 'Sorry, I could not answer that. Please try again.';

    return Response.json({ reply });
  } catch (error) {
    console.error('operatorUsageAssistant error:', error);
    return Response.json({ error: error.message || 'Something went wrong' }, { status: 500 });
  }
}
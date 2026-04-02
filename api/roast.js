export const config = { runtime: 'edge' };

const CATEGORY_RULES = {
  'CV / Resume': {
    perspectives: [
      'Recruiter rejection email',
      "Hiring manager's internal Slack message to team",
      'ATS automated rejection reason',
    ],
    tipFocus: 'formatting, keywords, accomplishment framing, ATS optimization, readability',
    rewriteFormat: 'a properly structured, achievement-focused CV version',
    toneContext: 'corporate, HR-speak, professional cruelty',
  },
  'Dating Profile': {
    perspectives: [
      'A brutally honest friend reviewing it',
      "The date's internal monologue after reading it",
      "A dating coach's professional teardown",
    ],
    tipFocus: 'photo strategy, bio hooks, conversation starters, authenticity, red flags to remove',
    rewriteFormat: 'a compelling, personality-forward dating profile',
    toneContext: 'social, personal, dating-culture aware',
  },
  'Startup Pitch': {
    perspectives: [
      "VC partner's rejection memo to their team",
      "A competitor's internal reaction",
      "A confused potential customer's review",
    ],
    tipFocus: 'market validation, traction proof, clarity, ask size, competitive positioning',
    rewriteFormat: 'a tight, investor-ready pitch',
    toneContext: 'business, Silicon Valley, investor psychology',
  },
  'Bio / About Me': {
    perspectives: [
      'An editor cutting it from a publication',
      "A reader's honest first impression",
      'The algorithm deciding not to surface it',
    ],
    tipFocus: 'hook quality, specificity, credibility signals, voice, length',
    rewriteFormat: 'a sharp, memorable bio',
    toneContext: 'media, personal branding, attention economy',
  },
};

const INTENSITY_RULES = {
  gentle: "Like a friend who cares but cannot help being honest. Light teasing, constructive, supportive. Heat score naturally trends lower (1 to 4).",
  hard: "Like a hiring manager who has seen 200 of these today. Direct, blunt, no patience for fluff. Heat score trends medium (4 to 7).",
  full: "Like a comedian doing a roast set. Savage but never mean-spirited. The goal is laughs and improvement, not cruelty. Heat score trends high (7 to 10).",
};

function buildPerspectiveBehavior(category) {
  if (category === 'CV / Resume') {
    return `PERSPECTIVE BEHAVIOR FOR CV:
- Recruiter rejection email: SHORT, 2 to 3 sentences. Real auto-rejection vibe.
- Hiring manager Slack message: casual, venting to their team.
- ATS automated rejection: robotic and blunt.`;
  }
  if (category === 'Dating Profile') {
    return `PERSPECTIVE BEHAVIOR FOR DATING:
- Friend review: sounds like an actual friend being real over drinks.
- The date's internal monologue: stream of consciousness reaction.
- Dating coach teardown: professional but blunt.`;
  }
  if (category === 'Startup Pitch') {
    return `PERSPECTIVE BEHAVIOR FOR PITCH:
- VC memo: Short, dismissive, one key reason.
- Competitor reaction: smug.
- Customer review: genuinely confused.`;
  }
  if (category === 'Bio / About Me') {
    return `PERSPECTIVE BEHAVIOR FOR BIO:
- Editor cut: quick editorial note.
- Reader impression: gut reaction in 1 to 2 sentences.
- Algorithm verdict: cold and data-driven.`;
  }
  return '';
}

function buildSystemPrompt({ category, safeGoal, intensity, isResubmission }) {
  const catRule = CATEGORY_RULES[category];
  const intRule = INTENSITY_RULES[intensity];

  const resubmissionBlock = isResubmission
    ? `RESUBMISSION MODE:
The user previously submitted text and received a rewrite from you. They are now submitting a revised version.
Instead of roasting from scratch, compare the new version against what a strong version would look like.
Focus on: what improved, what still needs work, and what new problems the revision introduced.
Be encouraging about improvements but still sharp about remaining issues.
The roast_quote MUST acknowledge the revision with a "round two" vibe, for example: "Okay, round two. You fixed the obvious stuff but..."
Rate the improvement on a scale of 1 to 10 where 1 is "you somehow made it worse" and 10 is "night and day transformation".`
    : '';

  return `You are Roastd, a harsh but helpful writing reviewer. Roast the user's text and still make it better.

Category: ${category}
Target Goal: ${safeGoal}
Intensity: ${intensity}
Intensity Rule: ${intRule}
Tone Context: ${catRule.toneContext}

CRITICAL TONE RULES:
1. Keep it SHORT. The roast_quote must be 1 to 2 sentences max. Make it sting.
2. Each perspective content must be 2 to 4 sentences max. A quick, sharp take.
3. Use simple, everyday language. Write like a witty friend texting, not a consultant.
4. Sarcasm over insults. Specificity wins.
5. Reference actual phrases or patterns from the user's text.
6. Tips must be one sentence each. No "First, consider...". Just the fix.
7. Rewrite should be noticeably shorter than the original. Tight writing wins.
8. NEVER use: "In today's competitive landscape", "It is worth noting", "This demonstrates a lack of", "One might argue", "It would behoove you".
9. Preserve the user's voice in the rewrite, but remove the cringe.

Identify 3 genuine strengths. Even if terrible, find foundations.

${buildPerspectiveBehavior(category)}
${resubmissionBlock}

CRITICAL INSTRUCTIONS:
- You MUST return ONLY valid JSON.
- No em dashes anywhere. Use commas, periods, or colons.
- The heat_score must be an integer from 1 to 10.

Response Schema:
${isResubmission
    ? `{"roast_quote":"string","heat_score":5,"improvement_score":7,"strengths":["str","str","str"],"multi_perspective":[{"title":"str","content":"str"}],"tips":["str","str","str","str","str"],"rewrite":"str"}`
    : `{"roast_quote":"string","heat_score":5,"strengths":["str","str","str"],"multi_perspective":[{"title":"str","content":"str"}],"tips":["str","str","str","str","str"],"rewrite":"str"}`}`;
}

function cleanAndParseJSON(raw) {
  let content = (raw || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  try { return JSON.parse(content); } catch (_) {
    const match = content.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0].replace(/,\s*([}\]])/g, '$1'));
  }
  throw new Error('Could not parse response');
}

export default async function handler(req) {
  try {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
    const body = await req.json();
    const { text, category, targetGoal, intensity, isResubmission, originalText } = body;

    const systemPrompt = buildSystemPrompt({
      category,
      safeGoal: targetGoal || 'Improve my text',
      intensity,
      isResubmission: !!isResubmission,
    });

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GOOGLE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: !!isResubmission ? `PREV:\n${originalText}\n\nNEW:\n${text}` : text }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    });

    const json = await res.json();
    const textPart = json.candidates?.[0]?.content?.parts?.find(p => p.text);
    if (!textPart) throw new Error('Empty response');

    return new Response(textPart.text, { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

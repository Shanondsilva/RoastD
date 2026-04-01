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
  gentle: 'Constructive and supportive. Point out issues diplomatically. Humor is light and encouraging. The roast_quote is more of a nudge. Heat score should naturally trend lower (1-4).',
  hard: 'Direct and blunt. No sugarcoating, but not trying to be funny about it. State problems plainly. Heat score should trend medium (4-7).',
  full: 'Savage, comedic, ruthless. Creative insults. The perspectives should be genuinely funny while still being accurate. Heat score should trend high (7-10). The tips and rewrite must still be genuinely useful. The humor is in the delivery, not at the expense of helpfulness.',
};

function buildSystemPrompt(category, targetGoal, intensity) {
  const catRule = CATEGORY_RULES[category];
  const intRule = INTENSITY_RULES[intensity];

  return `You are a harsh but ultimately helpful AI reviewer. Your task is to roast the user's text and provide constructive feedback.

Category: ${category}
Target Goal: ${targetGoal}
Intensity Level: ${intensity}

Intensity Rule: ${intRule}

Tone Context: ${catRule.toneContext}

You must provide exactly 3 adversarial perspectives based on these titles:
1. ${catRule.perspectives[0]}
2. ${catRule.perspectives[1]}
3. ${catRule.perspectives[2]}

You must also provide exactly 5 actionable tips focusing on: ${catRule.tipFocus}.
Finally, provide a completely rewritten version of the text. The rewrite format should be: ${catRule.rewriteFormat}.

CRITICAL INSTRUCTIONS:
- Return ONLY a valid JSON object. No text before or after. No markdown code fences.
- No em dashes. Use commas, periods, or colons.
- If the user's text does not match the selected category, still respond based on the SELECTED CATEGORY, not what you think the text is.

The JSON object must match this exact schema:
{
  "roast_quote": "A 1-2 sentence brutal summary quote",
  "heat_score": 5,
  "multi_perspective": [
    {
      "title": "Title 1",
      "content": "Content 1"
    },
    {
      "title": "Title 2",
      "content": "Content 2"
    },
    {
      "title": "Title 3",
      "content": "Content 3"
    }
  ],
  "tips": [
    "Tip 1",
    "Tip 2",
    "Tip 3",
    "Tip 4",
    "Tip 5"
  ],
  "rewrite": "Full rewritten text here"
}`;
}

function validateResponse(data) {
  const errors = [];
  if (!data.roast_quote || typeof data.roast_quote !== 'string') errors.push("Invalid roast_quote");
  if (typeof data.heat_score !== 'number' || data.heat_score < 1 || data.heat_score > 10) errors.push("Invalid heat_score");
  if (!Array.isArray(data.multi_perspective) || data.multi_perspective.length !== 3) {
    errors.push("Invalid multi_perspective length");
  } else {
    data.multi_perspective.forEach((p, i) => {
      if (!p.title || typeof p.title !== 'string') errors.push(`Perspective ${i} missing title`);
      if (!p.content || typeof p.content !== 'string') errors.push(`Perspective ${i} missing content`);
    });
  }
  if (!Array.isArray(data.tips) || data.tips.length !== 5) {
    errors.push("Invalid tips length");
  } else {
    data.tips.forEach((t, i) => {
      if (!t || typeof t !== 'string') errors.push(`Tip ${i} is invalid`);
    });
  }
  if (!data.rewrite || typeof data.rewrite !== 'string') errors.push("Invalid rewrite string");

  return errors;
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405 });
  }

  let body;
  try {
    body = await req.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
  }

  const { text, category, targetGoal, intensity } = body;

  const missing = [];
  if (!text) missing.push('text');
  if (!category) missing.push('category');
  if (!targetGoal) missing.push('targetGoal');
  if (!intensity) missing.push('intensity');

  if (missing.length > 0) {
    return new Response(JSON.stringify({ error: `Missing fields: ${missing.join(', ')}` }), { status: 400 });
  }

  if (!CATEGORY_RULES[category]) {
    return new Response(JSON.stringify({ error: 'Invalid category' }), { status: 400 });
  }

  if (!['gentle', 'hard', 'full'].includes(intensity)) {
    return new Response(JSON.stringify({ error: 'Invalid intensity' }), { status: 400 });
  }

  const systemPrompt = buildSystemPrompt(category, targetGoal, intensity);

  const startMs = Date.now();
  let retryCount = 0;
  let responseData = null;
  let tokensUsed = 0;

  while (retryCount < 2) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GOOGLE_API_KEY}`;
      const rawBody = JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text }] }],
        generationConfig: {
          maxOutputTokens: 2048,
          responseMimeType: "application/json"
        }
      });

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: rawBody
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Google API Error: ${res.status} ${errText}`);
      }

      const json = await res.json();
      tokensUsed += (json.usageMetadata?.totalTokenCount || 0);

      const candidate = json.candidates?.[0];
      // 2.5-flash is a thinking model — skip thought parts, find the actual response part
      const textPart = candidate?.content?.parts?.find(p => !p.thought && p.text);
      if (!textPart) {
        const reason = candidate?.finishReason || 'unknown';
        throw new Error(`Empty response from API (finishReason: ${reason})`);
      }

      let content = textPart.text;
      content = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
      
      const parsed = JSON.parse(content);
      const errors = validateResponse(parsed);
      if (errors.length > 0) {
        throw new Error(`Validation failed: ${errors.join(', ')}`);
      }

      responseData = parsed;
      break;
    } catch (e) {
      console.error(`Attempt ${retryCount + 1} failed: ${e.message}`);
      retryCount++;
      if (retryCount >= 2) {
        return new Response(JSON.stringify({ error: 'Failed to generate valid response after retries', details: e.message }), { status: 502 });
      }
    }
  }

  const latencyMs = Date.now() - startMs;

  return new Response(JSON.stringify(responseData), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'X-Tokens-Used': tokensUsed.toString(),
      'X-Latency-Ms': latencyMs.toString(),
      'X-Retry-Count': (retryCount).toString()
    }
  });
}

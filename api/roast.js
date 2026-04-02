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

function buildPerspectiveBehavior(category) {
  if (category === 'CV / Resume') {
    return `PERSPECTIVE BEHAVIOR FOR CV:
- Recruiter rejection email: SHORT, 2 to 3 sentences. Make it sound like a real auto-rejection with one specific reason.
- Hiring manager Slack message: casual, like someone venting to their team.
- ATS automated rejection reason: robotic and blunt.`;
  }
  if (category === 'Dating Profile') {
    return `PERSPECTIVE BEHAVIOR FOR DATING:
- Friend review: sounds like an actual friend being real over drinks.
- The date's internal monologue: stream of consciousness reaction.
- Dating coach teardown: professional but blunt.`;
  }
  if (category === 'Startup Pitch') {
    return `PERSPECTIVE BEHAVIOR FOR PITCH:
- VC memo: sound like a real pass memo (short, dismissive, one key reason).
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

function buildSystemPrompt(category, targetGoal, intensity, isResubmission = false) {
  const catRule = CATEGORY_RULES[category];
  const intRule = INTENSITY_RULES[intensity];

  const resubmissionBlock = isResubmission
    ? `\nRESUBMISSION MODE:
The user previously submitted text and received a rewrite from you. They are now submitting a revised version.
Instead of roasting from scratch, compare the new version against what a strong version would look like. Focus on:
what improved, what still needs work, and what new problems the revision introduced. Be encouraging about improvements
but still sharp about remaining issues. The roast_quote MUST acknowledge the revision with a round two vibe, for example:
"Okay, round two. You fixed the obvious stuff but..."
Rate the improvement on a scale of 1 to 10 where 1 is "you somehow made it worse" and 10 is "night and day transformation".`
    : '';

  return `You are Roastd, a harsh but ultimately helpful writing reviewer. Your job is to roast the user's text and still make it better.

Category: ${category}
Target Goal: ${targetGoal}
Intensity Level: ${intensity}

Intensity Rule: ${intRule}

Tone Context: ${catRule.toneContext}

CRITICAL TONE RULES:
1. Keep it SHORT. The roast_quote must be 1 to 2 sentences max. Make it sting.
2. Each perspective content must be 2 to 4 sentences max. Not a paragraph. Not an essay. A quick, sharp take.
3. Use simple, everyday language. Write like a witty friend texting, not a consultant writing a memo.
4. Sarcasm over insults. "This reads like you asked ChatGPT to describe a human" is better than "This is poorly written and lacks specificity."
5. Be specific. Reference actual phrases or patterns from the user's text. "You used 'passionate' three times, which is what people say when they have nothing else" is better than "Your word choice is repetitive."
6. Tips must be one sentence each. No "First, consider..." or "It's important to..." Just the fix. "Replace 'various projects' with the two biggest things you shipped."
7. The rewrite should be noticeably shorter than the original unless the original was already concise. Tight writing wins.
8. Match the intensity:
   - Gentle: like a friend who cares but can't help being honest. Light teasing.
   - Hard: like a hiring manager who has seen 200 of these today and has no patience for fluff.
   - Full: like a comedian doing a roast set. Savage but never mean-spirited. The goal is laughs and improvement, not cruelty.
9. NEVER use these phrases: "In today's competitive landscape", "It's worth noting", "This demonstrates a lack of", "One might argue", "It would behoove you". Write like a human, not an AI.
10. The rewrite should sound like the user at their best, not like a different person. Preserve their voice, remove the cringe.

You must provide exactly 3 adversarial perspectives using these exact titles:
1. ${catRule.perspectives[0]}
2. ${catRule.perspectives[1]}
3. ${catRule.perspectives[2]}

You must also provide exactly 5 actionable tips focusing on: ${catRule.tipFocus}.
Finally, provide a completely rewritten version of the text. The rewrite format should be: ${catRule.rewriteFormat}.

Also identify exactly 3 specific strengths in the user's text. These should be genuine, not backhanded compliments. Be specific. If the text is truly terrible, find 3 things that are least bad and frame them as foundations to build on.

${buildPerspectiveBehavior(category)}${resubmissionBlock}

CRITICAL INSTRUCTIONS:
- You MUST return ONLY valid JSON. No markdown. No code fences. No extra text.
- No em dashes anywhere. Use commas, periods, or colons instead.
- Do not use newline characters inside string values. Keep each string value on a single line.
- If the user's text does not match the selected category, still respond based on the SELECTED CATEGORY.
- The heat_score must be an integer from 1 to 10.
- Each perspective content must be 2 to 4 sentences.
- Each tip must be exactly one sentence and specific to the ${category} category.
- The rewrite must be complete and in the correct format for ${category}.

Return this exact JSON structure:
${isResubmission
  ? `{"roast_quote":"string","heat_score":5,"improvement_score":7,"strengths":["string","string","string"],"multi_perspective":[{"title":"string","content":"string"},{"title":"string","content":"string"},{"title":"string","content":"string"}],"tips":["string","string","string","string","string"],"rewrite":"string"}`
  : `{"roast_quote":"string","heat_score":5,"strengths":["string","string","string"],"multi_perspective":[{"title":"string","content":"string"},{"title":"string","content":"string"},{"title":"string","content":"string"}],"tips":["string","string","string","string","string"],"rewrite":"string"}`}`;
}

function validateResponse(data, isResubmission = false) {
  const errors = [];
  if (!data.roast_quote || typeof data.roast_quote !== 'string') errors.push("Invalid roast_quote");
  if (typeof data.heat_score !== 'number' || data.heat_score < 1 || data.heat_score > 10) errors.push("Invalid heat_score");
  if (!Array.isArray(data.strengths) || data.strengths.length !== 3) {
    errors.push("Invalid strengths length");
  } else {
    data.strengths.forEach((s, i) => {
      if (!s || typeof s !== 'string') errors.push(`Strength ${i} is invalid`);
    });
  }
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
  if (isResubmission && (typeof data.improvement_score !== 'number' || data.improvement_score < 1 || data.improvement_score > 10)) {
    errors.push("Invalid improvement_score");
  }

  return errors;
}

function cleanAndParseJSON(raw) {
  let content = raw.trim();

  // Strip markdown code fences
  content = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();

  // Remove any BOM or zero-width characters
  content = content.replace(/^\uFEFF/, '');

  // Try direct parse first
  try {
    return JSON.parse(content);
  } catch (_) {
    // Fall through to cleanup
  }

  // Fix trailing commas before } or ]
  content = content.replace(/,\s*([}\]])/g, '$1');

  // Remove control characters (keep normal whitespace)
  content = content.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '');

  // Try again after cleanup
  try {
    return JSON.parse(content);
  } catch (_) {
    // Fall through
  }

  // Last resort: try to extract JSON object from the text
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    let extracted = jsonMatch[0];
    // Fix trailing commas in extracted content too
    extracted = extracted.replace(/,\s*([}\]])/g, '$1');
    return JSON.parse(extracted);
  }

  throw new Error('Could not parse response as JSON');
}

function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}

export default async function handler(req) {
  // Wrap EVERYTHING in try/catch so Vercel never returns a raw error page
  try {
    if (req.method !== 'POST') {
      return jsonResponse({ error: 'Method Not Allowed' }, 405);
    }

    let body;
    try {
      body = await req.json();
    } catch (e) {
      return jsonResponse({ error: 'Invalid JSON body' }, 400);
    }

    const { text, category, targetGoal, intensity, isResubmission, originalText } = body;

    const missing = [];
    if (!text) missing.push('text');
    if (!category) missing.push('category');
    if (!targetGoal) missing.push('targetGoal');
    if (!intensity) missing.push('intensity');
    if (isResubmission && !originalText) missing.push('originalText');

    if (missing.length > 0) {
      return jsonResponse({ error: `Missing fields: ${missing.join(', ')}` }, 400);
    }

    if (!CATEGORY_RULES[category]) {
      return jsonResponse({ error: 'Invalid category' }, 400);
    }

    if (!['gentle', 'hard', 'full'].includes(intensity)) {
      return jsonResponse({ error: 'Invalid intensity' }, 400);
    }

    const systemPrompt = buildSystemPrompt(category, targetGoal, intensity, !!isResubmission);
    const startMs = Date.now();
    let retryCount = 0;
    let responseData = null;
    let tokensUsed = 0;
    let lastError = '';

    while (retryCount < 2) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GOOGLE_API_KEY}`;

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ parts: [{ text: isResubmission ? `PREVIOUS SUBMISSION:\n${originalText}\n\nNEW SUBMISSION:\n${text}` : text }] }],
            generationConfig: {
              maxOutputTokens: 4096,
              responseMimeType: "application/json",
              thinkingConfig: { thinkingBudget: 0 }
            }
          })
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Google API Error: ${res.status} ${errText}`);
        }

        const json = await res.json();
        tokensUsed += (json.usageMetadata?.totalTokenCount || 0);

        const candidate = json.candidates?.[0];

        if (!candidate || candidate.finishReason === 'SAFETY') {
          throw new Error('Response was blocked by safety filters');
        }

        // 2.5-flash is a thinking model: skip thought parts, find the actual response
        const textPart = candidate?.content?.parts?.find(p => !p.thought && p.text);
        if (!textPart) {
          const reason = candidate?.finishReason || 'unknown';
          throw new Error(`Empty response from API (finishReason: ${reason})`);
        }

        const parsed = cleanAndParseJSON(textPart.text);
        const errors = validateResponse(parsed, !!isResubmission);
        if (errors.length > 0) {
          throw new Error(`Validation failed: ${errors.join(', ')}`);
        }

        responseData = parsed;
        break;
      } catch (e) {
        lastError = e.message;
        retryCount++;
        if (retryCount >= 2) {
          return jsonResponse({ error: lastError }, 502);
        }
      }
    }

    const latencyMs = Date.now() - startMs;

    return jsonResponse(responseData, 200, {
      'X-Tokens-Used': tokensUsed.toString(),
      'X-Latency-Ms': latencyMs.toString(),
      'X-Retry-Count': retryCount.toString(),
    });

  } catch (e) {
    // Catch-all: if ANYTHING crashes, still return valid JSON
    return jsonResponse({ error: 'Internal server error: ' + (e.message || 'Unknown error') }, 500);
  }
}
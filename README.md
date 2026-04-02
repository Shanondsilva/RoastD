Roastd 🌶️
AI-powered document roasting. Paste your CV, dating profile, startup pitch, or bio. Get a brutal (but useful) teardown with multiple perspectives, actionable fixes, and a complete rewrite.
<img width="1914" height="876" alt="image" src="https://github.com/user-attachments/assets/96b55aea-32ec-4517-99ce-bb6293ad7563" />
What It Does
You paste text. You pick a category, a target goal, and a roast intensity (Gentle Nudge, Hard Truth, or Full Roast). The AI returns:

A roast quote that summarizes everything wrong in one line
A heat score from 1 to 10
3 adversarial perspectives (category-specific, e.g. a recruiter rejection email, a hiring manager's Slack message, and an ATS automated rejection for CVs)
3 genuine strengths so you know what to keep
5 one-line actionable tips tailored to your target goal
A full rewrite that preserves your voice but fixes the problems

Results can be downloaded as PDF or DOCX, or shared via a unique link.

Why This Exists
Most "AI feedback" tools give you a wall of corporate fluff. Roastd takes the opposite approach: short, specific, sarcastic feedback that people actually read. The perspectives format forces the AI to give feedback from angles you wouldn't think of on your own.
The real reason I built it: to demonstrate that I can ship a complete AI product with a proper evaluation pipeline, not just a wrapper around an API call.

The Eval Pipeline (The Interesting Part)
Most AI projects demo well but have no way to measure whether the output is actually good. Roastd includes a full automated evaluation system:
eval/
├── golden-tests.json    # 12 test cases (3 per category, 1 per intensity)
├── run-eval.js          # Fires tests at the deployed API, validates structure
├── judge.js             # LLM-as-judge scoring via a second Gemini call
└── report.js            # Prints pass rates, per-category/intensity breakdowns
How It Works

golden-tests.json contains 12 realistic test cases with expected perspective titles per category. Each test has a deliberately flawed sample text designed to give the AI something meaningful to critique.
run-eval.js sends each test case to the live API and validates the response structure: correct number of perspectives, matching titles, 5 tips, valid heat score range, non-empty rewrite.
judge.js takes each validated response and sends it to a second LLM call (same Gemini model) acting as a judge. It scores on 5 criteria:

Category accuracy (pass/fail): Does the roast address the right document type?
Intensity calibration (pass/fail): Does the tone match mild/medium/savage?
Structural validity (pass/fail): All fields present and substantive?
Tip relevance (1-5): How actionable and specific to this document?
Rewrite quality (1-5): How much better than the original?


report.js aggregates scores into a summary: overall pass rate, per-category breakdown, per-intensity breakdown, average quality scores, and detailed failure analysis.

Running the Eval
bash# Run all test cases against the deployed API
ROASTD_API_URL=https://roastd.vercel.app/api/roast node eval/run-eval.js

# Score responses with the LLM judge
node eval/judge.js

# Print the report
node eval/report.js
Why This Matters
This is the same pattern used in production AI systems: golden datasets, automated regression testing, and LLM-as-judge scoring. It catches prompt regressions, model drift, and structural failures before users do. The eval pipeline is the difference between "I built a ChatGPT wrapper" and "I built a testable AI product."

Architecture
roastd/
├── api/
│   └── roast.js              # Vercel Edge Function (Gemini 2.5 Flash)
├── eval/
│   ├── golden-tests.json      # 12 test cases
│   ├── run-eval.js            # API test runner
│   ├── judge.js               # LLM-as-judge scoring
│   ├── report.js              # Evaluation report generator
│   └── results/               # Generated at runtime (gitignored)
├── public/
│   ├── index.html             # Entry point
│   ├── Roastd.jsx             # Single-file React frontend
│   └── favicon.svg
├── package.json
├── vercel.json
└── .env.local                 # API key (gitignored)
Tech Decisions
Single React file, no build step. The entire frontend is one JSX file loaded via Babel standalone. No webpack, no Vite, no npm UI dependencies. Every library (React, jsPDF, docx) is loaded from CDN at runtime. This keeps deployment dead simple and the project easy to read end-to-end.
Gemini 2.5 Flash, not GPT-4 or Claude. Free tier, fast enough for a portfolio project, and supports structured JSON output natively via responseMimeType. Thinking is disabled (thinkingBudget: 0) to stay under Vercel's 25-second edge function timeout.
Vercel Edge Function, not a traditional server. Zero cold start, global distribution, free tier. The API route is a single file that validates input, builds a category-aware prompt, calls Gemini, validates the response, retries once on failure, and returns structured JSON with observability headers.
No database. No auth. This is a stateless tool. Recent roasts are stored in localStorage. Sharing uses base64-encoded URL hashes. The eval pipeline stores results as local JSON files.

Key Engineering Details
Prompt Architecture
The system prompt is category-aware with exact perspective titles per category. Each category has its own voice for each perspective (e.g. the "recruiter rejection email" perspective actually reads like an email, not generic feedback). The prompt includes 10 tone rules that enforce short, specific, sarcastic output and ban common AI phrases.
Feedback Loop Detection
When a user pastes back the AI's own rewrite, the app detects it (60%+ word overlap) and switches to a comparison mode. Instead of roasting from scratch, the AI compares the revision against the original and scores the improvement. This prevents useless self-referential feedback loops.
Structured Output Validation
The API enforces a strict JSON schema. Gemini's responseMimeType: "application/json" handles most cases, but a cleanAndParseJSON function handles edge cases: strips code fences, trailing commas, control characters, and falls back to regex extraction. The response is validated field-by-field before being sent to the client.
Observability
Every API response includes headers: X-Tokens-Used, X-Latency-Ms, X-Retry-Count. The frontend exposes these in a collapsible stats panel.

Frontend Highlights

6 custom animations: typewriter quote reveal, animated heat score bar with gradient, border-expand perspective cards, pop+wipe tip reveals, intensity pill morph with emoji rotation, shimmer loading skeleton
Mobile-first responsive: full layout adaptation at 640px breakpoint
PDF and DOCX export: generated client-side via CDN libraries (jsPDF, docx)
Share system: base64-encoded URL hashes for sharing roast summaries
Auto-resize textarea, paste detection, keyboard shortcuts (Cmd+Enter)


Running Locally


What I'd Build Next

A/B test different prompt strategies using the eval pipeline to measure which produces higher judge scores
User feedback collection (thumbs up/down on each roast) to build a human evaluation dataset alongside the automated one
Category auto-detection so users don't need to pick from the dropdown
Batch mode for roasting multiple documents at once (e.g. all sections of a pitch deck)


License
MIT

# Roastd

AI-powered document roasting web app. Paste your text, pick a category and intensity, and get a brutal but useful AI-generated roast. Includes 3 adversarial perspectives, 5 actionable tips, and a full rewrite.

## Architecture

- **Frontend:** Single React file `Roastd.jsx` served statically via Vercel. Loads libraries like jsPDF and docx via CDN logic.
- **Backend:** Next.js / Vercel Edge Function (`api/roast.js`). Directly builds category-aware system prompts and queries Google's Gemini API.
- **Eval Pipeline:** Local Node.js scripts executing an LLM-as-judge pipeline against golden datasets, ensuring tone accuracy and structure stability.

```text
User Input -> Frontend (React)
                    |
                    v
          Vercel Edge Function (/api/roast)
                    |
                    v
          Google Gemini API
```

## Features

- **Category-Aware:** Specialized prompts tailored for CVs, dating profiles, startup pitches, or bios.
- **Adjustable Intensity:** "Gentle Nudge", "Hard Truth", or "Full Roast".
- **Dynamic Downloads:** Export results to beautifully formatted PDF and DOCX documents client-side.
- **Stats:** Track API latency, token usage, and retries.
- **Local History:** Saves the latest 3 roasts to `localStorage`.

## Setup Instructions

1. `git clone` this repository.
2. Navigate to directory: `cd roastd`
3. Run `npm install`
4. Create a `.env.local` file with your Google Gemini key:
   ```
   GOOGLE_API_KEY=your_key_here
   ```
5. Deploy to Vercel (Hobby tier is sufficient) linking your repo, or just run locally (if you have a local Edge simulator/NextJS env, although this setup is built to deploy natively to Vercel static+edge).

## Evaluation Pipeline

One of Roastd's standout features is its LLM-as-judge automated eval framework. It runs locally against `golden-tests.json` and evaluates outputs for Structure, Tone Calibration, and Advice Actionability.

See [EVAL.md](EVAL.md) for more details.

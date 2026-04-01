# EVAL Pipeline Documentation

## Overview

Roastd includes an automated evaluation pipeline to continuously verify the quality, accuracy, and tone calibration of the AI roasts. This is critical because the core value proposition implies providing specific, category-aware, and intensity-calibrated roasts.

## Scoring Criteria

The pipeline uses an LLM-as-a-judge approach (Google Gemini) to evaluate responses across 5 dimensions:

1. **Category Accuracy (Pass/Fail):** Verifies the system correctly generated perspectives matching the specific document type (e.g., CV vs. Dating Profile), and that the context is relevant.
2. **Intensity Calibration (Pass/Fail):** Verifies the tone correctly matches the requested level ('gentle', 'hard', 'full'). 'gentle' shouldn't be overly insulting, and 'full' shouldn't hold back.
3. **Structural Validity (Pass/Fail):** Checks if the JSON matches the schema exactly (3 perspectives, 5 tips, 1-10 heat score, non-empty rewrite, etc).
4. **Tip Relevance (Score 1-5):** Evaluates if the 5 tips provided are genuinely actionable and specific, not generic placeholders.
5. **Rewrite Quality (Score 1-5):** Evaluates if the "Improved Version" rewrite is in the appropriate format and genuinely improves the input text.

## How to Run

Before running, make sure your `.env.local` contains `GOOGLE_API_KEY`.

To run the full suite:
```bash
npm run eval
```

Or run steps individually:
1. `npm run eval:run` - Sends all golden tests to the API and saves the responses.
2. `npm run eval:judge` - Calls the Google Gemini API to judge each response against the criteria.
3. `npm run eval:report` - Generates a console report with pass rates and averge scores.

## Golden Tests

The `eval/golden-tests.json` file contains realistic examples of bad-to-mediocre writing across the 4 categories.

To add new tests, append a new object to the array, ensuring it has `id`, `category`, `intensity`, `targetGoal`, `text`, and the `expectedPerspectiveTitles`.

## Interpreting Output

The report will display overall pass rate, category pass rate, and tone calibration pass rate. If tests fail, it will list reasons. Use these reasons to tweak the system prompt in `api/roast.js`.

## Limitations

LLM-as-a-judge can vary in strictness, especially on subjective criteria like "funny" or "gentle", but it acts as a reliable programmatic baseline to catch regressions when updating prompts.

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');

const RESPONSES_FILE = path.join(__dirname, 'results', 'responses.json');
const SCORED_FILE = path.join(__dirname, 'results', 'scored.json');

async function judge() {
  const responses = JSON.parse(fs.readFileSync(RESPONSES_FILE, 'utf-8'));
  const scored = [];

  for (const item of responses) {
    process.stdout.write(`Judging ${item.testId}... `);

    if (!item.response) {
      console.log('FAIL (No response to judge)');
      scored.push({
        testId: item.testId,
        score: {
          category_accuracy: "fail",
          category_accuracy_reason: "No response",
          intensity_calibration: "fail",
          intensity_calibration_reason: "No response",
          structural_validity: "fail",
          structural_validity_reason: "No response",
          tip_relevance: 1,
          tip_relevance_reason: "No response",
          rewrite_quality: 1,
          rewrite_quality_reason: "No response"
        },
        input: item.input,
        response: null
      });
      continue;
    }

    const validatorPrompt = `You are evaluating an AI's response to a writing improvement prompt.
Evaluate the following JSON response based on the original user request.

Original Request:
Category: ${item.input.category}
Target Goal: ${item.input.targetGoal}
Intensity requested: ${item.input.intensity}
Input text: ${item.input.text}
Expected perspectives: ${item.input.expectedPerspectiveTitles.join(', ')}

AI Response to evaluate:
${JSON.stringify(item.response, null, 2)}

Provide your evaluation as a JSON object matching this schema exactly:
{
  "category_accuracy": "pass|fail",
  "category_accuracy_reason": "string",
  "intensity_calibration": "pass|fail",
  "intensity_calibration_reason": "string",
  "structural_validity": "pass|fail",
  "structural_validity_reason": "string",
  "tip_relevance": 5, // 1-5 number
  "tip_relevance_reason": "string",
  "rewrite_quality": 5, // 1-5 number
  "rewrite_quality_reason": "string"
}

- Category Accuracy: pass if perspective titles closely match expected titles and tips are category-specific.
- Intensity Calibration: pass if tone matches requested intensity. Gentle = constructive/diplomatic. Hard = blunt. Full = savage/comedic.
- Structural Validity: pass if exactly 3 perspectives, exactly 5 tips, valid heat_score, non-empty rewrite.
- Tip Relevance: score 1-5 based on how actionable and useful the tips are.
- Rewrite Quality: score 1-5 based on if it genuinely improves the input.

Output ONLY JSON. No other text.`;

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GOOGLE_API_KEY}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: validatorPrompt }] }],
          generationConfig: {
            maxOutputTokens: 1024,
            responseMimeType: "application/json"
          }
        })
      });

      if (!res.ok) {
        throw new Error(`Google Error: ${await res.text()}`);
      }

      const json = await res.json();
      let content = json.candidates[0].content.parts[0].text.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
      const evaluation = JSON.parse(content);

      scored.push({
        testId: item.testId,
        score: evaluation,
        input: item.input,
        response: item.response
      });
      console.log('DONE');
    } catch (e) {
      console.log(`ERROR (${e.message})`);
      scored.push({
        testId: item.testId,
        score: {
          category_accuracy: "fail", category_accuracy_reason: "Eval failed",
          intensity_calibration: "fail", intensity_calibration_reason: "Eval failed",
          structural_validity: "fail", structural_validity_reason: "Eval failed",
          tip_relevance: 1, tip_relevance_reason: "Eval failed",
          rewrite_quality: 1, rewrite_quality_reason: "Eval failed"
        },
        input: item.input,
        response: item.response
      });
    }
  }

  fs.writeFileSync(SCORED_FILE, JSON.stringify(scored, null, 2));
  console.log(`Saved judged results to eval/results/scored.json`);
}

judge();

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));

config({ path: resolve(__dirname, "..", ".env.local") });

const API_KEY = process.env.GOOGLE_API_KEY;
if (!API_KEY) {
  console.error("Missing GOOGLE_API_KEY in .env.local");
  process.exit(1);
}

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
const RESPONSES_PATH = resolve(__dirname, "results", "responses.json");
const GOLDEN_TESTS_PATH = resolve(__dirname, "golden-tests.json");
const SCORED_PATH = resolve(__dirname, "results", "scored.json");
const DELAY_MS = 3000;

function buildJudgePrompt(test, response) {
  return `You are an expert evaluator for an AI-powered "document roasting" app called Roastd.

A user submitted a ${test.category} document with intensity set to "${test.intensity}" and a target goal of: "${test.targetGoal}"

Here is the original user text:
---
${test.text}
---

Here is the AI-generated roast response:
---
Roast Quote: ${response.roast_quote}
Heat Score: ${response.heat_score}/10
Perspective 1 (${response.multi_perspective[0]?.title}): ${response.multi_perspective[0]?.content}
Perspective 2 (${response.multi_perspective[1]?.title}): ${response.multi_perspective[1]?.content}
Perspective 3 (${response.multi_perspective[2]?.title}): ${response.multi_perspective[2]?.content}
Tips: ${response.tips?.map((t, i) => `${i + 1}. ${t}`).join(" | ")}
Rewrite: ${response.rewrite}
---

Score this response on the following 5 criteria. Respond ONLY with a JSON object, no markdown, no backticks, no extra text.

{
  "category_accuracy": "pass" or "fail" - Does the roast clearly address this as a ${test.category} document? Are the perspectives appropriate for the ${test.category} category? Are the tips relevant to improving a ${test.category}?

  "intensity_calibration": "pass" or "fail" - The intensity was set to "${test.intensity}". Mild should be constructive with light humor. Medium should be pointed and direct with sharper criticism. Savage should be brutally honest, pulling no punches. Does the tone match the requested intensity?

  "structural_validity": "pass" or "fail" - Does the response have: a roast quote, a heat score between 1-10, exactly 3 perspectives each with title and content, exactly 5 tips, and a rewrite? Are all fields non-empty and substantive?

  "tip_relevance": integer 1-5 - How actionable and specific are the 5 tips? 1 = generic filler that could apply to anything. 3 = decent advice but somewhat obvious. 5 = highly specific, actionable advice tailored to this exact document and the user's target goal of "${test.targetGoal}".

  "rewrite_quality": integer 1-5 - How good is the rewrite? 1 = barely different from original or nonsensical. 3 = improved but generic. 5 = dramatically better, specifically tailored to the target goal, maintains the user's voice while fixing all major issues.

  "reasoning": A brief 2-3 sentence explanation of your scoring decisions.
}`;
}

async function judgeResponse(test, response) {
  const prompt = buildJudgePrompt(test, response);

  const res = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: {
        parts: [
          {
            text: "You are a strict, objective evaluator. Return only valid JSON. No markdown. No backticks. No preamble.",
          },
        ],
      },
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 1024,
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  const raw =
    data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

  const cleaned = raw
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  return JSON.parse(cleaned);
}

async function main() {
  console.log("=== Roastd LLM Judge ===\n");

  const responsesFile = JSON.parse(readFileSync(RESPONSES_PATH, "utf-8"));
  const goldenTests = JSON.parse(readFileSync(GOLDEN_TESTS_PATH, "utf-8"));

  const testMap = {};
  goldenTests.forEach((t) => (testMap[t.id] = t));

  const passedResults = responsesFile.results.filter(
    (r) => r.status === "pass" && r.data
  );

  console.log(
    `Found ${passedResults.length} valid responses to judge (out of ${responsesFile.results.length} total)\n`
  );

  if (passedResults.length === 0) {
    console.log("No valid responses to judge. Run eval first and fix any failures.");
    process.exit(1);
  }

  const skippedIds = responsesFile.results
    .filter((r) => r.status !== "pass")
    .map((r) => r.id);

  if (skippedIds.length > 0) {
    console.log(`Skipping ${skippedIds.length} failed results: ${skippedIds.join(", ")}\n`);
  }

  const scoredResults = [];

  for (let i = 0; i < passedResults.length; i++) {
    const result = passedResults[i];
    const test = testMap[result.id];

    if (!test) {
      console.log(`[${i + 1}] Skipping ${result.id}: no matching golden test`);
      continue;
    }

    console.log(
      `[${i + 1}/${passedResults.length}] Judging: ${result.id} (${test.category} / ${test.intensity})`
    );

    try {
      const scores = await judgeResponse(test, result.data);

      const scored = {
        id: result.id,
        category: test.category,
        intensity: test.intensity,
        scores: {
          category_accuracy: scores.category_accuracy,
          intensity_calibration: scores.intensity_calibration,
          structural_validity: scores.structural_validity,
          tip_relevance: scores.tip_relevance,
          rewrite_quality: scores.rewrite_quality,
        },
        reasoning: scores.reasoning || "",
        status: "scored",
      };

      scoredResults.push(scored);

      const passFailStr = [
        scores.category_accuracy === "pass" ? "CAT:P" : "CAT:F",
        scores.intensity_calibration === "pass" ? "INT:P" : "INT:F",
        scores.structural_validity === "pass" ? "STR:P" : "STR:F",
      ].join(" ");

      console.log(
        `  ${passFailStr} | Tips: ${scores.tip_relevance}/5 | Rewrite: ${scores.rewrite_quality}/5`
      );
    } catch (err) {
      console.log(`  ERROR: ${err.message}`);
      scoredResults.push({
        id: result.id,
        category: test.category,
        intensity: test.intensity,
        scores: null,
        reasoning: err.message,
        status: "judge_error",
      });
    }

    if (i < passedResults.length - 1) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  const output = {
    judgedAt: new Date().toISOString(),
    totalJudged: scoredResults.length,
    scoredResults,
  };

  writeFileSync(SCORED_PATH, JSON.stringify(output, null, 2));

  console.log(`\nScored ${scoredResults.length} responses`);
  console.log(`Saved to: ${SCORED_PATH}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
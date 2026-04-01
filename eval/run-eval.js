import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const API_URL = process.env.ROASTD_API_URL || "https://roastd.vercel.app/api/roast";
const GOLDEN_TESTS_PATH = resolve(__dirname, "golden-tests.json");
const RESULTS_DIR = resolve(__dirname, "results");
const RESPONSES_PATH = resolve(RESULTS_DIR, "responses.json");
const DELAY_MS = 2000;

function validateResponse(data, test) {
  const errors = [];

  if (typeof data.roast_quote !== "string" || data.roast_quote.length === 0) {
    errors.push("roast_quote is missing or empty");
  }

  if (typeof data.heat_score !== "number" || data.heat_score < 1 || data.heat_score > 10) {
    errors.push(`heat_score is invalid: ${data.heat_score}`);
  }

  if (!Array.isArray(data.multi_perspective) || data.multi_perspective.length !== 3) {
    errors.push(`multi_perspective should have 3 items, got ${data.multi_perspective?.length}`);
  } else {
    data.multi_perspective.forEach((p, i) => {
      if (typeof p.title !== "string" || p.title.length === 0) {
        errors.push(`multi_perspective[${i}].title is missing`);
      }
      if (typeof p.content !== "string" || p.content.length === 0) {
        errors.push(`multi_perspective[${i}].content is missing`);
      }
    });

    const expectedTitles = test.expectedPerspectiveTitles;
    const actualTitles = data.multi_perspective.map((p) => p.title);
    expectedTitles.forEach((expected) => {
      const match = actualTitles.some(
        (actual) => actual.toLowerCase().trim() === expected.toLowerCase().trim()
      );
      if (!match) {
        errors.push(`Missing expected perspective title: "${expected}"`);
      }
    });
  }

  if (!Array.isArray(data.tips) || data.tips.length !== 5) {
    errors.push(`tips should have 5 items, got ${data.tips?.length}`);
  } else {
    data.tips.forEach((tip, i) => {
      if (typeof tip !== "string" || tip.length === 0) {
        errors.push(`tips[${i}] is missing or empty`);
      }
    });
  }

  if (typeof data.rewrite !== "string" || data.rewrite.length === 0) {
    errors.push("rewrite is missing or empty");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

async function runTest(test) {
  const startTime = Date.now();

  const res = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: test.text,
      category: test.category,
      targetGoal: test.targetGoal,
      intensity: test.intensity,
    }),
  });

  const latencyMs = Date.now() - startTime;
  const tokensUsed = res.headers.get("x-tokens-used") || null;
  const apiLatency = res.headers.get("x-latency-ms") || null;
  const retryCount = res.headers.get("x-retry-count") || null;

  if (!res.ok) {
    const errorText = await res.text();
    return {
      id: test.id,
      status: "http_error",
      httpStatus: res.status,
      error: errorText.slice(0, 500),
      latencyMs,
      validation: { valid: false, errors: [`HTTP ${res.status}`] },
      data: null,
      observability: { tokensUsed, apiLatency, retryCount },
    };
  }

  let data;
  try {
    data = await res.json();
  } catch (e) {
    return {
      id: test.id,
      status: "json_parse_error",
      error: e.message,
      latencyMs,
      validation: { valid: false, errors: ["Response was not valid JSON"] },
      data: null,
      observability: { tokensUsed, apiLatency, retryCount },
    };
  }

  const validation = validateResponse(data, test);

  return {
    id: test.id,
    status: validation.valid ? "pass" : "validation_error",
    latencyMs,
    validation,
    data,
    observability: { tokensUsed, apiLatency, retryCount },
  };
}

async function main() {
  console.log("=== Roastd Eval Runner ===\n");
  console.log(`API: ${API_URL}\n`);

  const tests = JSON.parse(readFileSync(GOLDEN_TESTS_PATH, "utf-8"));
  console.log(`Loaded ${tests.length} golden tests\n`);

  if (!existsSync(RESULTS_DIR)) {
    mkdirSync(RESULTS_DIR, { recursive: true });
  }

  const results = [];
  let passCount = 0;
  let failCount = 0;

  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    console.log(`[${i + 1}/${tests.length}] Running: ${test.id} (${test.category} / ${test.intensity})`);

    try {
      const result = await runTest(test);
      results.push(result);

      if (result.status === "pass") {
        passCount++;
        console.log(`  PASS (${result.latencyMs}ms)`);
      } else {
        failCount++;
        console.log(`  FAIL: ${result.status}`);
        result.validation.errors.forEach((e) => console.log(`    - ${e}`));
      }
    } catch (err) {
      failCount++;
      const errorResult = {
        id: test.id,
        status: "network_error",
        error: err.message,
        latencyMs: null,
        validation: { valid: false, errors: [err.message] },
        data: null,
        observability: {},
      };
      results.push(errorResult);
      console.log(`  FAIL: network_error - ${err.message}`);
    }

    if (i < tests.length - 1) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  const output = {
    runAt: new Date().toISOString(),
    apiUrl: API_URL,
    totalTests: tests.length,
    passed: passCount,
    failed: failCount,
    results,
  };

  writeFileSync(RESPONSES_PATH, JSON.stringify(output, null, 2));

  console.log("\n=== Summary ===");
  console.log(`Passed: ${passCount}/${tests.length}`);
  console.log(`Failed: ${failCount}/${tests.length}`);
  console.log(`\nResults saved to: ${RESPONSES_PATH}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
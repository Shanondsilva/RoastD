require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');

const API_URL = process.env.EVAL_API_URL || 'http://localhost:3000/api/roast';
const TESTS_DIR = path.join(__dirname, 'results');
const TESTS_FILE = path.join(__dirname, 'golden-tests.json');
const RESULTS_FILE = path.join(TESTS_DIR, 'responses.json');

async function run() {
  if (!fs.existsSync(TESTS_DIR)) {
    fs.mkdirSync(TESTS_DIR, { recursive: true });
  }

  const tests = JSON.parse(fs.readFileSync(TESTS_FILE, 'utf-8'));
  const results = [];
  let validCount = 0;

  for (const test of tests) {
    process.stdout.write(`Testing ${test.id}... `);
    const startTime = Date.now();

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: test.text,
          category: test.category,
          targetGoal: test.targetGoal,
          intensity: test.intensity
        })
      });

      const latencyMs = Date.now() - startTime;
      const data = await res.json();
      
      const structuralErrors = [];
      if (!res.ok) {
        structuralErrors.push(`API Error: ${data.error || 'Unknown'}`);
      } else {
        if (!data.roast_quote) structuralErrors.push("Missing roast_quote");
        if (typeof data.heat_score !== 'number' || data.heat_score < 1 || data.heat_score > 10) structuralErrors.push("Invalid heat_score");
        if (!Array.isArray(data.multi_perspective) || data.multi_perspective.length !== 3) structuralErrors.push("Invalid multi_perspective");
        if (!Array.isArray(data.tips) || data.tips.length !== 5) structuralErrors.push("Invalid tips");
        if (!data.rewrite) structuralErrors.push("Missing rewrite");
      }

      results.push({
        testId: test.id,
        input: test,
        response: res.ok ? data : null,
        structuralErrors,
        latencyMs
      });

      if (structuralErrors.length === 0) {
        console.log('PASS');
        validCount++;
      } else {
        console.log('FAIL (structural)');
        console.log(`  Errors: ${structuralErrors.join(', ')}`);
      }

    } catch (e) {
      console.log('FAIL (Request Error)');
      console.log(`  Error: ${e.message}`);
      results.push({
        testId: test.id,
        input: test,
        response: null,
        structuralErrors: ['Request Failed'],
        latencyMs: Date.now() - startTime
      });
    }
  }

  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
  console.log(`\n${validCount}/${tests.length} structurally valid.`);
  console.log(`Saved responses to eval/results/responses.json`);
}

run();

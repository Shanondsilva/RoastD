import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCORED_PATH = resolve(__dirname, "results", "scored.json");

function main() {
  console.log("=== Roastd Evaluation Report ===\n");

  const data = JSON.parse(readFileSync(SCORED_PATH, "utf-8"));
  const results = data.scoredResults.filter((r) => r.status === "scored" && r.scores);
  const errors = data.scoredResults.filter((r) => r.status === "judge_error");

  if (results.length === 0) {
    console.log("No scored results found. Run judge.js first.");
    process.exit(1);
  }

  console.log(`Judged at: ${data.judgedAt}`);
  console.log(`Total scored: ${results.length}`);
  if (errors.length > 0) {
    console.log(`Judge errors: ${errors.length}`);
  }

  // Overall pass/fail counts
  const categoryPass = results.filter((r) => r.scores.category_accuracy === "pass").length;
  const intensityPass = results.filter((r) => r.scores.intensity_calibration === "pass").length;
  const structurePass = results.filter((r) => r.scores.structural_validity === "pass").length;
  const allThreePass = results.filter(
    (r) =>
      r.scores.category_accuracy === "pass" &&
      r.scores.intensity_calibration === "pass" &&
      r.scores.structural_validity === "pass"
  ).length;

  const avgTipRelevance = (
    results.reduce((sum, r) => sum + (r.scores.tip_relevance || 0), 0) / results.length
  ).toFixed(2);
  const avgRewriteQuality = (
    results.reduce((sum, r) => sum + (r.scores.rewrite_quality || 0), 0) / results.length
  ).toFixed(2);

  console.log("\n--- Overall Pass Rates ---");
  console.log(`Category Accuracy:     ${categoryPass}/${results.length} (${pct(categoryPass, results.length)})`);
  console.log(`Intensity Calibration: ${intensityPass}/${results.length} (${pct(intensityPass, results.length)})`);
  console.log(`Structural Validity:   ${structurePass}/${results.length} (${pct(structurePass, results.length)})`);
  console.log(`All 3 Passing:         ${allThreePass}/${results.length} (${pct(allThreePass, results.length)})`);

  console.log("\n--- Quality Scores (avg) ---");
  console.log(`Tip Relevance:   ${avgTipRelevance}/5`);
  console.log(`Rewrite Quality: ${avgRewriteQuality}/5`);

  // Per-category breakdown
  const categories = ["cv", "dating", "pitch", "bio"];
  console.log("\n--- Per-Category Breakdown ---");
  for (const cat of categories) {
    const catResults = results.filter((r) => r.category === cat);
    if (catResults.length === 0) continue;

    const catPass = catResults.filter((r) => r.scores.category_accuracy === "pass").length;
    const intPass = catResults.filter((r) => r.scores.intensity_calibration === "pass").length;
    const strPass = catResults.filter((r) => r.scores.structural_validity === "pass").length;
    const tipAvg = (
      catResults.reduce((s, r) => s + (r.scores.tip_relevance || 0), 0) / catResults.length
    ).toFixed(1);
    const rewAvg = (
      catResults.reduce((s, r) => s + (r.scores.rewrite_quality || 0), 0) / catResults.length
    ).toFixed(1);

    console.log(
      `\n  ${cat.toUpperCase()} (${catResults.length} tests): Cat:${catPass}/${catResults.length} Int:${intPass}/${catResults.length} Str:${strPass}/${catResults.length} | Tips:${tipAvg}/5 Rewrite:${rewAvg}/5`
    );
  }

  // Per-intensity breakdown
  const intensities = ["mild", "medium", "savage"];
  console.log("\n--- Per-Intensity Breakdown ---");
  for (const level of intensities) {
    const intResults = results.filter((r) => r.intensity === level);
    if (intResults.length === 0) continue;

    const catPass = intResults.filter((r) => r.scores.category_accuracy === "pass").length;
    const intPass = intResults.filter((r) => r.scores.intensity_calibration === "pass").length;
    const strPass = intResults.filter((r) => r.scores.structural_validity === "pass").length;
    const tipAvg = (
      intResults.reduce((s, r) => s + (r.scores.tip_relevance || 0), 0) / intResults.length
    ).toFixed(1);
    const rewAvg = (
      intResults.reduce((s, r) => s + (r.scores.rewrite_quality || 0), 0) / intResults.length
    ).toFixed(1);

    console.log(
      `  ${level.toUpperCase()} (${intResults.length} tests): Cat:${catPass}/${intResults.length} Int:${intPass}/${intResults.length} Str:${strPass}/${intResults.length} | Tips:${tipAvg}/5 Rewrite:${rewAvg}/5`
    );
  }

  // Failure details
  const failures = results.filter(
    (r) =>
      r.scores.category_accuracy === "fail" ||
      r.scores.intensity_calibration === "fail" ||
      r.scores.structural_validity === "fail"
  );

  if (failures.length > 0) {
    console.log("\n--- Failure Details ---");
    for (const f of failures) {
      const failedCriteria = [];
      if (f.scores.category_accuracy === "fail") failedCriteria.push("category");
      if (f.scores.intensity_calibration === "fail") failedCriteria.push("intensity");
      if (f.scores.structural_validity === "fail") failedCriteria.push("structure");

      console.log(`  ${f.id}: FAILED [${failedCriteria.join(", ")}]`);
      if (f.reasoning) {
        console.log(`    Reason: ${f.reasoning}`);
      }
    }
  } else {
    console.log("\n--- No failures. All pass/fail criteria passed. ---");
  }

  // Judge errors
  if (errors.length > 0) {
    console.log("\n--- Judge Errors ---");
    for (const e of errors) {
      console.log(`  ${e.id}: ${e.reasoning}`);
    }
  }

  console.log("\n=== End Report ===");
}

function pct(n, total) {
  return `${((n / total) * 100).toFixed(0)}%`;
}

main();
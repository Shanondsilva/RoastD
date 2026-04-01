const fs = require('fs');
const path = require('path');

const SCORED_FILE = path.join(__dirname, 'results', 'scored.json');

function report() {
  if (!fs.existsSync(SCORED_FILE)) {
    console.error('No scored.json found! Run eval:judge first.');
    return;
  }

  const results = JSON.parse(fs.readFileSync(SCORED_FILE, 'utf-8'));
  
  let passedAll = 0;
  let tipSum = 0;
  let rewriteSum = 0;
  
  const categoryStats = {};
  const intensityStats = {};

  const failures = [];

  results.forEach(item => {
    const s = item.score;
    const isPass = s.category_accuracy === 'pass' && 
                   s.intensity_calibration === 'pass' && 
                   s.structural_validity === 'pass';
                   
    if (isPass) passedAll++;
    
    tipSum += s.tip_relevance;
    rewriteSum += s.rewrite_quality;

    if (!item.input) return; // defensive

    const cat = item.input.category;
    const int = item.input.intensity;
    
    if (!categoryStats[cat]) categoryStats[cat] = { total: 0, pass: 0 };
    if (!intensityStats[int]) intensityStats[int] = { total: 0, pass: 0 };

    categoryStats[cat].total++;
    intensityStats[int].total++;
    
    if (isPass) {
      categoryStats[cat].pass++;
      intensityStats[int].pass++;
    } else {
      let reasons = [];
      if (s.category_accuracy !== 'pass') reasons.push(`Cat: ${s.category_accuracy_reason}`);
      if (s.intensity_calibration !== 'pass') reasons.push(`Int: ${s.intensity_calibration_reason}`);
      if (s.structural_validity !== 'pass') reasons.push(`Struct: ${s.structural_validity_reason}`);
      failures.push({ id: item.testId, reasons });
    }
  });

  const total = results.length;
  console.log(`\n=== ROASTD EVAL REPORT ===\n`);
  console.log(`Overall Pass Rate: ${((passedAll / total) * 100).toFixed(1)}% (${passedAll}/${total})`);
  console.log(`Average Tip Relevance: ${(tipSum / total).toFixed(2)}/5`);
  console.log(`Average Rewrite Quality: ${(rewriteSum / total).toFixed(2)}/5`);
  
  console.log(`\n-- Category Pass Rates --`);
  for (const [cat, stat] of Object.entries(categoryStats)) {
    console.log(`${cat}: ${((stat.pass / stat.total) * 100).toFixed(0)}%`);
  }

  console.log(`\n-- Intensity Pass Rates --`);
  for (const [int, stat] of Object.entries(intensityStats)) {
    console.log(`${int}: ${((stat.pass / stat.total) * 100).toFixed(0)}%`);
  }

  if (failures.length > 0) {
    console.log(`\n-- Failures --`);
    failures.forEach(f => {
      console.log(`\n[${f.id}]`);
      f.reasons.forEach(r => console.log(`  - ${r}`));
    });
  } else {
    console.log(`\nAll tests passed successfully!`);
  }
}

report();

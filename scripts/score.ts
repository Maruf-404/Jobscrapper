// Scoring script for evaluating hand-checked tagging accuracy
// PRD Section 10: npm run score

import fs from 'fs';
import path from 'path';

interface HandCheckRow {
  id: string;
  title: string;
  company: string;
  location_raw: string;
  description_snippet: string;
  llm_role: string;
  llm_city: string;
  true_role: string;
  true_city: string;
}

// RFC 4180 compliant CSV line parser
function parseCsvLine(text: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += c;
      }
    }
  }
  result.push(cur.trim());
  return result;
}

async function scoreHandCheck() {
  const samplePath = path.resolve(process.cwd(), 'data/handcheck_sample.csv');

  if (!fs.existsSync(samplePath)) {
    console.error(`[SCORE] Sample CSV not found at ${samplePath}`);
    console.log('Run "npm run export:sample" first to generate the hand-check sample file.');
    process.exit(1);
  }

  const raw = fs.readFileSync(samplePath, 'utf-8');
  const lines = raw.split(/\r?\n/).filter(l => l.trim().length > 0);

  if (lines.length <= 1) {
    console.error('[SCORE] handcheck_sample.csv has no rows to score.');
    process.exit(1);
  }

  const headers = parseCsvLine(lines[0]);
  const rows: HandCheckRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    if (values.length < 9) continue;

    rows.push({
      id: values[0],
      title: values[1],
      company: values[2],
      location_raw: values[3],
      description_snippet: values[4],
      llm_role: values[5],
      llm_city: values[6],
      true_role: values[7],
      true_city: values[8],
    });
  }

  console.log(`\n========================================================`);
  console.log(`[TAGGING ACCURACY SCORECARD]`);
  console.log(`Evaluating ${rows.length} hand-checked posts from: data/handcheck_sample.csv`);
  console.log(`========================================================\n`);

  let roleCorrectCount = 0;
  let cityCorrectCount = 0;
  let bothCorrectCount = 0;

  interface Mistake {
    id: string;
    title: string;
    company: string;
    llmRole: string;
    trueRole: string;
    roleMatch: boolean;
    llmCity: string;
    trueCity: string;
    cityMatch: boolean;
  }

  const mistakes: Mistake[] = [];

  for (const row of rows) {
    const roleMatch = row.llm_role.trim().toLowerCase() === row.true_role.trim().toLowerCase();
    const cityMatch = row.llm_city.trim().toLowerCase() === row.true_city.trim().toLowerCase();

    if (roleMatch) roleCorrectCount++;
    if (cityMatch) cityCorrectCount++;
    if (roleMatch && cityMatch) bothCorrectCount++;

    if (!roleMatch || !cityMatch) {
      mistakes.push({
        id: row.id,
        title: row.title,
        company: row.company,
        llmRole: row.llm_role,
        trueRole: row.true_role,
        roleMatch,
        llmCity: row.llm_city,
        trueCity: row.true_city,
        cityMatch,
      });
    }
  }

  const total = rows.length;
  const roleAccuracy = total > 0 ? ((roleCorrectCount / total) * 100).toFixed(1) : '0';
  const cityAccuracy = total > 0 ? ((cityCorrectCount / total) * 100).toFixed(1) : '0';
  const overallAccuracy = total > 0 ? ((bothCorrectCount / total) * 100).toFixed(1) : '0';

  console.log(`Total Hand-Checked Posts: ${total}`);
  console.log(`--------------------------------------------------------`);
  console.log(`✓ Role Tagging Accuracy:       ${roleCorrectCount}/${total} (${roleAccuracy}%)`);
  console.log(`✓ City Tagging Accuracy:       ${cityCorrectCount}/${total} (${cityAccuracy}%)`);
  console.log(`✓ Overall Accuracy (Both):     ${bothCorrectCount}/${total} (${overallAccuracy}%)`);
  console.log(`--------------------------------------------------------\n`);

  if (mistakes.length > 0) {
    console.log(`Mistakes & Confusion Breakdown (${mistakes.length} occurrences):`);
    console.log(`--------------------------------------------------------`);
    mistakes.forEach((m, idx) => {
      console.log(`[${idx + 1}] "${m.title}" at ${m.company} (ID: ${m.id})`);
      if (!m.roleMatch) {
        console.log(`    ❌ Role Error: LLM predicted "${m.llmRole}" -> True Role "${m.trueRole}"`);
      }
      if (!m.cityMatch) {
        console.log(`    ❌ City Error: LLM predicted "${m.llmCity}" -> True City "${m.trueCity}"`);
      }
    });
  } else {
    console.log('🎉 100% Match! Zero classification discrepancies found between LLM tags and ground truth.');
  }
  console.log(`\n========================================================\n`);
}

scoreHandCheck().catch(err => {
  console.error('[SCORE FATAL]', err);
  process.exit(1);
});

// Run the real check (Gemini included) on a local file, no login or frontend.
//   npx tsx --env-file=.env.local scripts/check-lease.ts test-leases/bad-lease.pdf
// Add --json to print the full API response (handy for mock-result.json).
import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { analyzeLease } from "../lib/analyzeLease";

const MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".heic": "image/heic",
};

// What each test lease should produce. Add files here as you make them.
const EXPECTED: Record<string, string[]> = {
  "bad-lease.pdf": [
    "not_standard_lease", "post_dated_cheques", "illegal_deposit", "no_pets",
    "tenant_repairs", "forced_cleaning", "end_anytime",
  ],
  // Same lease with every illegal clause made legal. It still isn't on the
  // official form, so that one flag is correct.
  "clean-lease.pdf": ["not_standard_lease"],
  "standard-lease.pdf": [], // a flattened copy of the official Ontario form
};

async function main() {
  const path = process.argv[2];
  if (!path) {
    console.error("Usage: npx tsx --env-file=.env.local scripts/check-lease.ts <lease.pdf|photo> [--json]");
    process.exit(1);
  }
  const mime = MIME[extname(path).toLowerCase()];
  if (!mime) throw new Error(`Unsupported file type: ${path}`);

  const started = Date.now();
  const result = await analyzeLease(await readFile(path), mime);
  const seconds = ((Date.now() - started) / 1000).toFixed(1);

  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`\n${result.matches.length} clauses worth asking about  (${seconds}s, ${result.model}, checked against ${result.verifiedAgainst})`);
  console.log(`${result.droppedCount} Gemini quote(s) dropped by the quote check\n`);
  for (const m of result.matches) console.log(`  [${m.rule_id}] "${m.quote}"`);

  const sum = result.summary;
  console.log(`\nSummary: ${sum.headline}  [${sum.verdict}]`);
  console.log(`  ${sum.detail}`);
  sum.questions.forEach((q, i) => console.log(`  Q${i + 1} (${q.level}) ${q.question}`));
  sum.nextSteps.forEach((s) => console.log(`  - ${s}`));

  const name = path.split(/[\\/]/).pop()!;
  const expected = EXPECTED[name];
  if (expected) {
    const got = new Set(result.matches.map((m) => m.rule_id));
    const missed = expected.filter((id) => !got.has(id));
    const extra = [...got].filter((id) => !expected.includes(id));
    console.log(`\nExpected: ${expected.length ? expected.join(", ") : "(nothing)"}`);
    console.log(missed.length || extra.length
      ? `FAIL  missed: ${missed.join(", ") || "none"}  |  false alarms: ${extra.join(", ") || "none"}`
      : "PASS");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

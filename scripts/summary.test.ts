// Run: npx tsx --test scripts/summary.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSummary } from "../lib/summary";
import { RULES } from "../lib/rules";

const ids = (...r: string[]) => r.map((rule_id) => ({ rule_id }));

test("no flags: no_issues, says how many rules were checked", () => {
  const s = buildSummary([]);
  assert.equal(s.verdict, "no_issues");
  assert.match(s.detail, new RegExp(`${RULES.length} common problems`));
  assert.equal(s.questions.length, 0);
});

test("only minor flags: ask_first", () => {
  const s = buildSummary(ids("no_pets", "not_standard_lease"));
  assert.equal(s.verdict, "ask_first");
  assert.deepEqual(s.counts, { total: 2, important: 0, ask: 2 });
  assert.ok(s.nextSteps.some((x) => x.includes("standard form")));
  assert.ok(!s.nextSteps.some((x) => x.includes("Legal Aid")), "no legal-help line for minor flags");
});

test("bad lease flags: talk_before_signing, important questions first, legal help offered", () => {
  const s = buildSummary(ids(
    "not_standard_lease", "post_dated_cheques", "illegal_deposit", "no_pets",
    "tenant_repairs", "forced_cleaning", "end_anytime",
  ));
  assert.equal(s.verdict, "talk_before_signing");
  assert.deepEqual(s.counts, { total: 7, important: 4, ask: 3 });
  assert.deepEqual(s.questions.slice(0, 4).map((q) => q.level), ["important", "important", "important", "important"]);
  assert.ok(s.nextSteps.some((x) => x.includes("Legal Aid Ontario")));
});

test("same rule twice gives one question", () => {
  const s = buildSummary(ids("no_pets", "no_pets"));
  assert.equal(s.questions.length, 1);
  assert.equal(s.counts.total, 2);
});

test("every rule has a valid level", () => {
  for (const r of RULES) assert.ok(r.level === "important" || r.level === "ask", r.id);
});

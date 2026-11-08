// Run: npx tsx --test scripts/quoteCheck.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { findQuote } from "../lib/quoteCheck";
import { RULES } from "../lib/rules";

const lease = `RESIDENTIAL LEASE AGREEMENT
4. Deposits. The Tenant shall pay a damage
   deposit of $500 before move-in.
5. Pets. No pets of any kind are permitted in the Premises at any time.
6. The Landlord’s decision is final — no exceptions.`;

test("finds an exact quote and returns the original span", () => {
  const q = "No pets of any kind are permitted in the Premises at any time.";
  const span = findQuote(lease, q)!;
  assert.ok(span);
  assert.equal(span.text, q);
  assert.equal(lease.slice(span.start, span.end), q);
});

test("ignores line breaks, extra spaces and letter case", () => {
  const span = findQuote(lease, "the tenant shall pay a damage deposit of $500 before move-in.")!;
  assert.ok(span);
  assert.equal(span.text, "The Tenant shall pay a damage\n   deposit of $500 before move-in.");
});

test("treats curly/straight quotes and dash styles as the same", () => {
  assert.ok(findQuote(lease, "The Landlord's decision is final - no exceptions."));
});

test("strips quotation marks Gemini wraps around a quote", () => {
  assert.ok(findQuote(lease, "“No pets of any kind are permitted”"));
});

test("drops a paraphrased quote", () => {
  assert.equal(findQuote(lease, "Tenants may not keep any pets in the Premises."), null);
});

test("drops an invented clause", () => {
  assert.equal(findQuote(lease, "The Landlord may enter the unit at any time without notice."), null);
});

test("drops a quote with an ellipsis that skips words", () => {
  assert.equal(findQuote(lease, "The Tenant shall pay ... $500 before move-in."), null);
});

test("drops quotes too short to prove anything", () => {
  assert.equal(findQuote(lease, "pets"), null);
});

test("rules.json has the agreed ids and every field filled in", () => {
  const ids = RULES.map((r) => r.id);
  for (const id of [
    "illegal_deposit", "no_pets", "tenant_repairs", "not_standard_lease",
    "post_dated_cheques", "end_anytime", "rent_increase", "forced_cleaning",
  ]) {
    assert.ok(ids.includes(id), `missing rule ${id}`);
  }
  assert.equal(new Set(ids).size, ids.length, "duplicate rule ids");
  for (const r of RULES) {
    for (const [k, v] of Object.entries(r)) assert.ok(String(v).trim(), `${r.id}.${k} is empty`);
    assert.match(r.source_url, /^https:\/\//);
  }
});

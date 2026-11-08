// Offline test of everything except the Gemini call: reads the real text
// layer of test-leases/bad-lease.pdf and feeds in a fake Gemini answer.
// Run: npx tsx --test scripts/pipeline.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { extractPdfText, isInteractiveFormPlaceholder, verifyMatches } from "../lib/analyzeLease";

test("bad lease: real quotes are kept, made-up and unknown ones dropped", async () => {
  const pdf = await readFile(new URL("../test-leases/bad-lease.pdf", import.meta.url));
  const text = await extractPdfText(new Uint8Array(pdf));
  assert.ok(text && text.length > 1000, "PDF text layer should be readable");

  // What a good Gemini answer looks like, plus two bad entries.
  const fakeGemini = [
    { rule_id: "no_pets", quote: "No pets of any kind are permitted in the Premises at any time." },
    { rule_id: "illegal_deposit", quote: "The Tenant shall also pay a damage deposit of $500.00, which will be returned at the end of the tenancy less any deductions the Landlord considers reasonable." },
    { rule_id: "post_dated_cheques", quote: "The Tenant shall provide twelve (12) post-dated cheques for the full year of rent before moving in." },
    { rule_id: "tenant_repairs", quote: "The Tenant is responsible for the cost of all repairs to the Premises, including plumbing, heating and appliances." },
    { rule_id: "forced_cleaning", quote: "Upon moving out, the Tenant must pay for a professional cleaning service chosen by the Landlord." },
    { rule_id: "end_anytime", quote: "The Landlord may terminate this Lease at any time and for any reason by giving the Tenant fourteen (14) days' notice." },
    { rule_id: "not_standard_lease", quote: "RESIDENTIAL LEASE AGREEMENT" },
    { rule_id: "no_pets", quote: "No pets of any kind are permitted in the Premises at any time." }, // duplicate
    { rule_id: "guest_ban", quote: "Overnight guests are not permitted without the Landlord's written consent." }, // invented
    { rule_id: "made_up_rule", quote: "No pets of any kind are permitted in the Premises at any time." }, // unknown rule
  ];

  const { matches, droppedCount } = verifyMatches(text!, fakeGemini);
  assert.deepEqual(
    matches.map((m) => m.rule_id),
    ["not_standard_lease", "post_dated_cheques", "illegal_deposit", "no_pets", "tenant_repairs", "forced_cleaning", "end_anytime"],
  );
  assert.equal(droppedCount, 2);
  for (const m of matches) {
    assert.equal(text!.slice(m.start, m.end), m.quote, "quote must be an exact slice of leaseText");
    assert.ok(m.explanation && m.question && m.source_url.startsWith("https://"));
  }
});

test("spots the Adobe interactive-form placeholder, but not a real lease", async () => {
  const placeholder = "Please wait...\nIf this message is not eventually replaced by the proper contents of the document, your PDF viewer may not be able to display this type of document.\nYou can upgrade to the latest version of Adobe Reader for Windows, Mac, or Linux by visiting http://www.adobe.com/go/reader_download.";
  assert.equal(isInteractiveFormPlaceholder(placeholder), true);
  for (const name of ["bad-lease.pdf", "clean-lease.pdf"]) {
    const pdf = await readFile(new URL(`../test-leases/${name}`, import.meta.url));
    const text = await extractPdfText(new Uint8Array(pdf));
    assert.equal(isInteractiveFormPlaceholder(text!), false, name);
  }
});

// The final summary shown at the top of the results. Built by the code from
// the verified flags and rules.json, never written by Gemini, so it can only
// say what the checks actually found.
import { RULES, getRule, type RuleLevel } from "./rules";

export type Verdict = "no_issues" | "ask_first" | "talk_before_signing";

export type Summary = {
  verdict: Verdict;
  headline: string; // one line, e.g. "Talk to your landlord before you sign"
  detail: string; // 1-2 plain-English sentences
  counts: { total: number; important: number; ask: number };
  // Every question to ask the landlord, one per flagged rule, most important first.
  questions: { rule_id: string; name: string; level: RuleLevel; question: string }[];
  nextSteps: string[];
  disclaimer: string;
};

type FlagLike = { rule_id: string };

const LEGAL_HELP =
  "For advice about your situation, contact a community legal clinic through Legal Aid Ontario (1-800-668-8258) or the Landlord and Tenant Board (1-888-332-3234).";

export function buildSummary(matches: FlagLike[]): Summary {
  // One entry per rule, even if a rule matched several clauses.
  const seen = new Set<string>();
  const rules = [];
  for (const m of matches) {
    const rule = getRule(m.rule_id);
    if (!rule || seen.has(rule.id)) continue;
    seen.add(rule.id);
    rules.push(rule);
  }
  // Important first, then lease order.
  rules.sort((a, b) => Number(b.level === "important") - Number(a.level === "important"));

  const important = rules.filter((r) => r.level === "important");
  const ask = rules.filter((r) => r.level === "ask");
  const total = matches.length;
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

  let verdict: Verdict;
  let headline: string;
  let detail: string;

  if (rules.length === 0) {
    verdict = "no_issues";
    headline = "No problems found in the clauses we check";
    detail = `LeaseCheck looked for ${RULES.length} common problems in Ontario leases and didn't find any. It can't catch everything, so still read the whole lease before you sign.`;
  } else if (important.length === 0) {
    verdict = "ask_first";
    headline = "A few things to ask about before you sign";
    detail =
      `We found ${plural(total, "clause")} worth asking about: ${listNames(ask)}. ` +
      (total === 1
        ? "It's unlikely to cost you money, but clearing it up now avoids arguments later."
        : "They're unlikely to cost you money, but clearing them up now avoids arguments later.");
  } else {
    verdict = "talk_before_signing";
    headline = "Talk to your landlord before you sign";
    detail =
      `We found ${plural(important.length, "clause")} that could cost you money or affect your rights: ${listNames(important)}.` +
      (ask.length ? ` There ${ask.length === 1 ? "is" : "are"} also ${plural(ask.length, "smaller thing")} to ask about.` : "");
  }

  const nextSteps: string[] = [];
  if (rules.length > 0) {
    nextSteps.push("Send your landlord the questions below by email or text, so you have their answers in writing.");
    nextSteps.push("Ask for any clause they agree to drop to be removed from the lease before you sign it.");
  }
  if (seen.has("not_standard_lease")) {
    nextSteps.push("Ask for the lease on Ontario's standard form. If you ask in writing, the landlord has 21 days to give you one.");
  }
  if (important.length > 0) nextSteps.push(LEGAL_HELP);
  if (rules.length === 0) nextSteps.push("Keep a signed copy of the lease for your records.");

  return {
    verdict,
    headline,
    detail,
    counts: { total, important: important.length, ask: ask.length },
    questions: rules.map((r) => ({ rule_id: r.id, name: r.name, level: r.level, question: r.question })),
    nextSteps,
    disclaimer:
      "This is not legal advice. LeaseCheck flags clauses worth asking about and links to official sources, but it can miss things.",
  };
}

/** "a, b and c", lower-cased rule names. */
function listNames(rules: { name: string }[]): string {
  const names = rules.map((r) => r.name.charAt(0).toLowerCase() + r.name.slice(1));
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

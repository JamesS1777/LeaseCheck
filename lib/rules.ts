// The only rules LeaseCheck can flag. Gemini picks rule ids from this list;
// every explanation, question and source shown to the user comes from here.
import rulesData from "../data/rules.json";

/**
 * important: could cost the tenant money or affect their home or privacy.
 * ask: void, but less likely to hurt; still worth raising before signing.
 */
export type RuleLevel = "important" | "ask";

export type Rule = {
  id: string;
  name: string;
  level: RuleLevel;
  what_to_flag: string;
  explanation: string;
  question: string;
  source_name: string;
  source_url: string;
};

export const RULES: Rule[] = rulesData as Rule[];

export const RULE_IDS: string[] = RULES.map((r) => r.id);

const byId = new Map(RULES.map((r) => [r.id, r]));

export function getRule(id: string): Rule | undefined {
  return byId.get(id);
}

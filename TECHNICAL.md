# LeaseCheck: technical documentation

LeaseCheck reads an Ontario rental lease (PDF or photo) and flags clauses that may break tenant rules. **Gemini finds and quotes matches; the code decides what the user sees.** Not legal advice.

## Stack

| Part | Tool | Why |
|---|---|---|
| App | Next.js (App Router, TypeScript) | Pages and API routes in one project |
| Login | Auth0 (`@auth0/nextjs-auth0` v4): Google sign-in, MFA | Leases hold names, addresses and signatures, so every check needs a signed-in user |
| Reading the lease | Gemini API, Flash model, via `@google/genai` | Reads PDFs and photos directly, no separate OCR step |
| Structured output | Gemini `responseJsonSchema` with an `enum` of rule ids | Gemini can only answer with ids that exist in `rules.json` |
| PDF text layer | `unpdf` | Gives the quote check text the AI didn't write |
| Rules | `data/rules.json` | The only rules the app can flag, each with an official source |
| Read-aloud | Browser Web Speech API | Free, built into the browser |

## How a lease gets checked

1. The browser sends the file to `POST /api/check` as multipart form data (field `file`). The route rejects anyone without an Auth0 session, then checks the file type (PDF, JPG, PNG, WEBP, HEIC) and size (15 MB max).
2. For PDFs, `analyzeLease()` in `lib/analyzeLease.ts` first reads the PDF's own text layer with `unpdf` (well under a second).
3. It sends the file to Gemini as inline data (base64 + MIME type) with the prompt in `lib/prompt.ts`, at temperature 0, constrained by a JSON schema. The prompt lists only each rule's `id`, `name` and `what_to_flag`. Gemini returns `{ matches: [{ rule_id, quote }] }`. Only when there is no usable text layer (photos, scanned PDFs) does Gemini also return `leaseText`, a transcript of the page. Skipping the transcript for normal PDFs is what keeps a check fast.
   - **Backup models:** if the main model is overloaded, rate-limited or unavailable, the same request goes to the next model in the list (default: `gemini-3.8-flash`, then `gemini-3.6-flash`, then `gemini-3.1-flash-lite`).
4. **The quote check** (`lib/quoteCheck.ts`). Every quote must be found in the lease text, or it is dropped:
   - It checks against the PDF's own text layer when there is one (`verifiedAgainst: "pdf_text"`), so a made-up clause can't pass just because Gemini also wrote it into its transcript. Photos and scanned PDFs have no text layer, so those fall back to Gemini's transcript (`"gemini_transcript"`).
   - Matching ignores only spacing, line breaks, letter case, curly vs straight quotes and dash styles. A paraphrase, an invented clause, a quote with "..." or an unknown rule id fails.
   - Quotes under 12 characters are rejected as too short to prove anything.
   - A kept quote is returned exactly as it appears in `leaseText`, with `start`/`end` positions, so the frontend can highlight it directly.
5. For each kept match, the code attaches the plain-English explanation, the question to ask the landlord and the source link from `rules.json`. **Gemini never writes what the user reads.**
6. The response reports `droppedCount`, the number of Gemini quotes that failed the check.

### Response shape

```json
{
  "leaseText": "Full text of the lease...",
  "matches": [
    {
      "rule_id": "illegal_deposit",
      "quote": "The Tenant shall also pay a damage deposit of $500.00, ...",
      "name": "Deposit that isn't allowed",
      "explanation": "In Ontario, a landlord can only ask for two deposits: ...",
      "question": "Ontario only allows a last month's rent deposit and a refundable key deposit. Can we remove this deposit from the lease?",
      "source_url": "https://www.ontario.ca/page/guide-ontarios-standard-lease",
      "source_name": "Guide to Ontario's standard lease (ontario.ca)",
      "start": 931,
      "end": 1089
    }
  ],
  "droppedCount": 0,
  "verifiedAgainst": "pdf_text",
  "model": "gemini-3.8-flash"
}
```

`source_name`, `start`, `end`, `verifiedAgainst` and `model` are additions to the agreed shape; the rest is unchanged. Matches are in lease order.

## Rules

Ten rules, all checked against official sources (ontario.ca, the Residential Tenancies Act and CLEO):

| id | Flags |
|---|---|
| `illegal_deposit` | Damage, pet, security or cleaning deposits; oversized key or rent deposits |
| `no_pets` | Pet bans (condo rules are the exception) |
| `tenant_repairs` | Tenant pays for repairs that are the landlord's job |
| `not_standard_lease` | Lease isn't on the Ontario Standard Form of Lease |
| `post_dated_cheques` | Required post-dated cheques or automatic payments |
| `end_anytime` | Landlord can end the tenancy whenever |
| `rent_increase` | Automatic or above-guideline increases (2.1% for 2026, 1.9% for 2027) |
| `forced_cleaning` | Required professional cleaning or cleaning fees |
| `landlord_entry` | Entry without 24 hours' written notice, or outside 8 a.m.–8 p.m. |
| `guest_ban` | Bans or limits on guests |

Each rule's `what_to_flag` also says what **not** to flag (for example, a tenant paying for damage they caused is legal), which keeps false alarms down.

## Accuracy and safety

- **"What if the AI is wrong?"** It can only match rules we wrote, every quote is verified against the lease text, and every explanation comes from our rules file, not the AI.
- **Prompt injection:** the prompt tells Gemini to treat the lease as data. Even if a lease contained instructions, the schema only allows known rule ids and the quote check only allows text that is really in the lease.
- **Privacy:** the Gemini key stays on the server. Free-tier prompts may be used to improve Google's models, so we test only with fake leases.

## Testing

| Command | What it checks |
|---|---|
| `npx tsx --test scripts/*.test.ts` | Quote check (paraphrases, invented clauses and ellipses are dropped) and the full pipeline on the real PDF text layer, without calling Gemini |
| `npx tsx --env-file=.env.local scripts/check-lease.ts test-leases/bad-lease.pdf` | Live run with Gemini; prints PASS/FAIL against the expected flags |
| Same command on `test-leases/standard-lease.pdf` | False-alarm test: the official Ontario Standard Lease should raise nothing |

`test-leases/bad-lease.pdf` is a fictional 2-page lease with 6 planted illegal clauses and 5 legal decoys (rent deposit, key deposit, tenant pays for damage they cause, 24-hour entry notice, keeping the unit clean). Expected result: the 6 planted clauses plus `not_standard_lease`. Rebuild it with `python3 scripts/make_test_lease.py`.

## Configuration

| Variable | Required | Notes |
|---|---|---|
| `GEMINI_API_KEY` | Yes | From aistudio.google.com |
| `GEMINI_MODEL` | No | Main model. Defaults to `gemini-3.8-flash` |
| `GEMINI_FALLBACK_MODELS` | No | Comma-separated backups, tried in order if the main model fails. Defaults to `gemini-3.6-flash,gemini-3.1-flash-lite` |

## Limits and future work

- Ontario only, ten rules. Next: more rules (late fees, subletting), other provinces.
- Photos are checked against Gemini's own transcript, which is weaker than a PDF's text layer. A local OCR step would close that gap.
- Rent increase checks can't know when a unit was first occupied, so that card asks the tenant to find out.

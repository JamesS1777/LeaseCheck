# LeaseCheck frontend (James)

Drop these into Arya's repo on the `james` branch. Paths match a default `create-next-app` (TypeScript, App Router, no `src/`, `@/*` alias).

```
app/leasecheck.css          all styles (light, dark, high contrast)
app/page.tsx                renders <LeaseCheckApp /> — Arya adds the Auth0 check here
components/LeaseCheckApp.tsx  upload → loading → results flow, top bar
components/UploadForm.tsx     PDF/photo picker, drag-and-drop, type + 10 MB check
components/LoadingState.tsx   ~30 s progress steps (announced to screen readers)
components/ResultsView.tsx    summary line, highlighted lease, flag cards
components/FlagCard.tsx       quote, meaning, question, source link, read-aloud
components/useReadAloud.ts    Web Speech API, one card at a time
components/ContrastToggle.tsx high-contrast toggle (remembered per browser)
components/Disclaimer.tsx     "Not legal advice" box
lib/types.ts                  the shared JSON shape
lib/checkLease.ts             calls /api/check, or returns the mock
lib/highlight.ts              finds each quote in the lease text for <mark>
mock-result.json              fake result for the 6-clause test lease
```

## Wiring it up

1. In `app/layout.tsx`, add `import "./leasecheck.css";`. Delete the default `globals.css` import (its styles fight ours). Set `<html lang="en-CA">`.
2. **Arya:** in `app/page.tsx`, show `<LeaseCheckApp account={...} />` only to signed-in users. Pass the user's name and a sign-out link as `account`; it appears in the top bar.
3. **Sync point 3 (real API):** add `NEXT_PUBLIC_USE_MOCK=false` to `.env.local`. `checkLease` then POSTs `FormData` with field **`file`** to `/api/check` and expects the shared JSON shape. A `401` shows "Your session expired. Sign in again."

## What's covered

- Summary line ("6 clauses worth asking about"), and a clean-lease message when there are no matches
- Highlights numbered to match cards; clicking a highlight scrolls to and focuses its card, "Show in lease" goes back
- Cards sorted in lease order
- Read-aloud button on each card (press again to stop)
- 18px base text, high-contrast toggle, skip link, every control reachable by Tab, aria-labels on icon buttons, focus moves to the summary when results load
- Disclaimer on the upload page and twice on results (top and bottom)
- `droppedCount` shown as a small line, never as a flag (good talking point for "what if the AI is wrong?")

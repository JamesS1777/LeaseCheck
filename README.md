# LeaseCheck

Upload your lease, and in 30 seconds you know what's sketchy and what to ask your landlord.
Built for HackTrent 2026.

> **Not legal advice.** LeaseCheck flags clauses worth asking about and links to official sources.

## Stack

| Part | Tool |
| --- | --- |
| App | Next.js 16 (App Router, TypeScript), one app for pages and API |
| Login | Auth0 (`@auth0/nextjs-auth0` v4): Google sign-in, MFA, per-user privacy |
| Reading the lease | Gemini API, Flash model (`@google/genai`) |
| Rules | `rules.json` — the only rules the app can flag |

## Who owns what

| Path | Owner | What it does |
| --- | --- | --- |
| `components/*`, `app/leasecheck.css`, `lib/checkLease.ts`, `lib/highlight.ts`, `mock-result.json` | James | Upload, loading and results UI; browser-side call to `/api/check` |
| `app/page.tsx` | Arya | Sign-in gate: signed-out users see "Sign in with Google", signed-in users get `<LeaseCheckApp />` |
| `lib/auth0.ts`, `proxy.ts` | Arya | Auth0 client and auth routes (`/auth/login`, `/auth/logout`, `/auth/callback`) |
| `app/api/check/route.ts`, `lib/fileCheck.ts` | Arya | Rejects signed-out users, checks real file type and size, calls `analyzeLease()` |
| `lib/analyzeLease.ts` | Samuel | Gemini call, quote check, attaching rules (returns the mock until done) |
| `lib/types.ts` | Everyone | The shared JSON shape. Don't change it without telling the team |

## Run it locally

Needs Node 20 or newer.

```bash
git clone <repo-url> leasecheck
cd leasecheck
npm install
cp .env.example .env.local   # then fill in the values (see below)
npm run dev
```

Open http://localhost:3000 and click **Sign in with Google**.

### Environment variables

Put these in `.env.local`. **Never commit `.env.local`** (it's already in `.gitignore`).

| Name | Where to get it |
| --- | --- |
| `AUTH0_DOMAIN` | Auth0 dashboard → Applications → LeaseCheck → Settings → Domain |
| `AUTH0_CLIENT_ID` | Same page → Client ID |
| `AUTH0_CLIENT_SECRET` | Same page → Client Secret |
| `AUTH0_SECRET` | Run `openssl rand -hex 32` (any 64-character hex string) |
| `APP_BASE_URL` | `http://localhost:3000` locally |
| `GEMINI_API_KEY` | aistudio.google.com → Get API key → Create API key |
| `NEXT_PUBLIC_USE_MOCK` | `true` = UI uses `mock-result.json` with no server call. `false` = UI calls the real `/api/check` |

Teammates can share one Auth0 app. Send the values privately (DM), never in the repo or a group chat screenshot.

## Auth0 setup (one time, Arya)

1. Sign up free at auth0.com and create a tenant.
2. **Applications → Create Application** → name it `LeaseCheck` → **Regular Web Application**.
3. In **Settings**, set:
   - **Allowed Callback URLs:** `http://localhost:3000/auth/callback`
   - **Allowed Logout URLs:** `http://localhost:3000`
   - Click **Save**.
4. **Connections tab** of the app: make sure **google-oauth2** is turned on. (Auth0's built-in Google dev keys work for the demo; add your own Google client ID later if you see the "dev keys" warning.)
5. Copy Domain, Client ID and Client Secret into `.env.local`.
6. **Done when:** you click **Sign in with Google** and the top bar says "Hi, *your name*" with a Sign out button.

### Turn on MFA

Auth0 dashboard → **Security → Multi-factor Auth** → turn on **One-time Password** → under **Require Multi-factor Auth**, choose **Always**. Next sign-in will ask you to scan a QR code with an authenticator app (Google Authenticator, Authy, 1Password).

## The API

`POST /api/check` with `multipart/form-data`, file field named **`file`** (what James's `lib/checkLease.ts` sends).

| Status | Meaning |
| --- | --- |
| 200 | Success. Body is a `CheckResult` (see `lib/types.ts`) |
| 400 | No file, empty file, or not a PDF/JPG/PNG/WEBP/HEIC |
| 401 | Not signed in |
| 413 | File too big (10 MB locally, 4 MB on Vercel) |
| 502 | The AI check failed. Try again |

Error bodies look like `{ "error": "plain-English message" }`, safe to show to users.

The route checks a file's real type from its first bytes, not its name, so a renamed `.txt` can't get through.

## Deploy to Vercel (optional)

Running locally is fine for the demo. To deploy:

1. vercel.com → **Add New → Project** → import the GitHub repo.
2. Add every variable from `.env.local`, but set `APP_BASE_URL` to the Vercel URL (e.g. `https://leasecheck.vercel.app`).
3. Deploy, then in Auth0 add `https://<your-url>/auth/callback` to **Allowed Callback URLs** and `https://<your-url>` to **Allowed Logout URLs**.

Note: Vercel caps uploads at 4.5 MB, so the app limits files to 4 MB there.

## Domain (GoDaddy Registry prize)

Get a free code at the MLH table, register a name like `leasecheck.ca` or `leasecheck.tech`, then in Vercel → Project → **Settings → Domains** add it. Update `APP_BASE_URL` and the Auth0 callback/logout URLs to the new domain.

## Team git workflow

One branch each (`samuel`, `arya`, `james`). Merge into `main` at each sync point.

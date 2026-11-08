// Owner: Arya — Next.js 16 "proxy" (the old middleware.ts).
// Mounts Auth0's routes (/auth/login, /auth/logout, /auth/callback, /auth/profile)
// and keeps sessions rolling. Page/route protection lives in each page and in
// /api/check itself, so a missing proxy can never leave a route open.
import { auth0 } from "./lib/auth0";

export async function proxy(request: Request) {
  return await auth0.middleware(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};

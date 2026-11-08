
import { Suspense } from "react";
import { auth0 } from "@/lib/auth0";
import LeaseCheckApp from "@/components/LeaseCheckApp";
import Disclaimer from "@/components/Disclaimer";
import ContrastToggle from "@/components/ContrastToggle";

function SignedOut() {
  return (
    <>
      <a href="#main" className="lc-skip">Skip to main content</a>
      <header className="lc-topbar">
        <div className="lc-wrap lc-topbar-inner">
          <p className="lc-logo">
            <span aria-hidden="true">✓</span> LeaseCheck
          </p>
          <div className="lc-topbar-actions">
            <ContrastToggle />
          </div>
        </div>
      </header>
      <main id="main" className="lc-wrap">
        <section className="lc-hero" aria-labelledby="hero-title">
          <h1 id="hero-title">Know what you&apos;re signing before you sign it.</h1>
          <p className="lc-lede">
            Upload your rental lease. In about 30 seconds, LeaseCheck flags clauses that may break
            Ontario tenant rules and tells you what to ask your landlord.
          </p>
          <p className="lc-lede">
            Leases have your name, address and signature, so sign in first. Your leases stay
            private to your account.
          </p>
          {/* Plain <a>, not <Link>, so Next doesn't prefetch the login route. */}
          <a className="lc-btn lc-btn-primary lc-btn-big" href="/auth/login?connection=google-oauth2">
            Sign in with Google
          </a>
          <Disclaimer />
        </section>
      </main>
    </>
  );
}

async function Gate() {
  const session = await auth0.getSession();
  if (!session) return <SignedOut />;

  const name = session.user.given_name ?? session.user.name ?? session.user.email;
  return (
    <LeaseCheckApp
      account={
        <>
          <span>Hi, {name}</span>
          <a className="lc-btn lc-btn-quiet" href="/auth/logout">
            Sign out
          </a>
        </>
      }
    />
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <main className="lc-wrap">
          <p className="lc-lede">Loading…</p>
        </main>
      }
    >
      <Gate />
    </Suspense>
  );
}

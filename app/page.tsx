import LeaseCheckApp from "@/components/LeaseCheckApp";

// Arya: wrap this with the Auth0 session check. Signed-out users should see a
// "Sign in with Google" button instead. Pass the user's name + sign-out link as `account`.
export default function Home() {
  return <LeaseCheckApp />;
}

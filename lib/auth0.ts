// Owner: Arya — Auth0 client, used everywhere we need the logged-in user.
// Reads AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, AUTH0_SECRET and
// APP_BASE_URL from .env.local (see .env.example).
import { Auth0Client } from "@auth0/nextjs-auth0/server";

export const auth0 = new Auth0Client({
  authorizationParameters: {
    // openid/profile/email gives us the user's name and email for the UI.
    scope: "openid profile email",
  },
});

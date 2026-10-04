import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { Pool } from "pg";

import { assertEnv, databaseUrl } from "./env";

// Fail fast and legibly if the secrets were not injected (e.g. `next dev` run
// outside `infisical run`). Better Auth needs the secret to sign sessions. The
// database URL is resolved by `databaseUrl()`, which prefers `DATABASE_URL` and
// accepts the `POSTGRES_URL` Vercel's Postgres integration injects.
assertEnv(["BETTER_AUTH_SECRET"]);

export const auth = betterAuth({
  database: new Pool({
    connectionString: databaseUrl(),
  }),
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      // Edvance workspaces are addressed by the learner's email.
      // Built-in `name` is used for display; email stays the stable key.
    },
  },
  plugins: [nextCookies()], // must be last so server actions can set cookies
});

import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { Pool } from "pg";

import { assertEnv, requiredEnv } from "./env";

// Fail fast and legibly if the secrets were not injected (e.g. `next dev` run
// outside `infisical run`). Better Auth needs the secret to sign sessions.
assertEnv(["DATABASE_URL", "BETTER_AUTH_SECRET"]);

export const auth = betterAuth({
  database: new Pool({
    connectionString: requiredEnv("DATABASE_URL"),
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

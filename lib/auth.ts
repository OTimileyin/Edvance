import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { Pool } from "pg";

export const auth = betterAuth({
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
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

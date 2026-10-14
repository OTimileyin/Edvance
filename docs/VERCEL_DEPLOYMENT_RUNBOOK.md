# Deploying Oyevolve to Vercel

A first-time deployer's runbook. Follow it top to bottom; every command and click
is named exactly. Total time: about 20 minutes, most of it waiting on builds.

**This deployment already exists and is Oyevolve's primary one:** <https://oyevolve.vercel.app>,
project `oyevolve` (`prj_mlviOKz6aPa1Dmqly0aGS9Iu9tEY`), production branch `main`, verified at
**70 passed / 0 failed**. Specific at <https://white-whale.spcf.app> is the **backup**. Read this
runbook to rebuild the Vercel target from scratch — after a project deletion, or to stand up a
third environment — or as the reference for its settings. The two deployments share integration keys
but have separate databases and separate session secrets, so rotating or breaking one never affects
the other.

- Repository: <https://github.com/OTimileyin/Oyevolve> (public, `main`)
- Framework: Next.js (App Router), detected automatically by Vercel
- Database: Vercel Postgres (Neon-backed), created in the dashboard
- Build command: `node scripts/migrate.mjs && next build` (from `vercel.json`)
- Health probe: `/api/health`
- Production branch: `main` — a merge to `main` deploys; no manual step is needed

---

## Prerequisites

- A **Vercel account** (the free Hobby plan is enough). Sign up with the same
  GitHub account that can see `OTimileyin/Oyevolve`.
- The repository pushed and **public** — a fresh clone must contain
  `db/migrations/0000_better_auth.sql` or auth tables cannot be created.
- Local: Node.js, and the **Infisical CLI** authenticated and linked to the
  `oyevolve` project (the same setup `npm run dev` uses — see
  [README.md](../README.md#secrets-infisical)).
- No Vercel CLI and no `vercel login` are needed. Everything below is done in the
  browser dashboard.

> **The bare name `oyevolve` is already taken — by this project.** A live project named `oyevolve`
> owns <https://oyevolve.vercel.app>, so a _new_ import cannot reuse that name and must pick another
> (`oyevolve-app`, say) — which means a different URL, and a `BETTER_AUTH_URL` to match. The old
> domain `edvance.vercel.app` belongs to a different account entirely: do not name anything `edvance`.
> To reuse the real name you must either work in the existing project or delete it first.

---

## Step 1 — Export the environment values

The app reads its configuration from environment variables. Generate the Vercel
set from the same Infisical `dev` environment the Specific deployment uses:

```bash
infisical run --env=dev -- node scripts/export-vercel-env.mjs
```

This writes **`.env.vercel.local`** (gitignored — never commit it). It contains a
freshly generated `BETTER_AUTH_SECRET`, the Gemini and Supabase keys, and a
pinned `GEMINI_MODEL`. It deliberately omits the database URL, because Vercel's
Postgres integration injects that itself. Open the file; you will paste its
values in Step 3.

---

## Step 2 — Import the repository

1. Go to <https://vercel.com/new>.
2. Under **Import Git Repository**, choose `OTimileyin/Oyevolve`. If it is not
   listed, click **Adjust GitHub App Permissions** and grant access.
3. **Project Name**: enter your chosen name. `oyevolve` is taken by the live project, so pick a
   different one unless you are rebuilding that project in place.
4. **Framework Preset**: leave as **Next.js** (auto-detected). Do not change the
   build settings — `vercel.json` supplies the build command.
5. **Do not click Deploy yet.** Expand **Environment Variables** first (Step 3).

---

## Step 3 — Add the environment variables

In the import screen (or later under **Project → Settings → Environment
Variables**), add each variable from `.env.vercel.local`, and **set every one for
Production, Preview and Development**.

| Variable                  | Value                    | Notes                                  |
| ------------------------- | ------------------------ | -------------------------------------- |
| `GEMINI_API_KEY`          | from `.env.vercel.local` | Server-only; AI analysis and practice. |
| `SUPABASE_URL`            | from `.env.vercel.local` | Private object storage.                |
| `SUPABASE_SECRET_KEY`     | from `.env.vercel.local` | Server-only service key.               |
| `SUPABASE_STORAGE_BUCKET` | from `.env.vercel.local` | e.g. `edvance-materials`.              |
| `GEMINI_MODEL`            | `gemini-3-flash-preview` | Pinned, matching Specific.             |
| `BETTER_AUTH_SECRET`      | from `.env.vercel.local` | Signs sessions. Keep it secret.        |
| `BETTER_AUTH_URL`         | **leave unset for now**  | Set in Step 5, once the URL exists.    |

**Do not set `DATABASE_URL`.** The Vercel Postgres integration (Step 4) injects
the connection string automatically. Oyevolve accepts it under either
`DATABASE_URL` or `POSTGRES_URL`, so you do not need to name it yourself.

Click **Deploy**.

---

## Step 4 — Expect the first deploy to fail (this is normal)

There is no database yet, so the build command — which applies migrations before
building — stops at the migrate step with a message like:

```
No database connection string is set. Set one of: DATABASE_URL_UNPOOLED,
POSTGRES_URL_NON_POOLING, DATABASE_URL, POSTGRES_URL, POSTGRES_PRISMA_URL.
```

That is the intended, honest failure: Oyevolve refuses to build a deployment it
knows cannot reach a database. Create one now.

1. Open the project → **Storage** tab.
2. **Create Database** → choose **Postgres** (Neon-backed). Pick the free plan and
   the region closest to you.
3. Name it (e.g. `oyevolve-db`) and **Connect** it to this project, for all
   environments.
4. Vercel injects the connection variables into the project.

> **Variable-name check.** In the integration's env-var list, confirm a pooled
> connection (`POSTGRES_URL` or `DATABASE_URL`) is present. Oyevolve prefers a
> pooled URL at runtime and a direct one (`POSTGRES_URL_NON_POOLING` /
> `DATABASE_URL_UNPOOLED`) for migrations, and falls back across all of them. If
> somehow only a non-pooling URL exists, the app still runs.

---

## Step 5 — Set `BETTER_AUTH_URL` and redeploy

Sessions and the CSRF origin check need the app's own public URL.

1. Copy the deployment URL from the project overview, e.g.
   `https://oyevolve.vercel.app` (no trailing slash).
2. **Settings → Environment Variables** → add `BETTER_AUTH_URL` with that exact
   value, for **Production, Preview and Development**.
3. **Deployments → ⋯ → Redeploy** (uncheck "use existing build cache" so the new
   value is baked in).

This time the build runs `node scripts/migrate.mjs` against the new Postgres —
applying all eight migrations — and then `next build`. It should succeed.

---

## Step 6 — Verify the deployment

**Health probe** — this is the fastest proof:

```bash
curl -s https://<your-url>.vercel.app/api/health
```

Expected (**HTTP 200**):

```json
{
  "status": "ok",
  "database": "ok",
  "integrations": { "ai": "configured", "storage": "configured", "email": "not-configured" },
  "time": "..."
}
```

`email: "not-configured"` is correct — `RESEND_API_KEY` is deliberately unset, and
the app reports that honestly rather than pretending email works. `status:
"degraded"` or `database: "error"` means the Postgres wiring is wrong (revisit
Step 4).

**Security headers** — confirm the app's headers survived the platform:

```bash
curl -sI https://<your-url>.vercel.app/ | grep -iE 'content-security-policy|x-frame-options|strict-transport-security'
```

**Full end-to-end suite** — the same 70 checks the primary deployment passes,
run against Vercel:

```bash
npm run verify:remote -- https://<your-url>.vercel.app
```

It signs up throwaway learners over HTTP, exercises the whole journey (upload →
ingestion → course analysis → assessment check → mastery → targeted revision),
checks cross-learner isolation and secret non-exposure, then deletes what it
created. Expect **`70 passed, 0 failed`**.

> The Gemini free tier allows **20 requests/day/model**. If the AI checks fail
> with a rate-limit summary, the suite retries automatically a few times; if it
> still fails, run it again later rather than assuming a bug.

---

## Troubleshooting

| Symptom                                                                                          | Cause                                                                                                               | Fix                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build fails: "No database connection string is set"                                              | No database connected yet, or env scoped to the wrong environment                                                   | Complete Step 4; confirm the Postgres vars are set for **Production**.                                                                                                |
| Build fails: "Missing required environment variable BETTER_AUTH_SECRET"                          | Env vars not applied to the environment being built                                                                 | Add it for Production **and** Preview; redeploy.                                                                                                                      |
| Health returns `database: "error"`                                                               | Bad/paused Postgres, or migrations never ran                                                                        | Recheck the integration; redeploy so the migrate step runs.                                                                                                           |
| Sign-up or sign-in fails, origin errors                                                          | `BETTER_AUTH_URL` unset or not equal to the deployment URL                                                          | Set it to the exact URL (no trailing slash) and redeploy.                                                                                                             |
| Works on Production but not Preview                                                              | Preview URLs differ from `BETTER_AUTH_URL`                                                                          | Set `BETTER_AUTH_URL` per the URL you are testing, or accept Production-only auth.                                                                                    |
| `ai`/`storage` show `not-configured`                                                             | Missing/invalid integration keys                                                                                    | Re-add `GEMINI_API_KEY` / Supabase vars, then redeploy.                                                                                                               |
| Custom domain added                                                                              | `BETTER_AUTH_URL` still points at `*.vercel.app`                                                                    | Update `BETTER_AUTH_URL` to the custom domain and redeploy.                                                                                                           |
| Build fails: `Error: self-signed certificate in certificate chain` (`SELF_SIGNED_CERT_IN_CHAIN`) | The `uselibpqcompat=true` shim is missing — usually a build of a branch without `lib/db-url.mjs`, or a revert of it | Confirm `lib/db-url.mjs` exists and `scripts/migrate.mjs` calls `withLibpqSslCompat`; merge or redeploy. This failed four consecutive `main` builds before `64b115c`. |
| Preview builds fail with "No database connection string is set"                                  | The Postgres variables are scoped to **Production only**, so previews get no database                               | Expected today. Scope the variables to Preview against a **separate** database if you want preview deploys.                                                           |

---

## Changing the code

The repository does not accept direct pushes — `main` is protected and every change must arrive
as a pull request whose **`typecheck + unit tests`**, **`lint + formatting`** and
**`production build`** checks are green.
The build check runs the real migrate + build against a Postgres service container, so a migration
break or a Next.js build break fails in CI rather than mid-deploy. Branches must be up to date with
`main` before merging.

```bash
git switch -c fix/my-fix
# ...edit, commit...
git push -u origin fix/my-fix
gh pr create        # or open the pull-request link GitHub prints
```

Merge once all three checks are green. If a direct push is rejected with "protected branch hook
declined", that is this policy working as intended.

---

## What makes this deployment work

- **`vercel.json`** — `"buildCommand": "node scripts/migrate.mjs && next build"`.
  It mirrors Specific's `pre_deploy`, so a brand-new database gets the full
  schema before the app starts. Migrations are idempotent (tracked in
  `schema_migrations`), so every later build is a harmless no-op.
- **Database-URL resolution** — `lib/env.ts` (app) and `scripts/migrate.mjs`
  (build) accept Vercel's variable names instead of insisting on `DATABASE_URL`.
- **TLS compatibility** — `lib/db-url.mjs` appends `uselibpqcompat=true` to a connection string that
  asks for `sslmode=require|prefer|allow`, because Vercel's build and function sandboxes terminate TLS
  with a chain Node does not trust. Without it the migrate step dies with
  `SELF_SIGNED_CERT_IN_CHAIN` and the build exits 1. Runtime needs it as much as the build does, so
  never strip the call from either `lib/env.ts` or `scripts/migrate.mjs`.
- **Serverless-safe** — the app does no local-disk writes and schedules no
  timers, so it runs correctly on Vercel's ephemeral functions.
- **Independent secrets** — the Vercel `BETTER_AUTH_SECRET` is generated fresh,
  so Vercel sessions and Specific sessions are separate by design.

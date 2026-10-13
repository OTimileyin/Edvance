# End-to-end tests

The Playwright suite in `e2e/` covers the **batch-upload drop path** — the one
learner flow whose correctness lives in the browser, the route handler, object
storage and the extraction pipeline at once, and which unit tests can only
approximate — and what happens to a batch the learner **walks away from**: the
files that had not started are kept and sent, and the ones whose fate the page
could not learn are labelled instead of guessed at.

```bash
npm run build          # the suite runs against `next start`
npm run test:e2e
```

It runs in CI as the `e2e` job in `.github/workflows/check.yml`, against an
ephemeral Postgres service, and uploads the HTML report and traces when it fails.

## What it proves

| Spec                                                           | Proves                                                                                                            |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| the drop zone states the rules it enforces                     | the form's own copy matches the caps it will apply                                                                |
| one dropped file is stored, extracted, downloaded, removed     | drop → storage → `learning_material` → chunks → download → delete-on-remove                                       |
| ten files upload together, the eleventh is explained           | the batch cap, the per-file rows, the honest summary, clearing the list                                           |
| a file the browser accepts but the server refuses              | one bad file fails alone; the other two still upload                                                              |
| files that break the rules are refused before anything is sent | per-file reasons and **zero** upload requests                                                                     |
| choosing files through the picker                              | the click-and-pick path behaves like the drop path                                                                |
| a reading that fails can be seen failing                       | a transient background failure is visible, offers no Retry, and is finished by the queue with no learner action   |
| a reload mid-batch                                             | files that never started are sent again; interrupted ones are labelled, not resent; nothing is lost or duplicated |
| leaving the workspace mid-batch                                | the same guarantee across a client-side navigation, not just a reload                                             |
| an interrupted file that really did not arrive                 | Retry fixes exactly the missing file, once                                                                        |
| without a session                                              | the workspace is gated by the saved session cookie                                                                |

Every spec drives the real UI, the real route handlers, the real database and the
real extraction pipeline. Nothing about the app is mocked or relaxed for a test.

## Auth: a real session, saved once

Auth is a better-auth **session cookie**, so the `setup` project signs two
throwaway learners up through the real form and saves a cookie jar per learner
(`e2e/.auth/learner.json`, `e2e/.auth/learner-resume.json`; git-ignored, per run).
Every spec reuses one through `storageState`; the specs that must run signed out
override it with an empty state. The resume specs get the second learner because
they upload a batch of their own and the route's burst guard is per learner.
`global-teardown.ts` deletes both at the end, so a run leaves the database as it
found it — and that deletion is itself the account cascade.

## Object storage: a double, not a mock

`e2e/support/storage-stub.mjs` is an in-memory stand-in for Supabase Storage,
started by `playwright.config.ts` alongside the app. It implements exactly the
four operations `lib/supabase-storage.ts` performs — upload, download, remove and
signed URL — which is what lets CI gate the _whole_ path with no cloud
credentials: the bytes really leave the request, ingestion really downloads them
back and extracts text, and removing a material really deletes the object.

What is real: the browser, the form, the route handler, ownership checks, the
database, extraction, the delete path. What is faked: the third-party object
store. The suite asks the double what it received (`/__objects`), so "Uploaded"
on screen is never taken on trust: the keys are checked, including that they are
scoped to the course that owns them.

Point the app at the real provider instead with `E2E_STORAGE=real` (needs
`SUPABASE_*` in the environment); the specs that inspect the double then report
as skipped rather than passing quietly.

The double is also deliberately **slow** (`E2E_STORAGE_DELAY_MS`, 800 ms by
default), because an instant upload leaves no window for a reload to land in.
And it can be told to refuse work — `POST /__reject?key=<substring>&where=upload|download&count=<n>`.
A refused _upload_ is spent by the first match and answered well after the page has
gone, which is how a spec produces "a file that genuinely never arrived" on
purpose: the learner's Retry then has something real to fix and can be proved to
fix it exactly once. A refused _read_, counted, is what makes a transient
background failure something a spec can produce — the queue has to retry it and
finish it while the learner watches and presses nothing.

## Environment

| Variable               | Effect                                                            |
| ---------------------- | ----------------------------------------------------------------- |
| `DATABASE_URL`         | the database to run against (default: local Postgres, `oyevolve`) |
| `E2E_BASE_URL`         | an already-running origin; no server or double is started         |
| `E2E_DEV=1`            | start `next dev` instead of `next start`                          |
| `E2E_STORAGE=real`     | use the configured Supabase Storage instead of the double         |
| `E2E_PORT`             | the app's port (default 3400)                                     |
| `E2E_STORAGE_DELAY_MS` | how long the double takes per upload (default 800)                |

`playwright.config.ts` sets `BETTER_AUTH_URL` to the origin the browser uses, so
the two cannot drift.

## Deliberate limits

- **Chromium only.** The other engines have no coverage here; adding them would
  multiply runtime without adding evidence about a flow whose risk is in the
  server and the store.
- **Two learners, ~15 uploads each.** The upload route has a 20-per-minute burst
  guard per learner, so the suite runs narrow (two workers locally, one in CI)
  rather than fanning out and tripping its own limit, and the resume specs carry
  their own learner so one spec's burst can never fail another's.
- **No AI.** Analysis is out of scope here; the suite never needs a
  `GEMINI_API_KEY`, so it stays deterministic and free.
- **No visual assertions.** Pixel regression is the separate `visual` job.

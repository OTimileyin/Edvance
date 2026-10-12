# Skills Playbook

How the Claude Code skills in `.claude/skills/` are meant to be used — individually, and
together on this repository.

Installed with:

```bash
npx claude-code-templates@latest --skill development/webapp-testing,utilities/playwright-skill,development/error-resolver,development/playwright,development/playwright-e2e-builder,security/webapp-testing
```

## 1. What is actually on disk

Six installs produced five skill trees:

| Skill                    | Source                                                         | Execution model                                                               |
| ------------------------ | -------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `error-resolver`         | `development/error-resolver`                                   | 5-step diagnosis flow (classify → parse → match → analyze → resolve) + replay |
| `playwright`             | `development/playwright`                                       | **CLI-first**: drive a browser with `playwright-cli` commands, no files       |
| `playwright-skill`       | `utilities/playwright-skill`                                   | **Custom Node scripts** written to `/tmp`, executed by the skill's `run.js`   |
| `playwright-e2e-builder` | `development/playwright-e2e-builder`                           | **Interview → a real `@playwright/test` suite** committed to the repo         |
| `webapp-testing`         | `development/webapp-testing` **and** `security/webapp-testing` | **Python** Playwright scripts + a server-lifecycle helper                     |

### The duplicate

`development/webapp-testing` and `security/webapp-testing` are the same skill: byte-for-byte
identical content, and both resolve to the same destination path
`.claude/skills/webapp-testing`. Verified with:

```bash
npx claude-code-templates@latest --skill development/webapp-testing --directory .tmp-scratch/a
npx claude-code-templates@latest --skill security/webapp-testing   --directory .tmp-scratch/b
diff -r .tmp-scratch/a/.claude/skills/webapp-testing .tmp-scratch/b/.claude/skills/webapp-testing
# (no output — identical)
```

So there is no "higher capability" variant to pick between: the second install is a no-op
overwrite of the first, and the single surviving copy is complete (`SKILL.md`, `LICENSE.txt`,
three `examples/*.py`, `scripts/with_server.py`). **Nothing needs to be removed** — asking for
both is simply asking for the same skill twice.

If an install ever prints `SKILL.md not found in skill directory` and
`No components were installed successfully`, it is a transient fetch failure — it rolls the
directory back. Re-run the same command.

### The four browser skills are not duplicates

They occupy genuinely different slots, and the `playwright` skill says so explicitly: _"Do not
pivot to `@playwright/test` unless the user explicitly asks for test files."_

- `playwright` — a command-line session. Best when you want an answer, not an artifact.
- `playwright-skill` — a throwaway script you can re-run. Best for anything with a loop, a
  matrix, or several assertions.
- `webapp-testing` — same idea as `playwright-skill`, but in Python and with server lifecycle
  management (`with_server.py`) instead of a dev-server detector.
- `playwright-e2e-builder` — the only one that writes durable test files into this repository,
  and the only one that belongs behind a CI gate.

The nearest thing to overlap is `playwright-skill` vs `webapp-testing`: both automate a live
server with a script, differing in runtime and in who owns the server process. Pick by what is
installed (see §4) and by whether you want the helper to start the server for you.

## 2. How to invoke them

These are project-scoped Claude Code skills, so Claude Code (installed here, v2.1.278) loads
them automatically from `.claude/skills/` when it runs in this repo. Any other agent — including
a Freebuff session — can use them by being told which skill to follow; the instruction is just
the skill's name, and the agent reads its `SKILL.md`.

You can name several in one request; they compose because each one owns a different phase:

> Using the **playwright-e2e-builder** and **error-resolver** skills: build an e2e suite covering
> the sources page drop zone, and diagnose anything that fails with error-resolver.

> Using **playwright-skill**: check the batch-upload flow at three viewports, then hand me the
> screenshots. If anything throws, switch to **error-resolver**.

`.claude/` is excluded from both Prettier and ESLint (see `.prettierignore` and `globalIgnores`
in `eslint.config.mjs`), so vendored third-party skill files can never fail `format:check` or
`lint`. It is currently untracked and not in `.gitignore`.

## 3. The composed workflow: one task, all five

Target task — **prove the batch-upload drop path end to end and pin it in CI.** Today that path
is only hand-verified, so it is the honest candidate for this treatment.

### Step 0 — `error-resolver` is the floor, not a step

Keep it loaded for the whole session. The moment any command fails, hand it the verbatim error
instead of guessing. It has language pattern files worth knowing about before you need them:
`patterns/react.md` (React/Next.js), `patterns/nodejs.md`, `patterns/database.md`,
`patterns/docker.md`, `patterns/git.md`, `patterns/network.md`. Its real value on this project is
the class of failure behind the Intelligence tab's _"The analysis service returned a response
Edvance could not verify"_ — an error whose shape (HTTP 200, unparseable body) the framework
pattern files describe better than a generic traceback reading. It also maintains a replay log at
`.claude/error-solutions/` for solutions worth reusing.

### Step 1 — `playwright`: recon in under a minute

Cheap, stateless, no files. Use it to learn the current DOM before writing anything.

```bash
export PWCLI="$PWD/.claude/skills/playwright/scripts/playwright_cli.sh"
"$PWCLI" open http://localhost:3000 --headed
"$PWCLI" snapshot          # element refs
"$PWCLI" click e15
"$PWCLI" screenshot        # artifacts go to output/playwright/
```

Note: that skill's `SKILL.md` sets `PWCLI` from `$CODEX_HOME` (a Codex path). In this repository
the wrapper lives at `.claude/skills/playwright/scripts/playwright_cli.sh`, so point `PWCLI` there.

### Step 2 — `playwright-skill`: the repeatable version

Recon tells you the selectors; this skill turns them into a script you can run again. It
auto-detects the running server, writes to `/tmp/playwright-test-*.js`, and runs it through its
own executor:

```bash
cd .claude/skills/playwright-skill
node -e "require('./lib/helpers').detectDevServers().then(s => console.log(JSON.stringify(s)))"
node run.js /tmp/playwright-test-batch-upload.js
```

This is the right tool for the parts of the drop path that scanning cannot cover: a real
`DragEvent` on `.drop-zone`, a ten-file burst, viewport sweeps. It defaults to `headless: false`,
which is what makes a broken drag visible; pass `headless: true` for unattended runs.

### Step 3 — `webapp-testing`: when you want the server managed

Only reach for this when you need the helper to own the server, because here that job is awkward
(see §4). Used as designed:

```bash
python .claude/skills/webapp-testing/scripts/with_server.py --help   # always first
python .claude/skills/webapp-testing/scripts/with_server.py \
  --server "npm run dev" --port 3000 -- python /tmp/batch_upload.py
```

Its `SKILL.md` is explicit that the bundled scripts are black boxes: run `--help`, do not open the
source until a customisation is genuinely required.

### Step 4 — `playwright-e2e-builder`: make it permanent

This is the pay-off, and the only step that touches the repository. It runs an interview first —
critical flows, auth strategy, test data, CI, visual regression — then writes
`playwright.config.ts`, `e2e/pages/*`, `e2e/fixtures.ts`, `e2e/auth.setup.ts`, the specs, and a
GitHub Actions workflow. It is opinionated in ways that suit Edvance: role-based locators, no
`waitForTimeout()`, per-test data seeding and cleanup, trace/screenshot/video on failure, and
`storageState` saved once in a `setup` project — which is exactly right for this app, since auth
is better-auth cookies rather than a token in `localStorage`.

Answer the interview with this repository's real answers:

- **Critical flows** — auth, plus the sources upload path and the assessment/practice flows.
- **Auth** — cookie/session (better-auth); authenticate via UI once and reuse `storageState`.
- **Test data** — API seeding in fixtures against the existing `/api/courses/...` routes.
- **Environment** — local dev server; CI via GitHub Actions, matching `.github/workflows/check.yml`.
- **Visual regression** — start with functional tests only.

## 4. Prerequisites, as measured on this machine

| Requirement                        | Status                                                                 |
| ---------------------------------- | ---------------------------------------------------------------------- |
| Node / `npx`                       | ✅ v24.19.0                                                            |
| Node Playwright browsers           | ✅ `~/AppData/Local/ms-playwright` (chromium 1243 + 1248)              |
| `playwright-skill` local deps      | ✅ `node_modules/{playwright,playwright-core}`                         |
| Python                             | ✅ 3.12.10 (needed only by `webapp-testing`)                           |
| Python `playwright` package        | ❌ not installed — `ModuleNotFoundError: No module named 'playwright'` |
| `@playwright/test` in this project | ❌ not a dependency yet (needed only by `playwright-e2e-builder`)      |

So `playwright`, `playwright-skill` and `error-resolver` work right now. To light up the other two:

```bash
python -m pip install playwright && python -m playwright install chromium   # webapp-testing
npm i -D @playwright/test                                                   # playwright-e2e-builder
```

### Edvance-specific traps

**Infisical overrides `PORT`.** `npm run dev` is
`infisical run --env=dev -- next dev`, and Infisical injects a `PORT`, so Next binds an ephemeral
port (it has come up on 56226) instead of 3000. Any skill that assumes a port — `with_server.py
--port 3000`, `playwright.config.ts`'s `webServer.url`, a hardcoded `TARGET_URL` — has to pin it:
`next dev -p 3000`, or point the script at the real origin. Without that, `with_server.py` waits
on a port nothing is listening to.

**Windows/MSYS.** Export `MSYS_NO_PATHCONV=1` first. `/tmp/…` paths work under Git Bash but land
outside the repo, which is what `playwright-skill` intends. `npx --no-install -c '…'` is broken
here — call `node node_modules/<pkg>/bin/…` directly or use an `npm run` script.

**The `playwright` CLI's `upload` needs the file chooser already open, and Windows-style paths.**
Called cold, `upload` fails with _"can only be used when there is related modal state present"_.
Click the control that opens the chooser first — clicking `Course material` on the sources page
reports `[File chooser]: can be handled by upload` — and only then does `upload` apply the files.
Paths must also be Windows-style: MSYS hands the CLI `/c/Users/…`, Node reads that as
`C:\c\Users\…`, and the upload dies with `ENOENT`. Pass `C:/Users/…` with forward slashes.

## 5. Order of use, in one line

`error-resolver` throughout → `playwright` to look → `playwright-skill` to reproduce →
`webapp-testing` only if you need server lifecycle → `playwright-e2e-builder` to make it permanent
and gate it in CI.

## 6. First run: what it actually proved

The `playwright` skill was driven end to end against the local dev server on `:3000`, exercising
the batch-upload path on `/courses/qubators-ai-foundry-c619e9aa/sources`:

- Signed up a throwaway learner through `/signup` — a real better-auth cookie in a real browser.
- Opened the chooser on `Course material`, then uploaded a `.txt`, a `.md` and a second `.txt` in
  one `upload` call.
- All three appeared in the sources list as `Ready for analysis`, each with its own byte size,
  chunk count and download URL — extraction really ran, not just the HTTP round trip.
- The batch form reported `3 of 3 uploaded` and offered `Clear the list`.
- `console error` reported `Errors: 0`.
- Removed all three through the UI; each raised a `confirm` dialog the CLI surfaced and
  `dialog-accept` cleared.
- Screenshot: `output/playwright/batch-upload-probe.png`.
- Deleted the probe account through the `/account` Danger Zone — the button stays `[disabled]`
  until `DELETE` is typed — then confirmed in Postgres: 0 user rows, 0 stray materials, 0 orphan
  ingestion jobs, 0 orphan chunks. The deletion cascade is clean.

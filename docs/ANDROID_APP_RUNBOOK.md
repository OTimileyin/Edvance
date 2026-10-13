# Oyevolve for Android — build, release and update runbook

Oyevolve ships as an **installable web app** already (a manifest, a service
worker and an install button). This document covers the _native_ Android shell
on top of that: how it is built, how it is signed, how it reaches a phone, and
exactly what "there is an update" means for it.

---

## 1. The design decision, in one paragraph

The Android app is a **Trusted Web Activity** — a thin native shell that opens
`https://oyevolve.vercel.app` in the device's own browser engine. It is not a
copy of the site bundled inside the APK, and it cannot be: Oyevolve is
server-rendered, with API routes, sessions in PostgreSQL and AI calls made from
the server. There is no offline build of it, and the shell deliberately does not
pretend otherwise.

That choice is what makes the update story simple, and it is worth stating
plainly because it inverts the usual expectation:

| What changed                                                                  | How it reaches a phone                 | Waiting on                    |
| ----------------------------------------------------------------------------- | -------------------------------------- | ----------------------------- |
| **Anything in the app** — a page, a fix, a new feature, the design            | **Instantly, by itself**               | Nothing. It is the live site. |
| The **Android shell** — icon, name, package id, permissions, target API level | A new APK, offered by an in-app notice | A tag and a CI build          |

So the common case is already solved: a learner who is online is running the
latest web app the moment it is deployed. Everything below is about the rare
case — the shell.

---

## 2. What is where

| Path                                                                  | What it is                                                                                                                                                                                                      |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `android/`                                                            | The Gradle project. A rendered copy of Google's Bubblewrap template (`GoogleChromeLabs/bubblewrap`, Apache-2.0), committed rather than regenerated — see §3.                                                    |
| `android/version.json`                                                | **The single source of the app version.** `android/app/build.gradle` reads `versionCode`/`versionName` from it, and so does the web app. One file, so the built APK and the advertised release cannot disagree. |
| `android/app/src/main/java/app/oyevolve/mobile/LauncherActivity.java` | The entry point. Opens the live site and tags the URL with the installed build number.                                                                                                                          |
| `app/api/app/version/route.ts`                                        | Public: the current build, and where to download it.                                                                                                                                                            |
| `app/api/assetlinks/route.ts`                                         | Digital Asset Links, also served at `/.well-known/assetlinks.json`.                                                                                                                                             |
| `components/app-update-banner.tsx`                                    | The "a newer version is available" notice, shown only inside the Android shell.                                                                                                                                 |
| `.github/workflows/android.yml`                                       | Builds, signs and publishes the APK.                                                                                                                                                                            |

---

## 3. Why the Android project is committed rather than generated

The usual route is to run `bubblewrap init` once and commit what it produces.
`init` is an **interactive** wizard with no prompt-free mode, so it cannot run in
CI, and this machine has no JDK or Android SDK to run it locally. Instead the
template was rendered into concrete files and checked in.

The result is better for this repository anyway: the shell appears in a pull
request like every other source file, `git blame` works on it, and CI needs no
generator. The parameters live in plain files rather than in a wizard's answers:

| Setting                        | Value                        | Where                                         |
| ------------------------------ | ---------------------------- | --------------------------------------------- |
| Package id                     | `app.oyevolve.mobile`        | `android/app/build.gradle`                    |
| Origin                         | `oyevolve.vercel.app`        | `android/app/src/main/res/values/strings.xml` |
| Versions                       | `1` / `1.0.0`                | `android/version.json`                        |
| compileSdk / targetSdk         | 36 (Android 16)              | `android/app/build.gradle`                    |
| minSdk                         | 24 (Android 7.0)             | `android/app/build.gradle`                    |
| Android Gradle Plugin / Gradle | 8.9.1 / 8.11.1               | `android/build.gradle`, `gradle/wrapper/`     |
| TWA library                    | `androidbrowserhelper` 2.7.4 | `android/app/build.gradle`                    |

Target API 36 is not decoration: Play requires 36 for new submissions from 31
August 2026, and 35 from August 2025. The shell is already there.

The launcher icon is not a new asset. It reuses `public/icons/` — the plain mark
as the adaptive foreground over a cream backdrop, and the maskable icon (which
is the mark on cream) as the legacy icon and the splash image. Measured, not
assumed: the maskable PNG's corners are `#FAF4E7` and its mark is centred, which
is why the backdrop is cream rather than the navy used for the status bar.

---

## 4. Seeing it work locally

The update notice is invisible in a browser by design. To watch it, publish a
build newer than the one you pretend to be running:

```bash
# Temporarily pretend a newer release exists.
#   android/version.json -> "versionCode": 2, "versionName": "1.1.0"
npx next dev -p 3302
```

Then open `http://localhost:3302/?app=android&v=1` and the banner appears,
saying you are running build 1 while build 2 is current, linking to the build-2
APK. `?app=android&v=2` shows nothing (2 is not older than 2), and a plain
`http://localhost:3302/` shows nothing at all.

**Revert `android/version.json` afterwards.** It is not a test fixture.

---

## 5. How the update check actually works

Two facts have to meet.

**Which build is installed.** A TWA is opaque in this direction: the site cannot
ask the shell what version it is, and Chrome does not put the host app's package
or version in the User-Agent. So the shell volunteers it at launch —
`LauncherActivity.getLaunchingUrl()` appends `?app=android&v=<versionCode>`
using `BuildConfig.VERSION_CODE`, which Gradle took from `android/version.json`.
Every cold start re-derives it, so the number is the APK on the device speaking
about itself rather than a constant that could drift.

The web app remembers it in `localStorage`, because a reload or an in-session
navigation does not re-send the query string. That is why the notice survives
navigation inside the app.

**Which build is current.** `GET /api/app/version` answers from the same
`android/version.json`, and derives the download URL from the version alone:
`https://github.com/<owner>/<repo>/releases/download/android-v<N>/oyevolve-<N>.apk`.

**What happens when the first is behind the second.** A dismissible notice
appears. "Update now" follows the link; the browser downloads the APK and
**Android's own installer applies it**, over the existing app, because the
package id and signing key match.

That last point matters: the app never installs anything itself. It does not
request `REQUEST_INSTALL_PACKAGES`, it does not download and execute a package,
and it cannot install silently. It hands over a URL. Android asks the user.
Dismissals are remembered per published build, so waving away build 2 does not
silence build 3.

---

## 6. First-time setup

### 6.1 Create the signing key — once, and keep it forever

Run this **outside the repository**. A keystore inside a working tree is one
`git add -A` away from being committed; keeping it somewhere else means that can
never happen by accident.

```bash
mkdir -p ~/oyevolve-android && cd ~/oyevolve-android

keytool -genkeypair -v \
  -keystore release.keystore \
  -alias oyevolve \
  -keyalg RSA -keysize 2048 -validity 10000
```

> **This file is the app's identity.** Android will only replace an installed
> app with one signed by the same key. Lose it and no future build can be
> installed over an existing one — every user has to uninstall and reinstall.
> Back it up somewhere you would trust with a password. `*.keystore` and `*.jks`
> are ignored at the repository root as a second line of defence, but the
> directory above is the real protection: there is nothing to ignore.

### 6.2 Put it in repository secrets

Encode the keystore — from the directory you created it in — and add four
secrets under **Settings → Secrets and variables → Actions**:

```bash
# Linux
base64 -w 0 release.keystore
# macOS
base64 < release.keystore | tr -d '\n'
```

| Secret                      | Value                        |
| --------------------------- | ---------------------------- |
| `ANDROID_KEYSTORE_BASE64`   | that base64 output           |
| `ANDROID_KEYSTORE_PASSWORD` | the store password you chose |
| `ANDROID_KEY_ALIAS`         | `oyevolve`                   |
| `ANDROID_KEY_PASSWORD`      | the key password you chose   |

Nothing is printed by the workflow, and the keystore is never uploaded as an
artifact.

### 6.3 Tell the site which certificate to trust

The address bar is hidden only when Chrome can verify that the app and the site
belong together. Read the certificate's fingerprint:

```bash
keytool -list -v -keystore release.keystore -alias oyevolve | grep SHA256
```

Copy the colon-separated value into a Vercel environment variable:

```
ANDROID_APP_FINGERPRINT=AA:BB:CC:...:99
```

`/.well-known/assetlinks.json` then answers with that statement. Until it is
set, the endpoint honestly returns `[]` and the app opens as a Custom Tab with
browser UI — working, just not fullscreen. It never invents a certificate.

Optional: `ANDROID_RELEASE_REPO` (`owner/name`) if the APK is ever published
from a repository other than this one. Both variables are read per request, so
changing them needs a restart, not a rebuild.

### 6.4 Where the APK is hosted, and why

GitHub Releases. Assets there are served without a bandwidth charge and without
an account of their own, which is why the APK is not committed into `public/` —
a binary in the repository would be copied into every clone, forever, and the
Vercel deployment payload along with it.

---

## 7. Releasing a new build

```bash
# 1. Bump the version — this is the only place it is written.
#    android/version.json: "versionCode": 2, "versionName": "1.1.0"

# 2. Land it on main the usual way (branch, PR, green checks).

# 3. Tag the commit the version file was changed in.
git tag android-v2
git push origin android-v2
```

The tag is what starts the build. The workflow then:

1. checks that the tag and `android/version.json` agree — a tag that disagrees
   would publish a release the update prompt points at the wrong build;
2. refuses to publish an unsigned APK, because it could never be installed over
   an existing one;
3. builds `assembleRelease`, names the file `oyevolve-<versionCode>.apk`, and
   records its SHA-256 in the release notes;
4. creates the GitHub Release with the APK attached.

It can also be started by hand (**Actions → android → Run workflow**), which
builds and uploads the APK as a run artifact without publishing — useful for
checking that the project still compiles. With no keystore configured that is
all a run can do, and the workflow says so rather than failing cryptically.

**A tag push is a promise to publish.** If the keystore is missing, the run
fails on purpose.

---

## 8. What has been verified, and what has not

Honest accounting, because the two halves were not equally checkable.

**Verified, end to end, by running it:**

- `GET /api/app/version` returns the current build and the derived download
  URL; the URL tracks `versionCode` automatically (build 2 → `android-v2` /
  `oyevolve-2.apk`).
- `/.well-known/assetlinks.json` is rewritten to the route and answers
  `application/json`: a real statement when `ANDROID_APP_FINGERPRINT` is set,
  and exactly `[]` when it is not.
- The notice appears inside the shell (`?app=android&v=1` against a published
  build 2), shows the right build numbers and the right download URL, is
  dismissible, stays dismissed across reloads, returns for a _newer_ build, and
  persists across in-session navigation where the URL carries no parameters.
- It is absent in a plain browser, and absent when the installed build is
  already current.
- `npm run typecheck`, `npm run lint`, `npm run format:check` and the 131 unit
  tests all pass, and `next build` succeeds with all 35 routes emitted.

**The Android half is verified too.** The `android` workflow compiled and signed
the APK in CI (1m38s), and the artifact was inspected directly rather than taken
on trust from a green job:

- It is a valid archive of 405 entries, including `classes.dex`,
  `AndroidManifest.xml` and `resources.arsc`.
- It carries an APK Signature Scheme v2 signing block, and the signing
  certificate's SHA-256 is the keystore's fingerprint exactly. That is worth
  checking rather than assuming, because the same value is what
  `/.well-known/assetlinks.json` publishes: if the two ever disagreed, the
  address bar would never go away and no update could be installed over an
  existing build. (`apksigner` is not available on a machine without the Android
  build-tools, so the certificate is read out of the signing block and hashed;
  `keytool -printcert` on the extracted certificate agrees.)

**Still unproven: the app on a real device.** Nothing here has run the APK on
Android hardware, so the launcher icon, the asset-link verification and the
fullscreen behaviour remain unconfirmed in the only place that ultimately
matters. Everything above is a statement about the artifact, not about a phone.

One deliberate divergence from the generated template: `minifyEnabled` is
`false` for release. R8 has nothing to win on a launcher this thin, and code it
stripped would only ever fail at runtime, on a device, in a build nobody could
debug.

---

## 9. If this ever goes to Google Play

Two things change, and both are policy, not preference:

- **The self-update path above cannot be used.** Play prohibits apps that
  update themselves outside Play's own mechanism, and `REQUEST_INSTALL_PACKAGES`
  is restricted to apps whose core purpose is handling packages. A
  Play-distributed build must use Play's In-App Updates API (`com.google.android.play:app-update`)
  instead, and the direct-download updater must not be in it.
- **Publish the Play _app-signing_ certificate's fingerprint**, not the upload
  key's, in `ANDROID_APP_FINGERPRINT`. Google signs the APKs users receive.

Until then, the direct-download path in this document is the one that applies.

---

## 10. Troubleshooting

| Symptom                                                              | Cause                                                                                                                                                                                                                                                                                                                            |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The app opens with a browser address bar                             | Digital Asset Links did not verify. Check that `https://oyevolve.vercel.app/.well-known/assetlinks.json` returns a statement, that the fingerprint is the certificate the installed APK was signed with, and that `strings.xml`'s `hostName` matches the origin exactly. Until it verifies, the app still works as a Custom Tab. |
| `assetlinks.json` returns `[]`                                       | `ANDROID_APP_FINGERPRINT` is unset or empty on the deployment.                                                                                                                                                                                                                                                                   |
| The workflow fails at "Refuse to publish an unsigned APK"            | A tag was pushed without the four signing secrets configured (§6.2).                                                                                                                                                                                                                                                             |
| The workflow fails at "Check the tag matches `android/version.json`" | The tag and the version file disagree. Bump the file, commit, re-tag.                                                                                                                                                                                                                                                            |
| The APK will not install over an existing build                      | The two were signed with different keys. Expected between a locally signed test build and the released one; uninstall the old one.                                                                                                                                                                                               |
| The update notice never appears                                      | It only renders inside the shell. In a browser it is absent by design. Inside the app, check `/api/app/version` returns a `versionCode` higher than the installed one.                                                                                                                                                           |
| The notice reappears after being dismissed                           | Dismissal is remembered per build, so a _newer_ published build legitimately asks again.                                                                                                                                                                                                                                         |

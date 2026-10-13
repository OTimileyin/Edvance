/**
 * The test learners the suite signs in as, and the cookie jar each project uses.
 *
 * Oyevolve's auth is a better-auth session cookie, so there is no token to mint:
 * the setup project signs a throwaway learner up through the real sign-up form
 * and the saved cookie jar is what the specs reuse. Keeping the file names, the
 * credentials and the project mapping in one place means the config, the setup
 * project, the fixtures and the teardown cannot drift apart.
 *
 * There are two learners on purpose. The upload route has a burst guard of 20
 * uploads per learner per minute (`RATE_LIMITS.upload`), and the resume specs
 * upload a batch each; giving them their own learner keeps the suite inside that
 * budget instead of tripping the app's own limit, and it means one spec's burst
 * can never fail another's.
 */

/** Where the first learner's cookies are saved, relative to the repo root. */
export const AUTH_FILE = "e2e/.auth/learner.json";
/** Where the second learner's cookies are saved. */
export const AUTH_FILE_RESUME = "e2e/.auth/learner-resume.json";

/** Every saved session, so the teardown can remove each learner. */
export const AUTH_FILES = [AUTH_FILE, AUTH_FILE_RESUME];

export const LEARNER_NAME = "E2E Learner";
/** Long enough for the sign-up form's own rule (8 characters). */
export const LEARNER_PASSWORD = "e2e-learner-password";

/**
 * A fresh address per run, so a reused database never turns a sign-up into
 * "an account with that email already exists".
 */
export function learnerEmail(): string {
  return `e2e-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}@oyevolve.test`;
}

/** The saved session a project's specs should carry, by project name. */
export function authStateFile(projectName: string): string {
  return projectName.endsWith("-resume") ? AUTH_FILE_RESUME : AUTH_FILE;
}

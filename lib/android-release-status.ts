/**
 * Does the release the site is advertising actually exist?
 *
 * `/download` derives its build number and its APK URL from
 * `android/version.json`, which is a statement of intent: what the next release
 * *will* be. Nothing in the repository can prove that the matching GitHub
 * release has been published, and the two can legitimately disagree — the
 * version file is bumped and committed in one step, the tag is pushed in
 * another, and today's state is exactly that gap.
 *
 * So the page asks the release host, and this module is what it asks with. The
 * alternative — an environment variable saying "the release exists" — was
 * rejected because it is a second hand-maintained copy of a fact, and it fails
 * in both directions: forget to set it and the page offers a link that 404s,
 * set it early and the page hides a download that works.
 *
 * Three answers, and `unknown` is a real one. A 404 is evidence of absence and
 * a 2xx is evidence of presence; DNS failure, a timeout, a TLS error or a 5xx
 * are evidence of neither, so the page must not claim either. Reporting
 * "unknown" as "missing" would hide a working download behind the release
 * host's bad afternoon.
 *
 * The result is cached by the page (`export const revalidate`), so this runs at
 * most once per revalidation window per server instance — not once per visit.
 */

/** What the check can conclude. `unknown` is a conclusion, not a failure. */
export type ReleaseState = "published" | "missing" | "unknown";

/**
 * How long the release host gets to answer before the honest answer becomes
 * `unknown`.
 *
 * Generous on purpose. The cost of waiting is paid once per revalidation
 * window, on a page nobody is staring at, while the cost of giving up too early
 * is a *visible* lie — the page would tell a learner there is no download when
 * there is one. A cold process's first HTTPS request to GitHub (DNS, TLS, two
 * hops) has been measured over 2.5s here; it is the case this exists for.
 */
const DEFAULT_TIMEOUT_MS = 5000;

/**
 * How long an answer stays fresh, in seconds, before the page asks again.
 *
 * This is what keeps the check from being one request per visit — and the page
 * carries the same number in its own `export const revalidate`, which is the
 * one place it has to be written twice, because Next.js requires route segment
 * config to be a literal it can read statically.
 */
export const RELEASE_STATE_MAX_AGE_SECONDS = 300;

/**
 * An HTTP status, turned into a state. This is the whole decision, which is why
 * it is its own function: a test can state the mapping in three lines.
 */
export function releaseStateForStatus(status: number): ReleaseState {
  if (status >= 200 && status < 300) return "published";
  // 404 is what GitHub answers for a release or asset that does not exist; 410
  // is what it would answer for one it has deliberately retired. Both mean the
  // file is not there, which is what the page needs to know.
  if (status === 404 || status === 410) return "missing";
  // 403 (rate limited or blocked), 5xx, an unexpected redirect left unfollowed,
  // anything else: no conclusion is available.
  return "unknown";
}

/**
 * Asks the release host whether `apkUrl` exists.
 *
 * `HEAD`, not `GET`: the question is whether the file is there, and the page
 * has no use for several megabytes of APK. GitHub answers HEAD on a release
 * asset through the same redirect to its object store that a download takes,
 * so `redirect: "follow"` is what makes the final 200 the answer.
 *
 * Never throws. Every failure — and every status that is not an answer — comes
 * back as `unknown`, because a page about downloading software must not break
 * when the thing it is asking about is unreachable.
 *
 * The request is cached for `RELEASE_STATE_MAX_AGE_SECONDS`. Without that the
 * page is rendered per request, which is both slower than a prerendered page
 * and a request to GitHub per visit; with it, the release host is asked on a
 * schedule. Two things are deliberately absent from the request options, both
 * because they defeat that caching, and both found by watching what the route
 * actually did rather than what it claimed:
 *
 * - `cache: "no-store"`, which Next.js ignores when paired with
 *   `next.revalidate` and which reverts the route to dynamic anyway.
 * - `signal`. Next.js does not cache a request that carries an `AbortSignal`,
 *   so passing one here silently costs the cache — the timeout is enforced by
 *   racing the request instead, which leaves the request itself cacheable.
 */
export async function checkReleaseAvailability(
  apkUrl: string,
  options: { fetchImpl?: typeof fetch; timeoutMs?: number } = {},
): Promise<ReleaseState> {
  const { fetchImpl = fetch, timeoutMs = DEFAULT_TIMEOUT_MS } = options;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const request = (async () => {
      const response = await fetchImpl(apkUrl, {
        method: "HEAD",
        redirect: "follow",
        next: { revalidate: RELEASE_STATE_MAX_AGE_SECONDS },
      });
      return releaseStateForStatus(response.status);
    })();
    const expired = new Promise<ReleaseState>((resolve) => {
      timer = setTimeout(() => resolve("unknown"), timeoutMs);
    });
    // Whichever settles first decides. The loser is still handled — a race
    // attaches handlers to both — so a late rejection cannot become an
    // unhandled one after the page has already rendered.
    return await Promise.race([request, expired]);
  } catch {
    return "unknown";
  } finally {
    clearTimeout(timer);
  }
}

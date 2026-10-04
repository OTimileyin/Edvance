// Pure comparison used by `scripts/verify-remote-deployment.mjs --diff`.
//
// A "run" is what one suite pass records:
//   { passed: number, failures: string[], order: string[],
//     results: Map<string, { ok: boolean, detail: string }>, crashed: string | null }
//
// `compareRuns` reports the checks whose outcome differs between two
// deployments — passing on one and failing on the other — plus any check only
// one side reported (which happens when a run crashed part-way). Two runs that
// both fail the same check are NOT a difference: the point is where the two
// deployments disagree.

/**
 * @param {{ order: string[], results: Map<string, { ok: boolean, detail: string }> }} a
 * @param {{ order: string[], results: Map<string, { ok: boolean, detail: string }> }} b
 * @returns {{ names: string[], differing: Array<{ name: string, a: boolean | null, b: boolean | null, detailA: string, detailB: string }> }}
 */
export function compareRuns(a, b) {
  const names = [];
  const seen = new Set();
  for (const name of [...a.order, ...b.order]) {
    if (seen.has(name)) continue;
    seen.add(name);
    names.push(name);
  }

  const differing = [];
  for (const name of names) {
    const ra = a.results.get(name);
    const rb = b.results.get(name);
    // `null` means the check was never reached on that deployment.
    const va = ra ? ra.ok : null;
    const vb = rb ? rb.ok : null;
    if (va === vb) continue;
    differing.push({
      name,
      a: va,
      b: vb,
      detailA: ra?.detail ?? "",
      detailB: rb?.detail ?? "",
    });
  }

  return { names, differing };
}

// Importing application modules from a unit test.
//
// Node resolves specifiers literally, but Oyevolve's own modules use the import
// style Next resolves for them: extensionless relative specifiers (`./types`)
// and the `@/` alias from tsconfig.json. Most of `tests/unit` covers modules
// with no imports of their own and needs none of this; this hook is for the ones
// that import each other.
//
// `registerAppImports()` must run before the module under test is imported, so
// the test dynamically imports it afterwards:
//
//   registerAppImports();
//   const { something } = await import("../../lib/ai/truncation.ts");
//
// It rewrites only specifiers the project itself uses; anything else (a package,
// a `node:` built-in) is left to Node.

import { existsSync, statSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

/** This repository's root, from this file's location at `<root>/tests/lib/`. */
const ROOT = new URL("../../", import.meta.url);

/** What an extensionless specifier may stand for, in resolution order. */
const SUFFIXES = [".ts", ".tsx", ".mjs", "/index.ts", "/index.tsx"];

/** The file `base` names, or the first file an extensionless `base` implies. */
function firstExisting(base) {
  if (existsSync(base) && statSync(base).isFile()) return base;
  for (const suffix of SUFFIXES) {
    if (existsSync(`${base}${suffix}`)) return `${base}${suffix}`;
  }
  return null;
}

/** Teaches this process the project's import style; call once, before importing. */
export function registerAppImports() {
  registerHooks({
    resolve(specifier, context, nextResolve) {
      let base = null;
      if (specifier.startsWith("@/")) {
        base = fileURLToPath(new URL(specifier.slice(2), ROOT));
      } else if (specifier.startsWith(".") && context.parentURL) {
        base = fileURLToPath(new URL(specifier, context.parentURL));
      }
      if (base) {
        const found = firstExisting(base);
        if (found) return { url: pathToFileURL(found).href, shortCircuit: true };
      }
      return nextResolve(specifier, context);
    },
  });
}

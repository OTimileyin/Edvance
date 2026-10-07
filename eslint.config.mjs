import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTypescript,
  // Last: turn off stylistic rules that would fight Prettier. Prettier owns
  // formatting; ESLint owns correctness.
  prettier,
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Records and design artifacts, not source code:
    "conversation.md",
    "assessment-intelligence.html",
    "design.html",
    // Local scratch (never committed), kept out so local runs match CI:
    ".freebuff/**",
    ".tmp-scratch/**",
  ]),
]);

export default eslintConfig;

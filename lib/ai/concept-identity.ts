import { ModelOutputError } from "./types";

export function normaliseConceptName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Resolve against course-scoped identities, including archived concepts. */
export function resolveConceptIds<T extends { id: string | null; name: string }>(
  concepts: T[],
  existingConcepts: { id: string; name: string }[],
): T[] {
  const allowedIds = new Set(existingConcepts.map((concept) => concept.id));
  const byName = new Map<string, string[]>();
  for (const concept of existingConcepts) {
    const name = normaliseConceptName(concept.name);
    byName.set(name, [...(byName.get(name) ?? []), concept.id]);
  }
  const seenIds = new Set<string>();
  return concepts.map((concept) => {
    let id = concept.id;
    if (id === null) {
      const matches = byName.get(normaliseConceptName(concept.name)) ?? [];
      if (matches.length > 1) {
        throw new ModelOutputError(
          "ambiguous-concept-name",
          "More than one existing concept matches this name.",
        );
      }
      id = matches[0] ?? null;
    }
    if (id !== null) {
      if (!allowedIds.has(id) || seenIds.has(id)) {
        throw new ModelOutputError(
          "invalid-concept-id",
          "Analysis returned an unknown or duplicate existing concept id.",
        );
      }
      seenIds.add(id);
    }
    return { ...concept, id };
  });
}

import { test } from "node:test";
import assert from "node:assert/strict";
import { SEED_COURSES, seedExtractionMetadata } from "../../lib/data.ts";

/**
 * The demo workspaces only reach the analysed state because every seeded source
 * carries real, citable excerpts. These tests hold that data to the same
 * standards the extraction pipeline does, so a future edit cannot quietly
 * reintroduce a workspace with zero evidence.
 */

const LOCATION_TYPES = new Set(["page", "slide", "timestamp", "section", "line"]);

/** The unit noun each location kind is counted in, as the extractors do. */
const UNITS = {
  page: "page",
  slide: "slide",
  timestamp: "cue",
  section: "section",
  line: "line",
};

/** Target size of one chunk in `lib/extraction/chunk.ts`; an excerpt that
 *  exceeds it would be split, so authoring keeps one location to one chunk. */
const CHUNK_TARGET_CHARS = 900;

function allBlocks() {
  return SEED_COURSES.flatMap((course) =>
    course.sources.flatMap((source) => source.blocks.map((block) => ({ course, source, block }))),
  );
}

test("every demo source contributes evidence", () => {
  for (const course of SEED_COURSES) {
    assert.ok(course.sources.length > 0, `${course.name} should have sources`);
    for (const source of course.sources) {
      assert.ok(source.blocks.length > 0, `${source.title} should carry evidence blocks`);
    }
  }
});

test("demo evidence stays demo: no stored file and no claimed ingestion", () => {
  for (const course of SEED_COURSES) {
    for (const source of course.sources) {
      assert.equal(
        source.storageReference ?? null,
        null,
        `${source.title} must not claim an uploaded file`,
      );
      assert.equal(
        source.ingestion ?? null,
        null,
        `${source.title} must not carry its own ingestion state`,
      );
    }
  }
});

test("every demo block has citable text and a real location", () => {
  for (const { source, block } of allBlocks()) {
    assert.ok(
      block.text.trim().length >= 40,
      `${source.title} has a block too thin to cite as evidence`,
    );
    assert.ok(
      LOCATION_TYPES.has(block.location.type),
      `${source.title} uses an unknown location kind: ${block.location.type}`,
    );
    assert.ok(block.location.label.trim().length > 0, `${source.title} has a block with no label`);
  }
});

test("a demo source keeps one location kind and never repeats a location", () => {
  for (const course of SEED_COURSES) {
    for (const source of course.sources) {
      const kinds = new Set(source.blocks.map((block) => block.location.type));
      assert.equal(kinds.size, 1, `${source.title} mixes location kinds`);
      const labels = source.blocks.map((block) => block.location.label);
      assert.equal(new Set(labels).size, labels.length, `${source.title} repeats a location`);
    }
  }
});

test("each authored excerpt stays within one chunk", () => {
  for (const { source, block } of allBlocks()) {
    assert.ok(
      block.text.length <= CHUNK_TARGET_CHARS,
      `${source.title} has an excerpt long enough to be split into two chunks`,
    );
  }
});

test("derived extraction metadata counts the locations actually authored", () => {
  for (const course of SEED_COURSES) {
    for (const source of course.sources) {
      const metadata = seedExtractionMetadata(source);
      assert.equal(metadata.unit, UNITS[source.blocks[0].location.type], source.title);
      assert.equal(metadata.count, source.blocks.length, source.title);
    }
  }
});

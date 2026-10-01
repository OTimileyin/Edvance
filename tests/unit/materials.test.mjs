import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_COURSE_BYTES,
  MAX_MATERIALS_PER_COURSE,
  acceptedExtensions,
  formatBytes,
  materialKindFor,
  materialTitle,
  safeMaterialFilename,
} from "../../lib/materials.ts";

test("accepts the formats Edvance can extract", () => {
  for (const name of ["a.pdf", "b.pptx", "c.docx", "d.txt", "e.md", "f.vtt", "g.srt"]) {
    assert.ok(materialKindFor(name), `${name} should be accepted`);
  }
});

test("rejects legacy binary Office formats and unknown types", () => {
  assert.equal(materialKindFor("old.doc"), null);
  assert.equal(materialKindFor("old.ppt"), null);
  assert.equal(materialKindFor("image.png"), null);
  assert.equal(materialKindFor("noextension"), null);
});

test("acceptedExtensions lists every supported extension", () => {
  const exts = acceptedExtensions().split(",");
  assert.ok(exts.includes(".pdf"));
  assert.ok(exts.includes(".srt"));
  assert.ok(!exts.includes(".doc"));
});

test("safeMaterialFilename removes path separators and unsafe characters", () => {
  assert.equal(safeMaterialFilename("../../etc/passwd"), "etc-passwd");
  assert.equal(safeMaterialFilename("my file (v2).pdf"), "my-file-v2-.pdf");
  assert.equal(safeMaterialFilename("///"), "material");
});

test("materialTitle strips the extension and falls back when empty", () => {
  assert.equal(materialTitle("Lecture 1 Notes.md", "fallback"), "Lecture 1 Notes");
  assert.equal(materialTitle(".pdf", "fallback"), "fallback");
});

test("formatBytes renders human sizes", () => {
  assert.equal(formatBytes(0), "");
  assert.equal(formatBytes(1024), "1.0 KB");
  assert.equal(formatBytes(25 * 1024 * 1024), "25 MB");
});

test("quota constants are sane and ordered", () => {
  assert.ok(MAX_MATERIALS_PER_COURSE > 0);
  assert.ok(MAX_COURSE_BYTES > 25 * 1024 * 1024);
});

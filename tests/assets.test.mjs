import test from "node:test";
import { createHash } from "node:crypto";
import { fleet, series, catalogSource } from "../src/fleet.js";
import assert from "node:assert/strict";
import { readFile, mkdtemp, writeFile, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import {
  assertPublicationUnchanged,
  validateVessel,
} from "../scripts/asset-contract.mjs";
import { checkEntry, guard } from "../scripts/guard-files.mjs";

const manifest = JSON.parse(
  await readFile("public/assets/manifest.json", "utf8"),
);
const original = manifest.vessels["hw-01"];
test("published versions reject source or camera changes even with identical image bytes", () => {
  const candidate = structuredClone(original);
  candidate.views.front.verifiedAt = new Date().toISOString();
  assertPublicationUnchanged(original, candidate);
  candidate.source.sha256 = "a".repeat(64);
  assert.throws(
    () => assertPublicationUnchanged(original, candidate),
    /new version/,
  );
  candidate.source = original.source;
  candidate.views.front.camera.lensMm = 50;
  assert.throws(
    () => assertPublicationUnchanged(original, candidate),
    /new version/,
  );
});
test("manifest rejects incomplete views, wrong identities and tampered delivery metadata", () => {
  for (const change of [
    (v) => delete v.views.bottom,
    (v) => (v.number = "5001"),
    (v) => (v.series = "YS"),
    (v) => (v.source.sha256 = "unknown"),
    (v) => (v.views.front.url = "https://example.com/front.webp"),
    (v) => (v.views.front.sha256 = "f".repeat(64)),
    (v) => (v.views.front.width = 640),
    (v) => (v.views.front.thumbnail.path = "../private.png"),
    (v) => (v.views.front.camera.orthoScale = 0),
    (v) => (v.views.front.verifiedAt = "never"),
  ]) {
    const vessel = structuredClone(original);
    change(vessel);
    assert.throws(() => validateVessel(vessel));
  }
});
test("camera axes and perspective matrices describe seven distinct complete views", () => {
  const directions = {
    front: [0, -1, 0],
    rear: [0, 1, 0],
    port: [-1, 0, 0],
    starboard: [1, 0, 0],
    top: [0, 0, 1],
    bottom: [0, 0, -1],
  };
  for (const vessel of Object.values(manifest.vessels)) {
    validateVessel(vessel);
    const positions = new Set();
    for (const [name, view] of Object.entries(vessel.views)) {
      positions.add(view.camera.location.join(","));
      if (directions[name]) {
        const delta = view.camera.location.map(
          (n, i) => n - view.camera.target[i],
        );
        const length = Math.hypot(...delta);
        delta.forEach((n, i) =>
          assert.ok(Math.abs(n / length - directions[name][i]) < 1e-5),
        );
      }
    }
    assert.equal(positions.size, 7);
  }
});
test("file gate rejects HD even below size limit and disguised binary sources", async () => {
  const hd = await sharp({
    create: { width: 2560, height: 1920, channels: 3, background: "#000" },
  })
    .webp()
    .toBuffer();
  assert.ok(hd.length < 100_000);
  await assert.rejects(
    checkEntry("public/assets/thumbnails/hw-01-front.webp", hd),
    /HD image/,
  );
  await assert.rejects(
    checkEntry("docs/instructions.txt", Buffer.from("BLENDER-v302")),
    /disguised/,
  );
  await assert.rejects(
    checkEntry("docs/large.txt", Buffer.alloc(512_001)),
    /exceeds/,
  );
  await assert.rejects(
    checkEntry(".env.production", Buffer.from("TOKEN=redacted")),
    /Credential/,
  );
});
test("force-added index cannot hide a large file by replacing its working copy", async () => {
  const dir = await mkdtemp(join(tmpdir(), "zep-guard-test-"));
  try {
    execFileSync("git", ["init", "-q", dir]);
    await writeFile(join(dir, "large.txt"), Buffer.alloc(512_001));
    execFileSync("git", ["-C", dir, "add", "-f", "large.txt"]);
    await writeFile(join(dir, "large.txt"), "tiny working copy");
    await assert.rejects(guard(dir, true), /Large staged object/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("catalogue covers the normative series and model list without fabricated specifications", async () => {
  const bytes = await readFile("docs/fleet-spec.md");
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    catalogSource.sha256,
  );
  const text = bytes.toString();
  const seriesSection = text.match(/^## 2\.[\s\S]*?(?=^## 3\.)/m)[0];
  const sourceSeries = [...seriesSection.matchAll(/\| `([A-Z]{2})` \|/g)].map(
    (match) => match[1],
  );
  const sourceModels = [
    ...new Set(
      [...text.matchAll(/`([A-Z]{2}-\d{2}A)`/g)].map((match) => match[1]),
    ),
  ].sort();
  assert.equal(sourceSeries.length, 17);
  assert.deepEqual(
    series.map((s) => s.code),
    sourceSeries,
  );
  assert.deepEqual(
    fleet
      .filter((s) => s.model)
      .map((s) => s.model)
      .sort(),
    sourceModels,
  );
  assert.equal(new Set(fleet.map((s) => s.id)).size, fleet.length);
  const numbers = fleet.map((s) => s.number).filter(Boolean);
  assert.equal(new Set(numbers).size, numbers.length);
  for (const family of series)
    assert.ok(fleet.some((s) => s.series === family.code));
  for (const ship of fleet) {
    if (ship.model)
      assert.match(ship.model, new RegExp(`^${ship.series}-[0-9]{2}A$`));
    if (ship.number) assert.match(ship.number, /^[1-9][0-9]{3}$/);
    if (!ship.asset) {
      assert.equal(ship.state, "planned");
      assert.equal(ship.dimensions, null);
      assert.equal(ship.number, null);
      assert.deepEqual(ship.specs, []);
      assert.equal(manifest.vessels[ship.id], undefined);
    }
  }
  assert.equal(series.find((s) => s.code === "YT").numberRange, null);
  assert.equal(fleet.find((s) => s.id === "by-01").sizeClass, null);
  assert.equal(fleet.find((s) => s.id === "hw-01").number, null);
  assert.equal(fleet.find((s) => s.id === "hw-01").asset.number, "227");
});

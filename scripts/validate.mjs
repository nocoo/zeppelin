import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import sharp from "sharp";
import { fleet } from "../src/fleet.js";
import { validateVessel } from "./asset-contract.mjs";
import { guard } from "./guard-files.mjs";

const manifest = JSON.parse(
  await readFile("public/assets/manifest.json", "utf8"),
);
assert.equal(manifest.schemaVersion, 1);
assert.deepEqual(
  Object.keys(manifest.vessels).sort(),
  fleet
    .filter((s) => s.asset)
    .map((s) => s.id)
    .sort(),
);
const thumbs = new Set();
for (const ship of fleet.filter((s) => s.asset)) {
  const vessel = manifest.vessels[ship.id];
  validateVessel(vessel);
  assert.equal(vessel.model, ship.asset.model);
  assert.equal(vessel.number, ship.asset.number);
  assert.equal(vessel.series, ship.series);
  for (const view of Object.values(vessel.views)) {
    const bytes = await readFile(`public/${view.thumbnail.path}`);
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      view.thumbnail.sha256,
    );
    assert.equal(bytes.length, view.thumbnail.bytes);
    const meta = await sharp(bytes).metadata();
    assert.equal(meta.width, view.thumbnail.width);
    assert.equal(meta.height, view.thumbnail.height);
    thumbs.add(view.thumbnail.path.split("/").at(-1));
  }
  const receipt = JSON.parse(
    await readFile(`docs/assets/${ship.id}/v${vessel.version}.json`, "utf8"),
  );
  assert.deepEqual(
    receipt,
    vessel,
    "Active manifest must match a retained publication record",
  );
}
assert.deepEqual(
  (await readdir("public/assets/thumbnails")).sort(),
  [...thumbs].sort(),
);
await guard();
console.info(
  `Validated ${fleet.length} catalogue entries, ${Object.keys(manifest.vessels).length} render sets, ${thumbs.size} standard views, immutable URLs and thumbnail hashes`,
);

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import asteroidBelt from "../docs/assets/scenes/asteroid-belt-v1.0.0.json" with { type: "json" };

const manifest = JSON.parse(
  await readFile("public/assets/manifest.json", "utf8"),
);
for (const vessel of [...Object.values(manifest.vessels), { model: asteroidBelt.name, views: { background: asteroidBelt.image } }]) {
  for (const [name, asset] of Object.entries(vessel.views)) {
    const response = await fetch(asset.url, {
      redirect: "error",
      signal: AbortSignal.timeout(30_000),
    });
    assert.equal(response.status, 200, asset.url);
    assert.equal(response.headers.get("content-type"), "image/webp");
    assert.match(response.headers.get("cache-control"), /immutable/);
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.equal(bytes.length, asset.bytes);
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      asset.sha256,
    );
    const meta = await sharp(bytes).metadata();
    assert.equal(meta.width, asset.width);
    assert.equal(meta.height, asset.height);
    console.info(
      `Verified ${vessel.model} ${name}: ${bytes.length} bytes / SHA-256 match`,
    );
  }
}

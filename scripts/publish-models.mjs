import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile, realpath, rename, mkdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { execFileSync } from "node:child_process";

const { values } = parseArgs({
  options: {
    input: { type: "string" },
    hexly: { type: "string" },
    publish: { type: "boolean" },
    version: { type: "string", default: "1.0.0" },
  },
});
assert.ok(
  values.input && values.hexly,
  "Use --input external-export-directory --hexly checkout [--publish]",
);
const input = await realpath(values.input);
const root = resolve(import.meta.dirname, "..");
assert.ok(!input.startsWith(root + "/"), "Keep model masters outside Git");
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const exported = JSON.parse(
  await readFile(join(input, "model-manifest.json"), "utf8"),
);
assert.match(exported.model, /^[A-Z]{2}-\d{2}[A-Z]$/);
assert.match(values.version, /^\d+\.\d+\.\d+$/);
const slug = exported.model.toLowerCase();
const id = slug.replace(/[a-z]$/, "");
assert.equal(
  exported.exporterSha256,
  hash(await readFile(join(root, "scripts/export-model.py"))),
);
const helper = resolve(values.hexly, "scripts/media-r2.ts");
const { planMedia, publishMedia, mediaTypes } = await import(
  pathToFileURL(helper)
);
// Extend this process's format registry; reuse Hexly's transport without modifying its checkout.
mediaTypes[".glb"] = "model/gltf-binary";
const manifest = {
  ...exported,
  version: values.version,
  publisher: {
    repository: "https://github.com/nocoo/hexly.ai",
    commit: execFileSync(
      "git",
      ["-C", resolve(values.hexly), "rev-parse", "HEAD"],
      { encoding: "utf8" },
    ).trim(),
    helper: "scripts/media-r2.ts",
    helperSha256: hash(await readFile(helper)),
  },
  assets: {},
};
for (const [lod, asset] of Object.entries(exported.assets)) {
  assert.equal(asset.file, `${slug}-${lod}.glb`);
  const file = join(input, asset.file),
    bytes = await readFile(file);
  assert.equal(hash(bytes), asset.sha256);
  assert.equal(bytes.length, asset.bytes);
  const plan = await planMedia({
    project: "hexly-ai",
    kind: "documents",
    asset: `zeppelin-${slug}-3d`,
    version: manifest.version,
    file,
  });
  manifest.assets[lod] = {
    ...asset,
    ...plan,
    path: `assets/models/${slug}-${lod}-${asset.sha256.slice(0, 12)}.glb`,
  };
}
await writeFile(
  join(input, "publication-plan.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);
if (!values.publish) {
  console.info(`Plan ready: ${join(input, "publication-plan.json")}`);
} else {
  const record = join(root, `docs/assets/${id}/3d-v${manifest.version}.json`);
  await mkdir(join(root, "docs/assets", id), { recursive: true });
  let previous;
  try {
    previous = JSON.parse(await readFile(record, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  if (previous) {
    assert.equal(
      previous.source.sha256,
      manifest.source.sha256,
      "Published source is immutable",
    );
    for (const lod of Object.keys(manifest.assets))
      assert.equal(
        previous.assets[lod].sha256,
        manifest.assets[lod].sha256,
        "Publish a new version for changed bytes",
      );
  }
  for (const [lod, asset] of Object.entries(manifest.assets)) {
    const file = join(input, exported.assets[lod].file);
    assert.equal(
      hash(await readFile(file)),
      asset.sha256,
      "Model changed before publication",
    );
    const receipt = await publishMedia(asset, file);
    manifest.assets[lod] = {
      ...asset,
      ...receipt,
      verifiedAt: new Date().toISOString(),
    };
    console.info(
      `${lod}: ${receipt.action}, ${asset.bytes} bytes, GET/hash verified`,
    );
  }
  if (
    !previous ||
    Object.values(previous.assets).some((asset) => !asset.verifiedAt)
  ) {
    await writeFile(`${record}.tmp`, JSON.stringify(manifest, null, 2) + "\n");
    await rename(`${record}.tmp`, record);
  }
}

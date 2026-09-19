import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { validateModel } from "../scripts/prepare-models.mjs";
import { checkEntry } from "../scripts/guard-files.mjs";
import model from "../docs/assets/hw-01/3d-v1.0.0.json" with { type: "json" };

test("HW-01A model provenance, LODs, immutable paths and binary boundary", async () => {
  assert.equal(model.model, "HW-01A");
  assert.equal(model.number, "2227");
  assert.equal(model.sourceObjects, 3965);
  assert.match(model.source.sha256, /^[a-f0-9]{64}$/);
  assert.equal(
    model.exporterSha256,
    createHash("sha256")
      .update(await readFile("scripts/export-hw-01.py"))
      .digest("hex"),
  );
  assert.ok(
    model.assets.detail.triangles > model.assets.overview.triangles * 2,
  );
  for (const [lod, asset] of Object.entries(model.assets)) {
    assert.equal(
      asset.path,
      `assets/models/hw-01a-${lod}-${asset.sha256.slice(0, 12)}.glb`,
    );
    assert.equal(asset.url, `https://h.no.mt/${asset.key}`);
    assert.ok(asset.bytes < 25 * 1024 * 1024);
    assert.equal(asset.contentType, "model/gltf-binary");
    assert.ok(Number.isFinite(Date.parse(asset.verifiedAt)));
    await assert.rejects(
      checkEntry(`public/${asset.path}`, Buffer.from("glTF")),
      /forbidden/,
    );
  }
  await assert.rejects(
    checkEntry("docs/model.dat", Buffer.from("glTF")),
    /disguised/,
  );
  // Tiny valid container verifies integrity logic without committing binary fixtures.
  const bytes = Buffer.alloc(20);
  bytes.write("glTF");
  bytes.writeUInt32LE(2, 4);
  bytes.writeUInt32LE(20, 8);
  const asset = {
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
  validateModel(bytes, asset);
  assert.throws(() => validateModel(bytes.subarray(0, 19), asset), /size/);
  bytes[19] = 1;
  assert.throws(() => validateModel(bytes, asset), /hash/);
});

import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { validateModel } from "../scripts/prepare-models.mjs";
import { checkEntry } from "../scripts/guard-files.mjs";
import { models } from "../src/models.js";
import { fleet } from "../src/fleet.js";

test("model provenance, LODs, CDN paths and binary boundary", async () => {
  for (const [id, { model, views }] of Object.entries(models)) {
    const ship = fleet.find(ship => ship.id === id);
    assert.equal(model.model, ship.model);
    assert.equal(model.number, ship.number);
    assert.ok(model.sourceObjects > 0);
    for (const view of Object.values(views))
      if (view.scene) assert.ok(model.source.scenes.includes(view.scene));
    if (id.startsWith("ys-")) {
      const report = JSON.parse(await readFile(`docs/assets/${id}/final-v1.0.0.json`));
      assert.equal(report.status, "PASS");
      assert.equal(model.source.sha256, report.model.sha256);
      assert.equal(ship.state, "ready");
    }
    assert.match(model.source.sha256, /^[a-f0-9]{64}$/);
    assert.match(model.exporterSha256, /^[a-f0-9]{64}$/);
    assert.ok(
      model.assets.detail.triangles > model.assets.overview.triangles * 2,
    );
    for (const [lod, asset] of Object.entries(model.assets)) {
      assert.equal(
        asset.path,
        `assets/models/${model.model.toLowerCase()}-${lod}-${asset.sha256.slice(0, 12)}.glb`,
      );
      assert.equal(asset.url, `https://h.no.mt/${asset.key}`);
      assert.ok(asset.bytes > 0);
      assert.equal(asset.contentType, "model/gltf-binary");
      assert.ok(Number.isFinite(Date.parse(asset.verifiedAt)));
      await assert.rejects(
        checkEntry(`public/${asset.path}`, Buffer.from("glTF")),
        /forbidden/,
      );
    }
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

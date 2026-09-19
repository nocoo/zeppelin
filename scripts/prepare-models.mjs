import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import model from "../docs/assets/hw-01/3d-v1.0.0.json" with { type: "json" };

export function validateModel(bytes, asset) {
  assert.equal(bytes.length, asset.bytes, "Model size mismatch");
  assert.equal(bytes.toString("utf8", 0, 4), "glTF", "Invalid GLB header");
  assert.equal(bytes.readUInt32LE(4), 2, "Require glTF 2");
  assert.equal(bytes.readUInt32LE(8), bytes.length, "Truncated GLB");
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    asset.sha256,
    "Model hash mismatch",
  );
}

if (import.meta.main) {
  await mkdir("public/assets/models", { recursive: true });
  for (const asset of Object.values(model.assets)) {
    assert.match(
      asset.path,
      /^assets\/models\/hw-01a-(overview|detail)-[a-f0-9]{12}\.glb$/,
    );
    assert.ok(asset.bytes < 25 * 1024 * 1024);
    const path = `public/${asset.path}`;
    let bytes;
    try {
      bytes = await readFile(path);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    if (bytes) {
      validateModel(bytes, asset);
      continue;
    }
    const response = await fetch(asset.url, {
      redirect: "error",
      signal: AbortSignal.timeout(120_000),
    });
    assert.equal(
      response.status,
      200,
      `Model download failed: ${asset.filename}`,
    );
    assert.equal(
      response.headers.get("content-type")?.split(";")[0],
      "model/gltf-binary",
    );
    bytes = Buffer.from(await response.arrayBuffer());
    validateModel(bytes, asset);
    await writeFile(`${path}.tmp`, bytes);
    await rename(`${path}.tmp`, path);
  }
  console.info(
    "HW-01A models verified and prepared for same-origin static delivery",
  );
}

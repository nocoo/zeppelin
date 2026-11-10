import assert from "node:assert/strict";
import { createHash } from "node:crypto";

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

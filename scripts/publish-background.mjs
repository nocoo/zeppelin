import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir, realpath } from "node:fs/promises";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import sharp from "sharp";

const { values } = parseArgs({ options: {
  input: { type: "string" }, hexly: { type: "string" },
  version: { type: "string" }, publish: { type: "boolean", default: false },
} });
assert(values.input && values.hexly && /^\d+\.\d+\.\d+$/.test(values.version ?? ""),
  "Required: --input external-directory --hexly checkout --version X.Y.Z [--publish]");
const root = resolve(import.meta.dirname, "..");
const input = await realpath(values.input);
assert(input !== root && !input.startsWith(root + "/"), "Keep images outside repository");
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const source = JSON.parse(await readFile(join(input, "render-manifest.json"), "utf8"));
assert.equal(source.id, "asteroid-belt");
assert.equal(source.image.file, "asteroid-belt.png");
const png = await readFile(join(input, source.image.file));
assert.equal(hash(png), source.image.sha256);
assert.equal(png.length, source.image.bytes);
const file = join(input, "asteroid-belt.webp");
await sharp(png).webp({ quality: 90, effort: 6 }).toFile(file);
const { planMedia, publishMedia } = await import(pathToFileURL(resolve(values.hexly, "scripts/media-r2.ts")));
const plan = await planMedia({ project: "hexly-ai", kind: "textures", asset: "zeppelin-asteroid-belt", version: values.version, file });
assert.equal(plan.bucket, "hexlyai");
assert.equal(new URL(plan.url).origin, "https://h.no.mt");
await writeFile(join(input, "plan.json"), JSON.stringify(plan, null, 2) + "\n");
if (!values.publish) {
  console.info(`Plan: ${plan.url} / ${plan.bytes} bytes`);
} else {
  const path = join(root, "docs/assets/scenes", `asteroid-belt-v${values.version}.json`);
  let previous;
  try { previous = JSON.parse(await readFile(path, "utf8")); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  if (previous) {
    assert.equal(previous.image.sha256, plan.sha256, "Published bytes changed; use a new version");
    assert.deepEqual(previous.source, source.source);
  }
  const image = await publishMedia(plan, file);
  const receipt = { ...source, version: values.version, image: {
    ...image, width: source.render.width, height: source.render.height,
    pngSha256: source.image.sha256, verifiedAt: new Date().toISOString(),
  } };
  await mkdir(join(root, "docs/assets/scenes"), { recursive: true });
  if (!previous) await writeFile(path, JSON.stringify(receipt, null, 2) + "\n", { flag: "wx" });
  console.info(`Verified background: ${image.url}`);
}

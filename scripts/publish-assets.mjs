import { createHash } from "node:crypto";
import {
  readFile,
  writeFile,
  mkdir,
  copyFile,
  rename,
  open,
  unlink,
  realpath,
} from "node:fs/promises";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { execFileSync } from "node:child_process";
import sharp from "sharp";
import {
  assertPublicationUnchanged,
  validateVessel,
  views,
} from "./asset-contract.mjs";

const { values } = parseArgs({
  options: {
    input: { type: "string" },
    hexly: { type: "string" },
    version: { type: "string" },
    publish: { type: "boolean", default: false },
  },
});
if (
  !values.input ||
  !values.hexly ||
  !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(values.version ?? "")
) {
  throw new Error(
    "Required: --input external-render-directory --hexly checkout --version X.Y.Z [--publish]",
  );
}
const root = resolve(import.meta.dirname, "..");
const input = await realpath(values.input);
if (input === root || input.startsWith(root + "/"))
  throw new Error("HD assets must remain outside repository");
const hexly = resolve(values.hexly);
const hash = (buffer) => createHash("sha256").update(buffer).digest("hex");
const source = JSON.parse(
  await readFile(join(input, "render-manifest.json"), "utf8"),
);
validateVessel(source, false);
const { planMedia, publishMedia } = await import(
  pathToFileURL(join(hexly, "scripts/media-r2.ts"))
);
const storage = JSON.parse(
  await readFile(join(hexly, "src/data/media-storage.json"), "utf8"),
);
if (storage.origin !== "https://h.no.mt" || storage.bucket !== "hexlyai")
  throw new Error("Hexly storage contract changed; review before proceeding");
const provenance = {
  repository: "https://github.com/nocoo/hexly.ai",
  commit: execFileSync("git", ["-C", hexly, "rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim(),
  helper: "scripts/media-r2.ts",
  helperSha256: hash(await readFile(join(hexly, "scripts/media-r2.ts"))),
  bucket: storage.bucket,
  origin: storage.origin,
  project: "hexly-ai",
  consumerProject: "zep",
};
const exported = structuredClone(source);
exported.version = values.version;
exported.publisher = provenance;
exported.views = {};
const prepared = join(input, "web");
await mkdir(prepared, { recursive: true });
const plans = [];
for (const name of views) {
  const view = source.views[name];
  if (view.file !== `${name}.png`) throw new Error("Unexpected input filename");
  const bytes = await readFile(join(input, view.file));
  if (hash(bytes) !== view.sha256 || bytes.length !== view.bytes)
    throw new Error(`PNG mismatch: ${name}`);
  const metadata = await sharp(bytes).metadata();
  if (metadata.width !== view.width || metadata.height !== view.height)
    throw new Error(`PNG dimensions: ${name}`);
  const file = join(prepared, `${name}.webp`);
  await sharp(bytes).webp({ quality: 90, effort: 6 }).toFile(file);
  const thumb = await sharp(bytes)
    .resize({ width: 640, height: 640, fit: "inside" })
    .webp({ quality: 72 })
    .toBuffer();
  const thumbMeta = await sharp(thumb).metadata();
  if (thumb.length > 100_000) throw new Error("Thumbnail exceeds 100 KB");
  await writeFile(join(prepared, `${name}-thumbnail.webp`), thumb);
  const plan = await planMedia({
    project: "hexly-ai",
    kind: "screenshots",
    asset: `zep-${source.model.toLowerCase()}`,
    version: values.version,
    file,
  });
  plans.push({ name, file, plan });
  exported.views[name] = {
    ...view,
    file: `${name}.webp`,
    pngSha256: view.sha256,
    ...plan,
    thumbnail: {
      path: `assets/thumbnails/${source.model.toLowerCase()}-${name}.webp`,
      sha256: hash(thumb),
      bytes: thumb.length,
      width: thumbMeta.width,
      height: thumbMeta.height,
    },
  };
}
await writeFile(
  join(input, "plan.json"),
  JSON.stringify(
    { publisher: provenance, assets: plans.map((p) => p.plan) },
    null,
    2,
  ) + "\n",
);
if (!values.publish) {
  console.info(
    `Plan ready: ${source.model}, ${plans.length} objects, ${plans.reduce((n, p) => n + p.plan.bytes, 0)} bytes. Review ${join(input, "plan.json")}`,
  );
  process.exit(0);
}
// One local publisher installs a complete fleet snapshot, never a partial upload result.
await mkdir(join(root, ".local"), { recursive: true });
const lockPath = join(root, ".local/publish.lock");
const lock = await open(lockPath, "wx");
try {
  await lock.writeFile(String(process.pid));
  let manifest;
  try {
    manifest = JSON.parse(
      await readFile(join(root, "public/assets/manifest.json"), "utf8"),
    );
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    manifest = { schemaVersion: 1, vessels: {} };
  }
  const historyPath = join(
    root,
    "docs/assets",
    source.model.toLowerCase(),
    `v${values.version}.json`,
  );
  let previous;
  try {
    previous = JSON.parse(await readFile(historyPath, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  if (previous) assertPublicationUnchanged(previous, exported);
  for (const { name, file, plan } of plans) {
    const bytes = await readFile(file);
    if (hash(bytes) !== plan.sha256)
      throw new Error("Prepared bytes changed before publication");
    const receipt = await publishMedia(plan, file);
    exported.views[name] = {
      ...exported.views[name],
      ...receipt,
      verifiedAt: new Date().toISOString(),
    };
    console.info(`${source.model} ${name}: ${receipt.action}`);
  }
  validateVessel(exported);
  // Revalidation leaves the original versioned receipt byte-for-byte intact.
  manifest.vessels[source.model.toLowerCase()] = previous ?? exported;
  await mkdir(join(root, "public/assets/thumbnails"), { recursive: true });
  await mkdir(join(root, "docs/assets", source.model.toLowerCase()), {
    recursive: true,
  });
  if (!previous)
    await writeFile(historyPath, JSON.stringify(exported, null, 2) + "\n", {
      flag: "wx",
    });
  for (const name of views)
    await copyFile(
      join(prepared, `${name}-thumbnail.webp`),
      join(root, "public", exported.views[name].thumbnail.path),
    );
  await writeFile(
    join(root, "public/assets/manifest.json.tmp"),
    JSON.stringify(manifest, null, 2) + "\n",
  );
  await rename(
    join(root, "public/assets/manifest.json.tmp"),
    join(root, "public/assets/manifest.json"),
  );
  console.info(
    `Installed complete verified ${source.model} manifest and thumbnails`,
  );
} finally {
  await lock.close();
  await unlink(lockPath);
}

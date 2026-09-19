import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import manifest from "../package.json" with { type: "json" };

const origin = new URL(process.env.DEPLOY_URL || "https://zeppelin.hexly.ai");
const revision = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
const get = async (path) => {
  const response = await fetch(new URL(path, origin), {
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  assert.equal(response.status, 200, `${path}: HTTP ${response.status}`);
  return response;
};
const live = await get(`/api/live?revision=${revision}`);
assert.match(live.headers.get("content-type"), /application\/json/);
assert.equal(live.headers.get("cache-control"), "no-store");
assert.deepEqual(await live.json(), {
  status: "ok",
  name: manifest.name,
  version: manifest.version,
  revision,
});
const html = await (await get("/")).text();
assert.ok(html.includes('id="app"'), "Homepage is missing");
const assets = [...html.matchAll(/(?:src|href)="([^"<>]+\.(?:js|css))"/g)].map(
  (match) => match[1],
);
assert.ok(
  assets.some((path) => path.endsWith(".js")) &&
    assets.some((path) => path.endsWith(".css")),
  "Compiled assets are missing",
);
for (const path of assets) {
  const response = await get(path);
  assert.ok(
    response.headers
      .get("content-type")
      ?.includes(path.endsWith(".js") ? "javascript" : "text/css"),
  );
  await response.arrayBuffer();
}
assert.deepEqual(
  await (await get("/assets/manifest.json")).json(),
  JSON.parse(
    await readFile(new URL("../public/assets/manifest.json", import.meta.url)),
  ),
  "Published fleet manifest differs from this release",
);
console.info(
  `Verified ${origin.origin}: ${manifest.name} v${manifest.version}, revision ${revision}, homepage, compiled assets and fleet manifest`,
);

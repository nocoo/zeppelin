import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import manifest from "../../package.json" with { type: "json" };

test("Worker live endpoint reports this release without caching, including HEAD", async ({
  request,
}) => {
  const response = await request.get("/api/live?probe=ci");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("application/json");
  expect(response.headers()["cache-control"]).toBe("no-store");
  expect(await response.json()).toEqual({
    status: "ok",
    name: "zeppelin",
    version: manifest.version,
    revision: execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim(),
  });
  const head = await request.head("/api/live");
  expect(head.status()).toBe(200);
  expect(head.headers()["cache-control"]).toBe("no-store");
  expect(await head.body()).toHaveLength(0);
  const post = await request.post("/api/live");
  expect(post.status()).toBe(405);
  expect(post.headers().allow).toBe("GET, HEAD");
});

test("Worker serves site assets with security headers and real 404s", async ({
  request,
}) => {
  const home = await request.get("/");
  expect(home.status()).toBe(200);
  expect(home.headers()["content-security-policy"]).toContain(
    "frame-ancestors 'none'",
  );
  expect(home.headers()["x-content-type-options"]).toBe("nosniff");
  expect(await home.text()).toContain('id="app"');
  const assets = await request.get("/assets/manifest.json");
  expect(assets.status()).toBe(200);
  expect((await assets.json()).schemaVersion).toBe(1);
  for (const path of ["/api/missing", "/assets/missing.webp"]) {
    expect((await request.get(path)).status()).toBe(404);
  }
});

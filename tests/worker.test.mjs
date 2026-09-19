import test from "node:test";
import assert from "node:assert/strict";
import worker from "../worker.js";

test("health fails closed when release metadata is missing or replaced with HTML", async () => {
  for (const status of [404, 200]) {
    for (const method of ["GET", "HEAD"]) {
      const env = {
        ASSETS: {
          fetch: async () =>
            new Response("<html>Fallback</html>", {
              status,
              headers: { "Content-Type": "text/html" },
            }),
        },
      };
      const response = await worker.fetch(
        new Request("https://zeppelin.hexly.ai/api/live", { method }),
        env,
      );
      assert.equal(response.status, 503);
      assert.equal(response.headers.get("Cache-Control"), "no-store");
      if (method === "HEAD") assert.equal(await response.text(), "");
      else assert.equal((await response.json()).status, "error");
    }
  }
});

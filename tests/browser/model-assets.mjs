import { models } from "../../src/models.js";

// Exercise the published CDN URLs with verified real GLBs, without network-dependent CI.
export async function routeModels(page) {
  for (const { model } of Object.values(models))
    for (const asset of Object.values(model.assets))
      await page.route(asset.url, (route) => route.fulfill({
        path: `.local/models/${asset.path.split("/").at(-1)}`,
        contentType: "model/gltf-binary",
        headers: { "Access-Control-Allow-Origin": "*" },
      }));
}

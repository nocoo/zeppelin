import { test, expect } from "@playwright/test";
import { routeModels } from "./model-assets.mjs";
test.beforeEach(async ({ page }) => routeModels(page));

// Keep real-model smoke coverage affordable on CI's software WebGL renderer.
test.use({
  deviceScaleFactor: 1,
  trace: { mode: "retain-on-failure", screenshots: false },
});

const ready = (page) =>
  expect(page.locator(".model-preview")).toHaveAttribute(
    "data-state",
    "ready",
    { timeout: 60000 },
  );

test("overview and detail load, with detail zoom locked and rotation available", async ({ page }) => {
  test.setTimeout(180000);
  const errors = [], models = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (request.url().endsWith(".glb")) models.push(request.url());
  });
  await page.goto("/#vessel/hw-01");
  await ready(page);
  expect(models).toHaveLength(1);

  await page.getByRole("button", { name: "细节", exact: true }).click();
  await ready(page);
  await expect(page.locator(".model-preview")).toHaveAttribute("data-lod", "detail");
  expect(models).toHaveLength(2);
  const canvas = page.locator(".model-preview canvas");
  await canvas.hover();
  const before = await canvas.screenshot();
  await page.mouse.wheel(0, -900);
  await page.waitForTimeout(100);
  expect((await canvas.screenshot()).equals(before)).toBe(true);
  await canvas.focus();
  await page.keyboard.press("ArrowRight");
  expect((await canvas.screenshot()).equals(before)).toBe(false);
  expect(errors).toEqual([]);
});

test("unavailable WebGL keeps standard views reachable", async ({ page }) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return type.startsWith("webgl")
        ? null
        : getContext.call(this, type, ...args);
    };
  });
  await page.goto("/#vessel/hw-01");
  await expect(page.locator(".model-status")).toContainText("3D 预览暂不可用");
  await page.getByRole("button", { name: "标准视图", exact: true }).click();
  await expect(page.locator("#active-view")).toBeVisible();
  await page.locator('[data-view="port"]').click();
  await expect(page.locator('[data-view="port"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

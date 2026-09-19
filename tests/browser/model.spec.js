import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import model from "../../docs/assets/hw-01/3d-v1.0.0.json" with { type: "json" };

const ready = (page) =>
  expect(page.locator(".model-preview")).toHaveAttribute(
    "data-state",
    "ready",
    { timeout: 60000 },
  );

test("real GLBs render, detail zoom stays locked, views rotate and resources reload after navigation", async ({
  page,
}) => {
  test.setTimeout(180000);
  const errors = [],
    models = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (request.url().endsWith(".glb")) models.push(request.url());
  });
  await page.goto("/");
  expect(models).toEqual([]);
  await page.goto("/#vessel/hw-01");
  await ready(page);
  const canvas = page.locator(".model-preview canvas");
  await canvas.focus();
  let before = await canvas.screenshot();
  await page.keyboard.press("ArrowRight");
  expect((await canvas.screenshot()).equals(before)).toBe(false);
  for (const view of [
    "front",
    "rear",
    "port",
    "starboard",
    "top",
    "bottom",
    "three-quarter",
  ]) {
    await page.locator(`[data-model-view="${view}"]`).click();
    await ready(page);
    await expect(page.locator(".model-preview")).toHaveAttribute(
      "data-model-pose",
      view,
    );
  }
  await canvas.hover();
  before = await canvas.screenshot();
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(100);
  expect((await canvas.screenshot()).equals(before)).toBe(false);
  expect(models).toHaveLength(1); // Detail bytes are requested only when entering details.
  await page.getByRole("button", { name: "细节", exact: true }).click();
  await ready(page);
  await expect(page.locator(".model-preview")).toHaveAttribute(
    "data-lod",
    "detail",
  );
  await expect(canvas).toHaveAttribute("aria-label", /仅可旋转/);
  await canvas.hover();
  before = await canvas.screenshot();
  await page.mouse.wheel(0, -900);
  await page.waitForTimeout(100);
  expect((await canvas.screenshot()).equals(before)).toBe(true);
  await page.mouse.wheel(0, 900);
  await page.waitForTimeout(100);
  expect((await canvas.screenshot()).equals(before)).toBe(true);
  // A symmetric pinch must leave framing unchanged, including in the touch-enabled project.
  const session = await page.context().newCDPSession(page);
  const box = await canvas.boundingBox();
  const x = box.x + box.width / 2,
    y = box.y + box.height / 2;
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { x: x - 30, y, id: 0 },
      { x: x + 30, y, id: 1 },
    ],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [
      { x: x - 90, y, id: 0 },
      { x: x + 90, y, id: 1 },
    ],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await page.waitForTimeout(100);
  expect((await canvas.screenshot()).equals(before)).toBe(true);
  await canvas.focus();
  await page.keyboard.press("ArrowRight");
  expect((await canvas.screenshot()).equals(before)).toBe(false);
  for (const view of [
    "bridge",
    "weapons",
    "flank",
    "engine",
    "stern",
    "ventral",
    "bow",
  ]) {
    await page.locator(`[data-model-view="${view}"]`).click();
    await ready(page);
    await expect(page.locator(`[data-model-view="${view}"]`)).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  }
  expect(models).toHaveLength(2); // Reuse both decoded levels within this workbench.
  await page.getByRole("button", { name: "标准视图", exact: true }).click();
  await expect(canvas).not.toBeVisible();
  await page.getByRole("button", { name: "3D 预览", exact: true }).click();
  await expect(page.locator('[data-model-view="bow"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
  for (const size of [
    { width: 320, height: 568 },
    { width: 844, height: 390 },
    { width: 1440, height: 1000 },
  ]) {
    await page.setViewportSize(size);
    await expect(page.locator(".model-reset")).toBeInViewport({ ratio: 1 });
    for (const button of await page
      .locator('[data-lod="detail"]:visible')
      .all())
      await expect(button).toBeInViewport({ ratio: 1 });
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollHeight <= innerHeight &&
          document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.getByRole("link", { name: "← 舰队档案" }).click();
  await expect(canvas).toHaveCount(0);
  await page.goto("/#vessel/hw-01");
  await ready(page);
  expect(errors).toEqual([]);
});

test("failed detailed asset is retryable and rapid view changes retain the latest selection", async ({
  page,
}) => {
  test.setTimeout(120000);
  let fail = true;
  await page.route(`**/${model.assets.detail.path}`, (route) =>
    fail
      ? route.fulfill({ status: 503, body: "Unavailable" })
      : route.continue(),
  );
  await page.goto("/#vessel/hw-01");
  await ready(page);
  await page.getByRole("button", { name: "细节", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "重试 3D 载入 ↻" }),
  ).toBeVisible();
  fail = false;
  await page.getByRole("button", { name: "重试 3D 载入 ↻" }).click();
  await page.locator('[data-model-view="stern"]').click();
  await page.locator('[data-model-view="engine"]').click();
  await ready(page);
  await expect(page.locator(".model-preview")).toHaveAttribute(
    "data-model-pose",
    "engine",
  );
  await expect(page.locator(".model-caption strong")).toHaveText("引擎机械舱");
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

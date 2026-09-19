import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { fleet, series, viewLabels } from "../../src/fleet.js";
import manifest from "../../public/assets/manifest.json" with { type: "json" };

// Real immutable URLs, deterministic local thumbnail bytes. Live HD is independently GET/hash verified.
test.beforeEach(async ({ page }) => {
  for (const ship of Object.values(manifest.vessels)) {
    for (const view of Object.values(ship.views)) {
      await page.route(view.url, (route) =>
        route.fulfill({
          path: `public/${view.thumbnail.path}`,
          contentType: "image/webp",
        }),
      );
    }
  }
});

test("directory filters, ship identity, direct routes and back navigation", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator(".ship-card")).toHaveCount(fleet.length);
  await page.getByRole("button", { name: /YS \/ 运输舰/ }).click();
  await expect(page.locator(".ship-card")).toHaveCount(3);
  await expect(page.locator(".fleet-count")).toHaveText("1 SERIES / 3 MODELS");
  await page.getByRole("link", { name: "进入 YS-01A 档案" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("YS-01");
  await expect(page.locator(".vessel-sidebar")).toContainText("5001");
  await expect(page.locator(".prototype-notice")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("YS-01");
  await page.getByRole("link", { name: "← 舰队档案" }).click();
  await expect(page.locator(".ship-card")).toHaveCount(fleet.length);
  await expect(page.locator("#fleet")).toBeInViewport();
  expect(errors).toEqual([]);
});

for (const id of ["hw-01", "ys-01", "ys-02"]) {
  test(`${id}: seven views, modal keyboard/focus and accessible layout`, async ({
    page,
  }) => {
    await page.goto(`/#vessel/${id}`);
    for (const view of Object.keys(manifest.vessels[id].views)) {
      const button = page.locator(`[data-view="${view}"]`);
      await button.click();
      await expect(button).toHaveAttribute("aria-pressed", "true");
      await expect(page.locator("#active-view img")).toHaveAttribute(
        "src",
        manifest.vessels[id].views[view].url,
      );
      await expect
        .poll(() =>
          page.locator("#active-view img").evaluate((img) => img.naturalWidth),
        )
        .toBeGreaterThan(0);
    }
    const expand = page.getByRole("button", { name: "放大当前高清视图" });
    await expand.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(expand).toBeFocused();
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(result.violations).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });
}
test("home is accessible and works without motion or horizontal overflow", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(result.violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "跳至主要内容" })).toBeFocused();
});
test("production CDN failure is explicit, retryable, and never silently uses a thumbnail", async ({
  page,
}) => {
  const asset = manifest.vessels["hw-01"].views["three-quarter"];
  let failed = true;
  await page.route(asset.url, (route) =>
    failed
      ? route.abort()
      : route.fulfill({
          path: `public/${asset.thumbnail.path}`,
          contentType: "image/webp",
        }),
  );
  await page.goto("/?assets=offline#vessel/hw-01");
  await expect(page.locator(".offline-banner")).toHaveCount(0);
  await expect(page.locator("#active-view .asset-error")).toBeVisible();
  await expect(page.locator("#active-view img")).toHaveAttribute(
    "src",
    asset.url,
  );
  failed = false;
  await page
    .locator("#active-view")
    .getByRole("button", { name: "重新载入 ↻" })
    .click();
  await expect(page.locator("#active-view .asset-error")).not.toBeVisible();
  await expect
    .poll(() =>
      page.locator("#active-view img").evaluate((img) => img.naturalWidth),
    )
    .toBeGreaterThan(0);
});

test("manifest failure shows an explicit recoverable page", async ({
  page,
}) => {
  await page.route("**/assets/manifest.json", (route) =>
    route.fulfill({ status: 503, body: "Unavailable" }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "舰队档案暂时无法载入" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "重新载入 ↻" })).toBeVisible();
});

test("all series filter into their own directory without invented types", async ({
  page,
}) => {
  await page.goto("/#fleet");
  for (const family of series) {
    await page.locator(`[data-filter="${family.code}"]`).click();
    await expect(page.locator(".series-section")).toHaveCount(1);
    await expect(page.locator(".series-heading h3")).toContainText(family.name);
    await expect(page.locator(".ship-card")).toHaveCount(
      fleet.filter((s) => s.series === family.code).length,
    );
  }
});

test("planned views are explicit placeholders with unknown dimensions and no download", async ({
  page,
}) => {
  const requests = [];
  page.on("request", (req) => {
    if (/h\.no\.mt.*webp/.test(req.url())) requests.push(req.url());
  });
  for (const id of ["ht-01", "qs-01", "ys-03", "yt"]) {
    await page.goto(`/#vessel/${id}`);
    await expect(page.locator(".vessel-sidebar")).toContainText("未知");
    await expect(page.locator(".expand-view")).toHaveCount(0);
    await expect(
      page.getByRole("link", { name: "打开高清原图 ↗" }),
    ).toHaveCount(0);
    for (const view of Object.keys(viewLabels)) {
      await page.locator(`[data-view="${view}"]`).click();
      await expect(
        page.locator("#active-view .view-placeholder"),
      ).toHaveAttribute("data-placeholder", `${id}/${view}`);
      await expect(page.locator("#active-view")).toContainText(
        "设计视图待制作",
      );
      await expect(page.locator("#active-view img")).toHaveCount(0);
    }
  }
  await expect(page.locator(".vessel-sidebar")).toContainText("型号尚未分配");
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(result.violations).toEqual([]);
  expect(requests).toEqual([]);
});

test("viewer dominates desktop layout and stacks ahead of metadata on mobile", async ({
  page,
}) => {
  await page.goto("/#vessel/ht-01");
  const viewer = await page.locator(".viewer").boundingBox();
  const sidebar = await page.locator(".vessel-sidebar").boundingBox();
  if (page.viewportSize().width > 1050) {
    expect(viewer.width / (viewer.width + sidebar.width)).toBeGreaterThan(0.7);
    expect(sidebar.x).toBeGreaterThan(viewer.x + viewer.width);
    expect(Math.abs(sidebar.y - viewer.y)).toBeLessThan(2);
    await page.setViewportSize({ width: 820, height: 1180 });
    const tabletViewer = await page.locator(".viewer").boundingBox();
    const tabletInfo = await page.locator(".vessel-sidebar").boundingBox();
    expect(tabletViewer.width).toBeGreaterThan(820 * 0.9);
    expect(tabletInfo.y).toBeGreaterThan(tabletViewer.y + tabletViewer.height);
  } else {
    expect(sidebar.y).toBeGreaterThan(viewer.y + viewer.height);
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

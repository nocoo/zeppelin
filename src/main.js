import "./style.css";
import packageInfo from "../package.json";
const { version } = packageInfo;
import { fleet, series, viewLabels } from "./fleet.js";
let manifest;
let disposePreview = () => {};

const app = document.querySelector("#app");
document.querySelector(".skip-link").addEventListener("click", (event) => {
  const main = app.querySelector("#main");
  if (!main) return;
  event.preventDefault();
  main.focus({ preventScroll: true });
  if (!document.documentElement.classList.contains("detail-mode"))
    main.scrollIntoView();
});
const base = import.meta.env.BASE_URL;
const offline =
  import.meta.env.DEV &&
  new URLSearchParams(location.search).get("assets") === "offline";
const arrow = '<span aria-hidden="true">↗</span>';
const githubIcon = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.87c-2.78.6-3.37-1.18-3.37-1.18-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.35 1.09 2.93.83.09-.65.35-1.09.64-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.58 9.58 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.94.36.31.68.92.68 1.85v2.76c0 .27.18.58.69.48A10 10 0 0 0 12 2Z"/></svg>';
const hexlyIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 2 8.66 5v10L12 22l-8.66-5V7Z"/><path d="M12 2v20M3.34 7l17.32 10m0-10L3.34 17"/></svg>';
const badge = (ship) =>
  `<span class="status ${ship.state}"><span aria-hidden="true"></span>${ship.status}</span>`;
const source = (id, view) => manifest.vessels[id].views[view];
const displayModel = (ship) => ship.model || `${ship.series} / —`;
const seriesOf = (ship) => series.find((item) => item.code === ship.series);
function picture(id, view, className = "", eager = false) {
  const ship = fleet.find((item) => item.id === id);
  if (!ship.asset)
    return `<div class="view-placeholder ${className}" data-placeholder="${id}/${view}" role="img" aria-label="${displayModel(ship)} ${viewLabels[view][0]}占位，设计视图待制作，尺寸未知"><span class="placeholder-code" aria-hidden="true">${ship.series}</span><div class="placeholder-reticle" aria-hidden="true"></div><div class="placeholder-message"><span class="mono">AWAITING DESIGN / ${viewLabels[view][1]}</span><strong>设计视图待制作</strong><span>${ship.model || "型号待定"} · 尺寸未知</span></div><span class="placeholder-foot mono">PLACEHOLDER / NO GEOMETRY DATA</span></div>`;
  const asset = source(id, view);
  return `<div class="asset ${className}" data-asset="${id}/${view}"><img src="${offline ? base + asset.thumbnail.path : asset.url}" width="${asset.width}" height="${asset.height}" alt="${ship.asset.model} ${ship.asset.number} 号${ship.name}历史模型，${viewLabels[view][0]}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"><div class="asset-error" role="status" hidden><span class="mono">SIGNAL LOST / 载入中断</span><p>高清视图暂时无法载入</p><button type="button" class="retry">重新载入 ↻</button></div></div>`;
}
function header() {
  return `<header class="site-header"><a class="brand" href="#" aria-label="Zeppelin 首页"><span>ZEPPELIN<span class="brand-caption">FLEET ARCHIVE</span></span><small class="brand-version mono">v${version}</small></a><nav aria-label="主导航"><a href="#fleet" class="nav-active">舰队档案 <span>FLEET</span></a><a href="#doctrine">设计理念 <span>DOCTRINE</span></a><a href="#archive">工程记录 <span>ARCHIVE</span></a></nav><span class="header-code mono"><i></i>地外航行计划<span>EST. 2026 / VOL. 01</span></span><div class="header-actions"><a class="header-action" href="https://github.com/nocoo/zeppelin" target="_blank" rel="noopener noreferrer" aria-label="Zeppelin GitHub 仓库（新标签页）" aria-describedby="github-tip">${githubIcon}<span class="header-tooltip" id="github-tip" role="tooltip">GitHub 仓库</span></a><a class="header-action" href="https://hexly.ai/projects/zeppelin" target="_blank" rel="noopener noreferrer" aria-label="在 hexly.ai 查看 Zeppelin（新标签页）" aria-describedby="hexly-tip">${hexlyIcon}<span class="header-tooltip" id="hexly-tip" role="tooltip">在 hexly.ai 查看 Zeppelin</span></a></div></header>`;
}
const footer = () =>
  `<footer><a class="footer-wordmark" href="#">ZEPPELIN<span>＋</span></a><div><span class="mono">BUILT FOR THE DISTANCE.</span><p>把想象，铸造成抵达的力量。</p></div><div class="footer-meta mono"><span>原创科幻舰船 · 视觉设计档案</span><span>© ${new Date().getFullYear()} ZEPPELIN FLEET PROGRAM</span><a href="https://github.com/nocoo/zeppelin" target="_blank" rel="noreferrer">项目源代码 ${arrow}</a></div></footer>`;
const stripe = (text) =>
  `<div class="warning-band"><span aria-hidden="true">＋ ＋ ＋</span><span>${text}</span><span class="mono">AUTHORIZED PERSONNEL ONLY</span><span aria-hidden="true">＋ ＋ ＋</span></div>`;
function shipCard(ship, i) {
  const family = seriesOf(ship);
  return `<article class="ship-card"><div class="card-top"><span class="mono">${String(i + 1).padStart(2, "0")} / ${ship.series} DIVISION</span>${badge(ship)}</div><div class="card-image">${ship.asset ? `<span class="card-number" aria-hidden="true">${ship.asset.number}</span>` : ""}${picture(ship.id, "three-quarter")}<a class="card-image-link" href="#vessel/${ship.id}" aria-label="查看 ${displayModel(ship)} ${ship.name}"></a><span class="card-cross" aria-hidden="true">＋</span></div><div class="card-body"><div><span class="mono card-role">${ship.role}</span><h3><a href="#vessel/${ship.id}">${displayModel(ship)}</a></h3><p>${ship.name}</p></div><a class="square-link" href="#vessel/${ship.id}" aria-label="进入 ${displayModel(ship)} 档案">${arrow}</a></div><div class="card-bottom mono"><span>${ship.model ? `体量 / ${ship.sizeClass || "未知"}` : "型号待定"}</span><span>${ship.dimensions ? ship.dimensions[0][1] + " M" : "尺寸未知"} / ${family.numberRange || "号段待定"}</span></div></article>`;
}
function directory(filter = "all") {
  return series
    .filter((item) => filter === "all" || item.code === filter)
    .map((family) => {
      const ships = fleet.filter((ship) => ship.series === family.code);
      return `<section class="series-section" aria-labelledby="series-${family.code}"><div class="series-heading"><h3 id="series-${family.code}"><span>${family.code}</span>${family.name}</h3><span class="mono">${family.group} / ${family.numberRange || "号段待定"}</span><p>${family.mission}</p></div><div class="series-ships">${ships.map((ship) => shipCard(ship, fleet.indexOf(ship))).join("")}</div></section>`;
    })
    .join("");
}
function home() {
  document.title = "ZEPPELIN — 次世代舰队档案";
  app.innerHTML = `${header()}<main id="main" tabindex="-1">
    <section class="hero" aria-labelledby="hero-title">
      <div class="hero-rail"><span class="mono">001 — DEEP SPACE DIVISION</span><span class="mono">ORIGINAL SPACECRAFT DESIGN</span></div>
      <div class="hero-copy"><p class="eyebrow"><span class="small-cross">＋</span> HW 护卫系列 / ESCORT CLASS</p><h1 id="hero-title">BEYOND<br>THE <span>FRONTIER.</span></h1><p class="hero-chinese">越过边界。<span>驶向未知。</span></p><p class="hero-description">从最后一道防线，到下一段航程。<br>探索 Zeppelin 次世代太空舰队。</p><a class="button button-yellow" href="#fleet">进入舰队档案 ${arrow}</a></div>
      <div class="hero-visual"><span class="hero-model" aria-hidden="true">HW–01</span><div class="target-ring" aria-hidden="true"></div>${picture("hw-01", "three-quarter", "hero-ship", true)}<div class="hero-callout mono"><span>01 / QUAD-ENGINE SYSTEM</span><span>四引擎推进架构</span></div><div class="hero-identity"><span class="mono">HULL IDENTIFICATION</span><strong>227</strong><span>HW-01A 小型护卫舰 · 历史模型 227</span></div><a class="hero-detail mono" href="#vessel/hw-01">检视舰船 / INSPECT VESSEL ${arrow}</a></div>
      <div class="hero-bottom"><span class="mono"><i class="live-dot"></i> FLEET SYSTEM / ONLINE</span><span class="mono">17 SERIES <span class="line-progress"></span> FLEET INDEX</span><button type="button" class="hero-motion">暂停动效</button><a href="#fleet" class="mono">SCROLL TO EXPLORE ↓</a></div>
    </section>
    ${stripe("立入禁止 / 深空作业区域")}
    <section id="fleet" class="fleet-section section-pad" aria-labelledby="fleet-heading"><div class="section-heading"><div><p class="eyebrow">01 / FLEET DIRECTORY</p><h2 id="fleet-heading">舰队<span>档案</span><sup>[ ${series.length} 系列 ]</sup></h2></div><p class="section-intro">不同任务，同一片星海。<br>主战、区控与体系支援，按轨道任务编成。</p></div><div class="fleet-toolbar"><div class="filters" role="group" aria-label="按舰队系列筛选"><button type="button" data-filter="all" aria-pressed="true">全部系列 <span>${series.length}</span></button>${series.map((family) => `<button type="button" data-filter="${family.code}" aria-pressed="false">${family.code} / ${family.name} <span>${fleet.filter((item) => item.series === family.code).length}</span></button>`).join("")}</div><span class="mono fleet-count" aria-live="polite">${series.length} SERIES / ${fleet.filter((item) => item.model).length} MODELS</span></div><div class="fleet-grid">${directory()}</div><p class="fleet-note"><span class="note-square"></span>依据《太空舰队：型号 · 舷号 · 编成规范》草案 A。未命名的系列只预留目录；规划型号使用明确占位，尺寸未知。现有三型保留历史模型视图，舷号与型号独立记录。</p></section>
    <section id="doctrine" class="doctrine section-pad" aria-labelledby="doctrine-heading"><div class="doctrine-title"><p class="eyebrow">02 / DESIGN DOCTRINE</p><h2 id="doctrine-heading">太空很远。<br>工程<span>很近。</span></h2><span class="mono">FORM FOLLOWS MISSION.</span></div><div class="doctrine-body"><p class="large-copy">每一道装甲缝，<br>都有它存在的理由。</p><p>我们相信，可信的未来来自可读的结构。压力舱、承力骨架、推进阵列与检修通道，让想象落在真实的机械逻辑之上。</p><div class="principles"><div><span class="mono">01 — STRUCTURE</span><h3>结构先行</h3><p>轮廓由任务与承力关系塑造。</p></div><div><span class="mono">02 — IDENTITY</span><h3>家族秩序</h3><p>用系列、型号与舷号建立识别。</p></div><div><span class="mono">03 — SCALE</span><h3>人的尺度</h3><p>从一席驾驶舱，到一段深空航程。</p></div></div></div></section>
    <section id="archive" class="archive section-pad" aria-labelledby="archive-heading"><div><p class="eyebrow">03 / ENGINEERING RECORD</p><h2 id="archive-heading">看得见的结构。<br><span>经得起检视的细节。</span></h2><p>已渲染型号提供七个统一标准视角。<br>前后、左右、顶底与三分之四透视，完整阅读一艘舰。</p><a class="text-link" href="#vessel/hw-01">打开标准视图 ${arrow}</a></div><div class="archive-preview">${picture("hw-01", "top")}<span class="mono archive-label">HW-01 / DORSAL PROJECTION</span><span class="archive-dimension mono">61.1 M</span><span class="cross top-left" aria-hidden="true">＋</span><span class="cross bottom-right" aria-hidden="true">＋</span></div></section>
    <div class="closing-band"><span class="mono">THE NEXT FRONTIER IS UNDER CONSTRUCTION.</span><span>下一段航程，正在建造。</span><span aria-hidden="true">↗</span></div>
  </main>${footer()}`;
  app.querySelector(".hero-motion").addEventListener("click", (event) => {
    const paused = app.querySelector(".hero").classList.toggle("motion-paused");
    event.currentTarget.textContent = paused ? "继续动效" : "暂停动效";
  });
  app.querySelectorAll("[data-filter]").forEach((button) =>
    button.addEventListener("click", () => {
      const filtered = fleet.filter(
        (item) =>
          button.dataset.filter === "all" ||
          item.series === button.dataset.filter,
      );
      app
        .querySelectorAll("[data-filter]")
        .forEach((item) =>
          item.setAttribute("aria-pressed", String(item === button)),
        );
      app.querySelector(".fleet-grid").innerHTML = directory(
        button.dataset.filter,
      );
      app.querySelector(".fleet-count").textContent =
        `${new Set(filtered.map((item) => item.series)).size} SERIES / ${filtered.filter((item) => item.model).length} MODELS`;
      bindImages();
    }),
  );
}
function detail(ship) {
  const family = seriesOf(ship);
  const index = fleet.indexOf(ship);
  const neighbors = [
    fleet[(index + fleet.length - 1) % fleet.length],
    fleet[(index + 1) % fleet.length],
  ];
  const rows = [
    ["设计型号", ship.model || "待定"],
    ["任务系列", `${ship.series} / ${family.name}`],
    ["体量档", ship.sizeClass || "未知"],
    ["任务号段", family.numberRange || "待定"],
    ["单舰舷号", ship.number || "待分配"],
    ["设计代际", ship.model ? "A / 第一版" : "待定"],
    ...(ship.dimensions
      ? ship.dimensions.map(([label, value, unit]) => [
          label,
          `${value} ${unit}`,
        ])
      : [["舰长 / 舰宽 / 舰高", "未知"]]),
    ...ship.specs,
  ];
  document.title = `${displayModel(ship)} · ${ship.name} — ZEPPELIN`;
  app.innerHTML = `<main id="main" class="vessel-main" tabindex="-1">
    <div class="vessel-toolbar"><a class="back-to-fleet mono" href="#fleet">← 舰队档案</a><div class="vessel-heading"><h1>${displayModel(ship)}</h1><span>${ship.name}</span></div><span class="workspace-code mono">${ship.series} / VESSEL INSPECTOR</span><button type="button" class="data-toggle" aria-expanded="false" aria-controls="vessel-data">舰型数据 ＋</button></div>
    <div class="detail-workspace">
      <section class="viewer" aria-labelledby="viewer-heading"><div class="viewer-top"><h2 id="viewer-heading" class="mono">STANDARD VIEW / 标准视图</h2><span class="mono">${ship.asset ? "2560 × 1920 / 07 VIEWS" : "待制作 / 07 VIEW SLOTS"}</span></div><div class="viewer-stage"><div id="active-view">${picture(ship.id, "three-quarter", "", true)}</div><span class="viewer-axis mono" aria-hidden="true">Z ↑<br>Y ↙ &nbsp; X →</span><div class="viewer-caption" aria-live="polite"><span class="mono">PERSPECTIVE${ship.asset ? " / 70 MM" : " / PENDING"}</span><strong>三分之四</strong></div>${ship.asset ? '<button type="button" class="expand-view" aria-label="放大当前高清视图">⤢ <span>放大视图</span></button>' : '<span class="pending-view mono">尚无高清视图</span>'}<span class="cross top-left" aria-hidden="true">＋</span><span class="cross bottom-right" aria-hidden="true">＋</span></div><div class="view-controls" role="group" aria-label="舰船标准视图">${Object.entries(
        viewLabels,
      )
        .map(
          ([key, label]) =>
            `<button type="button" data-view="${key}" aria-pressed="${key === "three-quarter"}"><span class="mono">${label[1]}</span>${label[0]}</button>`,
        )
        .join(
          "",
        )}</div><div class="viewer-foot mono"><span>${ship.asset ? `SOURCE MODEL / ${ship.asset.model} · ${ship.asset.number}` : "DESIGN PENDING / 无模型数据"}</span><span>${ship.asset ? "可切换视角 · 点击放大" : "标准视角预留 · 比例未知"}</span></div></section>
      <aside id="vessel-data" class="vessel-sidebar" aria-label="舰型信息"><div class="sidebar-heading"><h2 class="mono">舰型数据 / ${ship.series}</h2>${badge(ship)}</div>
      <div class="data-controls" role="group" aria-label="舰型数据分组"><button type="button" id="data-identification" data-panel="identification" aria-controls="panel-identification" aria-pressed="true">01 参数</button><button type="button" id="data-mission" data-panel="mission" aria-controls="panel-mission" aria-pressed="false">02 任务</button><button type="button" id="data-record" data-panel="record" aria-controls="panel-record" aria-pressed="false">03 档案</button></div>
      <section id="panel-identification" class="data-panel" aria-labelledby="data-identification" tabindex="0">${ship.state === "development" ? '<p class="prototype-notice">原型制作中 · 当前视图为在制模型快照，细节可能随设计迭代。</p>' : ""}<dl class="compact-specs">${rows.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join("")}</dl>${ship.series === "QS" ? '<p class="sidebar-note">¹ 轻型 QS 可依编制归入 2xxx；具体百位划分待舰籍细则确定。</p>' : ""}</section>
      <section id="panel-mission" class="data-panel" aria-labelledby="data-mission" tabindex="0" hidden><h2 class="sidebar-title mono">MISSION / 任务与编成</h2><p class="mission-copy">${ship.description}</p><dl class="compact-specs mission-specs"><div><dt>编队位置</dt><dd>${family.formation}</dd></div><div><dt>任务分组</dt><dd>${family.group}${family.optional ? " · 可选线" : ""}</dd></div></dl>${ship.features.length ? `<div class="design-details"><h2 class="sidebar-title mono">STRUCTURE / 模型设计细节</h2><ol>${ship.features.map(([, title, description]) => `<li><h3>${title}</h3><p>${description}</p></li>`).join("")}</ol></div>` : ""}</section>
      <section id="panel-record" class="data-panel" aria-labelledby="data-record" tabindex="0" hidden><h2 class="sidebar-title mono">RECORD / 档案状态</h2>${ship.asset ? `<p class="sidebar-note">历史渲染标识：${ship.asset.model} / ${ship.asset.number}。目录采用草案 A 型号，图中标识保留原始状态${ship.series === "HW" ? "；新版 3D 模型已采用四位舷号 2227" : ""}。尺寸为旧模型记录。</p>` : `<p class="sidebar-note">${ship.model ? "规划型号，尚无模型或渲染。" : "规范只定义了该系列，型号尚未分配。"}标准视图为显式占位，尺寸与工程参数未知。</p>`}<p class="sidebar-note">来源：型号 · 舷号 · 编成规范<br>草案 A / 2026.09.19</p></section>
      <nav class="vessel-next" aria-label="相邻档案">${neighbors.map((item, i) => `<a href="#vessel/${item.id}" aria-label="${i ? "下一" : "上一"}档案：${displayModel(item)} ${item.name}"><span class="mono">${i ? "下一档案 →" : "← 上一档案"}</span><strong>${displayModel(item)}</strong></a>`).join("")}</nav>
      </aside>
    </div></main>${ship.asset ? '<dialog class="lightbox" aria-label="高清舰船视图"><form method="dialog"><button class="close-lightbox" aria-label="关闭放大视图">关闭 ESC ×</button></form><div class="lightbox-image"></div><p class="mono lightbox-caption"></p><a class="text-link lightbox-original" target="_blank" rel="noreferrer">打开高清原图 ↗</a></dialog>' : ""}`;
  if (ship.id === "hw-01") bindModelPreview();
  app.querySelector(".data-toggle").addEventListener("click", (event) => {
    const open = app
      .querySelector(".vessel-main")
      .classList.toggle("data-open");
    event.currentTarget.setAttribute("aria-expanded", String(open));
    event.currentTarget.textContent = open ? "返回预览 ×" : "舰型数据 ＋";
  });
  app.querySelectorAll("[data-panel]").forEach((button) =>
    button.addEventListener("click", () => {
      app.querySelectorAll("[data-panel]").forEach((item) => {
        const active = item === button;
        item.setAttribute("aria-pressed", String(active));
        app.querySelector(`#panel-${item.dataset.panel}`).hidden = !active;
      });
    }),
  );
  let current = "three-quarter";
  app.querySelectorAll("[data-view]").forEach((button) =>
    button.addEventListener("click", () => {
      current = button.dataset.view;
      app
        .querySelectorAll("[data-view]")
        .forEach((item) =>
          item.setAttribute("aria-pressed", String(item === button)),
        );
      app.querySelector("#active-view").innerHTML = picture(
        ship.id,
        current,
        "",
        true,
      );
      app.querySelector(".viewer-caption").innerHTML =
        `<span class="mono">${viewLabels[current][1]} / ${ship.asset ? (current === "three-quarter" ? "70 MM" : "ORTHOGRAPHIC") : "PENDING"}</span><strong>${viewLabels[current][0]}</strong>`;
      bindImages();
    }),
  );
  if (!ship.asset) return;
  const dialog = app.querySelector("dialog");
  app.querySelector(".expand-view").addEventListener("click", () => {
    dialog.querySelector(".lightbox-image").innerHTML = picture(
      ship.id,
      current,
      "",
      true,
    );
    dialog.querySelector(".lightbox-caption").textContent =
      `${ship.asset.model} / ${ship.asset.number} 历史模型 · ${viewLabels[current][0]} · 2560 × 1920`;
    dialog.querySelector(".lightbox-original").href = offline
      ? base + source(ship.id, current).thumbnail.path
      : source(ship.id, current).url;
    dialog.showModal();
    document.body.classList.add("modal-open");
    bindImages();
  });
  dialog.addEventListener("close", () =>
    document.body.classList.remove("modal-open"),
  );
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
}
function bindModelPreview() {
  const viewer = app.querySelector(".viewer");
  const imageControls = viewer.querySelector(".view-controls");
  viewer.querySelector(".viewer-top > span").outerHTML =
    `<div class="preview-modes" role="group" aria-label="预览模式"><button type="button" data-preview="image" aria-pressed="false">标准视图</button><button type="button" data-preview="3d" aria-pressed="true">3D 预览</button></div>`;
  viewer
    .querySelector(".viewer-stage")
    .insertAdjacentHTML(
      "beforeend",
      `<div class="model-preview" hidden><canvas tabindex="0" role="img" aria-label="HW-01A 3D 模型，方向键旋转，Home 复位"></canvas><div class="model-caption"><span class="mono">HW-01A / 2227</span><strong>全舰 · 三分之四</strong></div><div class="model-status" role="status"><p>正在准备 3D 预览…</p><button type="button" hidden>重试 3D 载入 ↻</button></div><span class="model-hint">拖动旋转 · 滚轮 / 双指缩放</span><button type="button" class="model-reset" aria-label="复位 3D 视角">↺ <span>复位视角</span></button></div>`,
    );
  imageControls.insertAdjacentHTML(
    "afterend",
    `<div class="model-controls" hidden><div class="model-scope" role="group" aria-label="3D 检视范围"><button type="button" data-scope="overview" aria-pressed="true">全览</button><button type="button" data-scope="detail" aria-pressed="false">细节</button><span>全舰结构 / 可旋转与缩放</span></div><div class="model-views" role="group" aria-label="3D 全览视角">${Object.entries(
      viewLabels,
    )
      .map(
        ([key, label]) =>
          `<button type="button" data-model-view="${key}" data-lod="overview" aria-pressed="${key === "three-quarter"}">${label[0]}</button>`,
      )
      .join("")}${Object.entries({
      bow: "船首玻璃舱",
      bridge: "指挥塔",
      weapons: "甲板武器",
      flank: "舷侧设备",
      engine: "引擎机械舱",
      stern: "舰尾玻璃舱",
      ventral: "腹部推进器",
    })
      .map(
        ([key, label]) =>
          `<button type="button" data-model-view="${key}" data-lod="detail" aria-pressed="false" hidden>${label}</button>`,
      )
      .join("")}</div></div>`,
  );
  app
    .querySelector("#panel-record")
    .insertAdjacentHTML(
      "afterbegin",
      '<p class="sidebar-note">3D 模型：HW-01A / 2227，来自新版 Blender 源文件。标准图片保留旧版 HW-01 / 227 记录。</p>',
    );
  const host = viewer.querySelector(".model-preview");
  const controls = viewer.querySelector(".model-controls");
  let instance,
    pending,
    disposed = false,
    scope = "overview";
  const selected = { overview: "three-quarter", detail: "bow" };
  async function load() {
    try {
      if (!pending)
        pending = import("./model-preview.js").then(
          ({ createModelPreview }) => {
            if (!disposed) instance = createModelPreview(host);
            return instance;
          },
        );
      const preview = await pending;
      if (!disposed) preview?.select(selected[scope]);
    } catch (error) {
      if (disposed) return;
      pending = null;
      host.dataset.state = "error";
      host.querySelector(".model-status").hidden = false;
      host.querySelector(".model-status p").textContent =
        "3D 预览暂不可用，请重试或切换标准视图。";
      host.querySelector(".model-status button").hidden = false;
      console.error("3D initialization failed", error);
    }
  }
  host.querySelector(".model-status button").addEventListener("click", () => {
    if (!instance) load();
  });
  function showMode(mode) {
    const three = mode === "3d";
    viewer.classList.toggle("is-3d", three);
    host.hidden = !three;
    controls.hidden = !three;
    imageControls.hidden = three;
    viewer.querySelector("#active-view").hidden = three;
    viewer.querySelector("#viewer-heading").textContent = three
      ? "3D VIEW / 立体检视"
      : "STANDARD VIEW / 标准视图";
    viewer.querySelector(".viewer-foot").firstElementChild.textContent = three
      ? "SOURCE MODEL / HW-01A · 2227"
      : "SOURCE MODEL / HW-01 · 227";
    viewer.querySelector(".viewer-foot").lastElementChild.textContent = three
      ? "方向键旋转 · HOME 复位"
      : "可切换视角 · 点击放大";
    viewer
      .querySelectorAll("[data-preview]")
      .forEach((button) =>
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.preview === mode),
        ),
      );
    if (three && !instance) load();
  }
  viewer
    .querySelectorAll("[data-preview]")
    .forEach((button) =>
      button.addEventListener("click", () => showMode(button.dataset.preview)),
    );
  function select() {
    viewer.querySelectorAll("[data-model-view]").forEach((button) => {
      button.hidden = button.dataset.lod !== scope;
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.modelView === selected[scope]),
      );
    });
    if (instance) instance.select(selected[scope]);
  }
  controls.querySelectorAll("[data-scope]").forEach((button) =>
    button.addEventListener("click", () => {
      scope = button.dataset.scope;
      controls
        .querySelectorAll("[data-scope]")
        .forEach((item) =>
          item.setAttribute("aria-pressed", String(item === button)),
        );
      controls.querySelector(".model-scope > span").textContent =
        scope === "detail"
          ? "完整细节 / 仅旋转 · 距离锁定"
          : "全舰结构 / 可旋转与缩放";
      controls
        .querySelector(".model-views")
        .setAttribute(
          "aria-label",
          scope === "detail" ? "3D 细节视角" : "3D 全览视角",
        );
      select();
    }),
  );
  controls.querySelectorAll("[data-model-view]").forEach((button) =>
    button.addEventListener("click", () => {
      selected[scope] = button.dataset.modelView;
      select();
    }),
  );
  disposePreview = () => {
    disposed = true;
    instance?.dispose();
  };
  showMode("3d");
}
function bindImages() {
  app.querySelectorAll(".asset:not([data-bound])").forEach((container) => {
    container.dataset.bound = "true";
    const img = container.querySelector("img");
    const error = container.querySelector(".asset-error");
    const fail = () => {
      error.hidden = false;
      img.hidden = true;
    };
    img.addEventListener("error", fail);
    img.addEventListener("load", () => {
      error.hidden = true;
      img.hidden = false;
    });
    if (img.complete && !img.naturalWidth) fail();
    container.querySelector(".retry").addEventListener("click", (event) => {
      event.preventDefault();
      error.hidden = true;
      img.hidden = false;
      // Explicit retry only. Production never substitutes a thumbnail for a failed CDN asset.
      const url = img.src;
      img.removeAttribute("src");
      img.src = url;
    });
  });
}
let route = "";
function render() {
  const match = location.hash.match(/^#vessel\/([a-z0-9-]+)$/);
  const ship = match && fleet.find((item) => item.id === match[1]);
  const next = ship ? ship.id : "home";
  if (route !== next) {
    disposePreview();
    disposePreview = () => {};
    document.body.classList.remove("modal-open");
    document.documentElement.classList.toggle("detail-mode", Boolean(ship));
    ship ? detail(ship) : home();
    bindImages();
    if (offline)
      app.insertAdjacentHTML(
        "afterbegin",
        '<div class="offline-banner" role="status">离线开发预览 · 当前使用本地缩略图，不代表高清发布效果。</div>',
      );
    route = next;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    if (render.initialized)
      app.querySelector("#main").focus({ preventScroll: true });
  }
  const anchor = !ship && location.hash.slice(1);
  if (anchor && /^[a-z-]+$/.test(anchor))
    document.getElementById(anchor)?.scrollIntoView();
  render.initialized = true;
}
async function start() {
  try {
    const response = await fetch(`${base}assets/manifest.json`);
    if (!response.ok) throw new Error(`Manifest HTTP ${response.status}`);
    manifest = await response.json();
    render();
    window.addEventListener("hashchange", render);
  } catch (error) {
    app.innerHTML =
      '<main class="section-pad"><h1>舰队档案暂时无法载入</h1><p class="fleet-note">档案索引连接中断，请重试。</p><button class="retry" type="button">重新载入 ↻</button></main>';
    app
      .querySelector("button")
      .addEventListener("click", () => location.reload());
    console.error("Fleet manifest unavailable", error);
  }
}
start();

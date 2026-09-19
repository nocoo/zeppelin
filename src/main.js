import "./style.css";
import { fleet, series, viewLabels } from "./fleet.js";
let manifest;

const app = document.querySelector("#app");
const base = import.meta.env.BASE_URL;
const offline =
  import.meta.env.DEV &&
  new URLSearchParams(location.search).get("assets") === "offline";
const arrow = '<span aria-hidden="true">↗</span>';
const icon =
  '<svg viewBox="0 0 34 30" aria-hidden="true"><path d="M3 3h28L17 15h14L3 27h28" fill="none" stroke="currentColor" stroke-width="5"/></svg>';
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
function header(detail = false) {
  return `<header class="site-header"><a class="brand" href="#" aria-label="Zeppelin 首页">${icon}<span>ZEPPELIN<span class="brand-caption">FLEET ARCHIVE</span></span></a><nav aria-label="主导航"><a href="#fleet" ${!detail ? 'class="nav-active"' : ""}>舰队档案 <span>FLEET</span></a><a href="#doctrine">设计理念 <span>DOCTRINE</span></a><a href="#archive">工程记录 <span>ARCHIVE</span></a></nav><span class="header-code mono"><i></i>地外航行计划<span>EST. 2026 / VOL. 01</span></span></header>`;
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
      <div class="hero-bottom"><span class="mono"><i class="live-dot"></i> FLEET SYSTEM / ONLINE</span><span class="mono">17 SERIES <span class="line-progress"></span> FLEET INDEX</span><a href="#fleet" class="mono">SCROLL TO EXPLORE ↓</a></div>
    </section>
    ${stripe("立入禁止 / 深空作业区域")}
    <section id="fleet" class="fleet-section section-pad" aria-labelledby="fleet-heading"><div class="section-heading"><div><p class="eyebrow">01 / FLEET DIRECTORY</p><h2 id="fleet-heading">舰队<span>档案</span><sup>[ ${series.length} 系列 ]</sup></h2></div><p class="section-intro">不同任务，同一片星海。<br>主战、区控与体系支援，按轨道任务编成。</p></div><div class="fleet-toolbar"><div class="filters" role="group" aria-label="按舰队系列筛选"><button type="button" data-filter="all" aria-pressed="true">全部系列 <span>${series.length}</span></button>${series.map((family) => `<button type="button" data-filter="${family.code}" aria-pressed="false">${family.code} / ${family.name} <span>${fleet.filter((item) => item.series === family.code).length}</span></button>`).join("")}</div><span class="mono fleet-count" aria-live="polite">${series.length} SERIES / ${fleet.filter((item) => item.model).length} MODELS</span></div><div class="fleet-grid">${directory()}</div><p class="fleet-note"><span class="note-square"></span>依据《太空舰队：型号 · 舷号 · 编成规范》草案 A。未命名的系列只预留目录；规划型号使用明确占位，尺寸未知。现有三型保留历史模型视图，舷号与型号独立记录。</p></section>
    <section id="doctrine" class="doctrine section-pad" aria-labelledby="doctrine-heading"><div class="doctrine-title"><p class="eyebrow">02 / DESIGN DOCTRINE</p><h2 id="doctrine-heading">太空很远。<br>工程<span>很近。</span></h2><span class="mono">FORM FOLLOWS MISSION.</span></div><div class="doctrine-body"><p class="large-copy">每一道装甲缝，<br>都有它存在的理由。</p><p>我们相信，可信的未来来自可读的结构。压力舱、承力骨架、推进阵列与检修通道，让想象落在真实的机械逻辑之上。</p><div class="principles"><div><span class="mono">01 — STRUCTURE</span><h3>结构先行</h3><p>轮廓由任务与承力关系塑造。</p></div><div><span class="mono">02 — IDENTITY</span><h3>家族秩序</h3><p>用系列、型号与舷号建立识别。</p></div><div><span class="mono">03 — SCALE</span><h3>人的尺度</h3><p>从一席驾驶舱，到一段深空航程。</p></div></div></div></section>
    <section id="archive" class="archive section-pad" aria-labelledby="archive-heading"><div><p class="eyebrow">03 / ENGINEERING RECORD</p><h2 id="archive-heading">看得见的结构。<br><span>经得起检视的细节。</span></h2><p>已渲染型号提供七个统一标准视角。<br>前后、左右、顶底与三分之四透视，完整阅读一艘舰。</p><a class="text-link" href="#vessel/hw-01">打开标准视图 ${arrow}</a></div><div class="archive-preview">${picture("hw-01", "top")}<span class="mono archive-label">HW-01 / DORSAL PROJECTION</span><span class="archive-dimension mono">61.1 M</span><span class="cross top-left" aria-hidden="true">＋</span><span class="cross bottom-right" aria-hidden="true">＋</span></div></section>
    <div class="closing-band"><span class="mono">THE NEXT FRONTIER IS UNDER CONSTRUCTION.</span><span>下一段航程，正在建造。</span><span aria-hidden="true">↗</span></div>
  </main>${footer()}`;
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
  app.innerHTML = `${header(true)}<main id="main" class="vessel-main" tabindex="-1">
    <div class="detail-breadcrumb mono"><a href="#fleet">← 舰队档案</a><span>${family.group} / ${ship.series} / DRAFT A</span></div>
    <div class="vessel-heading"><div><h1>${displayModel(ship)}</h1><span>${ship.name}</span></div>${badge(ship)}</div>
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
      <aside class="vessel-sidebar" aria-label="舰型信息"><section class="sidebar-section"><h2 class="sidebar-title mono">01 / IDENTIFICATION</h2><dl class="compact-specs">${rows.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join("")}</dl>${ship.series === "QS" ? '<p class="sidebar-note">¹ 轻型 QS 可依编制归入 2xxx；具体百位划分待舰籍细则确定。</p>' : ""}</section>
      <section class="sidebar-section"><h2 class="sidebar-title mono">02 / 任务与编成</h2><p class="mission-copy">${ship.description}</p><dl class="compact-specs mission-specs"><div><dt>编队位置</dt><dd>${family.formation}</dd></div><div><dt>任务分组</dt><dd>${family.group}${family.optional ? " · 可选线" : ""}</dd></div></dl></section>
      ${ship.features.length ? `<details class="sidebar-section design-details"><summary>03 / 模型设计细节 <span>＋</span></summary><ol>${ship.features.map(([, title, description]) => `<li><h3>${title}</h3><p>${description}</p></li>`).join("")}</ol></details>` : ""}
      <section class="sidebar-section record-section"><h2 class="sidebar-title mono">${ship.features.length ? "04" : "03"} / 档案状态</h2>${ship.state === "development" ? '<p class="prototype-notice">原型制作中 · 当前视图为在制模型快照，细节可能随设计迭代。</p>' : ""}${ship.asset ? `<p class="sidebar-note">历史渲染标识：${ship.asset.model} / ${ship.asset.number}。目录采用草案 A 型号，图中标识保留原始状态${ship.series === "HW" ? "；原三位舷号 227 尚未重编为四位" : ""}。尺寸为旧模型记录。</p>` : `<p class="sidebar-note">${ship.model ? "规划型号，尚无模型或渲染。" : "规范只定义了该系列，型号尚未分配。"}标准视图为显式占位，尺寸与工程参数未知。</p>`}<p class="sidebar-note">来源：型号 · 舷号 · 编成规范<br>草案 A / 2026.09.19</p></section>
      </aside>
    </div><nav class="vessel-next" aria-label="相邻档案">${neighbors.map((item, i) => `<a href="#vessel/${item.id}"><span class="mono">${i ? "下一档案 →" : "← 上一档案"}</span><strong>${displayModel(item)}<small>${item.name}</small></strong></a>`).join("")}</nav>
    </main>${footer()}${ship.asset ? '<dialog class="lightbox" aria-label="高清舰船视图"><form method="dialog"><button class="close-lightbox" aria-label="关闭放大视图">关闭 ESC ×</button></form><div class="lightbox-image"></div><p class="mono lightbox-caption"></p><a class="text-link lightbox-original" target="_blank" rel="noreferrer">打开高清原图 ↗</a></dialog>' : ""}`;
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
    document.body.classList.remove("modal-open");
    ship ? detail(ship) : home();
    bindImages();
    if (offline)
      app.insertAdjacentHTML(
        "afterbegin",
        '<div class="offline-banner" role="status">离线开发预览 · 当前使用本地缩略图，不代表高清发布效果。</div>',
      );
    route = next;
    window.scrollTo(0, 0);
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

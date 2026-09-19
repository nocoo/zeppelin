<p align="center">
  <img src="https://h.no.mt/logos/family/zeppelin/2026-09-19-01/01/rounded.png" width="128" height="128" alt="Zeppelin 钛金属飞船 Logo" />
</p>
<h1 align="center">Zeppelin</h1>
<p align="center">次世代太空舰队与舰船设计档案。</p>
<p align="center">
  <a href="https://zeppelin.hexly.ai">站点</a> · <a href="docs/README.en.md">English</a>
</p>

## 这是什么

黑色工业科幻舰队展示站，按任务划分 17 个系列、15 个明确型号，另为尚未命名型号的 10 个系列保留独立入口，共 25 个档案。HW-01A、YS-01A、YS-02A 提供按需加载的 3D 检视，其余档案保留规划状态与未知参数。

## 功能

目录依据 Google Drive `zeppelin/太空时代/太空舰队-型号舷号与编成规范.md`，保留 [草案 A 原文快照](docs/fleet-spec.md)。快照仅清理行尾空格，`src/fleet.js` 分别记录原始来源与快照 SHA-256；测试对照文档中的系列和型号，防止遗漏或编造。新型号采用 A 代际，舷号按四位任务段；文档未指定的 YT 号段、BY-01A 体量与未建模尺寸均保持未知，不把示例舷号当作实际分配。

| 目录型号            | 模型 / 舷号                    | 视图状态                                     |
| ------------------- | ------------------------------ | -------------------------------------------- |
| HW-01A              | HW-01 / 227（历史）；3D / 2227 | 7 个高清视图、7 个 3D 全览方向、7 个细节视角 |
| YS-01A | 定稿 YS-01A / 5001 | 7 张定稿视图、7 个全览方向、6 个细节（含乘员舱剖视） |
| YS-02A | 定稿 YS-02A / 5002 | 7 张定稿视图、7 个全览方向、7 个细节（含双层剖视及展开尾门） |
| 其余规划型号 / 系列 | 未分配                         | 7 个明确占位视角，尺寸未知                   |

三个已完成舰型默认进入 3D 预览，可切回标准图片。HW 保留历史图片，YS 图片已更新为定稿。目录默认只展示有资源的舰型，可结合系列筛选或切换全部档案。3D 预览提供「无 / 小行星带」场景选择，无场景时显示随相机旋转的三维网格；标准图片保持原背景。全览可旋转与缩放；细节保留 Blender 完整几何、涂装与法线贴图，固定距离，仅可旋转。模型直接从 `https://h.no.mt` CDN 加载，二进制不进入 Git 或站点部署包；测试缓存仅保存在 `.local/models/`。

详情页是固定视口的全屏工作台，无全站页头、页尾或页面滚动。桌面以大幅预览配合数据侧栏，参数、任务与档案分组切换；手机通过「舰型数据 / 返回预览」切换，保留当前视角。短屏仅数据区内部可滚动，返回、视角与相邻档案操作保持可达；回到首页恢复正常滚动。

已有资产通过 `asset.model/number` 关联不可变发布记录，目录改名不会篡改历史 Manifest、URL 或图中标识。新资产发布必须显式关联并通过完整七视图校验；规划占位不会进入渲染 Manifest，也不会触发 CDN 请求或提供无效下载。

YS-01A、YS-02A 已设计定型，尺寸与载运参数来自定稿模型及验证报告；规划型号尺寸均未知。仅借鉴工业警示、重工业工程和科幻界面语言；无第三方角色、Logo 或画面复制。

## 使用

打开 [Zeppelin](https://zeppelin.hexly.ai)，选择舰型进入档案。默认只显示已有资源的舰型；可按系列筛选，或切换全部档案查看规划型号。

在详情页切换标准图片、3D 全览和细节视角，拖动旋转模型，全览支持缩放。手机上通过「舰型数据 / 返回预览」切换资料与预览。3D 模型从 CDN 按需加载，需要网络连接。

## 开发

使用 `.node-version` 指定的 Node.js 26.8.1 与 npm 11.19.0。

```sh
npm ci
npm run dev
```

Vite 固定监听 `127.0.0.1:7052`。本机配置 Caddy 后，日常入口为 [zeppelin.dev.hexly.ai](https://zeppelin.dev.hexly.ai)。`dev` 与 `preview` 不可同时占用此端口。

开发服务器支持 `?assets=offline`，明确提示后读取 Git 中的缩略图。生产构建始终使用经过核实的 CDN 资源；失败时显示错误和重试按钮，不自动降级为缩略图。

```sh
npm run build
npm run preview
```

Cloudflare Worker 托管静态页面并提供 `/api/live`。部署、健康接口、生产验证和本地 Worker 入口见[部署说明](docs/deployment.md)。

## 测试

```sh
npm run check
npm run build
npm test
npm run assets:verify
```

`check` 验证目录、资产与单元行为。`npm test` 先准备经过哈希验证的真实模型缓存，再运行 Playwright，检查本地 Worker HTTP 接口、桌面与手机交互、视角切换、筛选、未知参数、键盘操作、无障碍与资源失败重试。`assets:verify` 单独检查远程 CDN 资产，需要网络。

macOS 测试使用已安装的 Google Chrome；Linux/CI 先运行 `npx playwright install --with-deps chromium`。浏览器测试独占 `27052`，不复用开发服务；缓存仅保存在 `.local/models/`。

## 技术栈

| 技术 | 用途 |
| --- | --- |
| 原生 JavaScript / CSS、Vite | 页面交互、样式和构建 |
| Three.js | 按需加载的舰船与场景 3D 预览 |
| Cloudflare Workers / Static Assets | 页面托管与健康接口 |
| R2 / CDN | 不可变模型、高清图片与品牌素材 |
| Node.js、Playwright、axe-core | 数据验证、单元、HTTP、浏览器与无障碍检查 |
| Blender | 舰船模型与标准视图的上游制作 |

## 文档

- [舰队编成规范快照](docs/fleet-spec.md)。
- [舰型上线与定稿更新](.agents/skills/zeppelin-vessel-release/SKILL.md)及[标准高清视图流程](.agents/skills/zeppelin-standard-views/SKILL.md)。
- [资产契约与 Hexly 集成](docs/assets.md)、[网站 Manifest](public/assets/manifest.json)及 `docs/assets/` 中的版本化发布记录。
- [部署与本地入口](docs/deployment.md)。
- [品牌来源与使用](docs/brand.md)、[品牌素材记录](public/brand.json)及 [Hexly 档案](https://hexly.ai/projects/zeppelin)。
- [服务状态](https://status.hexly.ai)。

Google Drive 保存 Blender 源资产；模型、高清视图、字体与品牌主文件保存在外部不可变存储。Git 仅保存源码、配置、发布记录及规定尺寸的小缩略图，详见资产契约。

README 使用 Logo 的圆角展示图，浏览器图标使用透明前景。站点正文与舰船详情侧栏不放置项目 Logo，首页保留文字站名与 GitHub / Hexly 入口。

## 许可证

仓库未提供项目级 LICENSE，不额外授予舰船模型及渲染素材的使用许可，相关权利属于原作者。Barlow Condensed 字体来自 Fontsource，采用 [SIL OFL 1.1](docs/Barlow-OFL.txt)。

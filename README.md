# ZEPPELIN · 次世代舰队档案

黑色工业科幻舰队展示站。按任务划分 17 个系列、15 个明确型号，另为尚未命名型号的 10 个系列保留独立入口，共 25 个档案。Vite + 原生 JavaScript/CSS，无运行时框架或服务端依赖。

目录依据 Google Drive `zeppelin/太空时代/太空舰队-型号舷号与编成规范.md`，保留 [草案 A 原文快照](docs/fleet-spec.md)。快照仅清理行尾空格，`src/fleet.js` 分别记录原始来源与快照 SHA-256；测试对照文档中的系列和型号，防止遗漏或编造。新型号采用 A 代际，舷号按四位任务段；文档未指定的 YT 号段、BY-01A 体量与未建模尺寸均保持未知，不把示例舷号当作实际分配。

| 目录型号            | 历史渲染标识            | 视图状态                         |
| ------------------- | ----------------------- | -------------------------------- |
| HW-01A              | HW-01 / 227（原 NC-01） | 7 个高清视图；三位旧舷号尚未重编 |
| YS-01A              | YS-01 / 5001            | 7 个原型快照视图                 |
| YS-02A              | YS-02 / 5002            | 7 个原型快照视图                 |
| 其余规划型号 / 系列 | 未分配                  | 7 个明确占位视角，尺寸未知       |

详情页以大幅视图为主，侧栏紧凑列举身份、参数、任务、编成与来源。手机上视图优先、信息在下方。已有资产通过 `asset.model/number` 关联不可变发布记录，目录改名不会篡改历史 Manifest、URL 或图中标识。新资产发布必须显式关联并通过完整七视图校验；规划占位不会进入渲染 Manifest，也不会触发 CDN 请求或提供无效下载。

YS 页面明确标注原型制作状态。已有尺寸来自历史模型；规划型号尺寸均未知。仅借鉴工业警示、重工业工程和科幻界面语言；无第三方角色、Logo 或画面复制。

## 开发与验证

Node.js 24+：

```sh
npm ci
npm run hooks:install
npm run dev
# 浏览器打开：https://zeppelin.dev.hexly.ai
# 明确离线预览：https://zeppelin.dev.hexly.ai/?assets=offline
npm run check
npm run build
npm test
npm run assets:verify
```

macOS 浏览器测试使用已安装的 Google Chrome；Linux/CI 先运行 `npx playwright install --with-deps chromium`。测试覆盖规范目录完整性、桌面与手机、已有三舰型七视图、17 系列筛选、占位与未知参数、大视图侧栏布局、深链接、键盘/焦点、WCAG A/AA、生产缺图和重试。

离线参数**仅在开发服务器**生效，显示显式提示并读取 Git 中 ≤640px 缩略图。生产构建始终使用经过核验的 CDN URL；加载失败显示错误和重试按钮，不自动降级为缩略图。字体加载遵守浏览器原生系统字体降级。

## 部署

`npm run build` 生成 `dist/`，可以直接部署至任意静态托管。相对 base + hash 路由支持根域名或子目录，不需要服务器路由重写。CI 在 main 和 PR 上执行资产门禁、构建与浏览器测试，并产出 `zeppelin-static-site` 可部署构件。CI 不自动公开部署或使用云凭据。

Cloudflare Pages 可设置构建命令 `npm run build`、输出目录 `dist`；`public/_headers` 提供适用该平台的安全响应头。其他主机请配置等价响应头。部署无需 R2 密钥，所有舰船图片直接引用现有公开 CDN。

## 舰船资产

- [项目级标准视图 Skill](.agents/skills/zeppelin-standard-views/SKILL.md)：输入指定 `.blend`、型号、舷号，输出标准高清视图与渲染 Manifest。
- [资产契约与 Hexly 集成](docs/assets.md)：可复现参数、版本命名、上传、验证与恢复。
- [网站 Manifest](public/assets/manifest.json)：21 张 2560 × 1920 图、SHA-256、相机/渲染参数与来源 `.blend` 哈希。
- `docs/assets/<model>/v<version>.json`：版本化发布记录。

Google Drive 是建模源资产的归档位置。Git 不保存 `.blend`、PNG 母版、高清 WebP、字体二进制或渲染缓存。`.gitignore`、pre-commit、构建和 CI 均执行边界检查；门禁直接检查 Git index，强制添加或替换工作区文件不能绕过。唯一允许入库的图片是指定路径内 ≤640px、≤100 KB 的缩略图；任何单文件不得超过 500 KiB。

Barlow Condensed 字体来自 Fontsource 5.3.0，采用 SIL OFL 1.1，见 [许可](docs/Barlow-OFL.txt)。舰船模型及其渲染的权利属于原作者，本仓库不额外授予模型素材许可。

## 本地入口

项目全称 **Zeppelin**，仓库 https://github.com/nocoo/zeppelin，本地目录 `~/workspace/personal/zeppelin`。日常开发、人工验收和截图使用 **https://zeppelin.dev.hexly.ai**，由 Caddy 转发到 loopback 7052。Vite 固定端口并仅额外允许该域名；dev 与 preview 不可同时占用 7052。Playwright 浏览器测试独占 27052，不复用已有服务；17052 预留 E2E。分配已核对 nmem、Caddy 与实际 bind，并记录在 `zeppelin-local-ports`。

Caddy 映射保存在本机 `/opt/homebrew/etc/Caddyfile` 及 `workflow/caddy/Caddyfile`；复用现有 `*.dev.hexly.ai` 的本机 mkcert 证书和通配 DNS。证书及私钥不进入本仓库。v1.0.0 已发布的不可变资产仍保留最初的 `zep-*` 内容地址和来源记录，仓库、页面名称及开发域名使用全拼。

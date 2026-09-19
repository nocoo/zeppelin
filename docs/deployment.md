# 部署与本地入口

生产域名 **https://zeppelin.hexly.ai**，Worker 名称 `zeppelin`。`wrangler.jsonc` 使用 Custom Domain，由 Cloudflare 管理 DNS 和证书；不额外启用 workers.dev 或预览域名。页面通过 Workers Static Assets 提供，舰船大图继续使用已有 R2/CDN，不需要新增存储或运行时密钥。

`GET /api/live` 与 `HEAD /api/live` 返回无缓存 JSON，兼容 Hexly 监控：

```json
{
  "status": "ok",
  "name": "zeppelin",
  "version": "<package.json version>",
  "revision": "<完整 Git SHA>"
}
```

构建从**实际检出的提交**生成 `dist/api/live.json`；不读取 Release 事件的 `GITHUB_SHA`，避免版本错报。Worker 显式处理健康路由，其他方法返回 405；元数据缺失返回 503。未知 API、缺失静态资源返回 404，不能被首页回退掩盖。Vite 开发域名同样支持 `/api/live`。

- **CI**：main push、PR、手动执行；复用 `nocoo/base-ci` 的 `quality.yml`、`test-job.yml` 和 `workflow-lint.yml`，全部固定至其他项目同用的完整 SHA `ad43150de3a2be2fa464b5cd2f921dc4fa9f8f0f`。执行资产门禁、单元测试、安全扫描、构建、Worker 打包检查和桌面/手机浏览器测试。原生 JS 项目没有独立 TypeScript 或 lint 配置，按 base-ci 契约明确说明，不使用空命令充当检查。
- **Release**：main 的 CI 成功后自动触发；复用 `deploy-worker.yml`。共享工作流验证 CI 来源、成功状态和当前 main 提交，重新检出已验证 SHA 后构建部署。并发锁 `zeppelin-production` 串行发布，失败或过期 CI 不部署。
- **生产验证**：发布后核对 `/api/live` 的项目名、版本、完整 revision 与 `no-store`，并验证首页、JS/CSS、舰队 Manifest；最多重试 12 次。

[GitHub Repository Secrets](https://github.com/nocoo/zeppelin/settings/secrets/actions) 只需 `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`。Token 应限定目标账户的 Workers Scripts 编辑，以及 `hexly.ai` 的 Workers Routes 编辑和 Zone 读取；凭据不进入 Git。GitHub `production` environment 用于部署记录，可另行设置保护规则。

重试发布：进入 [Release](https://github.com/nocoo/zeppelin/actions/workflows/release.yml)，Run workflow，输入成功的**当前 main** CI run ID。新增提交正常通过 CI 即自动发布，无需本地手动 deploy。也可以：

```sh
gh workflow run release.yml -R nocoo/zeppelin -f source-run-id=<成功的CI运行ID>
npm run verify:production
```

本地检查 Worker 使用 `npm run build && npm run dev:worker`（17052）；日常 Vite 开发域名仍是 7052。`dist/` 可作静态构件，但生产健康接口需要同时部署 `worker.js` 与 Wrangler 配置。

## 本地入口

项目全称 **Zeppelin**，仓库 https://github.com/nocoo/zeppelin，本地目录 `~/workspace/personal/zeppelin`。日常开发、人工验收和截图使用 **https://zeppelin.dev.hexly.ai**，由 Caddy 转发到 loopback 7052。Vite 固定端口并仅额外允许该域名；dev 与 preview 不可同时占用 7052。Playwright 浏览器测试独占 27052，不复用已有服务；17052 用于本地 Worker 验证。分配已核对 nmem、Caddy 与实际 bind，并记录在 `zeppelin-local-ports`。

Caddy 映射保存在本机 `/opt/homebrew/etc/Caddyfile` 及 `workflow/caddy/Caddyfile`；复用现有 `*.dev.hexly.ai` 的本机 mkcert 证书和通配 DNS。证书及私钥不进入本仓库。v1.0.0 已发布的不可变资产仍保留最初的 `zep-*` 内容地址和来源记录，仓库、页面名称及开发域名使用全拼。

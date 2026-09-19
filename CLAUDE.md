# Zeppelin

Vite + 原生 JavaScript/CSS + Three.js 舰队档案站，Cloudflare Worker 托管。
本地入口：https://zeppelin.dev.hexly.ai；生产：https://zeppelin.hexly.ai。

## 项目级 Skill 索引

| 操作 | Skill |
| --- | --- |
| 新舰型上线、现有舰型定稿、站内参数与 3D 模型更新、CDN 资产发布 | [zeppelin-vessel-release](.agents/skills/zeppelin-vessel-release/SKILL.md) |
| 从 Blender 生成和发布七个标准高清视角 | [zeppelin-standard-views](.agents/skills/zeppelin-standard-views/SKILL.md) |

先读对应 Skill。新舰型工作以 `zeppelin-vessel-release` 为入口；其中引用标准视图流程。
3D 场景背景的导出、CDN 发布方法见 [资产契约](docs/assets.md)。

## 常用命令与边界

- `npm run dev`：本地开发；`npm run check`：数据与资产门禁；`npm run build`：构建。
- `npm test`：轻量浏览器检查，自动准备经过哈希验证的真实模型缓存。
- main 的 CI 通过后自动发布；`npm run verify:production` 核对已部署提交。
- Blender 源文件保存在 Google Drive，导出母版放在仓库外；模型和高清图片发布到 `https://h.no.mt`。
- 网页直接读取 CDN 模型。Git 仅保存源码、配置、发布记录及规定尺寸的小缩略图，GLB 不进入 Git 或站点部署包。
- 用户偏好：Actions 保留关键冒烟检查，不为每个舰型增加逐视角、逐分辨率的完整交互遍历。

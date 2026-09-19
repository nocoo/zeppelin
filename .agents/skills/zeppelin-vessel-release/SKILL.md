---
name: zeppelin-vessel-release
description: >
  Publish a new Zeppelin vessel or update a finalized design: reconcile its Blender source and specifications, export 3D views, publish immutable CDN assets, update the catalogue, and follow the site's release pipeline. Use for 新舰型上线、舰型定稿、模型更新; not for authoring the spacecraft itself.
---

# 舰型上线与定稿更新

从仓库根目录执行。先读 [资产契约](../../../docs/assets.md)、目标 Google Drive 目录的 README 与验证报告，再核对实际 `.blend`。源通常位于 `zeppelin/太空时代/飞行器/<型号>/`。用户明确确认定稿时可更新为 `ready / 设计定型`；仅有成功渲染不能推断定稿。

## 资料与身份

- `src/fleet.js` 保存型号、舷号、尺寸、载员、设备与状态。只采用源文件/验证报告中有依据的数据；尺寸是航行构型外包尺寸，不把展开坡道混入舰长。
- `ys-01` 这类路由 ID 稳定；`YS-01A` 是模型身份，两者不可混用。历史图片可继续记录旧型号，但页面应明确标识。
- 保留小型定稿验证报告到 `docs/assets/<id>/final-v<version>.json`。比对其中源 SHA 与本次导出记录，防止误用旧模型。
- 不执行源目录的建模脚本，不保存或改写用户 `.blend`。所有导出只读打开，禁用内嵌脚本，前后检查源哈希。

## 3D 导出与 CDN

复用 `scripts/export-model.py`，不为每款舰船复制导出器。Blender 5.2.2，米制，船首 −Y、上 +Z，收集 01–79 编号集合的可渲染几何。输出必须是仓库外的空目录。

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup \
  --disable-autoexec --python-exit-code 1 --python scripts/export-model.py -- \
  --blend '/absolute/<MODEL>.blend' --model YS-01A --number 5001 \
  --scene 'YS-01A · 外观' --include-scenes 'YS-01A · 内部剖视' \
  --output '/external/ys-01a-3d/v1.0.0'
node scripts/publish-models.mjs --input '/external/ys-01a-3d/v1.0.0' \
  --hexly '/absolute/hexly.ai' --version 1.0.0
```

按实际源文件填参数。剖视、客舱、尾门等场景可列在 `--include-scenes`；同一细节 GLB 用 `sourceScenes` 保留真实几何的可见性差异。全览只导出外观并简化；细节保留求值后的网格、文字和烘焙材质。`scripts/export-hw-01.py` 仅保留作早期 HW 资产的历史导出器。

检查外部 `publication-plan.json` 的型号、源 SHA、文件体积、CDN 地址和版本，再在本次用户授权范围内加 `--publish`。复用 Hexly 的 `planMedia/publishMedia`，完成 GET、长度、MIME、SHA 校验后才安装 `docs/assets/<id>/3d-v<version>.json`。已发布版本不能改写；改变字节即使用新版本，旧 URL 保留。

网页模型必须直接读取发布记录里的 `https://h.no.mt` URL。验证生产域名和开发域名的 CORS；CSP 的 `connect-src` 需允许该域名。不要把 GLB 放回 `public/`、打进 `dist/` 或提交 Git。`npm run models:prepare` 仅为测试下载 `.local/models/` 缓存。

## 接入与图片

- 在 `src/models.js` 登记发布记录、全览比例和细节相机。坐标使用 Blender 米制，前端统一转为 glTF；优先采用源相机、包围盒和功能区位置。
- 每个细节指定 `target / direction / span`，剖视另指定精确 `scene` 名。全览允许旋转与缩放；细节固定距离，禁用缩放、平移和双指变焦。不要在渲染器或页面中追加型号专属分支。
- 定稿外观有变化时按 [标准视图 Skill](../zeppelin-standard-views/SKILL.md) 重做七视图，用新的图片版本发布。`public/assets/manifest.json` 和 `docs/assets/<id>/v<version>.json` 必须一致；缩略图仍使用稳定路由 ID。
- 更新页面状态、规格、功能描述和 README，移除过时的原型提示；旧发布记录保留。

## 简短验证与上线

运行 `npm run check` 和 `npm run build`。用真实模型确认新增舰型全览、一个代表性细节/剖视、旋转和细节距离锁定，查看是否有脚本或 CDN 错误。Actions 复用现有轻量冒烟，不随型号数量增加逐视角/逐分辨率遍历；CDN 字节完整性与数据检查覆盖每份新资产。

用户要求上线时，提交代码、发布记录和合规缩略图，推送 main，跟进 CI 与自动 Release。远端有更新则保留并正常合并，禁止覆盖。部署成功后核对 `/api/live` 的实际提交，并简单打开新增舰型的全览和细节。报告生产链接与实际验证结果，不把“已推送”称为“已上线”。

# 标准视图与公共资产契约

## 源与制作状态

来源为用户 Google Drive `zeppelin/太空时代/飞行器/{HW-01,YS-01,YS-02}/` 中的独立 `.blend`。HW-01 是 NC-01 的正式型号迁移，舷号 227；不改写 NC-01 安全副本。YS-01/5001 与 YS-02/5002 为在制运输系列，网站保留原型状态，当前发布只代表记录的源文件哈希。

外部生产目录存放 PNG 母版、`render-manifest.json`、WebP 和 `plan.json`。输入输出均使用绝对路径；脚本拒绝向 Zeppelin 仓库内渲染。只读打开源文件，禁止执行嵌入脚本，不调用保存；前后核对源 SHA-256。文件发生并发变化则整组失败。

## 可复现渲染

入口为 `.agents/skills/zeppelin-standard-views/scripts/render.py`，详见 [Skill](../.agents/skills/zeppelin-standard-views/SKILL.md)。版本固定为 Blender 5.2.2 LTS；米制、scale 1；船首 −Y、右舷 +X、上 +Z。六正投影的观察点分别位于轴向；顶/底图的朝向由相机世界矩阵明确记录，不对图像镜像。三分之四观察方向为 `(1, -1.35, .95)`。

源资产独立无外链，贴图和字体须内嵌。渲染仅收集外观场景中编号 `01`–`79` 集合内的可见网格/文字/曲面；环境、原灯光和摄影机不进入新场景。模型文字与舷号必须匹配。以真实外包盒中心瞄准，长边 L 决定距离 `2.5 L`，所有正投影视图使用同一 `1.48 L` 比例。透视镜头为 70 mm，传感器 36 mm。保留米制大小，不缩放原网格；不同舰型使用各自的 L，不能从缩放后的网页图直接比较绝对大小。

四盏中性面光源按 L 放置、能量按 L² 缩放，完整位置/功率/面积写入 Manifest。黑色工程背景 `(0.002,0.002,0.002)`，强度 0.25。Cycles 64 samples、固定 seed 227、降噪、12 次总反弹/10 次透射，AgX Medium High Contrast，exposure 0/gamma 1。2560 × 1920 RGB 8-bit PNG；展示 WebP quality 90/effort 6；缩略图 fit inside 640px/quality 72。

默认 CPU；本次记录使用显式 Metal GPU。相同版本/设备可复现构图与参数；跨 CPU/GPU/驱动和降噪器不承诺逐字节相同。不同输出哈希视为新资产，禁止冒充旧输出。原始 PNG 哈希、最终 WebP 哈希及渲染脚本哈希各自记录。

## 复用 Hexly

只读审查基线：Hexly `bb8d2a7c8609db0a13dd3702e1961fb03cae5531`，`scripts/media-r2.ts`、`src/data/media-storage.json`、`docs/21-asset-storage.md` 与 `hexly-r2-media` Skill。Zeppelin **直接导入**现有 `planMedia` / `publishMedia`，不复制上传实现，不创建桶、网关或凭据系统。发布记录保存实际被调用辅助文件 SHA-256 与仓库 revision。

现有存储为 `hexlyai`，公开域名 `https://h.no.mt`。Zeppelin 尚未登记 Hexly catalogue，因此使用发布器已有的共享项目 `hexly-ai`，独立资产 ID `zep-hw-01` / `zep-ys-01` / `zep-ys-02`，消费项目仍明确记录 `zep`。不伪造目录登记或改动 Hexly 文件。命名如下，地址由 `planMedia` 生成而非猜测：

```text
projects/hexly-ai/screenshots/zep-<model>/v<X.Y.Z>/<view>-<sha256前12位>.webp
```

现有 Wrangler 登录仅由 Hexly 发布器使用，凭据留在机器原有配置或受控环境中，不读取到网站、不复制到仓库或记录。只需 Node.js 24+ 原生 TypeScript 导入支持以及已安装的 Wrangler；不需要 S3 SDK。先不带 `--publish` 生成 dry-run plan；审阅该版本后加 `--publish`。当前用户已授权本次资产发布，不额外要求重复授权。

```sh
node scripts/publish-assets.mjs --input /external/render/HW-01/v1.0.0 \
  --hexly /path/to/hexly.ai --version 1.0.0
# 审阅 external plan.json 后：
node scripts/publish-assets.mjs --input /external/render/HW-01/v1.0.0 \
  --hexly /path/to/hexly.ai --version 1.0.0 --publish
```

Hexly 先探测地址，只在不存在时上传，完整 GET 验证 MIME、字节数和 SHA-256 后返回成功。对象使用 `public, max-age=31536000, immutable`。失败立即停止，不安装残缺网站 Manifest；重新运行同一命令会重新验证并复用已成功对象。仅在确认瞬时网络原因后手动重试；授权、证书或哈希错误须先排查，不禁用 TLS 验证。`.local/publish.lock` 保证本地唯一发布者，不能当作跨机器分布式锁。清理锁之前必须确认记录 PID 已停止。已发布版本不可改写，变更升版本；回滚选择先前 Manifest，不删除旧 CDN 对象。

字体使用 Fontsource 5.3.0 的固定版本 CDN URL 与 OFL 许可。已验证的 R2 字体副本保留在 `docs/assets/display-font.json`，但现有 R2 CORS 白名单不包含任意开发/未来站点域名，故网页不使用该副本；没有修改 Hexly CORS。舰船 `<img>` 直接展示及在新窗口打开高清图无需跨域脚本读取。将来若需要 canvas 或下载 fetch，须核对部署域名的 CORS 契约。

## 网站边界与验证

`public/assets/manifest.json` 是网站唯一图片地址来源。各舰型包含七个视图、米制尺寸、Blender/渲染器版本、源文件名/哈希、相机矩阵与参数、灯光/色彩参数、图片分辨率/字节数/哈希、发布器来源及验证时间。本地缩略图也记录独立尺寸/字节数/哈希。

`npm run check` 校验标准视图完整性、系列/舷号、不可变 URL 与 hash12 对应、所有本地缩略图哈希/尺寸、版本发布记录及 Git index。针对非法 Manifest、错误编号、隐藏 HD、伪装 Blender 和强制添加大文件有负向测试。`npm run assets:verify` 重新对全部在线原始 URL 执行完整 GET，核对状态/MIME/Cache-Control/字节/SHA/分辨率；历史记录不等于当前在线可用性。

浏览器测试用真实 CDN URL 和验证过的本地缩略图作为网络 fixture，避免在线波动影响交互测试；实时 CDN 验证独立执行。开发显式 `?assets=offline` 带醒目提示；生产编译移除该模式。图片错误可见、可重试，不存在自动切换缩略图的线上路径。

### Website mark exception (2026-09-19)

The owner requested no Logo in Zeppelin site chrome. README retains the adopted rounded spacecraft presentation; the homepage uses its text wordmark and the vessel workspace/sidebar has no brand image. Transparent browser/favicon and social metadata assets retain their established roles. `public/brand.json` remains the immutable source receipt; its header derivative is available but not rendered.

## HW-01A 交互模型

`docs/assets/hw-01/3d-v1.0.0.json` 独立记录新版 `HW-01A.blend` / **2227**，不改写七视图的历史 `HW-01` / 227 记录。`scripts/export-hw-01.py` 使用 Blender 5.2.2，只读打开源文件，核对前后 SHA-256；保留 01–79 集合的 3,965 个可渲染部件，排除布景。所有倒角、实体化和加权法线经求值导出，文字转为实际几何。glTF 坐标为 `(x,z,-y)`，米制比例不变。

细节版保留约 138 万三角面，按材质无损合并绘制批次；从源材质节点烘焙 4096px Base Color 与 2048px 切线法线，保留程序化涂装和微表面凹凸。全览再将几何减至约 44 万三角面，贴图降至 1024px。两档均使用 Draco 压缩，玻璃、金属度、粗糙度和自发光采用源 PBR 参数；实时玻璃粗糙度作透射适配，尾焰使用半透明发光近似。有限分辨率贴图与实时反射不等同于 Cycles 光线追踪。

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup \
  --disable-autoexec --python-exit-code 1 --python scripts/export-hw-01.py -- \
  --blend '/external/HW-01A.blend' --output '/external/empty-export-directory'
node scripts/publish-models.mjs --input /external/empty-export-directory \
  --hexly /path/to/hexly.ai
# 审阅 publication-plan.json 后，在资产发布授权范围内加 --publish。
```

发布复用 Hexly `planMedia` / `publishMedia`，仅在调用进程中登记 `model/gltf-binary` MIME，不修改 Hexly 源码、存储配置或 CORS。GLB 使用独立版本和内容哈希地址，上传后完整 GET/hash 验证，完成两档后才安装发布记录。源 `.blend`、烘焙贴图和 GLB 母版均留在外部目录。

`npm run models:prepare` 从发布记录下载并验证 GLB 的长度、头部和 SHA-256，写入忽略的 `public/assets/models/`；dev/build 自动执行并复用已验证缓存。构建将模型作为**同源**静态资源交付，避免依赖共享 CDN 的跨域白名单。单个 GLB 小于 Workers Static Assets 的 25 MiB 限制。Git 仅保存代码与记录，资产门禁同时阻止 GLB 扩展名和伪装的 GLB 头部。

网页仅在 HW-01A 详情加载 Three.js，全览先加载，进入细节后才请求完整模型；不自动降级成低精度细节。七个全览方向可旋转与缩放；七个局部视角锁定距离，关闭平移与双指手势，单指/鼠标拖动和方向键旋转，Home 或复位按钮恢复预设方向。视口尺寸变化只调整构图适配。切换范围复用已解码模型，离开舰型释放 WebGL、贴图、几何和解码线程；加载错误可重试，WebGL 不可用仍可进入标准图片视图。

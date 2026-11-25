/// <reference types="vite/client" />
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import decoderJS from "three/addons/libs/draco/gltf/draco_wasm_wrapper.js?url";
import decoderWasm from "three/addons/libs/draco/gltf/draco_decoder.wasm?url";

// Source coordinates are Blender metres (+Z up, bow -Y). glTF is +Y up.
/** @param {number[]} coords */
const xyz = ([x, y, z]) => new THREE.Vector3(x, z, -y);

/** @param {THREE.Object3D} root */
function release(root) {
  /** @type {Set<THREE.BufferGeometry>} */
  const geometries = new Set();
  /** @type {Set<THREE.Material>} */
  const materials = new Set();
  /** @type {Set<THREE.Texture>} */
  const textures = new Set();
  root.traverse((object) => {
    if ("geometry" in object && object.geometry instanceof THREE.BufferGeometry) {
      geometries.add(object.geometry);
    }
    if ("material" in object && object.material) {
      const list = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of list) materials.add(material);
    }
  });
  for (const geometry of geometries) geometry.dispose();
  materials.forEach((material) => {
    for (const value of Object.values(material)) {
      if (value && typeof value === "object" && "isTexture" in value && value.isTexture) {
        textures.add(/** @type {THREE.Texture} */ (value));
      }
    }
    material.dispose();
  });
  for (const texture of textures) {
    const data = texture.source.data;
    if (data && typeof data === "object" && "close" in data && typeof data.close === "function") {
      data.close();
    }
    texture.dispose();
  }
}

/**
 * @param {HTMLElement} host
 * @param {import("./models.js").ModelConfig} config
 */
export function createModelPreview(host, config) {
  const { model, center = [0, 0, 0], views } = config;
  const length = (config.span ?? 1) / 1.24;
  const canvas = /** @type {HTMLCanvasElement} */ (host.querySelector("canvas"));
  const status = /** @type {HTMLElement} */ (host.querySelector(".model-status"));
  const message = /** @type {HTMLElement} */ (status.querySelector("p"));
  const retry = /** @type {HTMLButtonElement} */ (status.querySelector("button"));
  const caption = /** @type {HTMLElement} */ (host.querySelector(".model-caption strong"));
  const hint = /** @type {HTMLElement} */ (host.querySelector(".model-hint"));
  const resetButton = /** @type {HTMLButtonElement} */ (host.querySelector(".model-reset"));
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene();
  // Three perpendicular planes share the vessel's world coordinates, so the
  // reference grid has real perspective and follows camera rotation.
  const grid = new THREE.Group();
  const gridSize = length * 2.8;
  const gridCenter = xyz(center);
  const floor = (config.model.bounds?.min?.[2] ?? center[2] - length * 0.16) - length * 0.12;
  for (const plane of ["floor", "back", "side"]) {
    for (const [divisions, opacity] of [
      [56, 0.15],
      [14, 0.34],
    ]) {
      const lines = new THREE.GridHelper(gridSize, divisions, 0xc5cc92, 0x899c86);
      lines.position.copy(gridCenter);
      if (plane === "floor") lines.position.y = floor;
      if (plane === "back") {
        lines.rotation.x = Math.PI / 2;
        lines.position.z -= gridSize / 2;
        lines.position.y = floor + gridSize / 2;
      }
      if (plane === "side") {
        lines.rotation.z = Math.PI / 2;
        lines.position.x -= gridSize / 2;
        lines.position.y = floor + gridSize / 2;
      }
      lines.material.transparent = true;
      lines.material.opacity = opacity;
      lines.material.depthWrite = false;
      lines.renderOrder = -1;
      grid.add(lines);
    }
  }
  scene.add(grid);
  const camera = new THREE.PerspectiveCamera(32, 1, 0.02, length * 12);
  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;
  controls.rotateSpeed = 0.65;
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.ROTATE,
  };
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.04);
  room.dispose();
  pmrem.dispose();
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.3;
  scene.add(new THREE.HemisphereLight(0xdce7f4, 0x343a38, 0.55));
  /** @type {Array<[number[], number]>} */
  const lights = [
    [[-0.8, -1, 1.5], 3.5],
    [[1, -0.3, 0.5], 0.8],
    [[0.3, 1, 1], 2.5],
    [[-0.4, 0.2, -1], 1],
  ];
  for (const [position, intensity] of lights) {
    const light = new THREE.DirectionalLight(0xffffff, intensity);
    light.position.copy(xyz(position).multiplyScalar(length));
    light.target.position.copy(xyz(center));
    scene.add(light, light.target);
    if (intensity === 3.5) {
      light.castShadow = true;
      light.shadow.mapSize.set(2048, 2048);
      Object.assign(light.shadow.camera, {
        left: -length * 0.7,
        right: length * 0.7,
        top: length * 0.7,
        bottom: -length * 0.7,
        near: 1,
        far: length * 4,
      });
      light.shadow.normalBias = 0.035;
      light.shadow.bias = -0.0001;
    }
  }
  const draco = new DRACOLoader()
    .setDecoderPath({ js: decoderJS, wasm: decoderWasm })
    .setWorkerLimit(2);
  const loader = new GLTFLoader().setDRACOLoader(draco);
  const abort = new AbortController();
  /** @type {Map<"detail" | "overview", Promise<THREE.Group | null>>} */
  const cache = new Map();
  let disposed = false;
  let lost = false;
  let current = "three-quarter";
  /** @type {THREE.Group | undefined} */
  let active;
  let generation = 0;
  let baseDistance = 1;
  let lastAspect = 0;

  function draw() {
    if (disposed || lost || !host.clientWidth || !host.clientHeight) return;
    host.dataset.cameraDistance = camera.position.distanceTo(controls.target).toFixed(6);
    host.dataset.cameraPosition = camera.position
      .toArray()
      .map((value) => value.toFixed(6))
      .join(",");
    renderer.render(scene, camera);
  }
  function pose(preserveZoom = false) {
    const view = views[current];
    const detail = Boolean(view.target);
    const span = view.span || config.span || 1;
    // Fit the narrower viewport dimension. This is framing on resize, never user zoom in details.
    const distance =
      span / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * Math.min(camera.aspect, 1));
    const ratio =
      preserveZoom && !detail ? camera.position.distanceTo(controls.target) / baseDistance : 1;
    const direction = preserveZoom
      ? camera.position.clone().sub(controls.target).normalize()
      : xyz(view.direction).normalize();
    controls.target.copy(xyz(view.target || center));
    camera.position.copy(controls.target).addScaledVector(direction, distance * ratio);
    baseDistance = distance;
    controls.enableZoom = !detail;
    controls.minDistance = detail ? distance : distance * 0.65;
    controls.maxDistance = detail ? distance : distance * 2.2;
    controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: detail ? null : THREE.TOUCH.DOLLY_ROTATE,
    };
    controls.update();
    draw();
  }
  function resize() {
    const width = host.clientWidth,
      height = host.clientHeight;
    if (!width || !height || disposed) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    if (lastAspect !== camera.aspect) pose(lastAspect !== 0);
    lastAspect = camera.aspect;
    draw();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  controls.addEventListener("change", draw);
  /** @param {KeyboardEvent} event */
  function keydown(event) {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home"].includes(event.key)) return;
    event.preventDefault();
    if (event.key === "Home") return pose();
    const spherical = new THREE.Spherical().setFromVector3(
      camera.position.clone().sub(controls.target),
    );
    const step = 0.12;
    if (event.key === "ArrowLeft") spherical.theta -= step;
    if (event.key === "ArrowRight") spherical.theta += step;
    if (event.key === "ArrowUp") spherical.phi -= step;
    if (event.key === "ArrowDown") spherical.phi += step;
    spherical.makeSafe();
    camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical));
    controls.update();
    draw();
  }
  canvas.addEventListener("keydown", keydown);
  /** @param {string} text */
  function fail(text) {
    status.hidden = false;
    message.textContent = text;
    retry.hidden = false;
    host.dataset.state = "error";
  }
  /** @param {Event} event */
  function contextLost(event) {
    event.preventDefault();
    lost = true;
    fail("图形连接中断，请重新载入 3D 预览。");
  }
  canvas.addEventListener("webglcontextlost", contextLost);

  /** @param {"detail" | "overview"} lod */
  async function getModel(lod) {
    if (cache.has(lod)) return cache.get(lod) ?? null;
    const pending = (async () => {
      const response = await fetch(model.assets[lod].url, { signal: abort.signal });
      if (!response.ok) throw new Error(`Model HTTP ${response.status}`);
      const buffer = await response.arrayBuffer();
      if (buffer.byteLength !== model.assets[lod].bytes) throw new Error("Incomplete model");
      if (disposed) return null;
      const gltf = await loader.parseAsync(buffer, "");
      if (disposed) {
        release(gltf.scene);
        return null;
      }
      gltf.scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.castShadow = true;
        object.receiveShadow = true;
        const material = /** @type {THREE.MeshPhysicalMaterial} */ (object.material);
        if (material.transparent || material.transmission > 0) object.castShadow = false;
        // Screen-space transmission blurs more than Cycles at the same roughness.
        if (material.transmission > 0.9) {
          material.roughness = 0.025;
          material.envMapIntensity = 0.25;
        }
        if (material.name.includes("soft blue exhaust")) material.depthWrite = false;
      });
      return gltf.scene;
    })();
    cache.set(lod, pending);
    try {
      return await pending;
    } catch (error) {
      cache.delete(lod);
      throw error;
    }
  }
  /** @param {string} name */
  async function select(name) {
    if (disposed || !views[name]) return;
    current = name;
    const ticket = ++generation,
      detail = Boolean(views[name].target);
    const lod = detail ? "detail" : "overview";
    caption.textContent = views[name].label;
    hint.textContent = detail ? "拖动旋转 · 距离锁定" : "拖动旋转 · 滚轮 / 双指缩放";
    canvas.setAttribute(
      "aria-label",
      `${views[name].label}，${detail ? "仅可旋转" : "可旋转与缩放"}。方向键旋转，Home 复位。`,
    );
    host.dataset.modelPose = name;
    host.dataset.state = "loading";
    host.dataset.lod = lod;
    status.hidden = false;
    retry.hidden = true;
    message.textContent = `正在载入${detail ? "完整细节" : "全舰"}模型… ${Math.round(model.assets[lod].bytes / 1e6)} MB`;
    if (active) active.visible = false;
    resize();
    pose();
    try {
      const object = await getModel(lod);
      if (disposed || ticket !== generation || !object) return;
      if (active && active !== object) scene.remove(active);
      active = object;
      scene.add(object);
      object.traverse((part) => {
        if (part.userData.sourceScenes)
          part.visible = part.userData.sourceScenes.includes(
            views[name].scene || model.source.scene,
          );
      });
      object.visible = true;
      status.hidden = true;
      host.dataset.state = "ready";
      draw();
    } catch (error) {
      if (disposed || ticket !== generation) return;
      fail("3D 模型暂时无法载入。可重试，或切换标准视图。");
      console.error(`${model.model} 3D preview`, error);
    }
  }
  const reset = () => pose();
  const reload = () => (lost ? location.reload() : select(current));
  resetButton.addEventListener("click", reset);
  retry.addEventListener("click", reload);
  resize();
  return {
    select,
    /** @param {string} name */
    setBackground(name) {
      grid.visible = name === "none";
      draw();
    },
    dispose() {
      disposed = true;
      abort.abort();
      observer.disconnect();
      controls.dispose();
      canvas.removeEventListener("keydown", keydown);
      canvas.removeEventListener("webglcontextlost", contextLost);
      resetButton.removeEventListener("click", reset);
      retry.removeEventListener("click", reload);
      for (const pending of cache.values())
        pending.then((root) => root && release(root)).catch(() => {});
      Promise.allSettled(cache.values()).then(() => draco.dispose());
      environment.dispose();
      release(grid);
      scene.traverse((object) => {
        if (object instanceof THREE.DirectionalLight) object.shadow.dispose();
      });
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}

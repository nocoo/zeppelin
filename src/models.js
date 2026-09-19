import hw from "../docs/assets/hw-01/3d-v1.0.0.json" with { type: "json" };
import ys01 from "../docs/assets/ys-01/3d-v1.0.0.json" with { type: "json" };
import ys02 from "../docs/assets/ys-02/3d-v1.0.0.json" with { type: "json" };

const hwViews = {
  "three-quarter": { label: "全舰 · 三分之四", direction: [1, -1.35, 0.95] },
  front: { label: "全舰 · 船首", direction: [0, -1, 0] },
  rear: { label: "全舰 · 舰尾", direction: [0, 1, 0] },
  port: { label: "全舰 · 左舷", direction: [-1, 0, 0] },
  starboard: { label: "全舰 · 右舷", direction: [1, 0, 0] },
  top: { label: "全舰 · 顶部", direction: [0, 0, 1] },
  bottom: { label: "全舰 · 腹部", direction: [0, 0, -1] },
  bow: {
    label: "船首玻璃舱",
    target: [0, -28.5, 0.4],
    direction: [8, -16.5, 11.6],
    span: 17,
  },
  bridge: {
    label: "指挥塔",
    target: [0, 11.5, 9.2],
    direction: [34, -37.5, 19.8],
    span: 24,
  },
  weapons: {
    label: "甲板武器",
    target: [0, -3, 5.8],
    direction: [27, -33, 22.2],
    span: 25,
  },
  flank: {
    label: "舷侧设备",
    target: [8, -14.5, 0.1],
    direction: [40, -19.5, 11.9],
    span: 20,
  },
  engine: {
    label: "引擎机械舱",
    target: [16, 16, 1.2],
    direction: [28, 16, 11.8],
    span: 19,
  },
  stern: {
    label: "舰尾玻璃舱",
    target: [0, 25.8, 0.3],
    direction: [7, 18.2, 10.7],
    span: 16.5,
  },
  ventral: {
    label: "腹部推进器",
    target: [0, 7, -4.8],
    direction: [25, -29, -25],
    span: 31,
  },
};

const overview = Object.fromEntries(Object.entries(hwViews).filter(([, view]) => !view.target));
export const models = {
  "hw-01": { model: hw, center: [0, -1.84, 4.545], span: 76, views: hwViews },
  "ys-01": {
    model: ys01,
    views: {
      ...overview,
      bow: { label: "全景驾驶舱", target: [0, -4.1, .3], direction: [.6, -1, .45], span: 7 },
      cabin: { label: "乘员舱剖视", target: [0, -.3, .4], direction: [.65, -.9, 1.2], span: 11, scene: "YS-01A · 内部剖视" },
      engine: { label: "推进与支座", target: [4.3, 3.5, .1], direction: [1, 1.2, .7], span: 7.5 },
      stern: { label: "尾部对接环", target: [0, 5.4, 0], direction: [.35, 1, .25], span: 6 },
      hull: { label: "曲面装甲", target: [0, -.6, 1.5], direction: [.9, -.7, 1.1], span: 7 },
      ventral: { label: "起落与姿控", target: [0, 0, -1], direction: [.7, -.9, -1], span: 13 },
    },
  },
  "ys-02": {
    model: ys02,
    views: {
      ...overview,
      bow: { label: "前置驾驶舱", target: [0, -8.2, 2.5], direction: [.6, -1, .45], span: 10 },
      cabin: { label: "上层客舱", target: [0, -1, 3.1], direction: [.65, -.9, 1.2], span: 22, scene: "YS-02A · 上层客舱" },
      cargo: { label: "下层货舱", target: [0, 0, 0], direction: [.65, -.9, 1.2], span: 24, scene: "YS-02A · 内部剖视" },
      ramp: { label: "尾门装卸", target: [0, 8, .2], direction: [.53, 1.07, .31], span: 20, scene: "YS-02A · 尾门装卸" },
      engine: { label: "推进与支座", target: [7, 7.8, .2], direction: [1, 1.2, .7], span: 13 },
      weapons: { label: "尾部自卫炮", target: [0, 8.9, 4.4], direction: [.7, 1, .6], span: 9 },
      hull: { label: "曲面装甲", target: [0, -.6, 4.7], direction: [.9, -.7, 1.1], span: 13 },
    },
  },
};
for (const config of Object.values(models)) {
  config.center ??= config.model.bounds.center;
  config.span ??= Math.max(...config.model.bounds.size) * 1.24;
}

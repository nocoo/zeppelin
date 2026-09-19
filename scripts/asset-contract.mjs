import assert from "node:assert/strict";

export const views = [
  "front",
  "rear",
  "port",
  "starboard",
  "top",
  "bottom",
  "three-quarter",
];
export const hashPattern = /^[a-f0-9]{64}$/;
export function assertPublicationUnchanged(previous, candidate) {
  for (const field of [
    "model",
    "series",
    "number",
    "version",
    "source",
    "rendererSha256",
    "coordinates",
    "bounds",
    "render",
  ]) {
    assert.deepEqual(
      candidate[field],
      previous[field],
      `Published ${field} changed; use a new version`,
    );
  }
  for (const name of views) {
    for (const field of ["sha256", "pngSha256", "camera", "thumbnail"]) {
      assert.deepEqual(
        candidate.views[name][field],
        previous.views[name][field],
        `Published ${name}/${field} changed; use a new version`,
      );
    }
  }
}
export function validateVessel(vessel, published = true) {
  assert.equal(vessel.schemaVersion, 1);
  assert.match(vessel.model, /^(HW|YS)-\d{2}$/);
  assert.equal(vessel.series, vessel.model.split("-")[0]);
  assert.match(vessel.number, vessel.series === "HW" ? /^2\d{2}$/ : /^5\d{3}$/);
  assert.match(vessel.source.sha256, hashPattern);
  assert.match(vessel.rendererSha256, hashPattern);
  assert.equal(vessel.blender, "5.2.2 LTS");
  assert.equal(vessel.render.engine, "CYCLES");
  assert.ok(["cpu", "metal"].includes(vessel.render.device));
  assert.equal(vessel.render.samples, 64);
  assert.equal(vessel.render.seed, 227);
  assert.equal(vessel.render.viewTransform, "AgX");
  assert.equal(vessel.render.look, "AgX - Medium High Contrast");
  assert.equal(vessel.render.lights.length, 4);
  if (published) {
    assert.match(vessel.version, /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/);
    assert.equal(vessel.publisher.origin, "https://h.no.mt");
    assert.equal(vessel.publisher.bucket, "hexlyai");
    assert.equal(vessel.publisher.consumerProject, "zep");
    assert.match(vessel.publisher.helperSha256, hashPattern);
    assert.match(vessel.publisher.commit, /^[a-f0-9]{40}$/);
  }
  assert.deepEqual(
    Object.keys(vessel.views).sort(),
    [...views].sort(),
    "Seven complete standard views required",
  );
  assert.deepEqual(vessel.coordinates, {
    forward: "-Y",
    starboard: "+X",
    up: "+Z",
    units: "m",
    scale: 1,
  });
  assert.ok(
    ["width", "length", "height"].every(
      (key) => Number.isFinite(vessel.bounds[key]) && vessel.bounds[key] > 0,
    ),
  );
  const orthoScales = new Set();
  for (const [name, view] of Object.entries(vessel.views)) {
    assert.equal(view.width, 2560);
    assert.equal(view.height, 1920);
    assert.match(view.sha256, hashPattern);
    assert.ok(Number.isInteger(view.bytes) && view.bytes > 0);
    assert.equal(
      view.camera.type,
      name === "three-quarter" ? "PERSP" : "ORTHO",
    );
    assert.equal(view.camera.lensMm, 70);
    assert.equal(view.camera.matrixWorld.length, 4);
    assert.ok(
      view.camera.matrixWorld.every(
        (row) => row.length === 4 && row.every(Number.isFinite),
      ),
    );
    assert.ok(
      Number.isFinite(view.camera.orthoScale) && view.camera.orthoScale > 0,
    );
    if (name !== "three-quarter") orthoScales.add(view.camera.orthoScale);
    if (published) {
      assert.equal(view.contentType, "image/webp");
      const expected = `https://h.no.mt/projects/hexly-ai/screenshots/zep-${vessel.model.toLowerCase()}/v${vessel.version}/${name}-${view.sha256.slice(0, 12)}.webp`;
      assert.equal(
        view.url,
        expected,
        "URL must be the verified Hexly immutable key",
      );
      assert.equal(view.key, new URL(expected).pathname.slice(1));
      assert.match(view.pngSha256, hashPattern);
      assert.ok(
        view.verifiedAt && Number.isFinite(Date.parse(view.verifiedAt)),
      );
      assert.equal(
        view.thumbnail.path,
        `assets/thumbnails/${vessel.model.toLowerCase()}-${name}.webp`,
      );
      assert.ok(view.thumbnail.width <= 640 && view.thumbnail.height <= 640);
      assert.ok(view.thumbnail.bytes <= 100_000);
      assert.match(view.thumbnail.sha256, hashPattern);
    }
  }
  assert.equal(orthoScales.size, 1, "Orthographic views must share scale");
}

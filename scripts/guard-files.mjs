import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile, lstat } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";

export async function checkEntry(path, bytes) {
  assert.ok(bytes.length <= 512_000, `File exceeds 500 KiB: ${path}`);
  assert.ok(
    !/\.(blend\d*|glb|gltf|fbx|obj|exr|psd|tiff?|mp4|mov|zip|woff2?|ttf|otf)$/i.test(
      path,
    ),
    `Source/large asset forbidden: ${path}`,
  );
  assert.ok(
    !/(^|\/)(\.env[^/]*|\.dev.vars[^/]*|credentials[^/]*|[^/]*\.pem)$/.test(
      path,
    ),
    `Credential file forbidden: ${path}`,
  );
  assert.ok(
    !bytes.subarray(0, 7).equals(Buffer.from("BLENDER")),
    `Blender file disguised as ${path}`,
  );
  assert.ok(
    !bytes.subarray(0, 4).equals(Buffer.from("glTF")),
    `GLB file disguised as ${path}`,
  );
  let meta;
  try {
    meta = await sharp(bytes).metadata();
  } catch {
    /* Non-image source file. */
  }
  if (meta && meta.format !== "svg") {
    assert.match(
      path,
      /^public\/assets\/thumbnails\/[a-z]{2}-\d{2}-(front|rear|port|starboard|top|bottom|three-quarter)\.webp$/,
      "Only named fleet thumbnails may be tracked",
    );
    assert.equal(meta.format, "webp");
    assert.ok(
      meta.width <= 640 && meta.height <= 640,
      `HD image forbidden: ${path}`,
    );
    assert.ok(bytes.length <= 100_000, `Thumbnail over 100 KB: ${path}`);
  } else {
    assert.ok(
      !/\.(png|jpe?g|webp|avif|gif)$/i.test(path),
      `Invalid/forbidden image: ${path}`,
    );
  }
}

export async function guard(root = process.cwd(), stagedOnly = false) {
  const git = (args) =>
    execFileSync("git", ["-C", root, ...args], { maxBuffer: 10 * 1024 * 1024 });
  const entries = git(["ls-files", "--stage", "-z"])
    .toString()
    .split("\0")
    .filter(Boolean);
  const indexed = new Set();
  for (const entry of entries) {
    const [info, path] = entry.split("\t");
    const [mode, object, stage] = info.split(" ");
    assert.equal(stage, "0", `Unmerged index: ${path}`);
    assert.ok(
      ["100644", "100755"].includes(mode),
      `Unexpected file mode: ${path}`,
    );
    assert.ok(
      Number(git(["cat-file", "-s", object])) <= 512_000,
      `Large staged object: ${path}`,
    );
    await checkEntry(path, git(["cat-file", "blob", object]));
    indexed.add(path);
  }
  if (!stagedOnly) {
    const files = git([
      "ls-files",
      "--cached",
      "--others",
      "--exclude-standard",
      "-z",
    ])
      .toString()
      .split("\0")
      .filter(Boolean);
    for (const path of files) {
      let stat;
      try {
        stat = await lstat(resolve(root, path));
      } catch (e) {
        if (e.code === "ENOENT") continue;
        throw e;
      }
      assert.ok(
        stat.isFile() && stat.size <= 512_000,
        `Large/nonregular working file: ${path}`,
      );
      await checkEntry(path, await readFile(resolve(root, path)));
    }
  }
  console.info(`Repository asset gate passed (${indexed.size} indexed files)`);
}
if (import.meta.url === pathToFileURL(process.argv[1]).href)
  await guard(process.cwd(), process.argv.includes("--staged"));

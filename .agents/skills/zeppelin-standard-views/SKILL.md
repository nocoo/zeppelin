---
name: zeppelin-standard-views
description: Render and publish reproducible Zeppelin spacecraft standard views from a Blender file, with geometry, camera, source hashes and verified Hexly CDN manifests. Use for fleet assets and replacing their render sets.
---

# Zeppelin standard views

Run from the Zeppelin repository. For a complete new-vessel or finalized-design release, start with [zeppelin-vessel-release](../zeppelin-vessel-release/SKILL.md). Read [the asset contract](../../../docs/assets.md) before publication. This skill renders an existing original model; it does not build or modify a spacecraft.

1. Inspect the source and its authoring status. Require Blender **5.2.2**, a standalone `.blend`, metric units at scale 1, bow **−Y**, starboard **+X**, up **+Z**, and numbered vessel collections `01`–`79`. Rendering refuses missing external resources, invalid geometry or incompatible series/number. Historical HW numbers may use `2xx`; current hull numbers are four digits, with HW in `2xxx` and YS in `5xxx`. Current models include the generation suffix (for example `YS-01A`). Source coordinates are never silently rotated or rescaled.
2. Run the renderer with an **external**, empty output directory. Never copy the source into Git. Supply model and number, and optionally an exact scene when the saved active scene is an interior cutaway:

   ```sh
   blender --background --factory-startup --disable-autoexec --python-exit-code 1 \
     --python .agents/skills/zeppelin-standard-views/scripts/render.py -- \
     --blend '/absolute/path/HW-01.blend' --model HW-01 --number 227 \
     --output '/absolute/external/path/zeppelin/HW-01/v1.0.0'
   ```

   It opens the file without running embedded scripts, selects the exterior scene, validates asset identity, and renders front, rear, port, starboard, top, bottom and three-quarter. Six orthographic views share one scale; perspective uses 70 mm. The fixed rig uses a black engineering background, Cycles, fixed seed, AgX and neutral area lights. All views are 2560 × 1920. `render-manifest.json` records geometry bounds, all camera matrices, lights, settings, PNG hashes, the source `.blend` hash and renderer hash. The source file is not saved. CPU is the reproducibility default; `--device metal` is an explicit, recorded acceleration option. GPU/CPU outputs need not be bit-identical.
3. Inspect every view visually for complete silhouette, correct orientation/identity, lighting and glass. A rendering is not evidence that an in-progress design is approved. Keep YS marked as prototype until its author changes that status.
4. Prepare WebPs, thumbnails and a dry publication plan using Hexly's existing `planMedia`; then publish via its existing `publishMedia` only within the user's publication scope:

   ```sh
   node scripts/publish-assets.mjs --input '/absolute/external/path/zeppelin/HW-01/v1.0.0' \
     --hexly '/absolute/path/hexly.ai' --version 1.0.0
   # Inspect plan.json in the external directory, then add --publish.
   ```

   The script reads Hexly's current transport configuration. No credentials are copied, requested as CLI flags, printed, or written to receipts. It verifies source/PNG hashes before conversion, stops on conflicting/failed uploads, GET-verifies every published byte through Hexly, and installs only the completed manifest and ≤640px thumbnails into Zeppelin. Existing published versions are immutable; a changed render uses a new version. Different bytes never overwrite old URLs. A failed run does not install a partial website manifest.
5. Run `npm run check`, `npm test`, and `npm run assets:verify`. Review the production failure state and explicit development-only thumbnail mode. Commit only the Skill/scripts, manifests/receipts, approved small thumbnails and website changes. `.blend`, PNG masters and HD WebPs stay external. Do not alter another agent's Google Drive sources or Hexly catalogue in this workflow.

# Zeppelin

Fleet archive built with Vite, plain JavaScript/CSS, and Three.js, hosted by a Cloudflare Worker (`worker.js` + `wrangler.jsonc`).
Docs: [README.md](README.md) · [Asset Contract](docs/assets.md) · [Deployment](docs/deployment.md) · [Fleet Spec](docs/fleet-spec.md) · [Retrospective](Retrospective.md)

## Commands

Run from repository root. Manifest pins `npm@11.19.0`; `.node-version` and CI use Node `26.12.1`.

```sh
npm ci
npm run hooks:install       # set git core.hooksPath to .githooks
npm run dev                 # https://zeppelin.dev.hexly.ai -> 127.0.0.1:7052
npm run check               # L1: validate catalogue/assets + Node tests
npm run lint                # S2: Biome lint and format check
npm run build               # B1: validate + Vite build to dist/
npm run deploy:check        # B1: Wrangler packaging dry run (.local/worker-bundle)
npm run dev:worker          # local Worker at 127.0.0.1:17052 (after build)
npm run verify:production   # post-deploy live probe only (not routine doc validation)
```

## Invariants

- **Sources of truth**: `package.json`/`package-lock.json` own versions/deps; `src/fleet.js`, `public/assets/manifest.json`, and `docs/assets/**` own catalogue facts; [docs/assets.md](docs/assets.md) owns media policy.
- **Vessel release**: start new/updated vessel work with [zeppelin-vessel-release](.agents/skills/zeppelin-vessel-release/SKILL.md) before changing specs, 3D models, stable IDs, or CDN assets.
- **Views & scenes**: use [zeppelin-standard-views](.agents/skills/zeppelin-standard-views/SKILL.md) for the seven HD Blender views; scene-background export/CDN follows [docs/assets.md](docs/assets.md).
- **External masters**: Blender sources stay in Google Drive and export masters outside the checkout; models and HD renders publish to `https://h.no.mt`, and the site reads CDN models directly.
- **Git & bundle limits**: commit only source, config, receipts, and approved `<= 640x640` (`<= 100 KB`) WebP thumbnails; never commit GLB/Blender/HD files or bundle GLB into the Worker.
- **Immutable records**: preserve published asset URLs, hashes, receipts, and historical changelog entries; keep known/unknown facts distinct (a planned vessel is not a completed model).
- **Lean CI & scripts**: keep Actions focused on critical smoke checks (no full vessel/view/resolution matrix); `npm run lint` runs Biome, and no TypeScript script is configured.
- **Gates & releases**: preserve full 40-char SHA workflow pins; never bypass hooks, hide scanner failures, or use autofix gates. Main CI auto-deploys; releases and CDN/prod actions need authorization.

## Quality & Local Gates

Follows `system1-quality`; CI slot definitions and pinned `base-ci` revision live in [.github/workflows/quality-slots.yml](.github/workflows/quality-slots.yml) (called by [.github/workflows/ci.yml](.github/workflows/ci.yml); `quality / Z1: Gate` required on `main`). Enforced CI slots: `S2`, `S3`, `G1`, `G2`, `B1`, `L1` (no coverage floor), `Z1`. Status vocabulary: `enforced`, `planned`, `manual`, `N/A`.

- **N/A slots (static/tooling)**: `S1` (plain JS, no TypeScript), `P1` (Cloudflare Worker, not an npm package).
- **N/A slots (runtime/E2E)**: `L2`/`L3` (static site without server runtime or app API), `L4` (repository no longer actively maintained; browser E2E removed).
- **Local hooks**: install via `npm run hooks:install` (`.githooks/`); `pre-commit` runs `node scripts/guard-files.mjs --staged` on the staged index. No tracked `pre-push` hook exists.

## Resources & Isolation

| Lane         | Endpoint / State                                    | Boundary                                                             |
| ------------ | --------------------------------------------------- | -------------------------------------------------------------------- |
| Dev          | `https://zeppelin.dev.hexly.ai` -> `127.0.0.1:7052` | Vite `dev` / `preview` (`strictPort: true`, cannot run concurrently) |
| Local Worker | `127.0.0.1:17052`, `.local/worker-bundle`           | `npm run build && npm run dev:worker`; serves `dist/` + `/api/live`  |
| Prod & CDN   | `https://zeppelin.hexly.ai`, `https://h.no.mt`      | Read-only checks unless release or asset publication is authorized   |

## Retrospective

Record incident narratives in [Retrospective.md](Retrospective.md); promote recurring project constraints to `Invariants` above and deterministic safeguards to tests/hooks.

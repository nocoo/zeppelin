# Zeppelin

Fleet archive using Vite, plain JavaScript/CSS and Three.js, hosted by a
Cloudflare Worker. [README.md](README.md) is the human overview.
Local preview: `https://zeppelin.dev.hexly.ai`; production: `https://zeppelin.hexly.ai`.

## Scope and sources

Maintain this root AGENTS.md as the only project handbook; do not create a
CLAUDE.md alias, import, copy or symlink. Root `package.json` and lockfile own
version/dependencies. `src/fleet.js`, the asset manifest and immutable receipts
own catalogue facts; [the asset contract](docs/assets.md) owns media policy.

Read the corresponding maintained skill before these operations:

| Operation | Skill |
| --- | --- |
| Add/finalize a vessel, update specifications/3D models, publish CDN assets | [zeppelin-vessel-release](.agents/skills/zeppelin-vessel-release/SKILL.md) |
| Generate and publish seven standard high-resolution Blender views | [zeppelin-standard-views](.agents/skills/zeppelin-standard-views/SKILL.md) |

New vessel work starts with the release skill, which references the standard-view
workflow. Scene-background export/CDN publication follows the asset contract.

## Project boundaries

- Blender sources live in Google Drive; export masters stay outside the checkout.
  Models and high-resolution images are published to `https://h.no.mt`.
- The website reads CDN models directly. Git contains only source, configuration,
  publication receipts and approved small thumbnails. GLB files belong in neither
  Git nor the site deployment bundle. Preserve immutable asset URLs and hashes.
- Keep Actions focused on critical smoke checks. Do not add a full interaction
  matrix for every vessel, view and resolution merely to normalize documentation.
- Preserve known/unknown catalogue facts; a planned vessel is not a completed
  model. Follow the release skill before changing stable identifiers or records.

## Setup and commands

Run from the repository root. The manifest pins npm 11.19.0; CI uses Node 26.12.1.
Use the machine-approved npm registry. The existing hook installer selects
`.githooks`; retain normal hooks when preparing a checkout.

```sh
npm ci
npm run hooks:install
npm run dev
npm run check
npm run build
npm run deploy:check
```

`check` validates catalogue/assets and runs Node tests. `build` validates then
builds Vite output. `deploy:check` is a packaging dry run.
No standalone TypeScript or lint command exists; do not substitute invented ones.

## Quality contract and evidence

Quality follows System1 v1.3.0 Native Mode (`nocoo/base-ci v2026.15`) in `.github/workflows/quality-slots.yml` and `.github/workflows/ci.yml`. Statuses are `enforced`, `planned`, `manual`, or justified `N/A`.

| Slot | Status | Evidence |
| --- | --- | --- |
| `S1` Types | N/A | Plain JS project without TypeScript |
| `S2` Lint | N/A | No separate lint script configured |
| `S3` Workflow | enforced | SHA-pinned workflow action check in CI |
| `G1` Secrets | enforced | `gitleaks` scan in CI |
| `G2` Dependencies | enforced | `osv-scanner` scan (`package-lock.json`) in CI |
| `B1` Build | enforced | `npm run build && npm run deploy:check` in CI |
| `L1` Unit | enforced | `npm run check` in CI (no coverage floor configured) |
| `L2` Runtime | N/A | Static site without server runtime |
| `L3` Integration | N/A | Static site without application API |
| `L4` E2E | N/A | Repository no longer actively maintained; browser E2E removed |
| `P1` Package | N/A | Deployed as Cloudflare Worker, not an npm package |
| `Z1` Gate | enforced | `quality / Z1: Gate` required status check on `main` |

Current pre-commit invokes `node scripts/guard-files.mjs --staged`; no tracked pre-push hook exists. Preserve the full immutable shared-workflow pins. Never bypass hooks, hide scanner failures or use autofix gates.

## Operations and completion

Successful main CI triggers automatic deployment. Asset publication, production
operations and releases require authorization for those operations. After an
authorized deployment, `npm run verify:production` checks the deployed revision;
this live probe is not routine documentation validation.

Check the full diff and actual link targets, stage explicit paths and make an
atomic commit. Report actual checks and unresolved gaps. Record incident
narratives in [Retrospective.md](Retrospective.md); keep recurring project rules
brief here and deterministic safeguards in tests/hooks. Preserve historical
changelog entries and immutable publication records.

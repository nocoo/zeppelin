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

Run from the repository root. The manifest pins npm 11.19.0; CI uses Node 26.8.1.
Use the machine-approved npm registry. The existing hook installer selects
`.githooks`; retain normal hooks when preparing a checkout.

```sh
npm ci
npm run hooks:install
npm run dev
npm run check
npm run build
npm test
npm run deploy:check
```

`check` validates catalogue/assets and runs Node tests. `build` validates then
builds Vite output. `npm test` first prepares checksummed real model caches and
runs desktop/mobile Playwright against a local Worker on port 27052; it requires
Chrome on macOS or Playwright Chromium in CI. Model preparation can download CDN
assets; it is not a production write. `deploy:check` is a packaging dry run.
No standalone TypeScript or lint command exists; do not substitute invented ones.

## Quality contract and evidence

6DQ retains its name; former G1 merged into unified L1 on 2026-09-21. Statuses
are `enforced`, `planned`, `manual`, or justified `N/A`; configured execution is
not proof of a successful current run.

| Dimension | Required contract and current state |
| --- | --- |
| L1 | Planned: UT and four coverage metrics each >=95%, strict check-only static analysis with zero errors/warnings, no skipped/focused tests, index-snapshot pre-commit and rejection. CI runs `npm run check`; no coverage floor or complete strict JS static gate exists. TypeScript-specific checks are N/A for plain JS. |
| L2 | Planned: real local HTTP over every owned endpoint/method and applicable asset contracts. Browser CI runs a local Worker, but complete method/assertion coverage is not established. No application database exists. |
| L3 | Enforced in configured CI: critical desktop/mobile Playwright journeys against built assets and a local Worker. Preserve the deliberately bounded smoke scope; live CDN/production acceptance needs separate evidence. |
| G2 | Enforced in configured shared CI: dependency/secret scans from pinned `base-ci/quality.yml` with `package-lock.json`. Local pre-push security/ref enforcement is planned; required scanners must fail when missing. |
| D1 | Planned: separate local processes/browser contexts and guarded per-run outputs, never daily-dev/production fixtures. Playwright uses port 27052 and refuses server reuse; complete cache/output/fixture isolation is unverified. SQLite markers are N/A because this application has no database. |
| Media | Enforced by the tracked pre-commit asset guard and CI validation: inspect staged object modes, sizes, types, approved thumbnails and hashes. This narrow guard is not complete L1. |

Current pre-commit invokes `node scripts/guard-files.mjs --staged`; no tracked
pre-push hook exists. CI explicitly disables separate typecheck/lint steps and
runs check, build/dry-run, security and browser lanes. Preserve the full immutable
shared-workflow pins. Target: unified L1 on the index snapshot under 30 seconds;
applicable L2/G2 on stdin push refs under three minutes. These broader local gates
remain planned. Never bypass hooks, hide scanner failures or use autofix gates.

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

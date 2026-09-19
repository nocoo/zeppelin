<p align="center">
  <img src="https://h.no.mt/logos/family/zeppelin/2026-09-19-01/01/rounded.png" width="128" height="128" alt="Zeppelin titanium spacecraft logo" />
</p>
<h1 align="center">Zeppelin</h1>
<p align="center">Next-generation spacecraft fleet and design archive.</p>
<p align="center">
  <a href="https://zeppelin.hexly.ai">Website</a> · <a href="../README.md">简体中文</a>
</p>

## What it does

An industrial science-fiction fleet catalogue with 17 mission-based series, 15 named models and separate entries for 10 series without a named model: 25 records in total. HW-01A, YS-01A and YS-02A offer on-demand 3D inspection; other records retain their planned status and unknown specifications.

## Features

The catalogue follows the fleet naming and organization document in Google Drive at `zeppelin/太空时代/太空舰队-型号舷号与编成规范.md`. A [Draft A snapshot](fleet-spec.md) preserves the source with only trailing whitespace removed. `src/fleet.js` records SHA-256 hashes for both the original and snapshot, and tests compare the series and models against that document. New models use generation A and four-digit mission-based hull numbers. Unspecified YT number ranges, BY-01A size and dimensions of unmodeled ships remain unknown; example hull numbers are not actual assignments.

| Catalogue model | Asset model / hull number | Available views |
| --- | --- | --- |
| HW-01A | HW-01 / 227 (historical); 3D / 2227 | 7 high-resolution images, 7 3D overview directions, 7 detail views |
| YS-01A | Final YS-01A / 5001 | 7 final images, 7 overview directions, 6 details including the crew-compartment cutaway |
| YS-02A | Final YS-02A / 5002 | 7 final images, 7 overview directions, 7 details including a two-deck cutaway and open tailgate |
| Other planned models / series | Unassigned | 7 explicit placeholder views; dimensions unknown |

The three completed models open in 3D, with standard images available as an alternative. HW retains its historical images; YS images reflect the finalized designs. The catalogue initially shows models with assets, with series filters and an option to show all records. In 3D, choose no scene or an asteroid belt. Without a scene, a three-dimensional grid rotates with the camera; standard images retain their original backgrounds. Overview views support rotation and zoom. Detail views preserve Blender geometry, paint and normal maps, with rotation at a fixed distance. Models load directly from `https://h.no.mt`; binaries are excluded from Git and the site deployment, and test caches stay in `.local/models/`.

Each detail page is a full-screen workspace without the global header, footer or page scrolling. Desktop layouts pair a large preview with a data sidebar for specifications, missions and archive details. Mobile layouts switch between vessel data and preview while preserving the selected view. Only the data area scrolls on short screens, keeping navigation and view controls accessible. Returning to the catalogue restores normal scrolling.

Assets link to immutable release records through `asset.model/number`. Renaming a catalogue record does not rewrite historical manifests, URLs or labels embedded in images. New assets require an explicit association and all seven standard views. Planned placeholders do not enter render manifests, request CDN assets or expose invalid downloads.

YS-01A and YS-02A are finalized designs; their dimensions and transport specifications come from final models and verification reports. Planned models keep dimensions unknown. The visual language draws on industrial signage, heavy engineering and science-fiction interfaces without copying third-party characters, logos or artwork.

## Usage

Open [Zeppelin](https://zeppelin.hexly.ai) and select a vessel. By default, only models with assets are shown. Filter by series or show all records to inspect planned designs.

Switch between standard images, 3D overviews and detail views. Drag to rotate; overview views also support zoom. On mobile, switch between vessel data and preview. 3D models load from the CDN on demand and require a network connection.

## Development

Use Node.js 26.8.1 from `.node-version` and npm 11.19.0.

```sh
npm ci
npm run dev
```

Vite listens on `127.0.0.1:7052`. With the local Caddy mapping configured, use [zeppelin.dev.hexly.ai](https://zeppelin.dev.hexly.ai). `dev` and `preview` cannot use this port simultaneously.

The development server supports `?assets=offline`, showing an explicit notice and loading checked-in thumbnails. Production builds always use verified CDN assets. Failed loads display an error and retry control rather than silently substituting thumbnails.

```sh
npm run build
npm run preview
```

A Cloudflare Worker hosts the static site and serves `/api/live`. See the [deployment guide](deployment.md) for deployment, health responses, production verification and the local Worker endpoint.

## Tests

```sh
npm run check
npm run build
npm test
npm run assets:verify
```

`check` validates catalogue data, assets and unit behavior. `npm test` first prepares a hash-verified cache of real models, then runs Playwright against the local Worker, covering HTTP endpoints, desktop/mobile interaction, views, filtering, unknown specifications, keyboard access, accessibility and asset failure/retry behavior. `assets:verify` separately checks remote CDN assets and requires network access.

On macOS, tests use the installed Google Chrome. On Linux/CI, first run `npx playwright install --with-deps chromium`. Browser tests exclusively use port `27052` and do not reuse the development server. Model caches stay in `.local/models/`.

## Stack

| Technology | Role |
| --- | --- |
| Vanilla JavaScript / CSS, Vite | Page interactions, styling and builds |
| Three.js | On-demand vessel and scene previews |
| Cloudflare Workers / Static Assets | Site hosting and health endpoint |
| R2 / CDN | Immutable models, high-resolution images and brand assets |
| Node.js, Playwright, axe-core | Data validation, unit, HTTP, browser and accessibility checks |
| Blender | Upstream vessel modeling and standard-view production |

## Documentation

- [Fleet specification snapshot](fleet-spec.md).
- [Vessel publication and finalization](../.agents/skills/zeppelin-vessel-release/SKILL.md) and [standard-view production](../.agents/skills/zeppelin-standard-views/SKILL.md).
- [Asset contract and Hexly integration](assets.md), [site manifest](../public/assets/manifest.json) and versioned release records in `docs/assets/`.
- [Deployment and local endpoints](deployment.md).
- [Brand sources and usage](brand.md), [brand asset receipt](../public/brand.json) and [Hexly archive](https://hexly.ai/projects/zeppelin).
- [Service status](https://status.hexly.ai).

Google Drive stores Blender source assets. Models, high-resolution views, fonts and brand masters live in external immutable storage. Git contains source, configuration, release records and approved small thumbnails; see the asset contract for details.

The README uses the rounded logo presentation; browser icons use the transparent foreground. The site body and vessel sidebar omit the project logo, while the homepage retains its text title and GitHub / Hexly links.

## License

The repository has no project-level LICENSE and grants no additional rights to vessel models or renders; those rights remain with their authors. The Barlow Condensed font comes from Fontsource under [SIL OFL 1.1](Barlow-OFL.txt).

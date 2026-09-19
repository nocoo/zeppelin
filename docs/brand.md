# Zeppelin identity

The owner requested a new 3D physical spacecraft identity and delegated acceptance for the 2026-09-19 onboarding. The former yellow Z favicon is retained in Git history and the Hexly comparison archive. It was not a generation reference.

The symbolic command vessel uses satin titanium armor, graphite joints, yellow bands and amber engine cores. It is not a new fleet model or an update to the documented ships. The site keeps its own #101110 / #edeee8 / #dddf45 palette.

[Immutable source receipt](../public/brand.json) records URLs, bytes and SHA-256. Primary artwork uses gpt-image-2.5-sunburst; the native 2048-square output, prompt, delegated decision and finishing pass 01 are retained in the [Hexly study](https://github.com/nocoo/hexly.ai/tree/main/artwork/logo-family/zeppelin/2026-09-19-01). Brand version 1.0.0 is independent of site version 1.0.1.

| Consumer | Asset |
| --- | --- |
| README | Rounded presentation |
| Homepage header | 128px transparent PNG, displayed at 40px desktop / 32px mobile |
| Browser | Transparent ICO with 16/24/32/48/64/128/256px entries |
| Social metadata | Hexly-authored 1200 × 630 presentation |
| Local canonical master | Ignored root logo.png, exact transparent 2048px master |

No extra tile, shadow or corner mask surrounds small marks. Full masters remain external under the existing repository material policy. To hydrate the canonical local files from the receipt:

```sh
node --input-type=module <<'JS'
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { createHash } from 'node:crypto';
const brand = JSON.parse(await readFile('public/brand.json', 'utf8'));
for (const asset of [brand.master, brand.presentation, brand.square]) {
  const response = await fetch(asset.url);
  if (!response.ok) throw new Error('HTTP ' + response.status);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (createHash('sha256').update(bytes).digest('hex') !== asset.sha256) throw new Error('Checksum mismatch');
  await mkdir(dirname(asset.localPath), { recursive: true });
  await writeFile(asset.localPath, bytes);
}
JS
```

The public website consumes the same pinned CDN bytes directly. No runtime secret, proxy, binary-in-Git exception or new storage is required.

The vessel inspector deliberately has no site header in the current source design. Its fullscreen layout is preserved; returning to the homepage restores the brand and family controls.

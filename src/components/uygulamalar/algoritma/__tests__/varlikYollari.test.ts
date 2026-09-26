import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// GitHub Pages proje sitesi '/geoeba' altında yayınlanır; public/ dosyalarına basePath kendiliğinden eklenmez.
// '/algoritma/…' gibi öneksiz bir yol yerelde çalışır ama yayında 404 verir (kapaklar 2026-09-26'da böyle kayboldu).
const KLASOR = join(__dirname, '..');

describe('varlık yolları', () => {
  it("public/ dosyaları NEXT_PUBLIC_ASSET_PREFIX önekiyle istenir", () => {
    const kaynaklar = readdirSync(KLASOR).filter((d) => /\.(ts|tsx)$/.test(d));
    expect(kaynaklar.length).toBeGreaterThan(10);
    const oneksiz: string[] = [];
    for (const d of kaynaklar) {
      readFileSync(join(KLASOR, d), 'utf8')
        .split('\n')
        .forEach((satir, i) => {
          if (/^\s*(\/\/|\*|\/\*)/.test(satir)) return;
          if (/[`'"]\/(algoritma|semantic|speech|sinif|adalar)\//.test(satir)) oneksiz.push(`${d}:${i + 1}: ${satir.trim()}`);
        });
    }
    expect(oneksiz).toEqual([]);
  });
});

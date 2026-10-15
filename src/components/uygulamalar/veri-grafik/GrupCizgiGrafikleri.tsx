'use client';

import React from 'react';
import { CizgiGrafigi, type CizgiGrafigiProps } from './CizgiGrafigi';
import { payliEksen } from './SutunGrafigi';
import { seriRengi, tamSayiliMi } from './grafik';
import { satirRengi } from './kategorik';
import { sayiOku } from './veri';
import type { GrupPaneli } from './grafikKurallari';

/** Grupların sıra ve değer ölçekleri aynıdır; seçim/düzenleme asıl veri satırına döner. */
export function GrupCizgiGrafikleri({ gruplar, ...p }: CizgiGrafigiProps & { gruplar: GrupPaneli[] }) {
  const sutunlar = p.sutunlar ?? [];
  const degerler = gruplar.flatMap((g) => g.satirlar.flatMap((i) =>
    sutunlar.map((s) => sayiOku(p.tablo.satirlar[i].hucreler[s])).filter((v): v is number => v !== null)));
  const eksen = payliEksen(Math.min(0, ...degerler), Math.max(1, ...degerler), 4, tamSayiliMi(degerler));
  const n = Math.max(1, ...gruplar.map((g) => g.satirlar.length));
  const h = Math.max(220, Math.floor(p.yukseklik / gruplar.length) - 32);
  return (
    <div className="h-full overflow-y-auto" data-cizgi-karsilastirma>
      {gruplar.map((g, gi) => {
        const renk = satirRengi(p.renkEslemi, g.satirlar[0]) ?? seriRengi(gi);
        const secili = p.seciliSatir === null ? -1 : g.satirlar.indexOf(p.seciliSatir);
        const tablo = { ...p.tablo, satirlar: g.satirlar.map((i) => p.tablo.satirlar[i]) };
        return (
          <section key={g.kategori} className="border-b border-border last:border-0" aria-label={g.kategori} data-cizgi-grubu={g.kategori}>
            <h3 className="flex h-8 items-center gap-2 px-4 text-sm font-bold">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: renk }} />{g.kategori}
            </h3>
            <CizgiGrafigi {...p} tablo={tablo} renkEslemi={null} seriRenk={renk} ortakEksen={eksen} enAzSatir={n}
              yukseklik={h} seciliSatir={secili < 0 ? null : secili}
              onSatirSec={(i) => p.onSatirSec(i === null ? null : g.satirlar[i])}
              onDegerDegis={(i, s, v, o) => p.onDegerDegis(g.satirlar[i], s, v, o)} />
          </section>
        );
      })}
    </div>
  );
}

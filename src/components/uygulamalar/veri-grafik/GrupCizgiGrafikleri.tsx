'use client';

import React, { useMemo } from 'react';
import { CizgiGrafigi, type CizgiGrafigiProps } from './CizgiGrafigi';
import { grupCizgiTablosu, type CizgiGrubu } from './ikiliGruplar';
import { satirEtiketi } from './veri';

/**
 * Karşılaştırmalı çizgi grafiği (alan uzmanı 7. tur): bütün grupların çizgileri TEK grafikte, ortak eksenlerde altlı
 * üstlü; her grup kendi renginde, lejantla. Ayrı paneller ve "önce birinci grup, sonra ikinci grup" sırası yoktur:
 * her grubun k. satırı yatay eksende aynı yerdedir (ikiliGruplar.ts: grupCizgiTablosu). Seçim ve sürükleme asıl veri
 * satırına döner.
 */
export function GrupCizgiGrafikleri({
  gruplar,
  grupSutun,
  yuzdeGoster,
  ...p
}: CizgiGrafigiProps & { gruplar: CizgiGrubu[]; grupSutun: number }) {
  const { tablo, sutunlar = [], renkEslemi, seciliSatir, onSatirSec, onDegerDegis } = p;
  const sutunAnahtari = sutunlar.join(',');
  const t = useMemo(
    () => grupCizgiTablosu(tablo, sutunlar, gruplar, grupSutun, renkEslemi),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tablo, sutunAnahtari, gruplar, grupSutun, renkEslemi],
  );
  /** Asıl satırın türetilmiş tablodaki yeri (sıra, seri) */
  const yeri = (satir: number | null): { k: number; j: number } | null => {
    if (satir === null) return null;
    for (let k = 0; k < t.karsilik.length; k++) {
      const j = t.karsilik[k].indexOf(satir);
      if (j >= 0) return { k, j };
    }
    return null;
  };
  const secili = yeri(seciliSatir);
  return (
    <div data-cizgi-karsilastirma={t.gruplar.length}>
      <CizgiGrafigi
        {...p}
        tablo={t.tablo}
        sutunlar={t.sutunlar}
        renkEslemi={null}
        seriRenkleri={t.renkler}
        kesikliSeriler={t.kesikli}
        seriGruplari={t.gruplar}
        eksenAdi={t.eksenAdi}
        yuzdeGoster={yuzdeGoster ? t.degiskenSirasi.map((d) => yuzdeGoster[d]) : undefined}
        seciliSatir={secili ? secili.k : null}
        onSatirSec={(k) => {
          if (k === null) return onSatirSec(null);
          // Aynı serinin satırı varsa o (seçim grupta kalır), yoksa o sıradaki ilk satır
          const satirlar = t.karsilik[k] ?? [];
          const satir = secili && satirlar[secili.j] >= 0 ? satirlar[secili.j] : satirlar.find((s) => s >= 0);
          onSatirSec(satir ?? null);
        }}
        onDegerDegis={(k, s, v, o) => {
          const j = t.sutunlar.indexOf(s);
          const satir = j < 0 ? -1 : t.karsilik[k]?.[j] ?? -1;
          if (satir >= 0) onDegerDegis(satir, t.asilSutunlar[j], v, o);
        }}
        noktaAdi={(k, j) => {
          const satir = t.karsilik[k]?.[j] ?? -1;
          return satir >= 0 ? satirEtiketi(tablo, satir) : t.tablo.satirlar[k]?.hucreler[0] ?? '';
        }}
      />
    </div>
  );
}

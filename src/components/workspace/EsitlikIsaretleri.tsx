'use client';

/**
 * Eşitlik çentikleri: tuval katmanı ve sağ tık menüsü maddeleri.
 * Hesap @/math/esitlikIsaretleri'nde (saf), ekran geometrisi ./esitlikCizimi'nde.
 */
import React from 'react';
import type { MathObject, PointObject, ViewportTransform } from '@/types/math';
import { worldToScreen } from '@/math/coordinates';
import type { ContextMenuItem } from './ContextMenu';
import { EsitlikSimgesi, EsitUzunluklarSimgesi } from './EsitlikSimgeleri';
import { centikKalinligi, centikKaydirmasi, centikYolu, type CentikEngelleri } from './esitlikCizimi';
import {
  esitlikGrupAnahtarlari, esitlikYamalari, etkinEsitlik, kenarAnahtari, parcaAnahtari, sonrakiEsitlikSayisi, yayAnahtari,
  type EsitlikIsareti, type EsitlikSonucu, type EsitlikTuru, type EsitlikYamasi,
} from '@/math/esitlikIsaretleri';

export type { EsitlikYamasi };

const EMPTY: readonly PointObject[] = [];

/**
 * Çentik katmanı. Geçiş (transition) ve sınıf YOK: kaydırırken yol `d` her karede yeniden hesaplanır, geride kalmaz.
 * Tıklamayı engellemez (pointerEvents none). Sade görünümde de çizilir (ölçü rozeti değil, geometrik gösterim).
 */
export function EsitlikIsaretleriKatmani({ isaretler, viewport, seciliIdler, cizgiOlcegi, noktalar, noktaYaricapi = 5 }: {
  isaretler: EsitlikIsareti[];
  viewport: ViewportTransform;
  seciliIdler: string[];
  cizgiOlcegi: number;
  /**
   * Görünür noktalar: öğenin ortasında duran nokta çentiği örtmesin diye çentik yana kaydırılır.
   * DİZİ olmalı, yineleyici (Map.values()) DEĞİL: React StrictMode aynı props ile render'ı iki kez çağırır;
   * tek kullanımlık bir yineleyici ikinci (ekrana giden) çağrıda boş gelir ve kaydırma hiç çalışmaz.
   */
  noktalar?: readonly PointObject[];
  noktaYaricapi?: number;
}) {
  if (!isaretler.length) return null;
  const kalinlik = centikKalinligi(cizgiOlcegi);
  const kok = worldToScreen({ x: 0, y: 0 }, viewport);
  const engeller: CentikEngelleri = {
    noktalar: [],
    eksenX: viewport.showAxes ? kok.x : undefined,
    eksenY: viewport.showAxes ? kok.y : undefined,
  };
  for (const p of noktalar ?? EMPTY) {
    if (p.visible === false) continue;
    const s = worldToScreen(p, viewport);
    engeller.noktalar.push({ x: s.x, y: s.y, r: (p.size || noktaYaricapi) + 1.5 });
  }
  return (
    <g data-esitlik-isaretleri={isaretler.length} pointerEvents="none" aria-hidden="true">
      {isaretler.map((m) => {
        const kaydirma = centikKaydirmasi(m, viewport, cizgiOlcegi, engeller);
        const d = centikYolu(m, viewport, cizgiOlcegi, kaydirma);
        if (!d) return null;
        return (
          <path
            key={m.anahtar}
            d={d}
            fill="none"
            stroke={seciliIdler.includes(m.sahipId) ? '#ec4899' : m.renk}
            strokeWidth={kalinlik}
            strokeLinecap="round"
            data-esitlik-isareti={m.anahtar}
            data-esitlik-sayisi={m.sayi}
            data-esitlik-turu={m.tur}
            data-esitlik-kaynagi={m.kaynak}
            data-esitlik-sahibi={m.sahipId}
            data-esitlik-kaydirma={kaydirma ? kaydirma : undefined}
          />
        );
      })}
    </g>
  );
}

/** Boş alan menüsü: "Eşit Uzunlukları İşaretle" aç/kapa maddesi. */
export function esitUzunluklarMaddesi(acik: boolean, degistir: () => void): ContextMenuItem {
  return { id: 'esit-uzunluklar', label: 'Eşit Uzunlukları İşaretle', icon: <EsitUzunluklarSimgesi />, checked: acik, onSelect: degistir };
}

const yayOlcumuMu = (o: MathObject) => o.type === 'measurement' && (o as { kind?: string }).kind === 'arc';

/** Nesnenin (ve çokgende tıklanan kenarın) eşitlik anahtarı; işaret alamayan türlerde null. */
export function esitlikHedefAnahtari(hedef: MathObject, kenarNo: number | null): string | null {
  if (hedef.type === 'segment') return parcaAnahtari(hedef.id);
  if (hedef.type === 'polygon') {
    return kenarNo !== null && Number.isInteger(kenarNo) && kenarNo >= 0 && kenarNo < hedef.pointIds.length ? kenarAnahtari(hedef.id, kenarNo) : null;
  }
  if (hedef.type === 'arc' || hedef.type === 'sector' || yayOlcumuMu(hedef)) return yayAnahtari(hedef.id);
  return null;
}

/**
 * Parça / tıklanan çokgen kenarı / yay / dilim menüsü: "Eşitlik işareti" alt menüsü (Otomatik, Tek/İki/Üç çizgi, İşaretsiz)
 * ve aynı türden iki ya da daha çok öğe seçiliyken "Eşit olarak işaretle" (hepsine aynı, boştaki sayı).
 */
export function esitlikMenuMaddeleri({ hedef, kenarNo, objects, seciliIdler, sonuc, uygula }: {
  hedef: MathObject;
  kenarNo: number | null;
  objects: readonly MathObject[];
  seciliIdler: string[];
  sonuc: EsitlikSonucu;
  uygula: (yamalar: EsitlikYamasi[], aciklama: string) => void;
}): ContextMenuItem[] {
  const anahtar = esitlikHedefAnahtari(hedef, kenarNo);
  if (!anahtar || !sonuc.temsilci.has(anahtar)) return [];
  const tur: EsitlikTuru = anahtar.startsWith('arc:') ? 'yay' : 'duz';
  const e = etkinEsitlik(sonuc, anahtar);
  // 1–4 seçilince hedefin OTOMATİK grubu birlikte işaretlenir (eşi çıplak kalmasın); 0 ve Otomatik yalnız hedefi değiştirir.
  const sec = (deger: number | undefined) => {
    const hedefler = deger ? esitlikGrupAnahtarlari(sonuc, anahtar) : [anahtar];
    uygula(esitlikYamalari(objects, sonuc, hedefler.map((a) => ({ anahtar: a, deger }))), 'Eşitlik işareti değiştirildi');
  };
  const secenek = (id: string, label: string, deger: number | undefined, icon: React.ReactNode): ContextMenuItem =>
    ({ id, label, icon, radio: true, checked: e.elle === deger, onSelect: () => sec(deger) });
  const maddeler: ContextMenuItem[] = [
    {
      id: 'esitlik-isareti',
      label: 'Eşitlik işareti',
      icon: <EsitlikSimgesi sayi={e.sayi ?? 0} />,
      separatorBefore: true,
      submenu: [
        secenek('esitlik-otomatik', 'Otomatik', undefined, <EsitUzunluklarSimgesi />),
        secenek('esitlik-tek', 'Tek çizgi', 1, <EsitlikSimgesi sayi={1} />),
        secenek('esitlik-iki', 'İki çizgi', 2, <EsitlikSimgesi sayi={2} />),
        secenek('esitlik-uc', 'Üç çizgi', 3, <EsitlikSimgesi sayi={3} />),
        secenek('esitlik-yok', 'İşaretsiz', 0, <EsitlikSimgesi sayi={0} />),
      ],
    },
  ];
  // Çoklu seçim: aynı türden seçili nesneler (çokgen kenarları tek tek seçilemez; yalnız sağ tıklanan kenar)
  const anahtarlar = [anahtar];
  for (const id of seciliIdler) {
    if (id === hedef.id) continue;
    const o = objects.find((x) => x.id === id);
    if (!o || o.visible === false) continue;
    const k = tur === 'duz'
      ? (o.type === 'segment' ? parcaAnahtari(o.id) : null)
      : (o.type === 'arc' || o.type === 'sector' || yayOlcumuMu(o) ? yayAnahtari(o.id) : null);
    if (k && sonuc.temsilci.has(k)) anahtarlar.push(k);
  }
  const temsilciler = new Set(anahtarlar.map((a) => sonuc.temsilci.get(a) ?? a));
  if (temsilciler.size >= 2) {
    const k = sonrakiEsitlikSayisi(sonuc, tur, anahtarlar);
    maddeler.push({
      id: 'esit-olarak-isaretle',
      label: 'Eşit olarak işaretle',
      icon: <EsitlikSimgesi sayi={k ?? 1} />,
      disabled: k === null,
      onSelect: () => {
        if (k === null) return;
        uygula(esitlikYamalari(objects, sonuc, anahtarlar.map((a) => ({ anahtar: a, deger: k }))), 'Eşit olarak işaretlendi');
      },
    });
  }
  return maddeler;
}

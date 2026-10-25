'use client';

import { useCallback, useEffect, useState } from 'react';
import type { MathObject } from '@/types/math';
import { NESNE_RENGI } from '@/utils/nesneRenkleri';
import type { Izler } from './katmanlar/noktalarVeIzler';

/*
 * İZ KAYDI (İzi Göster) ve yazılı komut / düğmeden gelen OYNATMA İSTEKLERİ. Tuvalin efektleri bu saf işlevleri çağırır;
 * davranış izKaydi.test.ts ile sabitlenmiştir.
 */

/** Nokta bundan fazla kaymadıkça izine yeni kayıt eklenmez (yerinde titreyen nokta izi şişirmesin) */
const IZ_ADIMI = 0.02;
/** İz son bu kadar kaydı ve yeni konumu tutar; daha eskileri düşer */
const IZ_UZUNLUGU = 600;

/**
 * Nesnelerin güncel durumuna göre izler. İzi kapatılan ("İzi Gizle") ya da silinen nesnenin izi kalkar (yoksa ekranda
 * silinemeyen kesikli çizgiler kalıyordu); gizlenen nesnenin izi durur ama uzamaz. İzi açık ve görünür her noktanın
 * yeni konumu izine eklenir. Hiçbir şey değişmediyse `onceki` aynen döner (gereksiz çizim olmasın).
 */
export function izleriGuncelle(onceki: Izler, nesneler: readonly MathObject[]): Izler {
  const izAcik = new Set(nesneler.filter((n) => n.showTrace).map((n) => n.id));
  let sonraki: Izler | null = null;
  const yaz = () => (sonraki ??= { ...onceki });
  for (const id of Object.keys(onceki)) {
    if (!izAcik.has(id)) delete yaz()[id];
  }
  for (const n of nesneler) {
    if (n.type !== 'point' || !n.showTrace || !n.visible) continue;
    const kayitlar = (sonraki ?? onceki)[n.id]?.points ?? [];
    const son = kayitlar[kayitlar.length - 1];
    if (son && !(Math.hypot(son.x - n.x, son.y - n.y) > IZ_ADIMI)) continue;
    yaz()[n.id] = { color: n.color || NESNE_RENGI.mavi, points: [...kayitlar.slice(-IZ_UZUNLUGU), { x: n.x, y: n.y }] };
  }
  return sonraki ?? onceki;
}

/** Tek bir izi siler (iz çizgisine sağ tık → "Bu izi sil"); iz yoksa `izler` aynen döner */
export function iziCikar(izler: Izler, id: string): Izler {
  if (!(id in izler)) return izler;
  const kalan = { ...izler };
  delete kalan[id];
  return kalan;
}

/**
 * İzi açık nesnelerin izlerini tutan kanca: nesneler her değiştiğinde izler güncellenir. Döner: izler, bütün izleri
 * silen ve tek izi silen işlevler.
 */
export function useIzKaydi(nesneler: readonly MathObject[]) {
  const [izler, setIzler] = useState<Izler>({});
  const izleriTemizle = useCallback(() => setIzler({}), []);
  const iziSil = useCallback((id: string) => setIzler((onceki) => iziCikar(onceki, id)), []);
  useEffect(() => {
    setIzler((onceki) => izleriGuncelle(onceki, nesneler));
  }, [nesneler]);
  return { izler, izleriTemizle, iziSil };
}

/**
 * Oynatma olayının ('geoeba:slider-playback' / 'geoeba:animation-playback') ayrıntısı: düz metinse kipin kendisidir,
 * nesneyse { mode, targetId } (kip yoksa 'toggle'). Hedef, nesnenin kimliği ya da adıdır.
 */
export function oynatmaIstegi(ayrinti: unknown): { kip: string; hedef?: string } {
  if (typeof ayrinti === 'string') return { kip: ayrinti, hedef: undefined };
  const a = ayrinti as { mode?: string; targetId?: string } | null | undefined;
  return { kip: a?.mode ?? 'toggle', hedef: typeof ayrinti === 'object' ? a?.targetId : undefined };
}

/** Sürgü oynatması değişmeli mi: 'toggle' her zaman; 'play' yalnız dururken, 'stop' yalnız oynarken */
export const surguOynatmasiDegisir = (kip: string, oynuyor: boolean) =>
  kip === 'toggle' || (kip === 'play' && !oynuyor) || (kip === 'stop' && oynuyor);

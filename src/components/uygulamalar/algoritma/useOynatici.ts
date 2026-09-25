'use client';

/**
 * İz oynatıcısı: yorumlayıcının izini sahnede ileri/geri oynatır. Konum −1 başlangıçtır; k,
 * izin k. adımından sonraki durumdur; k. adım canlandırılırken ("canlı") vurgu ve altyazı o adımı,
 * göstergeler (depo, sepet) bir önceki durumu gösterir. Oynatma bir "kuşak" jetonuyla kesilir
 * (duraklat, geri, başa, yeni iz): süren sahne animasyonu kesilir ve o anki durum animasyonsuz çizilir.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { DunyaDurumu } from './dunya';
import type { Iz } from './yorumlayici';
import type { SahneTutamaci } from './SahneAlani';

/** Hız: çarpan; ANINDA → animasyonsuz sona atla */
export const HIZLAR = [0.5, 1, 2, 4] as const;
export const ANINDA = 99;

export interface Oynatici {
  iz: Iz | null;
  konum: number;
  calisiyor: boolean;
  bitti: boolean;
  durum: DunyaDurumu | null;
  yukle: (iz: Iz | null) => void;
  oynat: () => void;
  duraklat: () => void;
  adim: () => void;
  geri: () => void;
  basa: () => void;
  sonaGit: () => void;
}

export function useOynatici(sahne: React.RefObject<SahneTutamaci | null>, hiz: number, onBitti?: (iz: Iz) => void): Oynatici {
  const [iz, setIz] = useState<Iz | null>(null);
  const [konum, setKonum] = useState(-1);
  const [calisiyor, setCalisiyor] = useState(false);
  /** Konumdaki adımın animasyonu sürüyor: vurgu/altyazı o adımı, göstergeler önceki durumu gösterir */
  const [canli, setCanli] = useState(false);
  const kusak = useRef(0);
  const izRef = useRef<Iz | null>(null);
  const konumRef = useRef(-1);
  const hizRef = useRef(hiz);
  hizRef.current = hiz;
  const onBittiRef = useRef(onBitti);
  onBittiRef.current = onBitti;

  const durumAt = (z: Iz, k: number) => (k < 0 ? z.baslangic : z.adimlar[Math.min(k, z.adimlar.length - 1)].durum);
  const ciz = useCallback((z: Iz, k: number) => {
    sahne.current?.goster(durumAt(z, k), k >= 0 ? z.adimlar[k]?.hata ?? null : null);
  }, [sahne]);
  const konumAyarla = (k: number) => {
    konumRef.current = k;
    setKonum(k);
  };

  const durdur = useCallback(() => {
    kusak.current += 1;
    sahne.current?.kes();
    setCalisiyor(false);
    setCanli(false);
  }, [sahne]);

  const yukle = useCallback(
    (yeni: Iz | null) => {
      durdur();
      izRef.current = yeni;
      setIz(yeni);
      konumAyarla(-1);
      if (yeni) ciz(yeni, -1);
    },
    [ciz, durdur]
  );

  const oynat = useCallback(() => {
    const z = izRef.current;
    if (!z || !z.adimlar.length) return;
    kusak.current += 1;
    const k0 = kusak.current;
    let k = konumRef.current >= z.adimlar.length - 1 ? -1 : konumRef.current;
    if (k === -1) ciz(z, -1);
    if (hizRef.current >= ANINDA) {
      konumAyarla(z.adimlar.length - 1);
      ciz(z, z.adimlar.length - 1);
      onBittiRef.current?.(z);
      return;
    }
    setCalisiyor(true);
    (async () => {
      while (k < z.adimlar.length - 1) {
        const sonraki = k + 1;
        konumAyarla(sonraki);
        setCanli(true);
        await sahne.current?.oynat(z.adimlar[sonraki], durumAt(z, k), hizRef.current);
        if (k0 !== kusak.current) return;
        setCanli(false);
        k = sonraki;
        if (hizRef.current >= ANINDA) {
          konumAyarla(z.adimlar.length - 1);
          ciz(z, z.adimlar.length - 1);
          break;
        }
      }
      if (k0 !== kusak.current) return;
      setCalisiyor(false);
      if (!z.sonuc.hata && z.sonuc.basarili) sahne.current?.mutlu();
      onBittiRef.current?.(z);
    })();
  }, [ciz, sahne]);

  const duraklat = useCallback(() => {
    const z = izRef.current;
    durdur();
    if (z) ciz(z, konumRef.current);
  }, [ciz, durdur]);

  const adim = useCallback(() => {
    const z = izRef.current;
    if (!z) return;
    durdur();
    const k = konumRef.current;
    if (k >= z.adimlar.length - 1) return;
    const k0 = kusak.current;
    ciz(z, k);
    setCalisiyor(true);
    konumAyarla(k + 1);
    setCanli(true);
    (async () => {
      await sahne.current?.oynat(z.adimlar[k + 1], durumAt(z, k), Math.max(1, hizRef.current >= ANINDA ? 4 : hizRef.current));
      if (k0 !== kusak.current) return;
      setCanli(false);
      setCalisiyor(false);
      if (k + 1 === z.adimlar.length - 1) onBittiRef.current?.(z);
    })();
  }, [ciz, durdur, sahne]);

  const geri = useCallback(() => {
    const z = izRef.current;
    if (!z) return;
    durdur();
    const k = Math.max(-1, konumRef.current - 1);
    konumAyarla(k);
    ciz(z, k);
  }, [ciz, durdur]);

  const basa = useCallback(() => {
    const z = izRef.current;
    durdur();
    konumAyarla(-1);
    if (z) ciz(z, -1);
  }, [ciz, durdur]);

  const sonaGit = useCallback(() => {
    const z = izRef.current;
    if (!z) return;
    durdur();
    konumAyarla(z.adimlar.length - 1);
    ciz(z, z.adimlar.length - 1);
  }, [ciz, durdur]);

  useEffect(() => () => {
    kusak.current += 1;
  }, []);

  const bitti = !!iz && !canli && konum >= iz.adimlar.length - 1 && iz.adimlar.length > 0;
  const durum = iz ? durumAt(iz, canli ? konum - 1 : konum) : null;
  return { iz, konum, calisiyor, bitti, durum, yukle, oynat, duraklat, adim, geri, basa, sonaGit };
}

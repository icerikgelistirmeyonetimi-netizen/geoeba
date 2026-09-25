'use client';

/**
 * Deney çalıştırıcısı (VT §10.2): `DeneyMotoru`nu React durumuna bağlar.
 * - Motor tek örnektir (ref); geri çağrılar ve ayar (hız, azaltılmış hareket, tablo satırı, sahne boyu) her çizimde
 *   ref'lere yazılır, motor her adımda günceli okur. Böylece çalışırken hız menüsü değişse de döngü sürer.
 * - Araştırma, nesne, kayıt kipi ya da nesne düzeni değişince motor sıfırlanır (dokunuş çalışması unutulur).
 * - Bileşen sökülünce iş yarıda kalmaz: sürmekte olan çalışma o ana kadarki atışlarla kaydedilir, akış kapanır.
 * - Görünür olmayan sekmede requestAnimationFrame durur; döngü sekme görünür olunca kaldığı yerden sürer.
 */
import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import type { Arastirma } from '../arastirma';
import { tekDeneyAtisi } from '../deney';
import type { ToplamaVerisi } from '../toplamaDurumu';
import { BOS_GORUNUM, DeneyMotoru, TARAYICI_ZAMANLAYICISI, type MotorGorunumu } from './deneyMotoru';

export interface DeneyCalistiriciSecenekleri {
  arastirma: Arastirma | null;
  tabloSatiri: number;
  azaltilmisHareket: boolean;
  onVeri: (v: ToplamaVerisi) => void;
  onYeniSatir: (kimlik: string | null) => void;
  onAkis: (akis: boolean) => void;
  onBildirim: (metin: string) => void;
  onOzeteGec: () => void;
  /** aria-live duyurusu (panelin toplayıcısı) */
  duyur: (metin: string) => void;
}

export interface DeneyCalistirici {
  gorunum: MotorGorunumu;
  calisiyor: boolean;
  /** "N kez at" (N planın atış sayısı) */
  kos: () => void;
  /** "Atış sayısı artınca ne olur?" */
  seri: () => void;
  /** sahneye dokunma: tek atış */
  tekAtis: () => void;
  durdur: () => void;
  /** çark ibresi durdu (`transitionend`) */
  donmeBitti: () => void;
  /** sahnedeki nesnenin boyu (px); sahne kartı çizerken yazar */
  sahneBoyuRef: MutableRefObject<number>;
}

export function useDeneyCalistirici(s: DeneyCalistiriciSecenekleri): DeneyCalistirici {
  const [gorunum, setGorunum] = useState<MotorGorunumu>(BOS_GORUNUM);
  const sRef = useRef(s);
  sRef.current = s;
  const sahneBoyuRef = useRef(160);
  const motorRef = useRef<DeneyMotoru | null>(null);
  if (motorRef.current === null) {
    motorRef.current = new DeneyMotoru(
      TARAYICI_ZAMANLAYICISI,
      {
        veri: (v) => sRef.current.onVeri(v),
        yeniSatir: (k) => sRef.current.onYeniSatir(k),
        akis: (a) => sRef.current.onAkis(a),
        bildirim: (m) => sRef.current.onBildirim(m),
        duyuru: (m) => sRef.current.duyur(m),
        ozeteGec: () => sRef.current.onOzeteGec(),
        gorunum: (g) => setGorunum(g),
      },
      () => ({
        hiz: sRef.current.arastirma?.deney.hiz ?? 'oto',
        azaltilmis: sRef.current.azaltilmisHareket,
        tabloSatiri: sRef.current.tabloSatiri,
        boyut: sahneBoyuRef.current,
      }),
    );
  }

  // Araştırma ya da nesne düzeni değişince sahne ve dokunuş çalışması sıfırlanır
  const a = s.arastirma;
  const duzen = a
    ? `${a.kimlik}|${a.yontem}|${a.deney.nesne}|${a.deney.kayit}|${a.deney.torba.geriAt}|${JSON.stringify(a.deney.torba.toplar)}|${JSON.stringify(a.deney.cark.dilimler)}`
    : '';
  const ilkRef = useRef(true);
  useEffect(() => {
    if (ilkRef.current) {
      ilkRef.current = false;
      return;
    }
    motorRef.current?.sifirla();
  }, [duzen]);

  // Söküldüğünde çalışma kaydı kapanır, zamanlayıcılar durur (StrictMode'daki sahte sökme boşta olduğu için etkisiz)
  useEffect(() => () => motorRef.current?.sok(), []);

  const kos = useCallback(() => {
    const ar = sRef.current.arastirma;
    if (ar) motorRef.current?.kos(ar, tekDeneyAtisi(ar.deney.atisSayisi));
  }, []);
  const seri = useCallback(() => {
    const ar = sRef.current.arastirma;
    if (ar) motorRef.current?.seri(ar);
  }, []);
  const tekAtis = useCallback(() => {
    const ar = sRef.current.arastirma;
    if (ar) motorRef.current?.tekAtis(ar);
  }, []);
  const durdur = useCallback(() => motorRef.current?.durdur(), []);
  const donmeBitti = useCallback(() => motorRef.current?.donmeBitti(), []);

  return { gorunum, calisiyor: gorunum.calisiyor, kos, seri, tekAtis, durdur, donmeBitti, sahneBoyuRef };
}

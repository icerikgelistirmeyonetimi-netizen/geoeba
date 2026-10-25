'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MathObject, PointObject, SliderObject } from '@/types/math';
import { advancePointOnHost, PointAnimUpdate } from '@/math/pathAnimation';
import { snapSliderValue } from '@/math/sliderBindings';

/** Bir kaydırıcının veya yol turunun taranması için geçen süre (saniye). */
const TUR_SANIYE = 8;

/**
 * İki kare arasındaki en büyük kabul edilen süre (ms).
 * Sekme arka plana alınıp geri gelindiğinde requestAnimationFrame arada onlarca saniyelik
 * bir boşluk bildirir; sınır olmasa tek karede uçtan uca sıçrardı.
 */
const MAX_KARE_MS = 50;

/** Değeri kaydırıcının adım ızgarasına oturtur; adım yoksa ya da ayarlar geçersizse değer olduğu gibi kalır. */
function adimaOturt(s: Pick<SliderObject, 'min' | 'max'> & Partial<SliderObject>, deger: number): number {
  if (!(s.step && s.step > 0)) return deger;
  try {
    return snapSliderValue(deger, s.min, s.max, s.step);
  } catch {
    return deger;
  }
}

/**
 * Tek bir animasyon karesinde kaydırıcı değerlerini ilerletir (SAF fonksiyon).
 * `dirs` yerinde güncellenir: uca gelen kaydırıcının yönü ters çevrilir.
 *
 * ADIM (kullanıcı, 25.10.2026: "animasyon akıcı olmalı ama sliderda değerler adıma göre olmalı"): `konumlar` verilirse
 * her kaydırıcının SÜREKLİ konumu orada tutulur ve akıcı ilerler; dönen değer o konumun adıma oturtulmuş hâlidir. Değer
 * her karede yeniden adıma yuvarlansaydı küçük kare artışları hep aynı değere geri yuvarlanır, canlandırma takılırdı.
 * Kaydırıcının değeri dışarıdan değiştiyse (elle sürükleme) sürekli konum yeniden değerden başlar.
 */
export function advanceSliders(
  sliders: (Pick<SliderObject, 'id' | 'min' | 'max' | 'value'> & Partial<SliderObject>)[],
  dirs: Record<string, 1 | -1>,
  dtSeconds: number,
  tourSeconds: number = TUR_SANIYE,
  konumlar?: Record<string, number>
): Record<string, number> {
  const next: Record<string, number> = {};
  for (const s of sliders) {
    const aralik = s.max - s.min;
    if (!(aralik > 0)) continue;
    const kayitli = konumlar?.[s.id];
    const baslangic = kayitli !== undefined && Math.abs(adimaOturt(s, kayitli) - s.value) <= (s.step ?? 0) / 2 + 1e-9 ? kayitli : s.value;

    const animSpeed = s.animSpeed ?? 1;
    const animMode = s.animMode ?? 'oscillating';

    let yon = dirs[s.id] ?? 1;
    if (animMode === 'increasing' || animMode === 'increasing_once') yon = 1;
    if (animMode === 'decreasing') yon = -1;

    let d = baslangic + (yon * aralik * dtSeconds * animSpeed) / tourSeconds;

    if (animMode === 'oscillating') {
      if (d >= s.max) {
        d = s.max;
        dirs[s.id] = -1;
      } else if (d <= s.min) {
        d = s.min;
        dirs[s.id] = 1;
      }
    } else if (animMode === 'increasing') {
      if (d >= s.max) d = s.min + (d - s.max) % aralik;
    } else if (animMode === 'decreasing') {
      if (d <= s.min) d = s.max - (s.min - d) % aralik;
    } else if (animMode === 'increasing_once') {
      if (d >= s.max) {
        d = s.max;
      }
    }

    if (konumlar) {
      konumlar[s.id] = d;
      next[s.id] = adimaOturt(s, d);
    } else {
      next[s.id] = d;
    }
  }
  return next;
}

/**
 * Tek bir animasyon karesinde yola bağlı noktaları ilerletir (SAF fonksiyon).
 */
export function advancePoints(
  points: PointObject[],
  allObjects: MathObject[],
  dirs: Record<string, 1 | -1>,
  dtSeconds: number,
  tourSeconds: number = TUR_SANIYE
): Record<string, PointAnimUpdate> {
  const next: Record<string, PointAnimUpdate> = {};
  const byId = new Map(allObjects.map(o => [o.id, o]));
  for (const pt of points) {
    if (!pt.onObjectId) continue;
    const host = byId.get(pt.onObjectId);
    if (!host) continue;
    const dir = dirs[pt.id] ?? 1;
    const upd = advancePointOnHost(pt, host, allObjects, dir, dtSeconds, tourSeconds);
    if (upd) {
      next[pt.id] = upd;
      if (upd.direction) {
        dirs[pt.id] = upd.direction;
      }
    }
  }
  return next;
}

interface Params {
  /** Sahnedeki kaydırıcılar */
  sliders: SliderObject[];
  /** Sahnedeki canlandırılan noktalar */
  animatingPoints?: PointObject[];
  /** Tüm nesneler (bağlı nesneleri çözümlemek için) */
  allObjects?: MathObject[];
  /** Her karede yeni değerleri yazar (geçmişe yazmaz). */
  onValues: (sliderValues: Record<string, number>, pointUpdates?: Record<string, PointAnimUpdate>) => void;
}

/**
 * Kaydırıcıları ve yola bağlı noktaları kendiliğinden ilerleten birleşik oynatma döngüsü.
 */
export function useSliderPlayback({ sliders, animatingPoints = [], allObjects = [], onValues }: Params) {
  const [isPlaying, setIsPlaying] = useState(false);
  /** Canlandırmada kaydırıcıların sürekli (adıma oturtulmamış) konumları: tutamak akıcı kaysın diye */
  const [canliKonumlar, setCanliKonumlar] = useState<Record<string, number>>({});
  const konumlarRef = useRef<Record<string, number>>({});

  const frameRef = useRef<number | null>(null);
  const prevTimeRef = useRef<number | null>(null);
  const dirsRef = useRef<Record<string, 1 | -1>>({});

  const slidersRef = useRef(sliders);
  slidersRef.current = sliders;
  const pointsRef = useRef(animatingPoints);
  pointsRef.current = animatingPoints;
  const allObjectsRef = useRef(allObjects);
  allObjectsRef.current = allObjects;
  const onValuesRef = useRef(onValues);
  onValuesRef.current = onValues;

  const stop = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    prevTimeRef.current = null;
    setIsPlaying(false);
  }, []);

  const play = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const toggle = useCallback(() => {
    setIsPlaying((p) => !p);
  }, []);

  // Sahnede canlandırılacak hiçbir şey kalmadıysa oynatmayı durdur
  const hasAnimatables = sliders.length > 0 || animatingPoints.length > 0;
  useEffect(() => {
    if (isPlaying && !hasAnimatables) stop();
  }, [isPlaying, hasAnimatables, stop]);

  // Canlandırılan nokta eklendiğinde veya açık bir nokta varsa otomatik başlatılabilir
  useEffect(() => {
    if (animatingPoints.length > 0 && !isPlaying) {
      setIsPlaying(true);
    }
  }, [animatingPoints.length, isPlaying]);

  useEffect(() => {
    if (!isPlaying) {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      prevTimeRef.current = null;
      return;
    }

    konumlarRef.current = {};
    const adim = (simdi: number) => {
      const onceki = prevTimeRef.current;
      prevTimeRef.current = simdi;

      if (onceki !== null) {
        const gecen = Math.min(MAX_KARE_MS, simdi - onceki) / 1000;
        const yeniSliders = advanceSliders(slidersRef.current, dirsRef.current, gecen, TUR_SANIYE, konumlarRef.current);
        setCanliKonumlar({ ...konumlarRef.current });
        const yeniPoints = advancePoints(pointsRef.current, allObjectsRef.current, dirsRef.current, gecen);

        const hasSliderUpdates = Object.keys(yeniSliders).length > 0;
        const hasPointUpdates = Object.keys(yeniPoints).length > 0;

        if (hasSliderUpdates || hasPointUpdates) {
          try {
            onValuesRef.current(yeniSliders, yeniPoints);
          } catch {
            stop();
            return;
          }
        }
      }

      frameRef.current = requestAnimationFrame(adim);
    };

    frameRef.current = requestAnimationFrame(adim);
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      prevTimeRef.current = null;
    };
  }, [isPlaying, stop]);

  useEffect(() => () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
  }, []);

  return { isPlaying, toggle, play, stop, canliKonumlar };
}

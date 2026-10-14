'use client';

/**
 * İLKOKUL «Simetri Keşfet» sınama aracının durumu, tuval katmanı ve üst çubuğu (alan uzmanı Umut IŞIK, geoeba (3).xlsx
 * [178]). Öğrenci şekle dokunur, aday doğrunun iki ucunu işaretler, «Katla» ile şeklin bir yarısı doğru üzerinden
 * katlanır: örtüşürse doğru bir simetri doğrusudur (kalıcı kesikli çizgi olarak eklenir ve sayılır), örtüşmezse
 * örtüşmeyen bölge renklenir. «Hepsini göster» şeklin bütün simetri doğrularını çizer ve sayısını söyler. Geometri:
 * simetriSinama.ts. «Yansıt» ilkokulda simetrik TAMAMLAMA olarak kalır (Canvas.ilkokulSimetrisiniCiz). Ortaokul ve
 * lisede Simetri Keşfet değişmedi (Canvas bu kancayı yalnız ilkokulda etkin verir).
 *
 * Canvas'ın kendisi yalnız üç yere bağlanır: dokunuşları `tiklama`ya iletir, `SimetriSinamaKatmani`nı SVG'nin sonuna,
 * `SimetriSinamaCubugu`nu üst çubuk yerine koyar.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FlipHorizontal2 } from 'lucide-react';
import type { MathObject, Point2D, PointObject, PolygonObject, SegmentObject, ViewportTransform } from '@/types/math';
import { worldToScreen } from '@/math/coordinates';
import { generateNextPointLabels } from '@/math/geometry';
import { CubukAyirici, CubukDugmesi, CubukMetni, KayanCubuk } from './KayanCubuk';
import {
  adayNoktasi, adayiSina, ayniDogruMu, icindeMi, katlamaYarilari, katlanmisNokta, sekilUzerindeParca, simetriDogrulari,
  sekilUzerindekiSimetriDogrusuMu, simetriSayisiMetni, sinamaBildirimi, type Dogru, type SinamaSonucu,
} from './simetriSinama';

/** Bulunan / gösterilen simetri doğrusunun adı (Yansıt'ın çizdiği simetri doğrusuyla aynı) */
export const SIMETRI_DOGRUSU_ADI = 'Simetri doğrusu';
const MOR = '#9333ea';
/** Aday uç yakalama eşiği (ekran pikseli) */
const YAKALAMA_PX = 16;
/** Katlama canlandırmasının süresi (ms) */
const KATLAMA_SURESI = 900;

export interface SimetriSinamaDurumu {
  sekilId: string;
  /** Aday doğrunun işaretlenen uçları (0–2) */
  uclar: Point2D[];
  /** Katlama ilerlemesi 0–1; null: katlanmadı */
  katlama: number | null;
  sonuc: SinamaSonucu | null;
  /** Çubukta gösterilen bildirim (sonuç, "Bu şeklin 4 simetri doğrusu var."); ipucu kapsülü çubuğun üstüne biniyordu */
  mesaj: string | null;
}

export interface SimetriSinamaGirdisi {
  /** Araç etkin mi (ilkokul + Simetri Keşfet) */
  etkin: boolean;
  objects: readonly MathObject[];
  pointsById: ReadonlyMap<string, PointObject>;
  /** Görünümün ölçeği (px / br): yakalama eşiği için */
  zoom: number;
  addObjects: (nesneler: MathObject[], aciklama: string) => void;
  /** Tuvalin nokta üreticisi (Canvas.makePoint) */
  yeniNokta: (ad: string, x: number, y: number, renk: string) => PointObject;
  /** Var olan nokta adları (yeni gizli uç noktaları için) */
  noktaAdlari: () => string[];
  kimlik: (onEk: string) => string;
  /** Seçilen şekli tuvalde seçili gösterir */
  sec: (id: string) => void;
}

export interface SimetriSinama {
  etkin: boolean;
  durum: SimetriSinamaDurumu | null;
  koseler: Point2D[] | null;
  /** Şeklin üzerinde çizili simetri doğruları (Hepsini göster'in ekledikleri dahil) */
  bulunanlar: Dogru[];
  /** Öğrencinin Katla ile kendi bulduğu simetri doğrusu sayısı (çubuktaki "Bulunan"; Hepsini göster'inkiler sayılmaz) */
  ogrenciBulunan: number;
  esik: number;
  animasyonda: boolean;
  /** Dokunuş: şekli seçer ya da aday doğrunun bir ucunu koyar. `obj`: dokunulan nesne (yoksa boş tuval / etiket). */
  tiklama: (world: Point2D, obj?: MathObject) => void;
  katla: () => void;
  yeniDogru: () => void;
  hepsiniGoster: () => void;
}

export function useSimetriSinama(g: SimetriSinamaGirdisi): SimetriSinama {
  const { etkin, objects, pointsById } = g;
  const [durum, setDurum] = useState<SimetriSinamaDurumu | null>(null);
  const animRef = useRef<number | null>(null);
  const durdur = () => {
    if (animRef.current !== null) cancelAnimationFrame(animRef.current);
    animRef.current = null;
  };
  useEffect(() => {
    if (!etkin) {
      durdur();
      setDurum(null);
    }
  }, [etkin]);
  useEffect(() => () => durdur(), []);

  const sekil = durum ? (objects.find((o) => o.id === durum.sekilId && o.type === 'polygon') as PolygonObject | undefined) : undefined;
  const koseler = useMemo(() => {
    if (!sekil) return null;
    const k = sekil.pointIds.map((id) => pointsById.get(id)).filter(Boolean) as PointObject[];
    return k.length >= 3 ? k.map((p) => ({ x: p.x, y: p.y })) : null;
  }, [sekil, pointsById]);
  /** «Hepsini göster»in eklediği simetri doğrularının kimlikleri: öğrencinin "Bulunan" sayısına katılmaz */
  const gosterilenlerRef = useRef<Set<string>>(new Set());
  /**
   * Şeklin üzerinde zaten çizili (bulunmuş) simetri doğruları: "Simetri doğrusu" adlı parçalardan BU şeklin üzerinden
   * geçenler (yan yana şekillerin aynı doğrultudaki doğruları karışmaz; sekilUzerindekiSimetriDogrusuMu).
   */
  const { bulunanlar, ogrenciBulunan } = useMemo(() => {
    if (!koseler) return { bulunanlar: [] as Dogru[], ogrenciBulunan: 0 };
    const out: Dogru[] = [];
    let ogrenci = 0;
    for (const o of objects) {
      if (o.type !== 'segment' || o.label !== SIMETRI_DOGRUSU_ADI || o.visible === false) continue;
      const a = pointsById.get((o as SegmentObject).startPointId);
      const b = pointsById.get((o as SegmentObject).endPointId);
      if (!a || !b) continue;
      const d = { a: { x: a.x, y: a.y }, b: { x: b.x, y: b.y } };
      if (!sekilUzerindekiSimetriDogrusuMu(koseler, d) || out.some((x) => ayniDogruMu(x, d))) continue;
      out.push(d);
      if (!gosterilenlerRef.current.has(o.id)) ogrenci++;
    }
    return { bulunanlar: out, ogrenciBulunan: ogrenci };
  }, [objects, pointsById, koseler]);
  const esik = YAKALAMA_PX / (g.zoom || 1);

  /** Bulunan / gösterilen simetri doğrularını kalıcı kesikli çizgi olarak ekler (uçları gizli, adsız); parça kimliklerini döndürür. */
  const dogrulariEkle = (dogrular: readonly Dogru[], k: readonly Point2D[], aciklama: string): string[] => {
    if (dogrular.length === 0) return [];
    const kullanilan = g.noktaAdlari();
    const yeni: MathObject[] = [];
    const kimlikler: string[] = [];
    const yuvarla = (v: number) => Number(v.toFixed(2));
    for (const d of dogrular) {
      const parca = sekilUzerindeParca(k, d, 0.8);
      const [la, lb] = generateNextPointLabels(kullanilan, 2);
      kullanilan.push(la, lb);
      const uc1: PointObject = { ...g.yeniNokta(la, yuvarla(parca.a.x), yuvarla(parca.a.y), MOR), showLabel: false, visible: false };
      const uc2: PointObject = { ...g.yeniNokta(lb, yuvarla(parca.b.x), yuvarla(parca.b.y), MOR), showLabel: false, visible: false };
      const dogruNesnesi: SegmentObject = {
        id: g.kimlik('seg'),
        type: 'segment',
        label: SIMETRI_DOGRUSU_ADI,
        showLabel: false,
        startPointId: uc1.id,
        endPointId: uc2.id,
        color: MOR,
        style: 'dashed',
        thickness: 2,
        visible: true,
        createdAt: Date.now(),
      };
      yeni.push(uc1, uc2, dogruNesnesi);
      kimlikler.push(dogruNesnesi.id);
    }
    g.addObjects(yeni, aciklama);
    return kimlikler;
  };

  const tiklama = (world: Point2D, obj?: MathObject) => {
    if (animRef.current !== null) return;
    // Dokunulan şekil: çokgenin kendisi ya da üstündeki nesnenin (bulunmuş simetri doğrusu, köşe) altındaki çokgen
    const altindaki = () => {
      const kapsayan = objects.filter((o): o is PolygonObject => {
        if (o.type !== 'polygon' || o.visible === false) return false;
        const k = (o as PolygonObject).pointIds.map((id) => pointsById.get(id)).filter(Boolean) as PointObject[];
        return k.length >= 3 && icindeMi(world, k);
      });
      return kapsayan.find((o) => o.id === durum?.sekilId) ?? kapsayan[kapsayan.length - 1];
    };
    const dokunulan = obj?.type === 'polygon' ? (obj as PolygonObject) : obj ? altindaki() : undefined;
    // Şekil seçimi: henüz şekil yokken ya da başka şekle dokunulunca (aday doğrunun ikinci ucu beklenmiyorsa)
    if (!durum || !koseler || (dokunulan && dokunulan.id !== durum.sekilId && durum.uclar.length !== 1)) {
      if (!dokunulan) return; // çubuk "Simetri doğrusunu aradığın şekle dokun" der
      setDurum({ sekilId: dokunulan.id, uclar: [], katlama: null, sonuc: null, mesaj: null });
      g.sec(dokunulan.id);
      return;
    }
    const p = adayNoktasi(world, koseler, esik);
    if (durum.uclar.length === 1) {
      const ilk = durum.uclar[0];
      if (Math.hypot(p.x - ilk.x, p.y - ilk.y) < 1e-6) return;
      setDurum({ ...durum, uclar: [ilk, p], katlama: null, sonuc: null, mesaj: null });
      return;
    }
    setDurum({ ...durum, uclar: [p], katlama: null, sonuc: null, mesaj: null });
  };

  const katla = () => {
    if (!durum || durum.uclar.length !== 2 || !koseler || animRef.current !== null) return;
    const k = koseler;
    const d: Dogru = { a: durum.uclar[0], b: durum.uclar[1] };
    const sonuc = adayiSina(k, d);
    const bitir = () => {
      animRef.current = null;
      setDurum((o) => (o ? { ...o, katlama: 1, sonuc, mesaj: sinamaBildirimi(sonuc) } : o));
      if (sonuc === 'dogru' && !bulunanlar.some((b) => ayniDogruMu(b, d))) {
        dogrulariEkle([d], k, `${sekil?.label || 'Şekil'}: simetri doğrusu bulundu`);
      }
    };
    if (sonuc === 'disinda') {
      setDurum({ ...durum, katlama: null, sonuc, mesaj: sinamaBildirimi(sonuc) });
      return;
    }
    const azHareket = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (azHareket || typeof requestAnimationFrame === 'undefined') {
      bitir();
      return;
    }
    const t0 = performance.now();
    const adim = (t: number) => {
      const f = Math.min(1, (t - t0) / KATLAMA_SURESI);
      if (f < 1) {
        setDurum((o) => (o ? { ...o, katlama: f, sonuc: null, mesaj: null } : o));
        animRef.current = requestAnimationFrame(adim);
      } else bitir();
    };
    setDurum({ ...durum, katlama: 0, sonuc: null, mesaj: null });
    animRef.current = requestAnimationFrame(adim);
  };

  const yeniDogru = () => {
    if (durum) setDurum({ ...durum, uclar: [], katlama: null, sonuc: null, mesaj: null });
  };

  const hepsiniGoster = () => {
    if (!durum || !koseler) return;
    const hepsi = simetriDogrulari(koseler);
    const eksik = hepsi.filter((d) => !bulunanlar.some((b) => ayniDogruMu(b, d)));
    // Gösterilenler öğrencinin bulduklarına sayılmaz (ikinci basışta "Sen 4 tanesini bulmuştun" demesin)
    for (const id of dogrulariEkle(eksik, koseler, `${sekil?.label || 'Şekil'}: bütün simetri doğruları gösterildi (${hepsi.length})`)) {
      gosterilenlerRef.current.add(id);
    }
    const bulunan = ogrenciBulunan;
    setDurum({
      ...durum,
      uclar: [], katlama: null, sonuc: null,
      mesaj: `${simetriSayisiMetni(hepsi.length)}${hepsi.length > 0 && bulunan > 0 ? ` Sen ${bulunan} tanesini bulmuştun.` : ''}`,
    });
  };

  const animasyonda = durum?.katlama !== null && durum?.katlama !== undefined && durum.katlama < 1;
  return { etkin, durum, koseler, bulunanlar, ogrenciBulunan, esik, animasyonda, tiklama, katla, yeniDogru, hepsiniGoster };
}

/** Tuval katmanı: seçili şekil, aday doğru (önizleme dahil), katlanan yarı, örtüşme / örtüşmeyen bölge. */
export function SimetriSinamaKatmani({ sinama, viewport, imlec }: { sinama: SimetriSinama; viewport: ViewportTransform; imlec: Point2D }) {
  const { durum, koseler } = sinama;
  if (!sinama.etkin || !durum || !koseler) return null;
  const { uclar, katlama, sonuc } = durum;
  const ekran = (p: Point2D) => worldToScreen(p, viewport);
  const noktalar = (k: readonly Point2D[]) => k.map((p) => { const q = ekran(p); return `${q.x},${q.y}`; }).join(' ');
  const yol = (k: readonly Point2D[]) => (k.length ? `M ${k.map((p) => { const q = ekran(p); return `${q.x} ${q.y}`; }).join(' L ')} Z` : '');
  const ogeler: React.ReactNode[] = [];
  ogeler.push(<polygon key="sekil" points={noktalar(koseler)} fill="none" stroke={MOR} strokeWidth={1.5} strokeDasharray="2 3" />);
  if (uclar.length === 1) {
    const m = adayNoktasi(imlec, koseler, sinama.esik);
    const a = ekran(uclar[0]);
    const b = ekran(m);
    ogeler.push(<line key="onizleme" x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={MOR} strokeWidth={2} strokeDasharray="6 4" opacity={0.7} />);
    ogeler.push(<circle key="imlec" cx={b.x} cy={b.y} r={5} fill="#ffffff" stroke={MOR} strokeWidth={2} />);
  }
  if (uclar.length === 2) {
    const d: Dogru = { a: uclar[0], b: uclar[1] };
    if (katlama !== null && sonuc !== 'disinda') {
      const { katlanan, sabit } = katlamaYarilari(koseler, d);
      const katli = katlanan.map((p) => katlanmisNokta(p, d, katlama));
      const bitti = katlama >= 1;
      // Katlanan yarının ilk yeri: kesikli iz
      ogeler.push(<polygon key="iz" points={noktalar(katlanan)} fill="none" stroke="#64748b" strokeWidth={1.2} strokeDasharray="4 3" />);
      if (bitti && sonuc === 'yanlis') {
        // Örtüşmeyen bölge: katlanan yarı ile öbür yarının yalnız birinin örttüğü yerler (çift-tek dolgu)
        ogeler.push(<path key="ortusmeyen" d={`${yol(katli)} ${yol(sabit)}`} fillRule="evenodd" fill="#f97316" fillOpacity={0.55} stroke="#ea580c" strokeWidth={1.5} data-ortusmeyen-bolge />);
      }
      ogeler.push(
        <polygon
          key="katli"
          points={noktalar(katli)}
          fill={bitti && sonuc === 'dogru' ? '#16a34a' : '#a855f7'}
          fillOpacity={bitti && sonuc === 'yanlis' ? 0.12 : 0.4}
          stroke={bitti && sonuc === 'dogru' ? '#15803d' : '#7e22ce'}
          strokeWidth={2}
          data-katlanan-yari
        />
      );
    }
    const parca = sekilUzerindeParca(koseler, d, 0.8);
    const a = ekran(parca.a);
    const b = ekran(parca.b);
    const renk = sonuc === 'dogru' ? '#15803d' : sonuc === 'yanlis' || sonuc === 'disinda' ? '#ea580c' : MOR;
    ogeler.push(<line key="aday" x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={renk} strokeWidth={2.5} strokeDasharray="8 5" data-aday-dogru />);
  }
  uclar.forEach((p, i) => {
    const q = ekran(p);
    ogeler.push(<circle key={`uc-${i}`} cx={q.x} cy={q.y} r={6} fill={MOR} stroke="#ffffff" strokeWidth={2} />);
  });
  return <g className="pointer-events-none select-none" data-simetri-sinama-katmani>{ogeler}</g>;
}

/** Üst çubuk: adım yönergesi ya da sonuç; Katla, Yeni doğru, bulunan simetri doğrusu sayısı, Hepsini göster. */
export function SimetriSinamaCubugu({ sinama }: { sinama: SimetriSinama }) {
  const { durum, animasyonda } = sinama;
  const metin = !durum
    ? 'Simetri doğrusunu aradığın şekle dokun'
    : durum.mesaj
      ? durum.mesaj
      : durum.uclar.length === 0
        ? 'Aday simetri doğrusunun iki ucuna dokun'
        : durum.uclar.length === 1
          ? 'Doğrunun öbür ucuna dokun'
          : animasyonda
            ? 'Katlanıyor…'
            : '«Katla»ya bas: İki yarı örtüşecek mi?';
  const pasif = 'disabled:opacity-40 disabled:cursor-not-allowed';
  return (
    <KayanCubuk konum="ust" data-simetri-sinama role="status" aria-live="polite">
      {/* Uzun dönüt kendi içinde satır kırar: düğmeler ikinci satıra düşüp çubuk şeklin üstüne inmesin (denetim, 4. tur [178]) */}
      <div className="min-w-0 max-w-[28rem]" data-simetri-sinama-metni>
        <CubukMetni vurgu="lavanta" simge={<FlipHorizontal2 className="w-4 h-4" />} baslik="Simetri Keşfet" aciklama={metin} />
      </div>
      {durum && (
        <>
          <CubukAyirici />
          <CubukDugmesi tur="birincil" className={pasif} disabled={durum.uclar.length !== 2 || animasyonda} onClick={sinama.katla} data-katla>
            Katla
          </CubukDugmesi>
          <CubukDugmesi className={pasif} disabled={durum.uclar.length === 0 || animasyonda} onClick={sinama.yeniDogru}>
            Yeni doğru
          </CubukDugmesi>
          <CubukAyirici />
          <span className="px-2 text-[13px] font-semibold text-foreground" data-bulunan-simetri={sinama.ogrenciBulunan}>
            Bulunan: {sinama.ogrenciBulunan}
          </span>
          <CubukDugmesi className={pasif} disabled={animasyonda} onClick={sinama.hepsiniGoster} data-hepsini-goster>
            Hepsini göster
          </CubukDugmesi>
        </>
      )}
    </KayanCubuk>
  );
}

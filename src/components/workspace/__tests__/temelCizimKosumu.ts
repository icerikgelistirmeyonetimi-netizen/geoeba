/**
 * Temel çizim araçlarının karakterizasyon testleri için ortak kurulum: gerçek WorkspaceProvider (ve istenirse Canvas,
 * Düzgün Çokgen diyaloğu) kancaKosumu ile DOM'suz çizilir; işleyiciler kullanıcı gibi çağrılır.
 *
 * Bu modülü içe aktaran test dosyası 'react'i kancaKosumu ile, CurriculumContext'i ve ThemeContext'i sahte değerlerle
 * değiştirmelidir (vi.mock dosya başına çalışır; bkz. temelCizimTiklama.test.ts).
 */
import { WorkspaceProvider, useWorkspace } from '@/state/WorkspaceContext';
import { Canvas } from '../Canvas';
import { RegularPolygonDialog } from '../RegularPolygonDialog';
import { SliderSettingsDialog } from '../SliderSettingsDialog';
import { SliderDialog } from '../SliderDialog';
import { worldToScreen } from '@/math/coordinates';
import type { MathObject, Point2D } from '@/types/math';
import { baglamDegerleri, bilesen, durula, ogeBul, type AgacOgesi, type Bilesen } from './kancaKosumu';

export type Calisma = ReturnType<typeof useWorkspace>;

/** Sahte zamanlayıcıların saati: createdAt değerleri bu ana göre "T+n" yazılır. */
export const SABIT_AN = new Date('2026-10-24T12:00:00Z').getTime();

/**
 * Nesne kimliklerini (pt-…-…) görüldükleri sırayla "pt#1", "seg#1" gibi adlara çevirir; aynı test boyunca aynı
 * kimlik aynı adı alır. createdAt, SABIT_AN'a göre "T+n" yazılır.
 */
export function kimlikAdlandirici() {
  const adlar = new Map<string, string>();
  const sayac = new Map<string, number>();
  const ad = (kimlik: string): string => {
    let sonuc = adlar.get(kimlik);
    if (!sonuc) {
      const onek = kimlik.split('-')[0];
      const n = (sayac.get(onek) ?? 0) + 1;
      sayac.set(onek, n);
      sonuc = `${onek}#${n}`;
      adlar.set(kimlik, sonuc);
    }
    return sonuc;
  };
  const kimlikMi = (deger: unknown): deger is string => typeof deger === 'string' && /^[a-z]+-[0-9a-z]+-[0-9a-z]+-[0-9a-z]*$/.test(deger);
  const cevir = (deger: unknown, anahtar?: string): unknown => {
    if (kimlikMi(deger)) return ad(deger);
    if (anahtar === 'createdAt' && typeof deger === 'number') return `T+${deger - SABIT_AN}`;
    if (Array.isArray(deger)) return deger.map((x) => cevir(x));
    if (deger && typeof deger === 'object') {
      return Object.fromEntries(Object.entries(deger).map(([k, v]) => [k, cevir(v, k)]));
    }
    return deger;
  };
  return {
    ad,
    /** Nesneleri anahtar sırası korunarak JSON'a çevirir (anlık görüntü için) */
    belge: (nesneler: readonly MathObject[]): string => JSON.stringify(nesneler.map((o) => cevir(o)), null, 1),
    kimlikler: (kimlikler: readonly string[]): string[] => kimlikler.map(ad),
  };
}

interface Kurulum {
  readonly d: Calisma;
  /** İşleyiciyi çağırır, sonra bütün bileşenleri durulana kadar yeniden çizer */
  yap(eylem: (d: Calisma) => void): void;
  /** Geçmiş açıklamaları ve konum */
  gecmis(): { adimlar: string[]; konum: number };
}

function saglayiciKur(ekBilesenler: () => Bilesen<unknown, unknown>[] = () => []): Kurulum & { kaydet: () => void } {
  // Her sağlayıcı boş çalışma alanıyla başlar: önceki sağlayıcının localStorage'a yazdığı çalışma yüklenmesin
  (globalThis as { localStorage?: { clear(): void } }).localStorage?.clear();
  const saglayici = bilesen('saglayici', WorkspaceProvider, { children: null });
  let deger: Calisma | undefined;
  const kaydet = () => {
    const oge = saglayici.sonuc as unknown as { type: { _context: unknown }; props: { value: Calisma } };
    deger = oge.props.value;
    baglamDegerleri.set(oge.type._context, deger);
  };
  durula([saglayici], kaydet);
  const tumu = () => [saglayici as Bilesen<unknown, unknown>, ...ekBilesenler()];
  return {
    kaydet,
    get d() {
      if (!deger) throw new Error('Sağlayıcı çizilmedi.');
      return deger;
    },
    yap(eylem) {
      if (!deger) throw new Error('Sağlayıcı çizilmedi.');
      eylem(deger);
      durula(tumu(), kaydet);
    },
    gecmis() {
      if (!deger) throw new Error('Sağlayıcı çizilmedi.');
      return { adimlar: deger.history.map((h) => h.description), konum: deger.historyIndex };
    },
  };
}

/** Yalnız WorkspaceProvider (tıklama akışları, geri al / yinele) */
export function calismaKur(): Kurulum {
  return saglayiciKur();
}

/**
 * WorkspaceProvider + Kaydırıcı Ayarları penceresi. Sahne önce kurulur, pencere sonra açılır (kullanıcının ayarları
 * açtığı an): pencere ilk çiziminde formu kaydırıcının o anki durumundan doldurur.
 */
export function kaydiriciAyarlariKur(nesneler: MathObject[], sliderId: string) {
  let diyalog: Bilesen<unknown, unknown> | null = null;
  const k = saglayiciKur(() => (diyalog ? [diyalog] : []));
  k.yap((d) => d.addObjects(nesneler, 'hazır'));
  diyalog = bilesen('kaydiriciAyarlari', SliderSettingsDialog, { sliderId, onClose: () => {} }) as Bilesen<unknown, unknown>;
  durula([diyalog], k.kaydet);
  return {
    ...k,
    get d() {
      return k.d;
    },
    /** Penceredeki öğe (alt bileşenler çizilmez; yalnız çocuk öğelere bakılır) */
    oge: (kosul: (o: AgacOgesi) => boolean) => ogeBul(diyalog!.sonuc, kosul),
  };
}

/** WorkspaceProvider + yeni kaydırıcı penceresi (Sürgü aracı), açık */
export function kaydiriciEkleKur() {
  const diyalog = bilesen('kaydiriciEkle', SliderDialog, { isOpen: true, onClose: () => {} }) as Bilesen<unknown, unknown>;
  const k = saglayiciKur(() => [diyalog]);
  durula([diyalog], k.kaydet);
  return {
    ...k,
    get d() {
      return k.d;
    },
    oge: (kosul: (o: AgacOgesi) => boolean) => ogeBul(diyalog.sonuc, kosul),
  };
}

/** WorkspaceProvider + Düzgün Çokgen diyaloğu (diyaloğun açık olduğu varsayılır) */
export function duzgunCokgenKur(targetPos: Point2D) {
  let kapandi = 0;
  const diyalog = bilesen('duzgunCokgen', RegularPolygonDialog, { isOpen: true, onClose: () => void (kapandi += 1), targetPos });
  const k = saglayiciKur(() => [diyalog as Bilesen<unknown, unknown>]);
  durula([diyalog as Bilesen<unknown, unknown>], k.kaydet);
  const bul = (kosul: (o: AgacOgesi) => boolean) => {
    const oge = ogeBul(diyalog.sonuc, kosul);
    if (!oge) throw new Error('Diyalog öğesi bulunamadı.');
    return oge;
  };
  const yenile = () => durula([diyalog as Bilesen<unknown, unknown>], k.kaydet);
  return {
    ...k,
    get d() {
      return k.d;
    },
    kapanmaSayisi: () => kapandi,
    /** Kenar sayısı kutusuna yazar */
    kenarYaz(metin: string) {
      (bul((o) => o.props.id === 'regular-polygon-sides-input').props.onChange as (e: unknown) => void)({ target: { value: metin } });
      yenile();
    },
    /** Büyüklük kutusuna yazar */
    yaricapYaz(metin: string) {
      (bul((o) => o.props.id === 'regular-polygon-radius-input').props.onChange as (e: unknown) => void)({ target: { value: metin } });
      yenile();
    },
    /** Şablon düğmelerinin başlıkları */
    sablonlar(): string[] {
      const sonuc: string[] = [];
      ogeBul(diyalog.sonuc, (o) => {
        if (o.type === 'button' && typeof o.props.title === 'string' && o.props.title !== 'Kapat (Esc)') sonuc.push(o.props.title);
        return false;
      });
      return sonuc;
    },
    /** Diyaloğun ağacında bu metin var mı (iç açı kartı gibi) */
    metinVarMi(metin: string): boolean {
      return !!ogeBul(diyalog.sonuc, (o) => {
        const c = o.props.children;
        const parcalar = Array.isArray(c) ? c : [c];
        return parcalar.some((p) => typeof p === 'string' && p.includes(metin));
      });
    },
    /** "Çokgeni Çiz" (formu gönderir) */
    gonder() {
      (bul((o) => o.type === 'form').props.onSubmit as (e: unknown) => void)({ preventDefault() {} });
      durula([diyalog as Bilesen<unknown, unknown>], k.kaydet);
      k.yap(() => {});
    },
  };
}

/** WorkspaceProvider + 2B tuval (Canvas): fareyle basma, sürükleme, bırakma */
export function tuvalKur() {
  const tuval = bilesen('tuval', Canvas as (p: Record<string, unknown>) => unknown, { onSwitchTo3D: () => {} }, { efektler: false });
  const k = saglayiciKur(() => [tuval as Bilesen<unknown, unknown>]);
  durula([tuval as Bilesen<unknown, unknown>], k.kaydet);
  const sahteSvg = {
    getBoundingClientRect: () => ({ left: 0, top: 0, right: 1200, bottom: 700, width: 1200, height: 700, x: 0, y: 0 }),
    setPointerCapture() {},
    hasAttribute: () => false,
    closest: () => null,
    tagName: 'svg',
    id: '',
  };
  const svg = () => {
    const oge = ogeBul(tuval.sonuc, (o) => o.type === 'svg' && o.props['data-workspace-canvas'] === '2d');
    if (!oge) throw new Error('Tuval SVG öğesi bulunamadı.');
    (oge.ref as { current: unknown }).current = sahteSvg;
    return oge;
  };
  svg();
  const olay = (dunya: Point2D, hedef: unknown = sahteSvg) => {
    const ekran = worldToScreen(dunya, k.d.viewport);
    return {
      clientX: ekran.x, clientY: ekran.y, button: 0, buttons: 1, target: hedef, currentTarget: hedef, shiftKey: false, ctrlKey: false,
      metaKey: false, altKey: false, pointerId: 1, pointerType: 'mouse', preventDefault() {}, stopPropagation() {},
    };
  };
  const yenile = () => durula([tuval as Bilesen<unknown, unknown>], k.kaydet);
  return {
    ...k,
    get d() {
      return k.d;
    },
    /** Boş tuvale basar (dünya koordinatı) */
    bas(dunya: Point2D) {
      (svg().props.onPointerDown as (e: unknown) => void)(olay(dunya));
      yenile();
      k.yap(() => {});
    },
    /** Fareyi taşır */
    tasi(dunya: Point2D) {
      (svg().props.onPointerMove as (e: unknown) => void)(olay(dunya));
      yenile();
      k.yap(() => {});
    },
    /** Fareyi bırakır */
    birak() {
      ((tuval.sonuc as AgacOgesi).props.onPointerUp as () => void)();
      yenile();
      k.yap(() => {});
    },
    /** Noktanın gövdesine basar (nokta katmanındaki öğe) */
    noktayaBas(noktaKimligi: string) {
      const nokta = k.d.objects.find((o) => o.id === noktaKimligi) as { x: number; y: number } | undefined;
      if (!nokta) throw new Error('Nokta yok.');
      const oge = ogeBul(tuval.sonuc, (o) => o.props['data-object-id'] === noktaKimligi && typeof o.props.onPointerDown === 'function');
      if (!oge) throw new Error('Nokta öğesi bulunamadı.');
      const hedef = { ...sahteSvg, tagName: 'circle', closest: () => null };
      (oge.props.onPointerDown as (e: unknown) => void)(olay(nokta, hedef));
      yenile();
      k.yap(() => {});
    },
    /**
     * Bir nesnenin gövdesine basar (nesne katmanındaki `data-object-id` öğesi); `dunya` basılan yer, `etiket` hedef
     * öğenin türü (isabet denetimleri buna bakar). Öğe yoksa false döner.
     */
    nesneyeBas(kimlik: string, dunya: Point2D, etiket = 'path'): boolean {
      const oge = ogeBul(tuval.sonuc, (o) => o.props['data-object-id'] === kimlik && typeof o.props.onPointerDown === 'function');
      if (!oge) return false;
      const hedef = { ...sahteSvg, tagName: etiket, closest: () => null };
      (oge.props.onPointerDown as (e: unknown) => void)(olay(dunya, hedef));
      yenile();
      k.yap(() => {});
      return true;
    },
    /** Tuval ağacındaki bütün yazılar (önizleme etiketleri için) */
    yazilar(): string[] {
      const sonuc: string[] = [];
      ogeBul(tuval.sonuc, (o) => {
        const c = o.props.children;
        for (const p of Array.isArray(c) ? c : [c]) if (typeof p === 'string' || typeof p === 'number') sonuc.push(String(p));
        if (typeof o.props.ipucu === 'string') sonuc.push(o.props.ipucu);
        return false;
      });
      return sonuc;
    },
    /** Tuval ağacında koşulu sağlayan öğe */
    oge: (kosul: (o: AgacOgesi) => boolean) => ogeBul(tuval.sonuc, kosul),
  };
}

/**
 * Algoritma Laboratuvarı — ilerleme kaydı (bu cihazda, localStorage), bütün üniteler için.
 *
 * Ünite başına: ekrandaki görevin sırası ve ünite sonu gösterildi mi. Görev başına (kimlikler
 * bütün müfredatta tektir): tamamlandı mı, öğrencinin kodu, açılan ipucu sayısı, sorunun cevabı, tahmin.
 * Önceki sürümün (v2: yalnız 3. sınıf ünitesi) kaydı bir kez okunup aktarılır.
 */
import { programGecerli, type Program } from './program';
import type { Gorev, Unite } from './gorev';
import { UNITELER, VARSAYILAN_UNITE } from './mufredat';
import { ATOLYELER } from './atolyeler';

export const DEPO_ANAHTARI = 'geoeba_algoritma_v3';
const ESKI_ANAHTAR = 'geoeba_algoritma_v2';

export interface GorevKaydi {
  tamam: boolean;
  program?: Program;
  ipucu: number;
  cevap?: number;
  /** "Tahmin et" görevinde çalıştırmadan önce yazılan tahmin */
  tahmin?: number;
}

export interface UniteKaydi {
  aktif: number;
  bitti: boolean;
}

export interface AtolyeKaydi {
  program?: Program;
  /** En iyi sonuç: 0–3 yıldız */
  yildiz: number;
}

export interface LabKaydi {
  surum: 3;
  unite: string;
  uniteler: Record<string, UniteKaydi>;
  gorevler: Record<string, GorevKaydi>;
  /** Atölye projeleri (yoksa boş) */
  atolyeler?: Record<string, AtolyeKaydi>;
}

export function bosKayit(): LabKaydi {
  return { surum: 3, unite: VARSAYILAN_UNITE, uniteler: {}, gorevler: {} };
}

export function gorevKaydi(k: LabKaydi, id: string): GorevKaydi {
  return k.gorevler[id] ?? { tamam: false, ipucu: 0 };
}

export function uniteKaydi(k: LabKaydi, id: string): UniteKaydi {
  return k.uniteler[id] ?? { aktif: 0, bitti: false };
}

export function gorevGuncelle(k: LabKaydi, id: string, f: (g: GorevKaydi) => GorevKaydi): LabKaydi {
  return { ...k, gorevler: { ...k.gorevler, [id]: f(gorevKaydi(k, id)) } };
}

export function atolyeKaydi(k: LabKaydi, id: string): AtolyeKaydi {
  return k.atolyeler?.[id] ?? { yildiz: 0 };
}

export function atolyeGuncelle(k: LabKaydi, id: string, f: (a: AtolyeKaydi) => AtolyeKaydi): LabKaydi {
  return { ...k, atolyeler: { ...(k.atolyeler ?? {}), [id]: f(atolyeKaydi(k, id)) } };
}

export function uniteGuncelle(k: LabKaydi, id: string, f: (u: UniteKaydi) => UniteKaydi): LabKaydi {
  return { ...k, uniteler: { ...k.uniteler, [id]: f(uniteKaydi(k, id)) } };
}

/**
 * Görevin ekrandaki kodu: öğrencinin kaydı varsa o; yoksa başlangıç (boş / verilen kod / aynı
 * ünitedeki önceki görevin kodu). Önceki kod zinciri geriye doğru izlenir.
 */
export function gorevKodu(k: LabKaydi, u: Unite, g: Gorev): Program {
  const kayitli = k.gorevler[g.id]?.program;
  if (kayitli) return kayitli;
  if (Array.isArray(g.baslangic)) return g.baslangic;
  if (g.baslangic === 'bos') return [];
  const i = u.gorevler.findIndex((x) => x.id === g.id);
  return i > 0 ? gorevKodu(k, u, u.gorevler[i - 1]) : [];
}

const GOREV_KIMLIKLERI = new Set(UNITELER.flatMap((u) => u.gorevler.map((g) => g.id)));
const UNITE_KIMLIKLERI = new Set(UNITELER.map((u) => u.id));
const ATOLYE_KIMLIKLERI = new Set(ATOLYELER.map((a) => a.id));

function atolyeleriCoz(ham: unknown): Record<string, AtolyeKaydi> {
  const sonuc: Record<string, AtolyeKaydi> = {};
  if (!ham || typeof ham !== 'object') return sonuc;
  for (const [id, a] of Object.entries(ham as Record<string, unknown>)) {
    if (!ATOLYE_KIMLIKLERI.has(id) || !a || typeof a !== 'object') continue;
    const x = a as AtolyeKaydi;
    sonuc[id] = {
      program: programGecerli(x.program) ? x.program : undefined,
      yildiz: typeof x.yildiz === 'number' ? Math.max(0, Math.min(3, Math.round(x.yildiz))) : 0,
    };
  }
  return sonuc;
}

function gorevleriCoz(ham: unknown): LabKaydi['gorevler'] {
  const gorevler: LabKaydi['gorevler'] = {};
  if (!ham || typeof ham !== 'object') return gorevler;
  for (const [id, g] of Object.entries(ham as Record<string, unknown>)) {
    if (!GOREV_KIMLIKLERI.has(id) || !g || typeof g !== 'object') continue;
    const x = g as GorevKaydi;
    gorevler[id] = {
      tamam: !!x.tamam,
      program: programGecerli(x.program) ? x.program : undefined,
      ipucu: typeof x.ipucu === 'number' ? Math.max(0, Math.min(5, Math.round(x.ipucu))) : 0,
      cevap: typeof x.cevap === 'number' && Number.isFinite(x.cevap) ? x.cevap : undefined,
      tahmin: typeof x.tahmin === 'number' && Number.isFinite(x.tahmin) ? x.tahmin : undefined,
    };
  }
  return gorevler;
}

export function kaydiCoz(ham: string | null): LabKaydi | null {
  if (!ham) return null;
  try {
    const o = JSON.parse(ham) as Partial<LabKaydi>;
    if (!o || o.surum !== 3) return null;
    const uniteler: LabKaydi['uniteler'] = {};
    for (const [id, x] of Object.entries(o.uniteler ?? {})) {
      const u = UNITELER.find((y) => y.id === id);
      if (!u || !x || typeof x !== 'object') continue;
      const aktif = typeof x.aktif === 'number' && x.aktif >= 0 && x.aktif < u.gorevler.length ? Math.floor(x.aktif) : 0;
      uniteler[id] = { aktif, bitti: !!x.bitti };
    }
    return {
      surum: 3,
      unite: typeof o.unite === 'string' && UNITE_KIMLIKLERI.has(o.unite) ? o.unite : VARSAYILAN_UNITE,
      uniteler,
      gorevler: gorevleriCoz(o.gorevler),
      atolyeler: atolyeleriCoz(o.atolyeler),
    };
  } catch {
    return null;
  }
}

/** v2 kaydı (yalnız 3. sınıf ünitesi) → v3 */
export function eskiKaydiAktar(ham: string | null): LabKaydi | null {
  if (!ham) return null;
  try {
    const o = JSON.parse(ham) as { surum?: number; aktif?: number; gorevler?: unknown; bitti?: boolean };
    if (!o || o.surum !== 2) return null;
    const gorevler = gorevleriCoz(o.gorevler);
    if (!Object.keys(gorevler).length) return null;
    const u = UNITELER.find((x) => x.id === 's3-bak');
    const aktif = u && typeof o.aktif === 'number' && o.aktif >= 0 && o.aktif < u.gorevler.length ? Math.floor(o.aktif) : 0;
    return { surum: 3, unite: 's3-bak', uniteler: { 's3-bak': { aktif, bitti: !!o.bitti } }, gorevler };
  } catch {
    return null;
  }
}

export function kaydiYukle(): LabKaydi {
  if (typeof window === 'undefined') return bosKayit();
  try {
    return kaydiCoz(window.localStorage.getItem(DEPO_ANAHTARI)) ?? eskiKaydiAktar(window.localStorage.getItem(ESKI_ANAHTAR)) ?? bosKayit();
  } catch {
    return bosKayit();
  }
}

export function kaydiYaz(k: LabKaydi): void {
  try {
    window.localStorage.setItem(DEPO_ANAHTARI, JSON.stringify(k));
  } catch {
    /* depolama kapalı olabilir */
  }
}

/** Ünitedeki zorunlu görevlerin kaçı tamam */
export function uniteIlerlemesi(k: LabKaydi, u: Unite): { tamam: number; toplam: number } {
  const zorunlu = u.gorevler.filter((g) => !g.zorlu);
  return { tamam: zorunlu.filter((g) => k.gorevler[g.id]?.tamam).length, toplam: zorunlu.length };
}

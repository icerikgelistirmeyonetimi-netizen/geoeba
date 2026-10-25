/**
 * Tuvalin çizim çıktısını (React öğe ağacı) karşılaştırılabilir düz bir yapıya çevirir: çizim katmanları yeniden
 * yazılırken çıktının birebir aynı kaldığını kanıtlamak için (tuvalCizimKaydi.test.ts).
 *
 * - Öğe türü: HTML/SVG etiketi ya da bileşenin adı (alt bileşenler çizilmez; özellikleri kaydedilir).
 * - İşlev değerli özellikler 'ƒ' olarak kaydedilir (olay işleyicisinin VARLIĞI karşılaştırılır, gövdesi değil); ref'ler
 *   ve React'in iç alanları atılır; sayılar 3 ondalığa yuvarlanır (−0 → 0).
 * - `children` ayrıca, sırasıyla çevrilir; null / false / true / undefined çocuklar atılır.
 * - React `key` değeri de kaydedilir: geçişli öğeler (nokta gövdesi gibi) yeniden yazımdan sonra da aynı öğe kalmalı.
 */
export type DuzOge = { t: string; k?: string; p?: Record<string, unknown>; c?: (DuzOge | string)[] };

const sayi = (n: number) => {
  const r = Math.round(n * 1000) / 1000;
  return Object.is(r, -0) ? 0 : r;
};

function deger(v: unknown): unknown {
  if (typeof v === 'number') return Number.isFinite(v) ? sayi(v) : String(v);
  if (typeof v === 'function') return 'ƒ';
  if (Array.isArray(v)) return v.map(deger);
  if (v && typeof v === 'object') {
    if ('$$typeof' in (v as object)) return cevir(v);
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
      const d = deger(x);
      if (d !== undefined) out[k] = d;
    }
    return out;
  }
  return v;
}

function turAdi(t: unknown): string {
  if (typeof t === 'string') return t;
  if (typeof t === 'function') return (t as { displayName?: string; name?: string }).displayName || (t as { name?: string }).name || 'Bilesen';
  if (t && typeof t === 'object') {
    const o = t as { displayName?: string; render?: { name?: string }; type?: unknown; $$typeof?: symbol };
    if (o.displayName) return o.displayName;
    if (o.render?.name) return o.render.name;
    if (o.type) return turAdi(o.type);
    return String(o.$$typeof ?? 'nesne');
  }
  return String(t);
}

/** Öğe ya da öğe dizisini düz yapıya çevirir */
export function cevir(dugum: unknown): DuzOge | string | (DuzOge | string)[] | null {
  if (dugum === null || dugum === undefined || typeof dugum === 'boolean') return null;
  if (typeof dugum === 'string') return dugum;
  if (typeof dugum === 'number') return String(sayi(dugum));
  if (Array.isArray(dugum)) return cocuklar(dugum);
  if (typeof dugum !== 'object' || !('props' in dugum)) return null;
  const oge = dugum as { type: unknown; key?: string | null; props: Record<string, unknown> };
  const p: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(oge.props)) {
    if (k === 'children' || k === 'ref') continue;
    const d = deger(v);
    if (d !== undefined) p[k] = d;
  }
  const c = cocuklar(oge.props.children);
  return { t: turAdi(oge.type), ...(oge.key != null ? { k: oge.key } : {}), ...(Object.keys(p).length ? { p } : {}), ...(c.length ? { c } : {}) };
}

function cocuklar(v: unknown): (DuzOge | string)[] {
  const liste = Array.isArray(v) ? v.flat(Infinity) : [v];
  const out: (DuzOge | string)[] = [];
  for (const x of liste) {
    const d = cevir(x);
    if (d === null) continue;
    if (Array.isArray(d)) out.push(...d);
    else out.push(d);
  }
  return out;
}

/** Ağaçtaki öğe sayısı (kayıt boyutunu denetlemek için) */
export function ogeSayisi(d: DuzOge | string | (DuzOge | string)[] | null): number {
  if (!d || typeof d === 'string') return 0;
  if (Array.isArray(d)) return d.reduce((t, x) => t + ogeSayisi(x), 0);
  return 1 + (d.c ? d.c.reduce((t, x) => t + ogeSayisi(x), 0) : 0);
}

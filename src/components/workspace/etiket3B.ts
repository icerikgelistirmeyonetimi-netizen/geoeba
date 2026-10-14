/**
 * 3B sahnenin yazı etiketleri — 2B tuvalle AYNI standart (src/math/etiketStandardi.ts).
 *
 * Kullanıcı (14.10.2026): "atölye serbest çizimde 3b etiket yazı özellikleri 2b ile aynı değil aynı standartlar orada da
 * olmalı". Eskiden 3B etiketi 128 × 64 px'lik sabit bir tuvale 30/34 px `ui-monospace` ile yazılıyor, dünya biriminde
 * sabit boyda duruyor (yakınlaşınca dev, uzaklaşınca okunmaz), Stil ayarlarını okumuyor, A_1'i ham yazıyor, uzun metni
 * kırpıyordu. Artık:
 *  - Yazı 2B ile aynı aile, kalınlık, renk, hale/gölge ve alt indis düzeniyle (yazimDuzeni.duzenle) çizilir.
 *  - Doku yazının kendi ölçüsünde ve cihaz piksel oranında kurulur (uzun metin kesilmez, %100'de doku pikseli = ekran pikseli).
 *  - Sprite ekranda SABİT PİKSEL boydadır (sizeAttenuation: false); boy 2B'nin fs(…) × yazı ölçeğidir. Yazı ölçeği
 *    nokta adı ve ölçüde kamera yakınlığından türer (etiketStandardi.yaziOlcegi3B: %100'de 1, yakınlaşınca en çok 1,05,
 *    uzaklaşınca "Uzaklaşınca yazılar en az" sınırında kalır); eksen sayısı ve rozetleri 2B'deki gibi sabit boydadır.
 *  - Çapa ekran pikseliyle konur (nokta adı sağ üstte, orijin rozeti 8 px sağ altta, eksen sayısı eksenin yanında).
 *
 * Bu dosya three.js'e bağlı değildir: ölçü, çizim, doku anahtarı, önbellek ve yerleşim hesabı vitest ile denetlenir.
 * Sprite'ı kurup her karede ölçekleyen kısım Canvas3D.tsx'tedir.
 */
import { duzenle, type Duzen } from '@/math/yazimDuzeni';
import { metinGenisligi } from '@/math/yaziGenisligi';
import {
  aciklama,
  alan,
  duzMetin,
  ad,
  olcuDugumleri,
  sembol,
  sesli,
  uzunluk,
  yazimImzasi,
  type Dugum,
  type Olcu,
  type YazimAyari,
} from '@/math/matematikYazimi';
import { formatTurkishNumber } from '@/math/coordinates';
import {
  EKSEN_GRISI,
  EKSEN_ROZETI,
  EKSEN_SAYISI_OPAKLIGI,
  ETIKET_ES_ARALIKLI_AILE,
  ETIKET_TURLERI,
  ETIKET_YAZI_AILESI,
  NOKTA_ADI_GOLGESI,
  ORIJIN_ROZETI,
  eksenSayisiHaleKalinligi,
  turYaziBoyu,
  type EtiketTuru,
  type YaziBoyuAyarlari,
} from '@/math/etiketStandardi';
import { KOSE_BOSLUGU } from './noktaAdi';
import { CENTIK_YARI } from './eksenSayilari';
import { ilkokulUzunlugu } from './ilkokulKipi';

/* ------------------------------------------------------------------ tema */

/** Etiketlerin tema renkleri (çözülmüş CSS rengi; tuval 2D CSS değişkeni okuyamaz). */
export interface Tema3B {
  /** --foreground (fill-foreground) */
  yazi: string;
  /** --muted-foreground (nokta koordinatı) */
  soluk: string;
  /** --background (halenin rengi: 3B tuvalin zemini bg-background) */
  zemin: string;
}

/** globals.css :root ve .dark değerleri (CSS okunamazsa) */
export const ACIK_TEMA_3B: Tema3B = { yazi: 'hsl(173, 39%, 14%)', soluk: 'hsl(172, 20%, 29%)', zemin: 'hsl(40, 60%, 96%)' };
export const KOYU_TEMA_3B: Tema3B = { yazi: 'hsl(40, 60%, 96%)', soluk: 'hsl(40, 30%, 72%)', zemin: 'hsl(190, 38%, 10%)' };

/** "173 39% 14%" (shadcn belirteci) → "hsl(173, 39%, 14%)"; tanınmazsa null. */
export function hslBelirteci(deger: string): string | null {
  const m = deger.trim().match(/^(-?\d+(?:\.\d+)?)(?:deg)?\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/);
  return m ? `hsl(${m[1]}, ${m[2]}%, ${m[3]}%)` : null;
}

/** Tema renklerini 3B tuvalin kapsayıcısından okur (koyu tema ve .zemin-acik kapsamı kendiliğinden gelir). */
export function temaRenkleri3B(el: Element | null, koyu: boolean): Tema3B {
  const yedek = koyu ? KOYU_TEMA_3B : ACIK_TEMA_3B;
  if (!el || typeof getComputedStyle !== 'function') return yedek;
  const stil = getComputedStyle(el);
  const oku = (ad: string, y: string) => hslBelirteci(stil.getPropertyValue(ad)) ?? y;
  return { yazi: oku('--foreground', yedek.yazi), soluk: oku('--muted-foreground', yedek.soluk), zemin: oku('--background', yedek.zemin) };
}

/* ------------------------------------------------------------------ çizim tanımı */

export interface EtiketCizimi {
  tur: EtiketTuru;
  /** Tek satırlık görüntü ağacı (alt indis, kesme işareti: yazimDuzeni) */
  dugumler: Dugum[];
  px: number;
  agirlik: number;
  aile: 'sans' | 'mono';
  renk: string;
  /** Dolgunun opaklığı (eksen sayısı 0,8); hale tam opak */
  opaklik?: number;
  /** Zemin halesi (paint-order: stroke): ölçü ve eksen sayısı */
  hale?: { renk: string; kalinlik: number } | null;
  /** Nokta adının hafif gölgesi (drop-shadow) */
  golge?: boolean;
  /** Ada eklenen ikinci parça: koordinat " (2; 3; 0)" */
  ek?: { metin: string; px: number; agirlik: number; renk: string } | null;
  /** Rozet (eksen adı, orijin): yazı ortada */
  rozet?: { genislik: number; yukseklik: number; rx: number; taban: number; dolgu: string; cizgi?: string; cizgiKalinligi?: number } | null;
}

/** Nokta adı: 2B'deki <text className="fill-foreground font-bold drop-shadow"> + koordinat tspan'ı. */
export function noktaAdiCizimi(adMetni: string, s: YaziBoyuAyarlari, tema: Tema3B, koordinat?: string | null): EtiketCizimi {
  return {
    tur: 'noktaAdi',
    dugumler: [ad(adMetni)],
    px: turYaziBoyu('noktaAdi', s),
    agirlik: ETIKET_TURLERI.noktaAdi.agirlik,
    aile: 'sans',
    renk: tema.yazi,
    golge: true,
    ek: koordinat
      ? { metin: ` ${koordinat}`, px: turYaziBoyu('noktaKoordinati', s), agirlik: ETIKET_TURLERI.noktaKoordinati.agirlik, renk: tema.soluk }
      : null,
  };
}

/** Eksen sayısı: 2B'deki fill-foreground/80 kalın yazı + zemin halesi; metin formatTurkishNumber (2B ile aynı). */
export function eksenSayisiCizimi(deger: number, s: YaziBoyuAyarlari, tema: Tema3B): EtiketCizimi {
  return {
    tur: 'eksenSayisi',
    dugumler: [sembol(formatTurkishNumber(deger))],
    px: turYaziBoyu('eksenSayisi', s),
    agirlik: ETIKET_TURLERI.eksenSayisi.agirlik,
    aile: 'sans',
    renk: tema.yazi,
    opaklik: EKSEN_SAYISI_OPAKLIGI,
    hale: { renk: tema.zemin, kalinlik: eksenSayisiHaleKalinligi(s) },
  };
}

/**
 * Eksen adı rozeti: 2B'deki "+x" rozeti (36 × 20, rx 6, beyaz en kalın yazı). Rozet 2B'de eksen çizgisinin rengindedir
 * (#737373); 3B'de eksenler renkli olduğundan rozet de kendi ekseninin rengini alır (kural aynı: rozet = eksen rengi).
 */
export function eksenAdiCizimi(metin: string, eksenRengi: string, s: YaziBoyuAyarlari): EtiketCizimi {
  return {
    tur: 'eksenAdi',
    dugumler: [sembol(metin)],
    px: turYaziBoyu('eksenAdi', s),
    agirlik: ETIKET_TURLERI.eksenAdi.agirlik,
    aile: 'sans',
    renk: '#ffffff',
    rozet: { ...EKSEN_ROZETI, dolgu: eksenRengi },
  };
}

/** Orijin rozeti: 2B'deki "(0; 0)" — beyaz rozet, gri çerçeve, gri eş aralıklı en kalın yazı. */
export function orijinCizimi(metin: string, s: YaziBoyuAyarlari): EtiketCizimi {
  return {
    tur: 'orijin',
    dugumler: [sembol(metin)],
    px: turYaziBoyu('orijin', s),
    agirlik: ETIKET_TURLERI.orijin.agirlik,
    aile: 'mono',
    renk: EKSEN_GRISI,
    rozet: { ...ORIJIN_ROZETI, dolgu: '#ffffff', cizgi: EKSEN_GRISI, cizgiKalinligi: ORIJIN_ROZETI.cizgi },
  };
}

/* ------------------------------------------------------------------ eksen etiketleri */

export type Eksen3B = 'x' | 'y' | 'z';

export interface EksenEtiketi3B {
  cizim: EtiketCizimi;
  capa: EtiketCapasi;
  /** Dünya konumu (çapa) */
  konum: [number, number, number];
}

/**
 * 3B eksenlerin bütün yazıları: "+x" / "-x" rozetleri (ok ucunun ötesinde), her tam sayıdaki eksen sayısı (eksenin
 * üstündeki noktaya bağlı; ekranda yanına kaydırılır) ve orijin rozeti "(0; 0; 0)" (orijinin 8 px sağ altında).
 */
export function eksenEtiketleri3B(
  s: YaziBoyuAyarlari,
  tema: Tema3B,
  renkler: Readonly<Record<Eksen3B, string>>,
  uzunluklar: Readonly<Record<Eksen3B, { arti: number; eksi: number }>>,
): EksenEtiketi3B[] {
  const out: EksenEtiketi3B[] = [];
  (['x', 'y', 'z'] as Eksen3B[]).forEach((eksen) => {
    const vec = (t: number): [number, number, number] => (eksen === 'x' ? [t, 0, 0] : eksen === 'y' ? [0, t, 0] : [0, 0, t]);
    const { arti, eksi } = uzunluklar[eksen];
    out.push({ cizim: eksenAdiCizimi(`+${eksen}`, renkler[eksen], s), capa: { tur: 'orta' }, konum: vec(arti + 0.9) });
    out.push({ cizim: eksenAdiCizimi(`-${eksen}`, renkler[eksen], s), capa: { tur: 'orta' }, konum: vec(-eksi - 0.8) });
    for (let i = -eksi + 1; i <= arti - 1; i++) {
      if (i === 0) continue;
      out.push({ cizim: eksenSayisiCizimi(i, s, tema), capa: { tur: 'eksen', eksen, deger: i }, konum: vec(i) });
    }
  });
  out.push({ cizim: orijinCizimi('(0; 0; 0)', s), capa: { tur: 'kose', dx: ORIJIN_ROZETI.kayma, dy: ORIJIN_ROZETI.kayma }, konum: [0, 0, 0] });
  return out;
}

/* ------------------------------------------------------------------ ölçü */

export interface EtiketOlcusu3B {
  /** Doku boyu (CSS px, dolgu dahil; × piksel oranı tam sayı doku pikseli verir) */
  genislik: number;
  yukseklik: number;
  /** Rozet ya da yazı kutusunun boyu (dolgusuz) */
  icGenislik: number;
  icYukseklik: number;
  /** Kenar payı (hale, gölge, çerçeve taşmasın) */
  dolgu: number;
  /** Yazının sol kenarı (rozette: yazının ortası) ve taban çizgisi — dokunun sol üstüne göre */
  metinX: number;
  taban: number;
  /** Koordinat ekinin başladığı x */
  ekX: number;
  duzen: Duzen;
}

/**
 * Etiketin doku ölçüsü. Genişlik yazının kendisinden gelir (Manrope 700 ölçü tablosu, 2B ile aynı): uzun metin
 * ("(0; 0; 0)", "A′B′", koordinatlı ad) kırpılmaz. Rozet yazıdan dar olamaz (eksen çarpanı büyükse rozet büyür).
 */
export function etiketOlcusu3B(c: EtiketCizimi, pikselOrani = 1): EtiketOlcusu3B {
  const pr = pikselOrani > 0 && Number.isFinite(pikselOrani) ? pikselOrani : 1;
  const duzen = c.aile === 'mono' ? esAralikliDuzen(duzMetin(c.dugumler), c.px) : duzenle(c.dugumler, c.px, 700);
  // Koordinat 400/500 kesimle yazılır; 600 tablosu ondan geniştir: ayrılan yer yazıdan kısa kalmaz
  const ekGenislik = c.ek ? metinGenisligi(c.ek.metin, c.ek.px, 600) : 0;
  const metinW = duzen.genislik + ekGenislik;
  const golgePayi = c.golge ? Math.max(...NOKTA_ADI_GOLGESI.map((g) => g.bulaniklik + g.y)) : 0;
  const dolgu = Math.ceil(Math.max(c.hale ? c.hale.kalinlik / 2 : 0, golgePayi, c.rozet?.cizgiKalinligi ? c.rozet.cizgiKalinligi / 2 : 0) + 1);
  let icGenislik: number;
  let icYukseklik: number;
  let metinX: number;
  let taban: number;
  if (c.rozet) {
    const r = c.rozet;
    // 2B'deki "(0; 0)" yazısı 48 px rozette iki yanda ~4 px boşlukla durur
    icGenislik = Math.max(r.genislik, metinW + 8);
    icYukseklik = Math.max(r.yukseklik, Math.ceil(c.px * 1.6));
    metinX = dolgu + icGenislik / 2;
    taban = dolgu + icYukseklik / 2 + (r.taban - r.yukseklik / 2) * (icYukseklik / r.yukseklik);
  } else {
    icGenislik = metinW;
    icYukseklik = duzen.ust + duzen.alt;
    metinX = dolgu;
    taban = dolgu + duzen.ust;
  }
  const yuvarla = (v: number) => Math.ceil(v * pr - 1e-6) / pr;
  return {
    genislik: yuvarla(icGenislik + 2 * dolgu),
    yukseklik: yuvarla(icYukseklik + 2 * dolgu),
    icGenislik,
    icYukseklik,
    dolgu,
    metinX,
    taban,
    ekX: metinX + duzen.genislik,
    duzen,
  };
}

/** Roboto Mono (ve yedek eş aralıklı yazı tipleri) her karakterde 0,6 em ilerler. */
export const ES_ARALIKLI_EM = 0.6;

/** Eş aralıklı tek parça düzen (orijin rozeti): Manrope tablosu Roboto Mono'dan dar ölçer, rozet yazıdan dar kalırdı. */
function esAralikliDuzen(metin: string, px: number): Duzen {
  const w = [...metin].length * ES_ARALIKLI_EM * px;
  return { parcalar: [{ x: 0, dy: 0, s: metin, w, px, soluk: false }], susler: [], cubuklar: [], genislik: w, ust: 0.86 * px, alt: 0.21 * px, cizgi: Math.max(0.9, px * 0.075) };
}

/** Doku pikseli (tam sayı) */
export function dokuPikseli(o: EtiketOlcusu3B, pikselOrani: number): { genislik: number; yukseklik: number } {
  return { genislik: Math.max(1, Math.round(o.genislik * pikselOrani)), yukseklik: Math.max(1, Math.round(o.yukseklik * pikselOrani)) };
}

/* ------------------------------------------------------------------ çizim */

const aileAdi = (c: EtiketCizimi) => (c.aile === 'mono' ? ETIKET_ES_ARALIKLI_AILE : ETIKET_YAZI_AILESI);

function yuvarlakDikdortgen(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.arcTo(x + w, y, x + w, y + rr, rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
  ctx.lineTo(x + rr, y + h);
  ctx.arcTo(x, y + h, x, y + h - rr, rr);
  ctx.lineTo(x, y + rr);
  ctx.arcTo(x, y, x + rr, y, rr);
  ctx.closePath();
}

/**
 * Etiketi tuvale çizer (2B'deki SVG ile aynı sıra: önce zemin halesi, sonra yazı; süsler ve mutlak değer çizgileri
 * yazimDuzeni'nin sayılarıyla). Her parça düzenin verdiği genişliğe yatayda oturtulur (SVG textLength'in karşılığı):
 * yazı tipi yüklenmemiş olsa bile kutu ve süsler hizalı kalır.
 */
export function etiketiCiz(ctx: CanvasRenderingContext2D, c: EtiketCizimi, o: EtiketOlcusu3B, pikselOrani: number): void {
  const pr = pikselOrani > 0 ? pikselOrani : 1;
  ctx.setTransform(pr, 0, 0, pr, 0, 0);
  ctx.clearRect(0, 0, o.genislik, o.yukseklik);
  const aile = aileAdi(c);
  ctx.textBaseline = 'alphabetic';

  if (c.rozet) {
    const r = c.rozet;
    yuvarlakDikdortgen(ctx, o.dolgu, o.dolgu, o.icGenislik, o.icYukseklik, r.rx);
    ctx.fillStyle = r.dolgu;
    ctx.fill();
    if (r.cizgi && r.cizgiKalinligi) {
      ctx.lineWidth = r.cizgiKalinligi;
      ctx.strokeStyle = r.cizgi;
      ctx.stroke();
    }
    ctx.font = `${c.agirlik} ${c.px}px ${aile}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = c.renk;
    ctx.fillText(duzMetin(c.dugumler), o.metinX, o.taban);
    return;
  }

  ctx.textAlign = 'left';
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const d = o.duzen;

  const parcalar = (mod: 'hale' | 'dolgu') => {
    for (const t of d.parcalar) {
      ctx.font = `${c.agirlik} ${t.px}px ${aile}`;
      const dogal = ctx.measureText(t.s).width;
      ctx.save();
      ctx.translate(o.metinX + t.x, o.taban + t.dy);
      if (dogal > 0 && Math.abs(dogal - t.w) > 0.01) ctx.scale(t.w / dogal, 1);
      if (mod === 'hale') ctx.strokeText(t.s, 0, 0);
      else ctx.fillText(t.s, 0, 0);
      ctx.restore();
    }
  };
  const susler = (kalinlik: number) => {
    ctx.save();
    ctx.translate(o.metinX, o.taban);
    ctx.lineWidth = kalinlik;
    for (const s of d.susler) {
      const xm = (s.x0 + s.x1) / 2;
      ctx.beginPath();
      ctx.moveTo(s.x0, s.y);
      if (s.tur === 'yay') ctx.quadraticCurveTo(xm, s.y - 2 * s.h, s.x1, s.y);
      else {
        ctx.lineTo(xm, s.y - s.h);
        ctx.lineTo(s.x1, s.y);
        if (s.tur === 'ucgen') ctx.closePath();
      }
      ctx.stroke();
    }
    for (const k of d.cubuklar) {
      ctx.beginPath();
      ctx.moveTo(k.x, k.y0);
      ctx.lineTo(k.x, k.y1);
      ctx.stroke();
    }
    ctx.restore();
  };

  if (c.hale) {
    ctx.strokeStyle = c.hale.renk;
    ctx.lineWidth = c.hale.kalinlik;
    parcalar('hale');
    susler(d.cizgi + c.px * 0.28);
  }

  const gecisler = c.golge ? NOKTA_ADI_GOLGESI : [null];
  for (const g of gecisler) {
    // Gölge ölçüleri dönüşümden etkilenmez: cihaz pikseline çevrilir
    ctx.shadowColor = g ? g.renk : 'transparent';
    ctx.shadowBlur = g ? g.bulaniklik * pr : 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = g ? g.y * pr : 0;
    ctx.globalAlpha = c.opaklik ?? 1;
    ctx.fillStyle = c.renk;
    ctx.strokeStyle = c.renk;
    parcalar('dolgu');
    susler(d.cizgi);
    if (c.ek) {
      ctx.globalAlpha = 1;
      ctx.font = `${c.ek.agirlik} ${c.ek.px}px ${aile}`;
      ctx.fillStyle = c.ek.renk;
      ctx.fillText(c.ek.metin, o.ekX, o.taban);
    }
  }
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.globalAlpha = 1;
}

/* ------------------------------------------------------------------ doku anahtarı ve önbellek */

/**
 * Dokunun önbellek anahtarı: biçimi belirleyen HER parametre (yazı ağacı, boy, kalınlık, aile, renkler, hale, gölge,
 * koordinat eki, rozet, piksel oranı, yazı tipinin yüklenme sürümü). Stil ayarı ya da tema değişince anahtar değişir,
 * eski doku süpürülür.
 */
export function dokuAnahtari(c: EtiketCizimi, pikselOrani: number, yaziSurumu: number): string {
  return JSON.stringify([
    yazimImzasi([c.dugumler]),
    c.px,
    c.agirlik,
    c.aile,
    c.renk,
    c.opaklik ?? 1,
    c.hale ?? null,
    !!c.golge,
    c.ek ?? null,
    c.rozet ?? null,
    pikselOrani,
    yaziSurumu,
  ]);
}

export interface Atilabilir {
  dispose(): void;
}

/**
 * Doku önbelleği (tuval örneği başına bir tane). Sahne her kurulduğunda aynı anahtarlı doku yeniden kullanılır (nokta
 * sürüklenirken etiket yeniden çizilmez); `supur` sahnede artık kullanılmayan dokuları GPU'dan siler (bellek sızıntısı yok).
 */
export class EtiketDokuOnbellegi<T extends Atilabilir> {
  private readonly dokular = new Map<string, T>();

  al(anahtar: string, uret: () => T): T {
    const var_ = this.dokular.get(anahtar);
    if (var_) return var_;
    const yeni = uret();
    this.dokular.set(anahtar, yeni);
    return yeni;
  }

  /** Kullanılmayanları siler; silinen sayısını döndürür. */
  supur(kullanilan: ReadonlySet<string>): number {
    let silinen = 0;
    for (const [anahtar, doku] of this.dokular) {
      if (kullanilan.has(anahtar)) continue;
      doku.dispose();
      this.dokular.delete(anahtar);
      silinen++;
    }
    return silinen;
  }

  hepsiniAt(): void {
    this.dokular.forEach((d) => d.dispose());
    this.dokular.clear();
  }

  get boyut(): number {
    return this.dokular.size;
  }

  anahtarlar(): string[] {
    return [...this.dokular.keys()];
  }
}

/* ------------------------------------------------------------------ ekranda yerleşim */

/** Çapa: sprite'ın dünya konumuna göre ekranda nereye düşeceği */
export type EtiketCapasi =
  | { tur: 'orta' }
  /** Nokta adı: 2B noktaAdi'nin ilk adayı (sağ üst): yazı noktanın `bosluk` px sağında, tabanı `bosluk` px üstünde */
  | { tur: 'noktaSagUst'; dunyaYaricapi: number }
  /** Rozetin sol üst köşesi çapanın (dx, dy) px sağ altında (orijin rozeti: 8, 8) */
  | { tur: 'kose'; dx: number; dy: number }
  /** Eksen sayısı: eksenin ekrandaki doğrultusuna dik, 2B kuralıyla (yatay eksende altta, dikeyde solda) */
  | { tur: 'eksen'; eksen: 'x' | 'y' | 'z'; deger: number };

/** Canvas3D'nin sprite.userData.etiket3B'si */
export interface EtiketBilgisi3B {
  anahtar: string;
  tur: EtiketTuru;
  olcu: EtiketOlcusu3B;
  capa: EtiketCapasi;
}

/** sizeAttenuation: false sprite'ın 1 CSS pikseli için ölçeği (perspektif kamera, dikey görüş açısı `fovDerece`). */
export function ekranPikseliOlcegi(tuvalYuksekligi: number, fovDerece: number): number {
  return (2 * Math.tan((fovDerece * Math.PI) / 360)) / Math.max(1, tuvalYuksekligi);
}

/** Nokta adının köşe boşluğu: 2B'deki max(KOSE_BOSLUGU, nokta yarıçapı + 4); 3B'de küre dünyada boyutlu olduğundan ekran yarıçapı. */
export function noktaAdiBoslugu(dunyaYaricapi: number, birimPx: number): number {
  return Math.max(KOSE_BOSLUGU, dunyaYaricapi * Math.max(0, birimPx) + 4);
}

/** Eksen sayısı ile eksen çizgisi arası (çentik yarısı + 4 px; 2B'de çentik 3 px, x sayısı satır kutusuyla 1–5 px) */
export const EKSEN_SAYISI_ARASI = CENTIK_YARI + 4;
/** Aynı eksendeki komşu sayılar arası en az boşluk (2B eksenSayilari KOMSU_ARASI) */
export const EKSEN_KOMSU_ARASI = 4;

/**
 * Eksen sayısı merkezinin çapaya göre ekran kayması (y aşağı). 2B'de x ekseni yatay → sayı eksenin altında, y ekseni
 * dikey → solunda. 3B'de eksenin ekrandaki doğrultusu `yon` (birim vektör): baskın yönü yataysa dik doğrultunun aşağı
 * bakanı, dikeyse sola bakanı seçilir; uzaklık = ara + kutunun o doğrultudaki yarı uzanımı.
 */
export function eksenSayisiKaymasi(yon: { x: number; y: number }, w: number, h: number): { x: number; y: number } {
  const u = Math.hypot(yon.x, yon.y) || 1;
  const dx = yon.x / u;
  const dy = yon.y / u;
  let nx = -dy;
  let ny = dx;
  const yatay = Math.abs(dx) >= Math.abs(dy);
  if (yatay ? ny < 0 : nx > 0) {
    nx = -nx;
    ny = -ny;
  }
  const uzanim = (Math.abs(nx) * w) / 2 + (Math.abs(ny) * h) / 2;
  const d = EKSEN_SAYISI_ARASI + uzanim;
  return { x: nx * d, y: ny * d };
}

/**
 * Komşu eksen sayıları üst üste binmesin diye kaç birimde bir sayı yazılacağı (2B eksenSayilari.seyreltmeKati'nin
 * karşılığı): gereken aralık = kutunun eksen doğrultusundaki uzanımı + 4 px; birim aralığı `birimPx`.
 */
export function eksenSayisiKati(birimPx: number, yon: { x: number; y: number }, w: number, h: number): number {
  if (!(birimPx > 0) || !Number.isFinite(birimPx)) return Number.POSITIVE_INFINITY;
  const u = Math.hypot(yon.x, yon.y) || 1;
  const gereken = (Math.abs(yon.x / u) * w) + (Math.abs(yon.y / u) * h) + EKSEN_KOMSU_ARASI;
  return Math.max(1, Math.ceil((gereken - 1e-6) / birimPx));
}

/**
 * Sprite merkezi (three.js Sprite.center: dokunun hangi noktası dünya konumuna oturur; UV, y yukarı).
 * `s`: yazı ölçeği; ölçüler CSS px. `bosluk` nokta adında köşe boşluğu, `kayma` eksen sayısında merkez kayması.
 */
export function spriteMerkezi(
  e: Pick<EtiketBilgisi3B, 'olcu' | 'capa'>,
  s: number,
  ek: { bosluk?: number; kayma?: { x: number; y: number } } = {},
): { x: number; y: number } {
  const W = e.olcu.genislik * s;
  const H = e.olcu.yukseklik * s;
  switch (e.capa.tur) {
    case 'noktaSagUst': {
      const b = ek.bosluk ?? KOSE_BOSLUGU;
      return { x: (e.olcu.metinX * s - b) / W, y: 1 - (e.olcu.taban * s + b) / H };
    }
    case 'kose':
      return { x: (e.olcu.dolgu * s - e.capa.dx) / W, y: 1 + (e.capa.dy - e.olcu.dolgu * s) / H };
    case 'eksen': {
      const k = ek.kayma ?? { x: 0, y: 0 };
      return { x: 0.5 - k.x / W, y: 0.5 + k.y / H };
    }
    default:
      return { x: 0.5, y: 0.5 };
  }
}

/**
 * Sprite'ın sol üst köşesini cihaz pikseline oturtur (ölçek 1'de doku pikseli ekran pikseline birebir düşer, yazı
 * bulanıklaşmaz). `ekran`: çapanın ekran konumu (CSS px).
 */
export function pikseleOturt(
  merkez: { x: number; y: number },
  ekran: { x: number; y: number },
  W: number,
  H: number,
  pikselOrani: number,
): { x: number; y: number } {
  const pr = pikselOrani > 0 ? pikselOrani : 1;
  const sol = Math.round((ekran.x - merkez.x * W) * pr) / pr;
  const ust = Math.round((ekran.y - (1 - merkez.y) * H) * pr) / pr;
  return { x: (ekran.x - sol) / W, y: 1 - (ekran.y - ust) / H };
}

/* ------------------------------------------------------------------ ölçü yazıları (bindirme: MatematikEtiketi) */

export interface OlcuYazisi3B {
  satirlar: Dugum[][];
  sesli: string;
  ipucu: string;
  metin: string;
}

function yazisi(o: Olcu, ayar: YazimAyari): OlcuYazisi3B {
  const satir = olcuDugumleri(o, ayar);
  return { satirlar: [satir], sesli: sesli(o, ayar), ipucu: aciklama(o, ayar), metin: duzMetin(satir) };
}

/**
 * Uzunluk Ölçme ayrıt etiketi — 2B'deki adsız uzunlukla aynı yazım (ayar: yazimAyari + kademenin tam sayı kuralı):
 * ortaokul "≈ 3,46 br" / "4 br", lise (tam sayı açık) "3 br", ilkokul (eski kural, ilkokulKipi) "yaklaşık 3 br".
 */
export function ayritOlcusuYazisi(deger: number, ayar: YazimAyari, ilkokul: boolean): OlcuYazisi3B {
  if (ilkokul) {
    const u = ilkokulUzunlugu(deger);
    const o: Olcu = { tur: 'uzunluk', adlar: null, deger: u.deger, basamak: 0, birim: 'br', yaklasik: u.yaklasik || undefined };
    return yazisi(o, { ...ayar, tamSayi: true, yaklasikSozcukle: true });
  }
  return yazisi(uzunluk(null, null, deger), ayar);
}

/** İncelenen yüzün alanı — 2B'deki adsız alan yazımı ("Alan = 12 br²", yuvarlanmışsa "Alan ≈ 7,07 br²"). */
export function yuzAlaniYazisi(deger: number, ayar: YazimAyari): OlcuYazisi3B {
  return yazisi(alan([], deger), ayar);
}

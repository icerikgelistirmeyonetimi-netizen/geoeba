'use client';

/**
 * Veri ve Grafik — grafiklerin paylaştığı yardımcılar: SVG tema renkleri ve geçiş eğrisi, SVG → PNG indirme,
 * işaretçi → SVG koordinatı, tablolardaki kategori renk noktası.
 * Bu dosya `ortak.tsx`'i içe aktarmaz; `ortak.tsx` buradaki dışa aktarımları yeniden dışa aktarır (içe aktarmalar değişmez).
 */
import React from 'react';
import { kenarGerekir } from './kategorik';

export const GECIS = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

/** SVG içinde kullanılan tema renkleri (CSS değişkenleri; PNG'de hesaplanmış değerle çözülür) */
export const RENK = {
  metin: 'hsl(var(--foreground))',
  solukMetin: 'hsl(var(--muted-foreground))',
  kenar: 'hsl(var(--border))',
  birincil: 'hsl(var(--primary))',
  vurgu: 'hsl(var(--ring))',
  kart: 'hsl(var(--card))',
  zemin: 'hsl(var(--background))',
  izgara: 'hsl(var(--grid-color))',
  mercan: '#d9805f',
  altin: '#b9884a',
  lavanta: '#7f88c4',
} as const;

export function dosyaIndir(blob: Blob, ad: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = ad;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ── SVG → PNG ───────────────────────────────────────────────────────────────

/** PNG'nin zemini: her zaman açık tema (fildişi), koyu temada indirilse de */
export const PNG_ZEMINI = '#fbf7ee';
/** Başlık bandı renkleri (açık tema: mürekkep, mürekkep-2, kenarlık) */
const BANT_BASLIK_RENGI = '#15302d';
const BANT_ALT_RENGI = '#3c5a56';
const BANT_CIZGI_RENGI = '#e1d7c4';
const BANT_YAZI_TIPI = "Manrope, 'Instrument Sans', 'Segoe UI', sans-serif";
/** Birden çok SVG alt alta birleştirilirken aralarındaki boşluk (px) */
export const PNG_SVG_ARASI = 12;
/** Çıktı çözünürlüğü (2×: akıllı tahtada ve baskıda keskin) */
const PNG_OLCEGI = 2;

/** PNG başlık bandı: başlık 16 px 800, alt başlık 12,5 px (ör. soru ve "6-A sınıfı · 24 veri") */
export interface PngBandi {
  baslik: string;
  altBaslik?: string;
}

/** Klonda aranacak öğeler: yalnız ekranda anlamlı olanlar ve sürükleme tutamaçları */
const PNG_DISI_SECICI = '[data-yalniz-ekran], [role="slider"]';

/** `pngdenCikarilirMi`nın okuduğu en küçük öğe arayüzü (saf test için) */
export interface PngOgesi {
  hasAttribute(ad: string): boolean;
  getAttribute(ad: string): string | null;
  querySelector(secici: string): unknown;
}

/**
 * Öğe PNG'ye girmez mi?
 * - `data-yalniz-ekran` işaretli her öğe çıkar (odak halkası, ipucu, sürükleme göstergesi …).
 * - `role="slider"` tutamaç grupları çıkar; yalnız veri taşıyanlar kalır: `data-png-kalir` işaretliler (ör. çizgi
 *   grafiğinin noktaları) ve içinde yazı (`text`, değer etiketi) bulunanlar. Kalan grubun içindeki
 *   `data-yalniz-ekran` parçaları yine çıkar.
 */
export function pngdenCikarilirMi(el: PngOgesi): boolean {
  if (el.hasAttribute('data-yalniz-ekran')) return true;
  if (el.getAttribute('role') === 'slider') return !el.hasAttribute('data-png-kalir') && !el.querySelector('text');
  return false;
}

/** `pngKlonuTemizle`nin kullandığı en küçük ağaç arayüzü */
export interface PngKoku {
  querySelectorAll(secici: string): ArrayLike<PngOgesi & { remove(): void }>;
  contains(oge: unknown): boolean;
}

/** Klondan PNG'ye girmeyen öğeleri siler; silinen öğe sayısını döner */
export function pngKlonuTemizle(kok: PngKoku): number {
  let sayi = 0;
  for (const el of Array.from(kok.querySelectorAll(PNG_DISI_SECICI))) {
    // Üst öğesi zaten silinmiş olan atlanır
    if (!kok.contains(el)) continue;
    if (pngdenCikarilirMi(el)) {
      el.remove();
      sayi++;
    }
  }
  return sayi;
}

/** Başlığı en çok iki satıra böler (sığmayan ikinci satır "…" ile kısalır); `olc` metin genişliğini verir */
export function bantSatirlari(baslik: string, olc: (metin: string) => number, genislik: number): string[] {
  const temiz = baslik.replace(/\s+/g, ' ').trim();
  if (!temiz) return [];
  if (olc(temiz) <= genislik) return [temiz];
  const sozcukler = temiz.split(' ');
  let ilk = '';
  let i = 0;
  for (; i < sozcukler.length; i++) {
    const aday = ilk ? `${ilk} ${sozcukler[i]}` : sozcukler[i];
    if (ilk && olc(aday) > genislik) break;
    ilk = aday;
  }
  let ikinci = sozcukler.slice(i).join(' ');
  if (!ikinci) return [ilk];
  if (olc(ikinci) > genislik) {
    while (ikinci.length > 1 && olc(`${ikinci}…`) > genislik) ikinci = ikinci.slice(0, -1).trimEnd();
    ikinci = `${ikinci}…`;
  }
  return [ilk, ikinci];
}

/** Bant yüksekliği: tek satır başlık 40 px; alt başlıkla 56 px; iki satır başlıkta 20 px daha */
export function bantYuksekligi(baslikSatiri: number, altBaslikVar: boolean): number {
  if (baslikSatiri <= 0 && !altBaslikVar) return 0;
  return 12 + Math.max(1, baslikSatiri) * 20 + (altBaslikVar ? 16 : 0) + 8;
}

const RENK_NITELIKLERI = ['fill', 'stroke', 'color', 'stop-color'] as const;

/**
 * Klonun renklerini, klon açık tema kabının (`.zemin-acik`) içindeyken hesaplanan değerlerle sabitler:
 * CSS değişkenli, `currentColor`lı ya da sınıfla boyanan her öğe. PNG böylece koyu temada da açık renklidir.
 */
function renkleriCoz(klon: SVGSVGElement): void {
  const dugumler = [klon, ...Array.from(klon.querySelectorAll<SVGElement>('*'))];
  // Önce hepsi okunur, sonra yazılır (yazılan değer sonraki okumayı etkilemesin)
  const okunan = dugumler.map((el) => {
    const hesaplanmis = window.getComputedStyle(el);
    const sinifli = el.hasAttribute('class');
    const renkler = RENK_NITELIKLERI.map((nitelik) => {
      const kaynak = `${el.getAttribute(nitelik) ?? ''} ${el.style.getPropertyValue(nitelik)}`;
      return sinifli || /var\(|currentcolor/i.test(kaynak) ? hesaplanmis.getPropertyValue(nitelik) : '';
    });
    const yazi = el.tagName.toLowerCase() === 'text' || el.tagName.toLowerCase() === 'tspan';
    return {
      renkler,
      yaziTipi: yazi ? hesaplanmis.fontFamily : '',
      yaziBoyu: yazi && sinifli ? hesaplanmis.fontSize : '',
      kalinlik: yazi && sinifli ? hesaplanmis.fontWeight : '',
    };
  });
  dugumler.forEach((el, i) => {
    const o = okunan[i];
    RENK_NITELIKLERI.forEach((nitelik, j) => {
      const deger = o.renkler[j];
      if (!deger) return;
      el.setAttribute(nitelik, deger);
      el.style.setProperty(nitelik, deger);
    });
    if (o.yaziTipi) el.style.fontFamily = o.yaziTipi;
    if (o.yaziBoyu) el.style.fontSize = o.yaziBoyu;
    if (o.kalinlik) el.style.fontWeight = o.kalinlik;
    // Geçişler ve giriş animasyonları PNG'ye taşınmaz: resim olarak çizilen SVG animasyonun ilk karesinde
    // (ör. nokta grafiğinin `vg-nokta-gir`i: opaklık 0) kalır ve noktalar görünmez olurdu
    el.style.transition = 'none';
    el.style.animation = 'none';
  });
}

interface SvgParcasi {
  metin: string;
  genislik: number;
  yukseklik: number;
}

/** Açık tema kabında klonu hazırlar: ekran öğeleri çıkar, renkler çözülür, metne dökülür */
function svgParcasi(svg: SVGSVGElement, kap: HTMLElement): SvgParcasi {
  const genislik = svg.clientWidth || Number(svg.getAttribute('width')) || 800;
  const yukseklik = svg.clientHeight || Number(svg.getAttribute('height')) || 500;
  const klon = svg.cloneNode(true) as SVGSVGElement;
  klon.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  klon.setAttribute('width', String(genislik));
  klon.setAttribute('height', String(yukseklik));
  pngKlonuTemizle(klon);
  kap.appendChild(klon);
  try {
    renkleriCoz(klon);
    return { metin: new XMLSerializer().serializeToString(klon), genislik, yukseklik };
  } finally {
    klon.remove();
  }
}

function resimYukle(url: string): Promise<HTMLImageElement> {
  return new Promise((coz, reddet) => {
    const img = new Image();
    img.onload = () => coz(img);
    img.onerror = () => reddet(new Error('SVG çizilemedi'));
    img.src = url;
  });
}

/** Bant yazı tipini bekler (en çok 800 ms; yüklenemezse sistem yazı tipiyle sürer) */
async function yaziTipiniBekle(): Promise<void> {
  const fontlar = typeof document !== 'undefined' ? document.fonts : undefined;
  if (!fontlar?.load) return;
  await Promise.race([
    Promise.all([fontlar.load(`800 16px ${BANT_YAZI_TIPI}`), fontlar.load(`600 12.5px ${BANT_YAZI_TIPI}`)]).catch(() => undefined),
    new Promise((coz) => window.setTimeout(coz, 800)),
  ]);
}

/**
 * SVG(ler) → canvas → PNG dosyası (2× çözünürlük).
 * - Birden çok SVG verilirse alt alta birleştirilir (karşılaştırma panelleri).
 * - Klonda `[data-yalniz-ekran]` öğeleri ve sürükleme tutamaçları (`role="slider"`, bkz. `pngdenCikarilirMi`) yoktur.
 * - Renkler her zaman açık temada çözülür (klon gizli bir `.zemin-acik` kabında hesaplanır); zemin fildişi.
 * - `bant` verilirse üstte başlık bandı: 40 px (alt başlıkla 56 px; başlık iki satıra taşarsa 20 px daha).
 */
export async function svgPngIndir(svg: SVGSVGElement | SVGSVGElement[], dosyaAdi: string, bant?: PngBandi): Promise<void> {
  const liste = (Array.isArray(svg) ? svg : [svg]).filter((s): s is SVGSVGElement => Boolean(s));
  if (liste.length === 0) throw new Error('İndirilecek grafik yok');
  const kap = document.createElement('div');
  kap.className = 'zemin-acik';
  kap.setAttribute('aria-hidden', 'true');
  kap.setAttribute('data-png-hazirlik', '');
  kap.style.cssText = 'position:fixed;left:-100000px;top:0;visibility:hidden;pointer-events:none;color:hsl(var(--foreground));';
  document.body.appendChild(kap);
  let parcalar: SvgParcasi[];
  try {
    parcalar = liste.map((s) => svgParcasi(s, kap));
  } finally {
    kap.remove();
  }
  const urller = parcalar.map((p) => URL.createObjectURL(new Blob([p.metin], { type: 'image/svg+xml;charset=utf-8' })));
  try {
    const [resimler] = await Promise.all([Promise.all(urller.map(resimYukle)), bant ? yaziTipiniBekle() : Promise.resolve()]);
    const genislik = Math.max(...parcalar.map((p) => p.genislik));
    const tuval = document.createElement('canvas');
    const ctx = tuval.getContext('2d');
    if (!ctx) throw new Error('Canvas yok');

    // Başlık bandı: satırlar ölçülür (tuval boyutu değişince bağlam sıfırlandığı için yazı tipi yeniden kurulur)
    const baslikYazisi = `800 16px ${BANT_YAZI_TIPI}`;
    const altYazisi = `600 12.5px ${BANT_YAZI_TIPI}`;
    ctx.font = baslikYazisi;
    const satirlar = bant ? bantSatirlari(bant.baslik, (m) => ctx.measureText(m).width, genislik - 32) : [];
    const altBaslik = bant?.altBaslik?.replace(/\s+/g, ' ').trim() ?? '';
    const bantY = bant ? bantYuksekligi(satirlar.length, altBaslik !== '') : 0;
    const toplamY = bantY + parcalar.reduce((t, p) => t + p.yukseklik, 0) + PNG_SVG_ARASI * (parcalar.length - 1);

    tuval.width = Math.round(genislik * PNG_OLCEGI);
    tuval.height = Math.round(toplamY * PNG_OLCEGI);
    ctx.setTransform(PNG_OLCEGI, 0, 0, PNG_OLCEGI, 0, 0);
    ctx.fillStyle = PNG_ZEMINI;
    ctx.fillRect(0, 0, genislik, toplamY);
    if (bantY > 0) {
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = BANT_BASLIK_RENGI;
      ctx.font = baslikYazisi;
      satirlar.forEach((satir, i) => ctx.fillText(satir, 16, 27 + i * 20));
      if (altBaslik) {
        ctx.fillStyle = BANT_ALT_RENGI;
        ctx.font = altYazisi;
        ctx.fillText(altBaslik, 16, 12 + Math.max(1, satirlar.length) * 20 + 12, genislik - 32);
      }
      ctx.fillStyle = BANT_CIZGI_RENGI;
      ctx.fillRect(0, bantY - 1, genislik, 1);
    }
    let y = bantY;
    parcalar.forEach((p, i) => {
      ctx.drawImage(resimler[i], 0, y, p.genislik, p.yukseklik);
      y += p.yukseklik + PNG_SVG_ARASI;
    });
    const blob = await new Promise<Blob | null>((coz) => tuval.toBlob(coz, 'image/png'));
    if (!blob) throw new Error('PNG üretilemedi');
    dosyaIndir(blob, dosyaAdi);
  } finally {
    urller.forEach((u) => URL.revokeObjectURL(u));
  }
}

// ── İşaretçi → SVG koordinatı ───────────────────────────────────────────────

/** Ekrandaki kutu (getBoundingClientRect: pencere animasyonunun ölçeği dahil) */
export interface EkranKutusu {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** SVG `viewBox` */
export interface GorunumKutusu {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * İstemci koordinatını SVG yerel koordinatına çevirir.
 * - Ekran kutusu ile yerleşim boyutu (clientWidth / clientHeight) arasındaki oran, pencerenin transform ölçeğini
 *   düzeltir: `(clientX − kutu.left) × (yerleşimGenişliği ÷ kutu.width)`, y için de aynı.
 * - `viewBox` yerleşim boyutundan farklıysa (ör. dar pencerede küçültülmüş çizim) viewBox birimine çevrilir;
 *   `oranKorunur` (varsayılan xMidYMid meet) iken ortalanmış tek ölçek kullanılır.
 */
export function istemcidenYerele(
  clientX: number,
  clientY: number,
  kutu: EkranKutusu,
  yerlesim: { genislik: number; yukseklik: number },
  gorunum?: GorunumKutusu | null,
  oranKorunur = true,
): { x: number; y: number } {
  const g = yerlesim.genislik > 0 ? yerlesim.genislik : kutu.width;
  const h = yerlesim.yukseklik > 0 ? yerlesim.yukseklik : kutu.height;
  const sx = kutu.width > 0 && g > 0 ? g / kutu.width : 1;
  const sy = kutu.height > 0 && h > 0 ? h / kutu.height : 1;
  let x = (clientX - kutu.left) * sx;
  let y = (clientY - kutu.top) * sy;
  if (gorunum && gorunum.width > 0 && gorunum.height > 0 && g > 0 && h > 0) {
    const ayni = gorunum.x === 0 && gorunum.y === 0 && gorunum.width === g && gorunum.height === h;
    if (!ayni) {
      if (oranKorunur) {
        const s = Math.min(g / gorunum.width, h / gorunum.height);
        const ox = (g - gorunum.width * s) / 2;
        const oy = (h - gorunum.height * s) / 2;
        x = gorunum.x + (x - ox) / s;
        y = gorunum.y + (y - oy) / s;
      } else {
        x = gorunum.x + (x * gorunum.width) / g;
        y = gorunum.y + (y * gorunum.height) / h;
      }
    }
  }
  return { x, y };
}

/** İşaretçi olayını SVG yerel koordinatına çevirir; ölçekli pencerede (açılış, büyütme animasyonu) de doğru */
export function svgKonumu(svg: SVGSVGElement, clientX: number, clientY: number): { x: number; y: number } {
  const r = svg.getBoundingClientRect();
  const vb = svg.viewBox?.baseVal;
  const oran = svg.preserveAspectRatio?.baseVal;
  // SVGPreserveAspectRatio.SVG_PRESERVEASPECTRATIO_NONE = 1
  return istemcidenYerele(
    clientX,
    clientY,
    r,
    { genislik: svg.clientWidth, yukseklik: svg.clientHeight },
    vb && vb.width > 0 && vb.height > 0 ? { x: vb.x, y: vb.y, width: vb.width, height: vb.height } : null,
    !oran || oran.align !== 1,
  );
}

// ── SVG yazı ölçüsü ve sütun adı ────────────────────────────────────────────

/** Dar harfler (i, l, ı, noktalama) ve geniş harfler (m, w, büyük harflerin çoğu) için göreli genişlikler */
const DAR_HARFLER = new Set([...'iljıI.,:;\'!|()[]{}f t'.replace(/ /g, '')]);
const GENIS_HARFLER = new Set([...'mwMWOQGÖĞCÇDHNU%']);

/**
 * SVG metninin yaklaşık genişliği (px): SVG'de ölçüm yapılmaz (sunucu çizimi ve kararlı yerleşim için).
 * Manrope'a göre ayarlı: rakam ve çoğu harf 0,56 em, dar harfler 0,3 em, geniş harfler 0,82 em, boşluk 0,27 em;
 * kalın yazı %6 daha geniş.
 */
export function metinGenisligi(metin: string, boyut: number, kalin = false): number {
  let em = 0;
  for (const h of metin) {
    if (h === ' ' || h === ' ') em += 0.27;
    else if (DAR_HARFLER.has(h)) em += 0.3;
    else if (GENIS_HARFLER.has(h)) em += 0.82;
    else if (h >= 'A' && h <= 'Z') em += 0.66;
    else em += 0.56;
  }
  return em * boyut * (kalin ? 1.06 : 1);
}

/** Metni en çok `genislik` px'e sığdırır; sığmazsa sonunu "…" ile kısaltır */
export function metniSigdir(metin: string, boyut: number, genislik: number, kalin = false): string {
  if (metinGenisligi(metin, boyut, kalin) <= genislik) return metin;
  let kisa = metin;
  while (kisa.length > 1 && metinGenisligi(`${kisa}…`, boyut, kalin) > genislik) kisa = kisa.slice(0, -1);
  return `${kisa.trimEnd()}…`;
}

/**
 * Sütun adını yalın ad ve birime ayırır: "Boy (cm)" → { ad: "Boy", birim: "cm" }; "Sıcaklık (°C)" → °C;
 * sonda ayraç yoksa birim null. Değişim etiketi, saçılım balonu ve hesap şeridi birimi buradan alır.
 */
export function adVeBirim(sutunAdi: string): { ad: string; birim: string | null } {
  const m = /^(.*?)\s*\(([^()]*)\)\s*$/.exec(sutunAdi);
  if (!m) return { ad: sutunAdi.trim(), birim: null };
  const birim = m[2].trim();
  const ad = m[1].trim();
  return { ad: ad || sutunAdi.trim(), birim: birim === '' ? null : birim };
}

/** Sayı ile birim arasındaki bölünmez boşluk (5,8 °C satır sonunda ayrılmasın) */
const BOLUNMEZ = '\u00a0';

/** Sayı ve birimi birlikte: "7 saat", "5,8 °C", "%45" (yüzde işareti Türkçede sayının önüne gelir) */
export function birimli(sayiMetni: string, birim: string | null): string {
  if (!birim) return sayiMetni;
  if (birim === '%') return `%${sayiMetni}`;
  return `${sayiMetni}${BOLUNMEZ}${birim}`;
}


/** Tablolarda kategori rengini gösteren küçük renk noktası (renk anahtarı, frekans ve iki yönlü tablolar) */
export function RenkNoktasi({ renk }: { renk: string | undefined }) {
  // Çok açık / koyu renk (adlı "Beyaz", "Siyah") zeminde kaybolmasın: metin renginde ince kenar
  const kenar = kenarGerekir(renk ?? '');
  return (
    <svg viewBox="0 0 12 12" className="h-3 w-3 shrink-0" aria-hidden="true">
      <circle cx="6" cy="6" r={kenar ? 5 : 5.5} fill={renk} stroke={kenar ? RENK.metin : undefined} strokeWidth={kenar ? 1 : undefined} />
    </svg>
  );
}

'use client';

/**
 * Çizgi grafiği: satır sırası = zaman; seçili değişken (ve istenirse karşılaştırılan ikinci değişken) birer seri.
 * Her satır eşit genişlikte bir dilime oturur (ilk / son nokta eksene yapışmaz, etiketler kesilmez).
 * - Tek seride lejant yerine dikey eksenin adı yazar ("↑ Boy (cm)"); yatay eksenin adı ilk sütunun adıdır (Hafta →).
 * - İki seride lejant adları sığdıkça kısaltmaz; uzun satır etiketleri iki satıra kırılır (sığmazsa eğik yazılır).
 * - Nokta sürüklenince tablo güncellenir; seçili / üzerine gelinen noktanın komşularıyla arasındaki değişim balonla
 *   yazılır: "3 cm artış (%150)", "5,8 °C azalış", "değişim yok". Yüzde yalnız anlamlıysa (bkz. `yuzdeAnlamli`).
 *   Balonlar çizginin normali yönünde, noktalardan ve değer etiketlerinden uzakta, birbirine binmeden durur.
 * - Renk anahtarı seçiliyse her kategori kendi renginde ayrı çizgidir (aynı kategorinin satırları sırayla birleşir);
 *   iki seri varsa seriler çizgi biçimiyle ayrılır: ilki düz ve dolu noktalı, ikincisi kesikli ve içi boş noktalı.
 *   `ikinciKesikli` bunu renk anahtarı olmadan da yapar (ör. teorik olasılık çizgisi).
 * - 40'tan çok satırda noktalar, değer etiketleri ve tutamaçlar gizlenir; satırlar arasında ok tuşlarıyla gezilir.
 */
import React, { useMemo, useRef, useState } from 'react';
import { adimOndalik, dogrusalOlcek, gosterimOndaligi, seriRengi, surukleDegeri, tamSayiliMi, yaziBoyu, type Eksen } from './grafik';
import { satirEtiketi, sayiOku, sayisalSutunlar, type VeriTablosu } from './veri';
import { sayiMetni } from './istatistik';
import { GECIS, RENK, adVeBirim, birimli, metinGenisligi, metniSigdir, svgKonumu } from './grafikOrtak';
import { payliEksen } from './SutunGrafigi';
import { kategoriSayilari, rengeGoreMetin, renkGruplari, satirRengi, type RenkEslemesi } from './kategorik';
import { RenkLejanti, renkLejantiGenisligi } from './RenkLejanti';

export interface CizgiGrafigiProps {
  tablo: VeriTablosu;
  /** Çizilecek sayısal sütunların indeksleri (seri sırası); verilmezse bütün sayısal sütunlar */
  sutunlar?: number[];
  seciliSatir: number | null;
  onSatirSec: (satir: number | null) => void;
  onDegerDegis: (satir: number, sutun: number, deger: number, ondalik: number) => void;
  yuvarlamaAdimi: number;
  genislik: number;
  yukseklik: number;
  azaltilmisHareket: boolean;
  /** Renk anahtarı: noktalar ve çizgiler kategorik bir değişkenin renklerini alır, lejantla */
  renkEslemi?: RenkEslemesi | null;
  /** Seri başına (seri sırasıyla) değişim balonunda yüzde yazılsın mı; verilmeyen seride `yuzdeAnlamli` karar verir */
  yuzdeGoster?: boolean[];
  /** Her noktanın değeri yanında yazılsın (40'tan çok satırda yazılmaz) */
  degerleriGoster?: boolean;
  /** İkinci seri kesikli çizgi ve içi boş noktalarla (ör. Deney özetinde teorik olasılık) */
  ikinciKesikli?: boolean;
}

const SAG = 20;
/** Renk anahtarında ve `ikinciKesikli`de ikinci serinin çizgi deseni */
const KESIK = '7 5';
/** Bu kadar satırdan sonra noktalar, değer etiketleri ve tutamaçlar gizlenir */
export const CIZGI_COK_NOKTA = 40;
/** Değişim balonunun yazı boyu (px) */
const BALON_YAZI = 13;
const BALON_Y = 22;

interface SeriNoktasi {
  satir: number;
  deger: number;
  x: number;
  y: number;
}

interface Kutu {
  x: number;
  y: number;
  g: number;
  h: number;
}

/**
 * İki ardışık değer arasındaki değişimin yazısı (Δ ve işaret kullanılmaz):
 * "3 cm artış (%150)", "5,8 °C azalış", "değişim yok". Yüzde yalnız `yuzde` true iken ve önceki değer 0 değilken
 * yazılır; tek ondalıklı ve işaretsizdir ("%22,2"). Birim "%" ise sayının önüne gelir ("%7 artış").
 */
export function degisimEtiketi(onceki: number, sonraki: number, secenek: { yuzde?: boolean; birim?: string | null } = {}): string {
  const fark = sonraki - onceki;
  const farkMetni = sayiMetni(Math.abs(fark), gosterimOndaligi([onceki, sonraki]));
  if (fark === 0 || farkMetni === '0' || farkMetni === '') return 'değişim yok';
  let metin = `${birimli(farkMetni, secenek.birim ?? null)} ${fark > 0 ? 'artış' : 'azalış'}`;
  if (secenek.yuzde && onceki !== 0 && Number.isFinite(onceki)) metin += ` (%${sayiMetni(Math.abs(fark / onceki) * 100, 1)})`;
  return metin;
}

/**
 * Yüzde değişim anlamlı mı? Sıcaklık gibi aralık ölçeklerinde (ad °C / °F / sıcaklık içeriyorsa), yüzde birimli
 * sütunlarda (yüzdenin yüzdesi karışır) ve değerlerden biri 0 ya da negatifse yüzde yazılmaz.
 */
export function yuzdeAnlamli(sutunAdi: string, degerler: readonly number[]): boolean {
  const ad = sutunAdi.toLocaleLowerCase('tr');
  if (/°\s*[cf]/.test(ad) || ad.includes('sıcaklık') || ad.includes('sicaklik')) return false;
  if (adVeBirim(sutunAdi).birim === '%') return false;
  return degerler.every((d) => d > 0);
}

/** Satır etiketini yuvaya sığdırır: tek satır, sığmazsa boşluktan iki satır; ikisi de olmazsa null (eğik yazılır) */
function etiketSatirlari(etiket: string, boyut: number, yuva: number): string[] | null {
  if (metinGenisligi(etiket, boyut) <= yuva) return [etiket];
  const sozcukler = etiket.split(' ');
  let enIyi: string[] | null = null;
  let enIyiG = Infinity;
  for (let k = 1; k < sozcukler.length; k++) {
    const a = sozcukler.slice(0, k).join(' ');
    const b = sozcukler.slice(k).join(' ');
    const g = Math.max(metinGenisligi(a, boyut), metinGenisligi(b, boyut));
    if (g < enIyiG) {
      enIyiG = g;
      enIyi = [a, b];
    }
  }
  return enIyi && enIyiG <= yuva ? enIyi : null;
}

const ortusme = (a: Kutu, b: Kutu) =>
  Math.max(0, Math.min(a.x + a.g, b.x + b.g) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

/**
 * Değişim balonunun yeri: parçanın orta noktasından normali yönünde (önce yukarı yan) artan uzaklıklar denenir;
 * engellere (noktalar, değer etiketleri, parçanın kendisi, önceki balon) ve çizim alanının dışına en az taşan seçilir.
 */
function balonYeri(a: { x: number; y: number }, b: { x: number; y: number }, g: number, engeller: Kutu[], alan: Kutu): Kutu {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const u = Math.hypot(dx, dy) || 1;
  let nx = dy / u;
  let ny = -dx / u;
  if (ny > 0 || (ny === 0 && nx > 0)) {
    nx = -nx;
    ny = -ny;
  }
  let enIyi: Kutu | null = null;
  let enIyiPuan = Infinity;
  for (const yan of [1, -1]) {
    for (const d of [BALON_Y / 2 + 8, BALON_Y / 2 + 18, BALON_Y / 2 + 30, BALON_Y / 2 + 44]) {
      // Kutu normal yönünde, kenarı (köşesi değil) çizgiye bakacak kadar ötede: yatayda yarım genişlik kadar pay
      const ek = Math.abs(nx) * (g / 2 - BALON_Y / 2);
      const cxb = mx + yan * nx * (d + ek);
      const cyb = my + yan * ny * d;
      const kutu = { x: Math.min(Math.max(cxb - g / 2, alan.x), alan.x + alan.g - g), y: cyb - BALON_Y / 2, g, h: BALON_Y };
      let puan = engeller.reduce((t, e) => t + ortusme(kutu, e), 0);
      const tasma = Math.max(0, alan.y - kutu.y) + Math.max(0, kutu.y + kutu.h - (alan.y + alan.h));
      puan += tasma * g * 2;
      if (puan < enIyiPuan - 1e-6) {
        enIyiPuan = puan;
        enIyi = kutu;
      }
      if (puan === 0) return kutu;
    }
  }
  return enIyi!;
}

export function CizgiGrafigi({
  tablo,
  sutunlar,
  seciliSatir,
  onSatirSec,
  onDegerDegis,
  yuvarlamaAdimi,
  genislik,
  yukseklik,
  azaltilmisHareket,
  renkEslemi = null,
  yuzdeGoster,
  degerleriGoster = false,
  ikinciKesikli = false,
}: CizgiGrafigiProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [surukle, setSurukle] = useState<{ sutun: number; satir: number; eksen: Eksen } | null>(null);
  const [ustunde, setUstunde] = useState<{ sutun: number; satir: number } | null>(null);
  const [gezinmeOdagi, setGezinmeOdagi] = useState(false);

  const W = Math.max(genislik, 240);
  const H = Math.max(yukseklik, 200);
  const fs = yaziBoyu(W);
  const n = Math.max(tablo.satirlar.length, 1);
  const cok = tablo.satirlar.length > CIZGI_COK_NOKTA;
  const sutunAnahtari = sutunlar?.join(',') ?? '';
  const seriler = useMemo(
    () => {
      const hepsi = sayisalSutunlar(tablo).map((s) => ({ sutun: s, indeks: tablo.sutunlar.findIndex((k) => k.id === s.id) }));
      if (!sutunlar) return hepsi;
      return sutunlar.map((i) => hepsi.find((s) => s.indeks === i)).filter((s): s is (typeof hepsi)[number] => s !== undefined);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tablo, sutunAnahtari],
  );
  const tek = seriler.length === 1;
  /** Renk anahtarı: kategorik sütun (seriler sayısal olduğundan hiçbir seriyle çakışmaz) */
  const anahtar = renkEslemi && renkEslemi.sutun >= 0 && renkEslemi.sutun < tablo.sutunlar.length ? renkEslemi : null;
  const cizilenSatirlar = useMemo(() => {
    const k = new Set<number>();
    for (const s of seriler)
      tablo.satirlar.forEach((r, i) => {
        if (sayiOku(r.hucreler[s.indeks]) !== null) k.add(i);
      });
    return [...k].sort((a, b) => a - b);
  }, [seriler, tablo]);
  const lejantSayilari = anahtar ? kategoriSayilari(anahtar, cizilenSatirlar) : undefined;

  const tumDegerler = useMemo(() => {
    const d: number[] = [];
    for (const s of seriler)
      for (const r of tablo.satirlar) {
        const v = sayiOku(r.hucreler[s.indeks]);
        if (v !== null) d.push(v);
      }
    return d;
  }, [seriler, tablo]);
  const ondalik = useMemo(() => gosterimOndaligi(tumDegerler), [tumDegerler]);
  const tamSayili = useMemo(() => tamSayiliMi(tumDegerler), [tumDegerler]);

  // ── Üst bölüm: seri lejantı (iki seride), renk anahtarı, dikey eksen adı (tek seride) ──────────────────
  const satirYuk = fs + 10;
  const ornekG = 30;
  const lejantBas = 16;
  const seriAdlari = seriler.map((s) => s.sutun.ad);
  const lejantHam = seriAdlari.reduce((t, ad) => t + ornekG + metinGenisligi(ad, fs, true) + 18, 0);
  const lejantAlani = W - SAG - lejantBas;
  // Adlar sığdıkça kısalmaz; sığmazsa her ad eşit paya kısalır
  const seriLejantlari = seriAdlari.reduce<{ x: number; ad: string }[]>((liste, ad) => {
    const onceki = liste[liste.length - 1];
    const x = onceki ? onceki.x + ornekG + metinGenisligi(onceki.ad, fs, true) + 18 : lejantBas;
    const metin = tek || lejantHam <= lejantAlani ? ad : metniSigdir(ad, fs, lejantAlani / seriAdlari.length - ornekG - 18, true);
    return [...liste, { x, ad: metin }];
  }, []);
  const sonLejant = seriLejantlari[seriLejantlari.length - 1];
  const seriLejantSonu = !tek && sonLejant ? sonLejant.x + ornekG + metinGenisligi(sonLejant.ad, fs, true) + 18 : lejantBas;
  const renkAyniSatirda = anahtar !== null && !tek && seriLejantSonu + renkLejantiGenisligi(anahtar, lejantSayilari) <= W - SAG;
  const ustSatirSayisi = (tek ? 0 : 1) + (anahtar && !renkAyniSatirda ? 1 : 0);
  const satirTaban = (k: number) => 8 + fs + k * satirYuk;
  const renkLejantY = satirTaban(tek ? 0 : renkAyniSatirda ? 0 : 1);
  const yEksenAdi = tek ? seriler[0].sutun.ad : null;
  const UST = 8 + ustSatirSayisi * satirYuk + (yEksenAdi ? fs + 14 : 8) + 6;

  // ── Dikey eksen ─────────────────────────────────────────────────────────────
  const xAdi = tablo.sutunlar[0]?.tur === 'etiket' ? tablo.sutunlar[0].ad : 'Satır';
  // Önce alt bölüm tahmini (etiket kipi yatay genişliğe bağlı; sol boşluk eksen işaretlerine)
  const eksenIcin = (taban: number) =>
    tumDegerler.length === 0
      ? payliEksen(0, 10, 5, true)
      : payliEksen(Math.min(...tumDegerler), Math.max(...tumDegerler), Math.max(3, Math.floor((taban - UST) / 44)), tamSayili);
  const eksenOndaligi = (e: Eksen) => gosterimOndaligi(e.isaretler, 0, 4);
  const onEksen = eksenIcin(H - 64);
  const SOL = Math.max(48, Math.ceil(Math.max(...onEksen.isaretler.map((v) => metinGenisligi(sayiMetni(v, eksenOndaligi(onEksen)), fs))) + 16));
  const alanG = W - SOL - SAG;
  // Her satır eşit bir dilimin ortasında: ilk nokta Y eksenine, son nokta kenara yapışmaz
  const adimX = alanG / n;
  // Etiket seyreltme adımı "güzel" sayı (1, 2, 5, 10, 20, 25, 50 …): 1, 21, 41 … gibi düzenli dizilir
  const hamAdim = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(alanG / 64))));
  const etiketAdimi = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000].find((a) => a >= hamAdim) ?? hamAdim;
  /** Seçili satırın etiketi her zaman yazılır; ona yarım adımdan yakın düzenli etiket yazılmaz (üst üste binmesin) */
  const etiketYazilir = (i: number) =>
    i === seciliSatir || (i % etiketAdimi === 0 && (seciliSatir === null || etiketAdimi === 1 || Math.abs(i - seciliSatir) >= etiketAdimi / 2));

  // ── Yatay eksen etiketleri: tek satır, iki satır ya da (sığmazsa) eğik ─────────────────────────────
  const yuva = adimX * etiketAdimi - 6;
  const etiketler = tablo.satirlar.map((_, i) => satirEtiketi(tablo, i));
  let egik = false;
  let ikiSatir = false;
  const satirliEtiketler = etiketler.map((e, i) => {
    if (!etiketYazilir(i)) return null;
    const s = etiketSatirlari(e, fs, yuva);
    if (!s) egik = true;
    else if (s.length === 2) ikiSatir = true;
    return s;
  });
  // Eğik (−35°) etiket: dikeyde en çok 110 px; sığmayan etiket kısalır
  const EGIM = Math.sin((35 * Math.PI) / 180);
  const enUzunEtiketG = etiketler.reduce((m, e, i) => (etiketYazilir(i) ? Math.max(m, metinGenisligi(e, fs)) : m), 0);
  const etiketBlogu = egik ? Math.min(110, 16 + Math.min(enUzunEtiketG, 180) * EGIM + 6) : 8 + (ikiSatir ? 2 : 1) * (fs + 3);
  const egikEtiketG = (etiketBlogu - 22) / EGIM;
  const altBosluk = etiketBlogu + fs + 16;
  const taban = H - altBosluk;
  const ondalikAdim = adimOndalik(yuvarlamaAdimi);

  const canliEksen = useMemo(() => eksenIcin(taban), [tumDegerler, taban, UST, tamSayili]); // eslint-disable-line react-hooks/exhaustive-deps
  const eksen = surukle ? surukle.eksen : canliEksen;
  const isaretOndaligi = eksenOndaligi(eksen);
  const olcek = dogrusalOlcek(eksen.min, eksen.max, taban, UST);
  const xKonum = (i: number) => SOL + adimX * (i + 0.5);

  const seriNoktalari = useMemo(
    () =>
      seriler.map((s, si) => {
        const noktalar: SeriNoktasi[] = [];
        tablo.satirlar.forEach((r, i) => {
          const v = sayiOku(r.hucreler[s.indeks]);
          if (v !== null) noktalar.push({ satir: i, deger: v, x: xKonum(i), y: olcek.ileri(v) });
        });
        const degerler = noktalar.map((p) => p.deger);
        const ab = adVeBirim(s.sutun.ad);
        return { ...s, si, noktalar, birim: ab.birim, yuzde: yuzdeGoster?.[si] ?? yuzdeAnlamli(s.sutun.ad, degerler) };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [seriler, tablo, eksen, alanG, taban, UST, SOL, yuzdeGoster],
  );

  const gecis = azaltilmisHareket || surukle || cok ? 'none' : `all 300ms ${GECIS}`;

  const isaretciHareket = (e: React.PointerEvent<SVGElement>) => {
    if (!surukle || !svgRef.current) return;
    const { y } = svgKonumu(svgRef.current, e.clientX, e.clientY);
    const o = dogrusalOlcek(surukle.eksen.min, surukle.eksen.max, taban, UST);
    onDegerDegis(surukle.satir, surukle.sutun, surukleDegeri(y, o, yuvarlamaAdimi, surukle.eksen.min, surukle.eksen.max), ondalikAdim);
  };

  const vurgulu = surukle ?? ustunde ?? (seciliSatir !== null ? { satir: seciliSatir, sutun: -1 } : null);
  const vurguluMu = (satir: number, sutunIndeksi: number) =>
    vurgulu !== null && vurgulu.satir === satir && (vurgulu.sutun === sutunIndeksi || vurgulu.sutun === -1);

  // ── Değer etiketleri (hepsi ya da yalnız vurgulu nokta) ve konumları ──────────────────────────────
  const degerYazisi = (v: number) => sayiMetni(v, ondalik);
  /** Aynı satırda öteki serinin değeri: iki seride büyük olanın etiketi üstte, küçüğünki altta */
  const digerDeger = (si: number, satir: number): number | null => {
    if (seriler.length < 2) return null;
    const o = seriNoktalari[si === 0 ? 1 : 0]?.noktalar.find((p) => p.satir === satir);
    return o ? o.deger : null;
  };
  const etiketAltta = (si: number, noktalar: SeriNoktasi[], k: number): boolean => {
    const p = noktalar[k];
    if (p.y - fs - 10 < UST) return true;
    const diger = digerDeger(si, p.satir);
    if (diger !== null) return p.deger < diger || (p.deger === diger && si === 1);
    const onceki = noktalar[k - 1];
    const sonraki = noktalar[k + 1];
    // Çukurdaki nokta: etiket altta (çizgilerin arasına düşmez)
    return (onceki === undefined || onceki.deger > p.deger) && (sonraki === undefined || sonraki.deger > p.deger) && (onceki || sonraki) !== undefined && p.y + fs + 12 < taban;
  };
  const etiketKutusu = (p: SeriNoktasi, altta: boolean, metin: string): Kutu => {
    const g = metinGenisligi(metin, fs, true) + 6;
    const tabanY = altta ? p.y + fs + 8 : p.y - 10;
    return { x: p.x - g / 2, y: tabanY - fs * 0.8, g, h: fs + 2 };
  };

  // Engeller: bütün noktalar ve yazılan değer etiketleri
  const engeller: Kutu[] = [];
  const yazilanEtiketler: { si: number; p: SeriNoktasi; altta: boolean; metin: string; kalin: boolean }[] = [];
  seriNoktalari.forEach((s) => {
    s.noktalar.forEach((p, k) => {
      if (!cok) engeller.push({ x: p.x - 9, y: p.y - 9, g: 18, h: 18 });
      const aktif = vurguluMu(p.satir, s.indeks);
      if ((degerleriGoster && !cok) || aktif) {
        const metin = degerYazisi(p.deger);
        const altta = etiketAltta(s.si, s.noktalar, k);
        yazilanEtiketler.push({ si: s.si, p, altta, metin, kalin: aktif });
        engeller.push(etiketKutusu(p, altta, metin));
      }
    });
  });

  // ── Değişim balonları: vurgulu noktanın aynı çizgideki önceki ve sonraki noktasıyla ────────────────
  const cizimAlani: Kutu = { x: SOL + 2, y: UST - 2, g: alanG - 4, h: taban - UST };
  const balonlar: { anahtar: string; kutu: Kutu; metin: string; renk: string; orta: { x: number; y: number } }[] = [];
  seriNoktalari.forEach((s) => {
    if (!vurgulu || !(vurgulu.sutun === s.indeks || vurgulu.sutun === -1)) return;
    const noktaBul = new Map(s.noktalar.map((p) => [p.satir, p]));
    const gruplar = anahtar
      ? renkGruplari(
          anahtar,
          s.noktalar.map((p) => p.satir),
        ).map((g) => ({ renk: g.renk, noktalar: g.satirlar.map((satir) => noktaBul.get(satir)!) }))
      : [{ renk: seriRengi(s.si), noktalar: s.noktalar }];
    const grup = gruplar.find((g) => g.noktalar.some((p) => p.satir === vurgulu.satir));
    if (!grup) return;
    const k = grup.noktalar.findIndex((p) => p.satir === vurgulu.satir);
    for (const j of [k - 1, k]) {
      if (j < 0 || j + 1 >= grup.noktalar.length) continue;
      const a = grup.noktalar[j];
      const b = grup.noktalar[j + 1];
      const metin = degisimEtiketi(a.deger, b.deger, { yuzde: s.yuzde, birim: s.birim });
      const g = metinGenisligi(metin, BALON_YAZI, true) + 16;
      // Parçanın kendisi de engel: balon çizginin üstüne binmesin
      const parca: Kutu[] = [];
      const adimSayisi = Math.max(2, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 8));
      for (let t = 1; t < adimSayisi; t++) {
        const x = a.x + ((b.x - a.x) * t) / adimSayisi;
        const y = a.y + ((b.y - a.y) * t) / adimSayisi;
        parca.push({ x: x - 2, y: y - 2, g: 4, h: 4 });
      }
      const kutu = balonYeri(a, b, g, [...engeller, ...parca, ...balonlar.map((x) => x.kutu)], cizimAlani);
      balonlar.push({ anahtar: `${s.sutun.id}-${j}`, kutu, metin, renk: grup.renk, orta: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } });
    }
  });

  // ── Çok satırda gezinme ─────────────────────────────────────────────────────
  const enYakinSatir = (clientX: number, clientY: number): number | null => {
    if (!svgRef.current || tablo.satirlar.length === 0) return null;
    const { x } = svgKonumu(svgRef.current, clientX, clientY);
    return Math.min(tablo.satirlar.length - 1, Math.max(0, Math.floor((x - SOL) / adimX)));
  };
  const satiraGit = (i: number) => {
    const s = Math.min(tablo.satirlar.length - 1, Math.max(0, i));
    onSatirSec(s);
  };
  const gezinmeMetni = (satir: number | null) => {
    if (satir === null || satir >= tablo.satirlar.length) return 'Satır seçilmedi';
    const degerler = seriNoktalari
      .map((s) => {
        const p = s.noktalar.find((q) => q.satir === satir);
        return p ? `${s.sutun.ad} ${degerYazisi(p.deger)}` : null;
      })
      .filter(Boolean)
      .join(', ');
    return `${satirEtiketi(tablo, satir)}${degerler ? `: ${degerler}` : ''}`;
  };

  return (
    <svg
      ref={svgRef}
      data-grafik="cizgi"
      role="img"
      aria-label="Çizgi grafiği"
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      className="block select-none bg-card"
      style={{ fontFamily: 'Manrope, sans-serif', touchAction: 'none' }}
    >
      {/* Lejant (iki seride): renk anahtarı varken renksiz çizgi örneği (düz / kesikli), yoksa seri renginde */}
      {!tek &&
        seriNoktalari.map((s, si) => {
          const kesik = si > 0 && (anahtar !== null || ikinciKesikli);
          const renk = anahtar ? RENK.solukMetin : seriRengi(si);
          return (
            <g key={s.sutun.id} transform={`translate(${seriLejantlari[si]?.x ?? lejantBas}, ${satirTaban(0) - fs * 0.35})`}>
              <g data-seri-ornegi>
                <line x1={0} x2={24} y1={0} y2={0} stroke={renk} strokeWidth={2.5} strokeDasharray={kesik ? KESIK : undefined} />
                <circle cx={12} cy={0} r={4.5} fill={kesik ? RENK.kart : renk} stroke={kesik ? renk : RENK.kart} strokeWidth={2} />
              </g>
              <text x={ornekG} y={fs * 0.35} fontSize={fs} fontWeight={700} fill={RENK.metin}>
                {seriLejantlari[si]?.ad ?? s.sutun.ad}
              </text>
            </g>
          );
        })}
      {anahtar && (
        <RenkLejanti eslem={anahtar} x={renkAyniSatirda ? seriLejantSonu : lejantBas} y={renkLejantY} sagSinir={W - SAG} sayilar={lejantSayilari} />
      )}
      {/* Tek seride dikey eksenin adı (lejant yerine) */}
      {yEksenAdi && (
        <text x={Math.max(8, SOL - 10)} y={UST - 14} fontSize={fs} fontWeight={700} fill={RENK.metin} data-eksen="y">
          {metniSigdir(`↑ ${yEksenAdi}`, fs, W - SAG - 16, true)}
        </text>
      )}

      {/* Izgara, Y ekseni */}
      {eksen.isaretler.map((v) => (
        <g key={v}>
          <line x1={SOL} x2={W - SAG} y1={olcek.ileri(v)} y2={olcek.ileri(v)} stroke={RENK.izgara} />
          <text x={SOL - 8} y={olcek.ileri(v) + fs * 0.35} fontSize={fs} textAnchor="end" fill={RENK.metin}>
            {sayiMetni(v, isaretOndaligi)}
          </text>
        </g>
      ))}
      <line x1={SOL} x2={SOL} y1={UST} y2={taban} stroke={RENK.metin} strokeWidth={1.5} />
      <line x1={SOL} x2={W - SAG} y1={taban} y2={taban} stroke={RENK.metin} strokeWidth={1.5} />

      {/* X etiketleri (satır sırası): tek satır, iki satır ya da eğik */}
      {tablo.satirlar.map((r, i) => {
        const secili = seciliSatir === i;
        const satirlar = satirliEtiketler[i];
        if (!etiketYazilir(i)) return null;
        const x = xKonum(i);
        const y = taban + fs + 6;
        const ortak = {
          fontSize: fs,
          fontWeight: secili ? 800 : 500,
          fill: secili ? RENK.mercan : RENK.metin,
          style: { cursor: 'pointer' },
          onClick: () => onSatirSec(secili ? null : i),
        };
        if (egik || !satirlar) {
          const e = etiketler[i];
          return (
            <text key={r.id} x={x} y={y} textAnchor="end" transform={`rotate(-35 ${x} ${y})`} {...ortak}>
              {metniSigdir(e, fs, Math.min(egikEtiketG, (x - 4) / Math.cos((35 * Math.PI) / 180)), secili)}
            </text>
          );
        }
        return (
          <text key={r.id} x={x} y={y} textAnchor="middle" {...ortak}>
            {satirlar.map((s, k) => (
              <tspan key={k} x={x} dy={k === 0 ? 0 : fs + 3}>
                {s}
              </tspan>
            ))}
          </text>
        );
      })}
      {/* Yatay eksenin adı: ilk sütunun adı (Ay, Hafta) */}
      <text x={W - SAG} y={taban + etiketBlogu + fs + 6} fontSize={fs} fontWeight={700} textAnchor="end" fill={RENK.metin} data-eksen="x">
        {metniSigdir(`${xAdi} →`, fs, alanG, true)}
      </text>

      {seciliSatir !== null && seciliSatir < tablo.satirlar.length && (
        <line x1={xKonum(seciliSatir)} x2={xKonum(seciliSatir)} y1={UST} y2={taban} stroke={RENK.mercan} strokeDasharray="4 4" />
      )}

      {tumDegerler.length === 0 && (
        <text x={SOL + alanG / 2} y={(UST + taban) / 2} fontSize={fs} fontWeight={700} textAnchor="middle" fill={RENK.solukMetin}>
          Çizmek için sayısal değer girin
        </text>
      )}

      {/* Çok satırda: çizim alanı tek sekme durağı; oklar satırlar arasında gezer, dokunuş en yakın satırı seçer */}
      {cok && (
        <rect
          x={SOL}
          y={UST}
          width={alanG}
          height={Math.max(0, taban - UST)}
          fill="transparent"
          role="slider"
          tabIndex={0}
          aria-label="Satır seçimi: sağ ve sol ok tuşlarıyla satırlar arasında gezin"
          aria-valuemin={1}
          aria-valuemax={tablo.satirlar.length}
          aria-valuenow={(seciliSatir ?? 0) + 1}
          aria-valuetext={gezinmeMetni(seciliSatir)}
          stroke={gezinmeOdagi ? RENK.vurgu : 'none'}
          strokeWidth={gezinmeOdagi ? 3 : 0}
          style={{ cursor: 'pointer', outline: 'none' }}
          onFocus={() => setGezinmeOdagi(true)}
          onBlur={() => setGezinmeOdagi(false)}
          onPointerMove={(e) => {
            const s = enYakinSatir(e.clientX, e.clientY);
            if (s !== null) setUstunde((u) => (u && u.satir === s && u.sutun === -1 ? u : { sutun: -1, satir: s }));
          }}
          onPointerLeave={() => setUstunde(null)}
          onClick={(e) => {
            const s = enYakinSatir(e.clientX, e.clientY);
            if (s !== null) onSatirSec(seciliSatir === s ? null : s);
          }}
          onKeyDown={(e) => {
            const simdiki = seciliSatir ?? -1;
            if (e.key === 'ArrowRight' || e.key === 'ArrowUp') satiraGit(simdiki + 1);
            else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') satiraGit(simdiki < 0 ? 0 : simdiki - 1);
            else if (e.key === 'Home') satiraGit(0);
            else if (e.key === 'End') satiraGit(tablo.satirlar.length - 1);
            else return;
            e.preventDefault();
          }}
        />
      )}

      {/* Seriler: renk anahtarı varken her kategori ayrı çizgi (aynı kategorinin satırları sırayla birleşir) */}
      {seriNoktalari.map((s, si) => {
        const seriRenk = seriRengi(si);
        const kesikSeri = si > 0 && (anahtar !== null || ikinciKesikli);
        const bos = si > 0 && (anahtar !== null || ikinciKesikli);
        const noktaBul = new Map(s.noktalar.map((p) => [p.satir, p]));
        const gruplar = anahtar
          ? renkGruplari(
              anahtar,
              s.noktalar.map((p) => p.satir),
            ).map((g) => ({ ad: g.kategori ?? '', renk: g.renk, noktalar: g.satirlar.map((satir) => noktaBul.get(satir)!) }))
          : [{ ad: '', renk: seriRenk, noktalar: s.noktalar }];
        return (
          <g key={s.sutun.id} style={{ pointerEvents: cok ? 'none' : undefined }}>
            {gruplar.map((g) => (
              <path
                key={g.ad}
                d={g.noktalar.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')}
                fill="none"
                stroke={g.renk}
                strokeWidth={2.5}
                strokeDasharray={kesikSeri ? KESIK : undefined}
                strokeLinejoin="round"
                style={{ transition: gecis }}
                data-cizgi-grubu={anahtar ? g.ad : undefined}
              />
            ))}
            {s.noktalar.map((p) => {
              const secili = seciliSatir === p.satir;
              const aktif = vurguluMu(p.satir, s.indeks);
              const renk = satirRengi(anahtar, p.satir) ?? seriRenk;
              if (cok) {
                // Çok satırda yalnız vurgulu nokta çizilir (tutamaç yok)
                if (!aktif && !secili) return null;
                return <circle key={tablo.satirlar[p.satir]?.id ?? p.satir} cx={p.x} cy={p.y} r={6.5} fill={bos ? RENK.kart : renk} stroke={bos ? renk : RENK.metin} strokeWidth={2.5} />;
              }
              const etiket = satirEtiketi(tablo, p.satir);
              const kategori = anahtar?.satirKategorisi.get(p.satir);
              // 1. seri dolu, 2. seri (renk anahtarında ya da ikinciKesikli'de) içi boş nokta; seçili nokta koyu halka alır
              const dolgu = anahtar ? (bos && !secili ? RENK.kart : renk) : bos ? (secili ? renk : RENK.kart) : secili ? RENK.mercan : renk;
              const kenar = anahtar ? (secili ? RENK.metin : bos ? renk : RENK.kart) : bos ? (secili ? RENK.metin : renk) : RENK.kart;
              const kenarKalinligi = secili && (anahtar || bos) ? 3 : bos ? 2.5 : 2;
              const kategoriMetni = anahtar && kategori !== undefined && kategori !== etiket ? ` (${anahtar.ad}: ${kategori})` : '';
              return (
                <g
                  key={tablo.satirlar[p.satir]?.id ?? p.satir}
                  role="slider"
                  // Nokta veridir: PNG çıktısında kalır (tutamaç değil)
                  data-png-kalir
                  tabIndex={0}
                  aria-label={`${s.sutun.ad}, ${etiket}${kategoriMetni}: ${degerYazisi(p.deger)}. Sürükleyerek ya da ok tuşlarıyla değiştirin`}
                  aria-valuenow={p.deger}
                  aria-valuemin={eksen.min}
                  aria-valuemax={eksen.max}
                  style={{ cursor: 'ns-resize', outline: 'none' }}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
                    setSurukle({ sutun: s.indeks, satir: p.satir, eksen: canliEksen });
                    onSatirSec(p.satir);
                  }}
                  onPointerMove={isaretciHareket}
                  onPointerUp={(e) => {
                    (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
                    setSurukle(null);
                  }}
                  onPointerCancel={() => setSurukle(null)}
                  onPointerEnter={() => setUstunde({ sutun: s.indeks, satir: p.satir })}
                  onPointerLeave={() => setUstunde((u) => (u && u.satir === p.satir && u.sutun === s.indeks ? null : u))}
                  onFocus={() => setUstunde({ sutun: s.indeks, satir: p.satir })}
                  onBlur={() => setUstunde(null)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                      e.preventDefault();
                      onDegerDegis(p.satir, s.indeks, p.deger + (e.key === 'ArrowUp' ? yuvarlamaAdimi : -yuvarlamaAdimi), ondalikAdim);
                    } else if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSatirSec(secili ? null : p.satir);
                    }
                  }}
                >
                  <circle cx={p.x} cy={p.y} r={16} fill="transparent" />
                  <circle cx={p.x} cy={p.y} r={aktif ? 8 : secili ? 7 : 5.5} fill={dolgu} stroke={kenar} strokeWidth={kenarKalinligi} style={{ transition: gecis }} />
                </g>
              );
            })}
          </g>
        );
      })}

      {/* Değer etiketleri: hepsi (Değerleri göster) ya da yalnız vurgulu nokta; iki seride büyük değer üstte */}
      {yazilanEtiketler.map((e) => (
        <text
          key={`deger-${e.si}-${e.p.satir}`}
          x={e.p.x}
          y={e.altta ? e.p.y + fs + 8 : e.p.y - 10}
          fontSize={fs}
          fontWeight={e.kalin ? 800 : 600}
          textAnchor="middle"
          fill={RENK.metin}
          style={{ paintOrder: 'stroke', stroke: RENK.kart, strokeWidth: 3, strokeLinejoin: 'round', pointerEvents: 'none' }}
          data-deger-etiketi
        >
          {e.metin}
        </text>
      ))}

      {/* Değişim balonları: çizginin normali yönünde, noktalardan ve etiketlerden uzakta */}
      {balonlar.map((b) => {
        const merkez = { x: b.kutu.x + b.kutu.g / 2, y: b.kutu.y + b.kutu.h / 2 };
        return (
          <g key={b.anahtar} style={{ pointerEvents: 'none' }} data-degisim-balonu>
            <line x1={b.orta.x} y1={b.orta.y} x2={merkez.x} y2={merkez.y} stroke={b.renk} strokeWidth={1.5} />
            <circle cx={b.orta.x} cy={b.orta.y} r={2.5} fill={b.renk} />
            <rect x={b.kutu.x} y={b.kutu.y} width={b.kutu.g} height={b.kutu.h} rx={7} fill={b.renk} />
            <text x={merkez.x} y={b.kutu.y + BALON_Y / 2 + BALON_YAZI * 0.35} fontSize={BALON_YAZI} fontWeight={700} textAnchor="middle" fill={rengeGoreMetin(b.renk)}>
              {b.metin}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

'use client';

/**
 * Daire grafiği: değerler oransal dilimler; her dilimde merkez açı (°) ve yüzde (%).
 * - Yüzdeler ve açılar en büyük kalan yöntemiyle 0,1'e yuvarlanır: lejantta toplamları %100 ve 360°.
 * - Dilim renkleri 12 renkli kategori paletinden; komşu iki dilim (son ile ilk de) aynı rengi almaz.
 * - Dar dilimlerin etiketi dışarıda, ince kılavuz çizgiyle (ad, merkez açı, yüzde).
 * - Seçili (ya da üzerine gelinen) dilimde merkez açı yayı ve altta tek satırlık hesap şeridi:
 *   "Uyku: 9 ÷ 24 × 360° = 135° · %37,5".
 * - Dilim sınırı sürüklenince (tutamaç yalnız seçili / üzerine gelinen dilimde görünür) o dilim büyür ya da küçülür,
 *   ötekiler orantılı ölçeklenir. Her hareket, sürükleme başındaki değerlerden hesaplanır ve değerler yuvarlama
 *   adımına en büyük kalan yöntemiyle oturur: toplam birebir korunur; sınır başladığı yere dönünce değerler de döner.
 * - Renk anahtarı: satır dilimleri satırın kategori rengini alır, üstteki lejantta her kategorinin toplamdaki payı
 *   yazar. Kategorik dilimlerde (sıklık) anahtar başka bir değişkense dışta ince bir halka dilimi ona göre böler.
 * - 40'tan çok dilimde etiketler ve tutamaçlar gizlenir; dilimler arasında ok tuşlarıyla gezilir.
 */
import React, { useMemo, useRef, useState } from 'react';
import {
  adimaYuvarla,
  daireDilimleri,
  dilimYolu,
  enBuyukKalanlaYuvarla,
  gosterimOndaligi,
  halkaYolu,
  isaretciAcisi,
  kutupNoktasi,
  sinirSurukle,
  veriCozunurlugu,
  yaziBoyu,
} from './grafik';
import { BOS_KATEGORI_RENGI, KATEGORI_PALETI, kategoriRengi, kenarGerekir, satirRengi, type RenkEslemesi } from './kategorik';
import { RenkLejanti, renkLejantiGenisligi } from './RenkLejanti';
import { gecerliDegerler, satirEtiketi, type VeriTablosu } from './veri';
import { sayiMetni, temizle } from './istatistik';
import { GECIS, RENK, metinGenisligi, metniSigdir, svgKonumu } from './grafikOrtak';

export interface DaireGrafigiProps {
  tablo: VeriTablosu;
  sutun: number;
  seciliSatir: number | null;
  onSatirSec: (satir: number | null) => void;
  /** Sürükleme sonucu tüm dilimlerin son değerleri (satır indeksi → değer); toplam birebir korunur, yeniden yuvarlanmaz */
  onDegerlerDegis: (sutun: number, degerler: { satir: number; deger: number }[]) => void;
  genislik: number;
  yukseklik: number;
  azaltilmisHareket: boolean;
  /** Kategorik sıklık dilimleri: sınır sürükleme kapalı, seçim bileşenin içinde tutulur, açıklama gösterilir */
  surukleKapali?: boolean;
  aciklama?: string;
  /** Dilim renkleri (verilmezse kategori paletinden, komşular farklı) */
  renkler?: string[];
  /** Renk anahtarı (satır dilimleri): her dilim satırının kategori renginde */
  renkEslemi?: RenkEslemesi | null;
  /** Kategorik dilimlerde dış halka: dilim satırı → anahtar kategorilerine göre sayılar (eslem sırasıyla, sonda anahtarı boş olanlar) */
  halka?: { eslem: RenkEslemesi; sayilar: Map<number, number[]> } | null;
  /**
   * Sürüklemede değerlerin oturacağı adım (Grafik ayarları → Sürüklerken yuvarla; verilmezse 1). Verinin
   * çözünürlüğünden büyükse çözünürlük kullanılır (2,5 saatlik veride 0,5); toplam ÷ adım 2000'i aşarsa
   * toplam ÷ adım ≥ 100 olan en büyük 1-2-5 × 10^k adımı (100 000 TL → 1 000).
   */
  yuvarlamaAdimi?: number;
}

/** Bu kadar dilimden sonra dilim etiketleri ve sınır tutamaçları gizlenir (okunurluk ve hız) */
export const DAIRE_COK_DILIM = 40;

const katMi = (deger: number, adim: number) => Math.abs(deger / adim - Math.round(deger / adim)) < 1e-6;

/**
 * Daire sürüklemesinin yuvarlama adımı (bkz. `yuvarlamaAdimi`). Değerler 0,01'in katı değilse (verinin
 * çözünürlüğü yoksa) null: sürüklemede yuvarlama yapılmaz.
 */
export function daireAdimi(degerler: readonly number[], yuvarlamaAdimi = 1): number | null {
  const pozitif = degerler.filter((d) => Number.isFinite(d) && d > 0);
  const toplam = pozitif.reduce((t, d) => t + d, 0);
  if (!(toplam > 0)) return null;
  const temel = yuvarlamaAdimi > 0 && Number.isFinite(yuvarlamaAdimi) ? yuvarlamaAdimi : 1;
  const coz = veriCozunurlugu(pozitif);
  if (coz === null) return null;
  const adim = Math.min(temel, coz);
  if (toplam / adim <= 2000) return adim;
  // Büyük toplam: toplam ÷ adım ≥ 100 olan en büyük 1-2-5 × 10^k adım; verinin çözünürlüğünü bölmeli ki
  // değerler ilk dokunuşta kaymasın
  const tavan = toplam / 100;
  for (let k = Math.floor(Math.log10(tavan)); k >= -2; k--) {
    for (const c of [5, 2, 1]) {
      const s = temizle(c * 10 ** k);
      if (s > tavan + 1e-9 || s <= adim) continue;
      if (katMi(coz, s)) return s;
    }
  }
  return adim;
}

/**
 * `indeks`. dilimin değeri `hedef` olur (adıma yuvarlanır, [0, toplam] içinde); ötekiler kalan toplamla orantılı
 * ölçeklenir ve adıma en büyük kalan yöntemiyle oturur. Toplam birebir korunur. Negatif ya da geçersiz değerler 0
 * sayılır. Ötekilerin toplamı 0 ise kalan eşit paylaştırılır. Tek dilimde değer değişmez.
 */
export function daireDegerAyarla(degerler: readonly number[], indeks: number, hedef: number, adim: number | null): number[] {
  const pozitif = degerler.map((d) => (Number.isFinite(d) && d > 0 ? d : 0));
  if (indeks < 0 || indeks >= pozitif.length || pozitif.length < 2) return pozitif;
  const hamToplam = temizle(pozitif.reduce((t, d) => t + d, 0));
  if (hamToplam <= 0) return pozitif;
  const toplam = adim ? temizle(Math.round(temizle(hamToplam / adim)) * adim) : hamToplam;
  let v = Math.min(toplam, Math.max(0, Number.isFinite(hedef) ? hedef : pozitif[indeks]));
  if (adim) v = Math.min(toplam, Math.max(0, adimaYuvarla(v, adim)));
  const kalan = temizle(toplam - v);
  const digerleri = pozitif.filter((_, i) => i !== indeks);
  const digerToplam = digerleri.reduce((t, d) => t + d, 0);
  const olcekli = digerToplam > 0 ? digerleri.map((d) => (d * kalan) / digerToplam) : digerleri.map(() => kalan / digerleri.length);
  const yeni = adim ? enBuyukKalanlaYuvarla(olcekli, adim, kalan) : olcekli.map(temizle);
  yeni.splice(indeks, 0, temizle(v));
  return yeni;
}

/**
 * Sürüklemede yeni değerler: `anlik` sürükleme başındaki değerler; sınır işaretçi açısına gider (`sinirSurukle`),
 * dilimin değeri adıma oturur, ötekiler `daireDegerAyarla` ile. Başlangıç açısına dönünce `anlik` aynen döner.
 */
export function daireSurukle(anlik: readonly number[], indeks: number, isaretciAci: number, adim: number | null): number[] {
  const surekli = sinirSurukle([...anlik], indeks, isaretciAci);
  return daireDegerAyarla(anlik, indeks, surekli[indeks] ?? 0, adim);
}

/** Yüzdeler ve merkez açılar 0,1'e yuvarlanmış; toplamları %100 ve 360° (hepsi 0 ise sıfırlar) */
export function dilimOranlari(degerler: readonly number[]): { yuzdeler: number[]; acilar: number[] } {
  const pozitif = degerler.map((d) => (Number.isFinite(d) && d > 0 ? d : 0));
  return { yuzdeler: enBuyukKalanlaYuvarla(pozitif, 0.1, 100), acilar: enBuyukKalanlaYuvarla(pozitif, 0.1, 360) };
}

/**
 * Dilim renkleri: `kategoriRengi(etiket, i)` (12 renkli palet; "Kırmızı" gibi adlar kendi tonunu alır). Bir dilim
 * öncekiyle ya da son dilim ilk dilimle aynı renge düşerse paletteki sıradaki uygun renk seçilir.
 */
export function dilimRenkleri(etiketler: readonly string[]): string[] {
  const n = etiketler.length;
  const renkler = etiketler.map((e, i) => kategoriRengi(e, i));
  const P = KATEGORI_PALETI.length;
  for (let i = 1; i < n; i++) {
    const yasak = new Set<string>([renkler[i - 1]]);
    if (i === n - 1 && n > 2) yasak.add(renkler[0]);
    if (!yasak.has(renkler[i])) continue;
    for (let k = 1; k <= P; k++) {
      const aday = KATEGORI_PALETI[(i + k) % P];
      if (!yasak.has(aday)) {
        renkler[i] = aday;
        break;
      }
    }
  }
  return renkler;
}

/** Dilim etiketi yerleşimi: içeride (açı, yüzde, sığarsa ad), dışarıda (kılavuz çizgili tek satır) ya da yok */
type EtiketYeri =
  | { tur: 'ic'; rho: number; aciM: string; yuzdeM: string; ad: string | null }
  | { tur: 'dis'; metin: string }
  | { tur: 'yok' };

interface DisEtiket {
  i: number;
  metin: string;
  orta: number;
  sag: boolean;
  y: number;
}

/** Bir yandaki dış etiketleri üst üste binmeyecek biçimde dikeyde dağıtır (istenen y'ye en yakın) */
function yanaDiz(etiketler: DisEtiket[], ust: number, alt: number, aralik: number): void {
  etiketler.sort((a, b) => a.y - b.y);
  for (let k = 0; k < etiketler.length; k++) {
    const onceki = k > 0 ? etiketler[k - 1].y + aralik : ust;
    etiketler[k].y = Math.max(etiketler[k].y, onceki);
  }
  for (let k = etiketler.length - 1; k >= 0; k--) {
    const sonraki = k < etiketler.length - 1 ? etiketler[k + 1].y - aralik : alt;
    etiketler[k].y = Math.min(etiketler[k].y, sonraki);
  }
}

export function DaireGrafigi({
  tablo,
  sutun,
  seciliSatir,
  onSatirSec,
  onDegerlerDegis,
  genislik,
  yukseklik,
  azaltilmisHareket,
  surukleKapali = false,
  aciklama,
  renkler,
  renkEslemi = null,
  halka = null,
  yuvarlamaAdimi,
}: DaireGrafigiProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  /** Sürükleme başındaki değerler ve adım: her hareket bunlardan hesaplanır (toplam ve gidiş-dönüş korunur) */
  const anlikRef = useRef<{ indeks: number; degerler: number[]; adim: number | null } | null>(null);
  /** Klavyeyle ayarlama: aynı tutamaçta art arda basışlar ilk değerlerden hesaplanır */
  const klavyeRef = useRef<{ indeks: number; degerler: number[]; adim: number | null; hedef: number; son: number[] } | null>(null);
  const [surukle, setSurukle] = useState<number | null>(null);
  const [odak, setOdak] = useState<number | null>(null);
  const [ustunde, setUstunde] = useState<number | null>(null);
  const [yerelSecim, setYerelSecim] = useState<number | null>(null);
  const [odakDilim, setOdakDilim] = useState<number | null>(null);
  /** Sürükleme boyunca daire yerinde kalır: dış etiketler belirip kaybolunca yarıçap ve merkez değişmesin */
  const donukRef = useRef<{ r: number; cx: number } | null>(null);

  const W = Math.max(genislik, 240);
  const H = Math.max(yukseklik, 220);
  const fs = yaziBoyu(W);
  const noktalar = useMemo(() => gecerliDegerler(tablo, sutun), [tablo, sutun]);
  const degerler = useMemo(() => noktalar.map((n) => n.deger), [noktalar]);
  const dilimler = useMemo(() => daireDilimleri(noktalar), [noktalar]);
  const oranlar = useMemo(() => dilimOranlari(degerler), [degerler]);
  const ondalik = useMemo(() => gosterimOndaligi(degerler), [degerler]);
  const paletRenkleri = useMemo(() => dilimRenkleri(noktalar.map((n) => satirEtiketi(tablo, n.satir))), [noktalar, tablo]);
  const toplam = temizle(degerler.reduce((t, d) => t + (d > 0 ? d : 0), 0));
  const sutunAdi = tablo.sutunlar[sutun]?.ad ?? '';
  const sayi = (x: number) => sayiMetni(x, ondalik);
  const baslikY = fs + 5;

  // Sıklık dilimlerinde (surukleKapali) satırlar tablonun satırı değildir: seçim bileşenin içinde tutulur
  const secimIcerde = surukleKapali;
  const seciliSatirEtkin = secimIcerde ? yerelSecim : seciliSatir;
  const satirSec = (s: number | null) => (secimIcerde ? setYerelSecim(s) : onSatirSec(s));

  /** Negatif değer bir bütünün parçası olamaz: sessizce 0 saymak yerine grafik çizilmez ve nedeni yazılır */
  const negatif = noktalar.find((n) => n.deger < 0);
  const kabuk = (etiket: string, icerik: React.ReactNode) => (
    <svg
      data-grafik="daire"
      role="img"
      aria-label={etiket}
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      className="block select-none bg-card"
      style={{ fontFamily: 'Manrope, sans-serif' }}
    >
      <text x={16} y={baslikY} fontSize={fs} fontWeight={700} fill={RENK.metin}>
        {metniSigdir(sutunAdi, fs, W - 32, true)}
      </text>
      {icerik}
    </svg>
  );
  if (negatif) {
    return kabuk(
      `${sutunAdi} daire grafiği çizilemedi`,
      <g>
        <text x={W / 2} y={H / 2 - fs * 1.4} fontSize={fs} fontWeight={700} textAnchor="middle" fill={RENK.metin} data-daire-negatif>
          Daire grafiği negatif değer gösteremez
        </text>
        <text x={W / 2} y={H / 2 + 2} fontSize={fs} fontWeight={600} textAnchor="middle" fill={RENK.metin}>
          {metniSigdir(`${satirEtiketi(tablo, negatif.satir)}: ${sayi(negatif.deger)}`, fs, W - 32)}
        </text>
        <text x={W / 2} y={H / 2 + fs * 1.4 + 2} fontSize={fs} textAnchor="middle" fill={RENK.solukMetin}>
          {metniSigdir('Her dilim bir bütünün parçası olmalı; sütun ya da çizgi grafiğini deneyin.', fs, W - 32)}
        </text>
      </g>,
    );
  }
  if (noktalar.length === 0) {
    return kabuk(
      `${sutunAdi} daire grafiği: veri yok`,
      <g data-daire-bos>
        <text x={W / 2} y={H / 2 - 4} fontSize={fs} fontWeight={700} textAnchor="middle" fill={RENK.solukMetin}>
          Grafik için veri yok
        </text>
        <text x={W / 2} y={H / 2 + fs + 4} fontSize={fs} textAnchor="middle" fill={RENK.solukMetin}>
          {metniSigdir('Tabloya sayı girince dilimler burada belirir.', fs, W - 32)}
        </text>
      </g>,
    );
  }

  const cok = dilimler.length > DAIRE_COK_DILIM;
  const surukleVar = !surukleKapali && !cok && toplam > 0 && dilimler.length >= 2;
  const seciliIndeks = seciliSatirEtkin === null ? -1 : dilimler.findIndex((d) => d.satir === seciliSatirEtkin);
  /** Merkez açı yayı, hesap şeridi ve tutamaç gösterilen dilim: sürüklenen, odaklı, seçili ya da üzerine gelinen */
  const gosterilen = surukle ?? odak ?? (seciliIndeks >= 0 ? seciliIndeks : null) ?? ustunde;

  // ── Yerleşim ────────────────────────────────────────────────────────────────
  const lejantSagda = W >= 520;
  const lejantMetni = (i: number) =>
    `${satirEtiketi(tablo, dilimler[i].satir)}: ${sayi(dilimler[i].deger)} (${sayiMetni(oranlar.acilar[i], 1)}°, %${sayiMetni(oranlar.yuzdeler[i], 1)})`;
  // Sağdaki lejant en uzun satırı kadar geniş (en çok grafiğin %38'i ve 340 px); sığmayan satır kısalır
  const lejantEnUzun = dilimler.slice(0, 60).reduce((m, _, i) => Math.max(m, metinGenisligi(lejantMetni(i), fs, true)), 0);
  const lejantG = lejantSagda ? Math.min(Math.max(160, lejantEnUzun + 40), W * 0.38, 340) : 0;
  const aciklamaY = baslikY + fs + 7;
  // Renk anahtarı: satır dilimlerinde kategori rengi, kategorik dilimlerde dış halka; lejant başlığın yanında
  // (sığmazsa açıklamanın altında, daire o kadar aşağı iner)
  const anahtar = renkEslemi && renkEslemi.sutun !== sutun && renkEslemi.sutun >= 0 && renkEslemi.sutun < tablo.sutunlar.length ? renkEslemi : null;
  const lejantEslemi = halka?.eslem ?? anahtar;
  const dilimRengi = (satir: number, i: number) => (anahtar ? satirRengi(anahtar, satir) ?? BOS_KATEGORI_RENGI : renkler?.[i] ?? paletRenkleri[i]);
  let paylar: Map<string, string> | undefined;
  if (anahtar && toplam > 0) {
    const kategoriToplami = new Map<string, number>();
    for (const n of noktalar) {
      const k = anahtar.satirKategorisi.get(n.satir);
      if (k !== undefined && n.deger > 0) kategoriToplami.set(k, (kategoriToplami.get(k) ?? 0) + n.deger);
    }
    const payDegerleri = enBuyukKalanlaYuvarla(
      anahtar.kategoriler.map((k) => kategoriToplami.get(k) ?? 0),
      0.1,
      100,
    );
    paylar = new Map(anahtar.kategoriler.map((k, j) => [k, `%${sayiMetni(payDegerleri[j], 1)}`]));
  }
  const halkaSayilari = halka
    ? new Map(halka.eslem.kategoriler.map((k, j) => [k, [...halka.sayilar.values()].reduce((t, s) => t + (s[j] ?? 0), 0)]))
    : undefined;
  const baslikMetni = `${sutunAdi}${toplam > 0 ? ` · toplam ${sayi(toplam)}` : ''}`;
  const baslikG = metinGenisligi(baslikMetni, fs, true);
  const lejantBaslikta = lejantEslemi !== null && 16 + baslikG + 20 + renkLejantiGenisligi(lejantEslemi, halkaSayilari, paylar) <= W - 16;
  const anahtarLejantY = lejantBaslikta ? baslikY : (aciklama ? aciklamaY : baslikY) + 22;
  const ustAlan = (aciklama ? aciklamaY : baslikY) + 12 + (lejantEslemi && !lejantBaslikta ? 22 : 0);

  const lejantSatirTemel = fs + 10;
  const altLejantY = lejantSagda ? 0 : Math.min(H * 0.32, lejantSatirTemel * Math.ceil(dilimler.length / 2) + 8);
  const seritY = toplam > 0 ? fs + 18 : 0;
  const alanG = W - lejantG;
  const alanUst = ustAlan;
  const alanAlt = H - altLejantY - seritY;
  const alanY = Math.max(80, alanAlt - alanUst);
  const halkaPayi = halka ? 20 : 0;
  const cy = alanUst + alanY / 2;
  const rUst = Math.max(40, Math.min(alanG / 2 - 24, alanY / 2 - 10) - halkaPayi);

  const etiketYerleri = (rr: number): EtiketYeri[] =>
    dilimler.map((d, i): EtiketYeri => {
      if (cok || d.aci <= 0 || toplam <= 0) return { tur: 'yok' };
      const aciM = `${sayiMetni(oranlar.acilar[i], 1)}°`;
      const yuzdeM = `%${sayiMetni(oranlar.yuzdeler[i], 1)}`;
      const ad = satirEtiketi(tablo, d.satir);
      if (d.aci >= 359.9) return { tur: 'ic', rho: 0, aciM, yuzdeM, ad };
      const rho = rr * (d.aci < 60 ? 0.68 : 0.6);
      // Yazı bloğunun merkeze en yakın satırındaki kiriş (dilim orada en dar)
      const kiris = (satir: number) => 2 * Math.max(0, rho - (satir * (fs + 2)) / 2) * Math.sin((Math.min(d.aci, 180) * Math.PI) / 360);
      const w = Math.max(metinGenisligi(aciM, fs, true), metinGenisligi(yuzdeM, fs, true));
      if (d.aci >= 16 && kiris(2) >= w + 8 && rr - rho >= fs + 4) {
        const adSigar = kiris(3) >= Math.max(w, metinGenisligi(ad, fs, true)) + 8 && rr - rho >= fs * 1.6;
        return { tur: 'ic', rho, aciM, yuzdeM, ad: adSigar ? ad : null };
      }
      return { tur: 'dis', metin: `${ad}: ${aciM} · ${yuzdeM}` };
    });
  // Dış etiket varsa daire, etiketlerin bulunduğu yana sığacağı kadar küçülür (en çok %38) ve öteki yana kayar;
  // yine sığmayan etiket kısalır
  const ortaAci = (i: number) => (dilimler[i].baslangicAci + dilimler[i].bitisAci) / 2;
  const yanGerek = (liste: EtiketYeri[], sag: boolean) =>
    liste.reduce((m, e, i) => (e.tur === 'dis' && ortaAci(i) <= 180 === sag ? Math.max(m, metinGenisligi(e.metin, fs) + 34) : m), 12);
  let r = rUst;
  let yerler = etiketYerleri(r);
  for (let tur = 0; tur < 3; tur++) {
    const sol = yanGerek(yerler, false);
    const sag = yanGerek(yerler, true);
    if (sol <= 12 && sag <= 12) break;
    const dikeySinir = alanY / 2 - fs - 8 - halkaPayi;
    const yatay = (alanG - sol - sag) / 2 - halkaPayi;
    const yeniR = Math.max(40, Math.max(Math.min(rUst * 0.62, dikeySinir), Math.min(rUst, yatay, dikeySinir)));
    if (Math.abs(yeniR - r) < 0.5) break;
    r = yeniR;
    yerler = etiketYerleri(r);
  }
  const solBos = yanGerek(yerler, false) + halkaPayi;
  const sagBos = yanGerek(yerler, true) + halkaPayi;
  const artan = alanG - solBos - sagBos - 2 * r;
  let cx = artan >= 0 ? solBos + r + artan / 2 : alanG / 2;
  const donuk = surukle !== null ? donukRef.current : null;
  if (donuk) {
    r = donuk.r;
    cx = donuk.cx;
    yerler = etiketYerleri(r);
  }
  const disR = r + (halka ? 18 : 6);
  const disEtiketler: DisEtiket[] = [];
  yerler.forEach((e, i) => {
    if (e.tur !== 'dis') return;
    const d = dilimler[i];
    const orta = (d.baslangicAci + d.bitisAci) / 2;
    const p = kutupNoktasi(cx, cy, disR + 12, orta);
    disEtiketler.push({ i, metin: e.metin, orta, sag: orta <= 180, y: p.y + fs * 0.35 });
  });
  const satirAraligi = fs + 5;
  const disUst = alanUst + fs;
  const disAlt = alanAlt - 4;
  yanaDiz(
    disEtiketler.filter((e) => e.sag),
    disUst,
    disAlt,
    satirAraligi,
  );
  yanaDiz(
    disEtiketler.filter((e) => !e.sag),
    disUst,
    disAlt,
    satirAraligi,
  );

  const gecis = azaltilmisHareket || surukle !== null ? 'none' : `d 300ms ${GECIS}`;

  // ── Sürükleme ve klavye ─────────────────────────────────────────────────────
  const degerleriBildir = (yeni: number[]) => {
    if (yeni.length !== noktalar.length) return;
    if (yeni.every((v, k) => Math.abs(v - degerler[k]) < 1e-9)) return;
    onDegerlerDegis(
      sutun,
      yeni.map((deger, k) => ({ satir: noktalar[k].satir, deger })),
    );
  };

  const isaretciHareket = (e: React.PointerEvent<SVGElement>) => {
    const anlik = anlikRef.current;
    if (surukle === null || !anlik || !svgRef.current) return;
    const { x, y } = svgKonumu(svgRef.current, e.clientX, e.clientY);
    if (Math.hypot(x - cx, y - cy) < 6) return; // merkezde açı belirsiz
    degerleriBildir(daireSurukle(anlik.degerler, anlik.indeks, isaretciAcisi(cx, cy, x, y), anlik.adim));
  };

  const surukleBaslat = (e: React.PointerEvent<SVGElement>, i: number) => {
    e.preventDefault();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    anlikRef.current = { indeks: i, degerler: [...degerler], adim: daireAdimi(degerler, yuvarlamaAdimi) };
    donukRef.current = { r, cx };
    klavyeRef.current = null;
    setSurukle(i);
    satirSec(noktalar[i].satir);
  };

  const surukleBitir = (e: React.PointerEvent<SVGElement>) => {
    (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
    anlikRef.current = null;
    donukRef.current = null;
    setSurukle(null);
  };

  const klavyeAyarla = (i: number, yon: 1 | -1) => {
    let k = klavyeRef.current;
    const guncel = k !== null && k.indeks === i && k.son.length === degerler.length && k.son.every((v, j) => Math.abs(v - degerler[j]) < 1e-9);
    if (!k || !guncel) {
      k = { indeks: i, degerler: [...degerler], adim: daireAdimi(degerler, yuvarlamaAdimi), hedef: degerler[i], son: [...degerler] };
    }
    const birim = k.adim ?? temizle(toplam / 100);
    const hedef = Math.min(toplam, Math.max(0, temizle(k.hedef + yon * birim)));
    const yeni = daireDegerAyarla(k.degerler, i, hedef, k.adim);
    klavyeRef.current = { ...k, hedef, son: yeni };
    degerleriBildir(yeni);
  };

  // Çok dilimde gezinme: dilimler tek sekme durağıdır, oklar seçimi (ve odağı) komşu dilime taşır
  const dilimeGit = (j: number) => {
    const n = dilimler.length;
    const hedef = ((j % n) + n) % n;
    satirSec(dilimler[hedef].satir);
    svgRef.current?.querySelector<SVGPathElement>(`[data-dilim-indeksi="${hedef}"]`)?.focus();
  };
  const gezinmeIndeksi = seciliIndeks >= 0 ? seciliIndeks : 0;

  // ── Lejant ───────────────────────────────────────────────────────────────────
  const lejantOgeleri = dilimler.map((d, i) => ({
    d,
    i,
    renk: dilimRengi(d.satir, i),
    etiket: satirEtiketi(tablo, d.satir),
    secili: seciliSatirEtkin === d.satir,
  }));
  // Lejant kaba sığmalı: çok dilimde satır aralığı daralır, yine sığmazsa kalanlar "… ve k dilim daha" olur
  const lejantUst = ustAlan + 4;
  const lejantAlan = lejantSagda ? H - lejantUst - seritY - 6 : altLejantY - 4;
  const lejantSatirSayisi = Math.max(1, lejantSagda ? lejantOgeleri.length : Math.ceil(lejantOgeleri.length / 2));
  const lejantSatirYuk = Math.min(fs + 11, Math.max(fs + 4, Math.floor(lejantAlan / lejantSatirSayisi)));
  const sigacakOge = Math.max(1, Math.floor(lejantAlan / lejantSatirYuk)) * (lejantSagda ? 1 : 2);
  const lejantKirpildi = lejantOgeleri.length > sigacakOge;
  const gosterilenLejant = lejantKirpildi ? lejantOgeleri.slice(0, Math.max(1, sigacakOge - (lejantSagda ? 1 : 2))) : lejantOgeleri;
  const lejantOgeG = lejantSagda ? lejantG - 8 : (W - 32) / 2 - 4;

  // ── Hesap şeridi ─────────────────────────────────────────────────────────────
  let hesap: { metin: string; renk: string } | null = null;
  if (gosterilen !== null && gosterilen < dilimler.length && toplam > 0) {
    const d = dilimler[gosterilen];
    const tamAci = d.deger > 0 ? (d.deger / toplam) * 360 : 0;
    const tamYuzde = d.deger > 0 ? (d.deger / toplam) * 100 : 0;
    const aci = oranlar.acilar[gosterilen];
    const yuzde = oranlar.yuzdeler[gosterilen];
    const aciEsit = Math.abs(tamAci - aci) < 1e-9;
    const yuzdeEsit = Math.abs(tamYuzde - yuzde) < 1e-9;
    hesap = {
      metin: `${satirEtiketi(tablo, d.satir)}: ${sayi(Math.max(0, d.deger))} ÷ ${sayi(toplam)} × 360° ${aciEsit ? '=' : '≈'} ${sayiMetni(aci, 1)}° · ${yuzdeEsit ? '' : '≈ '}%${sayiMetni(yuzde, 1)}`,
      renk: dilimRengi(d.satir, gosterilen),
    };
  }
  const seritBaz = alanAlt + fs + 4;

  return (
    <svg
      ref={svgRef}
      data-grafik="daire"
      role="img"
      aria-label={`${sutunAdi} daire grafiği`}
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      className="block select-none bg-card"
      style={{ fontFamily: 'Manrope, sans-serif', touchAction: 'none' }}
    >
      <text x={16} y={baslikY} fontSize={fs} fontWeight={700} fill={RENK.metin}>
        {metniSigdir(baslikMetni, fs, W - 32, true)}
      </text>
      {lejantEslemi && (
        <RenkLejanti
          eslem={lejantEslemi}
          x={lejantBaslikta ? 16 + baslikG + 20 : 16}
          y={anahtarLejantY}
          sagSinir={lejantBaslikta || !lejantSagda ? W - 16 : W - lejantG - 8}
          sayilar={halkaSayilari}
          ekler={paylar}
        />
      )}
      {aciklama && (
        <text x={16} y={aciklamaY} fontSize={fs} fill={RENK.solukMetin}>
          {metniSigdir(aciklama, fs, W - 32)}
        </text>
      )}

      {toplam <= 0 && (
        // Bütün değerler 0: ileti grafik alanının ortasında
        <text x={W / 2} y={alanUst + alanY / 2} fontSize={fs} fontWeight={700} textAnchor="middle" fill={RENK.solukMetin} data-daire-sifir>
          Daire için pozitif değerler gerekir
        </text>
      )}

      {/* Dilimler */}
      {dilimler.map((d, i) => {
        const secili = seciliSatirEtkin === d.satir;
        const aktif = secili || ustunde === i || surukle === i || odak === i;
        // Dış halka varken dilim büyümez (halkaya binmesin); vurgu opaklıkla kalır
        const yol = dilimYolu(cx, cy, r + (aktif && !halka ? 6 : 0), d.baslangicAci, d.bitisAci);
        if (!yol) return null;
        const odakli = cok && odakDilim === i;
        const dolgu = dilimRengi(d.satir, i);
        // "Beyaz" / "Siyah" dilimi kart zemininde kaybolmasın: metin renginde kenar
        const kenar = kenarGerekir(dolgu);
        return (
          <path
            key={tablo.satirlar[d.satir]?.id ?? d.satir}
            d={yol}
            fill={dolgu}
            fillOpacity={aktif ? 1 : 0.9}
            stroke={odakli || kenar ? RENK.metin : RENK.kart}
            strokeWidth={odakli ? 3 : kenar ? 1.5 : cok ? 1 : 2}
            style={{ cursor: 'pointer', transition: gecis, outline: 'none' }}
            data-dilim-indeksi={i}
            tabIndex={cok ? (i === gezinmeIndeksi ? 0 : -1) : undefined}
            role={cok ? 'button' : undefined}
            aria-pressed={cok ? secili : undefined}
            aria-label={cok ? `${satirEtiketi(tablo, d.satir)}: ${sayi(d.deger)} (${sayiMetni(oranlar.acilar[i], 1)}°, %${sayiMetni(oranlar.yuzdeler[i], 1)}). Ok tuşlarıyla öteki dilimlere geçin` : undefined}
            onFocus={cok ? () => setOdakDilim(i) : undefined}
            onBlur={cok ? () => setOdakDilim((o) => (o === i ? null : o)) : undefined}
            onKeyDown={
              cok
                ? (e) => {
                    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') dilimeGit(i + 1);
                    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') dilimeGit(i - 1);
                    else if (e.key === 'Home') dilimeGit(0);
                    else if (e.key === 'End') dilimeGit(dilimler.length - 1);
                    else if (e.key === 'Enter' || e.key === ' ') satirSec(secili ? null : d.satir);
                    else return;
                    e.preventDefault();
                  }
                : undefined
            }
            onClick={() => satirSec(secili ? null : d.satir)}
            onPointerEnter={() => setUstunde(i)}
            onPointerLeave={() => setUstunde((u) => (u === i ? null : u))}
          />
        );
      })}

      {/* Dış halka: her kategorik dilim, renk anahtarının kategorilerine oranla bölünür */}
      {halka && toplam > 0 && (
        <g data-halka>
          {dilimler.map((d) => {
            const sayilar = halka.sayilar.get(d.satir);
            const t = sayilar ? sayilar.reduce((a, b) => a + b, 0) : 0;
            if (!sayilar || t <= 0 || d.aci <= 0) return null;
            let a0 = d.baslangicAci;
            return sayilar.map((c, j) => {
              if (c <= 0) return null;
              const a1 = a0 + (d.aci * c) / t;
              const yol = halkaYolu(cx, cy, r + 5, r + 17, a0, a1);
              a0 = a1;
              const ad = j < halka.eslem.kategoriler.length ? halka.eslem.kategoriler[j] : null;
              const renk = ad === null ? BOS_KATEGORI_RENGI : halka.eslem.renkler.get(ad) ?? BOS_KATEGORI_RENGI;
              return (
                <path key={`${d.satir}-${j}`} d={yol} fill={renk} fillRule="evenodd" stroke={kenarGerekir(renk) ? RENK.metin : RENK.kart} strokeWidth={1.5} data-halka-parcasi>
                  <title>{`${satirEtiketi(tablo, d.satir)} · ${halka.eslem.ad} ${ad ?? '(boş)'}: ${c}`}</title>
                </path>
              );
            });
          })}
        </g>
      )}

      {/* Sınır çizgileri (dekoratif) */}
      {toplam > 0 &&
        !cok &&
        dilimler.length >= 2 &&
        dilimler.map((d, i) => {
          if (d.aci >= 359.9) return null;
          const p = kutupNoktasi(cx, cy, r, d.bitisAci);
          return <line key={`cizgi-${tablo.satirlar[d.satir]?.id ?? d.satir}`} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke={RENK.kart} strokeWidth={surukle === i ? 3 : 2} style={{ pointerEvents: 'none' }} />;
        })}

      {/* Merkez açı yayı: gösterilen dilimin merkezdeki açısı */}
      {gosterilen !== null &&
        gosterilen < dilimler.length &&
        toplam > 0 &&
        dilimler[gosterilen].aci > 0 &&
        (() => {
          const d = dilimler[gosterilen];
          // Ders kitabındaki gibi köşeye yakın küçük yay: mürekkep renginde, kart renginde haleli (her dilim renginde okunur)
          const ra = Math.max(18, Math.min(40, r * 0.25));
          const tam = d.aci >= 359.9;
          const b = kutupNoktasi(cx, cy, ra, d.baslangicAci);
          const s = kutupNoktasi(cx, cy, ra, d.bitisAci);
          const yay = tam
            ? `M ${cx} ${cy - ra} A ${ra} ${ra} 0 1 1 ${cx} ${cy + ra} A ${ra} ${ra} 0 1 1 ${cx} ${cy - ra}`
            : `M ${b.x} ${b.y} A ${ra} ${ra} 0 ${d.aci > 180 ? 1 : 0} 1 ${s.x} ${s.y}`;
          return (
            <g data-merkez-acisi style={{ pointerEvents: 'none' }}>
              <path d={yay} fill="none" stroke={RENK.kart} strokeWidth={5.5} strokeLinecap="round" />
              <path d={yay} fill="none" stroke={RENK.metin} strokeWidth={2.5} strokeLinecap="round" />
              <circle cx={cx} cy={cy} r={4} fill={RENK.metin} stroke={RENK.kart} strokeWidth={1.5} />
            </g>
          );
        })()}

      {/* Dilim içi etiketler: açı, yüzde ve (sığarsa) ad */}
      {yerler.map((e, i) => {
        if (e.tur !== 'ic') return null;
        const d = dilimler[i];
        const orta = (d.baslangicAci + d.bitisAci) / 2;
        const p = e.rho === 0 ? { x: cx, y: cy } : kutupNoktasi(cx, cy, e.rho, orta);
        // Sığarsa önce ad (kalın), sonra merkez açı ve yüzde
        const satirlar: [string, number][] = e.ad ? [[e.ad, 800], [e.aciM, 700], [e.yuzdeM, 600]] : [[e.aciM, 800], [e.yuzdeM, 700]];
        const ilk = p.y - ((satirlar.length - 1) * (fs + 2)) / 2 + fs * 0.35;
        const golge = { paintOrder: 'stroke' as const, stroke: 'rgba(21, 48, 45, 0.35)', strokeWidth: 2.5, strokeLinejoin: 'round' as const };
        return (
          <g key={`etiket-${tablo.satirlar[d.satir]?.id ?? d.satir}`} style={{ pointerEvents: 'none' }} data-dilim-etiketi="ic">
            {satirlar.map(([metin, kalinlik], k) => (
              <text key={k} x={p.x} y={ilk + k * (fs + 2)} fontSize={fs} fontWeight={kalinlik} textAnchor="middle" fill="#ffffff" style={golge}>
                {metin}
              </text>
            ))}
          </g>
        );
      })}

      {/* Dar dilimlerin etiketleri: dışarıda, ince kılavuz çizgiyle */}
      {disEtiketler.map((e) => {
        const d = dilimler[e.i];
        const p0 = kutupNoktasi(cx, cy, r + (halka ? 17 : 1), e.orta);
        const p1 = kutupNoktasi(cx, cy, disR + 6, e.orta);
        const x = e.sag ? Math.max(p1.x + 8, cx + disR + 14) : Math.min(p1.x - 8, cx - disR - 14);
        const sinir = e.sag ? alanG - 6 - x : x - 6;
        const secili = seciliSatirEtkin === d.satir;
        return (
          <g key={`dis-${tablo.satirlar[d.satir]?.id ?? d.satir}`} data-dilim-etiketi="dis" style={{ cursor: 'pointer' }} onClick={() => satirSec(secili ? null : d.satir)}>
            <polyline points={`${p0.x},${p0.y} ${p1.x},${p1.y} ${x + (e.sag ? -4 : 4)},${e.y - fs * 0.32}`} fill="none" stroke={RENK.solukMetin} strokeWidth={1.2} />
            <text x={x} y={e.y} fontSize={fs} fontWeight={secili ? 800 : 600} textAnchor={e.sag ? 'start' : 'end'} fill={RENK.metin}>
              {metniSigdir(e.metin, fs, Math.max(40, sinir), secili)}
            </text>
          </g>
        );
      })}

      {/* Sınır tutamaçları: dokunma alanı her sınırda; görünen tutamaç yalnız gösterilen / seçili / üzerine gelinen dilimde */}
      {surukleVar &&
        dilimler.map((d, i) => {
          const p = kutupNoktasi(cx, cy, r, d.bitisAci);
          const odakli = odak === i;
          const gorunur = surukle === i || odakli || seciliIndeks === i || ustunde === i;
          const aciM = sayiMetni(oranlar.acilar[i], 1);
          const yuzdeM = sayiMetni(oranlar.yuzdeler[i], 1);
          return (
            <g
              key={`sinir-${tablo.satirlar[d.satir]?.id ?? d.satir}`}
              role="slider"
              onFocus={() => setOdak(i)}
              onBlur={() => {
                setOdak((o) => (o === i ? null : o));
                klavyeRef.current = null;
              }}
              tabIndex={0}
              aria-label={`${satirEtiketi(tablo, d.satir)} dilimi: ${sayi(d.deger)} (${aciM}°, %${yuzdeM}). Sınırı sürükleyerek ya da ok tuşlarıyla değiştirin`}
              aria-valuenow={d.deger}
              aria-valuemin={0}
              aria-valuemax={toplam}
              aria-valuetext={`${sayi(d.deger)}, ${aciM}°, %${yuzdeM}`}
              style={{ cursor: surukle === i ? 'grabbing' : 'grab', outline: 'none' }}
              onPointerDown={(e) => surukleBaslat(e, i)}
              onPointerMove={isaretciHareket}
              onPointerUp={surukleBitir}
              onPointerCancel={surukleBitir}
              onPointerEnter={() => setUstunde(i)}
              onPointerLeave={() => setUstunde((u) => (u === i ? null : u))}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight' || e.key === 'ArrowUp') klavyeAyarla(i, 1);
                else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') klavyeAyarla(i, -1);
                else if (e.key === 'Enter' || e.key === ' ') satirSec(seciliIndeks === i ? null : d.satir);
                else return;
                e.preventDefault();
              }}
            >
              <circle cx={p.x} cy={p.y} r={22} fill="transparent" />
              {/* Klavye odağı: belirgin halka (WCAG 2.4.7) */}
              {odakli && <circle cx={p.x} cy={p.y} r={16} fill="none" stroke={RENK.vurgu} strokeWidth={3} data-odak-halkasi data-yalniz-ekran />}
              {gorunur && (
                <g data-tutamac>
                  <circle cx={p.x} cy={p.y} r={surukle === i || odakli ? 11 : 9.5} fill={RENK.kart} stroke={RENK.metin} strokeWidth={2.5} />
                  <circle cx={p.x} cy={p.y} r={3.5} fill={RENK.metin} />
                </g>
              )}
            </g>
          );
        })}

      {/* Lejant: ad, değer, merkez açı ve yüzde (yüzdeler %100, açılar 360° eder) */}
      <g transform={lejantSagda ? `translate(${W - lejantG + 8}, ${lejantUst + fs})` : `translate(16, ${H - altLejantY + fs})`} data-daire-lejanti>
        {gosterilenLejant.map((o, k) => {
          const x = lejantSagda ? 0 : (k % 2) * ((W - 32) / 2);
          const y = lejantSagda ? k * lejantSatirYuk : Math.floor(k / 2) * lejantSatirYuk;
          const metin = lejantMetni(o.i);
          return (
            <g
              key={tablo.satirlar[o.d.satir]?.id ?? o.i}
              transform={`translate(${x}, ${y})`}
              style={{ cursor: 'pointer' }}
              onClick={() => satirSec(o.secili ? null : o.d.satir)}
              onPointerEnter={() => setUstunde(o.i)}
              onPointerLeave={() => setUstunde((u) => (u === o.i ? null : u))}
            >
              <rect x={-6} y={-fs + 1} width={lejantOgeG} height={lejantSatirYuk - 2} rx={6} fill={o.secili ? RENK.vurgu : 'transparent'} fillOpacity={0.18} />
              <rect y={-fs + 3} width={14} height={14} rx={4} fill={o.renk} stroke={kenarGerekir(o.renk) ? RENK.metin : undefined} strokeWidth={kenarGerekir(o.renk) ? 1.5 : undefined} />
              <text x={20} y={0} fontSize={fs} fontWeight={o.secili ? 800 : 600} fill={RENK.metin}>
                {metniSigdir(metin, fs, lejantOgeG - 28, o.secili)}
              </text>
            </g>
          );
        })}
        {lejantKirpildi && (
          <text
            x={0}
            y={(lejantSagda ? gosterilenLejant.length : Math.ceil(gosterilenLejant.length / 2)) * lejantSatirYuk}
            fontSize={fs}
            fontWeight={600}
            fill={RENK.solukMetin}
            data-lejant-kirpildi
          >
            … ve {lejantOgeleri.length - gosterilenLejant.length} dilim daha
          </text>
        )}
      </g>

      {/* Hesap şeridi: gösterilen dilimin merkez açısı ve yüzdesi; dilim yokken yol gösterir (yalnız ekranda) */}
      {toplam > 0 &&
        (hesap ? (
          <g data-daire-hesap style={{ pointerEvents: 'none' }}>
            {(() => {
              const metin = metniSigdir(hesap.metin, fs, alanG - 44, true);
              const g = 20 + metinGenisligi(metin, fs, true);
              const x0 = Math.max(8, Math.min(cx - g / 2, alanG - g - 8));
              return (
                <>
                  <circle cx={x0 + 7} cy={seritBaz - fs * 0.35} r={6} fill={hesap.renk} />
                  <text x={x0 + 20} y={seritBaz} fontSize={fs} fontWeight={700} fill={RENK.metin}>
                    {metin}
                  </text>
                </>
              );
            })()}
          </g>
        ) : (
          <text x={cx} y={seritBaz} fontSize={fs} textAnchor="middle" fill={RENK.solukMetin} data-yalniz-ekran data-daire-ipucu>
            {metniSigdir(
              surukleVar ? 'Bir dilime dokunun: merkez açısının hesabı burada görünür; sınırını sürükleyin.' : 'Bir dilime dokunun: merkez açısının hesabı burada görünür.',
              fs,
              alanG - 24,
            )}
          </text>
        ))}
    </svg>
  );
}

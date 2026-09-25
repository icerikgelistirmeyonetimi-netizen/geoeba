'use client';

/**
 * Çark sahnesi (VT §11.5, K7). viewBox 200 × 200, `boyut` piksele ölçeklenir.
 * - Disk sabittir: dilimler kategori renginde, aralarında 2 birimlik kart renginde ayraç; dış kasnak.
 *   Etiketler dik durur (döndürülmez): dilim ortasında 0,64 r'de, rengeGoreMetin. 40°'den dar dilimin etiketi
 *   dışarıda durur (0,95 r → 1,08 r kılavuz çizgisi); o zaman disk küçülür. Sığmayan etiket kısaltılır ya da
 *   (çok dar, yana bakan dilimde) yazılmaz: adlar sayaçta ve düzenleyicide yazar. Yüzdeler sahnede yazılmaz.
 * - İbre: pusula iğnesi — sivri uç merkezden 0,46 r'de, taban 20 birim, kısa yuvarlak kuyruk; mürekkep dolgu,
 *   sol yarıda ışık payı, sabit yönlü gölge (ayrı döner, ışık hep sol üstten gelir); yuvarlak göbek r = 10.
 *   İbrenin durduğu açı etiketlerden uzak seçilir (ibreDurmaAcisi): ibre hiçbir zaman bir yazının üstüne gelmez.
 * - Çevirme: ibre CSS geçişiyle döner (cubic-bezier(.15,.8,.25,1)); `transitionend`'de onDonmeBitti çağrılır
 *   (yedek zaman aşımı çalıştırıcıdadır). Sonuç dilimi 4 birimlik mürekkep çerçeve alır; öteki dilimler
 *   soluklaşmaz (etiket karşıtlığı korunur).
 */
import React from 'react';
import { rengeGoreMetin } from '../../kategorik';
import { dilimYolu, kutupNoktasi } from '../../grafik';
import { svgYaziBoyu } from '../bicim';

export interface CarkDilimi {
  etiket: string;
  renk: string;
  /** Pay (yüzde ya da oran; toplam 1'e ölçeklenir) */
  oran: number;
}

export interface CarkSahnesiProps {
  boyut: number;
  dilimler: CarkDilimi[];
  /** İbrenin birikimli açısı (derece, 0 = tepe, saat yönü). Çalıştırıcı sonrakiIbreAcisi ile en az 2 tur ekler */
  ibreAcisi: number;
  /** Geçiş süresi (ms); 0 → anında */
  sure: number;
  /** Çerçevelenecek sonuç dilimi (dönüş bitince) */
  secilen: number | null;
  onDonmeBitti?: () => void;
}

export const CARK_GECISI = 'cubic-bezier(.15,.8,.25,1)';
const CX = 100;
const CY = 100;
/** İbre ucunun merkeze uzaklığı (r'nin katı) ve etiket yarıçapı */
export const IBRE_BOYU = 0.46;
export const ETIKET_YARICAPI = 0.64;

export interface DilimAcisi {
  baslangic: number;
  bitis: number;
}

/** Payları 0–360° aralıklarına çevirir (0° tepe, saat yönü) */
export function carkDilimAcilari(dilimler: { oran: number }[]): DilimAcisi[] {
  const toplam = dilimler.reduce((t, d) => t + Math.max(0, d.oran), 0);
  let bas = 0;
  return dilimler.map((d) => {
    const aci = toplam > 0 ? (Math.max(0, d.oran) / toplam) * 360 : 360 / Math.max(1, dilimler.length);
    const a = { baslangic: bas, bitis: bas + aci };
    bas += aci;
    return a;
  });
}

/** Etiketin yaklaşık genişliği (Manrope 800) */
function yaziGenisligi(metin: string, boy: number): number {
  return metin.length * boy * 0.62;
}

type EtiketYeri = { tur: 'ic'; metin: string } | { tur: 'dis'; metin: string } | { tur: 'yok' };

export interface CarkEtiketDuzeni {
  r: number;
  yerler: EtiketYeri[];
}

/**
 * Etiket yerleşimi: içeri sığıyorsa içeride (gerekirse kısaltılır). 40°'den dar dilimin etiketi, dilim
 * tepeye ya da dibe bakıyorsa dışarıda (kılavuz çizgisiyle) durur ve disk küçülür; yana bakan dar dilimde
 * etiket yazılmaz (ad sayaçta ve düzenleyicide yazar).
 */
export function carkEtiketDuzeni(dilimler: { etiket: string; oran: number }[], yaziBoyu: number): CarkEtiketDuzeni {
  const acilar = carkDilimAcilari(dilimler);
  const disaUygun = acilar.map((a) => {
    const aci = a.bitis - a.baslangic;
    const orta = ((a.baslangic + a.bitis) / 2) * (Math.PI / 180);
    return aci < 40 && Math.abs(Math.sin(orta)) < 0.55;
  });
  const disVar = dilimler.some((d, i) => disaUygun[i] && d.etiket.trim() !== '');
  const r = disVar ? 64 : 86;
  const yerler: EtiketYeri[] = dilimler.map((d, i) => {
    const aci = acilar[i].bitis - acilar[i].baslangic;
    const metin = d.etiket.trim();
    if (!metin) return { tur: 'yok' };
    if (aci >= 40) {
      // Dilim ortasındaki kiriş (0,64 r'de); radyal kalınlık da sınırlar
      const kiris = 2 * r * ETIKET_YARICAPI * Math.sin((Math.min(aci, 180) * Math.PI) / 360) * 0.9;
      const sigar = Math.min(kiris, r * 0.66);
      if (yaziGenisligi(metin, yaziBoyu) <= sigar) return { tur: 'ic', metin };
      for (let n = metin.length - 1; n >= 3; n--) {
        const kisa = `${metin.slice(0, n)}.`;
        if (yaziGenisligi(kisa, yaziBoyu) <= sigar) return { tur: 'ic', metin: kisa };
      }
      return { tur: 'yok' };
    }
    if (!disaUygun[i]) return { tur: 'yok' };
    return { tur: 'dis', metin: metin.length > 9 ? `${metin.slice(0, 8)}.` : metin };
  });
  return { r, yerler };
}

/** Çizim ölçüsündeki etiket yazı boyu (viewBox birimi): ekranda en az 12,5 px */
export function carkYaziBoyu(boyut: number): number {
  return svgYaziBoyu(13, boyut, 200, 12.5);
}

/**
 * İbre ölçüleri (viewBox birimi): uç 0,46 r; taban yarı genişliği 10 (göbeğin kenarında ~7 görünür: sınıfın
 * arkasından da seçilir); kuyruk 0,22 r, yuvarlak uçlu.
 */
function ibreOlculeri(r: number) {
  return { L: r * IBRE_BOYU, T: r * 0.22, b: 10, k: 5 };
}

/** İbre (pusula iğnesi), tepeye bakarken: sivri uç → sağ omuz → yuvarlak kuyruk → sol omuz */
export function ibreYolu(r: number, dx = 0, dy = 0): string {
  const { L, T, b, k } = ibreOlculeri(r);
  const x = CX + dx;
  const y = CY + dy;
  return `M${x} ${y - L} L${x + b} ${y + 1.5} L${x + k} ${y + T} A${k} ${k} 0 0 1 ${x - k} ${y + T} L${x - b} ${y + 1.5} Z`;
}

/** İbrenin ışık alan sol yarısı (uçtan sol omza, oradan merkeze) */
function ibreIsikYolu(r: number): string {
  const { L, b } = ibreOlculeri(r);
  return `M${CX} ${CY - L} L${CX - b} ${CY + 1.5} L${CX} ${CY + 1.5} Z`;
}

interface Kutu {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** İçerideki etiketlerin kutuları (viewBox birimi) */
function etiketKutulari(dilimler: { etiket: string; oran: number }[], yaziBoyu: number): Kutu[] {
  const { r, yerler } = carkEtiketDuzeni(dilimler, yaziBoyu);
  const acilar = carkDilimAcilari(dilimler);
  const kutular: Kutu[] = [];
  yerler.forEach((y, i) => {
    if (y.tur !== 'ic') return;
    const orta = (acilar[i].baslangic + acilar[i].bitis) / 2;
    const p = dilimler.length === 1 ? { x: CX, y: CY + r * 0.5 } : kutupNoktasi(CX, CY, r * ETIKET_YARICAPI, orta);
    const g = yaziGenisligi(y.metin, yaziBoyu) / 2;
    const h = yaziBoyu * 0.42;
    kutular.push({ x1: p.x - g, y1: p.y - h, x2: p.x + g, y2: p.y + h });
  });
  return kutular;
}

/** İbre bu açıda bir etiketin (payıyla) üstüne geliyor mu */
function ibreEtiketeDeger(aci: number, r: number, kutular: Kutu[], pay = 6): boolean {
  if (kutular.length === 0) return false;
  const { L, b } = ibreOlculeri(r);
  const rad = (aci * Math.PI) / 180;
  const u = { x: Math.sin(rad), y: -Math.cos(rad) };
  const v = { x: Math.cos(rad), y: Math.sin(rad) };
  const noktalar: { x: number; y: number }[] = [];
  for (let t = 10; t <= L + 0.01; t += 3) {
    const yari = b * (1 - t / L) + 0.8; // uca doğru incelir
    for (const s of [-yari, 0, yari]) noktalar.push({ x: CX + u.x * t + v.x * s, y: CY + u.y * t + v.y * s });
  }
  noktalar.push({ x: CX + u.x * L, y: CY + u.y * L });
  return noktalar.some((p) => kutular.some((k) => p.x >= k.x1 - pay && p.x <= k.x2 + pay && p.y >= k.y1 - pay && p.y <= k.y2 + pay));
}

/**
 * İbrenin duracağı açı (0–360; çalıştırıcı kullanır): sonuç diliminin içinde, sınırlardan uzak ve hiçbir
 * etiketin üstüne gelmeyen açılardan biri (rnd ∈ [0, 1) ile seçilir). Böyle bir açı yoksa (çok dar dilim)
 * dilimin ortasındaki %70'lik bant kullanılır. `boyut` etiket yazı boyunu (dolayısıyla kutusunu) belirler.
 */
export function ibreDurmaAcisi(dilimler: { etiket: string; oran: number }[], secilen: number, rnd: number, boyut: number): number {
  const acilar = carkDilimAcilari(dilimler);
  const a = acilar[Math.min(Math.max(0, secilen), acilar.length - 1)];
  if (!a) return 0;
  const u = Math.min(Math.max(Number.isFinite(rnd) ? rnd : 0, 0), 0.999999);
  const w = a.bitis - a.baslangic;
  // Sınır çizgisinden uzak (geniş dilimde 24°): ibrenin hangi dilimi gösterdiği tartışmasız okunur
  const kenar = Math.min(24, w * 0.2);
  const yaziBoyu = carkYaziBoyu(boyut);
  const { r } = carkEtiketDuzeni(dilimler, yaziBoyu);
  const kutular = etiketKutulari(dilimler, yaziBoyu);
  const uygun: number[] = [];
  for (let x = a.baslangic + kenar; x <= a.bitis - kenar + 1e-9; x += 1) {
    if (!ibreEtiketeDeger(x, r, kutular)) uygun.push(x);
  }
  if (uygun.length === 0) return a.baslangic + w * (0.15 + 0.7 * u);
  return uygun[Math.floor(u * uygun.length)];
}

/** Birikimli ibre açısı: öncekinden en az `enAzTur` tam tur ileride, `hedef` (0–360) açısında durur */
export function sonrakiIbreAcisi(onceki: number, hedef: number, enAzTur = 2): number {
  const o = Number.isFinite(onceki) ? onceki : 0;
  const h = (((hedef % 360) + 360) % 360);
  const taban = o - (((o % 360) + 360) % 360);
  let yeni = taban + h + 360 * enAzTur;
  if (yeni - o < 360 * enAzTur) yeni += 360;
  return yeni;
}

export function CarkSahnesi({ boyut, dilimler, ibreAcisi, sure, secilen, onDonmeBitti }: CarkSahnesiProps) {
  const yaziBoyu = carkYaziBoyu(boyut);
  const { r, yerler } = carkEtiketDuzeni(dilimler, yaziBoyu);
  const acilar = carkDilimAcilari(dilimler);
  const tek = dilimler.length === 1;
  const gecis = sure > 0 ? `transform ${Math.round(sure)}ms ${CARK_GECISI}` : 'none';
  // Gölge ibreyle aynı açıda, ama kendi (kaydırılmış) merkezi çevresinde döner: ışık hep sol üstten gelir
  const golgeKaymasi = { x: 1.6, y: 2.6 };

  return (
    <svg
      viewBox="0 0 200 200"
      width={boyut}
      height={boyut}
      className="block"
      aria-hidden="true"
      focusable="false"
      data-cark-secilen={secilen ?? ''}
    >
      {/* Zemin gölgesi ve dış kasnak */}
      <g className="text-[#15302d] opacity-[.12] dark:text-black dark:opacity-40">
        <ellipse cx={CX} cy={CY + r + 10} rx={r * 0.62} ry={5} fill="currentColor" />
      </g>
      <circle cx={CX} cy={CY} r={r + 6} fill="hsl(var(--card))" stroke="hsl(var(--foreground))" strokeWidth={2.5} />
      {dilimler.map((d, i) => {
        const a = acilar[i];
        const yol = tek ? '' : dilimYolu(CX, CY, r, a.baslangic, a.bitis);
        return tek ? (
          <circle key={i} cx={CX} cy={CY} r={r} fill={d.renk} data-dilim={d.etiket} />
        ) : (
          yol && <path key={i} d={yol} fill={d.renk} stroke="hsl(var(--card))" strokeWidth={2} strokeLinejoin="round" data-dilim={d.etiket} />
        );
      })}
      {/* Diskin kenarında ince iç gölge: kasnağa oturmuş görünür */}
      <circle cx={CX} cy={CY} r={r - 0.8} fill="none" stroke="#15302d" strokeOpacity={0.16} strokeWidth={1.6} />
      {/* Etiketler: dik, dilim ortasında; dar dilimde dışarıda kılavuz çizgisiyle */}
      {dilimler.map((d, i) => {
        const yer = yerler[i];
        if (yer.tur === 'yok') return null;
        const orta = (acilar[i].baslangic + acilar[i].bitis) / 2;
        if (yer.tur === 'ic') {
          const p = tek ? { x: CX, y: CY + r * 0.5 } : kutupNoktasi(CX, CY, r * ETIKET_YARICAPI, orta);
          return (
            <text
              key={`e${i}`}
              x={p.x}
              y={p.y + yaziBoyu * 0.36}
              textAnchor="middle"
              fontSize={yaziBoyu}
              fontWeight={800}
              fill={rengeGoreMetin(d.renk)}
              data-cark-etiketi={d.etiket}
            >
              {yer.metin}
            </text>
          );
        }
        const k1 = kutupNoktasi(CX, CY, r * 0.95, orta);
        const k2 = kutupNoktasi(CX, CY, r + 9, orta);
        const ust = Math.cos((orta * Math.PI) / 180) > 0;
        return (
          <g key={`e${i}`} data-cark-etiketi={d.etiket}>
            <path d={`M${k1.x} ${k1.y}L${k2.x} ${k2.y}`} stroke="hsl(var(--foreground))" strokeWidth={1.4} strokeLinecap="round" />
            <text
              x={k2.x}
              y={ust ? k2.y - 4 : k2.y + yaziBoyu * 0.78}
              textAnchor="middle"
              fontSize={yaziBoyu}
              fontWeight={800}
              fill="hsl(var(--foreground))"
            >
              {yer.metin}
            </text>
          </g>
        );
      })}
      {/* Sonuç dilimi çerçevesi */}
      {secilen !== null && secilen >= 0 && secilen < dilimler.length && (
        <path
          d={tek ? dilimYolu(CX, CY, r - 2, 0, 359.99) : dilimYolu(CX, CY, r - 2, acilar[secilen].baslangic + 0.6, acilar[secilen].bitis - 0.6)}
          fill="none"
          stroke="hsl(var(--foreground))"
          strokeWidth={4}
          strokeLinejoin="round"
          data-sonuc-dilimi={dilimler[secilen].etiket}
        />
      )}
      {/* İbrenin gölgesi (ayrı döner) */}
      <g className="text-[#15302d] opacity-[.24] dark:text-black dark:opacity-50">
        <g
          style={{
            transformOrigin: `${CX + golgeKaymasi.x}px ${CY + golgeKaymasi.y}px`,
            transform: `rotate(${ibreAcisi}deg)`,
            transition: gecis,
          }}
        >
          <path d={ibreYolu(r, golgeKaymasi.x, golgeKaymasi.y)} fill="currentColor" />
        </g>
      </g>
      {/* İbre: pusula iğnesi, uç 0,46 r */}
      <g
        data-cark-ibresi=""
        style={{ transformOrigin: `${CX}px ${CY}px`, transform: `rotate(${ibreAcisi}deg)`, transition: gecis }}
        onTransitionEnd={(e) => {
          if (e.target === e.currentTarget && e.propertyName === 'transform') onDonmeBitti?.();
        }}
      >
        <path d={ibreYolu(r)} fill="hsl(var(--foreground))" stroke="hsl(var(--card))" strokeWidth={1.4} strokeLinejoin="round" />
        <path d={ibreIsikYolu(r)} fill="hsl(var(--card))" fillOpacity={0.26} />
      </g>
      {/* Göbek r = 10 */}
      <circle cx={CX} cy={CY} r={10} fill="hsl(var(--foreground))" stroke="hsl(var(--card))" strokeWidth={2} />
      <circle cx={CX} cy={CY} r={3.6} fill="hsl(var(--card))" />
      <path d={`M${CX - 6.2} ${CY - 2.4} A 6.6 6.6 0 0 1 ${CX - 1.8} ${CY - 6.4}`} fill="none" stroke="hsl(var(--card))" strokeOpacity={0.45} strokeWidth={1.6} strokeLinecap="round" />
    </svg>
  );
}

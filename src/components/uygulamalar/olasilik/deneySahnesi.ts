/**
 * Olasılık Laboratuvarı — 3B deney sahnesi (Three.js).
 *
 * React'tan bağımsız sınıf: verilen kaba WebGL tuvali kurar, şablona göre madeni para / zar /
 * çark / torba / kart nesnelerini oluşturur ve oynat(sonuc) ile sonucu gösteren animasyonu
 * çalıştırır; bitince 'bitti' olayı yayar. adaSahnesi.ts kurulum dili: antialias, AgX ton
 * eşleme, sRGB çıkış, PCFSoft gölge, HemisphereLight + gölgeli DirectionalLight, kum zemin.
 *
 * Saf hesaplar (hedef yüz → quaternion, çark açısı → dilim, para açısı) dışa aktarılır ve
 * vitest ile sınanır; modül yüklenirken DOM'a dokunulmaz.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  KART_TURU_SEMBOLU,
  galtonKosuluSaglar,
  galtonTeorikOranlar,
  kartRengi,
  type CarkDilimi,
  type KartTuru,
  type ParaYuzu,
  type Sablon,
  type Sonuc,
} from './olasilik';

// ---------------------------------------------------------------------------
// Saf yardımcılar
// ---------------------------------------------------------------------------
export const IKI_PI = Math.PI * 2;

export function sinirla(t: number, a = 0, b = 1): number {
  return Math.min(b, Math.max(a, t));
}

/** Kübik kolay-çıkış (ease-out). */
export function kolayCikis(t: number): number {
  const u = 1 - sinirla(t);
  return 1 - u * u * u;
}

/** Yumuşak adım (smoothstep). */
export function yumusakAdim(t: number): number {
  const u = sinirla(t);
  return u * u * (3 - 2 * u);
}

/** Hızlan-yavaşla (ease-in-out, kuartik). */
export function hizlanYavasla(t: number): number {
  const u = sinirla(t);
  return u < 0.5 ? 8 * u * u * u * u : 1 - Math.pow(-2 * u + 2, 4) / 2;
}

export function modulo(a: number, n: number): number {
  return ((a % n) + n) % n;
}

/** BoxGeometry yüz sırası (+X, −X, +Y, −Y, +Z, −Z) üzerinde standart zar dizilimi (karşılıklı yüzler 7). */
export const ZAR_YUZLERI: readonly number[] = [2, 5, 1, 6, 3, 4];

const YUZ_NORMALLERI: readonly THREE.Vector3[] = [
  new THREE.Vector3(1, 0, 0),
  new THREE.Vector3(-1, 0, 0),
  new THREE.Vector3(0, 1, 0),
  new THREE.Vector3(0, -1, 0),
  new THREE.Vector3(0, 0, 1),
  new THREE.Vector3(0, 0, -1),
];

const YUKARI = new THREE.Vector3(0, 1, 0);

/** Zar yüzünün (1–6) yerel normali. */
export function zarYuzNormali(yuz: number): THREE.Vector3 {
  const i = ZAR_YUZLERI.indexOf(yuz);
  return (i >= 0 ? YUZ_NORMALLERI[i] : YUZ_NORMALLERI[2]).clone();
}

/** İstenen yüzü yukarı (+Y) getiren quaternion; dönme (yaw) Y ekseninde radyan. */
export function zarYuzQuaternion(yuz: number, donme = 0): THREE.Quaternion {
  const q = new THREE.Quaternion().setFromUnitVectors(zarYuzNormali(yuz), YUKARI);
  const yaw = new THREE.Quaternion().setFromAxisAngle(YUKARI, donme);
  return yaw.multiply(q);
}

/** Verilen yönelimde yukarı bakan zar yüzü. */
export function zarUstYuzu(q: THREE.Quaternion): number {
  let enIyi = 1;
  let enY = -Infinity;
  const v = new THREE.Vector3();
  YUZ_NORMALLERI.forEach((n, i) => {
    v.copy(n).applyQuaternion(q);
    if (v.y > enY) {
      enY = v.y;
      enIyi = ZAR_YUZLERI[i];
    }
  });
  return enIyi;
}

/** Madeni para: X ekseni etrafındaki açıdan yukarı bakan yüz (0 → Tura, π → Yazı). */
export function paraYuzuAcidan(aci: number): ParaYuzu {
  return Math.cos(aci) >= 0 ? 'tura' : 'yazi';
}

/** Mevcut açıdan en az `tur` tam tur dönüp hedef yüzü yukarı getiren açı. */
export function paraHedefAcisi(mevcutAci: number, hedef: ParaYuzu, tur = 4): number {
  // Mevcut açıyı yüzün tam durduğu değere yuvarla (0 ya da π katları)
  const taban = Math.round(mevcutAci / Math.PI) * Math.PI;
  let hedefAci = taban + tur * IKI_PI;
  if (paraYuzuAcidan(hedefAci) !== hedef) hedefAci += Math.PI;
  return hedefAci;
}

export interface DilimAraligi {
  baslangic: number;
  uzunluk: number;
}

/** Dilimlerin çark yerel açıları (radyan, genişlikle orantılı, 0'dan başlar). Toplam 0 ise boş. */
export function dilimAraliklari(dilimler: readonly CarkDilimi[]): DilimAraligi[] {
  const toplam = dilimler.reduce((t, d) => t + Math.max(0, d.genislik), 0);
  if (toplam <= 0) return [];
  const sonuc: DilimAraligi[] = [];
  let acik = 0;
  for (const d of dilimler) {
    const uz = (Math.max(0, d.genislik) / toplam) * IKI_PI;
    sonuc.push({ baslangic: acik, uzunluk: uz });
    acik += uz;
  }
  return sonuc;
}

/** Sabit okun bulunduğu dünya açısı (çarkın uzak kenarı: −Z). */
export const OK_ACISI = Math.PI;

/** Çark Y ekseninde `aci` kadar dönmüşken okun gösterdiği dilimin indeksi (−1: dilim yok). */
export function carkDilimi(aci: number, dilimler: readonly CarkDilimi[]): number {
  const araliklar = dilimAraliklari(dilimler);
  if (!araliklar.length) return -1;
  const yerel = modulo(OK_ACISI - aci, IKI_PI);
  for (let i = 0; i < araliklar.length; i++) {
    const a = araliklar[i];
    if (a.uzunluk > 0 && yerel >= a.baslangic - 1e-9 && yerel < a.baslangic + a.uzunluk - 1e-9) return i;
  }
  return araliklar.length - 1;
}

/**
 * Hedef dilimi okun altına getiren yeni açı: mevcut açıdan en az `tamTur` tam tur ileri.
 * `u` (0–1) dilim içinde nerede duracağını seçer; kenarlardan %15 pay bırakılır.
 */
export function carkHedefAcisi(dilim: number, dilimler: readonly CarkDilimi[], mevcutAci: number, tamTur = 3, u = 0.5): number {
  const araliklar = dilimAraliklari(dilimler);
  const a = araliklar[dilim];
  if (!a) return mevcutAci + tamTur * IKI_PI;
  const yerel = a.baslangic + a.uzunluk * (0.15 + 0.7 * sinirla(u));
  const istenen = OK_ACISI - yerel;
  return mevcutAci + tamTur * IKI_PI + modulo(istenen - mevcutAci, IKI_PI);
}

// ---------------------------------------------------------------------------
// Galton tahtası: saf yerleşim hesapları (tahta yerel koordinatları: x sağ, y yukarı; kutu tabanı y = 0)
// ---------------------------------------------------------------------------
/** Yatay çivi aralığı (aynı zamanda kutu genişliği) */
export const GALTON_ARALIK = 0.4;
/** Çivi satırları arası dikey mesafe (eşkenar dizilime yakın) */
export const GALTON_SATIR_ARALIGI = 0.34;
export const GALTON_CIVI_R = 0.045;
export const GALTON_BILYE_R = 0.06;
/** Kutudaki görünür yığın: 3 sütun × 12 sıra */
export const GALTON_YIGIN_SUTUN = 3;
export const GALTON_YIGIN_SIRA = 12;
export const GALTON_YIGIN_KAPASITE = GALTON_YIGIN_SUTUN * GALTON_YIGIN_SIRA;
const GALTON_SIRA_Y = GALTON_BILYE_R * 2;

export interface GaltonYerlesimi {
  n: number;
  /** Kutu yüksekliği (bölmelerin tepesi) */
  kutuY: number;
  /** İlk (üst) ve son (alt) çivi satırının y'si */
  civiIlkY: number;
  civiSonY: number;
  /** Huni ağzı ve huni tepesi */
  huniCikisY: number;
  huniUstY: number;
  /** İç genişlik ((n+1) kutu) ve toplam yükseklik (kutu tabanından tahta tepesine) */
  genislik: number;
  yukseklik: number;
}

export function galtonYerlesimi(n: number): GaltonYerlesimi {
  const m = Math.max(1, Math.trunc(n));
  const kutuY = GALTON_YIGIN_SIRA * GALTON_SIRA_Y + 0.08;
  const civiSonY = kutuY + GALTON_SATIR_ARALIGI * 0.9;
  const civiIlkY = civiSonY + (m - 1) * GALTON_SATIR_ARALIGI;
  const huniCikisY = civiIlkY + GALTON_SATIR_ARALIGI * 0.85;
  const huniUstY = huniCikisY + 0.42;
  return { n: m, kutuY, civiIlkY, civiSonY, huniCikisY, huniUstY, genislik: (m + 1) * GALTON_ARALIK, yukseklik: huniUstY + 0.12 };
}

export interface CiviKonumu {
  satir: number;
  sutun: number;
  x: number;
  y: number;
}

/** Çivilerin konumu: satır i'de i+1 çivi, x = (j − i/2)·aralık, üst satır en yukarıda. */
export function civiKonumlari(n: number): CiviKonumu[] {
  const y = galtonYerlesimi(n);
  const sonuc: CiviKonumu[] = [];
  for (let i = 0; i < y.n; i++) for (let j = 0; j <= i; j++) sonuc.push({ satir: i, sutun: j, x: (j - i / 2) * GALTON_ARALIK, y: y.civiIlkY - i * GALTON_SATIR_ARALIGI });
  return sonuc;
}

/** k. kutunun (0..n) merkez x'i. */
export function kutuX(k: number, n: number): number {
  return (k - n / 2) * GALTON_ARALIK;
}

/**
 * Bilyenin ara noktaları: huni ağzı, her satırda çarptığı çivinin tepesi (n nokta) ve kutu
 * merkezi. Her adımda bir sonraki çivi yarım aralık sola (0) ya da sağa (1) kayar; son nokta
 * yol toplamı olan kutunun merkezindedir.
 */
export function bilyeYolu(yol: readonly number[]): { x: number; y: number }[] {
  const n = yol.length;
  const y = galtonYerlesimi(n);
  const noktalar: { x: number; y: number }[] = [{ x: 0, y: y.huniCikisY }];
  let j = 0;
  for (let i = 0; i < n; i++) {
    noktalar.push({ x: (j - i / 2) * GALTON_ARALIK, y: y.civiIlkY - i * GALTON_SATIR_ARALIGI + GALTON_CIVI_R + GALTON_BILYE_R });
    j += yol[i] ? 1 : 0;
  }
  noktalar.push({ x: kutuX(j, n), y: y.kutuY / 2 });
  return noktalar;
}

export interface YiginOlcegi {
  /** Kutu başına görünür bilye sayısı (≤ kapasite) */
  gorunen: number[];
  /** Bir görünür bilyenin temsil ettiği deneme sayısı (1: birebir) */
  temsil: number;
  oranli: boolean;
}

/**
 * Sayımlar kapasiteyi aşınca yığınlar oranlı ölçeklenir: en dolu kutu tam dolu, diğerleri
 * sayım / en büyük sayım oranında (sıfırdan büyük sayım en az 1 bilye gösterir).
 */
export function yiginOlcegi(sayimlar: readonly number[], kapasite: number): YiginOlcegi {
  const temiz = sayimlar.map((s) => (Number.isFinite(s) ? Math.max(0, Math.trunc(s)) : 0));
  const enCok = Math.max(0, ...temiz);
  if (enCok <= kapasite) return { gorunen: temiz, temsil: 1, oranli: false };
  return {
    gorunen: temiz.map((s) => (s > 0 ? Math.max(1, Math.min(kapasite, Math.round((s / enCok) * kapasite))) : 0)),
    temsil: enCok / kapasite,
    oranli: true,
  };
}

/** Yığında `sira`. bilyenin (0'dan) kutu içindeki merkezi. */
export function yiginKonumu(k: number, n: number, sira: number): { x: number; y: number } {
  const s = Math.max(0, Math.min(GALTON_YIGIN_KAPASITE - 1, Math.trunc(sira)));
  const sutun = s % GALTON_YIGIN_SUTUN;
  const kat = Math.floor(s / GALTON_YIGIN_SUTUN);
  return { x: kutuX(k, n) + (sutun - (GALTON_YIGIN_SUTUN - 1) / 2) * (GALTON_BILYE_R * 2.02), y: GALTON_BILYE_R + 0.004 + kat * GALTON_SIRA_Y };
}

/** Yığın yüksekliği (görünür bilye sayısından; sürekli, eğri için). */
export function yiginYuksekligi(gorunen: number): number {
  return (Math.max(0, gorunen) / GALTON_YIGIN_SUTUN) * GALTON_SIRA_Y;
}

/**
 * Son (mercan) bilyenin kutudaki yeri; `gorunen` o kutuda görünen bilye sayısı (son bilye dahil).
 * Birebir ölçekte son bilye yığının son yuvasıdır (yığın bir eksik çizilir: cikar = true).
 * Oranlı ölçekte görünür sayı çoğu zaman değişmediğinden son bilye dolu yığının içine inmez:
 * orta sütunun tepesine, yığının üstüne oturur (yığın tam çizilir: cikar = false).
 */
export function sonBilyeKonumu(k: number, n: number, gorunen: number, oranli: boolean): { x: number; y: number; cikar: boolean } {
  const v = Math.max(0, Math.trunc(gorunen));
  if (!oranli) return { ...yiginKonumu(k, n, Math.max(0, v - 1)), cikar: true };
  const orta = Math.floor(GALTON_YIGIN_SUTUN / 2);
  const ortaSutunda = v > orta ? Math.floor((v - orta - 1) / GALTON_YIGIN_SUTUN) + 1 : 0;
  return {
    x: kutuX(k, n) + (orta - (GALTON_YIGIN_SUTUN - 1) / 2) * (GALTON_BILYE_R * 2.02),
    y: GALTON_BILYE_R + 0.004 + ortaSutunda * GALTON_SIRA_Y,
    cikar: false,
  };
}

/**
 * Yol üzerinde t (0–1) anındaki konum. Kesimler: huniden ilk çiviye serbest düşüş, çividen
 * çiviye kısa parabolik sekmeler, son çividen kutudaki iniş yüksekliğine (inisY) düşüş.
 */
export function yolKonumu(noktalar: readonly { x: number; y: number }[], inisY: number, t: number): { x: number; y: number } {
  const son = noktalar.length - 1;
  if (son < 1) return { x: noktalar[0]?.x ?? 0, y: inisY };
  const hedefler = noktalar.map((p, i) => (i === son ? { x: p.x, y: inisY } : p));
  const agirliklar: number[] = [];
  for (let i = 0; i < son; i++) {
    if (i === 0) agirliklar.push(0.7);
    else if (i === son - 1) agirliklar.push(0.9 + 0.5 * Math.sqrt(Math.max(0, hedefler[i].y - inisY) / GALTON_SATIR_ARALIGI));
    else agirliklar.push(1);
  }
  const toplam = agirliklar.reduce((a, b) => a + b, 0);
  let kalan = sinirla(t) * toplam;
  let i = 0;
  while (i < son - 1 && kalan > agirliklar[i]) {
    kalan -= agirliklar[i];
    i++;
  }
  const u = sinirla(kalan / agirliklar[i]);
  const a = hedefler[i];
  const b = hedefler[i + 1];
  if (i === 0) return { x: a.x, y: a.y + (b.y - a.y) * u * u };
  if (i === son - 1) {
    const ux = kolayCikis(Math.min(1, u * 2.5));
    return { x: a.x + (b.x - a.x) * ux, y: a.y + (b.y - a.y) * u * u + 0.03 * 4 * u * (1 - u) };
  }
  return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u * u + 0.05 * 4 * u * (1 - u) };
}

/** Bir görünür bilyenin temsil ettiği deneme sayısı: 10'dan küçükse bir ondalık ("1,4"), değilse tam sayı. */
export function temsilMetni(temsil: number): string {
  return temsil < 10 ? temsil.toFixed(1).replace('.', ',') : Math.round(temsil).toLocaleString('tr-TR');
}

/** Galton koşulunu sağlayan kutular (tahtada vurgulanır). */
function istenenKutular(sablon: Extract<Sablon, { tur: 'galton' }>): Set<number> {
  const s = new Set<number>();
  for (let k = 0; k <= sablon.satir; k++) if (galtonKosuluSaglar(sablon.istenen, sablon.satir, k)) s.add(k);
  return s;
}

let webglSondasi: boolean | null = null;

/**
 * WebGL kullanılabilir mi (DOM yoksa false). Sonda bağlamı hemen bırakılır ve sonuç modül
 * düzeyinde önbelleğe alınır; aksi halde her pencere açılışı (StrictMode'da iki kez) canlı bir
 * bağlam sızdırıyor ve tarayıcı sınırı dolunca diğer 3B tuvaller düşüyordu.
 */
export function webglDestekli(): boolean {
  if (typeof document === 'undefined') return false;
  if (webglSondasi !== null) return webglSondasi;
  try {
    const tuval = document.createElement('canvas');
    tuval.width = 1;
    tuval.height = 1;
    const gl = (tuval.getContext('webgl2') ?? tuval.getContext('webgl')) as WebGLRenderingContext | null;
    webglSondasi = !!gl;
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    webglSondasi = false;
  }
  return webglSondasi;
}

/** Yalnız testler için: sonda önbelleğini sıfırlar. */
export function webglSondasiniSifirla(): void {
  webglSondasi = null;
}

// ---------------------------------------------------------------------------
// Dokular (CanvasTexture)
// ---------------------------------------------------------------------------
function tuvalDokusu(boyut: number, ciz: (ctx: CanvasRenderingContext2D, s: number) => void): THREE.CanvasTexture {
  const tuval = document.createElement('canvas');
  tuval.width = boyut;
  tuval.height = boyut;
  const ctx = tuval.getContext('2d');
  if (ctx) ciz(ctx, boyut);
  const doku = new THREE.CanvasTexture(tuval);
  doku.colorSpace = THREE.SRGBColorSpace;
  doku.anisotropy = 4;
  return doku;
}

/** Madeni para yüzü: altın zemin, kenar halkası; tura → ay-yıldız, yazı → "1" ve yazı. */
/** Para kapağı dokusunun döndürme açısı (tura +, yazı −): yazılar kameradan düz okunsun. */
export const PARA_DOKU_DONUSU = Math.PI / 2;

function paraDokusu(yuz: ParaYuzu): THREE.CanvasTexture {
  return tuvalDokusu(512, (ctx, s) => {
    const m = s / 2;
    const g = ctx.createRadialGradient(m * 0.7, m * 0.7, s * 0.05, m, m, m);
    g.addColorStop(0, '#f1d48c');
    g.addColorStop(0.6, '#d3a95a');
    g.addColorStop(1, '#a87a35');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = 'rgba(120, 80, 20, 0.7)';
    ctx.lineWidth = s * 0.02;
    ctx.beginPath();
    ctx.arc(m, m, m * 0.9, 0, IKI_PI);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 240, 200, 0.5)';
    ctx.lineWidth = s * 0.01;
    ctx.beginPath();
    ctx.arc(m, m, m * 0.84, 0, IKI_PI);
    ctx.stroke();
    ctx.fillStyle = '#6d4a17';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (yuz === 'tura') {
      // Ay: iki daire farkı; yıldız: beş köşeli
      ctx.save();
      ctx.translate(m * 0.9, m);
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.19, 0, IKI_PI);
      ctx.fill();
      ctx.fillStyle = '#d3a95a';
      ctx.beginPath();
      ctx.arc(s * 0.07, 0, s * 0.155, 0, IKI_PI);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#6d4a17';
      ctx.save();
      ctx.translate(m * 1.3, m);
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? s * 0.075 : s * 0.03;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.font = `700 ${s * 0.11}px Manrope, sans-serif`;
      ctx.fillText('TURA', m, s * 0.8);
    } else {
      ctx.font = `800 ${s * 0.42}px Fraunces, Georgia, serif`;
      ctx.fillText('1', m, m * 0.92);
      ctx.font = `700 ${s * 0.075}px Manrope, sans-serif`;
      ctx.fillText('TÜRK LİRASI', m, s * 0.7);
      ctx.font = `700 ${s * 0.09}px Manrope, sans-serif`;
      ctx.fillText('YAZI', m, s * 0.83);
    }
  });
}

/** Zar yüzü: fildişi zemin, mürekkep noktalar. */
function zarDokusu(yuz: number): THREE.CanvasTexture {
  return tuvalDokusu(256, (ctx, s) => {
    ctx.fillStyle = '#fbf7ee';
    ctx.fillRect(0, 0, s, s);
    const g = ctx.createRadialGradient(s * 0.35, s * 0.35, s * 0.1, s * 0.5, s * 0.5, s * 0.75);
    g.addColorStop(0, 'rgba(255,255,255,0.35)');
    g.addColorStop(1, 'rgba(180,160,120,0.25)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    const konumlar: Record<number, [number, number][]> = {
      1: [[0.5, 0.5]],
      2: [
        [0.3, 0.3],
        [0.7, 0.7],
      ],
      3: [
        [0.3, 0.3],
        [0.5, 0.5],
        [0.7, 0.7],
      ],
      4: [
        [0.3, 0.3],
        [0.7, 0.3],
        [0.3, 0.7],
        [0.7, 0.7],
      ],
      5: [
        [0.3, 0.3],
        [0.7, 0.3],
        [0.5, 0.5],
        [0.3, 0.7],
        [0.7, 0.7],
      ],
      6: [
        [0.3, 0.28],
        [0.7, 0.28],
        [0.3, 0.5],
        [0.7, 0.5],
        [0.3, 0.72],
        [0.7, 0.72],
      ],
    };
    ctx.fillStyle = '#15302d';
    for (const [x, y] of konumlar[yuz] ?? []) {
      ctx.beginPath();
      ctx.arc(x * s, y * s, s * 0.075, 0, IKI_PI);
      ctx.fill();
    }
  });
}

/** Kart ön yüzü: köşelerde değer ve tür, ortada büyük sembol. */
function kartOnDokusu(deger: string, sembol: string, kirmizi: boolean): THREE.CanvasTexture {
  return tuvalDokusu(512, (ctx, s) => {
    ctx.fillStyle = '#fdfbf5';
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = '#d9cfb8';
    ctx.lineWidth = s * 0.015;
    ctx.strokeRect(s * 0.03, s * 0.03, s * 0.94, s * 0.94);
    ctx.fillStyle = kirmizi ? '#c9463d' : '#15302d';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `800 ${s * 0.16}px Manrope, sans-serif`;
    ctx.fillText(deger, s * 0.14, s * 0.13);
    ctx.font = `${s * 0.14}px serif`;
    ctx.fillText(sembol, s * 0.14, s * 0.27);
    ctx.save();
    ctx.translate(s * 0.86, s * 0.87);
    ctx.rotate(Math.PI);
    ctx.font = `800 ${s * 0.16}px Manrope, sans-serif`;
    ctx.fillText(deger, 0, 0);
    ctx.font = `${s * 0.14}px serif`;
    ctx.fillText(sembol, 0, s * 0.14);
    ctx.restore();
    ctx.font = `${s * 0.42}px serif`;
    ctx.fillText(sembol, s * 0.5, s * 0.52);
  });
}

/** Kart arka yüzü: deniz rengi zemin, baklava deseni. */
function kartArkaDokusu(): THREE.CanvasTexture {
  return tuvalDokusu(256, (ctx, s) => {
    ctx.fillStyle = '#fdfbf5';
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = '#216a78';
    ctx.fillRect(s * 0.06, s * 0.06, s * 0.88, s * 0.88);
    ctx.strokeStyle = 'rgba(251,247,238,0.5)';
    ctx.lineWidth = 2;
    const adim = s / 8;
    for (let i = -8; i < 16; i++) {
      ctx.beginPath();
      ctx.moveTo(i * adim, 0);
      ctx.lineTo(i * adim + s, s);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(i * adim, s);
      ctx.lineTo(i * adim + s, 0);
      ctx.stroke();
    }
    ctx.strokeStyle = '#c99a52';
    ctx.lineWidth = s * 0.02;
    ctx.strokeRect(s * 0.1, s * 0.1, s * 0.8, s * 0.8);
  });
}

/** Kumaş dokusu: kum tonu zemin üstüne örgü çizgileri ve tanecik. */
function kumasDokusu(): THREE.CanvasTexture {
  const doku = tuvalDokusu(256, (ctx, s) => {
    ctx.fillStyle = '#b89467';
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = 'rgba(80, 55, 25, 0.25)';
    ctx.lineWidth = 1;
    for (let i = 0; i < s; i += 4) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, s);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(s, i);
      ctx.stroke();
    }
    // Basit deterministik tanecik
    let x = 12345;
    for (let i = 0; i < 1800; i++) {
      x = (x * 1103515245 + 12345) & 0x7fffffff;
      const px = x % s;
      x = (x * 1103515245 + 12345) & 0x7fffffff;
      const py = x % s;
      ctx.fillStyle = (x & 1) === 0 ? 'rgba(255,240,210,0.25)' : 'rgba(60,40,15,0.25)';
      ctx.fillRect(px, py, 2, 2);
    }
  });
  doku.wrapS = doku.wrapT = THREE.RepeatWrapping;
  doku.repeat.set(3, 2);
  return doku;
}

/** Meşe dokusu: bal rengi zemin, ince uzun damarlar (deterministik). */
function meseDokusu(): THREE.CanvasTexture {
  const doku = tuvalDokusu(256, (ctx, s) => {
    const g = ctx.createLinearGradient(0, 0, 0, s);
    g.addColorStop(0, '#b47f47');
    g.addColorStop(0.5, '#a8733d');
    g.addColorStop(1, '#b8844c');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    let x = 987;
    const r = () => {
      x = (x * 1103515245 + 12345) & 0x7fffffff;
      return x / 0x7fffffff;
    };
    for (let i = 0; i < 70; i++) {
      const y0 = r() * s;
      ctx.strokeStyle = r() < 0.5 ? `rgba(90,52,20,${0.12 + r() * 0.2})` : `rgba(235,195,140,${0.1 + r() * 0.15})`;
      ctx.lineWidth = 0.6 + r() * 1.6;
      ctx.beginPath();
      ctx.moveTo(0, y0);
      for (let px = 0; px <= s; px += 16) ctx.lineTo(px, y0 + Math.sin(px * 0.03 + i) * (2 + r() * 3));
      ctx.stroke();
    }
  });
  doku.wrapS = doku.wrapT = THREE.RepeatWrapping;
  return doku;
}

/**
 * Galton kutu numaraları şeridi: fildişi zemin, mürekkep rakamlar; istenen kutular deniz rengi ve
 * altın alt çizgili. Tuval şeridin en-boy oranında çizilir (rakamlar esnemez); rakam yüksekliği
 * şeridin ~%60'ı.
 */
function galtonNumaraDokusu(n: number, istenen: Set<number>, seritYuksekligi: number): THREE.CanvasTexture {
  const kutu = n + 1;
  const hucre = 112;
  const tuval = document.createElement('canvas');
  tuval.width = kutu * hucre;
  tuval.height = Math.max(48, Math.round((hucre * seritYuksekligi) / GALTON_ARALIK));
  const h = tuval.height;
  const ctx = tuval.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#fbf7ee';
    ctx.fillRect(0, 0, tuval.width, h);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const boy = Math.round(h * 0.6);
    for (let k = 0; k < kutu; k++) {
      const cx = (k + 0.5) * hucre;
      const secili = istenen.has(k);
      if (secili) {
        ctx.fillStyle = 'rgba(185,136,74,0.26)';
        ctx.fillRect(k * hucre + 5, 5, hucre - 10, h - 10);
        ctx.fillStyle = '#b9884a';
        ctx.fillRect(cx - 26, h - 13, 52, 6);
      }
      ctx.fillStyle = secili ? '#0f4c57' : '#15302d';
      ctx.font = `800 ${boy}px Manrope, "Segoe UI", sans-serif`;
      ctx.fillText(String(k + 1), cx, h * 0.47, hucre - 12);
      if (k > 0) {
        ctx.fillStyle = 'rgba(21,48,45,0.22)';
        ctx.fillRect(k * hucre - 1, 10, 2, h - 20);
      }
    }
  }
  const doku = new THREE.CanvasTexture(tuval);
  doku.colorSpace = THREE.SRGBColorSpace;
  doku.anisotropy = 4;
  return doku;
}

/** Kese torna geometrisine kumaş kıvrımları ekler: yarıçap, açıya bağlı dalgalarla ve boyuna doğru artan genlikle bozulur. */
function keseKirisiklari(geo: THREE.BufferGeometry): void {
  const konum = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < konum.count; i++) {
    v.fromBufferAttribute(konum, i);
    const r = Math.hypot(v.x, v.z);
    if (r < 1e-4) continue;
    const aci = Math.atan2(v.x, v.z);
    const yukseklik = Math.max(0, v.y);
    const genlik = 0.012 + 0.05 * Math.min(1, yukseklik / 1.1) * (yukseklik > 0.95 ? 1.6 : 1);
    const dalga = 1 + genlik * (Math.sin(aci * 9) * 0.7 + Math.sin(aci * 5 + 1.3) * 0.3);
    v.x = (v.x / r) * r * dalga;
    v.z = (v.z / r) * r * dalga;
    konum.setXYZ(i, v.x, v.y, v.z);
  }
  konum.needsUpdate = true;
  geo.computeVertexNormals();
}

// ---------------------------------------------------------------------------
// Sahne motoru
// ---------------------------------------------------------------------------
export interface DeneySahnesiSecenekleri {
  /** prefers-reduced-motion: animasyon ≤ 300 ms ve doğrudan sonuç */
  azHareket?: boolean;
  /** Koyu tema zemini */
  koyu?: boolean;
  /** Rastgele sayı kaynağı (başlangıç dönüşleri vb.) */
  rastgele?: () => number;
}

export type DeneySahnesiOlayHaritasi = {
  bitti: { sonuc: Sonuc };
  hata: { mesaj: string };
};

interface YagmurBilyesi {
  mesh: THREE.Mesh;
  noktalar: { x: number; y: number }[];
  inisY: number;
  t: number;
  sure: number;
  /** Görünmezken yeniden düşmeden önce beklenecek süre (s) */
  bekleme: number;
}

/** Kurulu Galton tahtasının sahne referansları. */
interface GaltonSahnesi {
  n: number;
  yer: GaltonYerlesimi;
  tahta: THREE.Group;
  yigin: THREE.InstancedMesh;
  bilye: THREE.Mesh;
  egri: THREE.InstancedMesh;
  etiket: THREE.Sprite;
  etiketTuval: HTMLCanvasElement;
  etiketMetni: string;
  yagmur: YagmurBilyesi[];
  olcek: number;
  /** Numara şeridinin malzemesi (istenen koşul değişince yalnız dokusu yenilenir) */
  numaraMalzeme: THREE.MeshBasicMaterial;
  numaraYuksekligi: number;
  /** İstenen kutuların altın zemini (koşul değişince yeniden dizilir) */
  vurgu: THREE.Group;
  vurguGeo: THREE.PlaneGeometry;
  vurguMalzeme: THREE.MeshBasicMaterial;
  /** Kamera kadrajı: yerel yarı genişlik ("×N" etiketi dahil) ve kaide dahil dış yükseklik (ölçeksiz) */
  yariGenislik: number;
  disYukseklik: number;
}

const EGRI_KESIK_SAYISI = 36;

interface Animasyon {
  sure: number;
  gecen: number;
  hiz: number;
  adim: (t: number) => void;
  bitti: () => void;
}

/** Yardımcı: olay verisi taşıyan CustomEvent. */
function olay<K extends keyof DeneySahnesiOlayHaritasi>(tur: K, detay: DeneySahnesiOlayHaritasi[K]): CustomEvent {
  return new CustomEvent(tur, { detail: detay });
}

export class DeneySahnesi extends EventTarget {
  private readonly kap: HTMLElement;
  private readonly secenekler: Required<DeneySahnesiSecenekleri>;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly sahne = new THREE.Scene();
  private readonly kamera: THREE.PerspectiveCamera;
  private readonly isik: THREE.DirectionalLight;
  private readonly boyutGozlemci: ResizeObserver | null = null;
  private readonly sokuculer: (() => void)[] = [];

  private nesneler = new THREE.Group();
  private sablon: Sablon | null = null;
  private animasyon: Animasyon | null = null;
  private dongude = false;
  private duraklatildi = false;
  private gizli = false;
  private kapatildi = false;
  private sonZaman = 0;
  /** yerlestir(): animasyonsuz, olay yaymadan son poz */
  private aninda = false;
  private sessiz = false;

  // Şablona özel referanslar
  private para: THREE.Mesh | null = null;
  private paraAcisi = 0;
  private zarlar: THREE.Mesh[] = [];
  private cark: THREE.Group | null = null;
  private carkAcisi = 0;
  private bilye: THREE.Mesh | null = null;
  private kese: THREE.Mesh | null = null;
  private kart: THREE.Mesh | null = null;
  private kartMalzemeleri: THREE.MeshStandardMaterial[] = [];
  private golge: THREE.Mesh | null = null;

  // Galton tahtası
  private galton: GaltonSahnesi | null = null;
  /** Kutu başına sayım (birikimGoster) */
  private galtonSayim: number[] = [];
  /** Üstte mercan renkli "son bilye" olarak gösterilen kutu; null → hepsi yığında */
  private galtonSon: number | null = null;
  /** Tek bilye animasyonu sürüyor (yığın çizimi serbest bilyeye dokunmaz) */
  private galtonUcuyor = false;
  private yagmurAktif = false;
  /**
   * Galton için PMREM ortam yansıması: sahne ömrü boyunca bir kez üretilir, her kurulumda yeniden
   * kullanılır ve yalnız dispose()'da bırakılır. Render target'ın kendisi saklanır; yalnız
   * .texture.dispose() GPU dokusunu bırakmıyordu (her kurulumda ~6 MB sızıyordu).
   */
  private ortamHedefi: THREE.WebGLRenderTarget | null = null;
  /**
   * Galton meşe dokuları da sahne ömrü boyunca bir kez üretilir (nesneleriSok bırakmaz). Gölge
   * derinlik geçişinin önbellekteki malzemesi son dokulu gölge vericinin dokusunu tutuyor; kurulumda
   * bırakılan doku bir sonraki gölge çiziminde yeniden yükleniyor ve bir daha bırakılmıyordu
   * (her yeniden kurulumda +1 GPU dokusu).
   */
  private meseDokulari: { yatay: THREE.CanvasTexture; dikey: THREE.CanvasTexture } | null = null;
  /**
   * Sökülen nesnelerin dokuları bir sonraki çizimden SONRA bırakılır: three'nin gölge derinlik
   * malzemesi son dokulu gölge vericinin dokusunu bir kare daha tutuyor; hemen bırakılan doku o
   * karede yeniden yükleniyor ve bir daha bırakılmıyordu (şablon/satır değişimi başına +1 GPU dokusu).
   */
  private ertelenenDokular: THREE.Texture[] = [];
  private teorikEgriGorunur = true;

  constructor(kap: HTMLElement, secenekler: DeneySahnesiSecenekleri = {}) {
    super();
    this.kap = kap;
    this.secenekler = {
      azHareket: secenekler.azHareket ?? false,
      koyu: secenekler.koyu ?? false,
      rastgele: secenekler.rastgele ?? Math.random,
    };

    const r = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', stencil: false });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.AgXToneMapping;
    r.toneMappingExposure = 1.05;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.domElement.style.display = 'block';
    r.domElement.style.width = '100%';
    r.domElement.style.height = '100%';
    kap.appendChild(r.domElement);
    this.renderer = r;

    const koyu = this.secenekler.koyu;
    this.sahne.background = new THREE.Color(koyu ? '#17323a' : '#f3ead6');

    this.kamera = new THREE.PerspectiveCamera(32, 1, 0.1, 40);
    this.kamera.position.set(0, 2.6, 3.8);
    this.kamera.lookAt(0, 0.2, 0);

    // Işıklar: yumuşak gök + gölgeli güneş
    this.sahne.add(new THREE.HemisphereLight(koyu ? 0x9fc4cc : 0xfff4e0, koyu ? 0x1c2a2e : 0xb8a58a, koyu ? 0.9 : 1.1));
    const isik = new THREE.DirectionalLight(0xfff1dc, koyu ? 1.9 : 2.3);
    isik.position.set(2.5, 5, 2.5);
    isik.castShadow = true;
    isik.shadow.mapSize.set(1024, 1024);
    isik.shadow.camera.near = 0.5;
    isik.shadow.camera.far = 14;
    isik.shadow.camera.left = isik.shadow.camera.bottom = -3.5;
    isik.shadow.camera.right = isik.shadow.camera.top = 3.5;
    isik.shadow.radius = 4;
    isik.shadow.bias = -0.0005;
    this.sahne.add(isik);
    this.isik = isik;
    const dolgu = new THREE.DirectionalLight(0xdfeff2, 0.5);
    dolgu.position.set(-3, 2, -2);
    this.sahne.add(dolgu);

    // Zemin: kum/fildişi düzlem, hafif kenar halkası
    const zemin = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 30),
      new THREE.MeshStandardMaterial({ color: koyu ? '#24444c' : '#efe5d0', roughness: 0.95, metalness: 0 })
    );
    zemin.rotation.x = -Math.PI / 2;
    zemin.receiveShadow = true;
    this.sahne.add(zemin);
    const masa = new THREE.Mesh(
      new THREE.CircleGeometry(2.4, 64),
      new THREE.MeshStandardMaterial({ color: koyu ? '#2b515a' : '#fbf7ee', roughness: 0.9, metalness: 0 })
    );
    masa.rotation.x = -Math.PI / 2;
    masa.position.y = 0.002;
    masa.receiveShadow = true;
    this.sahne.add(masa);

    this.sahne.add(this.nesneler);

    if (typeof ResizeObserver !== 'undefined') {
      this.boyutGozlemci = new ResizeObserver(() => this.boyutla());
      this.boyutGozlemci.observe(kap);
    }
    const gorunurluk = () => {
      this.gizli = document.hidden;
      this.dongulemeGuncelle();
    };
    document.addEventListener('visibilitychange', gorunurluk);
    this.sokuculer.push(() => document.removeEventListener('visibilitychange', gorunurluk));

    this.boyutla();
  }

  // ---------------------------------------------------------------------------
  // Boyut ve döngü
  // ---------------------------------------------------------------------------
  boyutla(): void {
    if (this.kapatildi) return;
    const w = Math.max(1, this.kap.clientWidth);
    const h = Math.max(1, this.kap.clientHeight);
    this.renderer.setSize(w, h, false);
    this.kamera.aspect = w / h;
    this.kamera.updateProjectionMatrix();
    if (this.galton) this.galtonKamerasi();
    this.ciz();
  }

  /** Pencere küçültülünce / görünmezken çağrılır: render döngüsü durur. */
  duraklat(): void {
    this.duraklatildi = true;
    this.dongulemeGuncelle();
  }

  surdur(): void {
    this.duraklatildi = false;
    this.dongulemeGuncelle();
  }

  get animasyonda(): boolean {
    return this.animasyon !== null;
  }

  private dongulemeGuncelle(): void {
    if (this.kapatildi) return;
    const yagiyor = this.galton !== null && (this.yagmurAktif || this.galton.yagmur.some((b) => b.mesh.visible));
    const gerekli = (this.animasyon !== null || yagiyor) && !this.duraklatildi && !this.gizli;
    if (gerekli && !this.dongude) {
      this.dongude = true;
      this.sonZaman = performance.now();
      this.renderer.setAnimationLoop((zaman) => this.kare(zaman));
    } else if (!gerekli && this.dongude) {
      this.dongude = false;
      this.renderer.setAnimationLoop(null);
    }
  }

  private kare(zaman: number): void {
    const dt = Math.min(0.1, (zaman - this.sonZaman) / 1000);
    this.sonZaman = zaman;
    const a = this.animasyon;
    if (a) {
      a.gecen += dt * a.hiz;
      const t = sinirla(a.gecen / a.sure);
      a.adim(t);
      if (t >= 1) {
        this.animasyon = null;
        a.bitti();
        this.dongulemeGuncelle();
      }
    }
    if (this.galton) {
      this.yagmurAdimi(dt);
      if (!this.animasyon) this.dongulemeGuncelle();
    }
    if (this.kapatildi) return;
    this.renderer.render(this.sahne, this.kamera);
    this.ertelenenleriBirak();
  }

  private ciz(): void {
    if (this.kapatildi || this.dongude) return;
    this.renderer.render(this.sahne, this.kamera);
    this.ertelenenleriBirak();
  }

  private ertelenenleriBirak(): void {
    if (!this.ertelenenDokular.length) return;
    for (const d of this.ertelenenDokular.splice(0)) d.dispose();
  }

  /** Süren animasyonu hızlandırır (tıklama ile atla). */
  hizlandir(): void {
    const a = this.animasyon;
    // En az 5 kat; uzun animasyonlarda kalan yol ≤ ~300 ms'de biter
    if (a) a.hiz = Math.max(a.hiz, 5, (a.sure - a.gecen) / 0.3);
  }

  private baslat(sure: number, adim: (t: number) => void, bitti: () => void): void {
    if (this.aninda) {
      adim(1);
      bitti();
      return;
    }
    const azHareket = this.secenekler.azHareket;
    this.animasyon = { sure: azHareket ? Math.min(sure, 0.28) : sure, gecen: 0, hiz: 1, adim, bitti };
    adim(0);
    this.dongulemeGuncelle();
    if (this.duraklatildi || this.gizli) {
      // Görünmezken bekletme yok: doğrudan sonuca git
      adim(1);
      this.animasyon = null;
      bitti();
    }
  }

  // ---------------------------------------------------------------------------
  // Kurulum
  // ---------------------------------------------------------------------------
  /** Şablona göre nesneleri (yeniden) kurar; süren animasyon iptal olur (bitti olayı yayılmaz). */
  kur(sablon: Sablon): void {
    if (this.kapatildi) return;
    this.animasyon = null;
    this.dongulemeGuncelle();
    this.nesneleriSok();
    this.sablon = sablon;
    this.nesneler = new THREE.Group();
    this.sahne.add(this.nesneler);
    this.golge = null;
    // Galton dik bir tahta: ışık daha önden gelir, çivi gölgeleri panelde uzun çizikler bırakmaz
    if (sablon.tur === 'galton') this.isik.position.set(1.3, 3.4, 4.8);
    else this.isik.position.set(2.5, 5, 2.5);

    switch (sablon.tur) {
      case 'para':
        this.paraKur();
        this.kamera.position.set(0, 2.1, 3.1);
        this.kamera.lookAt(0, 0.3, 0);
        break;
      case 'zar':
        this.zarKur(sablon.ikiZar ? 2 : 1);
        this.kamera.position.set(0, 2.6, 3.8);
        this.kamera.lookAt(0, 0.3, 0);
        break;
      case 'cark':
        this.carkKur(sablon.dilimler);
        this.kamera.position.set(0, 3.4, 2.7);
        this.kamera.lookAt(0, 0.1, 0);
        break;
      case 'torba':
        this.torbaKur();
        this.kamera.position.set(0, 2.5, 3.9);
        this.kamera.lookAt(0, 0.45, 0.2);
        break;
      case 'kart':
        this.kartKur();
        this.kamera.position.set(0, 2.8, 3.2);
        this.kamera.lookAt(0, 0.2, 0);
        break;
      case 'galton':
        this.galtonKur(sablon);
        this.galtonKamerasi();
        break;
    }
    this.ciz();
  }

  private nesneleriSok(): void {
    const geometriler = new Set<THREE.BufferGeometry>();
    const malzemeler = new Set<THREE.Material>();
    this.nesneler.traverse((o) => {
      const sprite = o as THREE.Sprite;
      if (sprite.isSprite) {
        malzemeler.add(sprite.material);
        return;
      }
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      geometriler.add(mesh.geometry);
      for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) malzemeler.add(m);
      if ((o as THREE.InstancedMesh).isInstancedMesh) (o as THREE.InstancedMesh).dispose();
    });
    const kalici = new Set<THREE.Texture>();
    if (this.ortamHedefi) kalici.add(this.ortamHedefi.texture);
    if (this.meseDokulari) kalici.add(this.meseDokulari.yatay).add(this.meseDokulari.dikey);
    for (const m of malzemeler) {
      for (const deger of Object.values(m) as unknown[]) if (deger instanceof THREE.Texture && !kalici.has(deger)) this.ertelenenDokular.push(deger);
      m.dispose();
    }
    for (const g of geometriler) g.dispose();
    this.sahne.remove(this.nesneler);
    this.nesneler.clear();
    this.para = null;
    this.zarlar = [];
    this.cark = null;
    this.bilye = null;
    this.kese = null;
    this.kart = null;
    this.kartMalzemeleri = [];
    this.golge = null;
    this.galton = null;
    this.galtonSon = null;
    this.galtonUcuyor = false;
    // Ortam dokusu sahne ömrü boyunca paylaşılır: burada bırakılmaz, yalnız sahneden çıkarılır
    this.sahne.environment = null;
  }

  /** PMREM ortam dokusu (ilk Galton kurulumunda bir kez üretilir). */
  private ortamDokusu(): THREE.Texture {
    if (!this.ortamHedefi) {
      const pmrem = new THREE.PMREMGenerator(this.renderer);
      const oda = new RoomEnvironment();
      this.ortamHedefi = pmrem.fromScene(oda, 0.04);
      oda.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.geometry.dispose();
          (mesh.material as THREE.Material).dispose();
        }
      });
      pmrem.dispose();
    }
    return this.ortamHedefi.texture;
  }

  /** Yumuşak temas gölgesi (havadaki nesne için, yere değince belirir). */
  private temasGolgesi(yaricap: number): THREE.Mesh {
    const g = new THREE.Mesh(
      new THREE.CircleGeometry(yaricap, 32),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18, depthWrite: false })
    );
    g.rotation.x = -Math.PI / 2;
    g.position.y = 0.004;
    this.nesneler.add(g);
    return g;
  }

  private paraKur(): void {
    const geo = new THREE.CylinderGeometry(0.55, 0.55, 0.07, 72);
    const kenar = new THREE.MeshStandardMaterial({ color: '#c99a52', metalness: 0.85, roughness: 0.35 });
    // Silindir kapağının UV'si (u↔z, v↔x) yazıyı kameraya göre 90° yan çeviriyordu; doku
    // merkez etrafında döndürülür (üst kapak ve aynalı alt kapak için zıt işaret)
    const turaDokusu = paraDokusu('tura');
    turaDokusu.center.set(0.5, 0.5);
    turaDokusu.rotation = PARA_DOKU_DONUSU;
    const yaziDokusu = paraDokusu('yazi');
    yaziDokusu.center.set(0.5, 0.5);
    yaziDokusu.rotation = -PARA_DOKU_DONUSU;
    const tura = new THREE.MeshStandardMaterial({ map: turaDokusu, metalness: 0.7, roughness: 0.3 });
    const yazi = new THREE.MeshStandardMaterial({ map: yaziDokusu, metalness: 0.7, roughness: 0.3 });
    const para = new THREE.Mesh(geo, [kenar, tura, yazi]);
    para.castShadow = true;
    para.receiveShadow = true;
    para.position.y = 0.035;
    this.nesneler.add(para);
    this.para = para;
    this.paraAcisi = 0;
    this.golge = this.temasGolgesi(0.6);
  }

  private zarKur(adet: number): void {
    const yuzDokulari = ZAR_YUZLERI.map((y) => new THREE.MeshStandardMaterial({ map: zarDokusu(y), roughness: 0.45, metalness: 0.05 }));
    for (let i = 0; i < adet; i++) {
      const geo = new RoundedBoxGeometry(0.62, 0.62, 0.62, 3, 0.09);
      const zar = new THREE.Mesh(geo, yuzDokulari.map((m) => (i === 0 ? m : m.clone())));
      zar.castShadow = true;
      zar.receiveShadow = true;
      zar.position.set(adet === 2 ? (i === 0 ? -0.5 : 0.5) : 0, 0.31, 0);
      zar.quaternion.copy(zarYuzQuaternion(i === 0 ? 1 : 3, 0.4));
      this.nesneler.add(zar);
      this.zarlar.push(zar);
    }
  }

  private carkKur(dilimler: readonly CarkDilimi[]): void {
    const grup = new THREE.Group();
    const araliklar = dilimAraliklari(dilimler);
    araliklar.forEach((a, i) => {
      if (a.uzunluk <= 0) return;
      const geo = new THREE.CylinderGeometry(1.15, 1.15, 0.09, Math.max(6, Math.round((a.uzunluk / IKI_PI) * 96)), 1, false, a.baslangic, a.uzunluk);
      const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: dilimler[i].renk, roughness: 0.6, metalness: 0.05 }));
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      grup.add(mesh);
      // Dilim ayırıcı çizgi
      const cizgi = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.1, 1.15),
        new THREE.MeshStandardMaterial({ color: '#fbf7ee', roughness: 0.7 })
      );
      cizgi.position.set(Math.sin(a.baslangic) * 0.575, 0.0, Math.cos(a.baslangic) * 0.575);
      cizgi.rotation.y = a.baslangic;
      grup.add(cizgi);
    });
    const gobek = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, 0.16, 32),
      new THREE.MeshStandardMaterial({ color: '#c99a52', metalness: 0.7, roughness: 0.35 })
    );
    gobek.position.y = 0.04;
    gobek.castShadow = true;
    grup.add(gobek);
    grup.position.y = 0.045;
    this.nesneler.add(grup);
    this.cark = grup;
    this.carkAcisi = 0;
    grup.rotation.y = 0;

    // Sabit ok: uzak kenarda (−Z), merkeze bakar
    const ok = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.34, 4), new THREE.MeshStandardMaterial({ color: '#15302d', roughness: 0.5 }));
    ok.rotation.x = Math.PI / 2;
    ok.rotation.y = Math.PI / 4;
    ok.position.set(0, 0.16, -1.2);
    ok.castShadow = true;
    this.nesneler.add(ok);
    const okTabani = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.3, 16), new THREE.MeshStandardMaterial({ color: '#15302d', roughness: 0.5 }));
    okTabani.position.set(0, 0.15, -1.32);
    this.nesneler.add(okTabani);
  }

  private torbaKur(): void {
    const profil: THREE.Vector2[] = [];
    const nokta: [number, number][] = [
      [0, 0],
      [0.5, 0],
      [0.74, 0.12],
      [0.84, 0.4],
      [0.78, 0.7],
      [0.58, 0.9],
      [0.36, 1.0],
      [0.27, 1.08],
      [0.29, 1.14],
      [0.34, 1.2],
      [0.3, 1.26],
    ];
    for (const [x, y] of nokta) profil.push(new THREE.Vector2(x, y));
    const geo = new THREE.LatheGeometry(profil, 64);
    keseKirisiklari(geo);
    const kese = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: kumasDokusu(), color: '#e0c39a', roughness: 1, metalness: 0, side: THREE.DoubleSide }));
    kese.castShadow = true;
    kese.receiveShadow = true;
    kese.position.set(0, 0, -0.2);
    this.nesneler.add(kese);
    this.kese = kese;
    // Büzgü ipi
    const ip = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.03, 10, 40), new THREE.MeshStandardMaterial({ color: '#8a5a2a', roughness: 0.8 }));
    ip.rotation.x = Math.PI / 2;
    ip.position.set(0, 1.09, -0.2);
    this.nesneler.add(ip);
    // Bilye (renk oynatırken atanır)
    const bilye = new THREE.Mesh(
      new THREE.SphereGeometry(0.17, 48, 32),
      new THREE.MeshPhysicalMaterial({ color: '#c9463d', roughness: 0.15, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.1 })
    );
    bilye.castShadow = true;
    bilye.visible = false;
    this.nesneler.add(bilye);
    this.bilye = bilye;
    this.golge = this.temasGolgesi(0.2);
    this.golge.visible = false;
  }

  private kartKur(): void {
    const kenar = new THREE.MeshStandardMaterial({ color: '#efe5d0', roughness: 0.8 });
    const on = new THREE.MeshStandardMaterial({ map: kartOnDokusu('A', '♠', false), roughness: 0.6 });
    const arka = new THREE.MeshStandardMaterial({ map: kartArkaDokusu(), roughness: 0.6 });
    const geo = new THREE.BoxGeometry(0.74, 0.02, 1.04);
    const kart = new THREE.Mesh(geo, [kenar, kenar, on, arka, kenar, kenar]);
    kart.castShadow = true;
    kart.receiveShadow = true;
    kart.position.set(0.25, 0.01, 0.15);
    kart.rotation.z = Math.PI; // yüzü kapalı
    this.nesneler.add(kart);
    this.kart = kart;
    this.kartMalzemeleri = [on, arka];
    // Deste: yanda kapalı kartlar yığını
    const deste = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.28, 1.04), [kenar, kenar, arka, kenar, kenar, kenar]);
    deste.position.set(-0.75, 0.14, -0.25);
    deste.rotation.y = 0.08;
    deste.castShadow = true;
    deste.receiveShadow = true;
    this.nesneler.add(deste);
  }

  // ---------------------------------------------------------------------------
  // Oynatma
  // ---------------------------------------------------------------------------
  /**
   * Sonucu gösteren animasyonu başlatır; bitince 'bitti' olayı (detail.sonuc) yayılır.
   * hizli: toplu deneyde son sonucun kısa "yerleşme"si.
   */
  oynat(sonuc: Sonuc, hizli = false): void {
    if (this.kapatildi || !this.sablon || this.sablon.tur !== sonuc.tur) {
      this.dispatchEvent(olay('bitti', { sonuc }));
      return;
    }
    const bitti = () => {
      if (!this.sessiz) this.dispatchEvent(olay('bitti', { sonuc }));
    };
    switch (sonuc.tur) {
      case 'para':
        this.paraOynat(sonuc.yuz, hizli, bitti);
        break;
      case 'zar':
        this.zarOynat(sonuc.zarlar, hizli, bitti);
        break;
      case 'cark':
        this.carkOynat(sonuc.dilim, hizli, bitti);
        break;
      case 'torba':
        this.torbaOynat(sonuc.renk, hizli, bitti);
        break;
      case 'kart':
        this.kartOynat(sonuc.kart.deger, sonuc.kart.tur, hizli, bitti);
        break;
      case 'galton':
        this.galtonOynat(sonuc.yol, sonuc.kutu, hizli, bitti);
        break;
    }
  }

  /** Sonucu animasyonsuz gösterir (yeniden açılışta son sonuç); 'bitti' olayı yayılmaz. */
  yerlestir(sonuc: Sonuc): void {
    if (this.kapatildi || !this.sablon || this.sablon.tur !== sonuc.tur) return;
    this.aninda = true;
    this.sessiz = true;
    try {
      this.oynat(sonuc, true);
    } finally {
      this.aninda = false;
      this.sessiz = false;
    }
    this.ciz();
  }

  private paraOynat(yuz: ParaYuzu, hizli: boolean, bitti: () => void): void {
    const para = this.para;
    if (!para) return bitti();
    const baslangic = this.paraAcisi;
    const hedef = paraHedefAcisi(baslangic, yuz, hizli ? 1 : 4);
    const yukseklik = hizli ? 0.6 : 1.5;
    const sure = hizli ? 0.45 : 1.1;
    const ucusPayi = 0.72; // sürenin bu kısmı havada
    const sallanti = (this.secenekler.rastgele() - 0.5) * 0.5;
    this.baslat(
      sure,
      (t) => {
        let y: number;
        let aci: number;
        if (t < ucusPayi) {
          const u = t / ucusPayi;
          y = yukseklik * 4 * u * (1 - u);
          aci = baslangic + (hedef - baslangic) * kolayCikis(u);
        } else {
          // Küçük zıplama ve yerleşme
          const u = (t - ucusPayi) / (1 - ucusPayi);
          y = 0.22 * Math.abs(Math.sin(u * Math.PI)) * (1 - u);
          aci = hedef;
        }
        para.position.y = 0.035 + y;
        para.rotation.set(aci, sallanti * (1 - kolayCikis(t)), 0);
        // Havada yalnız temas gölgesi (yönlü gölgeyle iki ayrı gölge görünmesin)
        para.castShadow = y < 0.05;
        if (this.golge) this.golge.scale.setScalar(Math.max(0.35, 1 - y * 0.35));
      },
      () => {
        this.paraAcisi = hedef;
        para.rotation.set(hedef, 0, 0);
        para.position.y = 0.035;
        para.castShadow = true;
        bitti();
      }
    );
  }

  private zarOynat(yuzler: number[], hizli: boolean, bitti: () => void): void {
    if (!this.zarlar.length) return bitti();
    const r = this.secenekler.rastgele;
    const sure = hizli ? 0.5 : 1.3;
    const planlar = this.zarlar.map((zar, i) => {
      const yuz = yuzler[i] ?? yuzler[0] ?? 1;
      const hedefQ = zarYuzQuaternion(yuz, (r() - 0.5) * 1.2);
      const baslangicQ = zar.quaternion.clone();
      const eksen = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize();
      const hiz = (hizli ? 5 : 11) + r() * 4;
      const sonX = this.zarlar.length === 2 ? (i === 0 ? -0.5 : 0.5) + (r() - 0.5) * 0.2 : (r() - 0.5) * 0.3;
      const sonZ = (r() - 0.5) * 0.4;
      const ilkX = sonX - 0.8 - r() * 0.4;
      const ilkZ = sonZ - 1.4;
      return { zar, hedefQ, baslangicQ, eksen, hiz, ilkX, ilkZ, sonX, sonZ };
    });
    const donusQ = new THREE.Quaternion();
    const araQ = new THREE.Quaternion();
    this.baslat(
      sure,
      (t) => {
        for (const p of planlar) {
          // Parabol + iki zıplama
          const ilerleme = kolayCikis(t);
          const x = p.ilkX + (p.sonX - p.ilkX) * ilerleme;
          const z = p.ilkZ + (p.sonZ - p.ilkZ) * ilerleme;
          let y: number;
          if (t < 0.45) {
            const u = t / 0.45;
            y = 0.9 * 4 * u * (1 - u) + 0.5 * (1 - u);
          } else if (t < 0.75) {
            const u = (t - 0.45) / 0.3;
            y = 0.45 * 4 * u * (1 - u);
          } else {
            const u = (t - 0.75) / 0.25;
            y = 0.12 * 4 * u * (1 - u);
          }
          p.zar.position.set(x, 0.31 + y, z);
          // Serbest dönüş → hedefe slerp
          donusQ.setFromAxisAngle(p.eksen, p.hiz * t);
          araQ.copy(donusQ).multiply(p.baslangicQ);
          const k = yumusakAdim((t - 0.5) / 0.45);
          p.zar.quaternion.copy(araQ).slerp(p.hedefQ, k);
        }
      },
      () => {
        for (const p of planlar) {
          p.zar.quaternion.copy(p.hedefQ);
          p.zar.position.set(p.sonX, 0.31, p.sonZ);
        }
        bitti();
      }
    );
  }

  private carkOynat(dilim: number, hizli: boolean, bitti: () => void): void {
    const cark = this.cark;
    const sablon = this.sablon;
    if (!cark || !sablon || sablon.tur !== 'cark') return bitti();
    const baslangic = this.carkAcisi;
    const hedef = carkHedefAcisi(dilim, sablon.dilimler, baslangic, hizli ? 1 : 3 + Math.floor(this.secenekler.rastgele() * 2), this.secenekler.rastgele());
    const sure = hizli ? 0.6 : 2.4;
    this.baslat(
      sure,
      (t) => {
        cark.rotation.y = baslangic + (hedef - baslangic) * hizlanYavasla(t);
      },
      () => {
        this.carkAcisi = hedef;
        cark.rotation.y = hedef;
        bitti();
      }
    );
  }

  private torbaOynat(renkAdi: string, hizli: boolean, bitti: () => void): void {
    const bilye = this.bilye;
    const kese = this.kese;
    const sablon = this.sablon;
    if (!bilye || !kese || !sablon || sablon.tur !== 'torba') return bitti();
    const renk = sablon.bilyeler.find((b) => b.ad === renkAdi)?.renk ?? '#c9463d';
    (bilye.material as THREE.MeshPhysicalMaterial).color.set(renk);
    const r = this.secenekler.rastgele;
    const sure = hizli ? 0.5 : 1.4;
    const sonX = (r() - 0.5) * 1.2;
    const sonZ = 1.05 + r() * 0.3;
    const donEkseni = new THREE.Vector3(1, 0, 0);
    const baslangicQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize(), r() * IKI_PI);
    const kip = new THREE.Quaternion();
    this.baslat(
      sure,
      (t) => {
        // Kese sallanır (ilk yarı), bilye ağızdan fırlar ve yuvarlanır
        const salla = t < 0.35 ? Math.sin(t * 40) * 0.12 * (1 - t / 0.35) : 0;
        kese.rotation.z = salla;
        kese.scale.set(1 + salla * 0.6, 1 - Math.abs(salla) * 0.4, 1 + salla * 0.6);
        if (t < 0.3) {
          bilye.visible = false;
          if (this.golge) this.golge.visible = false;
          return;
        }
        bilye.visible = true;
        const u = (t - 0.3) / 0.7;
        const e = kolayCikis(u);
        const x = sonX * e;
        const z = -0.2 + (sonZ + 0.2) * e;
        let y: number;
        if (u < 0.55) {
          const v = u / 0.55;
          y = 1.2 + (0.17 - 1.2) * v + 0.5 * 4 * v * (1 - v);
        } else {
          const v = (u - 0.55) / 0.45;
          y = 0.17 + 0.16 * 4 * v * (1 - v) * (1 - v);
        }
        bilye.position.set(x, y, z);
        // Havada yalnız temas gölgesi
        bilye.castShadow = y - 0.17 < 0.06;
        kip.setFromAxisAngle(donEkseni, u * 7);
        bilye.quaternion.copy(kip).multiply(baslangicQ);
        if (this.golge) {
          this.golge.visible = true;
          this.golge.position.set(x, 0.004, z);
          this.golge.scale.setScalar(Math.max(0.3, 1 - (y - 0.17) * 0.6));
        }
      },
      () => {
        kese.rotation.z = 0;
        kese.scale.set(1, 1, 1);
        bilye.visible = true;
        bilye.castShadow = true;
        bilye.position.set(sonX, 0.17, sonZ);
        if (this.golge) {
          this.golge.visible = true;
          this.golge.position.set(sonX, 0.004, sonZ);
          this.golge.scale.setScalar(1);
        }
        bitti();
      }
    );
  }

  private kartOynat(deger: string, tur: KartTuru, hizli: boolean, bitti: () => void): void {
    const kart = this.kart;
    if (!kart) return bitti();
    const [on] = this.kartMalzemeleri;
    if (on) {
      on.map?.dispose();
      on.map = kartOnDokusu(deger, KART_TURU_SEMBOLU[tur], kartRengi(tur) === 'kirmizi');
      on.needsUpdate = true;
    }
    const sure = hizli ? 0.45 : 1.1;
    const baslangicX = -0.75;
    const baslangicZ = -0.25;
    const sonX = 0.25;
    const sonZ = 0.15;
    this.baslat(
      sure,
      (t) => {
        // Desteden kayar (ilk yarı), sonra havada dönüp yüzü açık iner
        const kay = kolayCikis(Math.min(1, t / 0.5));
        const x = baslangicX + (sonX - baslangicX) * kay;
        const z = baslangicZ + (sonZ - baslangicZ) * kay;
        const cevir = yumusakAdim((t - 0.35) / 0.55);
        const y = 0.29 * (1 - kay) + 0.01 + 0.5 * Math.sin(cevir * Math.PI);
        kart.position.set(x, y, z);
        kart.rotation.z = Math.PI * (1 - cevir);
        kart.rotation.y = 0.15 * (1 - cevir);
      },
      () => {
        kart.position.set(sonX, 0.011, sonZ);
        kart.rotation.set(0, 0, 0);
        bitti();
      }
    );
  }

  // ---------------------------------------------------------------------------
  // Galton tahtası
  // ---------------------------------------------------------------------------
  private galtonKur(sablon: Extract<Sablon, { tur: 'galton' }>): void {
    const n = Math.max(1, Math.trunc(sablon.satir));
    const yer = galtonYerlesimi(n);
    const istenen = istenenKutular(sablon);
    const koyu = this.secenekler.koyu;
    const W = yer.genislik;
    const H = yer.yukseklik;
    const CERCEVE = 0.12;
    const ALT_RAY = 0.42;
    const DERINLIK = 0.26;
    const Z_ON = 0.23;
    const Z_BILYE = 0.085;

    // Metal çivi/huni ve cam için yumuşak oda yansıması (yalnız Galton kurulumunda)
    this.sahne.environment = this.ortamDokusu();
    this.sahne.environmentIntensity = koyu ? 0.3 : 0.4;

    const dis = new THREE.Group();
    const tahta = new THREE.Group();
    dis.add(tahta);

    if (!this.meseDokulari) {
      const dikey = meseDokusu();
      dikey.center.set(0.5, 0.5);
      dikey.rotation = Math.PI / 2;
      this.meseDokulari = { yatay: meseDokusu(), dikey };
    }
    const meseYatay = this.meseDokulari.yatay;
    const meseDikey = this.meseDokulari.dikey;
    const meseY = new THREE.MeshStandardMaterial({ map: meseYatay, roughness: 0.6, metalness: 0 });
    const meseD = new THREE.MeshStandardMaterial({ map: meseDikey, roughness: 0.6, metalness: 0 });
    const metal = new THREE.MeshStandardMaterial({ color: '#e2cd9c', metalness: 0.8, roughness: 0.24, envMapIntensity: 1.1 });
    const blok = (w: number, h: number, dz: number, m: THREE.Material, x: number, y: number, z: number, hedef: THREE.Object3D = tahta) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, dz), m);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      hedef.add(mesh);
      return mesh;
    };

    // Arka panel (fildişi) ve çerçeve (meşe)
    blok(W, H + ALT_RAY, 0.03, new THREE.MeshStandardMaterial({ color: koyu ? '#efe4cc' : '#f7f0e1', roughness: 0.92, metalness: 0 }), 0, (H - ALT_RAY) / 2, -0.015);
    const direkBoyu = H + CERCEVE + ALT_RAY;
    for (const s of [-1, 1]) blok(CERCEVE, direkBoyu, DERINLIK, meseD, s * (W / 2 + CERCEVE / 2), (H + CERCEVE - ALT_RAY) / 2, Z_ON - DERINLIK / 2);
    blok(W, CERCEVE, DERINLIK, meseY, 0, H + CERCEVE / 2, Z_ON - DERINLIK / 2);
    blok(W, ALT_RAY, DERINLIK, meseY, 0, -ALT_RAY / 2, Z_ON - DERINLIK / 2);

    // Kutu numaraları şeridi (alt rayın önünde): ton eşlemesiz, gölgesiz etiket; rakamlar mürekkep
    // renginde tam kontrastla okunur (akıllı tahta: rakam yüksekliği şeridin ~%60'ı)
    const numaraYuksekligi = ALT_RAY * 0.86;
    const numaraMalzeme = new THREE.MeshBasicMaterial({ map: galtonNumaraDokusu(n, istenen, numaraYuksekligi), toneMapped: false });
    const numara = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.99, numaraYuksekligi), numaraMalzeme);
    numara.position.set(0, -ALT_RAY / 2, Z_ON + 0.002);
    tahta.add(numara);

    // Kutu bölmeleri ve istenen kutuların altın zemini (vurguDiz; koşul değişince yalnız o yenilenir)
    for (let k = 1; k <= n; k++) blok(0.018, yer.kutuY, 0.18, meseD, kutuX(k, n) - GALTON_ARALIK / 2, yer.kutuY / 2, 0.09);
    const vurguMalzeme = new THREE.MeshBasicMaterial({ color: '#c99a52', transparent: true, opacity: koyu ? 0.2 : 0.16, depthWrite: false });
    const vurguGeo = new THREE.PlaneGeometry(GALTON_ARALIK - 0.02, yer.kutuY);
    const vurgu = new THREE.Group();
    tahta.add(vurgu);

    // Çiviler: üçgen düzen, arka panelden öne çıkan şampanya metal silindirler
    const civiler = civiKonumlari(n);
    const civiGeo = new THREE.CylinderGeometry(GALTON_CIVI_R, GALTON_CIVI_R, 0.17, 20);
    civiGeo.rotateX(Math.PI / 2);
    const civi = new THREE.InstancedMesh(civiGeo, metal, civiler.length);
    const m4 = new THREE.Matrix4();
    civiler.forEach((c, i) => civi.setMatrixAt(i, m4.makeTranslation(c.x, c.y, 0.085)));
    civi.castShadow = true;
    civi.receiveShadow = true;
    tahta.add(civi);
    // Çivi başları (hafif geniş pul)
    const basGeo = new THREE.CylinderGeometry(GALTON_CIVI_R * 1.35, GALTON_CIVI_R * 1.35, 0.012, 18);
    basGeo.rotateX(Math.PI / 2);
    const baslar = new THREE.InstancedMesh(basGeo, metal, civiler.length);
    civiler.forEach((c, i) => baslar.setMatrixAt(i, m4.makeTranslation(c.x, c.y, 0.172)));
    baslar.castShadow = true;
    tahta.add(baslar);

    // Huni: iki eğik metal levha; içinde bekleyen birkaç bilye
    const a = GALTON_BILYE_R * 1.45;
    const b = Math.min(W / 2 - 0.05, 0.75);
    for (const s of [-1, 1]) {
      const dx = s * (b - a);
      const dy = yer.huniUstY - yer.huniCikisY;
      const levha = blok(Math.hypot(dx, dy), 0.022, 0.17, metal, s * (a + b) / 2, (yer.huniCikisY + yer.huniUstY) / 2, 0.085);
      levha.rotation.z = Math.atan2(dy, dx);
    }
    const bilyeGeo = new THREE.SphereGeometry(GALTON_BILYE_R, 32, 22);
    const yiginMalzeme = new THREE.MeshPhysicalMaterial({ color: '#2a9d94', roughness: 0.18, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.12 });
    const bekleyenler: [number, number][] = [
      [-0.075, 0.1],
      [0.075, 0.1],
      [-0.2, 0.2],
      [-0.065, 0.225],
      [0.07, 0.225],
      [0.2, 0.2],
    ];
    for (const [x, y] of bekleyenler) {
      const bb = new THREE.Mesh(bilyeGeo, yiginMalzeme);
      bb.position.set(x, yer.huniCikisY + y, Z_BILYE);
      bb.castShadow = true;
      tahta.add(bb);
    }

    // Yığınlar (histogram): InstancedMesh, kutu başına en çok 28 bilye
    const yigin = new THREE.InstancedMesh(new THREE.SphereGeometry(GALTON_BILYE_R, 18, 12), yiginMalzeme, (n + 1) * GALTON_YIGIN_KAPASITE);
    yigin.count = 0;
    yigin.castShadow = true;
    yigin.receiveShadow = true;
    yigin.frustumCulled = false;
    tahta.add(yigin);

    // Oynatılan (son) bilye: mercan
    const bilye = new THREE.Mesh(bilyeGeo, new THREE.MeshPhysicalMaterial({ color: '#d9805f', roughness: 0.15, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.08 }));
    bilye.castShadow = true;
    bilye.visible = false;
    tahta.add(bilye);

    // Teorik dağılım eğrisi: kutuların önünde altın kesikli çizgi
    const egri = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.02, 0.02, 1, 10),
      new THREE.MeshStandardMaterial({ color: '#d8a650', emissive: '#b9884a', emissiveIntensity: 0.55, roughness: 0.35, metalness: 0.2 }),
      EGRI_KESIK_SAYISI
    );
    egri.frustumCulled = false;
    egri.visible = false;
    tahta.add(egri);

    // "×N" etiketi (oranlı ölçekte): tahtanın sağında, çerçevenin dışında kutular hizasında durur;
    // çivileri ve yığın tepelerini örtmez. Boyu tahta boyuyla orantılı (ekranda satır sayısından bağımsız)
    const etiketTuval = document.createElement('canvas');
    etiketTuval.width = 256;
    etiketTuval.height = 128;
    const etiketDoku = new THREE.CanvasTexture(etiketTuval);
    etiketDoku.colorSpace = THREE.SRGBColorSpace;
    const etiket = new THREE.Sprite(new THREE.SpriteMaterial({ map: etiketDoku, transparent: true, depthWrite: false, toneMapped: false }));
    const disYukseklik = H + ALT_RAY + CERCEVE;
    const etiketH = 0.09 * disYukseklik;
    const etiketW = etiketH * 2;
    etiket.scale.set(etiketW, etiketH, 1);
    etiket.position.set(W / 2 + CERCEVE + 0.06 + etiketW / 2, yer.kutuY * 0.72, Z_ON);
    etiket.visible = false;
    etiket.renderOrder = 3;
    tahta.add(etiket);

    // Toplu denemede yağan süs bilyeleri (≤ 8)
    const yagmur: YagmurBilyesi[] = [];
    for (let i = 0; i < 8; i++) {
      const mesh = new THREE.Mesh(bilyeGeo, yiginMalzeme);
      mesh.visible = false;
      mesh.castShadow = true;
      tahta.add(mesh);
      yagmur.push({ mesh, noktalar: [], inisY: 0, t: 0, sure: 0.6, bekleme: i * 0.07 });
    }

    // Cam: çok hafif yansımalı, düşük opaklık
    const cam = new THREE.Mesh(
      new THREE.PlaneGeometry(W, H),
      new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.07, roughness: 0.04, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.04, depthWrite: false })
    );
    cam.position.set(0, H / 2, 0.195);
    cam.renderOrder = 2;
    tahta.add(cam);

    // Kaide ve arka destek
    const KAIDE = 0.08;
    blok(W + 0.7, KAIDE, 0.75, meseY, 0, KAIDE / 2, -0.05, dis);
    tahta.position.set(0, KAIDE + ALT_RAY, 0);
    tahta.rotation.x = -0.17;
    const olcek = 2.35 / disYukseklik;
    dis.scale.setScalar(olcek);
    this.nesneler.add(dis);

    this.galton = {
      n,
      yer,
      tahta,
      yigin,
      bilye,
      egri,
      etiket,
      etiketTuval,
      etiketMetni: '',
      yagmur,
      olcek,
      numaraMalzeme,
      numaraYuksekligi,
      vurgu,
      vurguGeo,
      vurguMalzeme,
      yariGenislik: W / 2 + CERCEVE + 0.06 + etiketW,
      disYukseklik: disYukseklik + KAIDE,
    };
    this.vurguDiz(istenen);
    if (this.galtonSayim.length !== n + 1) this.galtonSayim = new Array(n + 1).fill(0);
    this.galtonSon = null;
    this.galtonUcuyor = false;
    this.yiginCiz();
  }

  /**
   * Tahtayı kadraja sığdırır (en-boy oranı değişince yeniden): kaideden tahta tepesine yükseklik
   * görüntünün ~%90'ını kaplar; dar kapta "×N" etiketi dahil genişlik sığdırılır.
   */
  private galtonKamerasi(): void {
    const g = this.galton;
    if (!g) return;
    const yukseklik = g.disYukseklik * g.olcek;
    const merkez = new THREE.Vector3(0, yukseklik / 2, 0.04);
    const yariY = (yukseklik / 2) * 1.1;
    const yariX = g.yariGenislik * g.olcek * 1.06;
    const tanV = Math.tan(THREE.MathUtils.degToRad(this.kamera.fov / 2));
    const mesafe = Math.max(yariY / tanV, yariX / (tanV * Math.max(0.3, this.kamera.aspect)));
    const yon = new THREE.Vector3(0.06, 0.12, 1).normalize();
    this.kamera.position.copy(merkez).addScaledVector(yon, mesafe);
    this.kamera.lookAt(merkez);
  }

  /** İstenen kutuların altın zeminlerini dizer (paylaşılan geometri/malzeme; tahta yeniden kurulmaz). */
  private vurguDiz(istenen: Set<number>): void {
    const g = this.galton;
    if (!g) return;
    g.vurgu.clear();
    for (const k of istenen) {
      const v = new THREE.Mesh(g.vurguGeo, g.vurguMalzeme);
      v.position.set(kutuX(k, g.n), g.yer.kutuY / 2, 0.002);
      g.vurgu.add(v);
    }
  }

  /**
   * Galton koşulu (istenen kutular) değişti: yalnız numara şeridi ve altın zeminler güncellenir.
   * Satır sayısı farklıysa (ya da tahta yoksa) tahta yeniden kurulur.
   */
  galtonVurgula(sablon: Sablon): void {
    if (this.kapatildi || sablon.tur !== 'galton') return;
    const g = this.galton;
    if (!g || g.n !== Math.max(1, Math.trunc(sablon.satir))) {
      this.kur(sablon);
      return;
    }
    this.sablon = sablon;
    const istenen = istenenKutular(sablon);
    const eski = g.numaraMalzeme.map;
    g.numaraMalzeme.map = galtonNumaraDokusu(g.n, istenen, g.numaraYuksekligi);
    g.numaraMalzeme.needsUpdate = true;
    eski?.dispose();
    this.vurguDiz(istenen);
    this.ciz();
  }

  /** Yığınları, son bilyeyi, "×N" etiketini ve teorik eğriyi mevcut sayımlara göre çizer. */
  private yiginCiz(): void {
    const g = this.galton;
    if (!g) return;
    const n = g.n;
    const sayim = this.galtonSayim.length === n + 1 ? this.galtonSayim : new Array(n + 1).fill(0);
    const { gorunen, temsil, oranli } = yiginOlcegi(sayim, GALTON_YIGIN_KAPASITE);
    const m4 = new THREE.Matrix4();
    let i = 0;
    let sonKonum: { x: number; y: number } | null = null;
    for (let k = 0; k <= n; k++) {
      let v = gorunen[k];
      if (this.galtonSon === k && v > 0) {
        const son = sonBilyeKonumu(k, n, v, oranli);
        sonKonum = son;
        if (son.cikar) v -= 1;
      }
      for (let s = 0; s < v; s++) {
        const p = yiginKonumu(k, n, s);
        g.yigin.setMatrixAt(i++, m4.makeTranslation(p.x, p.y, 0.085));
      }
    }
    g.yigin.count = i;
    g.yigin.instanceMatrix.needsUpdate = true;
    if (!this.galtonUcuyor) {
      g.bilye.visible = sonKonum !== null;
      if (sonKonum) {
        g.bilye.position.set(sonKonum.x, sonKonum.y, 0.085);
        g.bilye.rotation.set(0, 0, 0);
      }
    }

    // "×N": oranlı ölçekte bir görünür bilye birden çok denemeyi temsil eder
    if (oranli) {
      const metin = `×${temsilMetni(temsil)}`;
      if (metin !== g.etiketMetni) {
        g.etiketMetni = metin;
        const ctx = g.etiketTuval.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, 256, 128);
          ctx.fillStyle = 'rgba(251,247,238,0.94)';
          ctx.strokeStyle = '#b9884a';
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.roundRect(8, 16, 240, 96, 48);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#15302d';
          ctx.font = '800 60px Manrope, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(metin, 128, 66);
        }
        (g.etiket.material.map as THREE.Texture).needsUpdate = true;
      }
      g.etiket.visible = true;
    } else {
      g.etiket.visible = false;
    }

    // Teorik eğri: beklenen yığın yüksekliği (toplam · C(n,k)/2^n / temsil)
    const toplam = sayim.reduce((t, s) => t + s, 0);
    g.egri.visible = this.teorikEgriGorunur && toplam > 0;
    if (g.egri.visible) {
      const oranlar = galtonTeorikOranlar(n);
      const noktalar = oranlar.map((p, k) => new THREE.Vector3(kutuX(k, n), Math.min(g.yer.kutuY - 0.01, yiginYuksekligi((toplam * p) / temsil)) + 0.01, 0.188));
      const egri = new THREE.CatmullRomCurve3(noktalar, false, 'centripetal');
      const pts = egri.getSpacedPoints(EGRI_KESIK_SAYISI * 2);
      const q = new THREE.Quaternion();
      const yon = new THREE.Vector3();
      const orta = new THREE.Vector3();
      const olc = new THREE.Vector3();
      for (let j = 0; j < EGRI_KESIK_SAYISI; j++) {
        const p0 = pts[j * 2];
        const p1 = pts[j * 2 + 1];
        yon.subVectors(p1, p0);
        const uz = Math.max(1e-4, yon.length());
        q.setFromUnitVectors(YUKARI, yon.normalize());
        orta.addVectors(p0, p1).multiplyScalar(0.5);
        olc.set(1, uz, 1);
        g.egri.setMatrixAt(j, m4.compose(orta, q, olc));
      }
      g.egri.instanceMatrix.needsUpdate = true;
    }
  }

  /** Kutu başına sayımları (soldan sağa) gösterir: yığınlar, "×N" etiketi, teorik eğri. */
  birikimGoster(sayimlar: readonly number[]): void {
    if (this.kapatildi) return;
    this.galtonSayim = sayimlar.map((s) => Math.max(0, Math.trunc(s) || 0));
    if (this.galtonSayim.every((s) => s === 0)) this.galtonSon = null;
    this.yiginCiz();
    this.ciz();
  }

  /** Teorik eğriyi açar/kapatır. */
  teorikEgri(goster: boolean): void {
    this.teorikEgriGorunur = goster;
    if (this.kapatildi) return;
    this.yiginCiz();
    this.ciz();
  }

  /** Toplu denemede süs bilyelerinin yağmasını başlatır/durdurur (salt görsel). */
  yagmur(aktif: boolean): void {
    if (this.kapatildi) return;
    this.yagmurAktif = aktif && this.galton !== null && !this.secenekler.azHareket;
    if (this.yagmurAktif && this.galton) this.galton.yagmur.forEach((b, i) => (b.bekleme = i * 0.07));
    this.dongulemeGuncelle();
  }

  private yagmurAdimi(dt: number): void {
    const g = this.galton;
    if (!g) return;
    const r = this.secenekler.rastgele;
    for (const b of g.yagmur) {
      if (!b.mesh.visible) {
        if (!this.yagmurAktif) continue;
        b.bekleme -= dt;
        if (b.bekleme > 0) continue;
        const yol = Array.from({ length: g.n }, (): number => (r() < 0.5 ? 0 : 1));
        const kutu = yol.reduce((t, x) => t + x, 0);
        b.noktalar = bilyeYolu(yol);
        const olc = yiginOlcegi(this.galtonSayim.length === g.n + 1 ? this.galtonSayim : [], GALTON_YIGIN_KAPASITE);
        const gorunen = olc.gorunen[kutu] ?? 0;
        // Oranlı ölçekte dolu yığının içine değil üstüne düşer
        b.inisY = olc.oranli ? sonBilyeKonumu(kutu, g.n, gorunen, true).y : yiginKonumu(kutu, g.n, gorunen).y;
        b.t = 0;
        b.sure = 0.45 + g.n * 0.035;
        b.mesh.visible = true;
      }
      b.t += dt / b.sure;
      if (b.t >= 1) {
        b.mesh.visible = false;
        b.bekleme = r() * 0.12;
        continue;
      }
      const p = yolKonumu(b.noktalar, b.inisY, b.t);
      b.mesh.position.set(p.x, p.y, 0.085);
    }
  }

  private galtonOynat(yol: number[], kutu: number, hizli: boolean, bitti: () => void): void {
    const g = this.galton;
    if (!g || yol.length !== g.n) return bitti();
    // Hızlı yerleşmede (toplu deneyin sonu, yeniden açılış) sonuç sayıma zaten işlenmiştir:
    // bilye yığının tepesindeki yerine iner. Tek denemede sayım sonra artar: bir üst sıraya iner.
    this.galtonUcuyor = false;
    this.galtonSon = hizli ? kutu : null;
    this.yiginCiz();
    // İniş yeri, sonuç sayıma işlendikten sonraki yığına göre yiginCiz ile aynı kuralla seçilir;
    // bitti'den sonra birikimGoster bilyeyi yerinden oynatmaz. Oranlı ölçekte dolu yığının içine
    // değil üstüne iner.
    const sonraki = this.galtonSayim.length === g.n + 1 ? this.galtonSayim.slice() : new Array<number>(g.n + 1).fill(0);
    if (!hizli) sonraki[kutu] += 1;
    const olc = yiginOlcegi(sonraki, GALTON_YIGIN_KAPASITE);
    const inis = sonBilyeKonumu(kutu, g.n, Math.max(1, olc.gorunen[kutu] ?? 1), olc.oranli);
    const noktalar = bilyeYolu(yol);
    noktalar[noktalar.length - 1] = { x: inis.x, y: noktalar[noktalar.length - 1].y };
    const bilye = g.bilye;
    this.galtonUcuyor = true;
    bilye.visible = true;
    const sure = hizli ? 0.6 : 1.2 + ((g.n - 2) / 8) * 1.0;
    this.baslat(
      sure,
      (t) => {
        const p = yolKonumu(noktalar, inis.y, t);
        bilye.position.set(p.x, p.y, 0.085);
        bilye.rotation.set(0, 0, -p.x / GALTON_BILYE_R);
      },
      () => {
        bilye.position.set(inis.x, inis.y, 0.085);
        bilye.visible = true;
        this.galtonUcuyor = false;
        this.galtonSon = kutu;
        bitti();
      }
    );
  }

  // ---------------------------------------------------------------------------
  // Kapatma
  // ---------------------------------------------------------------------------
  dispose(): void {
    if (this.kapatildi) return;
    // Süren animasyon varsa sona sarılır ve 'bitti' yayılır: tema değişiminde sahne yeniden
    // kurulurken bekleyen sonuç kaybolmasın, uygulama 'Deneniyor…'da kilitli kalmasın
    const a = this.animasyon;
    this.animasyon = null;
    if (a) {
      try {
        a.adim(1);
      } catch {
        /* nesneler sökülmüş olabilir */
      }
      a.bitti();
    }
    this.kapatildi = true;
    this.renderer.setAnimationLoop(null);
    this.dongude = false;
    this.boyutGozlemci?.disconnect();
    for (const sok of this.sokuculer.splice(0)) sok();
    this.nesneleriSok();
    this.ertelenenleriBirak();
    this.ortamHedefi?.dispose();
    this.ortamHedefi = null;
    this.meseDokulari?.yatay.dispose();
    this.meseDokulari?.dikey.dispose();
    this.meseDokulari = null;
    const kalanlar: THREE.Object3D[] = [];
    this.sahne.traverse((o) => kalanlar.push(o));
    for (const o of kalanlar) {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) continue;
      mesh.geometry.dispose();
      for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) m.dispose();
    }
    this.sahne.clear();
    this.isik.shadow.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}

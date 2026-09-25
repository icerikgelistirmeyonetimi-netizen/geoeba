/**
 * Algoritma Laboratuvarı — 3B sera sahnesi (three.js).
 *
 * React'tan bağımsız sınıf. kur(dunya) sırayı (yol, saksılar / domates fideleri, sera duvarları)
 * kurar; goster(durum) dünyanın bir anını animasyonsuz çizer; oynat(adim, onceki, hiz) bir
 * yorumlayıcı adımını canlandırır ve bitince çözülen bir Promise döner. durdur() süren
 * animasyonu keser (arayüz ardından goster ile son durumu çizer).
 *
 * Görsel dil Olasılık Laboratuvarı ve adalar sahnesiyle aynı: AgX ton eşleme, sRGB, PCFSoft
 * gölge, gök ışığı + gölgeli güneş, RoomEnvironment yansımaları, ada paleti. Bütün modeller
 * yordamsal olarak burada kurulur (dış dosya yok); dokular tuvalde üretilir.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { bitkiSirasi, hucreNo, izgara, type DunyaDurumu, type DunyaTanimi, type DunyaTuru, type Hata, type Izgara } from './dunya';
import { DunyaKatmani, KARO_UST, KUP } from './sahneKatmani';
import type { Adim } from './yorumlayici';
import {
  ARKA_DUVAR_Z,
  BAHCE_HUCRE,
  BAHCE_KOSE,
  BITKI_Z,
  bahceHucre,
  bahceKamerasi,
  HUCRE,
  YOL_Z,
  aciFarki,
  hizlanYavasla,
  hucreX,
  kameraYerlesimi,
  kolayCikis,
  yay,
  yonAcisi,
  yumusak,
} from './sahneYerlesimi';

export interface Donanim {
  tank: boolean;
  sepet: boolean;
  gubre: boolean;
}

export interface SeraSahnesiSecenekleri {
  koyu?: boolean;
  azHareket?: boolean;
}

export type RobotIfadesi = 'normal' | 'mutlu' | 'uzgun' | 'dusunceli';

// ---------------------------------------------------------------------------
// Palet
// ---------------------------------------------------------------------------
const RENK = {
  fildisi: '#f4efe3',
  murekkep: '#15302d',
  deniz: '#216a78',
  vurgu: '#2a9d94',
  mercan: '#d9805f',
  altin: '#b9884a',
  pismisToprak: '#c46a43',
  pismisToprakKoyu: '#a4532f',
  kuruToprak: '#c49a64',
  nemliToprak: '#4e3322',
  yaprak: '#5c9a45',
  yaprakAcik: '#86bb5c',
  sariYaprak: '#d8b347',
  kirmizi: '#d83b2b',
  yesilDomates: '#86b24a',
  su: '#4fa7d6',
  bambu: '#d8c08c',
  ahsap: '#c79c6b',
  yesilZemin: '#5e9d5a',
  hata: '#d9534f',
};

// ---------------------------------------------------------------------------
// Tuval dokuları
// ---------------------------------------------------------------------------
function tuval(en: number, boy: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = en;
  c.height = boy;
  const g = c.getContext('2d');
  if (!g) throw new Error('2B tuval yok');
  return [c, g];
}

function dokuYap(c: HTMLCanvasElement, tekrar = false): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (tekrar) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Tohumlu gürültü (dokular her açılışta aynı görünsün) */
function uretec(tohum: number) {
  let a = tohum >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function ahsapDokusu(): THREE.CanvasTexture {
  const [c, g] = tuval(256, 256);
  const r = uretec(7);
  g.fillStyle = '#c99f6e';
  g.fillRect(0, 0, 256, 256);
  // Tahta şeritleri
  for (let s = 0; s < 4; s++) {
    const y = s * 64;
    g.fillStyle = s % 2 ? '#c49867' : '#cda577';
    g.fillRect(0, y, 256, 64);
    for (let i = 0; i < 26; i++) {
      g.strokeStyle = `rgba(120, 78, 40, ${0.05 + r() * 0.1})`;
      g.lineWidth = 0.6 + r() * 1.4;
      g.beginPath();
      const yy = y + 4 + r() * 56;
      g.moveTo(0, yy);
      for (let x = 0; x <= 256; x += 32) g.lineTo(x, yy + (r() - 0.5) * 3);
      g.stroke();
    }
    g.fillStyle = 'rgba(80, 50, 25, 0.35)';
    g.fillRect(0, y, 256, 2);
  }
  return dokuYap(c, true);
}

function toprakDokusu(kuru: boolean): THREE.CanvasTexture {
  const [c, g] = tuval(512, 512);
  const r = uretec(kuru ? 11 : 13);
  const N = 512;
  g.fillStyle = kuru ? '#dcbd8c' : '#3f281a';
  g.fillRect(0, 0, N, N);
  // Taneli yüzey
  for (let i = 0; i < 4200; i++) {
    const v = r();
    g.fillStyle = kuru ? `rgba(${168 + v * 60}, ${128 + v * 46}, ${80 + v * 36}, 0.45)` : `rgba(${34 + v * 46}, ${20 + v * 26}, ${12 + v * 16}, 0.55)`;
    const s = 1 + r() * 4;
    g.beginPath();
    g.arc(r() * N, r() * N, s / 2, 0, Math.PI * 2);
    g.fill();
  }
  if (kuru) {
    // Kuru toprak: çokgen çatlak ağı (belirgin koyu çizgiler)
    const hucreler: [number, number][] = [];
    for (let i = 0; i < 16; i++) hucreler.push([r() * N, r() * N]);
    g.strokeStyle = 'rgba(105, 66, 32, 0.85)';
    g.lineCap = 'round';
    for (const [x0, y0] of hucreler) {
      const kol = 3 + Math.floor(r() * 2);
      for (let k = 0; k < kol; k++) {
        let x = x0;
        let y = y0;
        const a = (k / kol) * Math.PI * 2 + r() * 0.6;
        g.lineWidth = 2.2 + r() * 2.4;
        g.beginPath();
        g.moveTo(x, y);
        for (let s = 0; s < 5; s++) {
          x += Math.cos(a + (r() - 0.5) * 0.9) * 22;
          y += Math.sin(a + (r() - 0.5) * 0.9) * 22;
          g.lineTo(x, y);
        }
        g.stroke();
      }
    }
    // Açık tozlu lekeler
    for (let i = 0; i < 10; i++) {
      const x = r() * N;
      const y = r() * N;
      const gr = g.createRadialGradient(x, y, 0, x, y, 60);
      gr.addColorStop(0, 'rgba(240, 222, 186, 0.35)');
      gr.addColorStop(1, 'rgba(240, 222, 186, 0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, N, N);
    }
  } else {
    // Islak toprak: koyu, küçük parlak su lekeleri
    for (let i = 0; i < 26; i++) {
      const x = r() * N;
      const y = r() * N;
      const gr = g.createRadialGradient(x, y, 0, x, y, 10 + r() * 18);
      gr.addColorStop(0, 'rgba(150, 175, 185, 0.42)');
      gr.addColorStop(1, 'rgba(150, 175, 185, 0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, N, N);
    }
    // Kenara doğru koyulaşan halka (su saksı kenarında toplanır)
    const gr = g.createRadialGradient(N / 2, N / 2, N * 0.28, N / 2, N / 2, N * 0.5);
    gr.addColorStop(0, 'rgba(20, 10, 5, 0)');
    gr.addColorStop(1, 'rgba(20, 10, 5, 0.45)');
    g.fillStyle = gr;
    g.fillRect(0, 0, N, N);
  }
  return dokuYap(c);
}

function cakilDokusu(): THREE.CanvasTexture {
  const [c, g] = tuval(256, 256);
  const r = uretec(5);
  g.fillStyle = '#d8ccb3';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1400; i++) {
    const v = r();
    g.fillStyle = `rgba(${150 + v * 80}, ${138 + v * 70}, ${112 + v * 60}, ${0.4 + r() * 0.5})`;
    g.beginPath();
    g.ellipse(r() * 256, r() * 256, 1 + r() * 3, 1 + r() * 2.2, r() * Math.PI, 0, Math.PI * 2);
    g.fill();
  }
  return dokuYap(c, true);
}

function zeminDokusu(koyu: boolean): THREE.CanvasTexture {
  const [c, g] = tuval(256, 256);
  const r = uretec(3);
  g.fillStyle = koyu ? '#2a3d40' : '#e8dfcd';
  g.fillRect(0, 0, 256, 256);
  // Büyük taş plakalar
  g.strokeStyle = koyu ? 'rgba(0,0,0,0.25)' : 'rgba(150, 132, 104, 0.35)';
  g.lineWidth = 2;
  for (let i = 0; i <= 2; i++) {
    g.beginPath();
    g.moveTo(0, i * 128);
    g.lineTo(256, i * 128);
    g.stroke();
    g.beginPath();
    g.moveTo(i * 128, 0);
    g.lineTo(i * 128, 256);
    g.stroke();
  }
  for (let i = 0; i < 700; i++) {
    g.fillStyle = koyu ? `rgba(255,255,255,${r() * 0.03})` : `rgba(120, 100, 70, ${r() * 0.07})`;
    g.fillRect(r() * 256, r() * 256, 2, 2);
  }
  return dokuYap(c, true);
}

function gokDokusu(koyu: boolean): THREE.CanvasTexture {
  const [c, g] = tuval(8, 256);
  const gr = g.createLinearGradient(0, 0, 0, 256);
  if (koyu) {
    gr.addColorStop(0, '#0d1d24');
    gr.addColorStop(0.6, '#17323a');
    gr.addColorStop(1, '#23444b');
  } else {
    gr.addColorStop(0, '#bcdde2');
    gr.addColorStop(0.55, '#e4efe9');
    gr.addColorStop(1, '#f6eedc');
  }
  g.fillStyle = gr;
  g.fillRect(0, 0, 8, 256);
  return dokuYap(c);
}

/** Temas gölgesi: ortası koyu, kenara doğru saydam daire */
function golgeDokusu(): THREE.CanvasTexture {
  const [c, g] = tuval(128, 128);
  const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  gr.addColorStop(0, 'rgba(0,0,0,0.62)');
  gr.addColorStop(0.55, 'rgba(0,0,0,0.3)');
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  const t = dokuYap(c);
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

/** Çimen: açık yeşil zemin, ince ot çizgileri ve hafif lekeler */
function cimDokusu(koyu: boolean): THREE.CanvasTexture {
  const [c, g] = tuval(512, 512);
  const r = uretec(31);
  g.fillStyle = koyu ? '#274a38' : '#8fbe68';
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 18; i++) {
    const x = r() * 512;
    const y = r() * 512;
    const gr = g.createRadialGradient(x, y, 0, x, y, 40 + r() * 60);
    gr.addColorStop(0, koyu ? 'rgba(20,50,35,0.35)' : 'rgba(120,170,80,0.45)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 512, 512);
  }
  for (let i = 0; i < 5200; i++) {
    const x = r() * 512;
    const y = r() * 512;
    const v = r();
    g.strokeStyle = koyu ? `rgba(${40 + v * 40}, ${80 + v * 50}, ${55 + v * 30}, 0.55)` : `rgba(${95 + v * 60}, ${150 + v * 50}, ${60 + v * 40}, 0.6)`;
    g.lineWidth = 1 + r() * 1.2;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + (r() - 0.5) * 5, y - 3 - r() * 6);
    g.stroke();
  }
  return dokuYap(c, true);
}

/** Bahçe yolu taşı: sıcak açık gri, ince benekler, kenara doğru hafif koyulaşma */
function tasDokusu(): THREE.CanvasTexture {
  const [c, g] = tuval(256, 256);
  const r = uretec(41);
  g.fillStyle = '#e9e2d4';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1600; i++) {
    const v = r();
    g.fillStyle = `rgba(${150 + v * 70}, ${140 + v * 60}, ${120 + v * 55}, ${0.18 + r() * 0.3})`;
    g.fillRect(r() * 256, r() * 256, 1 + r() * 2.5, 1 + r() * 2.5);
  }
  const gr = g.createRadialGradient(128, 128, 70, 128, 128, 182);
  gr.addColorStop(0, 'rgba(90,70,50,0)');
  gr.addColorStop(1, 'rgba(90,70,50,0.22)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 256, 256);
  return dokuYap(c);
}

/** Adım izi: fildişi yuvarlak, deniz mavisi kenar, ortada adım numarası */
function izDokusu(n: number): THREE.CanvasTexture {
  const [c, g] = tuval(128, 128);
  g.fillStyle = '#fbf7ee';
  g.beginPath();
  g.arc(64, 64, 58, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#216a78';
  g.lineWidth = 9;
  g.beginPath();
  g.arc(64, 64, 52, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = '#15302d';
  g.font = `800 ${n >= 10 ? 58 : 70}px ${yaziYuklu()}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(String(n), 64, 70);
  return dokuYap(c);
}

function yaziYuklu(): string {
  try {
    return typeof document !== 'undefined' && document.fonts?.check('800 40px Manrope') ? 'Manrope' : 'Segoe UI';
  } catch {
    return 'Segoe UI';
  }
}

/** Zemine boyanmış yazı (BAŞLA / ÇIKIŞ): saydam zemin, fildişi harf */
function zeminYazisi(metin: string, renk = 'rgba(251, 247, 238, 0.95)'): THREE.CanvasTexture {
  const [c, g] = tuval(512, 160);
  g.clearRect(0, 0, 512, 160);
  g.fillStyle = renk;
  g.font = `800 92px ${yaziYuklu()}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(metin, 256, 84);
  return dokuYap(c);
}

/** Tabela: koyu zemin, açık yazı (ÇIKIŞ) */
function tabelaDokusu(metin: string, zemin: string): THREE.CanvasTexture {
  const [c, g] = tuval(512, 192);
  g.fillStyle = zemin;
  const r = 28;
  g.beginPath();
  g.roundRect(8, 8, 496, 176, r);
  g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.35)';
  g.lineWidth = 6;
  g.beginPath();
  g.roundRect(22, 22, 468, 148, r - 10);
  g.stroke();
  g.fillStyle = '#fbf7ee';
  g.font = `800 96px ${yaziYuklu()}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(metin, 256, 100);
  return dokuYap(c);
}

/** Saksı numarası: tahta etiket; bahçede pişmiş toprak renkli (adım izlerinin krem dairelerinden ayrılsın) */
function numaraDokusu(n: number, toprakRengi = false): THREE.CanvasTexture {
  const [c, g] = tuval(128, 128);
  g.fillStyle = toprakRengi ? '#c46f4b' : '#f1e2c4';
  g.beginPath();
  g.roundRect(4, 4, 120, 120, 22);
  g.fill();
  g.strokeStyle = toprakRengi ? 'rgba(255, 244, 228, 0.55)' : 'rgba(120, 84, 44, 0.5)';
  g.lineWidth = 5;
  g.beginPath();
  g.roundRect(10, 10, 108, 108, 18);
  g.stroke();
  g.fillStyle = toprakRengi ? '#fffaf1' : '#15302d';
  g.font = `800 76px ${yaziYuklu()}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(String(n), 64, 70);
  return dokuYap(c);
}

/** Domatesin kütle etiketi: krem hap üstünde koyu yazı ("120 g") */
function gramDokusu(gram: number): THREE.CanvasTexture {
  const [c, g] = tuval(256, 96);
  g.fillStyle = '#f7f1e3';
  g.beginPath();
  g.roundRect(6, 8, 244, 80, 38);
  g.fill();
  g.strokeStyle = 'rgba(120, 84, 44, 0.55)';
  g.lineWidth = 5;
  g.stroke();
  g.fillStyle = '#15302d';
  g.font = `800 56px ${yaziYuklu()}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(`${gram} g`, 128, 52);
  return dokuYap(c);
}

/** Koşul sonucu simgesi: evet (vurgu, onay) / hayır (gri, çizgi) */
function sonucDokusu(evet: boolean): THREE.CanvasTexture {
  const [c, g] = tuval(128, 128);
  g.fillStyle = evet ? '#2a9d94' : '#7d8b88';
  g.beginPath();
  g.arc(64, 64, 58, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#fbf7ee';
  g.lineWidth = 13;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.beginPath();
  if (evet) {
    g.moveTo(36, 66);
    g.lineTo(56, 86);
    g.lineTo(92, 46);
  } else {
    g.moveTo(40, 64);
    g.lineTo(88, 64);
  }
  g.stroke();
  return dokuYap(c);
}

// ---------------------------------------------------------------------------
// Geometri yardımcıları
// ---------------------------------------------------------------------------

/** Yaprak: bezier dış hatlı, ortası kıvrık ince yüzey. Tabanı orijinde, +y yönünde uzanır. */
function yaprakGeometrisi(boy = 0.15, en = 0.065, kivrim = 0.35): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(en, boy * 0.22, en * 0.95, boy * 0.72, 0, boy);
  s.bezierCurveTo(-en * 0.95, boy * 0.72, -en, boy * 0.22, 0, 0);
  const geo = new THREE.ShapeGeometry(s, 10);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const u = y / boy;
    // Uca doğru aşağı kıvrılma + orta damar boyunca hafif V
    p.setZ(i, -kivrim * boy * u * u + Math.abs(x) * 0.5);
  }
  geo.computeVertexNormals();
  return geo;
}

/** Geometriyi verilen konum/dönüşle kopyalar (birleştirmeden önce). */
function yerlestir(g: THREE.BufferGeometry, konum: THREE.Vector3, donus: THREE.Euler, olcek = 1): THREE.BufferGeometry {
  const m = new THREE.Matrix4().compose(konum, new THREE.Quaternion().setFromEuler(donus), new THREE.Vector3(olcek, olcek, olcek));
  const k = g.clone();
  k.applyMatrix4(m);
  return k;
}

/** Saksı profili (LatheGeometry): dış yüz, ağız kenarı ve içe dönen dudak. */
function saksiGeometrisi(olcek = 1): THREE.LatheGeometry {
  const n = [
    [0.0, 0.03],
    [0.165, 0.03],
    [0.175, 0.05],
    [0.203, 0.17],
    [0.226, 0.262],
    [0.246, 0.268],
    [0.252, 0.3],
    [0.246, 0.316],
    [0.222, 0.318],
    [0.214, 0.3],
    [0.2, 0.2],
  ].map(([x, y]) => new THREE.Vector2(x * olcek, y * olcek));
  return new THREE.LatheGeometry(n, 40);
}

// ---------------------------------------------------------------------------
// Sahne
// ---------------------------------------------------------------------------

interface BitkiGorseli {
  tur: 'saksi' | 'domates';
  kok: THREE.Group;
  toprakMat: THREE.MeshStandardMaterial;
  islakMat: THREE.MeshStandardMaterial;
  yaprakGrubu: THREE.Group;
  yaprakMat: THREE.MeshStandardMaterial;
  domates: THREE.Mesh | null;
  domatesMat: THREE.MeshPhysicalMaterial | null;
  /** Domatesin dünya koordinatı (koparılırken) */
  domatesYeri: THREE.Vector3;
  birikinti: THREE.Mesh;
  granul: THREE.Group;
  vurgu: THREE.Mesh;
  flas: THREE.Mesh;
  /** Sulama / gübre hedefi (toprak yüzeyi, dünya) */
  toprakYeri: THREE.Vector3;
}

interface RobotGorseli {
  kok: THREE.Group;
  govde: THREE.Group;
  bas: THREE.Group;
  gozMat: THREE.MeshBasicMaterial;
  gozler: THREE.Mesh[];
  tekerlekler: THREE.Mesh[];
  kol: THREE.Group;
  ustKol: THREE.Group;
  dirsek: THREE.Group;
  altBoru: THREE.Mesh;
  kolUcu: THREE.Group;
  dusBasi: THREE.Group;
  kiskac: THREE.Group;
  tank: THREE.Group;
  su: THREE.Mesh;
  tankFlasMat: THREE.MeshBasicMaterial;
  sepet: THREE.Group;
  sepetDomatesleri: THREE.Mesh[];
  gubreKabi: THREE.Group;
  tarama: THREE.Mesh;
  taramaMat: THREE.MeshBasicMaterial;
  /** Bahçede robotun önündeki yön oku (1. sınıf: dönüşü robotun bakışından düşünmek için) */
  yonOku: THREE.Mesh;
  /** İnşaat alanında robotun yerine uçan dron (kökün çocuğu: konum ve dönüş robotla aynı) */
  dron: THREE.Group;
  pervaneler: THREE.Object3D[];
  /** Dronun altında taşıdığı küp */
  tasinanKup: THREE.Mesh;
  /** Çizgi robotunun kalem ucu (sahada) */
  kalemUcu: THREE.Group;
}

interface Ara {
  bas: number;
  sure: number;
  f: (t: number) => void;
  coz: () => void;
}

const GIZLI_SU_SAYISI = 40;
/** Kol uzunlukları (robot yerel birimi): üst kol sabit, alt kol teleskopik */
const KOL_UST = 0.34;
const KOL_ALT_EN_AZ = 0.3;
const KOL_ALT_EN_COK = 0.52;
/** Dinlenme: üst kol gövdenin yanında aşağı sarkar, alt kol yukarı katlanır */
const KOL_DINLENME = { t1: -1.38, dirsek: 2.62, alt: KOL_ALT_EN_AZ };

export class SeraSahnesi {
  private readonly kap: HTMLElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly sahne = new THREE.Scene();
  private readonly kamera: THREE.PerspectiveCamera;
  private readonly gunes: THREE.DirectionalLight;
  private readonly koyu: boolean;
  private readonly azHareket: boolean;
  private readonly ortam: THREE.WebGLRenderTarget;
  private readonly boyutGozlemci: ResizeObserver;

  // Paylaşılan dokular ve malzemeler
  private readonly dokular: THREE.Texture[] = [];
  private readonly ahsap: THREE.CanvasTexture;
  private readonly kuruDoku: THREE.CanvasTexture;
  private readonly nemliDoku: THREE.CanvasTexture;
  private readonly evetDoku: THREE.CanvasTexture;
  private readonly hayirDoku: THREE.CanvasTexture;
  private readonly golgeDoku: THREE.CanvasTexture;

  /** Sıraya bağlı (kur() her seferinde yeniden kuran) nesneler */
  private sira = new THREE.Group();
  private siraDokulari: THREE.Texture[] = [];
  private bitkiler: BitkiGorseli[] = [];
  private yolBirikintileri = new Map<number, THREE.Mesh>();
  private hataIsareti: THREE.Mesh;
  private robot: RobotGorseli;
  private sonucIsareti: THREE.Sprite;
  private sular: THREE.InstancedMesh;
  private suAkisi: THREE.Mesh;
  private granuller: THREE.InstancedMesh;
  private ucanDomates: THREE.Mesh;

  private bitkiSayisi = 0;
  /** Seranın sabit parçaları (taş zemin, camın ardındaki çit); bahçede gizlenir */
  private seraSabitleri = new THREE.Group();
  private izg: Izgara | null = null;
  private bahceMi = false;
  private adimIzi = false;
  private izIsaretleri = new Map<number, THREE.Mesh>();
  private tur: DunyaTuru = 'sera';
  /** Koordinat düzlemi: daha dik bakış (eksen sayıları ve noktalar okunsun) */
  private koordinatMi = false;
  private katman: DunyaKatmani | null = null;
  private sonDurum: DunyaDurumu | null = null;
  /** Dronun uçuş yüksekliği (kökün yerel y'si) */
  private ucus = 2;
  private izDokulari = new Map<number, THREE.CanvasTexture>();
  private depoEnCok = 20;
  private donanim: Donanim = { tank: true, sepet: false, gubre: false };
  private ustten = false;
  private kameraHedef = new THREE.Vector3();
  private kameraKonum = new THREE.Vector3();
  /** Kameranın varmak istediği konum (boşta mı kararı için) */
  private kameraHedefKonum = new THREE.Vector3();
  private kameraIlk = true;
  private araliklar: Ara[] = [];
  private kusak = 0;
  private dongu: number | null = null;
  private gorunurDurum = true;
  private kapatildi = false;
  private sonZaman = 0;
  private sanalZaman: number | null = null;
  private goz = { kirp: 0, sonraki: 2.5 };
  private ifade: RobotIfadesi = 'normal';

  constructor(kap: HTMLElement, secenekler: SeraSahnesiSecenekleri = {}) {
    this.kap = kap;
    this.koyu = !!secenekler.koyu;
    this.azHareket = !!secenekler.azHareket;

    const r = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', stencil: false });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.AgXToneMapping;
    r.toneMappingExposure = this.koyu ? 1.0 : 1.08;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.domElement.style.display = 'block';
    r.domElement.style.width = '100%';
    r.domElement.style.height = '100%';
    r.domElement.setAttribute('aria-hidden', 'true');
    kap.appendChild(r.domElement);
    this.renderer = r;

    const pmrem = new THREE.PMREMGenerator(r);
    this.ortam = pmrem.fromScene(new RoomEnvironment(), 0.04);
    pmrem.dispose();
    this.sahne.environment = this.ortam.texture;
    this.sahne.environmentIntensity = this.koyu ? 0.28 : 0.42;

    const gok = gokDokusu(this.koyu);
    this.dokular.push(gok);
    this.sahne.background = gok;
    this.sahne.fog = new THREE.Fog(this.koyu ? '#16303a' : '#e9f0e6', 13, 38);

    this.kamera = new THREE.PerspectiveCamera(30, 1, 0.1, 80);

    // Işıklar: gök + güneş (gölgeli) + serin dolgu
    this.sahne.add(new THREE.HemisphereLight(this.koyu ? 0x9fc4cc : 0xfff4e0, this.koyu ? 0x1c2a2e : 0xb8a58a, this.koyu ? 0.75 : 1.05));
    const gunes = new THREE.DirectionalLight(this.koyu ? 0xcfe3ff : 0xfff0d8, this.koyu ? 1.35 : 2.5);
    gunes.position.set(-4.5, 8.5, 6.5);
    gunes.castShadow = true;
    gunes.shadow.mapSize.set(2048, 2048);
    gunes.shadow.camera.near = 1;
    gunes.shadow.camera.far = 30;
    gunes.shadow.radius = 5;
    gunes.shadow.bias = -0.0004;
    gunes.shadow.normalBias = 0.02;
    this.sahne.add(gunes);
    this.sahne.add(gunes.target);
    this.gunes = gunes;
    const dolgu = new THREE.DirectionalLight(this.koyu ? 0x6f95a0 : 0xdfeff2, this.koyu ? 0.35 : 0.55);
    dolgu.position.set(5, 3, -3);
    this.sahne.add(dolgu);

    this.ahsap = ahsapDokusu();
    this.kuruDoku = toprakDokusu(true);
    this.nemliDoku = toprakDokusu(false);
    this.evetDoku = sonucDokusu(true);
    this.hayirDoku = sonucDokusu(false);
    this.golgeDoku = golgeDokusu();
    this.dokular.push(this.ahsap, this.kuruDoku, this.nemliDoku, this.evetDoku, this.hayirDoku, this.golgeDoku);

    this.sabitleriKur();
    this.sahne.add(this.sira);
    this.robot = this.robotKur();
    this.sahne.add(this.robot.kok);

    // Koşul sonucu işareti (sprite)
    this.sonucIsareti = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.evetDoku, transparent: true, depthTest: false }));
    this.sonucIsareti.scale.set(0.26, 0.26, 1);
    this.sonucIsareti.visible = false;
    this.sonucIsareti.renderOrder = 10;
    this.sahne.add(this.sonucIsareti);

    // Su damlaları ve gübre taneleri (örnekli)
    this.sular = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.027, 10, 8),
      new THREE.MeshStandardMaterial({ color: RENK.su, roughness: 0.1, metalness: 0, transparent: true, opacity: 0.9 }),
      GIZLI_SU_SAYISI
    );
    this.sular.visible = false;
    this.sular.frustumCulled = false;
    this.sahne.add(this.sular);
    // Süzgeçten toprağa inen ince su akışı (birim yükseklik, tepesi orijinde)
    const akisGeo = new THREE.CylinderGeometry(0.03, 0.05, 1, 16, 1, true);
    akisGeo.translate(0, -0.5, 0);
    this.suAkisi = new THREE.Mesh(akisGeo, new THREE.MeshStandardMaterial({ color: '#8fd0ee', roughness: 0.05, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
    this.suAkisi.visible = false;
    this.sahne.add(this.suAkisi);
    this.granuller = new THREE.InstancedMesh(new THREE.BoxGeometry(0.018, 0.018, 0.018), new THREE.MeshStandardMaterial({ color: '#7a5431', roughness: 0.9 }), GIZLI_SU_SAYISI);
    this.granuller.visible = false;
    this.granuller.frustumCulled = false;
    this.sahne.add(this.granuller);

    // Koparılırken uçan domates (tek, yeniden kullanılır)
    this.ucanDomates = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 24, 18),
      new THREE.MeshPhysicalMaterial({ color: RENK.kirmizi, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.25 })
    );
    this.ucanDomates.scale.set(1, 0.86, 1);
    this.ucanDomates.castShadow = true;
    this.ucanDomates.visible = false;
    this.sahne.add(this.ucanDomates);

    // Hata işareti: zeminde mercan halka
    this.hataIsareti = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.38, 48), new THREE.MeshBasicMaterial({ color: RENK.hata, transparent: true, opacity: 0.85, depthWrite: false }));
    this.hataIsareti.rotation.x = -Math.PI / 2;
    this.hataIsareti.visible = false;
    this.sahne.add(this.hataIsareti);

    this.boyutGozlemci = new ResizeObserver(() => this.boyutla());
    this.boyutGozlemci.observe(kap);
    this.boyutla();
    this.baslat();
  }

  // -------------------------------------------------------------------------
  // Sabit sahne parçaları (sıra uzunluğundan bağımsız)
  // -------------------------------------------------------------------------
  private sabitleriKur() {
    const zd = zeminDokusu(this.koyu);
    zd.repeat.set(14, 7);
    this.dokular.push(zd);
    const zemin = new THREE.Mesh(new THREE.PlaneGeometry(56, 28), new THREE.MeshStandardMaterial({ map: zd, roughness: 0.92, metalness: 0 }));
    zemin.rotation.x = -Math.PI / 2;
    zemin.position.set(0, 0, 2);
    zemin.receiveShadow = true;
    this.seraSabitleri.add(zemin);
    this.sahne.add(this.seraSabitleri);

    // Seranın dışı (camın ardında): çim, yumuşak tepeler ve stilize ağaçlar
    const r = uretec(21);
    const cim = new THREE.Mesh(new THREE.PlaneGeometry(60, 16), new THREE.MeshStandardMaterial({ color: this.koyu ? '#1f3a33' : '#b9cf9a', roughness: 1 }));
    cim.rotation.x = -Math.PI / 2;
    cim.position.set(0, 0.003, -9.6);
    this.sahne.add(cim);
    const tepeRenk = this.koyu ? ['#1d3833', '#22403a', '#274640'] : ['#a7c58c', '#95b97e', '#b8d1a0'];
    const tepeGeo = new THREE.SphereGeometry(1, 40, 20);
    [
      [-9, -14, 9, 2.6],
      [2, -16, 12, 3.2],
      [12, -13.5, 8, 2.3],
    ].forEach(([x, z, en, boy], i) => {
      const m = new THREE.Mesh(tepeGeo, new THREE.MeshStandardMaterial({ color: tepeRenk[i], roughness: 1 }));
      m.scale.set(en, boy, 3);
      m.position.set(x, -0.6, z);
      this.sahne.add(m);
    });
    // Seranın hemen ardında budanmış çit
    const citMat = new THREE.MeshStandardMaterial({ color: this.koyu ? '#223f38' : '#7ea866', roughness: 0.95 });
    const citGeo = new RoundedBoxGeometry(2.2, 0.62, 0.7, 3, 0.26);
    for (let i = 0; i < 13; i++) {
      const c = new THREE.Mesh(citGeo, citMat);
      c.position.set(-13.2 + i * 2.2, 0.31, -2.55 - (i % 2) * 0.08);
      c.scale.y = 0.9 + r() * 0.25;
      this.seraSabitleri.add(c);
    }
  }

  // -------------------------------------------------------------------------
  // Robot
  // -------------------------------------------------------------------------
  private robotKur(): RobotGorseli {
    const kok = new THREE.Group();
    const govde = new THREE.Group();
    kok.add(govde);
    const temas = new THREE.Mesh(new THREE.PlaneGeometry(0.82, 0.7), new THREE.MeshBasicMaterial({ map: this.golgeDoku, color: '#000000', transparent: true, opacity: 0.55, depthWrite: false }));
    temas.rotation.x = -Math.PI / 2;
    temas.position.y = 0.053;
    kok.add(temas);
    // Yön oku: robotun önünde, yere yatık çentikli ok ucu; robotla birlikte döner. Koyu kenar + açık
    // dolgu: teal BAŞLA karosunda, taşta ve sarı hedef karosunda aynı açıklıkla okunur.
    const okGeo = (o: number) => {
      const sekil = new THREE.Shape();
      const n = (x: number, z: number): [number, number] => [0.455 + (x - 0.455) * o, z * o];
      sekil.moveTo(...n(0.56, 0));
      sekil.lineTo(...n(0.36, 0.165));
      sekil.lineTo(...n(0.41, 0));
      sekil.lineTo(...n(0.36, -0.165));
      sekil.closePath();
      const g = new THREE.ShapeGeometry(sekil);
      g.rotateX(-Math.PI / 2);
      return g;
    };
    const yonOku = new THREE.Mesh(okGeo(1), new THREE.MeshBasicMaterial({ color: '#17414a', transparent: true, opacity: 0.92, depthWrite: false }));
    yonOku.position.y = 0.056;
    yonOku.renderOrder = 1;
    // İkisi de saydam listede olmalı: opak iç parça saydam kenardan önce çizilir ve altında kalır
    const okIci = new THREE.Mesh(okGeo(0.66), new THREE.MeshBasicMaterial({ color: '#fbf7ee', transparent: true, opacity: 1, depthWrite: false }));
    okIci.position.y = 0.002;
    okIci.renderOrder = 2;
    yonOku.add(okIci);
    yonOku.visible = false;
    kok.add(yonOku);
    const fildisi = new THREE.MeshStandardMaterial({ color: RENK.fildisi, roughness: 0.42, metalness: 0.02 });
    const koyuMat = new THREE.MeshStandardMaterial({ color: '#243a3f', roughness: 0.6, metalness: 0.1 });
    const vurguMat = new THREE.MeshStandardMaterial({ color: RENK.vurgu, roughness: 0.38, metalness: 0.05 });
    const lastik = new THREE.MeshStandardMaterial({ color: '#1b2528', roughness: 0.92 });
    const golgeli = (m: THREE.Mesh) => {
      m.castShadow = true;
      m.receiveShadow = true;
      return m;
    };

    // Taban ve tekerlekler
    const taban = golgeli(new THREE.Mesh(new RoundedBoxGeometry(0.54, 0.12, 0.42, 3, 0.045), koyuMat));
    taban.position.y = 0.14;
    govde.add(taban);
    const tekerlekler: THREE.Mesh[] = [];
    const tekerGeo = new THREE.CylinderGeometry(0.092, 0.092, 0.07, 28);
    const gobekGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.075, 20);
    for (const sx of [-0.18, 0.18]) {
      for (const sz of [-0.23, 0.23]) {
        const t = golgeli(new THREE.Mesh(tekerGeo, lastik));
        t.rotation.x = Math.PI / 2;
        t.position.set(sx, 0.092, sz);
        const gobek = new THREE.Mesh(gobekGeo, vurguMat);
        t.add(gobek);
        // Tekerlek dönüşü görünsün diye gövde üstünde küçük bir çentik
        const centik = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.078, 0.012), fildisi);
        centik.position.set(0.0, 0, 0.06);
        centik.rotation.x = Math.PI / 2;
        gobek.add(centik);
        kok.add(t);
        tekerlekler.push(t);
      }
    }

    // Gövde
    const beden = golgeli(new THREE.Mesh(new RoundedBoxGeometry(0.46, 0.32, 0.38, 4, 0.08), fildisi));
    beden.position.y = 0.36;
    govde.add(beden);
    const onPanel = golgeli(new THREE.Mesh(new RoundedBoxGeometry(0.03, 0.17, 0.25, 2, 0.012), vurguMat));
    onPanel.position.set(0.228, 0.36, 0);
    govde.add(onPanel);
    const isik = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 10), new THREE.MeshBasicMaterial({ color: '#bff5ea' }));
    isik.position.set(0.245, 0.4, 0.075);
    govde.add(isik);

    // Baş (bakma için ayrı eksen)
    const bas = new THREE.Group();
    bas.position.y = 0.66;
    govde.add(bas);
    const kafa = golgeli(new THREE.Mesh(new RoundedBoxGeometry(0.38, 0.29, 0.34, 4, 0.09), fildisi));
    bas.add(kafa);
    // Yüz ekranı ön yüzü sarar (yandan bakan kamera da gözleri görsün)
    const ekran = new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.2, 0.29, 3, 0.045), new THREE.MeshStandardMaterial({ color: '#10252a', roughness: 0.16, metalness: 0.25 }));
    ekran.position.set(0.172, 0.005, 0);
    bas.add(ekran);
    const gozMat = new THREE.MeshBasicMaterial({ color: '#8ff0e4' });
    const gozGeo = new RoundedBoxGeometry(0.014, 0.09, 0.056, 2, 0.008);
    const gozler = [-0.07, 0.07].map((z) => {
      const g = new THREE.Mesh(gozGeo, gozMat);
      g.position.set(0.198, 0.012, z);
      bas.add(g);
      return g;
    });
    const anten = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 8), koyuMat);
    anten.position.set(-0.04, 0.2, 0);
    bas.add(anten);
    const antenUcu = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), new THREE.MeshStandardMaterial({ color: RENK.mercan, roughness: 0.35 }));
    antenUcu.position.set(-0.04, 0.265, 0);
    bas.add(antenUcu);
    // Kulaklıklar
    for (const z of [-0.175, 0.175]) {
      const k = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.03, 20), vurguMat);
      k.rotation.x = Math.PI / 2;
      k.position.set(0, 0, z);
      bas.add(k);
    }

    // Tarama konisi: baştan sola (bitkilere) doğru
    const taramaMat = new THREE.MeshBasicMaterial({ color: '#2a9d94', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    // Tepe orijinde, taban yüzün önünde (+x); eğim bak() içinde rotation.z ile verilir
    const koni = new THREE.ConeGeometry(0.2, 0.95, 32, 1, true);
    koni.translate(0, -0.475, 0);
    koni.rotateZ(Math.PI / 2);
    const tarama = new THREE.Mesh(koni, taramaMat);
    tarama.position.set(0.2, 0, 0);
    tarama.visible = false;
    bas.add(tarama);

    // Kol (sol yan, bitkilere uzanır): omuz → üst kol → dirsek → teleskopik alt kol → uç.
    // Borular yerel -z yönünde uzanır; kolAyarla() iki eklemli ters kinematikle açıları hesaplar.
    const kol = new THREE.Group();
    kol.position.set(0.03, 0.47, -0.205);
    govde.add(kol);
    kol.add(golgeli(new THREE.Mesh(new THREE.SphereGeometry(0.062, 20, 16), vurguMat)));
    const boruGeo = (r: number) => {
      const g = new THREE.CylinderGeometry(r, r, 1, 16);
      g.translate(0, -0.5, 0);
      g.rotateX(Math.PI / 2); // 0 … -1 (z)
      return g;
    };
    const ustKol = new THREE.Group();
    kol.add(ustKol);
    const kolMat = new THREE.MeshStandardMaterial({ color: '#2f6b70', roughness: 0.4, metalness: 0.15 });
    const ustBoru = golgeli(new THREE.Mesh(boruGeo(0.04), kolMat));
    ustBoru.scale.z = KOL_UST;
    ustKol.add(ustBoru);
    const dirsek = new THREE.Group();
    dirsek.position.z = -KOL_UST;
    ustKol.add(dirsek);
    dirsek.add(golgeli(new THREE.Mesh(new THREE.SphereGeometry(0.052, 18, 14), vurguMat)));
    const altBoru = golgeli(new THREE.Mesh(boruGeo(0.033), fildisi));
    altBoru.scale.z = KOL_ALT_EN_AZ;
    dirsek.add(altBoru);
    const kolUcu = new THREE.Group();
    kolUcu.position.z = -KOL_ALT_EN_AZ;
    dirsek.add(kolUcu);
    // Sulama başlığı (aşağı bakan süzgeç)
    const dusBasi = new THREE.Group();
    kolUcu.add(dusBasi);
    const dus = golgeli(new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.072, 0.085, 24), vurguMat));
    dus.position.y = -0.042;
    dusBasi.add(dus);
    const dusYuz = new THREE.Mesh(new THREE.CircleGeometry(0.066, 24), new THREE.MeshStandardMaterial({ color: '#dff3f0', roughness: 0.4 }));
    dusYuz.rotation.x = Math.PI / 2;
    dusYuz.position.y = -0.086;
    dusBasi.add(dusYuz);
    // Kıskaç (hasat): iki parmak
    const kiskac = new THREE.Group();
    kolUcu.add(kiskac);
    const parmakGeo = new RoundedBoxGeometry(0.024, 0.1, 0.04, 2, 0.01);
    for (const dx of [-0.045, 0.045]) {
      const p = golgeli(new THREE.Mesh(parmakGeo, koyuMat));
      p.position.set(dx, -0.055, -0.01);
      p.rotation.z = dx > 0 ? -0.18 : 0.18;
      kiskac.add(p);
    }
    kiskac.add(golgeli(new THREE.Mesh(new RoundedBoxGeometry(0.13, 0.04, 0.06, 2, 0.015), vurguMat)));
    kiskac.visible = false;

    // Su deposu (arka): saydam silindir + su
    const tank = new THREE.Group();
    tank.position.set(-0.2, 0.47, 0);
    govde.add(tank);
    const cam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.085, 0.085, 0.28, 28, 1, true),
      new THREE.MeshPhysicalMaterial({ color: '#e8f6f8', roughness: 0.05, metalness: 0, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false })
    );
    cam.position.y = 0.06;
    tank.add(cam);
    const suGeo = new THREE.CylinderGeometry(0.078, 0.078, 1, 24);
    suGeo.translate(0, 0.5, 0);
    const su = new THREE.Mesh(suGeo, new THREE.MeshStandardMaterial({ color: RENK.su, roughness: 0.12, transparent: true, opacity: 0.88 }));
    su.position.y = -0.08;
    su.scale.y = 0.27;
    tank.add(su);
    const kapak = golgeli(new THREE.Mesh(new THREE.CylinderGeometry(0.092, 0.092, 0.03, 28), vurguMat));
    kapak.position.y = 0.215;
    tank.add(kapak);
    const tabanHalka = new THREE.Mesh(new THREE.CylinderGeometry(0.092, 0.092, 0.03, 28), koyuMat);
    tabanHalka.position.y = -0.09;
    tank.add(tabanHalka);
    const tankFlasMat = new THREE.MeshBasicMaterial({ color: RENK.hata, transparent: true, opacity: 0, depthWrite: false });
    const tankFlas = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.3, 24, 1, true), tankFlasMat);
    tankFlas.position.y = 0.06;
    tank.add(tankFlas);

    // Hasat sepeti (arka): örgü desenli açık silindir + domatesler
    const sepet = new THREE.Group();
    sepet.position.set(-0.19, 0.53, 0);
    govde.add(sepet);
    const [c, g] = tuval(128, 64);
    g.fillStyle = '#b98a50';
    g.fillRect(0, 0, 128, 64);
    for (let y = 0; y < 64; y += 8) {
      for (let x = 0; x < 128; x += 16) {
        g.fillStyle = (x / 16 + y / 8) % 2 ? '#a57841' : '#c99a5c';
        g.fillRect(x, y, 16, 8);
      }
    }
    const orgu = dokuYap(c, true);
    orgu.repeat.set(3, 1);
    this.dokular.push(orgu);
    const sepetMat = new THREE.MeshStandardMaterial({ map: orgu, roughness: 0.85, side: THREE.DoubleSide });
    const sepetGovde = golgeli(new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.13, 0.13, 28, 1, true), sepetMat));
    sepet.add(sepetGovde);
    const sepetTaban = new THREE.Mesh(new THREE.CircleGeometry(0.13, 28), sepetMat);
    sepetTaban.rotation.x = -Math.PI / 2;
    sepetTaban.position.y = -0.065;
    sepet.add(sepetTaban);
    const kenar = golgeli(new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.014, 8, 32), new THREE.MeshStandardMaterial({ color: '#8f6433', roughness: 0.8 })));
    kenar.rotation.x = Math.PI / 2;
    kenar.position.y = 0.065;
    sepet.add(kenar);
    const kucukDomates = new THREE.SphereGeometry(0.058, 16, 12);
    const sepetDomatesleri: THREE.Mesh[] = [];
    // Önce üst katman (görünür), sonra alt katman: ilk domatesler kenardan hemen görünsün
    const yerler: [number, number, number][] = [
      [0.02, 0.03, 0.05],
      [-0.05, 0.03, -0.03],
      [0.07, 0.03, -0.05],
      [-0.06, 0.03, 0.07],
      [0, 0.07, 0],
      [0.08, -0.02, 0.06],
      [-0.08, -0.02, -0.07],
      [0, -0.02, -0.09],
      [0.02, -0.02, 0.1],
      [-0.1, -0.02, 0.02],
      [0.1, -0.02, -0.01],
      [0.04, 0.09, 0.05],
    ];
    for (const p of yerler) {
      const m = new THREE.Mesh(kucukDomates, new THREE.MeshPhysicalMaterial({ color: RENK.kirmizi, roughness: 0.32, clearcoat: 0.5 }));
      m.position.set(...p);
      m.scale.y = 0.86;
      m.visible = false;
      m.castShadow = true;
      sepet.add(m);
      sepetDomatesleri.push(m);
    }

    // Gübre kabı (sağ yan)
    const gubreKabi = new THREE.Group();
    gubreKabi.position.set(-0.02, 0.43, 0.2);
    govde.add(gubreKabi);
    const kese = golgeli(new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.16, 0.07, 3, 0.03), new THREE.MeshStandardMaterial({ color: '#9b7a4d', roughness: 0.9 })));
    gubreKabi.add(kese);
    const etiket = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.07), new THREE.MeshStandardMaterial({ color: '#e9d8b4', roughness: 0.8 }));
    etiket.position.z = 0.036;
    gubreKabi.add(etiket);
    const yaprakIz = new THREE.Mesh(yaprakGeometrisi(0.05, 0.02, 0), new THREE.MeshStandardMaterial({ color: RENK.yaprak, side: THREE.DoubleSide }));
    yaprakIz.position.set(0, -0.022, 0.038);
    gubreKabi.add(yaprakIz);

    // Çizgi robotunun kalem ucu: gövdenin önünde, yere değen boya memesi (kalem kalkınca yükselir)
    const kalemUcu = new THREE.Group();
    kalemUcu.position.set(0.2, 0, 0);
    const meme = golgeli(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.022, 0.16, 16), koyuMat));
    meme.position.y = 0.1;
    kalemUcu.add(meme);
    const uc = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), new THREE.MeshStandardMaterial({ color: RENK.vurgu, roughness: 0.4 }));
    uc.position.y = 0.022;
    kalemUcu.add(uc);
    kalemUcu.visible = false;
    kok.add(kalemUcu);

    // İnşaat dronu: gövde, dört kol ve pervane, iniş ayakları, altta taşıdığı küp
    const dron = new THREE.Group();
    dron.visible = false;
    kok.add(dron);
    const dGovde = golgeli(new THREE.Mesh(new RoundedBoxGeometry(0.44, 0.15, 0.4, 3, 0.06), fildisi));
    dron.add(dGovde);
    const kubbe = golgeli(new THREE.Mesh(new THREE.SphereGeometry(0.13, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), vurguMat));
    kubbe.position.y = 0.07;
    kubbe.scale.set(1.15, 0.7, 1);
    dron.add(kubbe);
    const mercek = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), new THREE.MeshStandardMaterial({ color: '#10252a', roughness: 0.15, metalness: 0.3 }));
    mercek.position.set(0.225, -0.01, 0);
    dron.add(mercek);
    const merceHalka = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 8, 24), vurguMat);
    merceHalka.position.set(0.222, -0.01, 0);
    merceHalka.rotation.y = Math.PI / 2;
    dron.add(merceHalka);
    const kolGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.32, 10);
    const motorGeo = new THREE.CylinderGeometry(0.045, 0.05, 0.06, 16);
    const pervaneGeo = new THREE.BoxGeometry(0.34, 0.006, 0.035);
    const pervaneMat = new THREE.MeshStandardMaterial({ color: '#2b3b3f', roughness: 0.5 });
    const halkaMat = new THREE.MeshStandardMaterial({ color: RENK.fildisi, roughness: 0.45, transparent: true, opacity: 0.85 });
    const pervaneler: THREE.Object3D[] = [];
    for (const [sx, sz] of [
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ] as const) {
      const k = golgeli(new THREE.Mesh(kolGeo, koyuMat));
      k.rotation.z = Math.PI / 2;
      k.rotation.y = Math.atan2(-sz, sx);
      k.position.set(sx * 0.16, 0.02, sz * 0.15);
      dron.add(k);
      const motor = golgeli(new THREE.Mesh(motorGeo, koyuMat));
      motor.position.set(sx * 0.29, 0.04, sz * 0.27);
      dron.add(motor);
      const p = new THREE.Group();
      p.position.set(sx * 0.29, 0.08, sz * 0.27);
      const b1 = new THREE.Mesh(pervaneGeo, pervaneMat);
      const b2 = new THREE.Mesh(pervaneGeo, pervaneMat);
      b2.rotation.y = Math.PI / 2;
      p.add(b1, b2);
      dron.add(p);
      pervaneler.push(p);
      const koruma = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.012, 8, 32), halkaMat);
      koruma.rotation.x = Math.PI / 2;
      koruma.position.set(sx * 0.29, 0.075, sz * 0.27);
      dron.add(koruma);
    }
    for (const z of [-0.13, 0.13]) {
      const kizak = golgeli(new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.02, 0.022), koyuMat));
      kizak.position.set(0, -0.15, z);
      dron.add(kizak);
      for (const x of [-0.1, 0.1]) {
        const ayak = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.08, 0.018), koyuMat);
        ayak.position.set(x, -0.11, z);
        dron.add(ayak);
      }
    }
    const halat = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.2, 6), koyuMat);
    halat.position.y = -0.18;
    dron.add(halat);
    const tasinanKup = golgeli(new THREE.Mesh(new RoundedBoxGeometry(KUP * 0.92, KUP * 0.92, KUP * 0.92, 3, 0.06), new THREE.MeshStandardMaterial({ color: '#e9b949', roughness: 0.62 })));
    tasinanKup.position.y = -0.28 - (KUP * 0.92) / 2;
    tasinanKup.scale.setScalar(1 / 1.08);
    dron.add(tasinanKup);

    kok.scale.setScalar(1.08);
    return { kok, govde, bas, gozMat, gozler, tekerlekler, kol, ustKol, dirsek, altBoru, kolUcu, dusBasi, kiskac, tank, su, tankFlasMat, sepet, sepetDomatesleri, gubreKabi, tarama, taramaMat, yonOku, dron, pervaneler, tasinanKup, kalemUcu };
  }

  // -------------------------------------------------------------------------
  // Sıra (dünya) kurulumu
  // -------------------------------------------------------------------------
  kur(dunya: DunyaTanimi, donanim: Donanim): void {
    this.kes();
    this.sira.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.geometry.dispose();
        const mat = m.material as THREE.Material | THREE.Material[];
        (Array.isArray(mat) ? mat : [mat]).forEach((x) => x.dispose());
      }
    });
    this.sahne.remove(this.sira);
    this.siraDokulari.forEach((t) => t.dispose());
    this.siraDokulari = [];
    this.sira = new THREE.Group();
    this.sahne.add(this.sira);
    this.bitkiler = [];
    this.yolBirikintileri.clear();
    this.izIsaretleri.clear();
    this.izg = izgara(dunya);
    this.bahceMi = this.izg.bahce;
    this.adimIzi = !!dunya.adimIzi;
    this.seraSabitleri.visible = !this.bahceMi;
    this.robot.yonOku.visible = this.bahceMi;
    this.tur = this.izg.tur;
    this.koordinatMi = !!dunya.koordinat;
    this.katman = null;
    this.sonDurum = null;
    const insaat = this.tur === 'insaat';
    this.robot.govde.visible = !insaat;
    this.robot.tekerlekler.forEach((t) => (t.visible = !insaat));
    this.robot.dron.visible = insaat;
    this.robot.kalemUcu.visible = this.tur === 'cizim';
    if (insaat) {
      // Dron en yüksek hedef kulenin üstünden, taşıdığı küp kuleye değmeden uçar
      this.ucus = (KARO_UST + (DunyaKatmani.enYuksek(this.izg) + 2) * KUP + 0.2) / 1.08;
      this.robot.dron.position.y = this.ucus;
    }

    const n = dunya.bitkiler.length;
    this.bitkiSayisi = n;
    this.depoEnCok = dunya.depo ?? 20;
    this.donanim = donanim;
    this.robot.tank.visible = donanim.tank;
    this.robot.sepet.visible = donanim.sepet;
    this.robot.gubreKabi.visible = donanim.gubre;
    this.robot.dusBasi.visible = !donanim.sepet;
    this.robot.kiskac.visible = donanim.sepet;
    // Depo yoksa ve sepet varsa sepet depo yerine arkada; ikisi birden varsa sepet üstte
    this.robot.sepet.position.set(donanim.tank ? -0.02 : -0.17, donanim.tank ? 0.62 : 0.6, 0);

    if (this.bahceMi) {
      this.bahceKur(dunya);
      this.kameraIlk = true;
      this.boyutla();
      return;
    }

    const x0 = hucreX(0, n);
    const xc = hucreX(n + 1, n);
    const solDuvar = x0 - HUCRE * 0.95;
    const sagDuvar = xc + HUCRE * 0.9;
    const uzunluk = sagDuvar - solDuvar;
    const ortaX = (solDuvar + sagDuvar) / 2;

    const golgeli = <T extends THREE.Mesh>(m: T, al = true, ver = true) => {
      m.castShadow = ver;
      m.receiveShadow = al;
      return m;
    };

    // Yol: tahta döşeme hücreleri
    const ahsapMat = new THREE.MeshStandardMaterial({ map: this.ahsap, color: this.koyu ? '#9c8a74' : '#ffffff', roughness: 0.78, metalness: 0 });
    const hucreGeo = new RoundedBoxGeometry(HUCRE * 0.94, 0.05, 0.86, 2, 0.015);
    for (let x = 1; x <= n; x++) {
      const h = golgeli(new THREE.Mesh(hucreGeo, ahsapMat), true, false);
      h.position.set(hucreX(x, n), 0.025, YOL_Z);
      this.sira.add(h);
      // Hücre numarası (önündeki bitkinin sırası): robot üstüne gelse de önde kalır, görünür
      const nd = numaraDokusu(x);
      this.siraDokulari.push(nd);
      const etiket = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.25), new THREE.MeshStandardMaterial({ map: nd, transparent: true, roughness: 0.7, depthWrite: false }));
      etiket.rotation.x = -Math.PI / 2;
      etiket.position.set(hucreX(x, n), 0.052, YOL_Z + 0.29);
      this.sira.add(etiket);
    }
    // Başlangıç: şarj istasyonlu deniz mavisi zemin
    const basMat = new THREE.MeshStandardMaterial({ color: this.koyu ? '#1f6a73' : RENK.deniz, roughness: 0.6 });
    const bas = golgeli(new THREE.Mesh(hucreGeo, basMat), true, false);
    bas.position.set(x0, 0.025, YOL_Z);
    this.sira.add(bas);
    const cikMat = new THREE.MeshStandardMaterial({ color: this.koyu ? '#3f7d4a' : RENK.yesilZemin, roughness: 0.6 });
    const cik = golgeli(new THREE.Mesh(hucreGeo, cikMat), true, false);
    cik.position.set(xc, 0.025, YOL_Z);
    this.sira.add(cik);
    const basYazi = zeminYazisi('BAŞLA');
    const cikYazi = zeminYazisi('ÇIKIŞ');
    this.siraDokulari.push(basYazi, cikYazi);
    for (const [t, x] of [
      [basYazi, x0],
      [cikYazi, xc],
    ] as const) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(HUCRE * 0.62, HUCRE * 0.194), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
      p.rotation.x = -Math.PI / 2;
      p.position.set(x, 0.052, YOL_Z + 0.335);
      this.sira.add(p);
    }
    // Çıkış oku
    const ok = new THREE.Shape();
    ok.moveTo(-0.12, -0.05);
    ok.lineTo(0.02, -0.05);
    ok.lineTo(0.02, -0.11);
    ok.lineTo(0.14, 0);
    ok.lineTo(0.02, 0.11);
    ok.lineTo(0.02, 0.05);
    ok.lineTo(-0.12, 0.05);
    ok.closePath();
    const okMesh = new THREE.Mesh(new THREE.ShapeGeometry(ok), new THREE.MeshBasicMaterial({ color: '#f4efe3', transparent: true, opacity: 0.9 }));
    okMesh.rotation.x = -Math.PI / 2;
    okMesh.position.set(xc, 0.053, YOL_Z - 0.06);
    this.sira.add(okMesh);

    // Şarj istasyonu (başlangıcın arkasında küçük kemer)
    const istasyon = new THREE.Group();
    istasyon.position.set(x0 - HUCRE * 0.48, 0, YOL_Z);
    const kemerMat = new THREE.MeshStandardMaterial({ color: RENK.fildisi, roughness: 0.45 });
    const ayak = new RoundedBoxGeometry(0.06, 0.62, 0.08, 2, 0.02);
    for (const z of [-0.3, 0.3]) {
      const a = golgeli(new THREE.Mesh(ayak, kemerMat));
      a.position.set(0, 0.31, z);
      istasyon.add(a);
    }
    const ust = golgeli(new THREE.Mesh(new RoundedBoxGeometry(0.08, 0.08, 0.68, 2, 0.025), new THREE.MeshStandardMaterial({ color: RENK.vurgu, roughness: 0.4 })));
    ust.position.set(0, 0.64, 0);
    istasyon.add(ust);
    const lamba = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 10), new THREE.MeshBasicMaterial({ color: '#bff5ea' }));
    lamba.position.set(0.045, 0.64, 0);
    istasyon.add(lamba);
    this.sira.add(istasyon);

    // Çıkış tabelası
    const tabela = tabelaDokusu('ÇIKIŞ', '#3f7d4a');
    this.siraDokulari.push(tabela);
    const direkMat = new THREE.MeshStandardMaterial({ color: '#6b4f33', roughness: 0.8 });
    for (const dx of [-0.26, 0.26]) {
      const direk = golgeli(new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.02, 10), direkMat));
      direk.position.set(xc + dx, 0.51, BITKI_Z - 0.05);
      this.sira.add(direk);
    }
    const pano = golgeli(new THREE.Mesh(new RoundedBoxGeometry(0.66, 0.25, 0.03, 2, 0.012), new THREE.MeshStandardMaterial({ map: tabela, roughness: 0.6 })));
    pano.position.set(xc, 0.93, BITKI_Z - 0.03);
    pano.rotation.x = -0.12;
    this.sira.add(pano);

    // Çakıl şeridi (bitkilerin altında) ve önündeki tahta kenar
    const cakil = cakilDokusu();
    cakil.repeat.set(uzunluk / 1.2, 1);
    this.siraDokulari.push(cakil);
    const serit = golgeli(new THREE.Mesh(new THREE.BoxGeometry(uzunluk, 0.03, 0.92), new THREE.MeshStandardMaterial({ map: cakil, color: this.koyu ? '#8a8376' : '#ffffff', roughness: 1 })), true, false);
    serit.position.set(ortaX, 0.015, BITKI_Z - 0.02);
    this.sira.add(serit);
    const kenarAhsap = this.ahsap.clone();
    kenarAhsap.repeat.set(uzunluk / 1.2, 0.25);
    kenarAhsap.needsUpdate = true;
    this.siraDokulari.push(kenarAhsap);
    const kenarMat = new THREE.MeshStandardMaterial({ map: kenarAhsap, color: this.koyu ? '#9c8a74' : '#ffffff', roughness: 0.8 });
    const kenar = golgeli(new THREE.Mesh(new THREE.BoxGeometry(uzunluk, 0.07, 0.05), kenarMat));
    kenar.position.set(ortaX, 0.035, BITKI_Z + 0.46);
    this.sira.add(kenar);

    // Sera: arka alçak duvar + cam + çerçeve
    const duvarAhsap = this.ahsap.clone();
    duvarAhsap.repeat.set(uzunluk / 1.4, 1);
    duvarAhsap.needsUpdate = true;
    this.siraDokulari.push(duvarAhsap);
    const alcakDuvarMat = new THREE.MeshStandardMaterial({ map: duvarAhsap, color: this.koyu ? '#8f7e69' : '#e6d3b8', roughness: 0.82 });
    const cerceveMat = new THREE.MeshStandardMaterial({ color: this.koyu ? '#c9d2cf' : '#f6f3ec', roughness: 0.38, metalness: 0.25 });
    const camMat = new THREE.MeshStandardMaterial({
      color: this.koyu ? '#7fa9b0' : '#dff1f1',
      roughness: 0.04,
      metalness: 0.0,
      transparent: true,
      opacity: this.koyu ? 0.12 : 0.16,
      depthWrite: false,
      envMapIntensity: 1.4,
    });
    const DUVAR_YUK = 0.46;
    const CAM_UST = 2.75;
    const arkaDuvar = golgeli(new THREE.Mesh(new THREE.BoxGeometry(uzunluk + 0.12, DUVAR_YUK, 0.12), alcakDuvarMat));
    arkaDuvar.position.set(ortaX, DUVAR_YUK / 2, ARKA_DUVAR_Z);
    this.sira.add(arkaDuvar);
    const arkaCam = new THREE.Mesh(new THREE.PlaneGeometry(uzunluk, CAM_UST - DUVAR_YUK), camMat);
    arkaCam.position.set(ortaX, (CAM_UST + DUVAR_YUK) / 2, ARKA_DUVAR_Z);
    this.sira.add(arkaCam);
    const dikmeGeo = new THREE.BoxGeometry(0.05, CAM_UST - DUVAR_YUK, 0.06);
    const dikmeSayisi = Math.max(2, Math.round(uzunluk / (HUCRE * 1.5)));
    for (let i = 0; i <= dikmeSayisi; i++) {
      const d = golgeli(new THREE.Mesh(dikmeGeo, cerceveMat));
      d.position.set(solDuvar + (uzunluk * i) / dikmeSayisi, (CAM_UST + DUVAR_YUK) / 2, ARKA_DUVAR_Z);
      this.sira.add(d);
    }
    for (const y of [DUVAR_YUK + 0.02, 1.62, CAM_UST]) {
      const k = golgeli(new THREE.Mesh(new THREE.BoxGeometry(uzunluk + 0.1, 0.05, 0.07), cerceveMat));
      k.position.set(ortaX, y, ARKA_DUVAR_Z);
      this.sira.add(k);
    }
    // Yan duvarlar (sıranın iki ucu): alçak duvar + cam + çerçeve, kameraya doğru uzanır
    const YAN_ON = 1.05;
    const yanDerinlik = YAN_ON - ARKA_DUVAR_Z;
    for (const xw of [solDuvar, sagDuvar]) {
      const zOrta = (YAN_ON + ARKA_DUVAR_Z) / 2;
      const yd = golgeli(new THREE.Mesh(new THREE.BoxGeometry(0.12, DUVAR_YUK, yanDerinlik), alcakDuvarMat));
      yd.position.set(xw, DUVAR_YUK / 2, zOrta);
      this.sira.add(yd);
      const yc = new THREE.Mesh(new THREE.PlaneGeometry(yanDerinlik, CAM_UST - DUVAR_YUK), camMat);
      yc.rotation.y = Math.PI / 2;
      yc.position.set(xw, (CAM_UST + DUVAR_YUK) / 2, zOrta);
      this.sira.add(yc);
      for (const z of [ARKA_DUVAR_Z, zOrta, YAN_ON]) {
        const d = golgeli(new THREE.Mesh(dikmeGeo, cerceveMat));
        d.position.set(xw, (CAM_UST + DUVAR_YUK) / 2, z);
        this.sira.add(d);
      }
      for (const y of [DUVAR_YUK + 0.02, 1.62, CAM_UST]) {
        const k = golgeli(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, yanDerinlik), cerceveMat));
        k.position.set(xw, y, zOrta);
        this.sira.add(k);
      }
    }
    // Çatı kirişleri (üstte, eğimli)
    for (let i = 0; i <= dikmeSayisi; i++) {
      const x = solDuvar + (uzunluk * i) / dikmeSayisi;
      const kiris = golgeli(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 1.9), cerceveMat), false, true);
      kiris.position.set(x, CAM_UST + 0.38, ARKA_DUVAR_Z + 0.85);
      kiris.rotation.x = 0.42;
      this.sira.add(kiris);
    }

    // Sarkan lambalar: gündüz kapalı, koyu temada sıcak ışık
    const lambaSayisi = Math.max(2, Math.round(uzunluk / 3.2));
    const kabukMat = new THREE.MeshStandardMaterial({ color: this.koyu ? '#2d4a50' : RENK.deniz, roughness: 0.45, metalness: 0.2, side: THREE.DoubleSide });
    const ampulMat = new THREE.MeshBasicMaterial({ color: this.koyu ? '#ffe2b0' : '#f3efe6' });
    const kabloMat = new THREE.MeshStandardMaterial({ color: '#2b2b2b', roughness: 0.6 });
    for (let i = 0; i < lambaSayisi; i++) {
      const x = solDuvar + (uzunluk * (i + 0.5)) / lambaSayisi;
      const grup = new THREE.Group();
      grup.position.set(x, 0, BITKI_Z + 0.1);
      const kablo = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.9, 6), kabloMat);
      kablo.position.y = CAM_UST + 0.1 - 0.45;
      grup.add(kablo);
      const kabuk = golgeli(new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.13, 28, 1, true), kabukMat), false, true);
      kabuk.position.y = CAM_UST + 0.1 - 0.95;
      grup.add(kabuk);
      const ampul = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), ampulMat);
      ampul.position.y = CAM_UST + 0.1 - 1.0;
      grup.add(ampul);
      if (this.koyu) {
        const isik = new THREE.PointLight(0xffd79a, 16, 5, 1.5);
        isik.position.y = CAM_UST + 0.1 - 1.06;
        grup.add(isik);
      }
      this.sira.add(grup);
    }

    // Bitkiler
    for (let i = 0; i < n; i++) this.bitkiKur(dunya, i);

    // Güneş gölge kutusu sıraya göre
    const g = this.gunes.shadow.camera;
    const yarim = uzunluk / 2 + 1.5;
    g.left = -yarim;
    g.right = yarim;
    g.top = 4;
    g.bottom = -4;
    g.updateProjectionMatrix();
    this.gunes.position.set(ortaX - 4.5, 8.5, 6.5);
    this.gunes.target.position.set(ortaX, 0, -0.4);

    this.kameraIlk = true;
    this.boyutla();
  }

  // -------------------------------------------------------------------------
  // Bahçe (ızgara) kurulumu: çimen, taş yollar, çalılar, çit, hedefte ayçiçeği
  // -------------------------------------------------------------------------
  private bahceKur(dunya: DunyaTanimi) {
    const g = this.izg;
    if (!g) return;
    const T = BAHCE_HUCRE;
    const W = g.en * T;
    const D = g.boy * T;
    const golgeli = <M extends THREE.Mesh>(m: M, al = true, ver = true) => {
      m.castShadow = ver;
      m.receiveShadow = al;
      return m;
    };
    const r = uretec(7 + g.en * 13 + g.boy * 7);

    // Çimen zemin
    const cim = cimDokusu(this.koyu);
    cim.repeat.set(9, 7);
    this.siraDokulari.push(cim);
    const zemin = golgeli(new THREE.Mesh(new THREE.PlaneGeometry(46, 34), new THREE.MeshStandardMaterial({ map: cim, roughness: 0.96 })), true, false);
    zemin.rotation.x = -Math.PI / 2;
    zemin.position.set(0, 0.001, 0);
    this.sira.add(zemin);
    const saha = g.tur === 'cizim';
    const insaat = g.tur === 'insaat';
    const tarla = dunya.boyaTuru === 'ek';
    // Bahçe alanı: ahşap kenarlı, biraz daha koyu toprak-çimen yatak (sahada yok: çim sahanın kendisi)
    if (!saha) {
    const yatak = golgeli(new THREE.Mesh(new RoundedBoxGeometry(W + 0.5, 0.05, D + 0.5, 2, 0.04), new THREE.MeshStandardMaterial({ color: this.koyu ? '#3b3226' : '#b99b72', roughness: 0.95 })), true, false);
    yatak.position.set(0, 0.022, 0);
    this.sira.add(yatak);
    const kenarMat = new THREE.MeshStandardMaterial({ map: this.ahsap, color: this.koyu ? '#9c8a74' : '#ffffff', roughness: 0.8 });
    for (const [sx, sz, en, boy] of [
      [0, -(D / 2 + 0.3), W + 0.72, 0.1],
      [0, D / 2 + 0.3, W + 0.72, 0.1],
      [-(W / 2 + 0.3), 0, 0.1, D + 0.5],
      [W / 2 + 0.3, 0, 0.1, D + 0.5],
    ] as const) {
      const k = golgeli(new THREE.Mesh(new THREE.BoxGeometry(en, 0.12, boy), kenarMat));
      k.position.set(sx, 0.06, sz);
      this.sira.add(k);
    }
    }

    // Hücreler: yol taşları (inşaatta beton, tarlada toprak), başlangıç, hedef; yol olmayan hücrelerde çalı
    const tas = tasDokusu();
    this.siraDokulari.push(tas);
    const tasGeo = new RoundedBoxGeometry(T * 0.9, 0.07, T * 0.9, 3, 0.05);
    const tasMat = new THREE.MeshStandardMaterial({ map: tas, color: insaat ? (this.koyu ? '#8f9496' : '#d9dcd8') : this.koyu ? '#a39c8f' : '#ffffff', roughness: 0.88 });
    const tarlaMat = new THREE.MeshStandardMaterial({ map: this.kuruDoku, color: this.koyu ? '#8a7560' : '#e8d2b4', roughness: 0.95 });
    const basMat = new THREE.MeshStandardMaterial({ color: this.koyu ? '#1f6a73' : RENK.deniz, roughness: 0.6 });
    const hedefMat = new THREE.MeshStandardMaterial({ color: this.koyu ? '#b58f2e' : '#e9b949', roughness: 0.55 });
    const caliRenk = this.koyu ? ['#24493a', '#2b5543', '#1f4033'] : ['#5e9d5a', '#6fae62', '#4f8a4d'];
    const caliGeo = new THREE.IcosahedronGeometry(1, 3);
    for (let y = 0; y < g.boy && !saha; y++) {
      for (let x = 0; x < g.en; x++) {
        const c = this.hucreMerkezi(x, y);
        const no = hucreNo(g, x, y);
        if (g.yol[no]) {
          const bas = g.bas.x === x && g.bas.y === y;
          const hedef = !!g.hedef && g.hedef.x === x && g.hedef.y === y;
          const toprakKaro = tarla && g.boyaHedef[no];
          const t = golgeli(new THREE.Mesh(tasGeo, bas && !toprakKaro ? basMat : toprakKaro ? tarlaMat : hedef ? hedefMat : tasMat), true, false);
          t.position.set(c.x, 0.07, c.z);
          this.sira.add(t);
          if (bas) {
            const yazi = zeminYazisi('BAŞLA');
            this.siraDokulari.push(yazi);
            const p = new THREE.Mesh(new THREE.PlaneGeometry(T * 0.62, T * 0.19), new THREE.MeshBasicMaterial({ map: yazi, transparent: true, depthWrite: false }));
            p.rotation.x = -Math.PI / 2;
            // Güneye (kameraya) bakarak başlarken yön oku güney kenara düşer: yazı kuzey kenarda (robot yürüyünce görünür)
            p.position.set(c.x, 0.108, c.z + (g.bas.yon === 1 ? -T * 0.31 : T * 0.31));
            this.sira.add(p);
            if (toprakKaro) {
              // Tarlada başlangıç karesi de ekilecek: deniz mavisi çerçeve başlangıcı gösterir
              const cm = new THREE.MeshBasicMaterial({ color: RENK.deniz });
              for (const [dx, dz, en, boy] of [
                [0, -T * 0.43, T * 0.9, 0.05],
                [0, T * 0.43, T * 0.9, 0.05],
                [-T * 0.43, 0, 0.05, T * 0.9],
                [T * 0.43, 0, 0.05, T * 0.9],
              ] as const) {
                const m = new THREE.Mesh(new THREE.PlaneGeometry(en, boy), cm);
                m.rotation.x = -Math.PI / 2;
                m.position.set(c.x + dx, 0.107, c.z + dz);
                this.sira.add(m);
              }
            }
          }
          if (hedef && insaat) this.insaatCikisiKur(c.x, c.z);
          else if (hedef) this.aycicegiKur(new THREE.Vector3(c.x + BAHCE_KOSE * T, 0.1, c.z - BAHCE_KOSE * T));
        } else {
          const cali = new THREE.Group();
          const parca = 3 + Math.floor(r() * 2);
          for (let k = 0; k < parca; k++) {
            const m = golgeli(new THREE.Mesh(caliGeo, new THREE.MeshStandardMaterial({ color: caliRenk[(k + x + y) % caliRenk.length], roughness: 0.92 })));
            const s = T * (0.21 + r() * 0.08);
            m.scale.set(s, s * (0.82 + r() * 0.2), s);
            const a = (k / parca) * Math.PI * 2 + r();
            m.position.set(Math.cos(a) * T * 0.16, s * 0.8, Math.sin(a) * T * 0.16);
            cali.add(m);
          }
          const tepe = golgeli(new THREE.Mesh(caliGeo, new THREE.MeshStandardMaterial({ color: caliRenk[1], roughness: 0.92 })));
          tepe.scale.setScalar(T * 0.23);
          tepe.position.y = T * 0.32;
          cali.add(tepe);
          cali.position.set(c.x, 0.04, c.z);
          this.sira.add(cali);
        }
      }
    }

    // Çit: bahçenin çevresinde ahşap direkler ve iki kat tırabzan
    const direkMat = new THREE.MeshStandardMaterial({ color: this.koyu ? '#8f8577' : '#f1ebdf', roughness: 0.7 });
    const direkGeo = new RoundedBoxGeometry(0.08, 0.5, 0.08, 2, 0.02);
    const kx = W / 2 + 0.5;
    const kz = D / 2 + 0.5;
    const direkler: [number, number][] = [];
    const adimX = Math.max(1, Math.round((2 * kx) / T));
    const adimZ = Math.max(1, Math.round((2 * kz) / T));
    for (let i = 0; i <= adimX; i++) {
      direkler.push([-kx + (2 * kx * i) / adimX, -kz]);
      direkler.push([-kx + (2 * kx * i) / adimX, kz]);
    }
    for (let i = 1; i < adimZ; i++) {
      direkler.push([-kx, -kz + (2 * kz * i) / adimZ]);
      direkler.push([kx, -kz + (2 * kz * i) / adimZ]);
    }
    for (const [dx, dz] of direkler) {
      const d = golgeli(new THREE.Mesh(direkGeo, direkMat));
      d.position.set(dx, 0.25, dz);
      this.sira.add(d);
    }
    for (const yuk of [0.2, 0.38]) {
      for (const [sx, sz, en, boy] of [
        [0, -kz, 2 * kx, 0.04],
        [0, kz, 2 * kx, 0.04],
        [-kx, 0, 0.04, 2 * kz],
        [kx, 0, 0.04, 2 * kz],
      ] as const) {
        const t = golgeli(new THREE.Mesh(new THREE.BoxGeometry(en, 0.045, boy), direkMat));
        t.position.set(sx, yuk, sz);
        this.sira.add(t);
      }
    }

    // Çitin ardında ağaçlar (yumuşak taçlar)
    const tacGeo = new THREE.IcosahedronGeometry(1, 3);
    const govdeGeo = new THREE.CylinderGeometry(0.07, 0.1, 1, 10);
    const govdeMat = new THREE.MeshStandardMaterial({ color: this.koyu ? '#3a3026' : '#8a6a4a', roughness: 0.9 });
    const tacRenk = this.koyu ? ['#27463f', '#2d5048'] : ['#7fae6a', '#6c9f5e', '#93bd78'];
    // Ağaçlar yalnız yanlarda: arkadakilerin tacı kadrajın üstünde kesiliyordu.
    const agaclar: [number, number, number][] = [
      [-kx - 1.5, -kz + 0.1, 1.0],
      [kx + 1.4, -kz + 0.3, 0.95],
      [-kx - 1.9, kz * 0.5 + 0.4, 0.85],
      [kx + 1.8, kz * 0.5 + 0.7, 0.9],
    ];
    agaclar.forEach(([ax, az, s], i) => {
      const agac = new THREE.Group();
      const govde = golgeli(new THREE.Mesh(govdeGeo, govdeMat));
      govde.scale.set(s, 0.9 * s, s);
      govde.position.y = 0.45 * s;
      agac.add(govde);
      const mat = new THREE.MeshStandardMaterial({ color: tacRenk[i % tacRenk.length], roughness: 0.95 });
      for (let k = 0; k < 3; k++) {
        const t = golgeli(new THREE.Mesh(tacGeo, mat));
        const ts = s * (0.62 - k * 0.1);
        t.scale.set(ts, ts * 0.9, ts);
        t.position.set((k - 1) * 0.3 * s, 1.15 * s + k * 0.26 * s, (r() - 0.5) * 0.2);
        agac.add(t);
      }
      agac.position.set(ax, 0, az);
      this.sira.add(agac);
    });

    // Çitin ardında alçak çalı sırası: kadraja tam girer, bahçeyi arkadan çevreler
    const calilar = Math.max(4, Math.round((2 * kx + 1.2) / 0.62));
    for (let i = 0; i < calilar; i++) {
      const cx = -kx - 0.6 + ((2 * kx + 1.2) * (i + 0.5)) / calilar;
      const mat = new THREE.MeshStandardMaterial({ color: tacRenk[(i * 2 + 1) % tacRenk.length], roughness: 0.95 });
      const s = 0.3 + r() * 0.1;
      for (let k = 0; k < 2; k++) {
        const t = golgeli(new THREE.Mesh(tacGeo, mat));
        const ts = s * (1 - k * 0.3);
        t.scale.set(ts * 1.15, ts * 0.85, ts);
        t.position.set(cx + (k - 0.5) * 0.22 + (r() - 0.5) * 0.08, ts * 0.72 + k * 0.1, -kz - 0.5 - (r() - 0.5) * 0.12);
        this.sira.add(t);
      }
    }

    // Koyu temada iki bahçe lambası
    if (this.koyu) {
      for (const lx of [-kx - 0.35, kx + 0.35]) {
        const direk = golgeli(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 1.5, 10), new THREE.MeshStandardMaterial({ color: '#2d3a3c', roughness: 0.5, metalness: 0.4 })));
        direk.position.set(lx, 0.75, -kz + 0.2);
        this.sira.add(direk);
        const ampul = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), new THREE.MeshBasicMaterial({ color: '#ffe2b0' }));
        ampul.position.set(lx, 1.55, -kz + 0.2);
        this.sira.add(ampul);
        const isik = new THREE.PointLight(0xffd79a, 18, 7, 1.4);
        isik.position.copy(ampul.position);
        this.sira.add(isik);
      }
    }

    // Bitkiler hücrenin kuzeydoğu köşesinde; üstlerinde numara çubuğu
    g.bitkiYeri.forEach((b, i) => {
      const c = this.hucreMerkezi(b.x, b.y);
      const yer = new THREE.Vector3(c.x + BAHCE_KOSE * T, 0.1, c.z - BAHCE_KOSE * T);
      this.bitkiKur(dunya, i, yer);
      if (g.bitkiYeri.length > 1) {
        const nd = numaraDokusu(i + 1, true);
        this.siraDokulari.push(nd);
        const cubuk = golgeli(new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.3, 0.014), new THREE.MeshStandardMaterial({ color: '#b08a5a', roughness: 0.8 })));
        cubuk.position.set(yer.x + 0.2, 0.25, yer.z + 0.22);
        this.sira.add(cubuk);
        const etiket = golgeli(new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.2), new THREE.MeshStandardMaterial({ map: nd, roughness: 0.7, side: THREE.DoubleSide })));
        etiket.position.set(yer.x + 0.2, 0.44, yer.z + 0.23);
        etiket.rotation.x = -0.55;
        this.sira.add(etiket);
      }
    });

    // Yeni dünyaların katmanı: saha çizgileri, boya, tarla, küpler, koordinat
    this.katman = new DunyaKatmani({ koyu: this.koyu, grup: this.sira, dokular: this.siraDokulari, izg: g, dunya, merkez: (x, y) => this.yerMerkezi(x, y), T });

    // Güneş gölge kutusu bahçeye göre
    const gc = this.gunes.shadow.camera;
    const yarim = Math.max(W, D) / 2 + 3 + (insaat ? DunyaKatmani.enYuksek(g) * KUP * 0.6 : 0);
    gc.left = -yarim;
    gc.right = yarim;
    gc.top = yarim;
    gc.bottom = -yarim;
    gc.updateProjectionMatrix();
    this.gunes.position.set(-4, 9, 6);
    this.gunes.target.position.set(0, 0, 0);
  }

  /** İnşaat alanında hedef: sarı karede ÇIKIŞ yazısı, iki köşede beyaz bantlı turuncu trafik konisi (ayçiçeği yerine) */
  private insaatCikisiKur(x: number, z: number) {
    const T = BAHCE_HUCRE;
    const yazi = zeminYazisi('ÇIKIŞ', this.koyu ? 'rgba(40, 30, 8, 0.9)' : 'rgba(92, 64, 12, 0.92)');
    this.siraDokulari.push(yazi);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(T * 0.66, T * 0.206), new THREE.MeshBasicMaterial({ map: yazi, transparent: true, depthWrite: false }));
    p.rotation.x = -Math.PI / 2;
    p.position.set(x, 0.108, z + T * 0.02);
    this.sira.add(p);
    const govdeMat = new THREE.MeshStandardMaterial({ color: this.koyu ? '#c9622a' : '#ec7a32', roughness: 0.55 });
    const bantMat = new THREE.MeshStandardMaterial({ color: '#f7f3ea', roughness: 0.5 });
    const tabanMat = new THREE.MeshStandardMaterial({ color: this.koyu ? '#3a3431' : '#4a4441', roughness: 0.8 });
    for (const [dx, dz] of [
      [-0.34, -0.34],
      [0.34, 0.34],
    ] as const) {
      const koni = new THREE.Group();
      const taban = new THREE.Mesh(new RoundedBoxGeometry(T * 0.17, 0.018, T * 0.17, 2, 0.006), tabanMat);
      taban.position.y = 0.009;
      const govde = new THREE.Mesh(new THREE.CylinderGeometry(T * 0.012, T * 0.062, T * 0.24, 20), govdeMat);
      govde.position.y = 0.018 + T * 0.12;
      const bant = new THREE.Mesh(new THREE.CylinderGeometry(T * 0.035, T * 0.043, T * 0.045, 20), bantMat);
      bant.position.y = 0.018 + T * 0.13;
      for (const m of [taban, govde, bant]) {
        m.castShadow = true;
        koni.add(m);
      }
      koni.position.set(x + dx * T, 0.105, z + dz * T);
      this.sira.add(koni);
    }
  }

  /** Hedef: ayçiçeği (saksıda, uzun sap, sarı taç yaprakları, kahverengi göbek) */
  private aycicegiKur(yer: THREE.Vector3) {
    const kok = new THREE.Group();
    kok.position.copy(yer);
    this.sira.add(kok);
    const golgeli = <M extends THREE.Mesh>(m: M) => {
      m.castShadow = true;
      m.receiveShadow = true;
      return m;
    };
    const saksi = golgeli(new THREE.Mesh(saksiGeometrisi(1.05), new THREE.MeshStandardMaterial({ color: RENK.pismisToprak, roughness: 0.82 })));
    kok.add(saksi);
    const toprak = new THREE.Mesh(new THREE.CircleGeometry(0.21, 30), new THREE.MeshStandardMaterial({ map: this.nemliDoku, roughness: 0.6 }));
    toprak.rotation.x = -Math.PI / 2;
    toprak.position.y = 0.3;
    kok.add(toprak);
    const sapMat = new THREE.MeshStandardMaterial({ color: '#4d8a3a', roughness: 0.65 });
    const egri = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.3, 0), new THREE.Vector3(0.02, 0.6, 0.01), new THREE.Vector3(-0.01, 0.9, 0.04), new THREE.Vector3(0, 1.08, 0.08)]);
    kok.add(golgeli(new THREE.Mesh(new THREE.TubeGeometry(egri, 24, 0.022, 8), sapMat)));
    const yaprak = yaprakGeometrisi(0.22, 0.1, 0.35);
    const yapraklar: THREE.BufferGeometry[] = [];
    for (const [h, a] of [
      [0.5, 0.4],
      [0.62, 2.6],
      [0.78, 4.4],
    ] as const) {
      const p = egri.getPointAt(Math.min(1, (h - 0.3) / 0.78));
      yapraklar.push(yerlestir(yaprak, p, new THREE.Euler(-1.1, a, 0, 'YXZ')));
    }
    const yGeo = mergeGeometries(yapraklar);
    yapraklar.forEach((p) => p.dispose());
    yaprak.dispose();
    if (yGeo) kok.add(golgeli(new THREE.Mesh(yGeo, new THREE.MeshStandardMaterial({ color: RENK.yaprak, roughness: 0.6, side: THREE.DoubleSide }))));
    // Çiçek başı: kameraya doğru hafif eğik
    const bas = new THREE.Group();
    bas.position.set(0, 1.1, 0.1);
    bas.rotation.x = 0.75;
    kok.add(bas);
    const gobek = golgeli(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.05, 32), new THREE.MeshStandardMaterial({ color: '#5a3a1e', roughness: 0.9 })));
    bas.add(gobek);
    const tacGeo = new THREE.SphereGeometry(1, 12, 8);
    const tacMat = new THREE.MeshStandardMaterial({ color: '#f2c230', roughness: 0.55 });
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const t = golgeli(new THREE.Mesh(tacGeo, tacMat));
      t.scale.set(0.085, 0.012, 0.032);
      t.position.set(Math.cos(a) * 0.17, (i % 2) * 0.006, Math.sin(a) * 0.17);
      t.rotation.y = -a;
      bas.add(t);
    }
  }

  /** Adım izleri: robotun bastığı her hücrenin güneybatı köşesinde numara (en son basış). Bitkiler kuzeydoğuda
   *  durduğu için alt komşunun saksısı bu numarayı örtmez. */
  private izleriGoster(izler: number[]) {
    const g = this.izg;
    if (!g) return;
    const son = new Map<number, number>();
    izler.forEach((h, i) => son.set(h, i + 1));
    for (const [h, m] of this.izIsaretleri) if (!son.has(h)) m.visible = false;
    for (const [h, n] of son) {
      let m = this.izIsaretleri.get(h);
      if (!m) {
        m = new THREE.Mesh(new THREE.CircleGeometry(0.15, 32), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }));
        m.rotation.x = -Math.PI / 2;
        const x = h % g.en;
        const y = Math.floor(h / g.en);
        const c = this.hucreMerkezi(x, y);
        m.position.set(c.x - 0.3 * BAHCE_HUCRE, 0.108, c.z + 0.3 * BAHCE_HUCRE);
        this.sira.add(m);
        this.izIsaretleri.set(h, m);
      }
      let doku = this.izDokulari.get(n);
      if (!doku) {
        doku = izDokusu(n);
        this.izDokulari.set(n, doku);
      }
      const mat = m.material as THREE.MeshBasicMaterial;
      if (mat.map !== doku) {
        mat.map = doku;
        mat.needsUpdate = true;
      }
      m.visible = true;
    }
  }

  private bitkiKur(dunya: DunyaTanimi, i: number, yer?: THREE.Vector3) {
    const n = dunya.bitkiler.length;
    const t = dunya.bitkiler[i];
    const kok = new THREE.Group();
    if (yer) kok.position.copy(yer);
    else kok.position.set(hucreX(i + 1, n), 0, BITKI_Z);
    this.sira.add(kok);
    const domatesMi = t.tur === 'domates';
    const olcek = domatesMi ? 1.16 : 1;
    const golgeli = <T extends THREE.Mesh>(m: T) => {
      m.castShadow = true;
      m.receiveShadow = true;
      return m;
    };
    const r = uretec(100 + i * 17);

    // Temas gölgesi, tabak, saksı, toprak
    const temas = new THREE.Mesh(new THREE.PlaneGeometry(0.78 * olcek, 0.78 * olcek), new THREE.MeshBasicMaterial({ map: this.golgeDoku, color: '#000000', transparent: true, opacity: 0.5, depthWrite: false }));
    temas.rotation.x = -Math.PI / 2;
    temas.position.y = 0.032;
    kok.add(temas);
    const pismis = new THREE.MeshStandardMaterial({ color: RENK.pismisToprak, roughness: 0.82 });
    const tabak = golgeli(new THREE.Mesh(new THREE.CylinderGeometry(0.255 * olcek, 0.235 * olcek, 0.03, 36), new THREE.MeshStandardMaterial({ color: RENK.pismisToprakKoyu, roughness: 0.85 })));
    tabak.position.y = 0.045;
    kok.add(tabak);
    const saksi = golgeli(new THREE.Mesh(saksiGeometrisi(olcek), pismis));
    saksi.position.y = 0.03;
    kok.add(saksi);
    const toprakMat = new THREE.MeshStandardMaterial({ map: this.kuruDoku, roughness: 0.96 });
    const toprakGeo = new THREE.CircleGeometry(0.212 * olcek, 36);
    const toprak = new THREE.Mesh(toprakGeo, toprakMat);
    toprak.rotation.x = -Math.PI / 2;
    toprak.position.y = 0.03 + 0.292 * olcek;
    toprak.receiveShadow = true;
    kok.add(toprak);
    // Islak katman: kuru toprağın üstünde, saydamlığı nemle artar (kurudan ıslağa yumuşak geçiş)
    const islakMat = new THREE.MeshStandardMaterial({ map: this.nemliDoku, roughness: 0.3, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 });
    const islak = new THREE.Mesh(toprakGeo.clone(), islakMat);
    islak.rotation.x = -Math.PI / 2;
    islak.position.y = toprak.position.y + 0.001;
    islak.receiveShadow = true;
    kok.add(islak);
    const toprakYeri = new THREE.Vector3(kok.position.x, kok.position.y + toprak.position.y + 0.01, kok.position.z);

    // Yapraklar (tek malzeme; renk sarı/yeşil arasında geçer)
    const yaprakMat = new THREE.MeshStandardMaterial({ color: RENK.yaprak, roughness: 0.6, side: THREE.DoubleSide });
    const sapMat = new THREE.MeshStandardMaterial({ color: '#4d8a3a', roughness: 0.65 });
    const yaprakGrubu = new THREE.Group();
    kok.add(yaprakGrubu);
    let domates: THREE.Mesh | null = null;
    let domatesMat: THREE.MeshPhysicalMaterial | null = null;
    const domatesYeri = new THREE.Vector3();

    if (!domatesMi) {
      // Fide: kısa sap + iki kat yaprak
      const sapBoy = 0.17;
      const sap = golgeli(new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.014, sapBoy, 8), sapMat));
      sap.position.y = toprak.position.y + sapBoy / 2;
      yaprakGrubu.add(sap);
      const yaprak = yaprakGeometrisi(0.2, 0.084, 0.4);
      const kucuk = yaprakGeometrisi(0.13, 0.06, 0.3);
      const parcalar: THREE.BufferGeometry[] = [];
      const tepe = toprak.position.y + sapBoy;
      const sayi = 6;
      const faz = r() * Math.PI;
      for (let k = 0; k < sayi; k++) {
        const a = faz + (k / sayi) * Math.PI * 2;
        parcalar.push(yerlestir(yaprak, new THREE.Vector3(0, tepe, 0), new THREE.Euler(-0.95 + r() * 0.2, a, 0, 'YXZ')));
      }
      for (let k = 0; k < 3; k++) {
        const a = faz + 0.6 + (k / 3) * Math.PI * 2;
        parcalar.push(yerlestir(kucuk, new THREE.Vector3(0, tepe + 0.02, 0), new THREE.Euler(-0.35, a, 0, 'YXZ')));
      }
      for (let k = 0; k < 2; k++) {
        parcalar.push(yerlestir(kucuk, new THREE.Vector3(0, toprak.position.y + 0.06, 0), new THREE.Euler(-1.2, faz + 1.2 + k * Math.PI, 0, 'YXZ'), 0.8));
      }
      const birlesik = mergeGeometries(parcalar);
      parcalar.forEach((p) => p.dispose());
      yaprak.dispose();
      kucuk.dispose();
      if (birlesik) {
        const y = golgeli(new THREE.Mesh(birlesik, yaprakMat));
        yaprakGrubu.add(y);
      }
    } else {
      // Domates fidesi: bambu çubuk, kıvrık sap, bileşik yapraklar, bir domates
      const bambu = golgeli(new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 1.02, 8), new THREE.MeshStandardMaterial({ color: RENK.bambu, roughness: 0.6 })));
      bambu.position.set(-0.05, toprak.position.y + 0.48, -0.06);
      kok.add(bambu);
      const noktalar: THREE.Vector3[] = [];
      for (let k = 0; k <= 6; k++) {
        const y = toprak.position.y + (k / 6) * 0.72;
        noktalar.push(new THREE.Vector3(Math.sin(k * 1.3) * 0.03, y, Math.cos(k * 1.1) * 0.02));
      }
      const egri = new THREE.CatmullRomCurve3(noktalar);
      const sap = golgeli(new THREE.Mesh(new THREE.TubeGeometry(egri, 32, 0.014, 8), sapMat));
      yaprakGrubu.add(sap);
      const yaprak = yaprakGeometrisi(0.14, 0.06, 0.32);
      const parcalar: THREE.BufferGeometry[] = [];
      const katlar = [0.16, 0.27, 0.38, 0.48, 0.58, 0.67, 0.74];
      katlar.forEach((h, k) => {
        const tepe = egri.getPointAt(Math.min(1, h / 0.72));
        const a = k * 2.4 + r() * 0.5;
        // Bileşik yaprak: ana eksen + iki yan yaprakçık
        const merkez = new THREE.Vector3(tepe.x, tepe.y, tepe.z);
        const b = 1.25 - k * 0.07;
        parcalar.push(yerlestir(yaprak, merkez, new THREE.Euler(-1.05, a, 0, 'YXZ'), 1.2 * b));
        parcalar.push(yerlestir(yaprak, merkez, new THREE.Euler(-1.2, a + 0.6, 0, 'YXZ'), 0.9 * b));
        parcalar.push(yerlestir(yaprak, merkez, new THREE.Euler(-1.2, a - 0.6, 0, 'YXZ'), 0.9 * b));
        parcalar.push(yerlestir(yaprak, merkez, new THREE.Euler(-0.9, a + Math.PI, 0, 'YXZ'), 0.75 * b));
      });
      // Tepe filizi
      const tepeN = egri.getPointAt(1);
      for (let k = 0; k < 3; k++) parcalar.push(yerlestir(yaprak, tepeN, new THREE.Euler(-0.5, k * 2.1, 0, 'YXZ'), 0.6));
      const birlesik = mergeGeometries(parcalar);
      parcalar.forEach((p) => p.dispose());
      yaprak.dispose();
      if (birlesik) yaprakGrubu.add(golgeli(new THREE.Mesh(birlesik, yaprakMat)));

      // Domates: yolun (kameranın) tarafında, orta yükseklikte
      const dy = toprak.position.y + 0.36;
      domatesMat = new THREE.MeshPhysicalMaterial({ color: t.domates === 'kirmizi' ? RENK.kirmizi : RENK.yesilDomates, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.25 });
      domates = golgeli(new THREE.Mesh(new THREE.SphereGeometry(0.115, 32, 22), domatesMat));
      domates.scale.set(1, 0.86, 1);
      domates.position.set(0.07, dy, 0.15);
      kok.add(domates);
      // Çanak yaprakları (yıldız)
      const canak = yaprakGeometrisi(0.045, 0.014, 0.1);
      const canakParcalari: THREE.BufferGeometry[] = [];
      for (let k = 0; k < 5; k++) canakParcalari.push(yerlestir(canak, new THREE.Vector3(0, 0.095, 0), new THREE.Euler(-1.35, (k / 5) * Math.PI * 2, 0, 'YXZ')));
      const canakGeo = mergeGeometries(canakParcalari);
      canakParcalari.forEach((p) => p.dispose());
      canak.dispose();
      if (canakGeo) domates.add(new THREE.Mesh(canakGeo, sapMat));
      const sapcik = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.07, 6), sapMat);
      sapcik.position.set(0, 0.125, 0);
      domates.add(sapcik);
      domatesYeri.set(kok.position.x + 0.07, kok.position.y + dy, kok.position.z + 0.15);
    }

    // Su birikintisi (taşma), gübre taneleri, vurgu ve flaş halkaları
    const birikinti = new THREE.Mesh(new THREE.CircleGeometry(0.44, 40), new THREE.MeshStandardMaterial({ color: '#7fc0de', roughness: 0.05, transparent: true, opacity: 0.6, depthWrite: false }));
    birikinti.rotation.x = -Math.PI / 2;
    birikinti.position.y = 0.034;
    birikinti.visible = false;
    kok.add(birikinti);
    const granul = new THREE.Group();
    const taneGeo = new THREE.BoxGeometry(0.02, 0.012, 0.02);
    const taneMat = new THREE.MeshStandardMaterial({ color: '#7a5431', roughness: 0.9 });
    for (let k = 0; k < 16; k++) {
      const m = new THREE.Mesh(taneGeo, taneMat);
      const a = r() * Math.PI * 2;
      const u = Math.sqrt(r()) * 0.16 * olcek;
      m.position.set(Math.cos(a) * u, toprak.position.y + 0.008, Math.sin(a) * u);
      m.rotation.y = r() * Math.PI;
      granul.add(m);
    }
    granul.visible = false;
    kok.add(granul);
    const vurgu = new THREE.Mesh(new THREE.RingGeometry(0.34 * olcek, 0.4 * olcek, 48), new THREE.MeshBasicMaterial({ color: RENK.vurgu, transparent: true, opacity: 0, depthWrite: false }));
    vurgu.rotation.x = -Math.PI / 2;
    vurgu.position.y = 0.036;
    kok.add(vurgu);
    const flas = new THREE.Mesh(new THREE.RingGeometry(0.3 * olcek, 0.44 * olcek, 48), new THREE.MeshBasicMaterial({ color: RENK.hata, transparent: true, opacity: 0, depthWrite: false }));
    flas.rotation.x = -Math.PI / 2;
    flas.position.y = 0.037;
    kok.add(flas);

    // Kütlesi bilinen domates: fidenin önünde, yerde okunur etiket (toplayıcı ve en büyük görevleri)
    if (t.tur === 'domates' && t.gram !== undefined) {
      const gd = gramDokusu(t.gram);
      this.siraDokulari.push(gd);
      const et = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.157), new THREE.MeshBasicMaterial({ map: gd, transparent: true, depthWrite: false }));
      et.rotation.x = -0.72;
      et.position.set(0, this.bahceMi ? 0.2 : 0.14, this.bahceMi ? 0.34 : 0.36);
      et.renderOrder = 2;
      kok.add(et);
    }

    this.bitkiler.push({ tur: t.tur, kok, toprakMat, islakMat, yaprakGrubu, yaprakMat, domates, domatesMat, domatesYeri, birikinti, granul, vurgu, flas, toprakYeri });
  }

  // -------------------------------------------------------------------------
  // Durum çizimi (animasyonsuz)
  // -------------------------------------------------------------------------
  goster(d: DunyaDurumu): void {
    const R = this.robot;
    R.kok.position.copy(this.hucreMerkezi(d.x, d.y));
    if (this.bahceMi && this.adimIzi) this.izleriGoster(d.izler);
    R.kok.rotation.set(0, yonAcisi(d.yon), 0);
    R.govde.position.set(0, 0, 0);
    R.govde.rotation.set(0, 0, 0);
    R.bas.rotation.set(0, 0, 0);
    this.kolAyarla(0, null);
    R.tarama.visible = false;
    R.tankFlasMat.opacity = 0;
    R.su.scale.y = Math.max(0.001, (d.depo / this.depoEnCok) * 0.27);
    const hamlar = d.bitkiler.filter((b) => b.zarar === 'ham').length;
    R.sepetDomatesleri.forEach((m, i) => {
      const kirmizi = i < d.sepet;
      const yesil = !kirmizi && i < d.sepet + hamlar;
      m.visible = kirmizi || yesil;
      (m.material as THREE.MeshPhysicalMaterial).color.set(kirmizi ? RENK.kirmizi : RENK.yesilDomates);
    });
    this.sonucIsareti.visible = false;
    this.sular.visible = false;
    this.suAkisi.visible = false;
    this.granuller.visible = false;
    this.ucanDomates.visible = false;
    this.hataIsareti.visible = false;
    for (const [, m] of this.yolBirikintileri) m.visible = false;
    d.bitkiler.forEach((b, i) => {
      const g = this.bitkiler[i];
      if (!g) return;
      this.toprakAyarla(g, b.toprak === 'kuru' ? 0 : 1);
      this.yaprakAyarla(g, b.yaprak === 'sari' ? 1 : b.zarar === 'tasma' ? 0.45 : 0);
      if (g.domates && g.domatesMat) {
        g.domates.visible = b.domates !== 'yok';
        g.domatesMat.color.set(b.domates === 'kirmizi' ? RENK.kirmizi : RENK.yesilDomates);
      }
      g.birikinti.visible = b.zarar === 'tasma';
      g.birikinti.scale.setScalar(1);
      g.granul.visible = b.gubre || b.zarar === 'gubre';
      (g.flas.material as THREE.MeshBasicMaterial).opacity = 0;
    });
    if (this.ifade !== 'normal') this.ifadeAyarla('normal');
    this.sonDurum = d;
    this.katman?.guncelle(d, null);
    R.kalemUcu.position.y = d.kalem ? 0 : 0.13;
    R.tasinanKup.visible = this.tur === 'insaat';
    if (this.tur === 'insaat') R.dron.position.y = this.ucus;
  }

  /** Hatanın izini kalıcı gösterir (goster'dan sonra): hata hücresinde mercan halka, boşa akan su. */
  hataGoster(h: Hata | null): void {
    if (!h) {
      this.hataIsareti.visible = false;
      return;
    }
    const bitkide = h.bitki !== undefined && (h.tur === 'tasma' || h.tur === 'ham' || h.tur === 'gereksizGubre');
    const p = bitkide && h.bitki ? this.bitkiler[h.bitki - 1].kok.position : this.hucreMerkezi(h.x, h.y);
    this.hataIsareti.position.set(p.x, this.bahceMi ? 0.112 : 0.056, p.z);
    this.hataIsareti.scale.setScalar(bitkide ? 1.25 : 1.1);
    this.hataIsareti.visible = true;
    if (h.tur === 'bosSula') this.yolBirikintisi(h.x, h.y).visible = true;
    if (this.sonDurum) this.katman?.guncelle(this.sonDurum, h);
    this.ifadeAyarla(h.tur === 'sonsuz' ? 'dusunceli' : 'uzgun');
  }

  /** Tahmin geri bildirimi: bazı bitkilerin çevresinde yumuşak halka (null: kapat). */
  vurgula(bitkiler: number[] | null): void {
    this.bitkiler.forEach((g, i) => {
      (g.vurgu.material as THREE.MeshBasicMaterial).opacity = bitkiler?.includes(i + 1) ? 0.9 : 0;
    });
  }

  ifadeAyarla(i: RobotIfadesi): void {
    this.ifade = i;
    const R = this.robot;
    R.gozMat.color.set(i === 'uzgun' ? '#ff9f8f' : i === 'dusunceli' ? '#cfe3e0' : '#8ff0e4');
    R.gozler.forEach((g) => {
      g.scale.set(1, i === 'mutlu' ? 0.45 : i === 'dusunceli' ? 0.3 : 1, 1);
      g.position.y = i === 'mutlu' ? 0.02 : 0.008;
    });
  }

  private toprakAyarla(g: BitkiGorseli, nem: number) {
    g.islakMat.opacity = Math.min(1, Math.max(0, nem));
  }

  private yaprakAyarla(g: BitkiGorseli, sari: number) {
    g.yaprakMat.color.set(RENK.yaprak).lerp(new THREE.Color(RENK.sariYaprak), sari);
    g.yaprakGrubu.rotation.z = 0;
    g.yaprakGrubu.scale.set(1, 1 - sari * 0.12, 1);
  }

  private yolBirikintisi(x: number, y: number): THREE.Mesh {
    const anahtar = this.izg ? hucreNo(this.izg, x, y) : x;
    let m = this.yolBirikintileri.get(anahtar);
    if (!m) {
      m = new THREE.Mesh(new THREE.CircleGeometry(0.26, 32), new THREE.MeshStandardMaterial({ color: '#7fc0de', roughness: 0.05, transparent: true, opacity: 0.6, depthWrite: false }));
      m.rotation.x = -Math.PI / 2;
      const c = this.hucreMerkezi(x, y);
      m.position.set(c.x, this.bahceMi ? 0.11 : 0.053, c.z + (this.bahceMi ? 0.3 : -0.22));
      this.sira.add(m);
      this.yolBirikintileri.set(anahtar, m);
    }
    return m;
  }

  /** Hücrenin (robotun durduğu yerin) dünya konumu */
  private hucreMerkezi(x: number, y: number): THREE.Vector3 {
    if (this.bahceMi && this.izg) {
      const [X, Z] = bahceHucre(x, y, this.izg.en, this.izg.boy);
      // Taş karo sıra dünyasındaki yoldan 0,055 yüksek; robot (ve temas gölgesi) karonun üstünde kalsın.
      // Sahada karo yok: robot çimenin üstünde
      return new THREE.Vector3(X, this.tur === 'cizim' ? 0 : 0.055, Z);
    }
    return new THREE.Vector3(hucreX(x, this.bitkiSayisi), 0, YOL_Z);
  }

  /** Yer düzleminde hücre / nokta merkezi (katman çizimleri için; y = 0) */
  private yerMerkezi(x: number, y: number): THREE.Vector3 {
    const v = this.hucreMerkezi(x, y);
    v.y = 0;
    return v;
  }

  /** Robotun başının bitkiye dönme açısı (baş yerel +x'e bakar) */
  private basAcisi(g: BitkiGorseli): number {
    const R = this.robot;
    R.kok.updateMatrixWorld(true);
    const hedef = g.tur === 'domates' ? g.domatesYeri : g.toprakYeri;
    const yerel = R.govde.worldToLocal(hedef.clone());
    return Math.atan2(-yerel.z, yerel.x);
  }

  // -------------------------------------------------------------------------
  // Animasyon
  // -------------------------------------------------------------------------
  private ara(sure: number, f: (t: number) => void, gecikme = 0): Promise<void> {
    return new Promise((coz) => {
      if (this.azHareket || sure <= 0) {
        f(1);
        coz();
        return;
      }
      this.araliklar.push({ bas: this.saat() + gecikme, sure, f, coz });
    });
  }

  /** Süren animasyonları hemen bitirir; bekleyen oynat() çağrısı kalan adımları atlar. */
  kes(): void {
    this.kusak += 1;
    const liste = this.araliklar;
    this.araliklar = [];
    for (const a of liste) {
      try {
        a.f(1);
      } catch {
        /* sökülmüş nesne */
      }
      a.coz();
    }
  }

  /** Bir yorumlayıcı adımını canlandırır. hiz: 1 normal, 2 hızlı … */
  async oynat(a: Adim, onceki: DunyaDurumu, hiz = 1): Promise<void> {
    this.kes();
    const k = this.kusak;
    const s = (sn: number) => (sn * 1000) / Math.max(0.25, hiz);
    const surdu = () => k === this.kusak && !this.kapatildi;
    this.goster(onceki);
    const R = this.robot;
    const n = this.bitkiSayisi;

    if (a.tur === 'tur') {
      await this.ara(s(0.18), () => undefined);
    } else if (a.tur === 'donguBitti') {
      // Küçük sevinç zıplaması
      this.ifadeAyarla('mutlu');
      await this.ara(s(0.5), (t) => {
        R.govde.position.y = Math.sin(t * Math.PI) * 0.08;
      });
    } else if (a.tur === 'kosul') {
      await this.bak(a, onceki, s, surdu);
    } else if (a.tur === 'atama' || a.tur === 'cagri') {
      // Değişken ya da komut adımı: sahnede hareket yok, kısa bekleme (koddaki vurgu okunsun)
      await this.ara(s(0.32), () => undefined);
    } else if (a.tur === 'eylem' && a.eylem) {
      const hata = a.hata;
      const g = this.izg;
      const burasi = g ? hucreNo(g, a.durum.x, a.durum.y) : 0;
      switch (a.eylem) {
        case 'ileri': {
          if (hata && hata.tur === 'duvar') {
            await this.carp(s);
            break;
          }
          const p0 = this.hucreMerkezi(onceki.x, onceki.y);
          const p1 = this.hucreMerkezi(a.durum.x, a.durum.y);
          const tekerDon = p0.distanceTo(p1) / 0.092;
          const bas = R.tekerlekler.map((t) => t.rotation.y);
          const ciziyor = this.tur === 'cizim' && onceki.kalem;
          const y0 = this.yerMerkezi(onceki.x, onceki.y);
          const y1 = this.yerMerkezi(a.durum.x, a.durum.y);
          await this.ara(s(this.tur === 'insaat' ? 0.7 : 0.55), (t) => {
            const u = hizlanYavasla(t);
            R.kok.position.lerpVectors(p0, p1, u);
            if (this.tur === 'insaat') {
              // Dron öne eğilerek uçar
              R.dron.rotation.z = -Math.sin(t * Math.PI) * 0.16;
            } else {
              R.govde.position.y = Math.abs(Math.sin(t * Math.PI * 2)) * 0.012;
              R.tekerlekler.forEach((w, i) => (w.rotation.y = bas[i] - tekerDon * u));
            }
            if (ciziyor) this.katman?.cizgiUzat(y0, y1, u, hata?.tur === 'yanlisCizgi');
          });
          R.dron.rotation.z = 0;
          break;
        }
        case 'boya':
        case 'ek': {
          await this.ara(s(0.45), (t) => {
            R.govde.position.y = -Math.sin(t * Math.PI) * 0.03;
            this.katman?.boyaBelir(burasi, kolayCikis(t));
          });
          break;
        }
        case 'koy': {
          const K = this.katman;
          if (!K) break;
          const h = onceki.kupler[burasi] ?? 0;
          R.kok.updateMatrixWorld(true);
          const bas = R.tasinanKup.getWorldPosition(new THREE.Vector3());
          const son = K.kupYeri(burasi, h);
          K.inenKup.material = K.kupMalzemesi(burasi);
          K.inenKup.visible = true;
          R.tasinanKup.visible = false;
          await this.ara(s(0.6), (t) => {
            const u = hizlanYavasla(t);
            K.inenKup.position.lerpVectors(bas, son, u);
          });
          K.inenKup.visible = false;
          break;
        }
        case 'isaretle': {
          await this.ara(s(0.38), (t) => this.katman?.noktaIndir(burasi, kolayCikis(t)));
          break;
        }
        case 'kalemKaldir':
        case 'kalemIndir': {
          const y0 = onceki.kalem ? 0 : 0.13;
          const y1 = a.durum.kalem ? 0 : 0.13;
          await this.ara(s(0.35), (t) => {
            R.kalemUcu.position.y = y0 + (y1 - y0) * yumusak(t);
          });
          break;
        }
        case 'sagaDon':
        case 'solaDon': {
          const a0 = yonAcisi(onceki.yon);
          const fark = aciFarki(a0, yonAcisi(a.durum.yon));
          await this.ara(s(0.45), (t) => {
            R.kok.rotation.y = a0 + fark * hizlanYavasla(t);
          });
          break;
        }
        case 'sula':
          await this.sula(a, onceki, s, surdu);
          break;
        case 'topla':
          await this.topla(a, onceki, s, surdu);
          break;
        case 'gubreVer':
          await this.gubrele(a, onceki, s, surdu);
          break;
      }
    }
    if (!surdu()) return;
    this.goster(a.durum);
    if (a.hata) this.hataGoster(a.hata);
    else if (a.tur === 'donguBitti') this.ifadeAyarla('mutlu');
  }

  private async carp(s: (sn: number) => number) {
    const R = this.robot;
    const yon = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), R.kok.rotation.y);
    const p0 = R.kok.position.clone();
    await this.ara(s(0.22), (t) => {
      R.kok.position.copy(p0).addScaledVector(yon, 0.2 * kolayCikis(t));
    });
    this.ifadeAyarla('uzgun');
    await this.ara(s(0.4), (t) => {
      R.kok.position.copy(p0).addScaledVector(yon, 0.2 * (1 - kolayCikis(t)));
      R.govde.rotation.z = Math.sin(t * Math.PI * 6) * 0.06 * (1 - t);
    });
  }

  /**
   * Kol: u 0 (katlı) … 1 (uç hedefte). Hedef dünya koordinatıdır; omuz düzleminde (yerel z–y)
   * iki eklemli ters kinematik, dirsek yukarıda. Açılar dinlenme pozuyla harmanlanır; uç (süzgeç /
   * kıskaç) her zaman yatay kalır.
   */
  private kolAyarla(u: number, hedef: THREE.Vector3 | null) {
    const R = this.robot;
    let t1 = KOL_DINLENME.t1;
    let rel = KOL_DINLENME.dirsek;
    let alt = KOL_DINLENME.alt;
    let donus = 0;
    if (hedef && u > 0) {
      R.kok.updateMatrixWorld(true);
      const yerel = R.govde.worldToLocal(hedef.clone());
      // Omuz ekseni hedefe döner (kol yerel -z'de uzanır); sera sırasında dönüş ~0'dır
      const dx = yerel.x - R.kol.position.x;
      const dz = yerel.z - R.kol.position.z;
      const tx = Math.hypot(dx, dz);
      const ty = yerel.y - R.kol.position.y;
      donus = Math.atan2(-dx, -dz);
      const a = KOL_UST;
      const d0 = Math.hypot(tx, ty);
      const b = Math.min(KOL_ALT_EN_COK, Math.max(KOL_ALT_EN_AZ, d0 * 0.6));
      const d = Math.min(a + b - 0.004, Math.max(Math.abs(a - b) + 0.01, d0));
      const phi = Math.atan2(ty, tx);
      const alfa = Math.acos(Math.min(1, Math.max(-1, (a * a + d * d - b * b) / (2 * a * d))));
      const beta = Math.acos(Math.min(1, Math.max(-1, (a * a + b * b - d * d) / (2 * a * b))));
      const ik1 = phi + alfa;
      const ikRel = -(Math.PI - beta);
      const k = yumusak(u);
      t1 += (ik1 - t1) * k;
      rel += (ikRel - rel) * k;
      alt += (b - alt) * k;
      donus *= k;
    }
    R.kol.rotation.y = donus;
    R.ustKol.rotation.x = t1;
    R.dirsek.rotation.x = rel;
    R.altBoru.scale.z = alt;
    R.kolUcu.position.z = -alt;
    R.kolUcu.rotation.x = -(t1 + rel);
  }

  private kolUcuDunya(): THREE.Vector3 {
    this.robot.kok.updateMatrixWorld(true);
    return this.robot.kolUcu.localToWorld(new THREE.Vector3(0, -0.09, 0));
  }

  /** Bitki olmayan hücrede kolun uzandığı yer: robotun sol önü, yerden yükseklik y */
  private bosHedef(y = 0.32): THREE.Vector3 {
    this.robot.kok.updateMatrixWorld(true);
    const v = this.robot.govde.localToWorld(new THREE.Vector3(0.05, 0, -0.66));
    v.y = y;
    return v;
  }

  private async bak(a: Adim, onceki: DunyaDurumu, s: (sn: number) => number, surdu: () => boolean) {
    const R = this.robot;
    const bi = bitkiSirasi(onceki);
    const bitkiBurada = bi >= 0;
    // Çıkış koşulu: robot önüne bakar; diğerleri: başını bitkiye çevirir
    const hedefBas = a.kosul === 'cikistayim' || !bitkiBurada ? 0 : this.basAcisi(this.bitkiler[bi]);
    await this.ara(s(0.3), (t) => {
      R.bas.rotation.y = hedefBas * yumusak(t);
    });
    if (!surdu()) return;
    R.tarama.visible = hedefBas !== 0;
    // Saksıya aşağı doğru, domatese neredeyse yatay bakar
    R.tarama.rotation.z = bitkiBurada && this.bitkiler[bi].tur === 'domates' ? -0.05 : -0.42;
    await this.ara(s(0.42), (t) => {
      R.taramaMat.opacity = Math.sin(t * Math.PI) * 0.26;
    });
    R.tarama.visible = false;
    if (!surdu()) return;
    // Sonuç simgesi bitkinin (ya da robotun) üstünde
    const g = bitkiBurada ? this.bitkiler[bi] : null;
    const yer = g ? new THREE.Vector3(g.kok.position.x, g.tur === 'domates' ? 1.25 : 0.82, g.kok.position.z) : new THREE.Vector3(R.kok.position.x, 1.05, R.kok.position.z);
    const mat = this.sonucIsareti.material as THREE.SpriteMaterial;
    mat.map = a.sonuc ? this.evetDoku : this.hayirDoku;
    mat.needsUpdate = true;
    this.sonucIsareti.position.copy(yer);
    this.sonucIsareti.visible = true;
    await this.ara(s(0.55), (t) => {
      const u = kolayCikis(Math.min(1, t * 2.2));
      this.sonucIsareti.scale.setScalar(0.28 * u);
      mat.opacity = t < 0.8 ? 1 : 1 - (t - 0.8) / 0.2;
      R.bas.rotation.y = hedefBas * (1 - yumusak(Math.max(0, (t - 0.5) / 0.5)));
    });
    this.sonucIsareti.visible = false;
    mat.opacity = 1;
  }

  private async sula(a: Adim, onceki: DunyaDurumu, s: (sn: number) => number, surdu: () => boolean) {
    const R = this.robot;
    const bi = bitkiSirasi(onceki);
    const bitki = bi >= 0 ? this.bitkiler[bi] : null;
    const kolHedefi = bitki ? bitki.toprakYeri.clone().add(new THREE.Vector3(0, 0.2, 0.02)) : this.bosHedef();
    await this.ara(s(0.34), (t) => this.kolAyarla(t, kolHedefi));
    if (!surdu()) return;
    const depoBos = a.hata?.tur === 'depoBos';
    if (depoBos) {
      await this.ara(s(0.5), (t) => {
        R.tankFlasMat.opacity = Math.sin(t * Math.PI * 3) ** 2 * 0.55;
      });
    } else {
      const bas = this.kolUcuDunya();
      const hedef = bitki ? bitki.toprakYeri.clone() : this.bosHedef(0.06);
      const m = new THREE.Matrix4();
      const su0 = R.su.scale.y;
      const su1 = Math.max(0.001, (a.durum.depo / this.depoEnCok) * 0.27);
      const kuru = bitki && onceki.bitkiler[bi].toprak === 'kuru';
      this.sular.visible = true;
      this.suAkisi.visible = true;
      this.suAkisi.position.copy(bas);
      this.suAkisi.scale.set(1, Math.max(0.05, bas.y - hedef.y), 1);
      const akisMat = this.suAkisi.material as THREE.MeshStandardMaterial;
      const r = uretec(onceki.x * 31 + 7);
      const sapma = Array.from({ length: GIZLI_SU_SAYISI }, () => [(r() - 0.5) * 0.14, (r() - 0.5) * 0.14, r() * 0.35] as const);
      await this.ara(s(0.7), (t) => {
        for (let i = 0; i < GIZLI_SU_SAYISI; i++) {
          const [ox, oz, gec] = sapma[i];
          const u = Math.min(1, Math.max(0, (t - gec) / 0.65));
          const p = yay([bas.x, bas.y, bas.z], [hedef.x + ox, hedef.y, hedef.z + oz], 0.1, u);
          const olcek = u <= 0 || u >= 1 ? 0 : 1;
          m.makeScale(olcek, olcek * 1.4, olcek).setPosition(p[0], p[1], p[2]);
          this.sular.setMatrixAt(i, m);
        }
        this.sular.instanceMatrix.needsUpdate = true;
        R.su.scale.y = su0 + (su1 - su0) * t;
        akisMat.opacity = t < 0.12 ? (t / 0.12) * 0.55 : t > 0.8 ? ((1 - t) / 0.2) * 0.55 : 0.55;
        if (bitki && kuru) this.toprakAyarla(bitki, Math.max(0, (t - 0.35) / 0.65));
      });
      this.sular.visible = false;
      this.suAkisi.visible = false;
      if (!surdu()) return;
      if (a.hata?.tur === 'tasma' && bitki) {
        bitki.birikinti.visible = true;
        const fm = bitki.flas.material as THREE.MeshBasicMaterial;
        await this.ara(s(0.7), (t) => {
          bitki.birikinti.scale.setScalar(0.3 + 0.7 * kolayCikis(t));
          fm.opacity = Math.sin(t * Math.PI * 2) ** 2 * 0.85;
          this.yaprakAyarla(bitki, 0.45 * t);
        });
      } else if (a.hata?.tur === 'bosSula') {
        const p = this.yolBirikintisi(onceki.x, onceki.y);
        p.visible = true;
        await this.ara(s(0.45), (t) => p.scale.setScalar(0.2 + 0.8 * kolayCikis(t)));
      }
    }
    if (!surdu()) return;
    await this.ara(s(0.3), (t) => this.kolAyarla(1 - t, kolHedefi));
  }

  private async topla(a: Adim, onceki: DunyaDurumu, s: (sn: number) => number, surdu: () => boolean) {
    const R = this.robot;
    const bi = bitkiSirasi(onceki);
    const bitki = bi >= 0 ? this.bitkiler[bi] : null;
    const var_ = !!bitki?.domates && onceki.bitkiler[bi].domates !== 'yok';
    const kolHedefi = var_ && bitki ? bitki.domatesYeri.clone().add(new THREE.Vector3(0, 0.05, 0.04)) : this.bosHedef(0.5);
    await this.ara(s(0.38), (t) => this.kolAyarla(t, kolHedefi));
    if (!surdu()) return;
    if (var_ && bitki?.domates && bitki.domatesMat) {
      const kirmizi = onceki.bitkiler[bi].domates === 'kirmizi';
      bitki.domates.visible = false;
      const u = this.ucanDomates;
      (u.material as THREE.MeshPhysicalMaterial).color.set(kirmizi ? RENK.kirmizi : RENK.yesilDomates);
      u.visible = true;
      const bas = bitki.domatesYeri.clone();
      const hedef = new THREE.Vector3();
      R.sepet.getWorldPosition(hedef);
      hedef.y += 0.03;
      const fm = bitki.flas.material as THREE.MeshBasicMaterial;
      await this.ara(s(0.55), (t) => {
        const p = yay([bas.x, bas.y, bas.z], [hedef.x, hedef.y, hedef.z], 0.28, hizlanYavasla(t));
        u.position.set(p[0], p[1], p[2]);
        u.scale.set(1 - t * 0.45, (1 - t * 0.45) * 0.86, 1 - t * 0.45);
        this.kolAyarla(1 - t, kolHedefi);
        if (!kirmizi) fm.opacity = Math.sin(t * Math.PI * 2) ** 2 * 0.85;
      });
      u.visible = false;
    } else {
      // Boş kavrama
      const fm = bitki?.flas.material as THREE.MeshBasicMaterial | undefined;
      await this.ara(s(0.45), (t) => {
        this.kolAyarla(1 - t, kolHedefi);
        if (fm) fm.opacity = Math.sin(t * Math.PI) * 0.6;
      });
    }
  }

  private async gubrele(a: Adim, onceki: DunyaDurumu, s: (sn: number) => number, surdu: () => boolean) {
    const R = this.robot;
    const bi = bitkiSirasi(onceki);
    const bitki = bi >= 0 ? this.bitkiler[bi] : null;
    const kolHedefi = bitki ? bitki.toprakYeri.clone().add(new THREE.Vector3(0, 0.24, 0.02)) : this.bosHedef();
    await this.ara(s(0.34), (t) => this.kolAyarla(t, kolHedefi));
    if (!surdu()) return;
    const bas = this.kolUcuDunya();
    const hedef = bitki ? bitki.toprakYeri.clone() : this.bosHedef(0.06);
    const m = new THREE.Matrix4();
    const r = uretec(onceki.x * 13 + 3);
    const sapma = Array.from({ length: GIZLI_SU_SAYISI }, () => [(r() - 0.5) * 0.18, (r() - 0.5) * 0.18, r() * 0.4] as const);
    this.granuller.visible = true;
    const sariydi = bitki && onceki.bitkiler[bi].yaprak === 'sari' && !a.hata;
    const fm = bitki?.flas.material as THREE.MeshBasicMaterial | undefined;
    await this.ara(s(0.6), (t) => {
      for (let i = 0; i < GIZLI_SU_SAYISI; i++) {
        const [ox, oz, gec] = sapma[i];
        const u = Math.min(1, Math.max(0, (t - gec) / 0.6));
        const p = yay([bas.x, bas.y, bas.z], [hedef.x + ox, hedef.y, hedef.z + oz], 0.05, u);
        const olcek = u <= 0 || u >= 1 ? 0 : 1;
        m.makeScale(olcek, olcek, olcek).setPosition(p[0], p[1], p[2]);
        this.granuller.setMatrixAt(i, m);
      }
      this.granuller.instanceMatrix.needsUpdate = true;
      if (a.hata && fm) fm.opacity = Math.sin(t * Math.PI * 2) ** 2 * 0.85;
    });
    this.granuller.visible = false;
    if (bitki) bitki.granul.visible = true;
    if (!surdu()) return;
    if (sariydi && bitki) {
      await this.ara(s(0.7), (t) => {
        this.yaprakAyarla(bitki, 1 - yumusak(t));
        this.kolAyarla(1 - Math.min(1, t * 1.6), kolHedefi);
      });
    } else {
      await this.ara(s(0.3), (t) => this.kolAyarla(1 - t, kolHedefi));
    }
  }

  // -------------------------------------------------------------------------
  // Kamera, boyut, döngü
  // -------------------------------------------------------------------------
  usttenBak(aktif: boolean): void {
    this.ustten = aktif;
  }

  private boyutla() {
    const w = Math.max(1, this.kap.clientWidth);
    const h = Math.max(1, this.kap.clientHeight);
    this.renderer.setSize(w, h, false);
    this.kamera.aspect = w / h;
    this.kamera.updateProjectionMatrix();
    this.kameraGuncelle(1, true);
    this.ciz();
  }

  private kameraGuncelle(dt: number, aninda = false) {
    const w = Math.max(1, this.kap.clientWidth);
    const h = Math.max(1, this.kap.clientHeight);
    const y =
      this.bahceMi && this.izg
        ? bahceKamerasi(this.izg.en, this.izg.boy, w, h, this.ustten, this.kamera.fov, this.tur === 'insaat' ? this.ucus * 1.08 + 0.3 : 0, this.koordinatMi ? 64 : 52)
        : kameraYerlesimi(this.bitkiSayisi, w, h, this.ustten, this.robot.kok.position.x, this.kamera.fov);
    const hedefK = new THREE.Vector3(...y.konum);
    const hedefH = new THREE.Vector3(...y.hedef);
    this.kameraHedefKonum.copy(hedefK);
    if (aninda || this.kameraIlk || this.azHareket) {
      this.kameraKonum.copy(hedefK);
      this.kameraHedef.copy(hedefH);
      this.kameraIlk = false;
    } else {
      const k = 1 - Math.exp(-dt * 4.5);
      this.kameraKonum.lerp(hedefK, k);
      this.kameraHedef.lerp(hedefH, k);
    }
    this.kamera.position.copy(this.kameraKonum);
    this.kamera.lookAt(this.kameraHedef);
    // Sis bahçenin arkasından başlar: büyük dünyada (koordinat düzlemi, geniş inşaat) kamera uzaklaşınca
    // bahçe sisin içinde kalıp solmasın. Küçük dünyalarda eski aralık (13–38) aynen kalır.
    const sis = this.sahne.fog;
    if (sis instanceof THREE.Fog) {
      const d = this.kameraKonum.distanceTo(this.kameraHedef);
      sis.near = Math.max(13, d + 3);
      sis.far = Math.max(38, d + 28);
    }
  }

  gorunur(aktif: boolean): void {
    this.gorunurDurum = aktif;
    if (aktif) this.baslat();
  }

  /** Zaman kaynağı: gerçek saat ya da (sınama/kayıt için) sanal saat. */
  private saat(): number {
    return this.sanalZaman ?? performance.now();
  }

  /** Sınama: sanal saati açar (null → gerçek zaman). Açıkken yalnız ilerlet() kare işler. */
  sanalSaat(aktif: boolean): void {
    this.sanalZaman = aktif ? performance.now() : null;
  }

  /** Sınama: sanal saati ms ilerletip bir kare işler ve çizer. */
  ilerlet(ms: number): void {
    if (this.sanalZaman === null) this.sanalZaman = performance.now();
    this.sanalZaman += ms;
    this.kare(this.sanalZaman, ms / 1000);
  }

  private kare(simdi: number, dt: number) {
    const liste = this.araliklar;
    for (let i = liste.length - 1; i >= 0; i--) {
      const a = liste[i];
      if (simdi < a.bas) continue;
      const t = Math.min(1, (simdi - a.bas) / a.sure);
      let bitti = t >= 1;
      try {
        a.f(t);
      } catch {
        // Bir aralık hata verirse döngü durmasın: aralık bitmiş sayılır
        bitti = true;
      }
      if (bitti) {
        const k = liste.indexOf(a);
        if (k >= 0) liste.splice(k, 1);
        a.coz();
      }
    }
    // Göz kırpma ve yaprak salınımı (az hareket tercihinde yok)
    if (!this.azHareket) {
      this.goz.sonraki -= dt;
      if (this.goz.sonraki <= 0) {
        this.goz.kirp = 0.14;
        this.goz.sonraki = 2.5 + Math.random() * 3;
      }
      if (this.goz.kirp > 0) {
        this.goz.kirp -= dt;
        const u = Math.max(0, this.goz.kirp / 0.14);
        const temel = this.ifade === 'mutlu' ? 0.45 : this.ifade === 'dusunceli' ? 0.3 : 1;
        this.robot.gozler.forEach((g) => (g.scale.y = temel * (1 - Math.sin(u * Math.PI) * 0.9)));
      }
      const zamanSn = simdi / 1000;
      this.bitkiler.forEach((b, i) => {
        b.yaprakGrubu.rotation.x = Math.sin(zamanSn * 0.9 + i * 0.7) * 0.012;
      });
      if (this.tur === 'insaat') {
        this.robot.pervaneler.forEach((p, i) => (p.rotation.y += dt * (i % 2 ? -34 : 34)));
        this.robot.dron.position.y = this.ucus + Math.sin(zamanSn * 2.2) * 0.025;
      }
    }
    this.kameraGuncelle(dt);
    this.ciz();
  }

  private baslat() {
    if (this.dongu !== null || this.kapatildi) return;
    this.sonZaman = performance.now();
    const adim = (zaman: number) => {
      if (this.kapatildi || !this.gorunurDurum) {
        this.dongu = null;
        return;
      }
      // Boştayken (animasyon yok, kamera durgun) yarı hızda çiz: akıllı tahtada ekran kartı yorulmasın
      const bosta = this.araliklar.length === 0 && this.kameraKonum.distanceToSquared(this.kameraHedefKonum) < 1e-6;
      if (bosta && zaman - this.sonZaman < 30) {
        this.dongu = requestAnimationFrame(adim);
        return;
      }
      const dt = Math.min(0.1, (zaman - this.sonZaman) / 1000);
      this.sonZaman = zaman;
      if (this.sanalZaman === null) this.kare(performance.now(), dt);
      this.dongu = requestAnimationFrame(adim);
    };
    this.dongu = requestAnimationFrame(adim);
  }

  private ciz() {
    if (this.kapatildi) return;
    this.renderer.render(this.sahne, this.kamera);
  }

  dispose(): void {
    this.kes();
    this.kapatildi = true;
    if (this.dongu !== null) cancelAnimationFrame(this.dongu);
    this.boyutGozlemci.disconnect();
    this.sahne.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh || (o as THREE.Sprite).isSprite) {
        m.geometry?.dispose();
        const mat = m.material as THREE.Material | THREE.Material[];
        (Array.isArray(mat) ? mat : [mat]).forEach((x) => x?.dispose());
      }
    });
    this.dokular.forEach((t) => t.dispose());
    this.siraDokulari.forEach((t) => t.dispose());
    this.izDokulari.forEach((t) => t.dispose());
    this.ortam.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

export function webglVar(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

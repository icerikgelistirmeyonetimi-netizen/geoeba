/**
 * Matematik Sınıfı — Three.js sahne motoru.
 *
 * Blender'dan sinif_aktar.py ile üretilen GLB + JSON verisini yükler; perspektif kamerayı,
 * güneşi (gölgeli), pencere gök dolgularını (alan ışıkları), sıcak iç dolguları ve dünya
 * rengini yeniden kurar. Kamera arka sıradan akıllı tahtanın tam karşısına yumuşak, hafif
 * kavisli bir yolda ilerler; her karede EKRAN düzleminin dört köşesinin kap içi piksel
 * izdüşümünü verir. Kabuk (SinifEkrani) bu köşelerden homografi üretip DOM ekranı 3B
 * dörtgene oturtur; varışta ekranDikdortgeni() ile devir animasyonunu başlatır ve motoru söker.
 *
 * AdaEkrani deseni: modül yüklenirken DOM'a ve global THREE.ShaderChunk'a dokunmaz; yükleme
 * iptal edilebilir, dispose() her şeyi söker (bağlam kaybı dahil).
 */
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import {
  RenkDuzeltme,
  SeciciGTAOPass,
  dolguYamasiBagla,
  grupAdi,
  iptalBeklemesi,
  iptalHatasi,
  kaliteSec,
  yumusak,
  type Kalite,
  type SahneIsigi,
  type SahneMalzemesi,
  type Uclu,
} from '../adalar/adaSahnesi';

// ---------------------------------------------------------------------------
// Tipler
// ---------------------------------------------------------------------------
export type Kose = [number, number];

/** sinif_aktar.py JSON'undaki `groups` öğesi. */
export interface SinifGrubu {
  key: string;
  node: string;
  kind: 'board' | 'static' | 'backdrop' | 'poster';
  id: string;
  bbox: { min: Uclu; max: Uclu };
  triangles: number;
}

/**
 * Tahtanın üstündeki çerçeveli poster (sinif_aktar.py `posters`): kâğıt düzleminin köşeleri
 * TL, TR, BR, BL (izleyiciye göre, Three.js Y yukarı) ve varlık köküne göre doku yolu.
 */
export interface SinifPosteri {
  id: string;
  corners: [Uclu, Uclu, Uclu, Uclu];
  width: number;
  height: number;
  texture: string;
}

/** public/sinif/data/sinif.json */
export interface SinifVerisi {
  page: 'sinif';
  source?: string;
  units?: string;
  model: string;
  camera: {
    type: 'PERSP';
    lens: number;
    sensor: number;
    near: number;
    far: number;
    start: { position: Uclu; target: Uclu };
    end: { position: Uclu; target: Uclu };
  };
  screen: {
    corners: [Uclu, Uclu, Uclu, Uclu];
    center: Uclu;
    normal: Uclu;
    width: number;
    height: number;
    aspect: number;
  };
  posters?: SinifPosteri[];
  lights: SahneIsigi[];
  world: { color: Uclu; strength: number } | null;
  viewTransform?: [string, string, number];
  groups: SinifGrubu[];
  materials: Record<string, SahneMalzemesi>;
  triangles: number;
}

export interface SinifSahnesiSecenekleri {
  /** Varlık kökü ('/' ile biter), ör. '/geoeba/sinif/' */
  varliklar: string;
  /** Draco çözücü klasörü ('/' ile biter), ör. '/geoeba/adalar/draco/' */
  dracoYolu: string;
  /**
   * Her karede EKRAN köşelerinin (TL, TR, BR, BL) kap içindeki CSS piksel izdüşümü;
   * bir köşe kameranın arkasındaysa null.
   */
  onEkran?: (koseler: Kose[] | null) => void;
}

export interface Dikdortgen {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type SinifSahnesiOlayHaritasi = {
  hata: { mesaj: string; yenile?: boolean };
};

/** Yaklaşma yolu: başlangıç, bitiş ve yana kaydırılmış kontrol noktasıyla ikinci derece Bézier. */
export interface YaklasmaYolu {
  bas: THREE.Vector3;
  bitis: THREE.Vector3;
  /** Kontrol noktası (yatay düzlemde; yüksekliği göz yüksekliğidir) */
  kontrol: THREE.Vector3;
  basHedef: THREE.Vector3;
  bitisHedef: THREE.Vector3;
}

// ---------------------------------------------------------------------------
// Saf yardımcılar (Node ortamında sınanır)
// ---------------------------------------------------------------------------

/** Göz yüksekliği (m): yürüyen izleyici; sona doğru ekran merkezinin yüksekliğine iner. */
export const GOZ_YUKSEKLIGI = 1.55;
/** Yaklaşma yolunun yana kavis payı (m). */
export const YAN_OFSET = 0.6;
/** Varsayılan yaklaşma süresi (ms). */
export const YAKLASMA_SURESI = 3400;
/** atla(): kalan yolun bitirileceği süre (ms). */
export const ATLAMA_SURESI = 380;
/** giris(): perde açılırken yavaş sürüklenme süresi (ms). */
export const GIRIS_SURESI = 400;
/**
 * giris() sırasında kat edilen yol payı: yaklaşmanın başlangıç hızıyla (yaklasmaEgrisi'nin
 * t=0 eğimi × GIRIS_SURESI / YAKLASMA_SURESI) aynı; perde açılırken görüntü donmuş durmaz,
 * yürüyüş kesintisiz başlar.
 */
export const GIRIS_KAYMA = 0.035;
/**
 * Yaklaşma hız eğrisi: başta sıfır olmayan eğim (giriş sürüklenmesiyle süreklilik, ilk saniye
 * donmuş görünmesin), sonda sıfır eğim (tahtanın karşısına yumuşak varış).
 * f(t) = A·(1 − (1 − t)²) + (1 − A)·easeInOutCubic(t); f'(0) = 2A = 0.3, f'(1) = 0.
 */
export function yaklasmaEgrisi(t: number): number {
  const x = THREE.MathUtils.clamp(t, 0, 1);
  const A = 0.15;
  return A * (1 - (1 - x) * (1 - x)) + (1 - A) * yumusak.gecis(x);
}
/** Yükleme ilerlemesinde GLB + poster dokusu indirmelerinin payı; kalanı gölgelendirici ısınmasına ayrılır. */
export const GLB_PAYI = 0.8;
/** GLB_PAYI içinde poster dokularının payı (GLB'ye kalan: 1 − POSTER_PAYI). */
export const POSTER_PAYI = 0.12;
/** Poster dokusunun GLB'deki kâğıt düzleminin önüne ofseti (m): z-savaşı olmasın. */
export const POSTER_OFSET = 0.003;

/** JSON'daki poster kaydı kullanılabilir mi: 4 sayısal köşe ve boş olmayan doku yolu. */
export function posterGecerli(p: unknown): p is SinifPosteri {
  if (!p || typeof p !== 'object') return false;
  const k = p as Partial<SinifPosteri>;
  return (
    typeof k.id === 'string' &&
    k.id.length > 0 &&
    typeof k.texture === 'string' &&
    k.texture.length > 0 &&
    Array.isArray(k.corners) &&
    k.corners.length === 4 &&
    k.corners.every((c) => Array.isArray(c) && c.length === 3 && c.every((v) => Number.isFinite(v)))
  );
}

/** Köşelerden (TL, TR, BR, BL) izleyiciye bakan birim normal: sağ (TR−TL) × yukarı (TL−BL). */
export function posterNormali(koseler: readonly Uclu[]): THREE.Vector3 {
  const TL = new THREE.Vector3(...koseler[0]);
  const TR = new THREE.Vector3(...koseler[1]);
  const BL = new THREE.Vector3(...koseler[3]);
  const sag = TR.clone().sub(TL);
  const yukari = TL.clone().sub(BL);
  return sag.cross(yukari).normalize();
}

/**
 * Dört köşeden (TL, TR, BR, BL) tek dörtgenlik BufferGeometry: normal boyunca `ofset` kadar
 * öne alınır; UV TL (0,1) → BR (1,0) (TextureLoader'ın flipY'li görüntüsü dik durur); iki üçgen
 * saat yönünün tersine (Three.js ön yüz) sarılır; normal özniteliği izleyiciye bakar.
 */
export function posterGeometrisi(koseler: readonly Uclu[], ofset = POSTER_OFSET): THREE.BufferGeometry {
  const n = posterNormali(koseler);
  const konum = new Float32Array(12);
  for (let i = 0; i < 4; i++) {
    konum[i * 3] = koseler[i][0] + n.x * ofset;
    konum[i * 3 + 1] = koseler[i][1] + n.y * ofset;
    konum[i * 3 + 2] = koseler[i][2] + n.z * ofset;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(konum, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array([n.x, n.y, n.z, n.x, n.y, n.z, n.x, n.y, n.z, n.x, n.y, n.z]), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 1, 1, 1, 1, 0, 0, 0]), 2));
  g.setIndex([0, 3, 2, 0, 2, 1]);
  return g;
}
/** Ekran ışıması: emissiveIntensity aralığı ve önündeki nokta ışığın en büyük yoğunluğu. */
export const EKRAN_ISIMA = { enAz: 0.15, enCok: 1.4, isikEnCok: 6 };

/**
 * Blender'ın sensor/lens çiftinden Three.js dikey görüş açısı (derece). Blender "Auto" sensör
 * uyumu: sensör genişliği kadrajın uzun kenarına düşer; yatay kadrajda yatay FOV sensörden,
 * dikey FOV en boy oranından türetilir. Dikey kadrajda sensör dikey kenara düşer.
 */
export function dikeyFov(lens: number, sensor: number, enBoy: number): number {
  const yarimTan = sensor / 2 / lens;
  const dikeyTan = enBoy >= 1 ? yarimTan / enBoy : yarimTan;
  return THREE.MathUtils.radToDeg(2 * Math.atan(dikeyTan));
}

/**
 * Bitiş kamerasının ekrana uzaklığı (m): kap en boy oranı ekranınkinden geniş ya da eşitse
 * ekranın izdüşüm genişliği = kap genişliği; değilse izdüşüm yüksekliği = kap yüksekliği.
 * Kamera ekrana dik baktığından izdüşüm eksenlere hizalı bir dikdörtgendir.
 */
export function bitisUzakligi(
  ekran: { width: number; height: number },
  kapW: number,
  kapH: number,
  lens: number,
  sensor: number
): number {
  const w = Math.max(1, kapW);
  const h = Math.max(1, kapH);
  const enBoy = w / h;
  const dikeyTan = Math.tan(THREE.MathUtils.degToRad(dikeyFov(lens, sensor, enBoy)) / 2);
  const yatayTan = dikeyTan * enBoy;
  const ekranEnBoy = ekran.width / ekran.height;
  return enBoy >= ekranEnBoy ? ekran.width / 2 / yatayTan : ekran.height / 2 / dikeyTan;
}

/**
 * Kamera konumu ve bakış hedefi; u ∈ [0,1] yumuşatılmış yol parametresi.
 * Yatayda ikinci derece Bézier; yükseklik yolun büyük bölümünde göz yüksekliğinde kalır,
 * son çeyrekte bitiş yüksekliğine (ekran merkezi) iner. Hedef başlangıçtan ekran merkezine
 * doğrusal geçer.
 */
export function yaklasmaKonumu(
  yol: YaklasmaYolu,
  u: number,
  cikti: { konum: THREE.Vector3; hedef: THREE.Vector3 } = { konum: new THREE.Vector3(), hedef: new THREE.Vector3() }
): { konum: THREE.Vector3; hedef: THREE.Vector3 } {
  const t = THREE.MathUtils.clamp(u, 0, 1);
  const a = (1 - t) * (1 - t);
  const b = 2 * (1 - t) * t;
  const c = t * t;
  cikti.konum.set(
    a * yol.bas.x + b * yol.kontrol.x + c * yol.bitis.x,
    0,
    a * yol.bas.z + b * yol.kontrol.z + c * yol.bitis.z
  );
  const inis = THREE.MathUtils.smoothstep(t, 0.6, 1);
  cikti.konum.y = THREE.MathUtils.lerp(yol.bas.y, yol.bitis.y, inis);
  cikti.hedef.copy(yol.basHedef).lerp(yol.bitisHedef, t);
  return cikti;
}

/**
 * Yaklaşma yolunu kurar: kontrol noktası başlangıç–bitiş orta noktasının yatay dikmesi
 * boyunca yanOfset kadar kaydırılır (varsayılan +x tarafı: kapı/sağ duvar yönü); kavis
 * kameranın tahtaya hafif bir salınımla varmasını sağlar.
 */
export function yaklasmaYolu(
  bas: THREE.Vector3,
  bitis: THREE.Vector3,
  basHedef: THREE.Vector3,
  bitisHedef: THREE.Vector3,
  yanOfset = YAN_OFSET
): YaklasmaYolu {
  const dx = bitis.x - bas.x;
  const dz = bitis.z - bas.z;
  const boy = Math.hypot(dx, dz) || 1;
  // Yatay dikme; x bileşeni pozitif olacak biçimde yönlendirilir (sağ taraf)
  let nx = -dz / boy;
  let nz = dx / boy;
  if (nx < 0 || (nx === 0 && nz < 0)) {
    nx = -nx;
    nz = -nz;
  }
  const kontrol = new THREE.Vector3((bas.x + bitis.x) / 2 + nx * yanOfset, bas.y, (bas.z + bitis.z) / 2 + nz * yanOfset);
  return { bas: bas.clone(), bitis: bitis.clone(), kontrol, basHedef: basHedef.clone(), bitisHedef: bitisHedef.clone() };
}

/**
 * Dünya noktalarını kap içi CSS piksele izdüşürür; bir nokta kameranın arkasında (ya da
 * yakın kırpma düzleminin gerisinde) kalırsa null. Kameranın matrisleri güncel olmalıdır.
 */
export function koseIzdusumu(noktalar: readonly Uclu[], kamera: THREE.Camera, w: number, h: number): Kose[] | null {
  const v = new THREE.Vector3();
  const sonuc: Kose[] = [];
  const yakin = (kamera as THREE.PerspectiveCamera).near ?? 0;
  for (const n of noktalar) {
    v.set(n[0], n[1], n[2]).applyMatrix4(kamera.matrixWorldInverse);
    if (v.z > -yakin) return null;
    v.set(n[0], n[1], n[2]).project(kamera);
    sonuc.push([(v.x * 0.5 + 0.5) * w, (-v.y * 0.5 + 0.5) * h]);
  }
  return sonuc;
}

/** Köşelerin eksenlere hizalı sınır kutusu (px). */
export function koseKutusu(koseler: readonly Kose[]): Dikdortgen {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of koseler) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/**
 * Pencere dışındaki arka plan düzlemi: deniz → ufuk → gök düşey gradyanı (dünya y'sine göre).
 * Ufuk göz yüksekliğinde (1,5 m); altı Takımadalar denizinin turkuazı, üstü açık sabah göğü.
 * Işımalı, gölgesiz; OutputPass'in AgX ton eşlemesi doğrusal renkleri ekrana taşır.
 */
export function disGorunumMalzemesi(ad = 'Dış • gökyüzü ışığı'): THREE.ShaderMaterial {
  const m = new THREE.ShaderMaterial({
    name: ad,
    uniforms: {
      uDeniz: { value: new THREE.Color(0.1, 0.42, 0.46) },
      uUfuk: { value: new THREE.Color(0.8, 0.92, 0.92) },
      uGok: { value: new THREE.Color(0.34, 0.6, 0.78) },
      uUfukY: { value: 1.5 },
      uYogunluk: { value: 1.7 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDunya;
      void main() {
        vec4 d = modelMatrix * vec4(position, 1.0);
        vDunya = d.xyz;
        gl_Position = projectionMatrix * viewMatrix * d;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uDeniz;
      uniform vec3 uUfuk;
      uniform vec3 uGok;
      uniform float uUfukY;
      uniform float uYogunluk;
      varying vec3 vDunya;
      void main() {
        float y = vDunya.y;
        // Deniz: derinlerde koyu, ufka doğru açılır (uzak su ufuk ışığını yansıtır)
        vec3 deniz = mix(uDeniz * 0.8, mix(uDeniz, uUfuk, 0.45), smoothstep(uUfukY - 2.2, uUfukY, y));
        // Gök: ufukta krem-cam, yukarıda doygun sabah mavisi
        vec3 gok = mix(uUfuk, uGok, smoothstep(uUfukY, uUfukY + 4.5, y));
        vec3 renk = mix(deniz, gok, smoothstep(uUfukY - 0.05, uUfukY + 0.05, y));
        gl_FragColor = vec4(renk * uYogunluk, 1.0);
      }
    `,
    side: THREE.DoubleSide,
    fog: false,
  });
  m.userData = { kind: 'emissive', disGorunum: true };
  return m;
}

/**
 * Sıcak, nötr iç mekân ortam haritası: tavan ışığı kremi, ufukta sıva rengi, zeminde
 * linolyum kahvesi ve pencere tarafında (−x) hafif gök ışığı. Metal ve cam yansımaları için;
 * adaların gökyüzü ortamı iç mekânda yüzeyleri aşırı maviye boyuyordu. Hedef dispose ile bırakılır.
 */
export function odaOrtami(renderer: THREE.WebGLRenderer, pencereYonu = new THREE.Vector3(-1, 0.15, 0)): THREE.WebGLRenderTarget {
  const sahne = new THREE.Scene();
  const malzeme = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTavan: { value: new THREE.Color(0.86, 0.83, 0.76) },
      uUfuk: { value: new THREE.Color(0.58, 0.55, 0.49) },
      uZemin: { value: new THREE.Color(0.3, 0.26, 0.2) },
      uPencere: { value: pencereYonu.clone().normalize() },
      uGok: { value: new THREE.Color(0.55, 0.8, 0.86) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vYon;
      void main() {
        vYon = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uTavan, uUfuk, uZemin, uPencere, uGok;
      varying vec3 vYon;
      void main() {
        vec3 d = normalize(vYon);
        vec3 c = d.y > 0.0 ? mix(uUfuk, uTavan, pow(d.y, 0.7)) : mix(uUfuk, uZemin, pow(-d.y, 0.5));
        float p = max(dot(d, uPencere), 0.0);
        c = mix(c, uGok, smoothstep(0.55, 0.95, p) * 0.85);
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const kure = new THREE.SphereGeometry(10, 48, 24);
  sahne.add(new THREE.Mesh(kure, malzeme));
  const pmrem = new THREE.PMREMGenerator(renderer);
  const hedef = pmrem.fromScene(sahne, 0);
  pmrem.dispose();
  malzeme.dispose();
  kure.dispose();
  return hedef;
}

// ---------------------------------------------------------------------------
// Sahne motoru
// ---------------------------------------------------------------------------
export class SinifSahnesi extends EventTarget {
  private readonly kap: HTMLElement;
  private readonly varliklar: string;
  private readonly dracoYolu: string;
  private readonly onEkran: ((koseler: Kose[] | null) => void) | null;
  private readonly azHareket: boolean;
  private readonly kalite: Kalite;
  private readonly saat = new THREE.Clock();
  private readonly olcum = { kare: 0, toplam: 0, aktif: false, bitti: false };
  private pikselSiniri: number | null = null;

  // Yaşam döngüsü: yukle() bitince hazır; dispose() sonrası kalıcı olarak kapalı
  private hazir = false;
  /** Süren compileAsync (yalnız yükleme sırasında); dispose GPU sökümünü bunu bekleyerek yapar */
  private derleme: Promise<void> | null = null;
  private kapatildi = false;
  private readonly kapatma = new AbortController();
  private readonly sokuculer: (() => void)[] = [];
  private dprSokucu: (() => void) | null = null;
  private boyutGozlemci: ResizeObserver | null = null;

  // yukle() sırasında kurulanlar (hazir === true iken tanımlı)
  private renderer!: THREE.WebGLRenderer;
  private veri!: SinifVerisi;
  private sahne!: THREE.Scene;
  private kamera!: THREE.PerspectiveCamera;
  private bilesim!: EffectComposer;
  private ortamHedefi: THREE.WebGLRenderTarget | null = null;
  private ortam: THREE.Texture | null = null;
  private ao: SeciciGTAOPass | null = null;
  private ekranMalzemesi: THREE.MeshStandardMaterial | null = null;
  private ekranIsigi: THREE.PointLight | null = null;
  private parlaklik = EKRAN_ISIMA.enAz;
  private parlaklikOrani = 0;

  // Kamera yolu
  private ekranMerkezi = new THREE.Vector3();
  private ekranNormali = new THREE.Vector3(0, 0, 1);
  private ekranKoseleri: Uclu[] = [];
  private yol: YaklasmaYolu | null = null;
  private yolIlerleme = 0;
  /** Süren yaklaşma: zamanlama ve çözümleyici; atla() yeniden zamanlar */
  private yaklasma: { baslangic: number; sure: number; u0: number; egri: (t: number) => number; coz: (vardi: boolean) => void } | null = null;
  private girisCoz: (() => void) | null = null;
  private girisZamanlayici = 0;
  /** giris() sürüklenmesi: perde açılırken kamera yavaşça ilerler (u0 → u1 doğrusal) */
  private girisSuruklenme: { baslangic: number; sure: number; u0: number; u1: number } | null = null;
  /** giris() beklenirken atla() çağrıldı: sıradaki yaklas() kısa sürede biter */
  private atlaBekliyor = false;
  private vardi = false;

  constructor(kap: HTMLElement, secenek: SinifSahnesiSecenekleri) {
    super();
    this.kap = kap;
    this.varliklar = secenek.varliklar;
    this.dracoYolu = secenek.dracoYolu;
    this.onEkran = secenek.onEkran ?? null;
    this.azHareket = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.kalite = kaliteSec();
    // Hata ayıklama: ?sinifDebug=1 ile motor örneği pencereye açılır (Playwright doğrulamaları)
    if (new URLSearchParams(window.location.search).has('sinifDebug')) {
      const w = window as Window & { __sinifSahnesi?: SinifSahnesi; __THREE?: typeof THREE };
      w.__sinifSahnesi = this;
      w.__THREE = THREE;
    }
  }

  /** Tip güvenli olay dinleyici; dinleyiciyi kaldıran fonksiyonu döner. */
  dinle<K extends keyof SinifSahnesiOlayHaritasi>(ad: K, fn: (detay: SinifSahnesiOlayHaritasi[K]) => void): () => void {
    const sarmal = (e: Event) => fn((e as CustomEvent<SinifSahnesiOlayHaritasi[K]>).detail);
    this.addEventListener(ad, sarmal);
    return () => this.removeEventListener(ad, sarmal);
  }

  // ---------------------------------------------------------------------------
  // Kurulum
  // ---------------------------------------------------------------------------
  async yukle(ilerleme: (oran: number) => void = () => {}, sinyal?: AbortSignal): Promise<this> {
    if (this.kapatildi || sinyal?.aborted) throw iptalHatasi();
    const iptal = new AbortController();
    const iptalEt = () => iptal.abort();
    sinyal?.addEventListener('abort', iptalEt);
    this.kapatma.signal.addEventListener('abort', iptalEt);
    const iptalSozu = iptalBeklemesi(iptal.signal);
    iptalSozu.catch(() => {});
    const bekle = async <T>(soz: Promise<T>): Promise<T> => {
      let sonuc: T;
      try {
        sonuc = await Promise.race([soz, iptalSozu]);
      } catch (hata) {
        if (sinyal?.aborted || this.kapatildi) throw iptalHatasi();
        throw hata;
      }
      if (sinyal?.aborted || this.kapatildi) throw iptalHatasi();
      return sonuc;
    };

    try {
      this.rendererKur();
      const yanit = await bekle(fetch(`${this.varliklar}data/sinif.json`, { signal: iptal.signal }));
      if (!yanit.ok) throw new Error(`Sınıf verisi alınamadı (${yanit.status})`);
      const veri = await bekle(yanit.json() as Promise<SinifVerisi>);
      if (!veri?.screen?.corners || veri.screen.corners.length !== 4 || !veri.camera?.start || !veri.model) {
        throw new Error('Sınıf verisi eksik: screen.corners / camera.start / model');
      }
      this.veri = veri;

      // GLB ve poster dokuları koşut iner; ilerleme ikisinin ağırlıklı toplamıdır
      const posterler = (veri.posters ?? []).filter(posterGecerli);
      const posterPayi = posterler.length ? POSTER_PAYI : 0;
      let glbOrani = 0;
      let posterOrani = posterler.length ? 0 : 1;
      const bildir = () => {
        if (!iptal.signal.aborted) ilerleme((glbOrani * (1 - posterPayi) + posterOrani * posterPayi) * GLB_PAYI);
      };
      const draco = new DRACOLoader().setDecoderPath(this.dracoYolu);
      const gltfSozu = new GLTFLoader().setDRACOLoader(draco).loadAsync(`${this.varliklar}${veri.model}`, (e) => {
        if (e.lengthComputable && e.total) {
          glbOrani = e.loaded / e.total;
          bildir();
        }
      });
      gltfSozu.then(
        () => draco.dispose(),
        () => draco.dispose()
      );
      const dokuSozu = this.posterDokulariniYukle(posterler, (oran) => {
        posterOrani = oran;
        bildir();
      });
      // İptalde geç gelen dokular bırakılır (GPU'ya çıkmadan)
      dokuSozu.then((dokular) => {
        if (iptal.signal.aborted) for (const d of dokular.values()) d.dispose();
      });
      const gltf = await bekle(gltfSozu);
      glbOrani = 1;
      bildir();
      const dokular = await bekle(dokuSozu);
      ilerleme(GLB_PAYI);

      this.sahneKur(veri, gltf);
      this.posterleriKur(posterler, dokular);
      this.kameraKur(veri);
      this.efektleriKur();
      this.olaylariBagla();
      this.hazir = true;
      this.boyutla();
      // Isınma: gölgelendirici programları, gölge haritası ve son işlem geçişleri burada, yükleyici
      // hâlâ görünürken derlenir/çizilir. Aksi halde ilk kare saniyelerce ana iş parçacığını
      // kilitliyor, perde açılışındaki durağan kare ve yaklaşmanın başı yutuluyordu.
      // Programlar bileşimin ara hedefine göre derlenir (hedefe çizerken ton eşleme/renk uzayı
      // kapalıdır; ekrana derlenen varyant boşa giderdi). KHR_parallel_shader_compile varsa
      // derleme ana iş parçacığını kilitlemez ve yükleyici animasyonu akmaya devam eder.
      this.renderer.setRenderTarget(this.bilesim.renderTarget2);
      // Derleme sözü saklanır: dispose() GPU kaynaklarını bu söz yerleşene kadar erteler. Aksi
      // halde three'nin compileAsync yoklama zamanlayıcısı sökülmüş program haritasına dokunup
      // yakalanmamış TypeError ('reading isReady') fırlatıyordu.
      const derleme = this.renderer.compileAsync(this.sahne, this.kamera);
      this.derleme = derleme.then(
        () => undefined,
        () => undefined
      );
      try {
        await bekle(derleme);
      } finally {
        this.derleme = null;
        this.renderer.setRenderTarget(null);
      }
      ilerleme(0.94);
      // Gölge haritası (bir kez) ve son işlem geçişlerinin programları: ilk kare yükleyici altında
      this.renderer.shadowMap.needsUpdate = true;
      this.bilesim.render(0);
      ilerleme(1);
      this.renderer.setAnimationLoop(() => this.kare());
      return this;
    } finally {
      sinyal?.removeEventListener('abort', iptalEt);
      this.kapatma.signal.removeEventListener('abort', iptalEt);
    }
  }

  private rendererKur(): void {
    const r = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', stencil: false });
    r.setPixelRatio(this.pikselOrani());
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.AgXToneMapping;
    // Blender: AgX Medium High Contrast, exposure −0.05 EV
    r.toneMappingExposure = 0.97;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.shadowMap.autoUpdate = false;
    r.domElement.setAttribute('aria-hidden', 'true');
    r.domElement.tabIndex = -1;
    r.domElement.style.display = 'block';
    r.domElement.style.width = '100%';
    r.domElement.style.height = '100%';
    this.kap.appendChild(r.domElement);
    const el = r.domElement;
    const baglamKaybi = (e: Event) => {
      e.preventDefault();
      if (this.kapatildi) return;
      this.yayinla('hata', { mesaj: 'Grafik bağlamı kaybedildi; sınıf görünümü kapatılıyor.' });
    };
    const baglamGeriGeldi = () => {
      if (this.kapatildi) return;
      this.yayinla('hata', { mesaj: 'Grafik bağlamı yeniden kuruldu; görünüm yenileniyor.', yenile: true });
    };
    el.addEventListener('webglcontextlost', baglamKaybi);
    el.addEventListener('webglcontextrestored', baglamGeriGeldi);
    this.sokuculer.push(
      () => el.removeEventListener('webglcontextlost', baglamKaybi),
      () => el.removeEventListener('webglcontextrestored', baglamGeriGeldi)
    );
    this.renderer = r;
  }

  private pikselOrani(): number {
    const dpr = window.devicePixelRatio || 1;
    return Math.min(dpr, this.kalite === 'yuksek' ? 2 : 1.5, this.pikselSiniri ?? Infinity);
  }

  private sahneKur(veri: SinifVerisi, gltf: GLTF): void {
    const sahne = (this.sahne = new THREE.Scene());
    sahne.background = new THREE.Color(0.08, 0.16, 0.18);

    this.ortamHedefi = odaOrtami(this.renderer);
    this.ortam = this.ortamHedefi.texture;

    this.ekranMerkezi.set(...veri.screen.center);
    this.ekranNormali.set(...veri.screen.normal).normalize();
    this.ekranKoseleri = veri.screen.corners.map((k) => [k[0], k[1], k[2]] as Uclu);

    this.isiklariKur(veri);

    // Malzeme uyarlamaları (malzeme başına bir kez); adaSahnesi ile aynı dil, iç mekân yansımaları daha ölçülü
    const onbellek = new Map<THREE.Material, THREE.Material>();
    const uyarla = (kaynak: THREE.Material): THREE.Material => {
      const onceki = onbellek.get(kaynak);
      if (onceki) return onceki;
      const m = kaynak as THREE.MeshStandardMaterial;
      const tur: unknown = m.userData.kind;
      let yeni = m;
      if (tur === 'glass') {
        yeni = new THREE.MeshStandardMaterial({
          name: m.name,
          side: THREE.DoubleSide,
          color: m.color.clone().multiplyScalar(0.92),
          roughness: 0.04,
          metalness: 0.1,
          transparent: true,
          opacity: 0.14,
          depthWrite: false,
          envMapIntensity: 1.0,
        });
        yeni.userData = { ...m.userData };
      } else if (tur === 'metal') {
        m.envMapIntensity = 0.9;
      } else if (tur === 'foliage') {
        m.envMapIntensity = 0.35;
      } else if (tur === 'emissive') {
        // Tavan LED panelleri (3.5) ve opal lambalar (2.5) AgX'te beyaza yakın ışır; pencere
        // dışındaki gök düzlemi (Cycles'ta düşey deniz → gök rampası) burada da gradyan olarak ışır
        if (/gökyüzü/i.test(m.name)) {
          const dis = disGorunumMalzemesi(m.name);
          onbellek.set(kaynak, dis);
          return dis;
        }
        m.emissiveIntensity = Math.min(m.emissiveIntensity, 2.4);
        m.envMapIntensity = 0.2;
      } else if (/tavan/i.test(m.name)) {
        // Asma tavan karoları tam mat: nokta ışıklar ve ortam haritası tavana speküler şerit bırakmasın
        m.roughness = 1;
        m.metalness = 0;
        m.envMapIntensity = 0.1;
      } else if (/bayrak.*kırmızı/i.test(m.name)) {
        // Bayrak kırmızısı: AgX aydınlık doygun kırmızıyı somona çeker; kumaş tam mat, albedo koyu ve
        // doygun, ortam yansıması yok — ton eşleme sonrası doygun bayrak kırmızısı okunur
        m.color.setRGB(0.42, 0.006, 0.01);
        m.roughness = 1;
        m.envMapIntensity = 0.05;
      } else {
        m.envMapIntensity = 0.45;
      }
      yeni.envMap = this.ortam;
      dolguYamasiBagla(yeni);
      onbellek.set(kaynak, yeni);
      return yeni;
    };

    const kokler = [...gltf.scene.children];
    for (const kok of kokler) {
      const grup = grupAdi(kok);
      const arkaPlan = grup.startsWith('backdrop:');
      const ekran = grup === 'board:ekran';
      kok.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        if (ekran) {
          mesh.material = this.ekranMalzemesiKur();
          mesh.castShadow = false;
          mesh.receiveShadow = false;
          mesh.userData.aoDisi = true;
          return;
        }
        const malzeme = uyarla(mesh.material as THREE.Material);
        mesh.material = malzeme;
        const cam = malzeme.userData.kind === 'glass';
        // Pencere dışındaki gök düzlemi ve camlar güneşi kesmez (Blender'da visible_shadow kapalı)
        mesh.castShadow = !cam && !arkaPlan;
        mesh.receiveShadow = !arkaPlan;
        if (cam) {
          mesh.renderOrder = 2;
          mesh.userData.aoDisi = true;
        }
        if (arkaPlan) mesh.userData.aoDisi = true;
      });
    }
    sahne.add(gltf.scene);
    gltf.scene.updateMatrixWorld(true);
  }

  /**
   * Poster dokularını (JPEG, sRGB) indirir; yüklenemeyen doku sessizce atlanır (kâğıt düzlemi
   * GLB'de fildişi zemin olarak zaten vardır). `ilerle` 0 → 1 arasında biten doku oranını verir.
   */
  private async posterDokulariniYukle(posterler: readonly SinifPosteri[], ilerle: (oran: number) => void): Promise<Map<string, THREE.Texture>> {
    const sonuc = new Map<string, THREE.Texture>();
    if (!posterler.length) {
      ilerle(1);
      return sonuc;
    }
    const yukleyici = new THREE.TextureLoader();
    const enCokAniso = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    let biten = 0;
    await Promise.all(
      posterler.map(async (p) => {
        try {
          const doku = await yukleyici.loadAsync(`${this.varliklar}${p.texture}`);
          doku.name = `Poster • ${p.id}`;
          doku.colorSpace = THREE.SRGBColorSpace;
          doku.anisotropy = enCokAniso;
          doku.generateMipmaps = true;
          doku.minFilter = THREE.LinearMipmapLinearFilter;
          doku.magFilter = THREE.LinearFilter;
          sonuc.set(p.id, doku);
        } catch {
          // doku yok / ağ hatası: poster fildişi kâğıt olarak kalır
        }
        biten += 1;
        ilerle(biten / posterler.length);
      })
    );
    return sonuc;
  }

  /**
   * Doku yüklenen her poster için köşelerden dörtgen: GLB'deki kâğıt düzleminin 3 mm önünde,
   * mat kâğıt (roughness 0.75), gölge alır, gölge düşürmez (ince levha; çerçeve zaten düşürür).
   */
  private posterleriKur(posterler: readonly SinifPosteri[], dokular: ReadonlyMap<string, THREE.Texture>): void {
    for (const p of posterler) {
      const doku = dokular.get(p.id);
      if (!doku) continue;
      const malzeme = dolguYamasiBagla(
        new THREE.MeshStandardMaterial({
          name: `Poster • ${p.id}`,
          map: doku,
          roughness: 0.75,
          metalness: 0,
          envMap: this.ortam,
          envMapIntensity: 0.2,
        })
      );
      const mesh = new THREE.Mesh(posterGeometrisi(p.corners), malzeme);
      mesh.name = `poster-doku|${p.id}`;   // GLB'deki kâğıt zemin düğümü "poster|<id>" adını taşır
      mesh.castShadow = false;
      mesh.receiveShadow = true;
      mesh.userData.group = `poster:${p.id}`;
      this.sahne.add(mesh);
      mesh.updateMatrixWorld();
    }
  }

  /** Etkileşimli tahtanın aktif yüzeyi: siyah-turkuaz cam; ışıması açılış ilerledikçe artar. */
  private ekranMalzemesiKur(): THREE.MeshStandardMaterial {
    if (this.ekranMalzemesi) return this.ekranMalzemesi;
    const m = new THREE.MeshStandardMaterial({
      name: 'Ekran • aktif yüzey',
      color: new THREE.Color(0.02, 0.05, 0.06),
      roughness: 0.3,
      metalness: 0.05,
      emissive: new THREE.Color('#0b3a45'),
      emissiveIntensity: this.parlaklik,
      envMapIntensity: 0.6,
      envMap: this.ortam,
    });
    this.ekranMalzemesi = m;
    return m;
  }

  private isiklariKur(veri: SinifVerisi): void {
    const sahne = this.sahne;
    const dunya = veri.world || { color: [0.62, 0.58, 0.52] as Uclu, strength: 0.25 };
    const gok = new THREE.Color().setRGB(...dunya.color);
    // Yarım küre: tavan kremi / zemin linolyumu; dünya gücünden ölçeklenir
    sahne.add(new THREE.HemisphereLight(gok, new THREE.Color(0.36, 0.3, 0.22), Math.PI * dunya.strength * 1.15));

    // Oda kutusu (arka plan düzlemi dışında): gölge kamerası buna sığar
    const oda = new THREE.Box3();
    for (const g of veri.groups) {
      if (g.kind === 'backdrop') continue;
      oda.expandByPoint(new THREE.Vector3(...g.bbox.min));
      oda.expandByPoint(new THREE.Vector3(...g.bbox.max));
    }
    if (oda.isEmpty()) oda.set(new THREE.Vector3(-5, -0.1, -5), new THREE.Vector3(5, 3.2, 5));
    const merkez = oda.getCenter(new THREE.Vector3());
    const yaricap = oda.getBoundingSphere(new THREE.Sphere()).radius;

    let alanIsigiVar = false;
    for (const L of veri.lights) {
      const yon = new THREE.Vector3(...L.direction).normalize();
      const renk = new THREE.Color(...L.color);
      if (L.type === 'SUN') {
        // Cycles W/m² ≈ Three.js yoğunluğu; 25° güneş yatay yüzeylere zayıf düştüğünden hafif artırılır
        const gunes = new THREE.DirectionalLight(renk, L.energy * 1.1);
        gunes.position.copy(merkez).addScaledVector(yon, -yaricap * 2.5);
        gunes.target.position.copy(merkez);
        gunes.castShadow = true;
        const boyut = this.kalite === 'yuksek' ? 4096 : 2048;
        gunes.shadow.mapSize.set(boyut, boyut);
        // GLB malzemeleri çift yüzlü: gölge haritasına iki yüz de yazılır (ince levhalar, storlar
        // ve ters normaller için sağlam); kendini gölgeleme sapması normalBias ile alınır
        gunes.shadow.bias = -0.0003;
        gunes.shadow.normalBias = 0.03;
        gunes.shadow.radius = 2;
        this.golgeKamerasiSigdir(gunes, oda);
        sahne.add(gunes, gunes.target);
      } else if (L.type === 'AREA') {
        // Pencere gök dolgusu: dikdörtgen alan ışığı (Blender W → yaklaşık radyans, W / (π·alan))
        if (!alanIsigiVar) {
          RectAreaLightUniformsLib.init();
          alanIsigiVar = true;
        }
        const kenar = L.size ?? 1;
        const alan = Math.max(0.05, kenar * kenar);
        const yogunluk = L.energy / (Math.PI * alan);
        const dolgu = new THREE.RectAreaLight(renk, Math.min(yogunluk * 0.75, 12), kenar, kenar);
        dolgu.position.set(...L.position);
        dolgu.lookAt(dolgu.position.clone().add(yon));
        sahne.add(dolgu);
      } else if (L.type === 'POINT' || L.type === 'SPOT') {
        // Ekranın turkuaz ışıması motorun kendi nokta ışığıyla verilir (ekranParlakligi)
        if (/ekran/i.test(L.name)) continue;
        // Blender W → cd yaklaşımı: P / (4π); Cycles'ın yumuşak yarıçaplı noktası yerine tavana
        // sıcak nokta bırakmasın diye ışık tavandan biraz uzaklaştırılır
        // (Cycles'ta 0,4 m yumuşak yarıçaplı 2,7 m'deki nokta; burada 2,0 m'ye indirilir: tavanın
        // 0,65 m altındaki görünmez dolgu, karolarda kaynağı olmayan parlak bir leke bırakıyordu)
        const nokta = new THREE.PointLight(renk, (L.energy / (4 * Math.PI)) * 0.9, 0, 2);
        nokta.position.set(L.position[0], Math.min(L.position[1], 2.0), L.position[2]);
        sahne.add(nokta);
      }
    }

    // Ekran ışıması: tahtanın önünde turkuaz nokta ışığı; yoğunluğu ekranParlakligi ile 0 → ~6
    const isik = new THREE.PointLight(new THREE.Color(0.35, 0.92, 0.86), 0, 4, 2);
    isik.position.copy(this.ekranMerkezi).addScaledVector(this.ekranNormali, 0.55).add(new THREE.Vector3(0, 0.25, 0));
    sahne.add(isik);
    this.ekranIsigi = isik;
    this.ekranParlakligi(this.parlaklikOrani);
  }

  /** Güneşin ortografik gölge kamerasını oda kutusunun ışık uzayındaki sınırlarına sığdırır. */
  private golgeKamerasiSigdir(gunes: THREE.DirectionalLight, oda: THREE.Box3): void {
    gunes.updateMatrixWorld();
    const bakis = new THREE.Matrix4().lookAt(gunes.position, gunes.target.position, THREE.Object3D.DEFAULT_UP);
    const ters = new THREE.Matrix4().copy(bakis).setPosition(gunes.position).invert();
    const v = new THREE.Vector3();
    let minX = Infinity;
    let minY = Infinity;
    let minZ = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let maxZ = -Infinity;
    for (let i = 0; i < 8; i++) {
      v.set(i & 1 ? oda.max.x : oda.min.x, i & 2 ? oda.max.y : oda.min.y, i & 4 ? oda.max.z : oda.min.z).applyMatrix4(ters);
      minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
      minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
      minZ = Math.min(minZ, v.z); maxZ = Math.max(maxZ, v.z);
    }
    const pay = 0.3;
    const g = gunes.shadow.camera;
    g.left = minX - pay; g.right = maxX + pay;
    g.bottom = minY - pay; g.top = maxY + pay;
    // Işık uzayında kamera −z yönüne bakar; yakın = en yakın köşe, uzak = en uzak köşe
    g.near = Math.max(0.1, -maxZ - pay);
    g.far = -minZ + pay;
    g.updateProjectionMatrix();
  }

  private kameraKur(veri: SinifVerisi): void {
    const K = veri.camera;
    const w = this.kap.clientWidth || window.innerWidth;
    const h = this.kap.clientHeight || window.innerHeight;
    const kamera = (this.kamera = new THREE.PerspectiveCamera(dikeyFov(K.lens, K.sensor, w / h), w / h, K.near, K.far));
    const bas = new THREE.Vector3(...K.start.position);
    const basHedef = new THREE.Vector3(...K.start.target);
    this.yol = yaklasmaYolu(bas, this.bitisKonumu(w, h), basHedef, this.ekranMerkezi.clone());
    this.yolIlerleme = 0;
    this.kamerayiYerlestir(0);
  }

  /** Bitiş kamerası: ekran merkezinden normal boyunca, kap boyutuna göre hesaplanan uzaklıkta. */
  private bitisKonumu(w: number, h: number): THREE.Vector3 {
    const K = this.veri.camera;
    const d = bitisUzakligi(this.veri.screen, w, h, K.lens, K.sensor);
    return this.ekranMerkezi.clone().addScaledVector(this.ekranNormali, d);
  }

  private kamerayiYerlestir(u: number): void {
    if (!this.yol) return;
    const { konum, hedef } = yaklasmaKonumu(this.yol, u);
    this.kamera.position.copy(konum);
    this.kamera.up.set(0, 1, 0);
    this.kamera.lookAt(hedef);
    this.kamera.updateMatrixWorld();
  }

  private efektleriKur(): void {
    const r = this.renderer;
    const hedef = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
    const bilesim = (this.bilesim = new EffectComposer(r, hedef));
    bilesim.addPass(new RenderPass(this.sahne, this.kamera));
    this.ao = null;
    if (this.kalite === 'yuksek') {
      const ao = new SeciciGTAOPass(this.sahne, this.kamera, 1, 1);
      ao.updateGtaoMaterial({ radius: 0.35, distanceExponent: 1.2, thickness: 0.6, scale: 1.0, samples: 16 });
      ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 4, rings: 2, samples: 16 });
      ao.blendIntensity = 0.7;
      bilesim.addPass(ao);
      this.ao = ao;
    }
    bilesim.addPass(new OutputPass());
    const renk = new ShaderPass(RenkDuzeltme);
    renk.uniforms.uDoygunluk.value = 1.12;
    renk.uniforms.uKontrast.value = 1.05;
    renk.uniforms.uVinyet.value = 0.16;
    bilesim.addPass(renk);
  }

  private olaylariBagla(): void {
    this.boyutGozlemci = new ResizeObserver(() => this.boyutla());
    this.boyutGozlemci.observe(this.kap);
    const gorunurluk = () => {
      if (!document.hidden) this.saat.getDelta();
    };
    document.addEventListener('visibilitychange', gorunurluk);
    this.sokuculer.push(() => document.removeEventListener('visibilitychange', gorunurluk));
    const dprIzle = () => {
      const sorgu = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      const degisti = () => {
        this.boyutla();
        dprIzle();
      };
      sorgu.addEventListener('change', degisti, { once: true });
      this.dprSokucu = () => sorgu.removeEventListener('change', degisti);
    };
    dprIzle();
  }

  // ---------------------------------------------------------------------------
  // Kamera ve akış
  // ---------------------------------------------------------------------------
  boyutla(): void {
    if (!this.hazir) return;
    const w = this.kap.clientWidth || window.innerWidth;
    const h = this.kap.clientHeight || window.innerHeight;
    this.renderer.setPixelRatio(this.pikselOrani());
    this.renderer.setSize(w, h, false);
    this.bilesim.setPixelRatio(this.renderer.getPixelRatio());
    this.bilesim.setSize(w, h);
    const K = this.veri.camera;
    this.kamera.aspect = w / h;
    this.kamera.fov = dikeyFov(K.lens, K.sensor, w / h);
    this.kamera.updateProjectionMatrix();
    // Bitiş kamerası her boyutta yeniden hesaplanır; varıştan sonra ekran kabı doldurmaya devam eder
    if (this.yol) this.yol.bitis.copy(this.bitisKonumu(w, h));
    this.kamerayiYerlestir(this.yolIlerleme);
    this.koseleriBildir(w, h);
  }

  /**
   * Perde açılırken 0,4 s: kamera yerinde durmaz, yaklaşmanın başlangıç hızıyla yavaşça
   * ilerler (GIRIS_KAYMA); yaklas() bu hızdan kesintisiz devam eder. Hareket azaltma
   * tercihinde kamera doğrudan bitiştedir. atla() bekleyişi hemen bitirir.
   */
  giris(): Promise<void> {
    if (!this.hazir || this.kapatildi) return Promise.resolve();
    this.olcum.aktif = true;
    if (this.azHareket) {
      this.yolIlerleme = 1;
      this.kamerayiYerlestir(1);
      this.vardi = true;
    } else if (!this.vardi) {
      const u0 = this.yolIlerleme;
      this.girisSuruklenme = { baslangic: performance.now(), sure: GIRIS_SURESI, u0, u1: Math.min(1, u0 + GIRIS_KAYMA) };
    }
    return new Promise((coz) => {
      this.girisCoz = coz;
      this.girisZamanlayici = window.setTimeout(() => {
        this.girisCoz = null;
        coz();
      }, GIRIS_SURESI);
    });
  }

  /**
   * Başlangıçtan bitişe kamera yolculuğu. Varışta true; dispose ile kesilirse false.
   * Hareket azaltma ya da sıfır süre: kamera anında bitişte.
   */
  yaklas({ sure = YAKLASMA_SURESI }: { sure?: number } = {}): Promise<boolean> {
    if (!this.hazir || this.kapatildi) return Promise.resolve(false);
    if (this.yaklasma) this.yaklasma.coz(false);
    this.girisSuruklenme = null;
    if (this.azHareket || sure <= 0 || this.vardi) {
      this.yaklasma = null;
      this.atlaBekliyor = false;
      this.yolIlerleme = 1;
      this.kamerayiYerlestir(1);
      this.vardi = true;
      this.koseleriBildir();
      return Promise.resolve(true);
    }
    // Giriş beklenirken atlandıysa kalan yol kısa sürede (≤ 380 ms) biter
    const hizli = this.atlaBekliyor;
    this.atlaBekliyor = false;
    return new Promise((coz) => {
      this.yaklasma = hizli
        ? { baslangic: performance.now(), sure: Math.max(1, ATLAMA_SURESI * (1 - this.yolIlerleme)), u0: this.yolIlerleme, egri: yumusak.cikis, coz }
        : { baslangic: performance.now(), sure, u0: this.yolIlerleme, egri: yaklasmaEgrisi, coz };
    });
  }

  /**
   * Süren yaklaşmayı kalan yoldan ≤ 380 ms'de bitirir. giris() beklenirken çağrılırsa bekleyiş
   * hemen çözülür ve sıradaki yaklas() kısa sürer (ilk tıklama boşa gitmez).
   */
  atla(): void {
    if (!this.hazir) return;
    if (this.girisCoz) {
      window.clearTimeout(this.girisZamanlayici);
      this.girisSuruklenme = null;
      this.atlaBekliyor = true;
      const coz = this.girisCoz;
      this.girisCoz = null;
      coz();
      return;
    }
    const y = this.yaklasma;
    if (!y) return;
    const kalan = 1 - this.yolIlerleme;
    if (kalan <= 0) return;
    this.yaklasma = { baslangic: performance.now(), sure: Math.max(1, ATLAMA_SURESI * kalan), u0: this.yolIlerleme, egri: yumusak.cikis, coz: y.coz };
  }

  /** Varıştan sonra ekranın eksenlere hizalı izdüşümü (kap içi px); henüz varılmadıysa null. */
  ekranDikdortgeni(): Dikdortgen | null {
    if (!this.hazir || !this.vardi) return null;
    const koseler = this.koseleriHesapla();
    return koseler ? koseKutusu(koseler) : null;
  }

  /** 0–1: ekran ışıması (emissive 0.15 → 1.4) ve önündeki turkuaz nokta ışığı (0 → ~6). */
  ekranParlakligi(oran: number): void {
    const o = THREE.MathUtils.clamp(Number.isFinite(oran) ? oran : 0, 0, 1);
    this.parlaklikOrani = o;
    this.parlaklik = THREE.MathUtils.lerp(EKRAN_ISIMA.enAz, EKRAN_ISIMA.enCok, o);
    if (this.ekranMalzemesi) this.ekranMalzemesi.emissiveIntensity = this.parlaklik;
    if (this.ekranIsigi) this.ekranIsigi.intensity = EKRAN_ISIMA.isikEnCok * o * o;
  }

  private koseleriHesapla(w = this.kap.clientWidth || window.innerWidth, h = this.kap.clientHeight || window.innerHeight): Kose[] | null {
    return koseIzdusumu(this.ekranKoseleri, this.kamera, w, h);
  }

  private koseleriBildir(w?: number, h?: number): void {
    if (!this.onEkran || !this.hazir) return;
    const koseler = this.koseleriHesapla(w, h);
    this.onEkran(koseler);
  }

  // ---------------------------------------------------------------------------
  // Döngü
  // ---------------------------------------------------------------------------
  private kare(): void {
    if (!this.hazir) return;
    const dt = Math.min(this.saat.getDelta(), 0.1);
    const simdi = performance.now();

    const y = this.yaklasma;
    if (y) {
      const t = Math.min(1, (simdi - y.baslangic) / y.sure);
      this.yolIlerleme = y.u0 + (1 - y.u0) * y.egri(t);
      this.kamerayiYerlestir(this.yolIlerleme);
      if (t >= 1) {
        this.yaklasma = null;
        this.vardi = true;
        this.yolIlerleme = 1;
        this.kamerayiYerlestir(1);
        this.koseleriBildir();
        y.coz(true);
      }
    } else if (this.girisSuruklenme) {
      const g = this.girisSuruklenme;
      const t = Math.min(1, (simdi - g.baslangic) / g.sure);
      this.yolIlerleme = THREE.MathUtils.lerp(g.u0, g.u1, t);
      this.kamerayiYerlestir(this.yolIlerleme);
      if (t >= 1) this.girisSuruklenme = null;
    } else {
      this.kamera.updateMatrixWorld();
    }

    this.koseleriBildir();
    this.bilesim.render(dt);
    this.performansOlc(dt);
  }

  private performansOlc(dt: number): void {
    const o = this.olcum;
    if (!o.aktif || o.bitti) return;
    o.kare += 1;
    o.toplam += dt;
    if (o.kare < 90) return;
    const ort = o.toplam / o.kare;
    o.kare = 0;
    o.toplam = 0;
    if (ort > 1 / 38 && this.ao) {
      this.ao.enabled = false;
      this.ao = null;
      return;
    }
    const oran = this.renderer.getPixelRatio();
    if (ort > 1 / 28 && oran > 1) {
      this.pikselSiniri = Math.max(1, oran - 0.5);
      this.boyutla();
      if (this.renderer.getPixelRatio() < oran) return;
    }
    o.bitti = true;
  }

  private yayinla<K extends keyof SinifSahnesiOlayHaritasi>(ad: K, detay: SinifSahnesiOlayHaritasi[K]): void {
    this.dispatchEvent(new CustomEvent(ad, { detail: detay }));
  }

  // ---------------------------------------------------------------------------
  // Kapatma
  // ---------------------------------------------------------------------------
  /** Döngüyü durdurur, dinleyicileri söker ve tüm GPU kaynaklarını bırakır. Tekrar çağrılabilir. */
  dispose(): void {
    if (this.kapatildi) return;
    this.kapatildi = true;
    this.hazir = false;
    this.kapatma.abort();

    const renderer = this.renderer as THREE.WebGLRenderer | undefined;
    const sahne = this.sahne as THREE.Scene | undefined;
    const bilesim = this.bilesim as EffectComposer | undefined;

    renderer?.setAnimationLoop(null);
    this.boyutGozlemci?.disconnect();
    this.boyutGozlemci = null;
    for (const sok of this.sokuculer.splice(0)) sok();
    this.dprSokucu?.();
    this.dprSokucu = null;
    window.clearTimeout(this.girisZamanlayici);
    this.girisSuruklenme = null;
    this.girisCoz?.();
    this.girisCoz = null;
    const y = this.yaklasma;
    this.yaklasma = null;
    y?.coz(false);

    // GPU sökümü: yükleme sırasındaki compileAsync hâlâ sürüyorsa söz yerleşene kadar ertelenir
    // (three'nin yoklama zamanlayıcısı sökülmüş program haritasına dokunmasın); döngü ve
    // dinleyiciler yukarıda hemen durduruldu.
    const gpuSok = () => {
      if (bilesim) {
        for (const gecis of bilesim.passes) gecis.dispose();
        bilesim.renderTarget1.dispose();
        bilesim.renderTarget2.dispose();
        bilesim.copyPass.dispose();
      }
      this.ao = null;

      if (sahne) {
        const geometriler = new Set<THREE.BufferGeometry>();
        const malzemeler = new Set<THREE.Material>();
        sahne.traverse((o) => {
          const mesh = o as THREE.Mesh;
          if (!mesh.isMesh) return;
          geometriler.add(mesh.geometry);
          for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) malzemeler.add(m);
        });
        const dokular = new Set<THREE.Texture>();
        for (const m of malzemeler) {
          for (const deger of Object.values(m) as unknown[]) {
            if (deger instanceof THREE.Texture && deger !== this.ortam) dokular.add(deger);
          }
          m.dispose();
        }
        for (const g of geometriler) g.dispose();
        for (const d of dokular) d.dispose();
        sahne.traverse((o) => {
          const isik = o as THREE.Light;
          if (isik.isLight && isik.shadow?.map) isik.shadow.map.dispose();
        });
        sahne.clear();
      }
      this.ortamHedefi?.dispose();
      this.ortamHedefi = null;
      this.ortam = null;
      this.ekranMalzemesi = null;
      this.ekranIsigi = null;

      if (renderer) {
        renderer.dispose();
        renderer.forceContextLoss();
        renderer.domElement.remove();
      }
    };
    const derleme = this.derleme;
    this.derleme = null;
    if (derleme) derleme.then(gpuSok, gpuSok);
    else gpuSok();
  }
}

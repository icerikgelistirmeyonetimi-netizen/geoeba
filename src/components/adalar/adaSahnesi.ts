/**
 * Matematik Takımadaları — Three.js sahne motoru.
 *
 * Blender'dan web_aktar.py ile üretilen GLB + JSON verisini yükler; ortografik
 * Blender kamerasını, güneş/alan ışıklarını ve pişirilmiş deniz rengini yeniden
 * kurar. Tıklanabilir gruplar (ana sayfada adalar, alt sayfalarda sınıf binaları)
 * için vurgulama, etiket konumlandırma ve kamera odaklama sağlar.
 *
 * React giriş ekranı (AdaEkrani) sürümü: modül yüklenirken DOM'a ve global
 * THREE.ShaderChunk'a dokunmaz; yükleme iptal edilebilir, dispose() her şeyi söker.
 */
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// ---------------------------------------------------------------------------
// Tipler
// ---------------------------------------------------------------------------
export type Uclu = [number, number, number];

export type AdaSayfasi = 'ana-sayfa' | 'ilkokul' | 'ortaokul' | 'lise';

export type SahneGrubuTuru = 'stage' | 'grade' | 'landmark' | 'float' | 'iz' | 'static';

export type SecilebilirTuru = 'stage' | 'grade' | 'landmark';

/** web_aktar.py JSON'undaki `groups` öğesi. */
export interface SahneGrubu {
  key: string;
  node: string;
  kind: SahneGrubuTuru;
  id: string;
  bbox: { min: Uclu; max: Uclu };
  triangles: number;
  label?: string;
  short?: string;
  /** Adanın sınıf aralığı, ör. "1–4. sınıf" */
  range?: string;
  /** Etiket çapası (dünya koordinatı) */
  anchor?: Uclu;
  /** Halka ve kadraj için yatay merkez */
  center?: Uclu;
  /** Fener lambası; dönen huzme buradan çıkar */
  lamp?: Uclu;
  /** Ada ya da fener tabelasındaki yazı (3B modelin içinde; ör. "İLKOKUL", "UYGULAMALAR") */
  tabela?: string;
  /** Sınıf binası: 1–12 ya da 'hazirlik' */
  grade?: number | string;
  description?: string;
  /** Yüzen nesnenin Blender pivotu */
  pivot?: Uclu;
  halfLength?: number;
  /** Yelkenlinin burun yönü (x, z) */
  heading?: [number, number];
  /** Yelkenlinin iz grubunun anahtarı */
  wake?: string;
}

export interface SahneIsigi {
  name: string;
  type: 'SUN' | 'AREA' | 'POINT' | 'SPOT';
  energy: number;
  color: Uclu;
  position: Uclu;
  direction: Uclu;
  size?: number | null;
  angle?: number | null;
}

export interface SahneMalzemesi {
  base: Uclu;
  metallic: number;
  roughness: number;
  alpha: number;
  transmission: number;
  emission: Uclu;
  emission_strength: number;
  kind: 'solid' | 'foliage' | 'water' | 'metal' | 'glass' | 'emissive';
}

export interface SahneOkyanusu {
  texture: string;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  level: number;
  edgeColorSRGB: Uclu;
  sourceMaterial: string;
}

/** assets/data/<sayfa>.json */
export interface SahneVerisi {
  page: AdaSayfasi;
  source?: string;
  units?: string;
  viewTransform?: [string, string, number];
  camera: {
    type: 'ORTHO' | 'PERSP' | 'PANO';
    position: Uclu;
    target: Uclu;
    up: Uclu;
    orthoScale: number;
    lens: number;
    sensor: number;
    renderAspect: number;
  };
  lights: SahneIsigi[];
  world: { color: Uclu; strength: number } | null;
  ocean: SahneOkyanusu;
  model: string;
  groups: SahneGrubu[];
  materials: Record<string, SahneMalzemesi>;
  triangles: number;
}

export interface ArayuzBosluklari {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface AdaSahnesiSecenekleri {
  sayfa: AdaSayfasi;
  /** Varlık kökü (mutlak önek, '/' ile biter), ör. '/geoeba/adalar/' */
  varliklar: string;
  /** Draco çözücü klasörü ('/' ile biter) */
  dracoYolu: string;
  renkler: Record<string, string>;
  bosluklar?: () => ArayuzBosluklari;
  /** Vurgulu etiketin sınıfı; CSS modülü karma adı verilebilir. Varsayılan 'etiket--aktif' */
  etiketAktifSinifi?: string;
}

export interface OdaklanSecenekleri {
  sure?: number;
  yakinlik?: number;
  /** Nesnenin ekran merkezinden kaydırılacağı piksel (ör. sağdaki panel için x: -190). */
  kaymaPx?: { x: number; y: number };
}

/** Işınımı vurguyla değiştirilebilen malzeme (GLB'den standart/fiziksel malzeme). */
type IsiyanMalzeme = THREE.Material & { emissive?: THREE.Color };

export interface Secilebilir {
  anahtar: string;
  id: string | number;
  tur: SecilebilirTuru;
  giris: SahneGrubu;
  kok: THREE.Object3D;
  /** Görünmez seçim hacmi */
  vekil: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  halka: THREE.Group;
  cizgi: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  hale: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  malzemeler: { m: IsiyanMalzeme; taban: THREE.Color | null }[];
  vurguRenk: THREE.Color;
  capa: THREE.Vector3;
  odak: THREE.Vector3;
  boyut: THREE.Vector3;
  /** Yumuşatılmış vurgu düzeyi (0–1) */
  h: number;
  hSon?: number;
  nabiz: number;
}

export type AdaSahnesiOlayHaritasi = {
  sec: { giris: Secilebilir; kaynak: 'sahne' };
  bosluk: { giris: null; kaynak: 'sahne' };
  uzerinde: { giris: Secilebilir | null };
  etkilesim: Record<string, never>;
  hata: { mesaj: string; yenile?: boolean };
};

export type Kalite = 'dusuk' | 'yuksek';

interface KameraDurumu {
  hedef: THREE.Vector3;
  theta: number;
  phi: number;
  zoom: number;
}

interface Animasyon {
  etiket: string;
  baslangic: number;
  sure: number;
  adim: (t: number) => void;
  bitti?: (iptal: boolean) => void;
}

interface Rota {
  a: number;
  b: number;
  taraf: number;
  mx: number;
  mz: number;
  f: THREE.Vector2;
  n: THREE.Vector2;
  q: number;
}

interface Yuzen {
  nesne: THREE.Object3D;
  iz: THREE.Object3D | null;
  izY: number;
  y: number;
  x0: number;
  z0: number;
  faz: number;
  yon: THREE.Vector2 | null;
  yariBoy: number;
  rota?: Rota;
}

/** OrbitControls r170 özel alanları (tip tanımında yok). */
type OzelKontrolAlanlari = { _sphericalDelta?: THREE.Spherical; _panOffset?: THREE.Vector3 };

type BellekBilgiliGezgin = Navigator & { deviceMemory?: number };

// ---------------------------------------------------------------------------
// Gölgelendiriciler ve yardımcılar
// ---------------------------------------------------------------------------

/** AgX sonrası hafif doygunluk/kontrast ve kenar kararması (Blender "Medium High Contrast" görünümüne yakın). */
export const RenkDuzeltme = {
  uniforms: {
    tDiffuse: { value: null },
    uDoygunluk: { value: 1.2 },
    uKontrast: { value: 1.07 },
    uVinyet: { value: 0.22 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uDoygunluk, uKontrast, uVinyet;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
      c.rgb = mix(vec3(l), c.rgb, uDoygunluk);
      c.rgb = (c.rgb - 0.5) * uKontrast + 0.5;
      vec2 d = vUv - 0.5;
      c.rgb *= 1.0 - uVinyet * smoothstep(0.35, 0.85, length(d * vec2(1.0, 0.8)) * 1.25);
      gl_FragColor = vec4(clamp(c.rgb, 0.0, 1.0), c.a);
    }`,
};

/*
 * Blender'daki alan ışıkları sınırlı boyutludur; parlamaları yüzeyde küçük bir lekedir.
 * Web'de onları sonsuz uzaktaki yönlü ışıkla taklit edince yansıma bütün denize ve
 * düz çatılara yayılıyordu. Gölge düşüren ilk yönlü ışık (güneş) dışındaki dolgu
 * ışıkları yalnız dağınık aydınlatma verir. Three.js gölgeli ışıkları diziye önce koyar.
 *
 * Global ShaderChunk değiştirilmez (uygulamadaki diğer three sahneleri etkilenmesin);
 * yamalı parça yalnız bu motorun malzemelerine onBeforeCompile ile verilir.
 */
const DOLGU_DESENI =
  /(getDirectionalLightInfo\( directionalLight, directLight \);[\s\S]*?)RE_Direct\( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight \);/;

/**
 * lights_fragment_begin parçasına dolgu yamasını uygular (saf fonksiyon).
 * Desen eşleşmezse parça değişmeden döner. Yama zaten uygulanmışsa (dolguMalzeme
 * tanımı varsa) yeniden uygulanmaz; yani art arda çağırmak sonucu değiştirmez.
 */
export function dolguIsigiYamasi(chunk: string): string {
  if (chunk.includes('PhysicalMaterial dolguMalzeme')) return chunk;
  return chunk.replace(
    DOLGU_DESENI,
    `$1{
			PhysicalMaterial dolguMalzeme = material;
			if ( UNROLLED_LOOP_INDEX > 0 ) {
				dolguMalzeme.specularColor = vec3( 0.0 );
				dolguMalzeme.specularF90 = 0.0;
			}
			RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, dolguMalzeme, reflectedLight );
		}`
  );
}

/** Modül yüklenirken bir kez hesaplanır; global parça yalnız okunur. */
const YAMALI_ISIK_PARCASI = dolguIsigiYamasi(THREE.ShaderChunk.lights_fragment_begin);
const ADA_PROGRAM_ANAHTARI = 'geoeba-ada-dolgu-v1';
const DENIZ_PROGRAM_ANAHTARI = 'geoeba-deniz-v4';

function isikParcasiniYamala(shader: { fragmentShader: string }): void {
  // Fonksiyonla değiştirme: parçadaki olası '$' dizileri yer tutucu sayılmasın
  shader.fragmentShader = shader.fragmentShader.replace('#include <lights_fragment_begin>', () => YAMALI_ISIK_PARCASI);
}

/** Standart/fiziksel malzemeye dolgu yamasını bağlar. clone() onBeforeCompile'ı kopyalamaz; kopyalara yeniden uygulanır. */
export function dolguYamasiBagla<T extends THREE.Material>(m: T): T {
  if (!(m as THREE.Material & { isMeshStandardMaterial?: boolean }).isMeshStandardMaterial) return m;
  m.onBeforeCompile = (shader) => isikParcasiniYamala(shader);
  m.customProgramCacheKey = () => ADA_PROGRAM_ANAHTARI;
  return m;
}

export function iptalHatasi(): DOMException {
  return new DOMException('Yükleme iptal edildi', 'AbortError');
}

/** Sinyal iptal edilince AbortError ile reddedilen söz; yüklemeyi yarışta erken keser. */
export function iptalBeklemesi(sinyal: AbortSignal): Promise<never> {
  return new Promise((_, reddet) => {
    if (sinyal.aborted) reddet(iptalHatasi());
    else sinyal.addEventListener('abort', () => reddet(iptalHatasi()), { once: true });
  });
}

export const yumusak = {
  cikis: (t: number) => 1 - Math.pow(1 - t, 3),
  gecis: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
};

/** Cam ve vurgu halkaları ortam kapatmasına (AO) katılmaz. */
export class SeciciGTAOPass extends GTAOPass {
  override overrideVisibility(): void {
    super.overrideVisibility();
    this.scene.traverse((o) => {
      if (o.userData.aoDisi) o.visible = false;
    });
  }
}

export function grupAdi(o: THREE.Object3D): string {
  const grup: unknown = o.userData.group;
  return typeof grup === 'string' ? grup : '';
}

export function kaliteSec(): Kalite {
  const istek = new URLSearchParams(window.location.search).get('kalite');
  if (istek === 'dusuk' || istek === 'yuksek') return istek;
  const dokunmatik = window.matchMedia('(pointer: coarse)').matches;
  const bellek = (navigator as BellekBilgiliGezgin).deviceMemory || 8;
  const cekirdek = navigator.hardwareConcurrency || 8;
  return dokunmatik || bellek <= 4 || cekirdek <= 4 ? 'dusuk' : 'yuksek';
}

/**
 * Gökyüzü ortam haritası: ufuktan zenite açık turkuaz→mavi geçiş ve yumuşak güneş
 * parıltısı. Metal, cam ve su yansımaları için; RoomEnvironment'ın beyaz iç mekân
 * ışığı denizi fazla açıyordu. Dokusu `.texture` alanındadır; hedef dispose ile bırakılır.
 */
export function gokOrtami(renderer: THREE.WebGLRenderer, gunesYonu: THREE.Vector3): THREE.WebGLRenderTarget {
  const sahne = new THREE.Scene();
  const malzeme = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uZenit: { value: new THREE.Color(0.18, 0.36, 0.55) },
      uUfuk: { value: new THREE.Color(0.62, 0.78, 0.8) },
      uZemin: { value: new THREE.Color(0.05, 0.19, 0.21) },
      uGunes: { value: gunesYonu.clone().negate().normalize() },
    },
    vertexShader: /* glsl */ `
      varying vec3 vYon;
      void main() {
        vYon = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uZenit, uUfuk, uZemin, uGunes;
      varying vec3 vYon;
      void main() {
        vec3 d = normalize(vYon);
        vec3 c = d.y > 0.0 ? mix(uUfuk, uZenit, pow(d.y, 0.55)) : mix(uUfuk, uZemin, pow(-d.y, 0.35));
        float g = max(dot(d, uGunes), 0.0);
        c += vec3(1.0, 0.92, 0.8) * pow(g, 12.0) * 0.25;
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const kure = new THREE.SphereGeometry(10, 64, 32);
  sahne.add(new THREE.Mesh(kure, malzeme));
  const pmrem = new THREE.PMREMGenerator(renderer);
  const hedef = pmrem.fromScene(sahne, 0);
  pmrem.dispose();
  malzeme.dispose();
  kure.dispose();
  return hedef;
}

/**
 * Deniz fenerinin dönen ışık huzmesi: lambadan açılan, uca doğru sönen, kenarları yumuşak
 * iki koni. Eklemeli karışım; gündüz sahnesinde hafif bir ışık demeti olarak görünür.
 */
function fenerHuzmesi(lamba: Uclu): THREE.Group {
  const boy = 18;
  const yaricap = 2.4;
  const geo = new THREE.ConeGeometry(yaricap, boy, 48, 1, true);
  geo.translate(0, -boy / 2, 0); // tepe lambada
  geo.rotateZ(Math.PI / 2); // koni +x yönünde açılır
  const malzeme = new THREE.ShaderMaterial({
    uniforms: {
      uRenk: { value: new THREE.Color(1.0, 0.84, 0.55) },
      uGuc: { value: 0.5 },
      uBoy: { value: boy },
    },
    vertexShader: /* glsl */ `
      varying vec3 vYerel;
      varying vec3 vNormal;
      varying vec3 vGoz;
      void main() {
        vYerel = position;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vGoz = -mv.xyz;
        vNormal = normalMatrix * normal;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uRenk;
      uniform float uGuc;
      uniform float uBoy;
      varying vec3 vYerel;
      varying vec3 vNormal;
      varying vec3 vGoz;
      void main() {
        float t = clamp(vYerel.x / uBoy, 0.0, 1.0);
        float boyunca = pow(1.0 - t, 1.8) * smoothstep(0.0, 0.04, t);
        vec3 goz = isOrthographic ? vec3(0.0, 0.0, 1.0) : normalize(vGoz);
        float kenar = pow(abs(dot(normalize(vNormal), goz)), 1.3);
        gl_FragColor = vec4(uRenk * boyunca * kenar * uGuc, 1.0);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const donen = new THREE.Group();
  const egim = new THREE.Group();
  egim.rotation.z = -0.07; // huzme ufka doğru hafif aşağı bakar
  // Karşılıklı iki huzme
  for (const aci of [0, Math.PI]) {
    const koni = new THREE.Mesh(geo, malzeme);
    koni.renderOrder = 4;
    koni.userData.aoDisi = true;
    const kol = new THREE.Group();
    kol.rotation.y = aci;
    kol.add(koni);
    egim.add(kol);
  }
  donen.add(egim);
  donen.position.set(...lamba);
  return donen;
}

/** Kıyıya olan mesafe alanı: sabit geometriden (su üstündeki kara, köprü) hücre biriminde uzaklık. */
interface KiyiAlani {
  kutu: THREE.Box3;
  hucre: number;
  nx: number;
  nz: number;
  /** Hücre biriminde en yakın karaya uzaklık. */
  mesafe: Float32Array;
}

const SU_GURULTUSU = /* glsl */ `
  float suHash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  float suGurultu(vec2 p) {
    vec2 i = floor(p); vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(suHash(i), suHash(i + vec2(1.0, 0.0)), u.x),
               mix(suHash(i + vec2(0.0, 1.0)), suHash(i + vec2(1.0, 1.0)), u.x), u.y);
  }`;

/**
 * Deniz: Blender'da pişirilmiş kıyı→açık renk dokusu (düz, kamera açısından bağımsız),
 * üstünde prosedürel dalga normali ve sığ bölgelerde hareketli ışık desenleri.
 */
function dalgaMalzemesi(doku: THREE.Texture, okyanus: SahneOkyanusu, zaman: { value: number }): THREE.MeshStandardMaterial {
  const malzeme = new THREE.MeshStandardMaterial({
    map: doku,
    roughness: 0.32,
    metalness: 0.0,
    envMapIntensity: 0.6,
  });
  const sinir = new THREE.Vector4(okyanus.minX, okyanus.minY, okyanus.maxX, okyanus.maxY);
  const kenar = new THREE.Color().setRGB(...okyanus.edgeColorSRGB, THREE.SRGBColorSpace);
  malzeme.onBeforeCompile = (shader) => {
    shader.uniforms.uZaman = zaman;
    shader.uniforms.uSinir = { value: sinir };
    shader.uniforms.uKenarRenk = { value: new THREE.Vector3(kenar.r, kenar.g, kenar.b) };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vSuKonum;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvSuKonum = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        /* glsl */ `#include <common>
        uniform float uZaman;
        uniform vec4 uSinir;
        uniform vec3 uKenarRenk;
        varying vec3 vSuKonum;
        ${SU_GURULTUSU}
        float suYukseklik(vec2 p, float t) {
          float h = 0.0;
          h += sin(dot(p, vec2(0.62, 0.38)) * 0.9 + t * 0.7) * 0.5;
          h += sin(dot(p, vec2(-0.41, 0.73)) * 1.3 - t * 0.85) * 0.3;
          h += sin(dot(p, vec2(0.93, -0.21)) * 2.1 + t * 1.1) * 0.14;
          h += (suGurultu(p * 0.8 + vec2(t * 0.22, -t * 0.15)) - 0.5) * 0.6;
          h += (suGurultu(p * 1.9 - vec2(t * 0.3, t * 0.26)) - 0.5) * 0.22;
          return h;
        }
        vec2 suUv() {
          return vec2((vSuKonum.x - uSinir.x) / (uSinir.z - uSinir.x),
                      (-vSuKonum.z - uSinir.y) / (uSinir.w - uSinir.y));
        }`
      )
      .replace(
        '#include <map_fragment>',
        /* glsl */ `
        vec4 suRengi = texture2D(map, clamp(suUv(), 0.0, 1.0));
        diffuseColor *= suRengi;
        float siglik = clamp((suRengi.g - uKenarRenk.g) / 0.18, 0.0, 1.0);`
      )
      .replace(
        '#include <normal_fragment_maps>',
        /* glsl */ `#include <normal_fragment_maps>
        {
          vec2 p = vSuKonum.xz;
          float e = 0.12;
          float h0 = suYukseklik(p, uZaman);
          float hx = suYukseklik(p + vec2(e, 0.0), uZaman);
          float hz = suYukseklik(p + vec2(0.0, e), uZaman);
          float genlik = 0.028;
          vec3 dunyaNormal = normalize(vec3(-(hx - h0) / e * genlik, 1.0, -(hz - h0) / e * genlik));
          normal = normalize((viewMatrix * vec4(dunyaNormal, 0.0)).xyz);
        }`
      )
      .replace(
        '#include <emissivemap_fragment>',
        /* glsl */ `#include <emissivemap_fragment>
        {
          vec2 q = vSuKonum.xz * 1.35;
          float t = uZaman * 0.55;
          float c = sin(q.x * 1.7 + sin(q.y * 1.3 + t) * 1.4) * sin(q.y * 1.9 + sin(q.x * 1.1 - t) * 1.6);
          float isik = pow(abs(c), 7.0);
          totalEmissiveRadiance += vec3(0.55, 0.85, 0.8) * isik * siglik * 0.09;
        }`
      );
    isikParcasiniYamala(shader);
  };
  malzeme.customProgramCacheKey = () => DENIZ_PROGRAM_ANAHTARI;
  return malzeme;
}

// ---------------------------------------------------------------------------
// Sahne motoru
// ---------------------------------------------------------------------------
export class AdaSahnesi extends EventTarget {
  private readonly kap: HTMLElement;
  private readonly sayfa: AdaSayfasi;
  private readonly varliklar: string;
  private readonly dracoYolu: string;
  private readonly renkler: Record<string, string>;
  private readonly bosluklar: () => ArayuzBosluklari;
  private readonly etiketAktifSinifi: string;
  private readonly azHareket: boolean;
  private readonly kalite: Kalite;
  private readonly zaman = { value: 0 };
  private readonly saat = new THREE.Clock();
  private animasyonlar: Animasyon[] = [];
  private readonly secilebilirler: Secilebilir[] = [];
  private readonly yuzenler: Yuzen[] = [];
  private readonly etiketler = new Map<Secilebilir, HTMLElement>();
  private fareUzerinde: Secilebilir | null = null;
  private disVurgu: Secilebilir | null = null;
  private kilitli: Secilebilir | null = null;
  // Kullanıcı kamera kontrolü açılış animasyonu bitince izinli olur; geçişler bitince bu değere döner
  private kontrolIzni = false;
  private pikselSiniri: number | null = null;
  private sonEtkilesim = performance.now();
  private readonly olcum = { kare: 0, toplam: 0, aktif: false, bitti: false };
  private birimPiksel = 0;
  private secimGerekli = false;

  // Yaşam döngüsü: yukle() bitince hazır; dispose() sonrası kalıcı olarak kapalı
  private hazir = false;
  private kapatildi = false;
  private readonly kapatma = new AbortController();
  /** Eklenen DOM dinleyicilerini söken fonksiyonlar */
  private readonly sokuculer: (() => void)[] = [];
  private dprSokucu: (() => void) | null = null;
  private readonly zamanlayicilar: number[] = [];
  private boyutGozlemci: ResizeObserver | null = null;

  // yukle() sırasında kurulanlar (hazir === true iken tanımlı)
  private renderer!: THREE.WebGLRenderer;
  private veri!: SahneVerisi;
  private sahne!: THREE.Scene;
  private kamera!: THREE.OrthographicCamera;
  private kontrol!: OrbitControls;
  private bilesim!: EffectComposer;
  private isin!: THREE.Raycaster;
  private imlec!: THREE.Vector2;
  private icerikKutusu!: THREE.Box3;
  private icerikNoktalari!: Float32Array;
  private icerikMerkezi!: THREE.Vector3;
  private tabanKure!: THREE.Spherical;
  private ortamHedefi: THREE.WebGLRenderTarget | null = null;
  private ortam: THREE.Texture | null = null;
  private denizDokusu: THREE.Texture | null = null;
  private huzme: THREE.Group | null = null;
  private ao: SeciciGTAOPass | null = null;

  constructor(kap: HTMLElement, secenek: AdaSahnesiSecenekleri) {
    super();
    this.kap = kap;
    this.sayfa = secenek.sayfa;
    this.varliklar = secenek.varliklar;
    this.dracoYolu = secenek.dracoYolu;
    this.renkler = secenek.renkler || {};
    this.bosluklar = secenek.bosluklar || (() => ({ top: 0, bottom: 0, left: 0, right: 0 }));
    this.etiketAktifSinifi = secenek.etiketAktifSinifi || 'etiket--aktif';
    this.azHareket = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.kalite = kaliteSec();
  }

  /** Kullanıcı kamera kontrolüne izin var mı (açılış animasyonu başlayınca true). */
  get kontrolIzinli(): boolean {
    return this.kontrolIzni;
  }

  /** Sahnedeki seçilebilir adalar, sınıf binaları ve fener. */
  get secilebilir(): readonly Secilebilir[] {
    return this.secilebilirler;
  }

  /** Tip güvenli olay dinleyici; dinleyiciyi kaldıran fonksiyonu döner. */
  dinle<K extends keyof AdaSahnesiOlayHaritasi>(ad: K, fn: (detay: AdaSahnesiOlayHaritasi[K]) => void): () => void {
    const sarmal = (e: Event) => fn((e as CustomEvent<AdaSahnesiOlayHaritasi[K]>).detail);
    this.addEventListener(ad, sarmal);
    return () => this.removeEventListener(ad, sarmal);
  }

  // ---------------------------------------------------------------------------
  // Kurulum
  // ---------------------------------------------------------------------------
  async yukle(ilerleme: (oran: number) => void = () => {}, sinyal?: AbortSignal): Promise<this> {
    if (this.kapatildi || sinyal?.aborted) throw iptalHatasi();
    // Dış sinyal ya da dispose() yüklemeyi keser; fetch de aynı sinyalle durur
    const iptal = new AbortController();
    const iptalEt = () => iptal.abort();
    sinyal?.addEventListener('abort', iptalEt);
    this.kapatma.signal.addEventListener('abort', iptalEt);
    const iptalSozu = iptalBeklemesi(iptal.signal);
    iptalSozu.catch(() => {});
    // Her beklemeden sonra iptal denetlenir; iptalde hata her zaman AbortError olur
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
      const yanit = await bekle(fetch(`${this.varliklar}data/${this.sayfa}.json`, { signal: iptal.signal }));
      if (!yanit.ok) throw new Error(`Sahne verisi alınamadı (${yanit.status})`);
      const veri = await bekle(yanit.json() as Promise<SahneVerisi>);
      this.veri = veri;

      const draco = new DRACOLoader().setDecoderPath(this.dracoYolu);
      const gltfSozu = new GLTFLoader().setDRACOLoader(draco).loadAsync(`${this.varliklar}${veri.model}`, (e) => {
        if (!iptal.signal.aborted && e.lengthComputable && e.total) ilerleme(e.loaded / e.total);
      });
      // GLTFLoader indirmeyi iptal edemez; Draco işçileri ayrıştırma sırasında açılır. Çözücü bu
      // yüzden yükleme iptal edilse de GLB sözü sonuçlandıktan sonra kapatılır.
      gltfSozu.then(
        () => draco.dispose(),
        () => draco.dispose()
      );
      const [gltf, denizDokusu] = await bekle(
        Promise.all([gltfSozu, new THREE.TextureLoader().loadAsync(`${this.varliklar}${veri.ocean.texture}`)])
      );
      denizDokusu.colorSpace = THREE.SRGBColorSpace;
      denizDokusu.wrapS = denizDokusu.wrapT = THREE.ClampToEdgeWrapping;
      denizDokusu.anisotropy = 4;
      this.denizDokusu = denizDokusu;

      this.sahneKur(veri, gltf, denizDokusu);
      this.kameraKur(veri);
      this.efektleriKur();
      this.olaylariBagla();
      this.hazir = true;
      this.boyutla();
      this.renderer.shadowMap.needsUpdate = true;
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
    r.toneMappingExposure = 1.08;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.shadowMap.autoUpdate = false;
    r.domElement.setAttribute('aria-hidden', 'true');
    r.domElement.tabIndex = -1;
    this.kap.appendChild(r.domElement);
    const el = r.domElement;
    const baglamKaybi = (e: Event) => {
      e.preventDefault();
      if (this.kapatildi) return;
      this.yayinla('hata', { mesaj: 'Grafik bağlamı kaybedildi; yeniden kurulması bekleniyor…' });
    };
    // Gölge haritası ve PMREM ortamı bağlamla birlikte kaybolur; en güvenli yol görünümü baştan kurmak (bileşen yeniler)
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

  private sahneKur(veri: SahneVerisi, gltf: GLTF, denizDokusu: THREE.Texture): void {
    const sahne = (this.sahne = new THREE.Scene());
    const derin = new THREE.Color().setRGB(...veri.ocean.edgeColorSRGB, THREE.SRGBColorSpace);
    sahne.background = derin;

    const gunesVerisi = veri.lights.find((l) => l.type === 'SUN');
    const yedekYon: Uclu = [0.5, -0.8, -0.3];
    const gunesYonu = new THREE.Vector3(...(gunesVerisi ? gunesVerisi.direction : yedekYon));
    this.ortamHedefi = gokOrtami(this.renderer, gunesYonu);
    this.ortam = this.ortamHedefi.texture;

    this.isiklariKur(veri);

    // Malzeme uyarlamaları (malzeme başına bir kez)
    const onbellek = new Map<THREE.Material, THREE.Material>();
    const uyarla = (kaynak: THREE.Material): THREE.Material => {
      const onceki = onbellek.get(kaynak);
      if (onceki) return onceki;
      // GLB malzemeleri standart/fiziksel; alanlar bunlar için anlamlı
      const m = kaynak as THREE.MeshStandardMaterial;
      const tur: unknown = m.userData.kind;
      let yeni = m;
      if (tur === 'glass') {
        yeni = new THREE.MeshStandardMaterial({
          name: m.name,
          side: m.side,
          color: m.color.clone().multiplyScalar(0.9),
          roughness: 0.05,
          metalness: 0.15,
          transparent: true,
          opacity: 0.5,
          depthWrite: false,
          envMapIntensity: 1.6,
        });
        yeni.userData = { ...m.userData };
      } else if (tur === 'water') {
        m.roughness = 0.08;
        m.envMapIntensity = 1.1;
      } else if (tur === 'metal') {
        m.envMapIntensity = 1.35;
      } else if (tur === 'foliage') {
        m.envMapIntensity = 0.45;
      } else if (tur === 'emissive') {
        m.emissiveIntensity = Math.min(m.emissiveIntensity, 1.6);
      } else {
        m.envMapIntensity = 0.7;
      }
      yeni.envMap = this.ortam;
      dolguYamasiBagla(yeni);
      onbellek.set(kaynak, yeni);
      return yeni;
    };

    const kokler = [...gltf.scene.children];
    const icerikKutusu = new THREE.Box3();
    const hareketli = (grup: string) => grup.startsWith('float:') || grup.startsWith('iz:');
    for (const kok of kokler) {
      const grup = grupAdi(kok);
      kok.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        const malzeme = uyarla(mesh.material as THREE.Material);
        mesh.material = malzeme;
        const cam = malzeme.userData.kind === 'glass';
        mesh.castShadow = !cam && !hareketli(grup);
        mesh.receiveShadow = true;
        if (cam) {
          mesh.renderOrder = 2;
          mesh.userData.aoDisi = true;
        }
      });
      if (!hareketli(grup)) icerikKutusu.expandByObject(kok);
    }
    sahne.add(gltf.scene);
    this.icerikKutusu = icerikKutusu;

    // Kadraj için içerikten seyreltilmiş nokta bulutu (kutu köşeleri adanın yuvarlak biçimini abartıyor)
    gltf.scene.updateMatrixWorld(true);
    const noktalar: number[] = [];
    const v = new THREE.Vector3();
    for (const kok of kokler) {
      if (hareketli(grupAdi(kok))) continue;
      kok.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        const konum = mesh.geometry.attributes.position;
        const adim = Math.max(1, Math.floor(konum.count / 3000));
        for (let i = 0; i < konum.count; i += adim) {
          v.fromBufferAttribute(konum, i).applyMatrix4(mesh.matrixWorld);
          noktalar.push(v.x, v.y, v.z);
        }
      });
    }
    this.icerikNoktalari = new Float32Array(noktalar);

    // Deniz: pişirilmiş kıyı→açık geçişi (düz katman) + prosedürel dalga normali
    const deniz = new THREE.Mesh(
      new THREE.PlaneGeometry(1600, 1600, 1, 1).rotateX(-Math.PI / 2),
      dalgaMalzemesi(denizDokusu, veri.ocean, this.zaman)
    );
    deniz.material.envMap = this.ortam;
    deniz.position.y = veri.ocean.level;
    deniz.receiveShadow = true;
    deniz.name = 'deniz';
    sahne.add(deniz);
    // Yelkenli rotaları için kıyı alanı
    const kiyiAlani = this.kiyiAlaniKur(kokler, hareketli);

    // Gruplar: seçilebilir adalar / sınıf binaları ve yüzen tekneler
    const girisler = new Map(veri.groups.map((g) => [g.key, g]));
    const dugumler = new Map(kokler.map((k) => [grupAdi(k), k]));
    for (const kok of kokler) {
      const giris = girisler.get(grupAdi(kok));
      if (!giris) continue;
      const tur = giris.kind;
      if (tur === 'float') {
        const iz = giris.wake ? dugumler.get(giris.wake) ?? null : null;
        kok.rotation.order = 'YXZ';
        this.yuzenler.push({
          nesne: kok,
          iz,
          izY: iz ? iz.position.y : 0,
          y: kok.position.y,
          x0: kok.position.x,
          z0: kok.position.z,
          faz: this.yuzenler.length * 1.7,
          yon: giris.heading ? new THREE.Vector2(giris.heading[0], giris.heading[1]).normalize() : null,
          yariBoy: giris.halfLength || 1,
        });
      } else if (tur === 'stage' || tur === 'grade' || tur === 'landmark') {
        this.secilebilirEkle(kok, giris, tur);
        if (giris.lamp) {
          this.huzme = fenerHuzmesi(giris.lamp);
          this.sahne.add(this.huzme);
        }
      }
    }
    this.rotalariKur(kiyiAlani);
  }

  /**
   * Kıyı alanı: su yüzeyinin üstünde kalan sabit geometriden (kara, köprü) her hücreye en yakın
   * karanın uzaklığı. Yelkenli rotaları bu alandan türetilir.
   */
  private kiyiAlaniKur(kokler: THREE.Object3D[], hareketli: (grup: string) => boolean): KiyiAlani {
    const hucre = 0.5;
    // Rotalar içerik kutusunun biraz dışına taşabilir; kenar payı bunu kapsar
    const kutu = this.icerikKutusu.clone().expandByScalar(16);
    kutu.min.y = kutu.max.y = 0;
    const nx = Math.ceil((kutu.max.x - kutu.min.x) / hucre);
    const nz = Math.ceil((kutu.max.z - kutu.min.z) / hucre);
    kutu.max.x = kutu.min.x + nx * hucre;
    kutu.max.z = kutu.min.z + nz * hucre;
    const mesafe = new Float32Array(nx * nz).fill(1e6);
    const v = new THREE.Vector3();
    for (const kok of kokler) {
      if (hareketli(grupAdi(kok))) continue;
      kok.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        const konum = mesh.geometry.attributes.position;
        for (let i = 0; i < konum.count; i++) {
          v.fromBufferAttribute(konum, i).applyMatrix4(mesh.matrixWorld);
          // Su seviyesindeki köpük çizgileri kara sayılmaz; kumsal ve üstü sayılır
          if (v.y <= 0.06) continue;
          const ci = Math.floor((v.x - kutu.min.x) / hucre);
          const ck = Math.floor((v.z - kutu.min.z) / hucre);
          if (ci >= 0 && ck >= 0 && ci < nx && ck < nz) mesafe[ck * nx + ci] = 0;
        }
      });
    }

    // İki geçişli uzaklık dönüşümü (yaklaşık Öklid, hücre biriminde)
    const D = Math.SQRT2;
    for (let k = 0; k < nz; k++) {
      for (let i = 0; i < nx; i++) {
        const j = k * nx + i;
        let d = mesafe[j];
        if (i > 0) d = Math.min(d, mesafe[j - 1] + 1);
        if (k > 0) {
          d = Math.min(d, mesafe[j - nx] + 1);
          if (i > 0) d = Math.min(d, mesafe[j - nx - 1] + D);
          if (i < nx - 1) d = Math.min(d, mesafe[j - nx + 1] + D);
        }
        mesafe[j] = d;
      }
    }
    for (let k = nz - 1; k >= 0; k--) {
      for (let i = nx - 1; i >= 0; i--) {
        const j = k * nx + i;
        let d = mesafe[j];
        if (i < nx - 1) d = Math.min(d, mesafe[j + 1] + 1);
        if (k < nz - 1) {
          d = Math.min(d, mesafe[j + nx] + 1);
          if (i < nx - 1) d = Math.min(d, mesafe[j + nx + 1] + D);
          if (i > 0) d = Math.min(d, mesafe[j + nx - 1] + D);
        }
        mesafe[j] = d;
      }
    }
    return { kutu, hucre, nx, nz, mesafe };
  }

  /**
   * Yelkenliler için adalara, köprülere ve şamandıralara çarpmayan elips rota.
   * Rota teknenin Blender'daki konumundan ve yönünden başlar (o noktada rotaya teğettir).
   */
  private rotalariKur(alan: KiyiAlani): void {
    const tekneler = this.yuzenler.filter((y) => y.yon);
    if (!tekneler.length) return;
    const { kutu, hucre, nx, nz, mesafe } = alan;
    // Şamandıralar da engeldir; rota onların çevresinden geçer
    const samandiralar = this.yuzenler.filter((y) => !y.yon);
    const bosMu = (x: number, z: number, yaricap: number) => {
      const i = Math.floor((x - kutu.min.x) / hucre);
      const k = Math.floor((z - kutu.min.z) / hucre);
      if (i < 0 || k < 0 || i >= nx || k >= nz) return false;
      if (mesafe[k * nx + i] * hucre <= yaricap) return false;
      return samandiralar.every((s) => Math.hypot(x - s.x0, z - s.z0) > yaricap);
    };

    // Görünür alanın biraz dışına taşmasına izin ver
    const sinir = this.icerikKutusu.clone().expandByScalar(3);
    const rotalar: { x: number; z: number; yaricap: number }[] = [];
    for (const t of tekneler) {
      const f = t.yon;
      if (!f) continue;
      const n = new THREE.Vector2(-f.y, f.x);
      const yaricap = t.yariBoy + 0.45;
      let enIyi: { a: number; b: number; taraf: number; mx: number; mz: number } | null = null;
      for (const taraf of [1, -1]) {
        for (let a = 7; a >= 2.5; a -= 0.5) {
          for (let b = Math.min(5, a + 1); b >= 1.5; b -= 0.5) {
            if (enIyi && a * b <= enIyi.a * enIyi.b) continue;
            const mx = t.x0 + n.x * taraf * b;
            const mz = t.z0 + n.y * taraf * b;
            let uygun = true;
            for (let s = 0; s < 96 && uygun; s++) {
              const q = (s / 96) * Math.PI * 2;
              const px = mx + f.x * a * Math.sin(q) - n.x * taraf * b * Math.cos(q);
              const pz = mz + f.y * a * Math.sin(q) - n.y * taraf * b * Math.cos(q);
              const cakisma = rotalar.some((r) => Math.hypot(px - r.x, pz - r.z) < r.yaricap);
              const disarida = px < sinir.min.x || px > sinir.max.x || pz < sinir.min.z || pz > sinir.max.z;
              if (!bosMu(px, pz, yaricap) || cakisma || disarida) uygun = false;
            }
            if (uygun) enIyi = { a, b, taraf, mx, mz };
          }
        }
      }
      if (enIyi) {
        t.rota = { ...enIyi, f, n, q: 0 };
        rotalar.push({ x: enIyi.mx, z: enIyi.mz, yaricap: Math.max(enIyi.a, enIyi.b) + yaricap });
      }
    }
  }

  private isiklariKur(veri: SahneVerisi): void {
    const sahne = this.sahne;
    const dunya = veri.world || { color: [0.52, 0.72, 0.8] as Uclu, strength: 0.32 };
    const gok = new THREE.Color().setRGB(...dunya.color);
    sahne.add(new THREE.HemisphereLight(gok, new THREE.Color(0.55, 0.5, 0.4), Math.PI * dunya.strength * 1.25));

    const kutu = new THREE.Box3(
      new THREE.Vector3().fromArray(
        veri.groups.reduce<number[]>((a, g) => a.map((v, i) => Math.min(v, g.bbox.min[i])), [Infinity, Infinity, Infinity])
      ),
      new THREE.Vector3().fromArray(
        veri.groups.reduce<number[]>((a, g) => a.map((v, i) => Math.max(v, g.bbox.max[i])), [-Infinity, -Infinity, -Infinity])
      )
    );
    const merkez = kutu.getCenter(new THREE.Vector3());
    const yaricap = kutu.getBoundingSphere(new THREE.Sphere()).radius;

    for (const L of veri.lights) {
      const yon = new THREE.Vector3(...L.direction).normalize();
      const renk = new THREE.Color(...L.color);
      if (L.type === 'SUN') {
        const gunes = new THREE.DirectionalLight(renk, L.energy * 1.05);
        gunes.position.copy(merkez).addScaledVector(yon, -yaricap * 2.2);
        gunes.target.position.copy(merkez);
        gunes.castShadow = true;
        const boyut = this.kalite === 'yuksek' ? 4096 : 2048;
        gunes.shadow.mapSize.set(boyut, boyut);
        gunes.shadow.bias = -0.00025;
        gunes.shadow.normalBias = 0.025;
        gunes.shadow.radius = 3;
        const g = gunes.shadow.camera;
        g.left = -yaricap; g.right = yaricap; g.top = yaricap; g.bottom = -yaricap;
        g.near = 1; g.far = yaricap * 4.5;
        sahne.add(gunes, gunes.target);
      } else if (L.type === 'AREA') {
        // Alan ışıkları: gölgesiz yönlü dolgu; Cycles'taki yayılımı yaklaşık karşılar
        const mesafe = Math.max(8, Math.hypot(...L.position.map((v, i) => v - merkez.toArray()[i])));
        const isinim = L.energy / (Math.PI * mesafe * mesafe);
        const dolgu = new THREE.DirectionalLight(renk, Math.min(isinim * 0.5, 1.2));
        dolgu.position.copy(merkez).addScaledVector(yon, -50);
        dolgu.target.position.copy(merkez);
        sahne.add(dolgu, dolgu.target);
      }
    }
  }

  private secilebilirEkle(kok: THREE.Object3D, giris: SahneGrubu, tur: SecilebilirTuru): void {
    const renkHex = this.renkler[tur === 'grade' ? this.sayfa : giris.id] || '#ffffff';
    const adaGibi = tur === 'stage' || tur === 'landmark';
    const vurguRenk = new THREE.Color(renkHex);
    const malzemeler: Secilebilir['malzemeler'] = [];
    kok.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      // Vurgu ışınımı nesneye özel olsun; kopya dolgu yamasını yeniden alır
      const kopya: IsiyanMalzeme = dolguYamasiBagla((mesh.material as THREE.Material).clone());
      mesh.material = kopya;
      malzemeler.push({ m: kopya, taban: kopya.emissive ? kopya.emissive.clone() : null });
    });

    const min = new THREE.Vector3(...giris.bbox.min);
    const max = new THREE.Vector3(...giris.bbox.max);
    const boyut = max.clone().sub(min);
    const merkez = giris.center ? new THREE.Vector3(...giris.center) : min.clone().add(max).multiplyScalar(0.5);
    const kutuMerkez = min.clone().add(max).multiplyScalar(0.5);

    // Seçim hacmi (görünmez): hızlı ışın testi için
    let vekil: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
    let halkaY: number;
    let rx: number;
    let rz: number;
    if (adaGibi) {
      rx = Math.max(Math.abs(max.x - merkez.x), Math.abs(min.x - merkez.x));
      rz = Math.max(Math.abs(max.z - merkez.z), Math.abs(min.z - merkez.z));
      vekil = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 32), new THREE.MeshBasicMaterial());
      vekil.scale.set(boyut.x * 0.46, boyut.y + 1, boyut.z * 0.46);
      vekil.position.set(kutuMerkez.x, min.y + boyut.y / 2, kutuMerkez.z);
      halkaY = 0.03;
      rx *= 1.02;
      rz *= 1.02;
    } else {
      vekil = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
      vekil.scale.copy(boyut).addScalar(0.1);
      vekil.position.copy(kutuMerkez);
      halkaY = min.y + 0.1;
      rx = rz = Math.hypot(boyut.x, boyut.z) * 0.5 * 0.86;
    }
    vekil.visible = false;
    vekil.userData.secimAnahtari = giris.key;
    this.sahne.add(vekil);

    // Vurgu halkası
    const halka = new THREE.Group();
    const cizgi = new THREE.Mesh(
      new THREE.RingGeometry(0.975, 1, 160).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: vurguRenk, transparent: true, opacity: 0, depthWrite: false })
    );
    const hale = new THREE.Mesh(
      new THREE.RingGeometry(0.9, 1.045, 160).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: vurguRenk, transparent: true, opacity: 0, depthWrite: false })
    );
    halka.add(hale, cizgi);
    halka.position.set(adaGibi ? merkez.x : kutuMerkez.x, halkaY, adaGibi ? merkez.z : kutuMerkez.z);
    halka.scale.set(rx, 1, rz);
    halka.renderOrder = 3;
    halka.traverse((o) => {
      o.userData.aoDisi = true;
    });
    this.sahne.add(halka);

    // Ada etiketi tabelanın hemen altından aşağı sarkar; sınıf etiketi binanın, fener etiketi fener odasının üstünde durur
    const capaKaymalari: Record<SecilebilirTuru, number> = { stage: -0.45, grade: 1.2, landmark: 0 };
    const capaKaymasi = capaKaymalari[tur];
    const capa = giris.anchor
      ? new THREE.Vector3(giris.anchor[0], giris.anchor[1] + capaKaymasi, giris.anchor[2])
      : new THREE.Vector3(merkez.x, max.y + 0.6, merkez.z);

    this.secilebilirler.push({
      anahtar: giris.key,
      id: tur === 'grade' ? giris.grade ?? giris.id : giris.id,
      tur,
      giris,
      kok,
      vekil,
      halka,
      cizgi,
      hale,
      malzemeler,
      vurguRenk,
      capa,
      odak: new THREE.Vector3(kutuMerkez.x, min.y + boyut.y * 0.3, kutuMerkez.z),
      boyut,
      h: 0,
      nabiz: 0,
    });
  }

  private kameraKur(veri: SahneVerisi): void {
    const K = veri.camera;
    const hedef = new THREE.Vector3(...K.target);
    const konum = new THREE.Vector3(...K.position);
    this.icerikMerkezi = this.icerikKutusu.getCenter(new THREE.Vector3());
    this.icerikMerkezi.y = Math.max(0.5, this.icerikKutusu.min.y + 1.2);

    const kamera = (this.kamera = new THREE.OrthographicCamera(-10, 10, 10, -10, 1, 400));
    const ofset = konum.clone().sub(hedef);
    this.tabanKure = new THREE.Spherical().setFromVector3(ofset);
    this.tabanKure.radius = Math.max(60, this.icerikKutusu.getBoundingSphere(new THREE.Sphere()).radius * 3);
    kamera.position.copy(this.icerikMerkezi).add(new THREE.Vector3().setFromSpherical(this.tabanKure));
    kamera.lookAt(this.icerikMerkezi);

    const k = (this.kontrol = new OrbitControls(kamera, this.renderer.domElement));
    k.target.copy(this.icerikMerkezi);
    k.enableDamping = true;
    k.dampingFactor = 0.075;
    k.rotateSpeed = 0.45;
    k.zoomSpeed = 0.9;
    k.panSpeed = 0.8;
    k.screenSpacePanning = false;
    k.zoomToCursor = true;
    k.minZoom = 0.8;
    k.maxZoom = 4;
    k.minPolarAngle = 0.3;
    k.maxPolarAngle = 1.2;
    k.minAzimuthAngle = this.tabanKure.theta - 0.75;
    k.maxAzimuthAngle = this.tabanKure.theta + 0.75;
    k.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
    k.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
    k.enabled = false;
    k.addEventListener('start', () => {
      this.sonEtkilesim = performance.now();
      this.animasyonlariDurdur('kamera');
      this.yayinla('etkilesim', {});
    });
    k.addEventListener('change', () => this.hedefiSinirla());
    k.update();
  }

  private efektleriKur(): void {
    const r = this.renderer;
    const hedef = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
    const bilesim = (this.bilesim = new EffectComposer(r, hedef));
    bilesim.addPass(new RenderPass(this.sahne, this.kamera));
    this.ao = null;
    if (this.kalite === 'yuksek') {
      const ao = new SeciciGTAOPass(this.sahne, this.kamera, 1, 1);
      ao.updateGtaoMaterial({ radius: 0.55, distanceExponent: 1.4, thickness: 1.2, scale: 1.1, samples: 16 });
      ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 5, rings: 2, samples: 16 });
      ao.blendIntensity = 0.85;
      bilesim.addPass(ao);
      this.ao = ao;
    }
    bilesim.addPass(new OutputPass());
    bilesim.addPass(new ShaderPass(RenkDuzeltme));
  }

  // ---------------------------------------------------------------------------
  // Olaylar ve seçim
  // ---------------------------------------------------------------------------
  /** Dinleyiciyi ekler ve kaldırıcısını saklar; dispose() hepsini söker. */
  private bagla<K extends keyof HTMLElementEventMap>(
    hedef: HTMLElement,
    tur: K,
    fn: (e: HTMLElementEventMap[K]) => void
  ): void {
    hedef.addEventListener(tur, fn);
    this.sokuculer.push(() => hedef.removeEventListener(tur, fn));
  }

  private olaylariBagla(): void {
    const el = this.renderer.domElement;
    this.isin = new THREE.Raycaster();
    this.imlec = new THREE.Vector2();
    this.secimGerekli = false;
    // Tıklama = tek işaretçiyle, sol tuşla, sürüklemeden kısa basış. Sağ/orta tuş ve
    // değiştirici tuşlar OrbitControls'ta kaydırma/yakınlaştırmadır; çoklu dokunuş seçim yapmaz.
    let basma: { id: number; x: number; y: number; t: number } | null = null;
    const aktifIsaretciler = new Set<number>();

    this.bagla(el, 'pointermove', (e) => {
      this.imlecGuncelle(e);
      if (e.pointerType === 'mouse') this.secimGerekli = true;
    });
    this.bagla(el, 'pointerleave', () => this.fareUzerindeAyarla(null));
    this.bagla(el, 'pointerdown', (e) => {
      aktifIsaretciler.add(e.pointerId);
      this.sonEtkilesim = performance.now();
      const degistirici = e.ctrlKey || e.metaKey || e.shiftKey;
      basma =
        aktifIsaretciler.size === 1 && e.button === 0 && !degistirici
          ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now() }
          : null;
    });
    const birak = (e: PointerEvent) => {
      aktifIsaretciler.delete(e.pointerId);
      if (!basma || basma.id !== e.pointerId || e.type === 'pointercancel') {
        if (e.type === 'pointercancel' || aktifIsaretciler.size === 0) basma = null;
        return;
      }
      const kayma = Math.hypot(e.clientX - basma.x, e.clientY - basma.y);
      const sure = performance.now() - basma.t;
      basma = null;
      if (kayma > 7 || sure > 600 || !this.kontrol.enabled) return;
      this.imlecGuncelle(e);
      this.kamera.updateMatrixWorld();
      const bulunan = this.sec();
      if (bulunan) this.yayinla('sec', { giris: bulunan, kaynak: 'sahne' });
      else this.yayinla('bosluk', { giris: null, kaynak: 'sahne' });
    };
    this.bagla(el, 'pointerup', birak);
    this.bagla(el, 'pointercancel', birak);

    this.boyutGozlemci = new ResizeObserver(() => this.boyutla());
    this.boyutGozlemci.observe(this.kap);
    const gorunurluk = () => {
      if (!document.hidden) this.saat.getDelta();
    };
    document.addEventListener('visibilitychange', gorunurluk);
    this.sokuculer.push(() => document.removeEventListener('visibilitychange', gorunurluk));
    // Farklı ölçekli ekrana taşınınca piksel oranını yeniden uygula
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

  private imlecGuncelle(e: PointerEvent): void {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.imlec.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  }

  private sec(): Secilebilir | null {
    this.isin.setFromCamera(this.imlec, this.kamera);
    const vekiller = this.secilebilirler.map((s) => s.vekil);
    const sonuc = this.isin.intersectObjects(vekiller, false);
    if (!sonuc.length) return null;
    return this.secilebilirler.find((s) => s.vekil === sonuc[0].object) || null;
  }

  fareUzerindeAyarla(giris: Secilebilir | null): void {
    if (this.fareUzerinde === giris) return;
    this.fareUzerinde = giris;
    if (this.hazir) this.renderer.domElement.style.cursor = giris ? 'pointer' : '';
    this.yayinla('uzerinde', { giris });
  }

  /** Arayüzden (kart/düğme üzerine gelme, klavye odağı) vurgu. */
  vurgula(id: string | number | null): void {
    this.disVurgu = id == null ? null : this.bul(id);
  }

  /** Seçim paneli açıkken vurguyu sabit tut. */
  kilitle(id: string | number | null): void {
    this.kilitli = id == null ? null : this.bul(id);
  }

  bul(id: string | number): Secilebilir | null {
    return this.secilebilirler.find((s) => String(s.id) === String(id)) || null;
  }

  /** Etiket öğesini 3B çapaya bağlar; konumu her karede güncellenir. */
  etiketBagla(id: string | number, oge: HTMLElement): void {
    const giris = this.bul(id);
    if (giris) this.etiketler.set(giris, oge);
  }

  /** Sırayla kısa nabız: sahnedeki seçilebilir yerleri tanıtır. */
  tanit(): void {
    if (this.azHareket || !this.hazir) return;
    this.secilebilirler.forEach((s, i) => {
      this.zamanlayicilar.push(window.setTimeout(() => (s.nabiz = 1), 250 + i * 260));
    });
  }

  // ---------------------------------------------------------------------------
  // Kamera
  // ---------------------------------------------------------------------------
  boyutla(): void {
    if (!this.hazir) return;
    const w = this.kap.clientWidth || window.innerWidth;
    const h = this.kap.clientHeight || window.innerHeight;
    this.renderer.setPixelRatio(this.pikselOrani());
    this.renderer.setSize(w, h, false);
    this.bilesim.setPixelRatio(this.renderer.getPixelRatio());
    this.bilesim.setSize(w, h);
    this.cercevele();
  }

  /** İçerik kutusunu arayüz boşlukları dışında kalan alana sığdırır. */
  private cercevele(): void {
    const kamera = this.kamera;
    const w = this.kap.clientWidth || window.innerWidth;
    const h = this.kap.clientHeight || window.innerHeight;
    const b = this.bosluklar();
    const guvenliW = Math.max(120, w - b.left - b.right);
    const guvenliH = Math.max(120, h - b.top - b.bottom);

    // Taban yönünden bakan geçici kamera ile içerik köşelerinin görüş uzayı genişliği
    const gecici = new THREE.Object3D();
    gecici.position.copy(this.icerikMerkezi).add(new THREE.Vector3().setFromSpherical(this.tabanKure));
    gecici.lookAt(this.icerikMerkezi);
    gecici.updateMatrixWorld();
    const e = gecici.matrixWorld.clone().invert().elements;
    const p = this.icerikNoktalari;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < p.length; i += 3) {
      const x = e[0] * p[i] + e[4] * p[i + 1] + e[8] * p[i + 2] + e[12];
      const y = e[1] * p[i] + e[5] * p[i + 1] + e[9] * p[i + 2] + e[13];
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    const pay = w < 700 ? 1.03 : 1.06;
    const birimPiksel = Math.max(((maxX - minX) * pay) / guvenliW, ((maxY - minY) * pay) / guvenliH);
    const yarimW = (w * birimPiksel) / 2;
    const yarimH = (h * birimPiksel) / 2;
    // İçeriğin görüş uzayındaki ortası, arayüz dışında kalan güvenli alanın ortasına gelir
    const ortaX = (minX + maxX) / 2 - ((b.left - b.right) / 2) * birimPiksel;
    const ortaY = (minY + maxY) / 2 + ((b.top - b.bottom) / 2) * birimPiksel;
    kamera.left = ortaX - yarimW;
    kamera.right = ortaX + yarimW;
    kamera.top = ortaY + yarimH;
    kamera.bottom = ortaY - yarimH;
    kamera.updateProjectionMatrix();
    this.birimPiksel = birimPiksel;
  }

  private hedefiSinirla(): void {
    const k = this.kontrol;
    const kutu = this.icerikKutusu;
    const pay = 2;
    const x = THREE.MathUtils.clamp(k.target.x, kutu.min.x - pay, kutu.max.x + pay);
    const z = THREE.MathUtils.clamp(k.target.z, kutu.min.z - pay, kutu.max.z + pay);
    if (x !== k.target.x || z !== k.target.z) {
      const dx = x - k.target.x;
      const dz = z - k.target.z;
      k.target.x = x;
      k.target.z = z;
      this.kamera.position.x += dx;
      this.kamera.position.z += dz;
    }
    // İmlece yakınlaştırma ortografik kamerada kamera–hedef mesafesini değiştirir; içerik
    // yakın kırpma düzlemine girmesin diye mesafe sabit tutulur (ortografikte görüntü değişmez).
    const ofset = this.kamera.position.clone().sub(k.target);
    if (Math.abs(ofset.length() - this.tabanKure.radius) > 1e-3) {
      this.kamera.position.copy(k.target).add(ofset.setLength(this.tabanKure.radius));
    }
  }

  /** Küresel yönü ve yakınlaştırmayı doğrudan uygular (animasyonlar için). */
  private kameraDurumu({ hedef, theta, phi, zoom }: KameraDurumu): void {
    const k = this.kontrol;
    const kure = new THREE.Spherical(this.tabanKure.radius, phi, theta);
    k.target.copy(hedef);
    this.kamera.position.copy(hedef).add(new THREE.Vector3().setFromSpherical(kure));
    this.kamera.zoom = zoom;
    this.kamera.updateProjectionMatrix();
    this.kamera.lookAt(hedef);
  }

  private mevcutDurum(): KameraDurumu {
    const k = this.kontrol;
    const kure = new THREE.Spherical().setFromVector3(this.kamera.position.clone().sub(k.target));
    return { hedef: k.target.clone(), theta: kure.theta, phi: kure.phi, zoom: this.kamera.zoom };
  }

  private kameraGecisi(hedefDurum: KameraDurumu, sure = 1200, egri: (t: number) => number = yumusak.gecis): Promise<boolean> {
    if (!this.hazir) return Promise.resolve(false);
    this.animasyonlariDurdur('kamera');
    // Sönümleme artığı geçiş bittikten sonra görünümü kaydırmasın (r170 özel alanları)
    const ozel = this.kontrol as unknown as OzelKontrolAlanlari;
    ozel._sphericalDelta?.set(0, 0, 0);
    ozel._panOffset?.set(0, 0, 0);
    const bas = this.mevcutDurum();
    const bitis = { ...bas, ...hedefDurum };
    if (this.azHareket) sure = Math.min(sure, 1);
    this.kontrol.enabled = false;
    return new Promise((coz) => {
      this.animasyonlar.push({
        etiket: 'kamera',
        baslangic: performance.now(),
        sure,
        adim: (t) => {
          const e = egri(t);
          this.kameraDurumu({
            hedef: bas.hedef.clone().lerp(bitis.hedef, e),
            theta: THREE.MathUtils.lerp(bas.theta, bitis.theta, e),
            phi: THREE.MathUtils.lerp(bas.phi, bitis.phi, e),
            zoom: THREE.MathUtils.lerp(bas.zoom, bitis.zoom, e),
          });
        },
        bitti: (iptal) => {
          // dispose() bekleyen geçişleri iptal olarak çözer; kontrol o sırada sökülmektedir
          if (!this.kapatildi) {
            this.kontrol.enabled = this.kontrolIzni;
            this.kontrol.update();
          }
          coz(!iptal);
        },
      });
    });
  }

  private animasyonlariDurdur(etiket: string): void {
    const kalan: Animasyon[] = [];
    for (const a of this.animasyonlar) {
      if (a.etiket === etiket) a.bitti?.(true);
      else kalan.push(a);
    }
    this.animasyonlar = kalan;
  }

  /** Açılış: hafif uzaktan ve yandan sahneye yerleşen kamera. */
  async giris(): Promise<void> {
    if (!this.hazir) return;
    const hedef = this.icerikMerkezi.clone();
    const taban = { hedef, theta: this.tabanKure.theta, phi: this.tabanKure.phi, zoom: 1 };
    // Açılış başka bir geçişle kesilse bile o geçiş bitince kontrol açılır
    this.kontrolIzni = true;
    this.olcum.aktif = true;
    if (this.azHareket) {
      this.kameraDurumu(taban);
      this.kontrol.enabled = true;
      return;
    }
    this.kameraDurumu({ hedef, theta: taban.theta - 0.32, phi: taban.phi - 0.2, zoom: 0.74 });
    await this.kameraGecisi(taban, 2300, yumusak.cikis);
  }

  /**
   * Seçilen adaya/binaya yaklaşır.
   * kaymaPx: nesnenin ekran merkezinden kaydırılacağı piksel (ör. sağdaki panel için x: -190).
   */
  odaklan(id: string | number, { sure = 1100, yakinlik, kaymaPx = { x: 0, y: 0 } }: OdaklanSecenekleri = {}): Promise<boolean> {
    const s = this.bul(id);
    if (!s || !this.hazir) return Promise.resolve(false);
    const genislik = Math.max(s.boyut.x, s.boyut.z);
    const w = this.kap.clientWidth || window.innerWidth;
    const gorunen = w * (this.birimPiksel || 0.05) || 30;
    const carpanlar: Partial<Record<SecilebilirTuru, number>> = { stage: 1.7, landmark: 2.2 };
    const carpan = carpanlar[s.tur] ?? 5.5;
    const zoom = yakinlik ?? THREE.MathUtils.clamp(gorunen / (genislik * carpan), 1.15, 2.4);
    const theta = this.tabanKure.theta;
    const phi = this.tabanKure.phi - 0.06;
    // Ekran kaymasını zemin düzleminde karşılık gelen dünya kaymasına çevir
    const birim = (this.birimPiksel || 0.05) / zoom;
    const sag = new THREE.Vector3(Math.cos(theta), 0, -Math.sin(theta));
    const ileri = new THREE.Vector3(-Math.sin(theta), 0, -Math.cos(theta));
    const hedef = s.odak
      .clone()
      .addScaledVector(sag, -kaymaPx.x * birim)
      .addScaledVector(ileri, (kaymaPx.y * birim) / Math.max(0.3, Math.cos(phi)));
    return this.kameraGecisi({ hedef, theta, phi, zoom }, sure);
  }

  sifirla(sure = 1100): Promise<boolean> {
    if (!this.hazir) return Promise.resolve(false);
    return this.kameraGecisi(
      { hedef: this.icerikMerkezi.clone(), theta: this.tabanKure.theta, phi: this.tabanKure.phi, zoom: 1 },
      sure
    );
  }

  // ---------------------------------------------------------------------------
  // Döngü
  // ---------------------------------------------------------------------------
  private kare(): void {
    if (!this.hazir) return;
    const dt = Math.min(this.saat.getDelta(), 0.1);
    const simdi = performance.now();
    // Hareket azaltma tercihinde dalga, ışıltı ve yüzen nesneler durağan kalır
    if (!this.azHareket) this.zaman.value += dt;

    // Animasyonlar
    if (this.animasyonlar.length) {
      const kalan: Animasyon[] = [];
      for (const a of this.animasyonlar) {
        const t = Math.min(1, (simdi - a.baslangic) / a.sure);
        a.adim(t);
        if (t >= 1) a.bitti?.(false);
        else kalan.push(a);
      }
      this.animasyonlar = kalan;
    } else if (this.kontrol.enabled) {
      // Boşta hafif salınım
      if (!this.azHareket && simdi - this.sonEtkilesim > 9000) {
        const aci = Math.cos(this.zaman.value * 0.22) * 0.00032;
        const ofset = this.kamera.position.clone().sub(this.kontrol.target);
        ofset.applyAxisAngle(THREE.Object3D.DEFAULT_UP, aci);
        this.kamera.position.copy(this.kontrol.target).add(ofset);
      }
      this.kontrol.update();
    }
    // Işın testi ve etiket projeksiyonu bu karenin kamera konumunu kullansın
    this.kamera.updateMatrixWorld();

    // Seçim (fare)
    if (this.secimGerekli && this.kontrol.enabled) {
      this.secimGerekli = false;
      this.fareUzerindeAyarla(this.sec());
    }

    // Vurgular
    const k = 1 - Math.exp(-dt * 9);
    for (const s of this.secilebilirler) {
      const aktif = s === this.fareUzerinde || s === this.disVurgu || s === this.kilitli;
      s.h += ((aktif ? 1 : 0) - s.h) * k;
      if (s.nabiz > 0) s.nabiz = Math.max(0, s.nabiz - dt * 0.9);
      const nabizGorunur = Math.sin(s.nabiz * Math.PI) * 0.8;
      const g = Math.max(s.h, nabizGorunur);
      if (s.hSon === undefined || Math.abs(s.hSon - s.h) > 0.002) {
        for (const { m, taban } of s.malzemeler) {
          if (taban && m.emissive) m.emissive.copy(s.vurguRenk).multiplyScalar(0.13 * s.h).add(taban);
        }
        s.hSon = s.h;
      }
      const genisleme = s.nabiz > 0 ? (1 - s.nabiz) * 0.08 : 0;
      const olcek = 1 + Math.sin(this.zaman.value * 2.4) * 0.012 * s.h + genisleme;
      s.cizgi.scale.set(olcek, 1, olcek);
      s.hale.scale.set(olcek, 1, olcek);
      s.cizgi.material.opacity = g * 0.95;
      s.hale.material.opacity = g * 0.22;
      s.halka.visible = g > 0.005;
    }

    // Fener huzmesi yavaşça döner
    if (this.huzme) this.huzme.rotation.y = this.zaman.value * 0.45;

    // Yüzen tekneler ve şamandıralar; yelkenliler rotalarında ilerler
    const t = this.zaman.value;
    for (const y of this.yuzenler) {
      y.nesne.position.y = y.y + Math.sin(t * 0.9 + y.faz) * 0.035;
      y.nesne.rotation.z = Math.sin(t * 0.7 + y.faz) * 0.025;
      y.nesne.rotation.x = Math.cos(t * 0.6 + y.faz) * 0.018;
      const r = y.rota;
      if (!r || this.azHareket) continue;
      const { a, b, taraf, f, n } = r;
      const hiz = 0.55; // metre/saniye
      const turev = Math.hypot(a * Math.cos(r.q), b * Math.sin(r.q));
      r.q = (r.q + (hiz * dt) / Math.max(0.3, turev)) % (Math.PI * 2);
      const px = r.mx + f.x * a * Math.sin(r.q) - n.x * taraf * b * Math.cos(r.q);
      const pz = r.mz + f.y * a * Math.sin(r.q) - n.y * taraf * b * Math.cos(r.q);
      const tx = f.x * a * Math.cos(r.q) + n.x * taraf * b * Math.sin(r.q);
      const tz = f.y * a * Math.cos(r.q) + n.y * taraf * b * Math.sin(r.q);
      const donus = Math.atan2(tx, tz) - Math.atan2(f.x, f.y);
      y.nesne.position.x = px;
      y.nesne.position.z = pz;
      y.nesne.rotation.y = donus;
      // Dönüşün içine doğru hafif yatma (eğrilik arttıkça)
      y.nesne.rotation.z += (taraf * 0.05 * a * b) / Math.max(1, turev * turev);
      if (y.iz) {
        y.iz.position.set(px, y.izY, pz);
        y.iz.rotation.y = donus;
      }
    }

    // Etiketler
    if (this.etiketler.size) {
      const w = this.kap.clientWidth;
      const h = this.kap.clientHeight;
      const v = new THREE.Vector3();
      for (const [s, oge] of this.etiketler) {
        v.copy(s.capa).project(this.kamera);
        const x = (v.x * 0.5 + 0.5) * w;
        const y = (-v.y * 0.5 + 0.5) * h;
        oge.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
        oge.classList.toggle(this.etiketAktifSinifi, s.h > 0.5);
      }
    }

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

  private yayinla<K extends keyof AdaSahnesiOlayHaritasi>(ad: K, detay: AdaSahnesiOlayHaritasi[K]): void {
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
    // Süren yükleme AbortError ile sonlanır
    this.kapatma.abort();

    // yukle() yarıda kalmış olabilir; kurulmamış alanlar tanımsızdır
    const renderer = this.renderer as THREE.WebGLRenderer | undefined;
    const sahne = this.sahne as THREE.Scene | undefined;
    const kontrol = this.kontrol as OrbitControls | undefined;
    const bilesim = this.bilesim as EffectComposer | undefined;

    renderer?.setAnimationLoop(null);
    this.boyutGozlemci?.disconnect();
    this.boyutGozlemci = null;
    for (const sok of this.sokuculer.splice(0)) sok();
    this.dprSokucu?.();
    this.dprSokucu = null;
    for (const z of this.zamanlayicilar.splice(0)) window.clearTimeout(z);

    // Bekleyen kamera geçişleri iptal olarak çözülür
    const bekleyen = this.animasyonlar;
    this.animasyonlar = [];
    for (const a of bekleyen) a.bitti?.(true);

    kontrol?.dispose();

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
          // Deniz dokusu (map) ve gökyüzü ortamı (envMap) aşağıda ayrıca bırakılır
          if (deger instanceof THREE.Texture && deger !== this.ortam && deger !== this.denizDokusu) dokular.add(deger);
        }
        m.dispose();
      }
      for (const g of geometriler) g.dispose();
      for (const d of dokular) d.dispose();
      sahne.clear();
    }
    this.ortamHedefi?.dispose();
    this.ortamHedefi = null;
    this.ortam = null;
    this.denizDokusu?.dispose();
    this.denizDokusu = null;
    this.huzme = null;

    if (renderer) {
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    }

    this.etiketler.clear();
    this.secilebilirler.length = 0;
    this.yuzenler.length = 0;
    this.fareUzerinde = null;
    this.disVurgu = null;
    this.kilitli = null;
  }
}

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { FEN_YAPILARI, fenKimligi, fosilTuru, type FenKimligi, type FosilTuru } from './fenVerisi';
import { VadiSisi } from './fenAtmosfer';
import { selaleOlustur } from './fenSelale';
import { nehirAgziniAc } from './fenNehirAgzi';
import { karliZirveyiKapla } from './fenKarliZirve';
import { katmanDokusuUygula } from './fenKatmanlar';
import { BulutDenizi } from './fenBulutDenizi';
import { FenGorunum } from './fenGorunum';
import { FenCanlilari } from './fenCanlilar';
import { DonenParcalar } from './fenDonenParcalar';

interface SahneSecenekleri {
  varlikOneki: string;
  sec: (id: FenKimligi | null) => void;
  /** Uçurumdaki bir fosil tıklandı (kök adı ve türü); null seçim kalktı. */
  fosilSec: (id: string | null, tur: FosilTuru | null) => void;
  yuklendi: () => void;
  ilerleme: (oran: number) => void;
  hata: () => void;
}

interface YapiNesnesi {
  kok: THREE.Object3D;
  kutu: THREE.Box3;
  halka: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
}

/** fosiller.py'nin kendi kökünde aktardığı bir fosil: tür ve duvarın dışa bakış yönü extras'tan gelir. */
interface FosilNesnesi {
  tur: FosilTuru;
  kok: THREE.Object3D;
  kutu: THREE.Box3;
  bakis: THREE.Vector3;
  /** Kabartmanın altındaki koyu levha; üzerine gelince ve seçilince ısınır. */
  levhalar: THREE.MeshStandardMaterial[];
}

interface KameraGecisi {
  baslangic: number;
  sure: number;
  ilkKonum: THREE.Vector3;
  ilkHedef: THREE.Vector3;
  ilkZoom: number;
  sonKonum: THREE.Vector3;
  sonHedef: THREE.Vector3;
  sonZoom: number;
}

const gurultu = `
float rastgele(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float gurultu(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(rastgele(i),rastgele(i+vec2(1,0)),f.x),mix(rastgele(i+vec2(0,1)),rastgele(i+vec2(1,1)),f.x),f.y);
}
float bulut(vec2 p) { return gurultu(p)*.58 + gurultu(p*2.03)*.28 + gurultu(p*4.07)*.14; }
`;

const gokVertex = `varying vec2 vUv; void main() { vUv=uv; gl_Position=vec4(position.xy,1.0,1.0); }`;
const gokFragment = `
varying vec2 vUv;
uniform float uZaman, uGun, uAksam, uOran, uGunes, uAy;
uniform vec2 uGunesKonum, uAyKonum;
${gurultu}
float gokBulutu(vec2 p,vec2 merkez,vec2 boyut) {
  vec2 q=(p-merkez)/boyut;
  return exp(-dot(q,q)*2.0);
}
void main() {
  vec3 geceAlt=vec3(.105,.16,.23), geceUst=vec3(.018,.045,.10);
  vec3 gunAlt=vec3(.79,.85,.78), gunUst=vec3(.30,.57,.73);
  vec3 alt=mix(geceAlt,gunAlt,uGun);
  vec3 ust=mix(geceUst,gunUst,uGun);
  alt=mix(alt,vec3(.92,.61,.43),uAksam*.75);
  ust=mix(ust,vec3(.31,.36,.53),uAksam*.55);
  vec3 renk=mix(alt,ust,smoothstep(.2,1.,vUv.y));
  vec2 p=vec2(vUv.x*uOran,vUv.y);
  vec2 sunDelta=p-vec2(uGunesKonum.x*uOran,uGunesKonum.y);
  float sr=length(sunDelta);
  renk+=vec3(1.,.57,.20)*exp(-sr*21.)*uGunes*.40;
  float disk=(1.-smoothstep(.018,.020,sr))*uGunes;
  renk=mix(renk,vec3(1.,.91,.66),disk);
  vec2 moonDelta=p-vec2(uAyKonum.x*uOran,uAyKonum.y);
  float mr=length(moonDelta);
  float ayDisk=(1.-smoothstep(.015,.017,mr))*uAy;
  float krater=bulut(moonDelta*480.)*.15;
  renk+=vec3(.38,.51,.76)*exp(-mr*34.)*uAy*.15;
  renk=mix(renk,vec3(.86,.91,.95)-krater,ayDisk);
  vec2 hucre=p*vec2(190.,190.);
  vec2 yakin=fract(hucre)-.5;
  float yildiz=step(.991,rastgele(floor(hucre)))*(1.-smoothstep(.025,.13,length(yakin)));
  renk+=yildiz*(1.-uGun)*(1.-uAksam*.8)*smoothstep(.63,.92,vUv.y)*.85;
  vec2 cp=vUv-vec2(sin(uZaman*.013)*.025,cos(uZaman*.009)*.004);
  float yumak=gokBulutu(cp,vec2(.05,.86),vec2(.20,.047));
  yumak+=gokBulutu(cp,vec2(.13,.895),vec2(.105,.057))*.7;
  yumak+=gokBulutu(cp,vec2(.35,.965),vec2(.21,.045));
  yumak+=gokBulutu(cp,vec2(.43,.984),vec2(.095,.055))*.6;
  yumak+=gokBulutu(cp,vec2(.62,.825),vec2(.17,.028))*.5;
  yumak+=gokBulutu(cp,vec2(.82,.885),vec2(.22,.043))*.8;
  yumak+=gokBulutu(cp,vec2(.90,.916),vec2(.10,.045))*.6;
  yumak+=gokBulutu(cp,vec2(1.02,.99),vec2(.19,.060))*.8;
  float tabaka=(1.-exp(-yumak*.9))*smoothstep(.56,.84,vUv.y);
  vec3 bulutRengi=mix(vec3(.22,.29,.39),vec3(.94,.96,.93),uGun);
  bulutRengi=mix(bulutRengi,vec3(.94,.72,.56),uAksam*.54);
  renk=mix(renk,bulutRengi,tabaka*.76);
  gl_FragColor=vec4(pow(max(renk,vec3(0.)),vec3(2.2)),1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/**
 * Nehir yüzeyi: sakin bir dağ nehri. Renk koyu mavi-yeşil gövde ile hafif açık sığlıklar
 * arasında yavaşça değişir; hareket, dünya uzayında sürüklenen iki gürültü katmanının
 * yüzey normalini bükmesiyle güneşin ince parıltıları olarak görünür (şerit deseni yoktur).
 */
const nehirGurultu = `
  float nh_hash(vec2 p){ p=fract(p*vec2(443.897,441.423)); p+=dot(p,p+19.19); return fract(p.x*p.y); }
  float nh_noise(vec2 p){
    vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
    return mix(mix(nh_hash(i),nh_hash(i+vec2(1.,0.)),f.x),mix(nh_hash(i+vec2(0.,1.)),nh_hash(i+vec2(1.,1.)),f.x),f.y);
  }
  float nh_fbm(vec2 p){ return nh_noise(p)*.5+nh_noise(p*2.13+1.7)*.3+nh_noise(p*4.31+9.2)*.2; }
  float nh_yuzey(vec2 q,float t){ return nh_fbm(q*1.3+vec2(t*.34,-t*.27))*.6+nh_fbm(q*2.7-vec2(t*.21,t*.33)+5.1)*.4; }
`;
const nehirRenk = `
  {
    float dalga=nh_yuzey(vNehirDunya.xz,uNehirZamani);
    vec3 derin=vec3(.05,.27,.33), sig=vec3(.28,.55,.57);
    diffuseColor.rgb=mix(derin,sig,smoothstep(.4,.8,dalga)*.5);
  }
`;
const nehirNormal = `
  {
    vec2 nq=vNehirDunya.xz; float nt=uNehirZamani; float ne=.14;
    float h0=nh_yuzey(nq,nt);
    float hx=nh_yuzey(nq+vec2(ne,0.),nt)-h0;
    float hz=nh_yuzey(nq+vec2(0.,ne),nt)-h0;
    normal=normalize(normal+mat3(viewMatrix)*vec3(-hx,0.,-hz)*2.4);
  }
`;

function nesneyiBirak(kok: THREE.Object3D) {
  const geometriler = new Set<THREE.BufferGeometry>();
  const malzemeler = new Set<THREE.Material>();
  const dokular = new Set<THREE.Texture>();
  kok.traverse((nesne) => {
    if (!(nesne instanceof THREE.Mesh)) return;
    geometriler.add(nesne.geometry);
    for (const malzeme of Array.isArray(nesne.material) ? nesne.material : [nesne.material]) {
      malzemeler.add(malzeme);
      for (const deger of Object.values(malzeme)) {
        if (deger instanceof THREE.Texture) dokular.add(deger);
      }
    }
  });
  geometriler.forEach((geometri) => geometri.dispose());
  malzemeler.forEach((malzeme) => malzeme.dispose());
  dokular.forEach((doku) => doku.dispose());
}

export class FenSahnesi {
  private readonly sahne = new THREE.Scene();
  private readonly kamera = new THREE.OrthographicCamera(-40, 40, 26, -26, .1, 700);
  private readonly renderer: THREE.WebGLRenderer;
  private readonly gorunum: FenGorunum;
  private readonly kontroller: OrbitControls;
  private readonly draco = new DRACOLoader();
  private readonly gozYon = new THREE.Vector3(4, 54, 76).normalize();
  private readonly secilebilir = new Map<FenKimligi, YapiNesnesi>();
  private readonly fosiller = new Map<string, FosilNesnesi>();
  private canlilar: FenCanlilari | null = null;
  private donenParcalar: DonenParcalar | null = null;
  /** Dönen parçalar hareket ederken gölge haritası her üç karede bir tazelenir; durunca bir kez daha. */
  private donenGolgeSayaci = 0;
  private donenHareketliydi = false;
  private seciliFosil: string | null = null;
  private uzerindeFosil: string | null = null;
  private readonly isin = new THREE.Raycaster();
  private readonly fare = new THREE.Vector2();
  private readonly hareketTercihi = window.matchMedia('(prefers-reduced-motion: reduce)');
  private readonly boyutGozlemcisi: ResizeObserver;
  private readonly cevre: THREE.WebGLRenderTarget;
  private readonly gunes: THREE.DirectionalLight;
  private readonly ay = new THREE.DirectionalLight('#b0c9ff', 0);
  private readonly ortam = new THREE.HemisphereLight('#effbff', '#b3af87', 1.8);
  private readonly gokUniformlari = {
    uZaman: { value: 0 }, uGun: { value: 1 }, uAksam: { value: 0 },
    uOran: { value: 1 }, uGunes: { value: 1 }, uAy: { value: 0 },
    uGunesKonum: { value: new THREE.Vector2(.68, .90) },
    uAyKonum: { value: new THREE.Vector2(.68, .90) },
  };
  private readonly yananMalzemeler = new Map<THREE.MeshStandardMaterial, { renk: THREE.Color; guc: number; cam: boolean }>();
  private readonly yapiIsiklari: THREE.PointLight[] = [];
  private readonly nehirZamani = { value: 0 };
  private siradakiSelale = 0;
  private readonly vadiSisi = new VadiSisi(this.gokUniformlari.uZaman, this.gokUniformlari.uGun);
  private readonly bulutDenizi = new BulutDenizi(this.gokUniformlari.uZaman, this.gokUniformlari.uGun, this.gokUniformlari.uAksam);
  private saat = 10.5;
  private sonSaat = -1;
  private sonKare = 0;
  private readonly dinleyiciler: Array<() => void> = [];
  private secili: FenKimligi | null = null;
  private uzerinde: FenKimligi | null = null;
  private gecis: KameraGecisi | null = null;
  private genislik = 1;
  private yukseklik = 1;
  private temelYukseklik = 60;
  private kare = 0;
  private birakildi = false;
  private hazir = false;
  private aktifDokunuslar = new Set<number>();
  private basma: { x: number; y: number; zaman: number; coklu: boolean } | null = null;

  constructor(private readonly kapsayici: HTMLDivElement, private readonly secenekler: SahneSecenekleri) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    const masaustu = kapsayici.clientWidth >= 780;
    this.renderer.setPixelRatio(Math.min(Math.max(window.devicePixelRatio || 1, masaustu ? 1.5 : 1), masaustu ? 2 : 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.AgXToneMapping;
    this.renderer.toneMappingExposure = .95;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor('#bdd5d6');
    this.sahne.fog = new THREE.Fog('#bdd5d6', 170, 300);
    const tuval = this.renderer.domElement;
    tuval.tabIndex = 0;
    tuval.setAttribute('aria-label', 'Üç boyutlu Fen Keşif Köyü. Bir binaya tıklayarak açın. 3–8 tuşlarıyla sınıf, L ile laboratuvar seçin. F tuşuyla uçurumdaki fosilleri sırayla açın. Yön tuşlarıyla görünümü çevirin. Artı ve eksiyle yakınlaşın. Home tuşuyla köyün tamamını görün.');
    tuval.setAttribute('role', 'img');
    kapsayici.appendChild(tuval);

    this.kamera.position.copy(this.gozYon).multiplyScalar(95);
    this.kamera.layers.enable(1);
    this.kontroller = new OrbitControls(this.kamera, tuval);
    this.kontroller.target.set(-1, 0, 2);
    this.kontroller.enableDamping = true;
    this.kontroller.dampingFactor = .07;
    this.kontroller.minZoom = .6;
    this.kontroller.maxZoom = 4;
    this.kontroller.minPolarAngle = .28;
    this.kontroller.maxPolarAngle = 1.2;
    this.kontroller.enablePan = true;
    this.kontroller.panSpeed = .65;
    this.kontroller.rotateSpeed = .55;
    this.kontroller.zoomSpeed = .75;
    this.kontroller.update();
    const kontrolBasladi = () => { this.gecis = null; };
    this.kontroller.addEventListener('start', kontrolBasladi);
    this.dinleyiciler.push(() => this.kontroller.removeEventListener('start', kontrolBasladi));

    const oda = new RoomEnvironment();
    const ortamUretici = new THREE.PMREMGenerator(this.renderer);
    this.cevre = ortamUretici.fromScene(oda, .035);
    this.sahne.environment = this.cevre.texture;
    this.sahne.environmentIntensity = .18;
    oda.dispose();
    ortamUretici.dispose();
    this.sahne.add(this.ortam);
    this.gunes = new THREE.DirectionalLight('#fff0d7', 3.2);
    this.gunes.position.set(-34, 70, 40);
    this.gunes.castShadow = true;
    const golgeBoyutu = Math.min(masaustu ? 4096 : 2048, this.renderer.capabilities.maxTextureSize);
    this.gunes.shadow.mapSize.set(golgeBoyutu, golgeBoyutu);
    Object.assign(this.gunes.shadow.camera, { left: -53, right: 53, top: 53, bottom: -53, near: 1, far: 170 });
    // Keep small roof ribs, bridge rails and foliage attached to their shadows.
    this.gunes.shadow.normalBias = .022;
    this.gunes.shadow.bias = -.00012;
    this.sahne.add(this.gunes, this.gunes.target);
    this.ay.position.set(-28, 50, 25);
    this.sahne.add(this.ay);
    this.atmosferiKur();
    this.gunuGuncelle();
    this.gorunum = new FenGorunum(this.renderer, this.sahne, this.kamera);

    this.olaylariBagla(tuval);
    this.boyutGozlemcisi = new ResizeObserver(() => this.boyutlandir());
    this.boyutGozlemcisi.observe(kapsayici);
    this.boyutlandir();
    this.canlandir(0);
    void this.modeliYukle();
  }

  private atmosferiKur() {
    const malzeme = new THREE.ShaderMaterial({
      uniforms: this.gokUniformlari,
      vertexShader: gokVertex, fragmentShader: gokFragment,
      depthTest: false, depthWrite: false,
    });
    const gok = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), malzeme);
    gok.frustumCulled = false;
    gok.layers.set(1);
    gok.renderOrder = -1000;
    this.sahne.add(gok, this.vadiSisi.grup, this.bulutDenizi.grup);
    this.sahne.add(selaleOlustur({
      dudak: new THREE.Vector3(-24.85, -7.5, 47.25), tabanY: -41.9,
      zaman: this.nehirZamani, gun: this.gokUniformlari.uGun, genislik: 1.85,
      noktalar: [
        new THREE.Vector3(-23.85, -7.50, 44.65),
        new THREE.Vector3(-24.85, -7.50, 47.25),
        new THREE.Vector3(-25.18, -8.8, 48.25),
        new THREE.Vector3(-26.4, -23, 51.1),
        new THREE.Vector3(-29, -41.9, 56),
      ],
    }));
    this.sahne.add(selaleOlustur({
      dudak: new THREE.Vector3(52.1, -7.5, 24.3), tabanY: -41.59,
      zaman: this.nehirZamani, gun: this.gokUniformlari.uGun, genislik: 1.85,
      noktalar: [
        new THREE.Vector3(49.7, -7.50, 22.82),
        new THREE.Vector3(52.1, -7.50, 24.3),
        new THREE.Vector3(53.0, -8.8, 24.85),
        new THREE.Vector3(56.1, -23, 27),
        new THREE.Vector3(61.5, -41.59, 29.9),
      ],
    }));
  }

  saatiAyarla(saat: number) {
    if (!Number.isFinite(saat)) return;
    this.saat = THREE.MathUtils.clamp(saat, 0, 24);
    this.gunuGuncelle();
  }

  private gunuGuncelle() {
    if (this.sonSaat === this.saat) return;
    this.sonSaat = this.saat;
    const aci = (this.saat - 6) / 12 * Math.PI;
    const yukseklik = Math.sin(aci);
    const gun = THREE.MathUtils.smoothstep(yukseklik, -.17, .35);
    const aksam = Math.exp(-Math.pow(yukseklik / .24, 2));
    const gece = 1 - gun;
    this.gokUniformlari.uGun.value = gun;
    this.gokUniformlari.uAksam.value = aksam;
    this.gokUniformlari.uGunes.value = THREE.MathUtils.smoothstep(yukseklik, -.12, .1);
    this.gokUniformlari.uAy.value = THREE.MathUtils.smoothstep(-yukseklik, -.08, .2);
    this.gokUniformlari.uGunesKonum.value.set(.50 + .25 * (1 - Math.cos(aci)) / 2, .79 + .13 * Math.max(0, yukseklik));
    this.gokUniformlari.uAyKonum.value.set(.58 + .18 * (1 + Math.cos(aci)) / 2, .82 + .10 * Math.max(0, -yukseklik));
    this.gunes.position.set(-Math.cos(aci) * 105, Math.max(9, yukseklik * 82), 26);
    this.gunes.color.set('#fff1d8').lerp(new THREE.Color('#ffb16a'), aksam * .75);
    // Belirgin güneş gölgeleri ve daha az gri dolgu: yapılar çayırdan ayrılır, renkler yıkanmaz.
    this.gunes.intensity = 3.15 * gun;
    this.ay.intensity = .68 * gece;
    this.ortam.color.set('#c4dbe3').lerp(new THREE.Color('#809dcc'), gece);
    this.ortam.groundColor.set('#b6ae88').lerp(new THREE.Color('#364a55'), gece);
    this.ortam.intensity = THREE.MathUtils.lerp(.44, .52, gun);
    this.sahne.environmentIntensity = THREE.MathUtils.lerp(.10, .14, gun);
    this.renderer.toneMappingExposure = THREE.MathUtils.lerp(.93, .95, gun);
    const sis = new THREE.Color('#bfd4cd').lerp(new THREE.Color('#203149'), gece);
    sis.lerp(new THREE.Color('#c39a87'), aksam * .5);
    if (this.sahne.fog instanceof THREE.Fog) this.sahne.fog.color.copy(sis);
    this.renderer.setClearColor(sis);
    for (const [malzeme, ozellik] of this.yananMalzemeler) {
      malzeme.emissive.copy(ozellik.renk).lerp(new THREE.Color(ozellik.cam ? '#ffd58e' : '#ffbd5b'), gece);
      malzeme.emissiveIntensity = THREE.MathUtils.lerp(ozellik.guc, ozellik.cam ? .28 : 2.2, gece);
    }
    for (const isik of this.yapiIsiklari) isik.intensity = gece * 22;
    this.renderer.shadowMap.needsUpdate = true;
  }

  private async modeliYukle() {
    this.draco.setDecoderPath(`${this.secenekler.varlikOneki}/adalar/draco/`);
    const yukleyici = new GLTFLoader();
    yukleyici.setDRACOLoader(this.draco);
    try {
      // Geliştirmede model her açılışta taze yüklenir; yeniden aktarılan GLB önbellekte kalmaz.
      const surum = process.env.NODE_ENV !== 'production' ? `?v=${Date.now()}` : '';
      const gltf = await yukleyici.loadAsync(`${this.secenekler.varlikOneki}/fen-bilimleri/fen-kesif-koyu.glb${surum}`, (olay) => {
        if (!this.birakildi && olay.total > 0) this.secenekler.ilerleme(olay.loaded / olay.total);
      });
      if (this.birakildi) { nesneyiBirak(gltf.scene); return; }
      nehirAgziniAc(gltf.scene);
      karliZirveyiKapla(gltf.scene);
      // Katman rengi kar örtüsünden önce hesaplanır: gölgelendirici zinciri kar → katman sırasıyla sarılır.
      katmanDokusuUygula(gltf.scene);
      gltf.scene.traverse((nesne) => {
        if (!(nesne instanceof THREE.Mesh)) return;
        const malzemeler = Array.isArray(nesne.material) ? nesne.material : [nesne.material];
        nesne.castShadow = !malzemeler.some((m) => (m.transparent && m.opacity < .8) || (m instanceof THREE.MeshPhysicalMaterial && m.transmission > .05));
        nesne.receiveShadow = true;
        for (const malzeme of malzemeler) {
          if (!(malzeme instanceof THREE.MeshStandardMaterial)) continue;
          const cam = /glass/i.test(malzeme.name);
          if ((cam || /glow|opal/i.test(malzeme.name)) && !this.yananMalzemeler.has(malzeme)) {
            this.yananMalzemeler.set(malzeme, { renk: malzeme.emissive.clone(), guc: malzeme.emissiveIntensity, cam });
          }
          // Cam, sahnenin kısık ortam haritasından bağımsız parlak yansımalar alır: sera ve kubbeler
          // çayırın rengini alan solgun hayaletler yerine cam gibi okunur.
          if (cam) {
            malzeme.envMapIntensity = 1.1;
            malzeme.roughness = Math.min(malzeme.roughness, .16);
          }
          if (/stream/i.test(malzeme.name) && !malzeme.userData.fenAkis) {
            malzeme.userData.fenAkis = true;
            malzeme.onBeforeCompile = (shader) => {
              shader.uniforms.uNehirZamani = this.nehirZamani;
              shader.vertexShader = `varying vec3 vNehirDunya;\n${shader.vertexShader}`.replace('#include <begin_vertex>', '#include <begin_vertex>\nvNehirDunya=(modelMatrix*vec4(transformed,1.)).xyz;');
              shader.fragmentShader = `uniform float uNehirZamani;\nvarying vec3 vNehirDunya;\n${nehirGurultu}\n${shader.fragmentShader}`
                .replace('#include <color_fragment>', `#include <color_fragment>\n${nehirRenk}`)
                .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor=.22;')
                .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n${nehirNormal}`);
            };
            malzeme.customProgramCacheKey = () => 'fen-nehir-akisi-v2';
            malzeme.needsUpdate = true;
          }
        }
      });
      for (const cocuk of gltf.scene.children) if (cocuk.name.startsWith('fosil_')) this.fosilKaydet(cocuk);
      // Hayvanlar ayrı köklerdedir; sahne eklenince canlandırılır (leke gölgeleri kendi grubunda).
      this.canlilar = new FenCanlilari(gltf.scene);
      this.sahne.add(gltf.scene, this.canlilar.grup);
      gltf.scene.updateMatrixWorld(true);
      this.vadiSisi.yenile();
      this.gorunum.yenile();
      for (const yapi of FEN_YAPILARI) {
        const kok = gltf.scene.getObjectByName(yapi.id);
        if (!kok) continue;
        const kutu = new THREE.Box3().setFromObject(kok);
        if (kutu.isEmpty()) continue;
        kok.traverse((nesne) => { nesne.userData.fenKimligi = yapi.id; });
        const merkez = kutu.getCenter(new THREE.Vector3());
        const boyut = kutu.getSize(new THREE.Vector3());
        const yaricap = Math.max(boyut.x, boyut.z) * .5 + .7;
        const halka = new THREE.Mesh(
          new THREE.RingGeometry(yaricap, yaricap + .13, 96),
          new THREE.MeshBasicMaterial({ color: yapi.renk, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }),
        );
        halka.rotation.x = -Math.PI / 2;
        const kokYuksekligi = kok.getWorldPosition(new THREE.Vector3()).y;
        halka.position.set(merkez.x, Math.max(kokYuksekligi + .06, kutu.min.y + .04), merkez.z);
        this.sahne.add(halka);
        this.secilebilir.set(yapi.id, { kok, kutu, halka });
        const isik = new THREE.PointLight('#ffd292', 0, yapi.id === 'lab' ? 21 : 14, 2);
        isik.position.set(merkez.x, kokYuksekligi + 2.1, kutu.max.z - 1.5);
        this.sahne.add(isik);
        this.yapiIsiklari.push(isik);
      }
      if (!this.secilebilir.size) throw new Error('Sınıf yapıları modelde bulunamadı.');
      // Küre, kubbe, güneş sistemi, atom ve DNA üzerine gelince döner; mikroskop arada kendi oynar.
      this.donenParcalar = new DonenParcalar(gltf.scene);
      this.hazir = true;
      this.renderer.shadowMap.autoUpdate = false;
      this.renderer.shadowMap.needsUpdate = true;
      this.sonSaat = -1;
      this.gunuGuncelle();
      this.odakla(this.secili, true);
      this.secenekler.yuklendi();
    } catch (hata) {
      if (!this.birakildi) {
        console.error('Fen Keşif Köyü sahnesi yüklenemedi:', hata);
        this.secenekler.hata();
      }
    } finally {
      // A route change can occur while Draco is still decoding. Release its
      // workers after that promise settles, not from the early scene cleanup.
      this.draco.dispose();
    }
  }

  private boyutlandir() {
    this.genislik = Math.max(1, this.kapsayici.clientWidth);
    this.yukseklik = Math.max(1, this.kapsayici.clientHeight);
    const oran = this.genislik / this.yukseklik;
    // Frame the inhabited canyon (x -33..30, z -31..38, y -8..10),
    // including the enlarged foreground laboratory; exclude the distant forest.
    this.temelYukseklik = Math.max(52, 74 / oran);
    this.gokUniformlari.uOran.value = oran;
    this.kamera.left = -this.temelYukseklik * oran / 2;
    this.kamera.right = -this.kamera.left;
    this.kamera.top = this.temelYukseklik / 2;
    this.kamera.bottom = -this.kamera.top;
    this.kamera.updateProjectionMatrix();
    this.renderer.setSize(this.genislik, this.yukseklik);
    this.gorunum.boyutlandir(this.genislik, this.yukseklik);
    this.odakla(this.secili, true);
  }

  sec(id: FenKimligi | null) {
    this.secili = id;
    this.seciliFosil = null;
    this.odakla(id);
  }

  /** Uçurumdaki bir fosile odaklanır; null köyün genel görünümüne döner. */
  fosilSec(id: string | null) {
    const fosil = id ? this.fosiller.get(id) : null;
    this.secili = null;
    this.seciliFosil = fosil ? id : null;
    if (fosil) this.fosileOdakla(fosil);
    else this.odakla(null);
  }

  fosilListesi(): { id: string; tur: FosilTuru }[] {
    return Array.from(this.fosiller, ([id, fosil]) => ({ id, tur: fosil.tur }));
  }

  private siradakiFosil(): string | null {
    const idler = Array.from(this.fosiller.keys());
    if (!idler.length) return null;
    const sira = this.seciliFosil ? idler.indexOf(this.seciliFosil) : -1;
    return idler[(sira + 1) % idler.length];
  }

  private fosilKaydet(kok: THREE.Object3D) {
    const tur: unknown = kok.userData.tur;
    if (!fosilTuru(tur)) return;
    const bakis = new THREE.Vector3(0, 0, 1);
    try {
      const veri: unknown = typeof kok.userData.bakis === 'string' ? JSON.parse(kok.userData.bakis) : kok.userData.bakis;
      if (Array.isArray(veri) && veri.length === 3 && veri.every((n) => typeof n === 'number' && Number.isFinite(n))) bakis.fromArray(veri);
    } catch {
      // Bakış yönü okunamazsa varsayılan güney bakışı kalır.
    }
    const levhalar: THREE.MeshStandardMaterial[] = [];
    kok.traverse((nesne) => {
      nesne.userData.fosilKimligi = kok.name;
      if (!(nesne instanceof THREE.Mesh) || !(nesne.material instanceof THREE.MeshStandardMaterial)) return;
      if (!/levha/i.test(nesne.material.name)) return;
      // Levha malzemesi fosiller arasında paylaşılır; vurgu için her fosil kendi kopyasını alır.
      const kopya = nesne.material.clone();
      kopya.emissive.set('#e6b25c');
      kopya.emissiveIntensity = 0;
      nesne.material = kopya;
      levhalar.push(kopya);
    });
    kok.updateWorldMatrix(true, true);
    const kutu = new THREE.Box3().setFromObject(kok);
    if (kutu.isEmpty()) return;
    this.fosiller.set(kok.name, { tur, kok, kutu, bakis, levhalar });
  }

  yakinlas(yon: 1 | -1) {
    this.gecis = null;
    this.kamera.zoom = THREE.MathUtils.clamp(this.kamera.zoom * (yon > 0 ? 1.2 : 1 / 1.2), .6, 4);
    this.kamera.updateProjectionMatrix();
    this.kontroller.update();
  }

  selaleyiGoster() {
    const dogu = this.siradakiSelale === 1;
    this.siradakiSelale = (this.siradakiSelale + 1) % 2;
    const hedef = dogu ? new THREE.Vector3(56, -26, 27) : new THREE.Vector3(-22, -26, 49);
    const yon = dogu ? new THREE.Vector3(64, 48, 50).normalize() : this.gozYon;
    this.gecis = {
      baslangic: performance.now(), sure: this.hareketTercihi.matches ? 0 : 1100,
      ilkKonum: this.kamera.position.clone(), ilkHedef: this.kontroller.target.clone(), ilkZoom: this.kamera.zoom,
      sonKonum: hedef.clone().addScaledVector(yon, 95), sonHedef: hedef,
      sonZoom: THREE.MathUtils.clamp(this.temelYukseklik / 55, .6, 1.5),
    };
  }

  private gecisBaslat(hedef: THREE.Vector3, yon: THREE.Vector3, zoom: number, aninda: boolean) {
    const konum = hedef.clone().addScaledVector(yon, 95);
    this.gecis = {
      baslangic: performance.now(), sure: aninda || this.hareketTercihi.matches ? 0 : 900,
      ilkKonum: this.kamera.position.clone(), ilkHedef: this.kontroller.target.clone(), ilkZoom: this.kamera.zoom,
      sonKonum: konum, sonHedef: hedef, sonZoom: zoom,
    };
  }

  /** Bir sınırlayıcı kutuyu, yanındaki panele yer bırakarak verilen bakış yönünden çerçeveler. */
  private kutuyaOdakla(kutu: THREE.Box3, yon: THREE.Vector3, pay: number, enAzBoy: number, enCokZoom: number, aninda: boolean) {
    const hedef = kutu.getCenter(new THREE.Vector3());
    const boyut = kutu.getSize(new THREE.Vector3());
    const sag = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), yon).normalize();
    const ust = new THREE.Vector3().crossVectors(yon, sag).normalize();
    const dar = this.genislik < 780;
    const panelGenislik = dar ? 0 : Math.min(390, this.genislik * .31) + 93;
    const panelYukseklik = dar ? Math.min(310, this.yukseklik * .4) + 30 : 100;
    const kullanilanGenislik = Math.max(230, this.genislik - panelGenislik - 70);
    const kullanilanYukseklik = Math.max(180, this.yukseklik - panelYukseklik - (dar ? 115 : 70));
    const yatayBoy = Math.abs(sag.x) * boyut.x + Math.abs(sag.y) * boyut.y + Math.abs(sag.z) * boyut.z;
    const dikeyBoy = Math.abs(ust.x) * boyut.x + Math.abs(ust.y) * boyut.y + Math.abs(ust.z) * boyut.z;
    const gorunumBoyu = Math.max(dikeyBoy * this.yukseklik / kullanilanYukseklik, yatayBoy * this.yukseklik / kullanilanGenislik) * pay;
    // The exported node bounds include each building's scale (the lab is 1.6×).
    // Allow zooming out when a large structure needs more space beside its panel.
    const zoom = THREE.MathUtils.clamp(this.temelYukseklik / Math.max(enAzBoy, gorunumBoyu), .6, enCokZoom);
    const birimPiksel = this.temelYukseklik / (zoom * this.yukseklik);
    hedef.addScaledVector(sag, panelGenislik * .5 * birimPiksel);
    if (dar) hedef.addScaledVector(ust, -panelYukseklik * .32 * birimPiksel);
    this.gecisBaslat(hedef, yon, zoom, aninda);
  }

  private odakla(id: FenKimligi | null, aninda = false) {
    const yapi = id ? this.secilebilir.get(id) : null;
    if (yapi) {
      this.kutuyaOdakla(yapi.kutu, this.gozYon, 1.3, 17, 3.8, aninda);
      return;
    }
    const fosil = this.seciliFosil ? this.fosiller.get(this.seciliFosil) : null;
    if (fosil) {
      this.fosileOdakla(fosil, aninda);
      return;
    }
    this.gecisBaslat(new THREE.Vector3(-1, 0, 2), this.gozYon, 1, aninda);
  }

  /** Fosile, duvarın dışa bakan yönünden alçak bir açıyla yaklaşır (kutup açısı sınırları içinde). */
  private fosileOdakla(fosil: FosilNesnesi, aninda = false) {
    const yon = fosil.bakis.clone().setY(0);
    if (yon.lengthSq() < 1e-6) yon.copy(this.gozYon).setY(0);
    yon.normalize().add(new THREE.Vector3(0, .62, 0)).normalize();
    this.kutuyaOdakla(fosil.kutu, yon, 1.5, 9, 4, aninda);
  }

  private hedefiBul(x: number, y: number): { tur: 'yapi'; id: FenKimligi } | { tur: 'fosil'; id: string } | null {
    if (!this.hazir) return null;
    const sinir = this.renderer.domElement.getBoundingClientRect();
    this.fare.set((x - sinir.left) / sinir.width * 2 - 1, -(y - sinir.top) / sinir.height * 2 + 1);
    this.isin.setFromCamera(this.fare, this.kamera);
    const kokler = [
      ...Array.from(this.secilebilir.values(), (yapi) => yapi.kok),
      ...Array.from(this.fosiller.values(), (fosil) => fosil.kok),
    ];
    const eslesme = this.isin.intersectObjects(kokler, true)[0];
    const yapi: unknown = eslesme?.object.userData.fenKimligi;
    if (fenKimligi(yapi)) return { tur: 'yapi', id: yapi };
    const fosil: unknown = eslesme?.object.userData.fosilKimligi;
    if (typeof fosil === 'string' && this.fosiller.has(fosil)) return { tur: 'fosil', id: fosil };
    return null;
  }

  private olaylariBagla(tuval: HTMLCanvasElement) {
    const hareket = (olay: PointerEvent) => {
      if (olay.buttons || olay.pointerType === 'touch') return;
      const hedef = this.hedefiBul(olay.clientX, olay.clientY);
      this.uzerinde = hedef?.tur === 'yapi' ? hedef.id : null;
      this.uzerindeFosil = hedef?.tur === 'fosil' ? hedef.id : null;
      tuval.style.cursor = hedef ? 'pointer' : 'grab';
    };
    const bas = (olay: PointerEvent) => {
      this.aktifDokunuslar.add(olay.pointerId);
      if (this.aktifDokunuslar.size > 1 && this.basma) this.basma.coklu = true;
      else this.basma = { x: olay.clientX, y: olay.clientY, zaman: performance.now(), coklu: false };
      tuval.style.cursor = 'grabbing';
    };
    const birak = (olay: PointerEvent) => {
      this.aktifDokunuslar.delete(olay.pointerId);
      if (this.basma && !this.basma.coklu && olay.button === 0 && performance.now() - this.basma.zaman < 650 && Math.hypot(olay.clientX - this.basma.x, olay.clientY - this.basma.y) < 7) {
        const hedef = this.hedefiBul(olay.clientX, olay.clientY);
        if (hedef?.tur === 'yapi') this.secenekler.sec(hedef.id);
        else if (hedef?.tur === 'fosil') this.secenekler.fosilSec(hedef.id, this.fosiller.get(hedef.id)?.tur ?? null);
      }
      if (!this.aktifDokunuslar.size) this.basma = null;
      tuval.style.cursor = 'grab';
    };
    const ayril = () => { this.uzerinde = null; this.uzerindeFosil = null; };
    const iptal = (olay: PointerEvent) => { this.aktifDokunuslar.delete(olay.pointerId); this.basma = null; };
    const tus = (olay: KeyboardEvent) => {
      const secim = olay.key.toLowerCase() === 'l' ? 'lab' : `grade_${olay.key}`;
      if (fenKimligi(secim)) { olay.preventDefault(); this.secenekler.sec(secim); }
      else if (olay.key === '+' || olay.key === '=') { olay.preventDefault(); this.yakinlas(1); }
      else if (olay.key === '-') { olay.preventDefault(); this.yakinlas(-1); }
      else if (olay.key === 'Home') { olay.preventDefault(); this.secenekler.sec(null); }
      else if (olay.key.toLowerCase() === 'f') {
        olay.preventDefault();
        const id = this.siradakiFosil();
        if (id) this.secenekler.fosilSec(id, this.fosiller.get(id)?.tur ?? null);
      }
      else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(olay.key)) {
        olay.preventDefault(); this.gecis = null;
        const kure = new THREE.Spherical().setFromVector3(this.kamera.position.clone().sub(this.kontroller.target));
        kure.theta += olay.key === 'ArrowLeft' ? .09 : olay.key === 'ArrowRight' ? -.09 : 0;
        kure.phi = THREE.MathUtils.clamp(kure.phi + (olay.key === 'ArrowUp' ? -.07 : olay.key === 'ArrowDown' ? .07 : 0), .28, 1.2);
        this.kamera.position.copy(new THREE.Vector3().setFromSpherical(kure).add(this.kontroller.target));
        this.kontroller.update();
      }
    };
    tuval.addEventListener('pointermove', hareket);
    tuval.addEventListener('pointerdown', bas);
    tuval.addEventListener('pointerup', birak);
    tuval.addEventListener('pointerleave', ayril);
    tuval.addEventListener('pointercancel', iptal);
    tuval.addEventListener('keydown', tus);
    this.dinleyiciler.push(() => {
      tuval.removeEventListener('pointermove', hareket);
      tuval.removeEventListener('pointerdown', bas);
      tuval.removeEventListener('pointerup', birak);
      tuval.removeEventListener('pointerleave', ayril);
      tuval.removeEventListener('pointercancel', iptal);
      tuval.removeEventListener('keydown', tus);
    });
  }

  private canlandir = (zaman: number) => {
    if (this.birakildi) return;
    this.kare = requestAnimationFrame(this.canlandir);
    const adim = Math.min(.05, Math.max(0, (zaman - this.sonKare) / 1000));
    this.sonKare = zaman;
    if (!this.hareketTercihi.matches) this.ilerlet(adim);
    const gecis = this.gecis;
    if (gecis) {
      const t = gecis.sure ? Math.min(1, (performance.now() - gecis.baslangic) / gecis.sure) : 1;
      const yumusak = 1 - Math.pow(1 - t, 3);
      this.kamera.position.lerpVectors(gecis.ilkKonum, gecis.sonKonum, yumusak);
      this.kontroller.target.lerpVectors(gecis.ilkHedef, gecis.sonHedef, yumusak);
      this.kamera.zoom = THREE.MathUtils.lerp(gecis.ilkZoom, gecis.sonZoom, yumusak);
      this.kamera.updateProjectionMatrix();
      if (t === 1) this.gecis = null;
    }
    this.kontroller.update();
    this.vadiSisi.guncelle(this.renderer, this.sahne, this.kamera);
    for (const [id, yapi] of this.secilebilir) {
      const vurgu = id === this.secili ? .8 : id === this.uzerinde ? .65 : 0;
      yapi.halka.material.opacity += (vurgu - yapi.halka.material.opacity) * .14;
    }
    for (const [id, fosil] of this.fosiller) {
      const vurgu = id === this.seciliFosil ? .55 : id === this.uzerindeFosil ? .3 : 0;
      for (const levha of fosil.levhalar) levha.emissiveIntensity += (vurgu - levha.emissiveIntensity) * .12;
    }
    this.gorunum.render();
  };

  /** Sahne zamanını ilerletir: gök ve su uniformları, hayvan animasyonu, dönen yapı parçaları. */
  private ilerlet(adim: number) {
    this.gokUniformlari.uZaman.value += adim;
    this.nehirZamani.value += adim;
    this.canlilar?.guncelle(adim);
    // Dönen parçalar 1. katmandadır (AO önbelleği bozulmaz) ama gölge düşürür: hareket ederken
    // duragan gölge haritası seyrek aralıklarla, durduklarında son bir kez tazelenir.
    const hareket = this.donenParcalar?.guncelle(adim, (yapi) => yapi === this.uzerinde || yapi === this.secili) ?? false;
    if (hareket) {
      this.donenGolgeSayaci = (this.donenGolgeSayaci + 1) % 3;
      if (this.donenGolgeSayaci === 0) this.renderer.shadowMap.needsUpdate = true;
    } else if (this.donenHareketliydi) {
      this.renderer.shadowMap.needsUpdate = true;
    }
    this.donenHareketliydi = hareket;
  }

  dispose() {
    if (this.birakildi) return;
    this.birakildi = true;
    cancelAnimationFrame(this.kare);
    this.boyutGozlemcisi.disconnect();
    this.dinleyiciler.forEach((birak) => birak());
    this.kontroller.dispose();
    this.vadiSisi.dispose();
    this.bulutDenizi.dispose();
    this.gorunum.dispose();
    this.canlilar?.dispose();
    nesneyiBirak(this.sahne);
    this.gunes.shadow.map?.dispose();
    this.cevre.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}

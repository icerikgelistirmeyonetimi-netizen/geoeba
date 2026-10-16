import * as THREE from 'three';
import { BULUT_TABANI, BULUT_USTU } from './fenBulutDenizi';

/**
 * Dış kenar şelalesi: ince ayarlı, katmanlı bir su perdesi.
 *
 * - Ana perde: nehir dudağından aşağı kıvrılan, düşerken genişleyip saçaklanan su tabakası.
 *   Değer gürültüsüyle üretilen dikey şeritler aşağıda hızlanır (serbest düşüş), köpük
 *   aşağıya doğru artar, kenarlar düzensiz ve yumuşaktır. Dudakta parlak bir köpük şeridi.
 * - İki yan iplik: ana perdeden ayrılan daha ince, daha saydam akıntılar; farklı faz ve hızla.
 * - Kaya sıçramaları: perdenin kıvrıldığı iki çıkıntıda küçük beyaz patlamalar.
 * - Taban: halkalar hâlinde yayılan köpük havuzu, yükselip dağılan püskürtü sisi ve damlalar.
 *
 * Bütün parçalar 1. katmandadır (GTAO ve sis derinliği hesabına girmez), gölge almaz.
 * Su, vadiyi örten bulut denizine girerken dünya yüksekliğine göre solar (fenBulutDenizi.ts).
 * Paylaşılan zaman durduğunda (hareket azaltma) akış da durur.
 */

/** Bulut denizine giren parçalar için ortak solma: dünya yüksekliği varying'i ve çarpanı. */
const bulutVarying = 'varying float vBulutY;';
const bulutVertex = 'vBulutY=(modelMatrix*vec4(p,1.)).y;';
const bulutCarpani = 'smoothstep(BULUT_TABANI,BULUT_USTU,vBulutY)';
const bulutSabitleri = `
  #define BULUT_TABANI ${BULUT_TABANI.toFixed(1)}
  #define BULUT_USTU ${BULUT_USTU.toFixed(1)}
`;
export interface SelaleSecenekleri {
  /** Nehrin dış kenara ulaştığı dünya koordinatı; Y yukarı, akış +Z. */
  dudak: THREE.Vector3;
  tabanY: number;
  /** Sahnenin paylaşılan zaman ve 0–1 gündüz uniformları. */
  zaman: THREE.IUniform<number>;
  gun: THREE.IUniform<number>;
  genislik?: number;
  /** İstenirse nehir bağlantısından çarpma noktasına kadar dünya koordinatları. */
  noktalar?: readonly THREE.Vector3[];
}

const gurultu = `
  float sel_hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
  float sel_gurultu(vec2 p){
    vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
    float a=sel_hash(i), b=sel_hash(i+vec2(1.,0.)), c=sel_hash(i+vec2(0.,1.)), d=sel_hash(i+vec2(1.,1.));
    return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);
  }
  float sel_fbm(vec2 p){ return sel_gurultu(p)*.5+sel_gurultu(p*2.03+7.1)*.3+sel_gurultu(p*4.11+3.7)*.2; }
`;

const perdeVertex = `
  #include <common>
  #include <fog_pars_vertex>
  attribute vec3 aYan;
  varying vec2 vUv;
  ${bulutVarying}
  uniform float uZaman,uFaz;
  void main() {
    vUv=uv;
    vec3 p=position;
    // Yanal salınım dudakta yok, aşağıya doğru büyür.
    float s=smoothstep(.02,.3,vUv.y)*(.6+vUv.y);
    p+=aYan*(sin(vUv.y*17.-uZaman*1.9+uFaz)*.03+sin(vUv.y*41.+uZaman*3.1+uFaz*2.)*.012)*s;
    ${bulutVertex}
    vec4 mvPosition=modelViewMatrix*vec4(p,1.);
    gl_Position=projectionMatrix*mvPosition;
    #include <fog_vertex>
  }
`;

const perdeFragment = `
  #include <common>
  #include <fog_pars_fragment>
  ${gurultu}
  ${bulutSabitleri}
  uniform float uZaman,uGun,uBoy,uFaz,uKalinlik;
  uniform vec3 uSu,uKopuk;
  varying vec2 vUv;
  ${bulutVarying}
  void main() {
    float y=vUv.y;
    float t=uZaman+uFaz;
    // Serbest düşüş: aşağıda hızlanan akış koordinatı.
    float dusme=y*(.55+.45*y);
    float akis=dusme*uBoy*.62-t*3.4;
    // İnce dikey şeritler, yanal titreşimli.
    float sapma=sel_fbm(vec2(vUv.x*3.1+uFaz,dusme*2.6-t*.55))*.7;
    float serit=sel_fbm(vec2((vUv.x*uBoy*.16+sapma)*5.5,akis*.16));
    float seritler=smoothstep(.34,.72,serit);
    // Aşağıya doğru artan türbülans ve köpük.
    float turb=smoothstep(.08,.85,y);
    float kopuk=smoothstep(.55-.3*turb,.9,sel_fbm(vec2(vUv.x*8.+t*.15,akis*.9)));
    // Kenarlar yumuşak ve düzensiz; aşağıda saçaklanır.
    float kenarGurultu=sel_fbm(vec2(vUv.x*2.+uFaz,dusme*5.-t*1.6));
    float kenar=smoothstep(0.,.16+.12*turb,vUv.x)*(1.-smoothstep(.84-.12*turb,1.,vUv.x));
    kenar=smoothstep(.05,.55,kenar-(kenarGurultu-.45)*.5*turb);
    // Dudakta parlak, kaynayan köpük şeridi.
    float dudak=(1.-smoothstep(0.,.07,y))*(.5+.5*sel_fbm(vec2(vUv.x*14.,t*2.)));
    float uc=1.-smoothstep(.95,1.,y);
    vec3 renk=mix(uSu,uKopuk,clamp(.16+seritler*.32+kopuk*.6*turb+dudak*.5,0.,1.));
    float alfa=kenar*uc*uKalinlik*(.5+seritler*.22+kopuk*.28*turb+dudak*.25)*${bulutCarpani};
    renk*=mix(.34,1.,uGun);
    gl_FragColor=vec4(renk,alfa);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

const kopukVertex = `
  #include <common>
  #include <fog_pars_vertex>
  varying vec2 vUv;
  ${bulutVarying}
  void main() {
    vUv=uv;
    vec3 p=position;
    ${bulutVertex}
    vec4 mvPosition=modelViewMatrix*vec4(p,1.);
    gl_Position=projectionMatrix*mvPosition;
    #include <fog_vertex>
  }
`;

const kopukFragment = `
  #include <common>
  #include <fog_pars_fragment>
  ${gurultu}
  ${bulutSabitleri}
  varying vec2 vUv;
  ${bulutVarying}
  uniform float uZaman,uGun;
  uniform vec3 uSu,uKopuk;
  void main() {
    vec2 p=(vUv-.5)*vec2(1.,1.15);
    float r=length(p);
    float kenar=1.-smoothstep(.2,.5,r+sel_fbm(p*6.+uZaman*.2)*.12);
    // Çarpma noktasından dışarı yayılan halkalar, uzaklaştıkça sönümlenir.
    float halka=pow(max(0.,sin(r*38.-uZaman*3.4)),8.)*(1.-smoothstep(.12,.5,r));
    float doku=sel_fbm(p*9.+vec2(uZaman*.35,-uZaman*.2));
    float merkez=exp(-r*r*70.)*(.55+doku*.6);
    float beyaz=clamp(merkez*.9+halka*.32+smoothstep(.55,.85,doku)*.25*(1.-smoothstep(.1,.45,r)),0.,1.);
    vec3 renk=mix(uSu,uKopuk,beyaz)*mix(.34,1.,uGun);
    gl_FragColor=vec4(renk,kenar*(.3+merkez*.42+halka*.18)*${bulutCarpani});
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

const sisVertex = `
  #include <common>
  #include <fog_pars_vertex>
  uniform float uZaman,uOlcek;
  attribute float aFaz;
  attribute vec3 aYon;
  varying vec2 vUv;
  varying float vYas;
  varying float vFaz;
  ${bulutVarying}
  void main() {
    vUv=uv;
    vFaz=aFaz;
    float omur=2.8+1.6*fract(aFaz*7.3);
    float yas=fract((uZaman*.32+aFaz)*(3.6/omur));
    vYas=yas;
    // Püskürtü yükselirken yana açılır ve büyür.
    vec3 merkez=vec3(aYon.x*yas*1.4,(yas*yas*2.2+yas*.9)*aYon.y,aYon.z*yas*1.4)*uOlcek;
    vec3 p=merkez;
    ${bulutVertex}
    vec4 mvPosition=modelViewMatrix*vec4(merkez,1.);
    float boy=(1.+yas*1.8)*(.8+.4*fract(aFaz*3.1))*uOlcek;
    mvPosition.xy+=position.xy*boy;
    gl_Position=projectionMatrix*mvPosition;
    #include <fog_vertex>
  }
`;

const sisFragment = `
  #include <common>
  #include <fog_pars_fragment>
  ${gurultu}
  ${bulutSabitleri}
  uniform float uGun,uZaman;
  uniform vec3 uKopuk;
  varying vec2 vUv;
  varying float vYas;
  varying float vFaz;
  ${bulutVarying}
  void main() {
    vec2 p=(vUv-.5)*2.;
    float d=length(p);
    float doku=sel_fbm(p*2.2+vFaz*9.+uZaman*.08);
    float yumusak=1.-smoothstep(.2,1.,d+(doku-.5)*.7);
    float alfa=yumusak*pow(sin(vYas*PI),.8)*.2*${bulutCarpani};
    gl_FragColor=vec4(uKopuk*mix(.36,1.,uGun),alfa);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

const damlaVertex = `
  #include <common>
  #include <fog_pars_vertex>
  uniform float uZaman,uOlcek,uHiz;
  attribute float aFaz;
  attribute vec3 aYon;
  varying vec2 vUv;
  varying float vYas;
  ${bulutVarying}
  void main() {
    vUv=uv;
    float yas=fract(uZaman*uHiz+aFaz);
    vYas=yas;
    vec3 yol=vec3(aYon.x*(.2+yas),aYon.y*4.*yas*(1.-yas),aYon.z*yas)*uOlcek;
    vec3 p=yol;
    ${bulutVertex}
    vec4 mvPosition=modelViewMatrix*vec4(yol,1.);
    mvPosition.xy+=position.xy*(.035+.03*sin(aFaz*19.))*(.65+.35*sin(yas*PI))*uOlcek;
    gl_Position=projectionMatrix*mvPosition;
    #include <fog_vertex>
  }
`;

const damlaFragment = `
  #include <common>
  #include <fog_pars_fragment>
  ${bulutSabitleri}
  uniform float uGun;
  uniform vec3 uKopuk;
  varying vec2 vUv;
  varying float vYas;
  ${bulutVarying}
  void main() {
    vec2 p=(vUv-.5)*2.;
    float daire=1.-smoothstep(.2,1.,length(p));
    float alfa=daire*sin(vYas*PI)*.26*${bulutCarpani};
    gl_FragColor=vec4(uKopuk*mix(.36,1.,uGun),alfa);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

/** Eğri boyunca dikey su şeridi; `profil(t)` genişlik çarpanı, `kayma` yanal kaydırma (genişlik oranı). */
function seritGeometrisi(egri: THREE.CatmullRomCurve3, genislik: number, profil: (t: number) => number, kayma: number, baslangic = 0) {
  const konumlar: number[] = [];
  const uvler: number[] = [];
  const yanlar: number[] = [];
  const indisler: number[] = [];
  const adimlar = 120;
  const sonSag = new THREE.Vector3(1, 0, 0);
  for (let i = 0; i <= adimlar; i++) {
    const t = baslangic + (1 - baslangic) * i / adimlar;
    const p = egri.getPointAt(t);
    const yon = egri.getTangentAt(t);
    const sag = new THREE.Vector3(yon.z, 0, -yon.x);
    if (sag.lengthSq() > .000001) sonSag.copy(sag).normalize();
    const en = genislik * profil(t);
    const merkez = p.clone().addScaledVector(sonSag, kayma * genislik);
    const solKenar = merkez.clone().addScaledVector(sonSag, -en / 2);
    const sagKenar = merkez.clone().addScaledVector(sonSag, en / 2);
    konumlar.push(...solKenar.toArray(), ...sagKenar.toArray());
    yanlar.push(...sonSag.toArray(), ...sonSag.toArray());
    uvler.push(0, i / adimlar, 1, i / adimlar);
    if (i < adimlar) {
      const j = i * 2;
      indisler.push(j, j + 1, j + 2, j + 1, j + 3, j + 2);
    }
  }
  const geometri = new THREE.BufferGeometry();
  geometri.setAttribute('position', new THREE.Float32BufferAttribute(konumlar, 3));
  geometri.setAttribute('uv', new THREE.Float32BufferAttribute(uvler, 2));
  geometri.setAttribute('aYan', new THREE.Float32BufferAttribute(yanlar, 3));
  geometri.setIndex(indisler);
  geometri.computeVertexNormals();
  geometri.computeBoundingSphere();
  return geometri;
}

/** Kamera yüzlü küçük kartlar: sis yumakları ve damlalar için ortak parçacık geometrisi. */
function parcacikGeometrisi(adet: number, yon: (i: number) => [number, number, number]) {
  const konumlar: number[] = [], uvler: number[] = [], fazlar: number[] = [], yonler: number[] = [], indisler: number[] = [];
  const koseler = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
  for (let i = 0; i < adet; i++) {
    const y = yon(i);
    for (const [x, yy] of koseler) {
      konumlar.push(x, yy, 0);
      uvler.push((x + 1) / 2, (yy + 1) / 2);
      fazlar.push(i / adet);
      yonler.push(...y);
    }
    const j = i * 4;
    indisler.push(j, j + 1, j + 2, j + 1, j + 3, j + 2);
  }
  const geometri = new THREE.BufferGeometry();
  geometri.setAttribute('position', new THREE.Float32BufferAttribute(konumlar, 3));
  geometri.setAttribute('uv', new THREE.Float32BufferAttribute(uvler, 2));
  geometri.setAttribute('aFaz', new THREE.Float32BufferAttribute(fazlar, 1));
  geometri.setAttribute('aYon', new THREE.Float32BufferAttribute(yonler, 3));
  geometri.setIndex(indisler);
  return geometri;
}

function damlaGeometrisi(adet: number) {
  return parcacikGeometrisi(adet, (i) => {
    const aci = i * 2.399963;
    return [Math.cos(aci) * (.6 + (i % 3) * .22), .35 + (i % 5) * .12, .25 + Math.sin(aci) * .7];
  });
}

function sisGeometrisi(adet: number) {
  return parcacikGeometrisi(adet, (i) => {
    const aci = i * 2.399963 + .7;
    return [Math.cos(aci) * (.5 + (i % 4) * .28), .75 + (i % 3) * .2, Math.sin(aci) * (.5 + ((i + 1) % 4) * .28)];
  });
}

/** Katmanlı bir dış kenar şelalesi. Paylaşılan zaman durduğunda bütün akış da durur. */
export function selaleOlustur({ dudak, tabanY, zaman, gun, genislik = 2.2, noktalar }: SelaleSecenekleri): THREE.Group {
  if (!Number.isFinite(tabanY) || !dudak.toArray().every(Number.isFinite) || tabanY >= dudak.y) {
    throw new Error('Şelale tabanı, geçerli dudak koordinatının altında olmalıdır.');
  }
  if (!Number.isFinite(genislik) || genislik <= 0) throw new Error('Şelale genişliği pozitif olmalıdır.');
  if (noktalar && (noktalar.length < 3 || noktalar.some((p) => !p.toArray().every(Number.isFinite)))) {
    throw new Error('Şelale yolu en az üç geçerli dünya koordinatı içermelidir.');
  }
  const grup = new THREE.Group();
  grup.name = 'Fen · dış kenar şelalesi';
  grup.position.copy(dudak);
  const dusus = dudak.y - tabanY;
  const menzil = THREE.MathUtils.clamp(dusus * .055, 1.35, 2.7);
  const yerelNoktalar = noktalar?.map((p) => p.clone().sub(dudak)) ?? [
    new THREE.Vector3(0, .008, -.90),
    new THREE.Vector3(0, -.015, .12),
    new THREE.Vector3(0, -Math.min(.6, dusus * .16), .78),
    new THREE.Vector3(0, -dusus * .35, menzil * .78),
    new THREE.Vector3(0, -dusus * .74, menzil * .96),
    new THREE.Vector3(0, -dusus + .025, menzil),
  ];
  const egri = new THREE.CatmullRomCurve3(yerelNoktalar, false, 'centripetal');
  const carpma = egri.getPointAt(1);
  const sonYon = egri.getTangentAt(1);
  const aci = Math.atan2(sonYon.x, sonYon.z);
  const renkler = {
    uSu: { value: new THREE.Color('#6cc0c1') },
    uKopuk: { value: new THREE.Color('#e6f1ee') },
  };
  const malzeme = (vertexShader: string, fragmentShader: string, ek: Record<string, THREE.IUniform>) => new THREE.ShaderMaterial({
    uniforms: { ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog), uZaman: zaman, uGun: gun, ...renkler, ...ek },
    vertexShader, fragmentShader, transparent: true, depthWrite: false,
    side: THREE.DoubleSide, fog: true,
  });
  const boy = { value: egri.getLength() };

  // Ana perde: dudakta hafif dar, düşerken genişleyip saçaklanır.
  const perde = new THREE.Mesh(
    seritGeometrisi(egri, genislik, (t) => .92 + .55 * THREE.MathUtils.smoothstep(t, .15, 1), 0),
    malzeme(perdeVertex, perdeFragment, { uBoy: boy, uFaz: { value: 0 }, uKalinlik: { value: 1 } }),
  );
  perde.name = 'Şelale · ana su perdesi';
  perde.renderOrder = 4;
  grup.add(perde);

  // Yan iplikler: perdeden ayrılan ince, daha saydam akıntılar.
  for (const [kayma, en, faz, kalinlik] of [[.46, .3, 2.1, .72], [-.52, .24, 4.7, .62]] as const) {
    const iplik = new THREE.Mesh(
      seritGeometrisi(egri, genislik, (t) => en * (.8 + .5 * t), kayma, .05),
      malzeme(perdeVertex, perdeFragment, { uBoy: boy, uFaz: { value: faz }, uKalinlik: { value: kalinlik } }),
    );
    iplik.name = 'Şelale · yan iplik';
    iplik.renderOrder = 4;
    grup.add(iplik);
  }

  // Kaya sıçramaları: perdenin kıvrıldığı çıkıntılarda küçük patlamalar.
  for (const t of [.36, .68]) {
    const nokta = egri.getPointAt(t);
    const sicrama = new THREE.Mesh(
      damlaGeometrisi(12),
      malzeme(damlaVertex, damlaFragment, { uOlcek: { value: .55 }, uHiz: { value: .7 } }),
    );
    sicrama.name = 'Şelale · kaya sıçraması';
    sicrama.position.copy(nokta);
    sicrama.rotation.y = aci;
    sicrama.frustumCulled = false;
    sicrama.renderOrder = 7;
    grup.add(sicrama);
  }

  const kopuk = new THREE.Mesh(new THREE.PlaneGeometry(genislik * 2.9, 3.6), malzeme(kopukVertex, kopukFragment, {}));
  kopuk.name = 'Şelale · halkalı taban köpüğü';
  kopuk.rotation.set(-Math.PI / 2, 0, aci);
  kopuk.position.copy(carpma).add(new THREE.Vector3(0, .035, 0));
  kopuk.renderOrder = 5;
  grup.add(kopuk);

  const sis = new THREE.Mesh(sisGeometrisi(22), malzeme(sisVertex, sisFragment, { uOlcek: { value: 1 } }));
  sis.name = 'Şelale · yükselen püskürtü sisi';
  sis.position.copy(carpma).add(new THREE.Vector3(0, .1, 0));
  sis.rotation.y = aci;
  sis.frustumCulled = false;
  sis.renderOrder = 6;
  grup.add(sis);

  const damla = new THREE.Mesh(damlaGeometrisi(18), malzeme(damlaVertex, damlaFragment, { uOlcek: { value: 1 }, uHiz: { value: .42 } }));
  damla.name = 'Şelale · ince su sıçramaları';
  damla.position.copy(carpma).add(new THREE.Vector3(0, .04, 0));
  damla.rotation.y = aci;
  damla.frustumCulled = false;
  damla.renderOrder = 7;
  grup.add(damla);

  grup.traverse((nesne) => {
    nesne.layers.set(1);
    nesne.castShadow = false;
    nesne.receiveShadow = false;
  });
  return grup;
}

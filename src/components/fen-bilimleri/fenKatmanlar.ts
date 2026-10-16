import * as THREE from 'three';

/**
 * Jeolojik katman dokusu: kaya yüzeylerini yüzeye göre değil dünya yüksekliğine göre boyar.
 *
 * dag_arazisi.py dış dağ kütlesinin katman yüzeylerine ve kanyonun iç duvarlarına tek bir
 * `canyon_stratum` malzemesi verir; katman tablosunu (kalınlık ve renk) çevre kökünün extras
 * alanına yazar. Bu gölgelendirici her pikselin uçurum dudağından derinliğini bulur, katman
 * rengini seçer ve üstüne tane, ince tabakalanma çizgileri, dikey aşınma izleri ve katman
 * sınırlarında koyu yatak çizgisi ekler. Bantlar böylece her yerde tam yatay ve süreklidir:
 * vadi içindeki büyük üçgen yüzeyler kaymış ya da kırık katman görüntüsü vermez. Serbest
 * kaya parçaları (`cliffN`) yalnız tane ve aşınma dokusunu alır. Kar örtüsü gölgelendiricisi
 * ile zincirlenir: önce katman rengi, sonra kar.
 */

interface Katman {
  kalinlik: number;
  renk: THREE.Color;
}

/** dag_arazisi.KATMANLAR ile aynı: extras okunamazsa yedek tablo. */
const VARSAYILAN_KATMANLAR: [number, number, number, number][] = [
  [.95, .28, .245, .17], [4.40, .45, .35, .25], [.40, .24, .20, .145], [5.20, .415, .32, .225],
  [3.10, .335, .265, .19], [.70, .405, .322, .235], [5.40, .32, .26, .19], [.55, .22, .185, .135],
  [6.60, .39, .305, .22], [3.90, .38, .30, .215], [.45, .30, .235, .17], [5.60, .305, .25, .185],
  [6.60, .28, .245, .17],
];

const gurultu = `
  float kd_hash(vec2 p){ p=fract(p*vec2(127.1,311.7)); p+=dot(p,p+19.19); return fract(p.x*p.y); }
  float kd_noise(vec2 p){
    vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
    float a=kd_hash(i), b=kd_hash(i+vec2(1.,0.)), c=kd_hash(i+vec2(0.,1.)), d=kd_hash(i+vec2(1.,1.));
    return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);
  }
  float kd_fbm(vec2 p){ return kd_noise(p)*.5+kd_noise(p*2.07+5.3)*.3+kd_noise(p*4.13+1.7)*.2; }
`;

const katmanKodu = `
  {
    vec3 kdP=vKatmanDunya;
    vec3 kdN=normalize(vKatmanNormal);
    float kdDerinlik=KATMAN_DUDAK-kdP.y;
    vec3 kdRenk=KATMAN_RENK[KATMAN_SAYISI-1];
    float kdUst=KATMAN_UST[KATMAN_SAYISI-1];
    float kdAlt=KATMAN_UST[KATMAN_SAYISI];
    for(int i=0;i<KATMAN_SAYISI;i++){
      if(kdDerinlik<KATMAN_UST[i+1]){ kdRenk=KATMAN_RENK[i]; kdUst=KATMAN_UST[i]; kdAlt=KATMAN_UST[i+1]; break; }
    }
    // Duvarın baktığı yöne göre iki düzlemden örneklenen tane: x'e ve z'ye bakan yüzlerde gerilmez.
    float kdAgirlik=abs(kdN.x)/(abs(kdN.x)+abs(kdN.z)+.0001);
    vec2 kdA=vec2(kdP.x*.9+kdP.z*.35,kdP.y*2.2);
    vec2 kdB=vec2(kdP.z*.9-kdP.x*.35,kdP.y*2.2);
    float kdTane=mix(kd_fbm(kdA),kd_fbm(kdB),kdAgirlik);
    // İnce tabakalanma çizgileri katmanın içinde yatay ilerler.
    float kdLamina=.5+.5*sin(kdDerinlik*34.+(kdTane-.5)*3.);
    // Yağmur suyunun bıraktığı koyu dikey aşınma izleri.
    float kdCizgi=smoothstep(.62,.9,mix(kd_noise(vec2(kdP.x*1.1+kdP.z*.3,kdP.y*.07)),kd_noise(vec2(kdP.z*1.1-kdP.x*.3,kdP.y*.07)),kdAgirlik));
    // Katman sınırında ince koyu yatak çizgisi.
    float kdSinir=min(kdDerinlik-kdUst,kdAlt-kdDerinlik);
    float kdYatak=1.-smoothstep(0.,.14,kdSinir);
    kdRenk*=.86+.28*kdTane;
    kdRenk*=1.-.06*kdLamina;
    kdRenk*=1.-.10*kdCizgi;
    kdRenk*=1.-.2*kdYatak;
    diffuseColor.rgb=kdRenk;
  }
`;

const kayaKodu = `
  {
    vec3 kdP=vKatmanDunya;
    vec3 kdN=normalize(vKatmanNormal);
    float kdAgirlik=abs(kdN.x)/(abs(kdN.x)+abs(kdN.z)+.0001);
    float kdTane=mix(kd_fbm(vec2(kdP.x*1.1+kdP.z*.4,kdP.y*2.4)),kd_fbm(vec2(kdP.z*1.1-kdP.x*.4,kdP.y*2.4)),kdAgirlik);
    float kdCizgi=smoothstep(.6,.9,kd_noise(vec2(kdP.x*1.3+kdP.z*.7,kdP.y*.09)));
    diffuseColor.rgb*=(.88+.24*kdTane)*(1.-.08*kdCizgi);
  }
`;

function tabloyuOku(cevre: THREE.Object3D | undefined): { katmanlar: Katman[]; dudak: number; omuz: number } {
  let ham: unknown = null;
  try {
    const veri: unknown = cevre?.userData.katmanlar;
    ham = typeof veri === 'string' ? JSON.parse(veri) : veri;
  } catch {
    ham = null;
  }
  const satirlar = Array.isArray(ham) && ham.length ? ham : VARSAYILAN_KATMANLAR;
  const katmanlar: Katman[] = [];
  for (const satir of satirlar) {
    if (!Array.isArray(satir) || satir.length !== 4 || !satir.every((n) => typeof n === 'number' && Number.isFinite(n))) continue;
    katmanlar.push({ kalinlik: satir[0], renk: new THREE.Color(satir[1], satir[2], satir[3]) });
  }
  if (!katmanlar.length) {
    for (const [kalinlik, r, g, b] of VARSAYILAN_KATMANLAR) katmanlar.push({ kalinlik, renk: new THREE.Color(r, g, b) });
  }
  const dudak = Number(cevre?.userData.dudak);
  const omuz = Number(cevre?.userData.omuz);
  return { katmanlar, dudak: Number.isFinite(dudak) ? dudak : .77, omuz: Number.isFinite(omuz) ? omuz : .95 };
}

export function katmanDokusuUygula(kok: THREE.Object3D): void {
  const cevre = kok.name === 'environment' ? kok : kok.getObjectByName('environment');
  const { katmanlar, dudak, omuz } = tabloyuOku(cevre);
  const sinirlar = [0];
  let derinlik = omuz;
  for (const katman of katmanlar) {
    derinlik += katman.kalinlik;
    sinirlar.push(derinlik);
  }
  const n = katmanlar.length;
  const sabitler = `
    #define KATMAN_SAYISI ${n}
    const float KATMAN_DUDAK=${dudak.toFixed(4)};
    const float KATMAN_UST[${n + 1}]=float[${n + 1}](${sinirlar.map((d) => d.toFixed(4)).join(',')});
    const vec3 KATMAN_RENK[${n}]=vec3[${n}](${katmanlar.map(({ renk }) => `vec3(${renk.r.toFixed(4)},${renk.g.toFixed(4)},${renk.b.toFixed(4)})`).join(',')});
  `;
  const islenen = new Set<THREE.MeshStandardMaterial>();
  kok.traverse((nesne) => {
    if (!(nesne instanceof THREE.Mesh)) return;
    for (const malzeme of Array.isArray(nesne.material) ? nesne.material : [nesne.material]) {
      if (!(malzeme instanceof THREE.MeshStandardMaterial) || islenen.has(malzeme)) continue;
      const katmanli = /canyon_stratum/i.test(malzeme.name);
      const kaya = /(?:^|[\s·_])cliff\d/i.test(malzeme.name);
      if (!katmanli && !kaya) continue;
      islenen.add(malzeme);
      const onceki = malzeme.onBeforeCompile;
      const oncekiAnahtar = malzeme.customProgramCacheKey;
      malzeme.onBeforeCompile = (shader, renderer) => {
        onceki.call(malzeme, shader, renderer);
        shader.vertexShader = `varying vec3 vKatmanDunya; varying vec3 vKatmanNormal;\n${shader.vertexShader}`
          .replace('#include <begin_vertex>', `#include <begin_vertex>
            vKatmanDunya=(modelMatrix*vec4(transformed,1.)).xyz;
            vKatmanNormal=normalize(mat3(modelMatrix)*objectNormal);
          `);
        shader.fragmentShader = `varying vec3 vKatmanDunya; varying vec3 vKatmanNormal;\n${gurultu}\n${katmanli ? sabitler : ''}\n${shader.fragmentShader}`
          .replace('#include <color_fragment>', `#include <color_fragment>\n${katmanli ? katmanKodu : kayaKodu}`);
      };
      malzeme.customProgramCacheKey = () => `${oncekiAnahtar.call(malzeme)}-katman-dokusu-v1-${katmanli ? 'katman' : 'kaya'}`;
      malzeme.needsUpdate = true;
    }
  });
}

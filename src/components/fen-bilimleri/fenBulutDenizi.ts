import * as THREE from 'three';

/**
 * Bulut denizi: dağ kütlesi düz bir vadi zemininde durmaz, bulutların arasından yükselir.
 *
 * Üç yatay bulut katmanı kütlenin eteğini ve uzak vadi tabanını örter. En alttaki katman
 * kapalı ve derinlik yazar (altındaki zemin görünmez); üsttekiler alan alan açılan, tepeleri
 * gürültüyle kabaran yumaklardır. Renk günün saatine uyar: gündüz krem-beyaz, akşam sıcak,
 * gece koyu mavi-gri. Yavaşça sürüklenir; sahne sisiyle uzakta erir. Katman 1'dedir: GTAO ve
 * vadi sisi derinliği hesabına girmez. Şelaleler bu denize girerken solar (fenSelale.ts).
 */
export const BULUT_TABANI = -41.3;
export const BULUT_USTU = -35;

const gurultu = `
  float bd_hash(vec2 p){ p=fract(p*vec2(233.31,171.17)); p+=dot(p,p+23.71); return fract(p.x*p.y); }
  float bd_noise(vec2 p){
    vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
    float a=bd_hash(i), b=bd_hash(i+vec2(1.,0.)), c=bd_hash(i+vec2(0.,1.)), d=bd_hash(i+vec2(1.,1.));
    return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);
  }
  float bd_fbm(vec2 p){ return bd_noise(p)*.5+bd_noise(p*2.01+3.3)*.25+bd_noise(p*4.07+7.9)*.125+bd_noise(p*8.13+1.1)*.0625; }
`;

const vertex = `
  #include <common>
  #include <fog_pars_vertex>
  uniform float uZaman,uYukselti,uKayma,uTohum;
  varying vec2 vDunya;
  ${gurultu}
  void main() {
    vec4 dunya=modelMatrix*vec4(position,1.);
    vec2 q=dunya.xz*.05+vec2(uZaman*uKayma,uZaman*uKayma*.6)+uTohum;
    float n=bd_fbm(q+bd_fbm(q*.45)*.8);
    // Yumaklar yukarı kabarır; düz bir levha gibi durmaz.
    dunya.y+=(n-.45)*uYukselti;
    vDunya=dunya.xz;
    vec4 mvPosition=viewMatrix*dunya;
    gl_Position=projectionMatrix*mvPosition;
    #include <fog_vertex>
  }
`;

const fragment = `
  #include <common>
  #include <fog_pars_fragment>
  uniform float uZaman,uGun,uAksam,uEsik,uYogunluk,uKayma,uTohum,uYaricap;
  varying vec2 vDunya;
  ${gurultu}
  void main() {
    // Ortografik kamerada uzaktaki bulut zemini ekranda dağın üstüne çıkar; deniz belirli bir
    // yarıçapta erir ki gökyüzü ve uzak doruklar görünür kalsın.
    float uzaklik=length(vDunya);
    float kenarErimesi=1.-smoothstep(uYaricap,uYaricap+45.,uzaklik);
    if(kenarErimesi<.01) discard;
    vec2 q=vDunya*.05+vec2(uZaman*uKayma,uZaman*uKayma*.6)+uTohum;
    float sapma=bd_fbm(q*.45)*.8;
    float n=bd_fbm(q+sapma);
    float ince=bd_fbm(q*4.+sapma*2.);
    float ortu=smoothstep(uEsik,uEsik+.26,n+(ince-.5)*.14);
    // Güneşe dönük yamaçlar açık, gölgede kalan çukurlar koyu: kaydırılmış örnekle fark.
    float n2=bd_fbm(q+sapma+vec2(-.09,.06));
    float aydinlik=clamp(.5+(n-n2)*5.,0.,1.);
    aydinlik=mix(aydinlik,1.,.25*ince);
    vec3 gunduzGolge=vec3(.70,.75,.80), gunduzIsik=vec3(1.,.99,.96);
    vec3 geceGolge=vec3(.08,.11,.18), geceIsik=vec3(.28,.33,.44);
    vec3 renk=mix(mix(geceGolge,geceIsik,aydinlik),mix(gunduzGolge,gunduzIsik,aydinlik),uGun);
    renk=mix(renk,vec3(.98,.72,.55)*(.5+.5*aydinlik),uAksam*.45);
    float alfa=ortu*uYogunluk*kenarErimesi;
    if(alfa<.01) discard;
    gl_FragColor=vec4(renk,alfa);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

export class BulutDenizi {
  readonly grup = new THREE.Group();
  private readonly geometri = new THREE.PlaneGeometry(400, 400, 120, 120);

  constructor(zaman: THREE.IUniform<number>, gun: THREE.IUniform<number>, aksam: THREE.IUniform<number>) {
    this.grup.name = 'Vadi · bulut denizi';
    // yükseklik, eşik (-1: kapalı örtü), yoğunluk, kabarma, kayma hızı, tohum, derinlik yazar mı.
    // Bulutlar zemini oluşturur; kütlenin duvarları eteğine kadar görünür kalır.
    const katmanlar: [number, number, number, number, number, number, boolean][] = [
      [BULUT_TABANI, -1, .97, 1.0, .02, 0, true],
      [-39.8, .40, .9, 1.6, .03, 3.7, false],
      [-38.2, .55, .85, 2.0, .045, 8.1, false],
    ];
    katmanlar.forEach(([yukseklik, esik, yogunluk, kabarma, kayma, tohum, derinlik], i) => {
      const malzeme = new THREE.ShaderMaterial({
        uniforms: {
          ...THREE.UniformsUtils.clone(THREE.UniformsLib.fog),
          uZaman: zaman, uGun: gun, uAksam: aksam,
          uEsik: { value: esik }, uYogunluk: { value: yogunluk }, uYukselti: { value: kabarma },
          uKayma: { value: kayma }, uTohum: { value: tohum }, uYaricap: { value: 115 },
        },
        vertexShader: vertex, fragmentShader: fragment,
        transparent: true, depthWrite: derinlik, side: THREE.DoubleSide, fog: true,
      });
      const bulut = new THREE.Mesh(this.geometri, malzeme);
      bulut.name = `Vadi · bulut katmanı ${i + 1}`;
      bulut.rotation.x = -Math.PI / 2;
      bulut.position.set(0, yukseklik, 0);
      bulut.renderOrder = 3;
      bulut.frustumCulled = false;
      bulut.layers.set(1);
      this.grup.add(bulut);
    });
  }

  dispose() {
    this.grup.traverse((nesne) => {
      if (nesne instanceof THREE.Mesh) (nesne.material as THREE.Material).dispose();
    });
    this.geometri.dispose();
    this.grup.removeFromParent();
  }
}

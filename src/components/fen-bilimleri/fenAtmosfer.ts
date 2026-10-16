import * as THREE from 'three';

const vertex = `
varying vec3 vYerel;
varying vec4 vEkran;
void main() {
  vYerel = position;
  vEkran = projectionMatrix * modelViewMatrix * vec4(position, 1.);
  gl_Position = vEkran;
}`;

// Integrate a soft density field inside a real world-space box. The box never
// draws a surface: its six faces merely bound the ray's path through the mist.
const fragment = `
varying vec3 vYerel;
varying vec4 vEkran;
uniform vec3 uYon, uBoyut;
uniform float uZaman, uGun, uYogunluk, uTohum, uKenar;
uniform sampler2D uDerinlik;
uniform float uYakin, uUzak;
float yumak(vec3 p, vec3 merkez, vec3 boyut) {
  vec3 q=(p-merkez)/boyut;
  return exp(-dot(q,q)*2.6);
}
float yogunluk(vec3 p) {
  p.x+=sin(uZaman*.035+uTohum)*.035;
  p.z+=cos(uZaman*.027+uTohum)*.04;
  float d=yumak(p,vec3(-.22,-.02,.03),vec3(.33,.27,.36));
  d+=yumak(p,vec3(.08,.06,-.07),vec3(.36,.32,.30))*.85;
  d+=yumak(p,vec3(.31,-.08,.08),vec3(.23,.21,.33))*.7;
  float detail=.86+.14*sin(p.x*19.+p.z*13.+uTohum+uZaman*.05);
  vec3 bord=1.-smoothstep(vec3(.35),vec3(.49),abs(p));
  return d*detail*bord.x*bord.y*bord.z;
}
void main() {
  vec3 yon=normalize(uYon/uBoyut);
  vec3 bas=vYerel-yon*2.;
  vec3 ters=1./(yon+vec3(.000001));
  vec3 t0=(-vec3(.5)-bas)*ters, t1=(vec3(.5)-bas)*ters;
  vec3 giris=min(t0,t1), cikis=max(t0,t1);
  float ilk=max(giris.x,max(giris.y,giris.z));
  float son=min(cikis.x,min(cikis.y,cikis.z));
  float uzunluk=length(yon*uBoyut);
  vec3 ekranNdc=vEkran.xyz/vEkran.w;
  float araziDerinligi=mix(uYakin,uUzak,texture2D(uDerinlik,ekranNdc.xy*.5+.5).r);
  float arkaDerinlik=mix(uYakin,uUzak,ekranNdc.z*.5+.5);
  son=min(son,2.+(araziDerinligi-arkaDerinlik)/uzunluk);
  if(son<=ilk) discard;
  float adim=max(0.,son-ilk)/24.;
  float toplam=0.;
  for(int i=0;i<24;i++) {
    vec3 p=bas+yon*(ilk+(float(i)+.5)*adim);
    toplam+=yogunluk(p)*adim;
  }
  vec2 ekran=abs(vEkran.xy/vEkran.w);
  // Keep the central campus readable. This only fades physical volumes; it
  // never creates a screen-space vignette or follows the camera position.
  float kenar=smoothstep(.42,.94,max(ekran.x,ekran.y));
  float kose=mix(.65,1.,smoothstep(.15,.75,min(ekran.x,ekran.y)));
  float gorunurluk=mix(1.,kenar*kose,uKenar);
  float alfa=(1.-exp(-toplam*uzunluk*uYogunluk))*gorunurluk;
  if(alfa<.003) discard;
  vec3 renk=mix(vec3(.10,.17,.24),vec3(.83,.9,.88),uGun);
  renk*=.93+.07*smoothstep(-.3,.3,vYerel.y);
  gl_FragColor=vec4(renk,min(alfa,.63));
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

function matrislerYakin(a: THREE.Matrix4, b: THREE.Matrix4, tolerans: number): boolean {
  const ae = a.elements;
  const be = b.elements;
  for (let i = 0; i < 16; i += 1) if (Math.abs(ae[i] - be[i]) > tolerans) return false;
  return true;
}

export class VadiSisi {
  readonly grup = new THREE.Group();
  private readonly yon = { value: new THREE.Vector3(0, -1, -1).normalize() };
  private readonly derinlik = new THREE.WebGLRenderTarget(1, 1, {
    depthTexture: new THREE.DepthTexture(1, 1, THREE.UnsignedIntType),
    minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
  });
  private readonly derinlikMalzemesi = new THREE.MeshDepthMaterial();
  private readonly sonKamera = new THREE.Matrix4();
  private readonly sonProjeksiyon = new THREE.Matrix4();
  private readonly boyut = new THREE.Vector2();
  private readonly yakin = { value: .1 };
  private readonly uzak = { value: 700 };
  private kirli = true;

  constructor(zaman: { value: number }, gun: { value: number }) {
    this.grup.name = 'Vadi · dünya uzayında hacimsel sis';
    // x, y, z, width, height, depth, density, edge-only visibility.
    // Only the rim volumes remain: the canyon-floor wisps read as a drifting pale rock
    // between the walls, and the waterfall-base mist now sits inside the cloud sea.
    const kumeler = [
      [-34, 2.5, 27, 27, 8, 19, .105, 1],
      [-39, 4, -15, 24, 8, 24, .10, 1],
      [34, 3.5, 26, 29, 8, 22, .105, 1],
      [40, 5, -19, 25, 9, 23, .10, 1],
      [-23, 10, -39, 29, 8, 18, .11, 1],
      [22, 10, -40, 31, 9, 20, .10, 1],
      [-37, -14, 50, 25, 10, 17, .11, 1],
      [25, -11, 51, 31, 9, 19, .10, 1],
    ];
    const geometri = new THREE.BoxGeometry(1, 1, 1);
    kumeler.forEach(([x, y, z, en, boy, derinlik, yogunluk, kenar], i) => {
      const malzeme = new THREE.ShaderMaterial({
        uniforms: {
          uZaman: zaman, uGun: gun, uYon: this.yon,
          uBoyut: { value: new THREE.Vector3(en, boy, derinlik) },
          uYogunluk: { value: yogunluk }, uTohum: { value: i * 2.37 },
          uKenar: { value: kenar },
          uDerinlik: { value: this.derinlik.depthTexture },
          uYakin: this.yakin, uUzak: this.uzak,
        },
        vertexShader: vertex, fragmentShader: fragment,
        transparent: true, depthWrite: false, depthTest: false,
        side: THREE.BackSide,
      });
      const sis = new THREE.Mesh(geometri, malzeme);
      sis.name = `Vadi · hacimsel sis ${i + 1}`;
      sis.position.set(x, y, z);
      sis.scale.set(en, boy, derinlik);
      sis.layers.set(1);
      this.grup.add(sis);
    });
  }

  yenile() { this.kirli = true; }

  guncelle(renderer: THREE.WebGLRenderer, sahne: THREE.Scene, kamera: THREE.OrthographicCamera) {
    kamera.updateMatrixWorld();
    kamera.getWorldDirection(this.yon.value);
    renderer.getSize(this.boyut);
    if (this.derinlik.width !== this.boyut.x || this.derinlik.height !== this.boyut.y) {
      this.derinlik.setSize(this.boyut.x, this.boyut.y);
      this.kirli = true;
    }
    if (!this.kirli && matrislerYakin(this.sonKamera, kamera.matrixWorld, 1e-4) && matrislerYakin(this.sonProjeksiyon, kamera.projectionMatrix, 1e-6)) return;
    this.yakin.value = kamera.near;
    this.uzak.value = kamera.far;
    const oncekiMalzeme = sahne.overrideMaterial;
    const oncekiKatman = kamera.layers.mask;
    const oncekiHedef = renderer.getRenderTarget();
    // Only static model geometry writes this depth map. Cache it while the
    // camera rests, so animated mist never doubles the model's draw cost.
    kamera.layers.set(0);
    sahne.overrideMaterial = this.derinlikMalzemesi;
    renderer.setRenderTarget(this.derinlik);
    renderer.render(sahne, kamera);
    renderer.setRenderTarget(oncekiHedef);
    sahne.overrideMaterial = oncekiMalzeme;
    kamera.layers.mask = oncekiKatman;
    this.sonKamera.copy(kamera.matrixWorld);
    this.sonProjeksiyon.copy(kamera.projectionMatrix);
    this.kirli = false;
  }

  dispose() {
    this.derinlik.dispose();
    this.derinlikMalzemesi.dispose();
  }
}

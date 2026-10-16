import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';

function matrislerYakin(a: THREE.Matrix4, b: THREE.Matrix4, tolerans: number): boolean {
  const ae = a.elements;
  const be = b.elements;
  for (let i = 0; i < 16; i += 1) if (Math.abs(ae[i] - be[i]) > tolerans) return false;
  return true;
}

/** Static opaque geometry supplies AO; animated atmosphere stays in the beauty pass. */
class TemasGecisi extends GTAOPass {
  private readonly gizlenenler = new Map<THREE.Object3D, boolean>();
  private readonly sonKamera = new THREE.Matrix4();
  private readonly sonProjeksiyon = new THREE.Matrix4();
  private sonKatman = -1;
  private kirli = true;

  constructor(sahne: THREE.Scene, kamera: THREE.OrthographicCamera) {
    super(sahne, kamera, 1, 1);
    this.blendIntensity = .4;
    this.updateGtaoMaterial({ radius: .85, thickness: .65, samples: 8, screenSpaceRadius: false });
    this.updatePdMaterial({ samples: 16, radius: 4, rings: 2 });
  }

  yenile() { this.kirli = true; }

  override setSize(genislik: number, yukseklik: number) {
    // AO does not need the MSAA beauty buffer's full device-pixel resolution.
    const en = Math.max(1, Math.floor(genislik * .5));
    const boy = Math.max(1, Math.floor(yukseklik * .5));
    if (this.width === en && this.height === boy) return;
    super.setSize(en, boy);
    this.yenile();
  }

  override overrideVisibility() {
    this.scene.traverse((nesne) => {
      const malzemeler = nesne instanceof THREE.Mesh
        ? (Array.isArray(nesne.material) ? nesne.material : [nesne.material])
        : [];
      const saydam = malzemeler.some((malzeme) => malzeme.transparent || malzeme.opacity < 1
        || (malzeme instanceof THREE.MeshPhysicalMaterial && malzeme.transmission > 0));
      if (nesne.layers.isEnabled(1) || saydam || nesne instanceof THREE.Points || nesne instanceof THREE.Line) {
        this.gizlenenler.set(nesne, nesne.visible);
        nesne.visible = false;
      }
    });
  }

  override restoreVisibility() {
    for (const [nesne, gorunur] of this.gizlenenler) nesne.visible = gorunur;
    this.gizlenenler.clear();
  }

  override renderOverride(
    renderer: THREE.WebGLRenderer,
    malzeme: THREE.MeshNormalMaterial,
    hedef: THREE.WebGLRenderTarget | null,
    temizRenk?: THREE.ColorRepresentation,
    temizAlfa?: number,
  ) {
    const oncekiKatman = this.camera.layers.mask;
    const oncekiMalzeme = this.scene.overrideMaterial;
    const oncekiGolge = renderer.shadowMap.autoUpdate;
    const oncekiGolgeKirli = renderer.shadowMap.needsUpdate;
    const oncekiHedef = renderer.getRenderTarget();
    const oncekiTemizleme = renderer.autoClear;
    const oncekiRenk = renderer.getClearColor(new THREE.Color());
    const oncekiAlfa = renderer.getClearAlpha();
    try {
      this.camera.layers.mask &= ~(1 << 1);
      // A normal pass must never consume a pending daylight shadow update.
      renderer.shadowMap.autoUpdate = false;
      renderer.shadowMap.needsUpdate = false;
      super.renderOverride(renderer, malzeme, hedef, temizRenk, temizAlfa);
    } finally {
      this.camera.layers.mask = oncekiKatman;
      this.scene.overrideMaterial = oncekiMalzeme;
      renderer.shadowMap.autoUpdate = oncekiGolge;
      renderer.shadowMap.needsUpdate = oncekiGolgeKirli;
      renderer.autoClear = oncekiTemizleme;
      renderer.setClearColor(oncekiRenk, oncekiAlfa);
      renderer.setRenderTarget(oncekiHedef);
    }
  }

  override render(
    renderer: THREE.WebGLRenderer,
    yazma: THREE.WebGLRenderTarget,
    okuma: THREE.WebGLRenderTarget,
    adim: number,
    maske: boolean,
  ) {
    this.camera.updateMatrixWorld();
    // Kamera sönümlemesinin kuyruğu ve kayan nokta gürültüsü gibi göz ile seçilemeyen
    // değişimler AO'yu yeniden hesaplatmaz: düz zeminlerde kaynayan bir gölge deseni olmaz.
    const degisti = this.kirli || this.sonKatman !== this.camera.layers.mask
      || !matrislerYakin(this.sonKamera, this.camera.matrixWorld, 1e-4)
      || !matrislerYakin(this.sonProjeksiyon, this.camera.projectionMatrix, 1e-6);

    if (degisti) {
      try {
        super.render(renderer, yazma, okuma, adim, maske);
      } finally {
        // Also restore visibility if a render fails before GTAOPass restores it.
        this.restoreVisibility();
      }
      this.sonKamera.copy(this.camera.matrixWorld);
      this.sonProjeksiyon.copy(this.camera.projectionMatrix);
      this.sonKatman = this.camera.layers.mask;
      this.kirli = false;
      return;
    }

    // Public GTAOPass materials compose its cached, denoised AO with this frame's
    // beauty image. No private G-buffer flags or render-target internals are used.
    const hedef = this.renderToScreen ? null : yazma;
    this.copyMaterial.uniforms.tDiffuse.value = okuma.texture;
    this.copyMaterial.blending = THREE.NoBlending;
    this.renderPass(renderer, this.copyMaterial, hedef);
    this.blendMaterial.uniforms.intensity.value = this.blendIntensity;
    this.blendMaterial.uniforms.tDiffuse.value = this.gtaoMap;
    this.renderPass(renderer, this.blendMaterial, hedef);
  }

  override dispose() {
    this.restoreVisibility();
    super.dispose();
    // Three r170's GTAOPass.dispose omits these two owned materials.
    this.gtaoMaterial.dispose();
    this.blendMaterial.dispose();
  }
}

/** Doğrusal doygunluk çarpanı; posteri_render.py'deki kompozitör düğümüyle aynı tutulur. */
export const DOYGUNLUK = 1.22;

export class FenGorunum {
  /** The final linear-HDR output shader; callers may customize its AgX look. */
  readonly ciktiMalzemesi: THREE.ShaderMaterial;
  private readonly besteci: EffectComposer;
  private readonly guzellik: RenderPass;
  private readonly temas: TemasGecisi;
  private readonly cikti: OutputPass;
  private birakildi = false;

  constructor(
    private readonly renderer: THREE.WebGLRenderer,
    sahne: THREE.Scene,
    kamera: THREE.OrthographicCamera,
  ) {
    const hedef = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType,
      samples: Math.min(4, renderer.capabilities.maxSamples),
      depthBuffer: true,
      stencilBuffer: false,
    });
    hedef.texture.name = 'Fen · MSAA güzellik';
    this.besteci = new EffectComposer(renderer, hedef);
    this.guzellik = new RenderPass(sahne, kamera);
    this.temas = new TemasGecisi(sahne, kamera);
    this.cikti = new OutputPass();
    this.ciktiMalzemesi = this.cikti.material;
    // Match the poster's AgX Medium High Contrast step in normalized log space.
    // OCIO's 0.4 pivot in Blender's 25-EV range becomes 10/16.5 here (18% grey).
    // Keep this shader local: changing THREE.ShaderChunk would affect other pages.
    const agx = THREE.ShaderChunk.tonemapping_pars_fragment.replace(
      'color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );',
      `color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
       color = (color - vec3(0.606060614)) * 1.2 + vec3(0.606060614);`,
    );
    // Renk canlılığı: ton eşlemeden önce, doğrusal uzayda doygunluk çarpanı. Poster aynı çarpanı
    // Blender kompozitöründe (Hue/Saturation düğümü, görünüm dönüşümünden önce) uygular.
    this.ciktiMalzemesi.uniforms.uDoygunluk = { value: DOYGUNLUK };
    this.ciktiMalzemesi.fragmentShader = this.ciktiMalzemesi.fragmentShader
      .replace('#include <tonemapping_pars_fragment>', agx)
      .replace('uniform sampler2D tDiffuse;', 'uniform sampler2D tDiffuse;\nuniform float uDoygunluk;')
      .replace(
        'gl_FragColor = texture2D( tDiffuse, vUv );',
        `gl_FragColor = texture2D( tDiffuse, vUv );
      gl_FragColor.rgb = max( mix( vec3( dot( gl_FragColor.rgb, vec3( .2126, .7152, .0722 ) ) ), gl_FragColor.rgb, uDoygunluk ), 0.0 );`,
      );
    this.besteci.addPass(this.guzellik);
    this.besteci.addPass(this.temas);
    this.besteci.addPass(this.cikti);
    const boyut = renderer.getSize(new THREE.Vector2());
    this.boyutlandir(boyut.x, boyut.y);
  }

  boyutlandir(genislik: number, yukseklik: number) {
    if (this.birakildi) return;
    this.besteci.setPixelRatio(this.renderer.getPixelRatio());
    this.besteci.setSize(Math.max(1, genislik), Math.max(1, yukseklik));
    this.yenile();
  }

  /** Call after loading, adding, moving, hiding or editing opaque model geometry. */
  yenile() { this.temas.yenile(); }

  render() {
    if (!this.birakildi) this.besteci.render(0);
  }

  dispose() {
    if (this.birakildi) return;
    this.birakildi = true;
    this.temas.dispose();
    this.guzellik.dispose();
    this.cikti.dispose();
    this.besteci.dispose();
  }
}

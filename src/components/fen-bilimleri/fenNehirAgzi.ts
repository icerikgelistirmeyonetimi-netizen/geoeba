import * as THREE from 'three';

const TABAN_Y = -7.78;
const BASLANGIC = -.5;
const IC_YARI_GENISLIK = 1.15;
const DIS_YARI_GENISLIK = 1.9;
const oyulanGeometriler = new WeakSet<THREE.BufferGeometry>();

// The outlets also cut through the rolled meadow shoulder that now wraps the rim
// (about one unit beyond the top grid), so each channel reaches a little further.
const CIKISLAR = [
  { son: new THREE.Vector2(-24, 45), akis: new THREE.Vector2(-.426, .905), bitis: 3.8 },
  { son: new THREE.Vector2(50, 23), akis: new THREE.Vector2(15, 9), bitis: 5 },
].map(({ son, akis, bitis }) => {
  akis.normalize();
  const yan = new THREE.Vector2(-akis.y, akis.x);
  const bolge = new THREE.Box3();
  for (const t of [BASLANGIC, bitis]) {
    for (const genislik of [-DIS_YARI_GENISLIK, DIS_YARI_GENISLIK]) {
      bolge.expandByPoint(new THREE.Vector3(
        son.x + akis.x * t + yan.x * genislik,
        TABAN_Y,
        son.y + akis.y * t + yan.y * genislik,
      ));
    }
  }
  bolge.max.y = Infinity;
  return { son, akis, yan, bitis, bolge };
});

function yumusakGecis(alt: number, ust: number, deger: number): number {
  const t = THREE.MathUtils.clamp((deger - alt) / (ust - alt), 0, 1);
  return t * t * (3 - 2 * t);
}

function araziMalzemesi(malzeme: THREE.Material): boolean {
  const ad = malzeme.name
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i');
  // The exported vertex-colored meadow and the rolled shoulder meadow have
  // descriptive material names; all other allowed names are the keys used by dag_arazisi.py.
  return /(?:^|[\s·_])(?:grass|cliff\d*|canyon_stratum\d*|canyon_bedding|omuz)(?:$|[\s.])/.test(ad)
    || ad === 'dag · yumusak cayir tonlari';
}

/**
 * Opens the short southern and eastern outlets in the loaded GLB only.
 * Blender (x, y, z) becomes Three (x, z, -y); the source scene stays intact.
 * The stream ends are (-24, -7.55, 45) and (50, -7.55, 23), behind rock lips.
 */
export function nehirAgziniAc(kok: THREE.Object3D): void {
  const cevre = kok.name === 'environment' ? kok : kok.getObjectByName('environment');
  if (!cevre) return;
  cevre.updateWorldMatrix(true, true);

  const dunyaKutusu = new THREE.Box3();
  const nokta = new THREE.Vector3();
  const tersDonusum = new THREE.Matrix4();

  cevre.traverse((nesne) => {
    if (!(nesne instanceof THREE.Mesh)) return;
    const kaynak = nesne.geometry as THREE.BufferGeometry;
    if (oyulanGeometriler.has(kaynak)) return;
    const malzemeler = Array.isArray(nesne.material) ? nesne.material : [nesne.material];
    if (!malzemeler.length || !malzemeler.every(araziMalzemesi)) return;
    const konumlar = kaynak.getAttribute('position');
    if (!konumlar || konumlar.itemSize !== 3) return;
    if (!kaynak.boundingBox) kaynak.computeBoundingBox();
    if (!kaynak.boundingBox) return;
    dunyaKutusu.copy(kaynak.boundingBox).applyMatrix4(nesne.matrixWorld);
    const uygunCikislar = CIKISLAR.filter(({ bolge }) => dunyaKutusu.intersectsBox(bolge));
    if (!uygunCikislar.length) return;
    tersDonusum.copy(nesne.matrixWorld).invert();

    let geometri: THREE.BufferGeometry | null = null;
    for (let i = 0; i < konumlar.count; i += 1) {
      nokta.fromBufferAttribute(konumlar, i).applyMatrix4(nesne.matrixWorld);
      if (nokta.y <= TABAN_Y) continue; // Never raise the riverbed or lower cliffs.
      let indirmeOrani = 0;
      for (const { son, akis, yan, bitis } of uygunCikislar) {
        const dx = nokta.x - son.x;
        const dz = nokta.z - son.y;
        const ilerleme = dx * akis.x + dz * akis.y;
        const yanal = Math.abs(dx * yan.x + dz * yan.y);
        if (ilerleme <= BASLANGIC || ilerleme >= bitis || yanal >= DIS_YARI_GENISLIK) continue;
        const kenar = 1 - yumusakGecis(IC_YARI_GENISLIK, DIS_YARI_GENISLIK, yanal);
        const boyuna = yumusakGecis(BASLANGIC, 0, ilerleme)
          * (1 - yumusakGecis(bitis - .4, bitis, ilerleme));
        indirmeOrani = Math.max(indirmeOrani, kenar * boyuna);
      }
      const yeniY = THREE.MathUtils.lerp(nokta.y, TABAN_Y, indirmeOrani);
      if (nokta.y - yeniY <= 1e-6) continue;

      // Each edited mesh owns its copy, including when GLTFLoader reused a
      // geometry elsewhere. Untouched meshes keep their original GPU buffers.
      if (!geometri) geometri = kaynak.clone();
      nokta.y = Math.min(nokta.y, yeniY);
      nokta.applyMatrix4(tersDonusum);
      geometri.getAttribute('position').setXYZ(i, nokta.x, nokta.y, nokta.z);
    }
    if (!geometri) return;
    geometri.getAttribute('position').needsUpdate = true;
    geometri.computeVertexNormals();
    geometri.computeBoundingBox();
    geometri.computeBoundingSphere();
    oyulanGeometriler.add(geometri);
    nesne.geometry = geometri;
  });
}

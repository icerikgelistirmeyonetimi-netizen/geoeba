import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { DEFAULT_STYLE_SETTINGS } from '@/types/workspace';
import { ACIK_TEMA_3B, etiketOlcusu3B, noktaAdiBoslugu, noktaAdiCizimi, type EtiketBilgisi3B } from '../etiket3B';
import { noktalariOlcekle3B, noktaYaricapiPx, type NoktaBoyutu3B } from '../noktaBoyutu3B';

function kamera(yukseklik: number, uzaklik: number, donuk = false) {
  const camera = new THREE.PerspectiveCamera(40, 1280 / yukseklik, 0.1, 4000);
  camera.position.copy(donuk ? new THREE.Vector3(2, -3, 4).normalize().multiplyScalar(uzaklik) : new THREE.Vector3(0, 0, uzaklik));
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld(true);
  return { camera, forward: camera.getWorldDirection(new THREE.Vector3()) };
}

function nokta(yaricapPx: number, position = new THREE.Vector3(), gizli = false) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), new THREE.MeshBasicMaterial({ visible: !gizli }));
  mesh.position.copy(position);
  mesh.userData.noktaBoyutu3B = { yaricapPx } satisfies NoktaBoyutu3B;
  return mesh;
}

function ekrandakiYaricap(mesh: THREE.Mesh, camera: THREE.PerspectiveCamera, yukseklik: number) {
  const merkez = mesh.getWorldPosition(new THREE.Vector3());
  const ust = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion).multiplyScalar(mesh.scale.x).add(merkez);
  return Math.abs(ust.project(camera).y - merkez.project(camera).y) * yukseklik / 2;
}

describe('3B matematik noktalarının boyutu', () => {
  it.each([
    [360, 4, false], [720, 12, false], [1080, 40, false],
    [360, 4, true], [720, 12, true], [1080, 40, true],
  ] as const)('%i px tuvalde, %i birim kamera uzaklığında ve dönük=%s iken noktalar aynı ekran boyunda kalır', (yukseklik, uzaklik, donuk) => {
    const { camera, forward } = kamera(yukseklik, uzaklik, donuk);
    const root = new THREE.Group();
    const noktalar = [-0.4, 0, 1.5].map((derinlik) => nokta(6, forward.clone().multiplyScalar(uzaklik * derinlik)));
    root.add(...noktalar);
    noktalariOlcekle3B(root, camera, forward, yukseklik);
    for (const mesh of noktalar) expect(ekrandakiYaricap(mesh, camera, yukseklik)).toBeCloseTo(6, 9);
  });

  it('yakınlaştırma ve tuval boyutu değiştiğinde mevcut noktaları yeniden dengeler', () => {
    const root = new THREE.Group();
    const mesh = nokta(6);
    root.add(mesh);
    for (const [yukseklik, uzaklik] of [[720, 40], [720, 4], [1080, 4], [360, 12]]) {
      const { camera, forward } = kamera(yukseklik, uzaklik);
      noktalariOlcekle3B(root, camera, forward, yukseklik);
      expect(ekrandakiYaricap(mesh, camera, yukseklik)).toBeCloseTo(6, 9);
    }
  });

  it('özel nokta boyutu, genel boyut ve seçili durum 2B ile aynı görünür', () => {
    const { camera, forward } = kamera(720, 10);
    const root = new THREE.Group();
    const ayarlar = [
      { size: undefined, genel: DEFAULT_STYLE_SETTINGS.pointRadius, secili: false, beklenen: 6 },
      { size: undefined, genel: 9, secili: false, beklenen: 9 },
      { size: 4, genel: 9, secili: false, beklenen: 4 },
      { size: 4, genel: 9, secili: true, beklenen: 5.5 },
      { size: 0, genel: 6, secili: true, beklenen: 7.5 },
    ];
    for (const ayar of ayarlar) {
      const mesh = nokta(noktaYaricapiPx(ayar.size, ayar.genel, ayar.secili));
      root.add(mesh);
      noktalariOlcekle3B(root, camera, forward, 720);
      expect(ekrandakiYaricap(mesh, camera, 720)).toBeCloseTo(ayar.beklenen, 9);
    }
  });

  it.each([4, 40])('kamera %i birim uzaktayken küçük noktanın çevresindeki görünmez seçim alanına tıklanabilir', (uzaklik) => {
    const { camera, forward } = kamera(720, uzaklik);
    const root = new THREE.Group();
    const gorunur = nokta(6);
    const secim = nokta(12, new THREE.Vector3(), true);
    root.add(gorunur, secim);
    noktalariOlcekle3B(root, camera, forward, 720);
    root.updateMatrixWorld(true);
    const ray = new THREE.Raycaster();
    // Nokta merkezinden 9 CSS piksel uzaktaki tıklama, görünür kürenin dışındadır.
    ray.setFromCamera(new THREE.Vector2(9 * 2 / 1280, 0), camera);
    expect(ray.intersectObject(gorunur)).toHaveLength(0);
    expect(ray.intersectObject(secim).length).toBeGreaterThan(0);
    // Seçim alanının dışı komşu noktaları gereksiz yere yakalamaz.
    ray.setFromCamera(new THREE.Vector2(16 * 2 / 1280, 0), camera);
    expect(ray.intersectObject(secim)).toHaveLength(0);
  });

  it('nokta adı için ayrılan boşluk yakınlaştırırken küreyle birlikte korunur', () => {
    const root = new THREE.Group();
    const mesh = nokta(6);
    const etiket: EtiketBilgisi3B = {
      anahtar: 'A', tur: 'noktaAdi',
      olcu: etiketOlcusu3B(noktaAdiCizimi('A', DEFAULT_STYLE_SETTINGS, ACIK_TEMA_3B)),
      capa: { tur: 'noktaSagUst', dunyaYaricapi: 0.25 },
    };
    (mesh.userData.noktaBoyutu3B as NoktaBoyutu3B).etiket = etiket;
    root.add(mesh);
    for (const uzaklik of [4, 40]) {
      const { camera, forward } = kamera(720, uzaklik);
      noktalariOlcekle3B(root, camera, forward, 720);
      const dunyaBirimiPx = new THREE.Vector3(0, 1, 0).project(camera).y * 720 / 2;
      if (etiket.capa.tur !== 'noktaSagUst') throw new Error('Nokta etiketi bekleniyordu.');
      expect(noktaAdiBoslugu(etiket.capa.dunyaYaricapi, dunyaBirimiPx)).toBeCloseTo(10, 9);
    }
  });
});

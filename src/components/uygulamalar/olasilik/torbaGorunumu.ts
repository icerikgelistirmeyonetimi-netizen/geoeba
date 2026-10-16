import * as THREE from 'three';
import type { Sablon } from './olasilik';

type TorbaSablonu = Extract<Sablon, { tur: 'torba' }>;

/** Boş torba sıfır kalır; yeniden doldurmayı yalnız deney modeli yönetir. */
export function torbaGorunenAdetleri(sablon: TorbaSablonu, kalan?: readonly number[]): number[] {
  const baslangic = sablon.bilyeler.map((b) => Math.max(0, Math.trunc(b.adet)));
  if (sablon.iadeli || !kalan || kalan.length !== baslangic.length) return baslangic;
  return baslangic.map((adet, i) => Math.min(adet, Math.max(0, Math.trunc(kalan[i]))));
}

/** Bilyeler çekildikçe saklanır; kalanların konumları ve animasyon korunur. */
export function torbaBilyeleriniKur(sablon: TorbaSablonu): THREE.Group {
  const grup = new THREE.Group();
  const bilyeler = sablon.bilyeler.flatMap((b, renk) => Array.from({ length: Math.max(0, Math.trunc(b.adet)) }, (_, sira) => ({ ...b, renkIndeksi: renk, sira })));
  if (!bilyeler.length) return grup;
  const sutun = Math.max(2, Math.ceil(Math.cbrt(bilyeler.length) * 1.3));
  const aralik = 0.92 / sutun;
  const geometri = new THREE.SphereGeometry(Math.min(0.14, aralik * 0.43), 20, 14);
  const malzemeler = new Map<number, THREE.MeshStandardMaterial>();
  bilyeler.forEach((b, i) => {
    let malzeme = malzemeler.get(b.renkIndeksi);
    if (!malzeme) {
      malzeme = new THREE.MeshStandardMaterial({ color: b.renk, roughness: 0.3 });
      malzemeler.set(b.renkIndeksi, malzeme);
    }
    const bilye = new THREE.Mesh(geometri, malzeme);
    bilye.position.set((i % sutun - (sutun - 1) / 2) * aralik, 0.17 + Math.floor(i / (sutun * sutun)) * aralik, (Math.floor(i / sutun) % sutun - (sutun - 1) / 2) * aralik);
    bilye.userData.renkIndeksi = b.renkIndeksi;
    bilye.userData.sira = b.sira;
    grup.add(bilye);
  });
  return grup;
}

export function torbaBilyeleriniGuncelle(grup: THREE.Group, adetler: readonly number[]): void {
  for (const bilye of grup.children) bilye.visible = bilye.userData.sira < (adetler[bilye.userData.renkIndeksi] ?? 0);
}

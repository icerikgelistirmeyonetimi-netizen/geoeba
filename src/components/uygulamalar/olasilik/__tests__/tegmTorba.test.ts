import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { DeneySahnesi } from '../deneySahnesi';
import { OLAY_KARTLARI } from '../olayKartlari';

describe('olay kartlarının şeffaf torbası', () => {
  for (const kart of OLAY_KARTLARI.filter((k) => k.sablon.tur === 'torba')) {
    it(`${kart.id}: gerçek bilye renkleri ve adetleri torbanın içinde görünür`, () => {
      const sahne = { nesneler: new THREE.Group(), sablon: kart.sablon, kese: null as THREE.Mesh | null, temasGolgesi: () => new THREE.Group() };
      Reflect.get(DeneySahnesi.prototype, 'torbaKur').call(sahne);
      const malzeme = sahne.kese!.material as THREE.MeshPhysicalMaterial;
      expect(malzeme.transparent).toBe(true);
      expect(malzeme.opacity).toBeLessThan(.25);
      expect(malzeme.depthWrite).toBe(false);
      if (kart.sablon.tur !== 'torba') return;
      const renkler: string[] = [];
      sahne.kese!.traverse((b) => {
        if (b instanceof THREE.Mesh && b.geometry instanceof THREE.SphereGeometry && b.visible) {
          renkler.push('#' + (b.material as THREE.MeshStandardMaterial).color.getHexString());
        }
      });
      for (const b of kart.sablon.bilyeler) expect(renkler.filter((r) => r.toLowerCase() === b.renk.toLowerCase())).toHaveLength(b.adet);
      sahne.nesneler.traverse((nesne) => { if (nesne instanceof THREE.Mesh) { nesne.geometry.dispose(); const m = nesne.material; for (const item of Array.isArray(m) ? m : [m]) item.dispose(); } });
    });
  }
});

import * as THREE from 'three';
import { pikselBasinaBirim } from '@/math/yapisma3d';
import type { EtiketBilgisi3B } from './etiket3B';

export interface NoktaBoyutu3B {
  yaricapPx: number;
  etiket?: EtiketBilgisi3B;
}

/** 2B tuvalle aynı nokta boyutu; seçim işareti yalnızca biraz büyür. */
export function noktaYaricapiPx(size: number | undefined, varsayilan: number, secili: boolean): number {
  return (size || varsayilan) + (secili ? 1.5 : 0);
}

const dunyaKonumu = new THREE.Vector3();

/**
 * Birim küre biçimindeki nokta işaretçilerini ekran pikseliyle boyutlandırır.
 * Her noktanın kendi derinliği kullanılır: kamera dönerken veya yakınlaşırken
 * öndeki noktalar büyümez, arkadakiler seçilemeyecek kadar küçülmez.
 * Noktaların kapsayıcı grupları ölçeklenmemiştir.
 */
export function noktalariOlcekle3B(
  root: THREE.Object3D,
  camera: THREE.PerspectiveCamera,
  forward: THREE.Vector3,
  height: number
): void {
  if (!(height > 0) || !Number.isFinite(height)) return;
  root.traverse((object) => {
    const bilgi = object.userData.noktaBoyutu3B as NoktaBoyutu3B | undefined;
    if (!bilgi || !(object as THREE.Mesh).isMesh) return;
    object.getWorldPosition(dunyaKonumu);
    const birimPx = pikselBasinaBirim(camera.position, forward, dunyaKonumu, height, camera.fov);
    const yaricap = bilgi.yaricapPx / birimPx;
    object.scale.setScalar(yaricap);
    if (bilgi.etiket?.capa.tur === 'noktaSagUst') {
      bilgi.etiket.capa.dunyaYaricapi = yaricap;
    }
  });
}

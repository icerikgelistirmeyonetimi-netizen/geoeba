import * as THREE from 'three';
import { fenKimligi, type FenKimligi } from './fenVerisi';

/**
 * Yapıların döndürülebilir parçaları: `fen_ortak.donen_grup` ile Blender'da kendi alt köküne
 * alınan, `web_aktar.py`'nin ayrı düğüm olarak aktardığı modeller. Düğümün konumu dönme
 * pivotudur; `eksen` extras alanı Three.js koordinatındaki dönme eksenidir.
 *
 * - `grade_4_dunya`: 4. sınıfın jeolojik küresi kutup ekseninde döner.
 * - `grade_5_kubbe`: gözlemevinin kubbesi (panel, saçak, kapak rayları) döner tablada ağır döner.
 * - `grade_6_gunes_sistemi`: pirinç güneş sistemi modelinin yörünge ve gezegenleri güneş
 *   çevresinde döner.
 * - `grade_7_atom`: atom modelinin yörünge, elektron ve çekirdeği döner.
 * - `grade_8_dna`: çift sarmal kendi ekseninde döner.
 *
 * Bu parçalar fare yapının üzerine gelince (ya da yapı seçiliyken) yumuşakça hızlanır, fare
 * ayrılınca yavaşlayarak durur. Laboratuvardaki mikroskop ise kendi kendine, arada bir kısa bir
 * "objektif değiştir, odakla" oyunu oynar (`LAB_taret`, `LAB_odak`).
 *
 * Parçalar hayvanlar gibi 1. katmandadır: önbelleklenen GTAO ve sis derinliği onları görmez,
 * dolayısıyla dönerken AO yeniden hesaplanmaz (üzerine gelince kare hızı düşmez). Gölge
 * düşürmeye devam ederler; sahne, hareket ettikleri karelerde duragan gölge haritasını seyrek
 * aralıklarla tazeler (`guncelle` hareketi `true` döndürerek bildirir).
 */

/** Yapı parçalarının etkinken ulaştığı açısal hız (rad/sn). */
const HIZLAR: Record<string, number> = {
  grade_4_dunya: .9,
  grade_5_kubbe: .3,
  grade_6_gunes_sistemi: .6,
  grade_7_atom: 1.2,
  grade_8_dna: .8,
};
const VARSAYILAN_HIZ = .7;
/** Hızlanma ve yavaşlama zaman sabitleri (sn). */
const HIZLANMA = .45;
const YAVASLAMA = .9;

interface DonenParca {
  nesne: THREE.Object3D;
  eksen: THREE.Vector3;
  yapi: FenKimligi;
  hedefHiz: number;
  hiz: number;
}

interface MikroskopIzi {
  nesne: THREE.Object3D;
  eksen: THREE.Vector3;
  /** Oyun zamanına (sn) göre toplam açı; oyun başında 0'dır. */
  egri: (t: number, yon: number) => number;
  son: number;
}

/** Dönen parça ve altındaki bütün ağlar 1. katmana alınır; gölge düşürmeyi sürdürürler. */
function hareketliKatman(kok: THREE.Object3D) {
  kok.traverse((nesne) => { nesne.layers.set(1); });
}

function ekseniOku(nesne: THREE.Object3D): THREE.Vector3 | null {
  const ham: unknown = nesne.userData.eksen;
  let degerler: unknown = ham;
  if (typeof ham === 'string') {
    try { degerler = JSON.parse(ham); } catch { return null; }
  }
  if (!Array.isArray(degerler) || degerler.length !== 3 || !degerler.every((d) => typeof d === 'number' && Number.isFinite(d))) return null;
  const eksen = new THREE.Vector3(degerler[0], degerler[1], degerler[2]);
  return eksen.lengthSq() > 1e-8 ? eksen.normalize() : null;
}

function yumusakGecis(t: number) {
  const u = THREE.MathUtils.clamp(t, 0, 1);
  return u * u * (3 - 2 * u);
}

function rastgele(alt: number, ust: number) {
  return alt + Math.random() * (ust - alt);
}

/** Mikroskop tareti 120° döner (bir sonraki objektif), ardından odak tekerleği ileri geri çevrilir. */
class MikroskopOyunu {
  private readonly izler: MikroskopIzi[] = [];
  /** Oynuyorsa oyun zamanı (sn), değilse -1. */
  private zaman = -1;
  private bekleme = rastgele(4, 7);
  private yon = 1;
  private static readonly SURE = 4;

  constructor(taret: THREE.Object3D | null, odak: THREE.Object3D | null) {
    const taretEkseni = taret && ekseniOku(taret);
    if (taret && taretEkseni) {
      this.izler.push({
        nesne: taret, eksen: taretEkseni, son: 0,
        egri: (t, yon) => yon * (2 * Math.PI / 3) * yumusakGecis(t / 1.3),
      });
    }
    const odakEkseni = odak && ekseniOku(odak);
    if (odak && odakEkseni) {
      this.izler.push({
        nesne: odak, eksen: odakEkseni, son: 0,
        egri: (t) => 1.4 * yumusakGecis((t - 1.7) / 1.1) - .55 * yumusakGecis((t - 3) / .8),
      });
    }
  }

  get etkin() { return this.izler.length > 0; }

  /** @param yakin laboratuvar üzerindeyken ya da seçiliyken oyun daha sık tekrarlanır. */
  guncelle(adim: number, yakin: boolean): boolean {
    if (!this.izler.length) return false;
    if (this.zaman < 0) {
      this.bekleme -= adim;
      if (this.bekleme > 0) return false;
      this.zaman = 0;
      for (const iz of this.izler) iz.son = 0;
    }
    this.zaman = Math.min(MikroskopOyunu.SURE, this.zaman + adim);
    for (const iz of this.izler) {
      const aci = iz.egri(this.zaman, this.yon);
      const fark = aci - iz.son;
      if (Math.abs(fark) > 1e-6) iz.nesne.rotateOnAxis(iz.eksen, fark);
      iz.son = aci;
    }
    if (this.zaman >= MikroskopOyunu.SURE) {
      this.zaman = -1;
      this.yon = -this.yon;
      this.bekleme = yakin ? rastgele(5, 8) : rastgele(12, 20);
    }
    return true;
  }
}

export class DonenParcalar {
  private readonly parcalar: DonenParca[] = [];
  private readonly mikroskop: MikroskopOyunu;

  /** `sahne` yüklenmiş köy modeli; yapı köklerinin altındaki düğümler `fenKimligi` ile işaretlenmiş olmalıdır. */
  constructor(sahne: THREE.Object3D) {
    let taret: THREE.Object3D | null = null;
    let odak: THREE.Object3D | null = null;
    const bulunanlar: THREE.Object3D[] = [];
    sahne.traverse((nesne) => {
      if (nesne.userData.eksen === undefined) return;
      bulunanlar.push(nesne);
      if (nesne.name === 'LAB_taret') { taret = nesne; return; }
      if (nesne.name === 'LAB_odak') { odak = nesne; return; }
      const eksen = ekseniOku(nesne);
      const yapi: unknown = nesne.userData.fenKimligi;
      if (!eksen || !fenKimligi(yapi)) return;
      this.parcalar.push({ nesne, eksen, yapi, hedefHiz: HIZLAR[nesne.name] ?? VARSAYILAN_HIZ, hiz: 0 });
    });
    // traverse sırasında katman değiştirmek güvenlidir ama okunurluk için ayrı döngüde yapılır.
    for (const nesne of bulunanlar) hareketliKatman(nesne);
    this.mikroskop = new MikroskopOyunu(taret, odak);
  }

  get adet() { return this.parcalar.length + (this.mikroskop.etkin ? 1 : 0); }

  /**
   * Parçaları bir kare ilerletir. `etkin(yapi)` fare o yapının üzerindeyken ya da yapı
   * seçiliyken `true` döner. Dönüş değeri: bu karede bir parça hareket ettiyse `true`
   * (duragan gölge haritası tazelenmelidir).
   */
  guncelle(adim: number, etkin: (yapi: FenKimligi) => boolean): boolean {
    let hareket = false;
    for (const parca of this.parcalar) {
      const hedef = etkin(parca.yapi) ? parca.hedefHiz : 0;
      const sabit = hedef > parca.hiz ? HIZLANMA : YAVASLAMA;
      parca.hiz += (hedef - parca.hiz) * (1 - Math.exp(-adim / sabit));
      if (hedef === 0 && parca.hiz < .003) parca.hiz = 0;
      if (parca.hiz === 0) continue;
      parca.nesne.rotateOnAxis(parca.eksen, parca.hiz * adim);
      hareket = true;
    }
    if (this.mikroskop.guncelle(adim, etkin('lab'))) hareket = true;
    return hareket;
  }
}

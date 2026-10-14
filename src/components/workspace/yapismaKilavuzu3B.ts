import * as THREE from 'three';
import { izAnahtari, type YapismaIzi } from '@/math/yapisma3d';

/**
 * 3B Mıknatıs (YAP3B) kılavuzu: sürükleme sırasında temas yüzü vurgusu, dik silindirin teğet doğrusu ve kenar / merkez
 * hiza çizgileri. Sade, sessiz: kehribar (#f59e0b; eksen kırmızı / yeşil / mavisinden, seçim pembesinden, ayna / öteleme
 * morundan ayrık), yazı yok. Yeni temas girişinde dolgu 120 ms koyulaşır («tık»), sonra 0,3'e döner.
 *
 * Grup doğrudan sahneye eklenir (gizmoGroup'a değil: gizmo etkisi her çizimde onu temizler); derinlik sınaması kapalı,
 * renderOrder 4: cisimlerden sonra, etiket sprite'larından (5) önce. Kılavuz yalnız iz değişince yeniden kurulur.
 */

export const KILAVUZ_RENGI = 0xf59e0b;
const DOLGU = 0.3;
const DOLGU_TIK = 0.55;
const TIK_MS = 120;
const SIRA = 4;

export interface KilavuzDurumu {
  grup: THREE.Group | null;
  /** Son çizilen izin anahtarı (izAnahtari + seçenek) */
  anahtar: string;
  zamanlayici: ReturnType<typeof setTimeout> | null;
  /** Son çizilen temasların çift kimlikleri: yeni temas girişini tanımak için */
  ciftler: string[];
}

export function bosKilavuzDurumu(): KilavuzDurumu {
  return { grup: null, anahtar: '', zamanlayici: null, ciftler: [] };
}

function bosalt(grup: THREE.Group): boolean {
  const vardi = grup.children.length > 0;
  while (grup.children.length) {
    const c = grup.children[0] as THREE.Mesh | THREE.Line;
    grup.remove(c);
    c.geometry?.dispose();
    const m = c.material;
    if (Array.isArray(m)) m.forEach((x) => x.dispose());
    else m?.dispose();
  }
  return vardi;
}

function zamanlayiciyiDurdur(d: KilavuzDurumu) {
  if (d.zamanlayici !== null) {
    clearTimeout(d.zamanlayici);
    d.zamanlayici = null;
  }
}

/**
 * İz değiştiyse grubu yeniden kurar; grup yoksa ya da başka sahnedeyse (StrictMode'da yeniden kurulan sahne) oluşturup
 * sahneye ekler. Yeni temas girişinde dolgu 120 ms koyulaşır (zamanlayıcı `yenidenCiz`'i çağırır). Değiştiyse true.
 */
export function kilavuzuGuncelle(
  sahne: THREE.Scene,
  d: KilavuzDurumu,
  iz: YapismaIzi | null,
  secenek: { hizaCizgisi: boolean },
  yenidenCiz: () => void,
): boolean {
  const anahtar = iz ? `${izAnahtari(iz)}${secenek.hizaCizgisi ? '' : '#h0'}` : '';
  if (d.grup && d.grup.parent === sahne && anahtar === d.anahtar) return false;
  if (!d.grup) d.grup = new THREE.Group();
  if (d.grup.parent !== sahne) {
    d.grup.parent?.remove(d.grup);
    sahne.add(d.grup);
  }
  const grup = d.grup;
  const sildi = bosalt(grup);
  d.anahtar = anahtar;
  if (!iz) {
    zamanlayiciyiDurdur(d);
    d.ciftler = [];
    return sildi;
  }

  const ciftler = iz.temaslar.map((t) => t.cift);
  const yeniTemas = ciftler.some((c) => !d.ciftler.includes(c));
  d.ciftler = ciftler;
  const dolgular: THREE.MeshBasicMaterial[] = [];

  for (const t of iz.temaslar) {
    if (t.tur === 'yuz') {
      if (t.kose.length < 3) continue;
      const konum = new Float32Array(t.kose.flatMap((p) => [p.x, p.y, p.z]));
      const indis: number[] = [];
      for (let i = 1; i < t.kose.length - 1; i++) indis.push(0, i, i + 1);
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(konum, 3));
      g.setIndex(indis);
      const malzeme = new THREE.MeshBasicMaterial({
        color: KILAVUZ_RENGI,
        transparent: true,
        opacity: yeniTemas ? DOLGU_TIK : DOLGU,
        depthTest: false,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      dolgular.push(malzeme);
      const yuz = new THREE.Mesh(g, malzeme);
      yuz.renderOrder = SIRA;
      grup.add(yuz);
      const kenarG = new THREE.BufferGeometry().setFromPoints(t.kose.map((p) => new THREE.Vector3(p.x, p.y, p.z)));
      const kenar = new THREE.LineLoop(kenarG, new THREE.LineBasicMaterial({ color: KILAVUZ_RENGI, transparent: true, opacity: 0.9, depthTest: false, depthWrite: false }));
      kenar.renderOrder = SIRA;
      grup.add(kenar);
    } else {
      const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(t.a.x, t.a.y, t.a.z), new THREE.Vector3(t.b.x, t.b.y, t.b.z)]);
      const cizgi = new THREE.Line(g, new THREE.LineBasicMaterial({ color: KILAVUZ_RENGI, depthTest: false, depthWrite: false }));
      cizgi.renderOrder = SIRA;
      grup.add(cizgi);
    }
  }

  if (secenek.hizaCizgisi) {
    for (const h of iz.hizalar) {
      const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(h.a.x, h.a.y, h.a.z), new THREE.Vector3(h.b.x, h.b.y, h.b.z)]);
      const cizgi = new THREE.Line(
        g,
        new THREE.LineDashedMaterial({ color: KILAVUZ_RENGI, dashSize: 0.2, gapSize: 0.12, transparent: true, opacity: 0.9, depthTest: false, depthWrite: false }),
      );
      cizgi.computeLineDistances();
      cizgi.renderOrder = SIRA;
      grup.add(cizgi);
    }
  }

  if (yeniTemas && dolgular.length > 0) {
    zamanlayiciyiDurdur(d);
    d.zamanlayici = setTimeout(() => {
      d.zamanlayici = null;
      dolgular.forEach((m) => {
        m.opacity = DOLGU;
      });
      yenidenCiz();
    }, TIK_MS);
  }
  return true;
}

/** Çocukları atar (geometri / malzeme dispose), zamanlayıcıyı iptal eder; sok=true grubu sahneden de çıkarır. Bir şey sildiyse true. */
export function kilavuzuTemizle(d: KilavuzDurumu, sok = false): boolean {
  zamanlayiciyiDurdur(d);
  d.anahtar = '';
  d.ciftler = [];
  if (!d.grup) return false;
  const sildi = bosalt(d.grup);
  if (sok) {
    d.grup.parent?.remove(d.grup);
    d.grup = null;
  }
  return sildi;
}

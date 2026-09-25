/**
 * Algoritma Laboratuvarı — yeni dünyaların sahne katmanı (sera sahnesinin üstüne kurulur).
 *
 * - Saha (çizim): biçilmiş çim şeritleri, nokta ağı, hazır çizgiler (krem), robotun çizdiği çizgiler
 *   (deniz yeşili boya), çizilecek çizgilerin soluk kesikli izleri, simetri doğrusu (kesikli çivit),
 *   koordinat eksenleri ve sayıları, işaretlenecek noktalar (halka) ve işaretlenenler (iğneli disk).
 * - Boya / tarla: karoların üstünde boya katmanı; tarlada toprak karo ve filiz.
 * - İnşaat: hedef yüksekliklerin hayalet küpleri, konan ahşap oyuncak küpler.
 * Yanlış çizgi, yanlış boya, fazla küp ve yanlış nokta mercan renkle gösterilir.
 *
 * Katman sahnenin `sira` grubuna eklenir; sera sahnesi dünyayı yeniden kurarken grubu (ve dokularını) söker.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { cizgiUclari, hucreNo, koordinatlar, type DunyaDurumu, type DunyaTanimi, type Hata, type Izgara } from './dunya';

export const KUP = 0.72;
/** Karo üstü (bahçe / inşaat taşları) */
export const KARO_UST = 0.105;

const RENK = {
  verilen: '#f3eee0',
  cizilen: '#2a9d94',
  hata: '#d9534f',
  eksen: '#5d66a6',
  boya: '#6f79c9',
  nokta: '#5d66a6',
  halka: '#2a9d94',
  toprak: '#8b6a48',
  ekili: '#5f4631',
  filiz: '#6fae4f',
};
const KUP_RENKLERI = ['#e9b949', '#d9805f', '#2a9d94', '#7f88c4', '#6fae62', '#c97a9a'];

function tuval(en: number, boy: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = en;
  c.height = boy;
  return [c, c.getContext('2d') as CanvasRenderingContext2D];
}

function doku(c: HTMLCanvasElement, tekrar = false): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (tekrar) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Biçilmiş çim: açık / koyu şeritler, ince doku */
function sahaCimi(koyu: boolean): THREE.CanvasTexture {
  const [c, g] = tuval(256, 256);
  const a = koyu ? '#1f3b31' : '#8fbf6c';
  const b = koyu ? '#23443a' : '#9fcb7a';
  for (let i = 0; i < 4; i++) {
    g.fillStyle = i % 2 ? a : b;
    g.fillRect(0, i * 64, 256, 64);
  }
  let s = 11;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = `rgba(${koyu ? '255,255,255' : '40,70,30'},${0.03 + r() * 0.05})`;
    g.fillRect(r() * 256, r() * 256, 1.2, 2.6);
  }
  return doku(c, true);
}

/** Zemine yazılan sayı (koordinat ekseni): beyaz yazı, koyu kontur */
function sayiDokusu(n: number | string): THREE.CanvasTexture {
  const [c, g] = tuval(96, 96);
  g.font = `800 58px Manrope, 'Segoe UI', sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineWidth = 10;
  g.strokeStyle = 'rgba(21,48,45,0.85)';
  g.strokeText(String(n), 48, 52);
  g.fillStyle = '#fbf7ee';
  g.fillText(String(n), 48, 52);
  return doku(c);
}

/** Uyarı şeridi (inşaat alanının kenarı) */
function seritDokusu(): THREE.CanvasTexture {
  const [c, g] = tuval(128, 32);
  g.fillStyle = '#e9b949';
  g.fillRect(0, 0, 128, 32);
  g.fillStyle = '#2b2b2b';
  for (let x = -32; x < 160; x += 32) {
    g.beginPath();
    g.moveTo(x, 32);
    g.lineTo(x + 16, 32);
    g.lineTo(x + 32, 0);
    g.lineTo(x + 16, 0);
    g.closePath();
    g.fill();
  }
  return doku(c, true);
}

interface Kur {
  koyu: boolean;
  grup: THREE.Group;
  dokular: THREE.Texture[];
  izg: Izgara;
  dunya: DunyaTanimi;
  /** Hücre / nokta merkezi (y yer yüksekliği) */
  merkez: (x: number, y: number) => THREE.Vector3;
  /** Hücre eni */
  T: number;
}

export class DunyaKatmani {
  private readonly k: Kur;
  private readonly cizgiMatVerilen: THREE.MeshStandardMaterial;
  private readonly cizgiMatCizilen: THREE.MeshStandardMaterial;
  private readonly cizgiMatHata: THREE.MeshStandardMaterial;
  private readonly cizgiler = new Map<string, THREE.Mesh>();
  /** Çizilmekte olan (büyüyen) çizgi */
  private readonly buyuyen: THREE.Mesh;
  private readonly boyalar = new Map<number, THREE.Mesh>();
  private readonly filizler = new Map<number, THREE.Group>();
  private readonly noktalar = new Map<number, THREE.Group>();
  private readonly kupler = new Map<number, THREE.Mesh[]>();
  private readonly hayaletler = new Map<number, THREE.Object3D[]>();
  private readonly kupGeo = new RoundedBoxGeometry(KUP, KUP, KUP, 3, 0.07);
  private readonly kupMatlari: THREE.MeshStandardMaterial[];
  private readonly kupHataMat: THREE.MeshStandardMaterial;
  private readonly boyaMat: THREE.MeshStandardMaterial;
  private readonly boyaHataMat: THREE.MeshStandardMaterial;
  /** Koyulmakta olan (inen) küp */
  readonly inenKup: THREE.Mesh;

  constructor(k: Kur) {
    this.k = k;
    const { izg, grup, koyu } = k;
    const cizgiMat = (renk: string) => new THREE.MeshStandardMaterial({ color: renk, roughness: 0.75, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    this.cizgiMatVerilen = cizgiMat(koyu ? '#d8d2c2' : RENK.verilen);
    this.cizgiMatCizilen = cizgiMat(koyu ? '#3cb8ad' : RENK.cizilen);
    this.cizgiMatHata = cizgiMat(RENK.hata);
    this.buyuyen = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.1), this.cizgiMatCizilen);
    this.buyuyen.rotation.x = -Math.PI / 2;
    this.buyuyen.visible = false;
    grup.add(this.buyuyen);
    this.kupMatlari = KUP_RENKLERI.map((c) => new THREE.MeshStandardMaterial({ color: koyu ? new THREE.Color(c).multiplyScalar(0.82) : c, roughness: 0.62 }));
    this.kupHataMat = new THREE.MeshStandardMaterial({ color: RENK.hata, roughness: 0.55, emissive: RENK.hata, emissiveIntensity: 0.15 });
    this.boyaMat = new THREE.MeshStandardMaterial({ color: koyu ? '#5a64b0' : RENK.boya, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    this.boyaHataMat = new THREE.MeshStandardMaterial({ color: RENK.hata, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    this.inenKup = new THREE.Mesh(this.kupGeo, this.kupMatlari[0]);
    this.inenKup.castShadow = true;
    this.inenKup.visible = false;
    grup.add(this.inenKup);

    if (izg.tur === 'cizim') this.sahaKur();
    if (izg.boyaHedef.some(Boolean) || izg.boyaVerilen.some(Boolean)) this.boyaKur();
    if (izg.tur === 'insaat') this.insaatKur();
    if (k.dunya.eksen) this.eksenKur();
  }

  // --- Saha ------------------------------------------------------------------------
  private sahaKur() {
    const { izg, grup, dokular, koyu, T } = this.k;
    const W = (izg.en - 1) * T;
    const D = (izg.boy - 1) * T;
    // Saha zemini: biçilmiş çim, beyaz kenar çizgisi
    const cim = sahaCimi(koyu);
    cim.repeat.set(Math.max(1, (W + 3) / 3), Math.max(1, (D + 3) / 3));
    dokular.push(cim);
    const zemin = new THREE.Mesh(new THREE.PlaneGeometry(W + 2.2, D + 2.2), new THREE.MeshStandardMaterial({ map: cim, roughness: 0.95 }));
    zemin.rotation.x = -Math.PI / 2;
    zemin.position.y = 0.004;
    zemin.receiveShadow = true;
    grup.add(zemin);
    const kenarMat = new THREE.MeshStandardMaterial({ color: koyu ? '#cfc9ba' : '#fbf8f0', roughness: 0.8 });
    const kx = W / 2 + 0.85;
    const kz = D / 2 + 0.85;
    for (const [x, z, en, boy] of [
      [0, -kz, 2 * kx + 0.07, 0.07],
      [0, kz, 2 * kx + 0.07, 0.07],
      [-kx, 0, 0.07, 2 * kz],
      [kx, 0, 0.07, 2 * kz],
    ] as const) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(en, boy), kenarMat);
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, 0.008, z);
      grup.add(m);
    }
    // Nokta ağı
    const noktaGeo = new THREE.CircleGeometry(0.055, 20);
    const noktaMat = new THREE.MeshBasicMaterial({ color: koyu ? '#dfe8e2' : '#ffffff', transparent: true, opacity: koyu ? 0.55 : 0.8 });
    for (let y = 0; y < izg.boy; y++) {
      for (let x = 0; x < izg.en; x++) {
        const c = this.k.merkez(x, y);
        const m = new THREE.Mesh(noktaGeo, noktaMat);
        m.rotation.x = -Math.PI / 2;
        m.position.set(c.x, 0.009, c.z);
        grup.add(m);
      }
    }
    // Hazır çizgiler; çizilecek çizgilerin soluk kesikli izi (hedef gizli değilse)
    for (const kk of izg.cizgiVerilen) grup.add(this.cizgiMesh(kk, this.cizgiMatVerilen, 0.1));
    if (!this.k.dunya.hedefGizli) {
      const izMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: koyu ? 0.28 : 0.5, depthWrite: false });
      for (const kk of izg.cizgiHedef) {
        const [a, b] = this.uclar(kk);
        const boy = a.distanceTo(b);
        const parca = 5;
        for (let i = 0; i < parca; i++) {
          const t0 = (i + 0.2) / parca;
          const t1 = (i + 0.72) / parca;
          const p0 = a.clone().lerp(b, t0);
          const p1 = a.clone().lerp(b, t1);
          const m = new THREE.Mesh(new THREE.PlaneGeometry(p0.distanceTo(p1), 0.06), izMat);
          m.rotation.x = -Math.PI / 2;
          m.rotation.z = -Math.atan2(b.z - a.z, b.x - a.x);
          m.position.set((p0.x + p1.x) / 2, 0.01, (p0.z + p1.z) / 2);
          grup.add(m);
        }
        void boy;
      }
      // İşaretlenecek noktalar: halka
      const halkaGeo = new THREE.RingGeometry(0.11, 0.17, 32);
      const halkaMat = new THREE.MeshBasicMaterial({ color: RENK.halka, transparent: true, opacity: 0.9, depthWrite: false });
      izg.noktaHedef.forEach((v, i) => {
        if (!v) return;
        const c = this.k.merkez(i % izg.en, Math.floor(i / izg.en));
        const m = new THREE.Mesh(halkaGeo, halkaMat);
        m.rotation.x = -Math.PI / 2;
        m.position.set(c.x, 0.012, c.z);
        grup.add(m);
      });
    }
    if (this.k.dunya.koordinat) this.eksenlerKur();
  }

  private eksenlerKur() {
    const { izg, grup, dokular, koyu, T } = this.k;
    const murekkep = new THREE.MeshStandardMaterial({ color: koyu ? '#e6efe9' : '#1d3b37', roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -1 });
    const o = this.k.merkez(0, izg.boy - 1);
    const xSon = this.k.merkez(izg.en - 1, izg.boy - 1);
    const ySon = this.k.merkez(0, 0);
    const kalin = 0.05;
    // x ekseni (en alt satır) ve y ekseni (en sol sütun), ok uçlarıyla
    const xEks = new THREE.Mesh(new THREE.PlaneGeometry(xSon.x - o.x + 0.6, kalin), murekkep);
    xEks.rotation.x = -Math.PI / 2;
    xEks.position.set((o.x + xSon.x + 0.6) / 2, 0.011, o.z);
    grup.add(xEks);
    const yEks = new THREE.Mesh(new THREE.PlaneGeometry(kalin, o.z - ySon.z + 0.6), murekkep);
    yEks.rotation.x = -Math.PI / 2;
    yEks.position.set(o.x, 0.011, (o.z + ySon.z - 0.6) / 2);
    grup.add(yEks);
    const okGeo = new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(0, 0.16), new THREE.Vector2(-0.1, -0.02), new THREE.Vector2(0.1, -0.02)]));
    const xOk = new THREE.Mesh(okGeo, murekkep);
    xOk.rotation.set(-Math.PI / 2, 0, -Math.PI / 2);
    xOk.position.set(xSon.x + 0.6, 0.012, o.z);
    grup.add(xOk);
    const yOk = new THREE.Mesh(okGeo, murekkep);
    yOk.rotation.set(-Math.PI / 2, 0, 0);
    yOk.position.set(o.x, 0.012, ySon.z - 0.6);
    grup.add(yOk);
    // Sayılar kameraya bakan etiketler: yerde yatınca perspektifte eğri ve küçük görünüyordu
    const yazi = (s: number | string, x: number, z: number, olcek = 0.5) => {
      const d = sayiDokusu(s);
      dokular.push(d);
      const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: d, transparent: true, depthWrite: false }));
      m.scale.set(olcek, olcek, 1);
      m.position.set(x, 0.2, z);
      m.renderOrder = 4;
      grup.add(m);
    };
    for (let x = 0; x < izg.en; x++) {
      const c = this.k.merkez(x, izg.boy - 1);
      yazi(x, c.x + (x === 0 ? -0.22 : 0), c.z + 0.42);
    }
    for (let y = 1; y < izg.boy; y++) {
      const c = this.k.merkez(0, izg.boy - 1 - y);
      yazi(y, c.x - 0.44, c.z);
    }
    yazi('x', xSon.x + 0.66, o.z + 0.42, 0.52);
    yazi('y', o.x - 0.44, ySon.z - 0.66, 0.52);
    void T;
  }

  private eksenKur() {
    const { izg, grup, T, dunya } = this.k;
    const e = dunya.eksen!;
    const mat = new THREE.MeshBasicMaterial({ color: RENK.eksen, transparent: true, opacity: 0.9, depthWrite: false });
    // k: nokta / hücre koordinatı (x ya da y); doğru bütün alan boyunca kesikli
    const p0 = this.k.merkez(0, 0);
    const p1 = this.k.merkez(izg.en - 1, izg.boy - 1);
    const dikey = e.yon === 'dikey';
    const sabit = dikey ? p0.x + e.k * T : p0.z + e.k * T;
    const bas = (dikey ? p0.z : p0.x) - T * 0.55;
    const son = (dikey ? p1.z : p1.x) + T * 0.55;
    const yukseklik = izg.tur === 'cizim' ? 0.014 : KARO_UST + 0.006;
    for (let u = bas; u < son; u += 0.3) {
      const uzun = Math.min(0.18, son - u);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(dikey ? 0.055 : uzun, dikey ? uzun : 0.055), mat);
      m.rotation.x = -Math.PI / 2;
      m.position.set(dikey ? sabit : u + uzun / 2, yukseklik, dikey ? u + uzun / 2 : sabit);
      m.renderOrder = 3;
      grup.add(m);
    }
  }

  private uclar(kk: string): [THREE.Vector3, THREE.Vector3] {
    const [a, b] = cizgiUclari(kk);
    const { izg } = this.k;
    return [this.k.merkez(a % izg.en, Math.floor(a / izg.en)), this.k.merkez(b % izg.en, Math.floor(b / izg.en))];
  }

  private cizgiMesh(kk: string, mat: THREE.Material, en: number): THREE.Mesh {
    const [a, b] = this.uclar(kk);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(a.distanceTo(b) + en, en), mat);
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = -Math.atan2(b.z - a.z, b.x - a.x);
    m.position.set((a.x + b.x) / 2, 0.012, (a.z + b.z) / 2);
    m.receiveShadow = true;
    return m;
  }

  /** Robot a'dan b'ye giderken çizgiyi büyüterek çizer (u 0…1); null → gizle */
  cizgiUzat(a: THREE.Vector3 | null, b?: THREE.Vector3, u = 1, hata = false) {
    if (!a || !b) {
      this.buyuyen.visible = false;
      return;
    }
    const p = a.clone().lerp(b, u);
    const boy = a.distanceTo(p);
    this.buyuyen.visible = boy > 0.01;
    this.buyuyen.material = hata ? this.cizgiMatHata : this.cizgiMatCizilen;
    this.buyuyen.scale.set(boy + 0.1, 1, 1);
    this.buyuyen.rotation.z = -Math.atan2(b.z - a.z, b.x - a.x);
    this.buyuyen.position.set((a.x + p.x) / 2, 0.013, (a.z + p.z) / 2);
  }

  // --- Boya / tarla -------------------------------------------------------------------
  private boyaKur() {
    const { izg, grup, dunya, koyu, T } = this.k;
    const tarla = dunya.boyaTuru === 'ek';
    // Hedef kareler çerçeveli (hedef gizli değilse)
    if (!dunya.hedefGizli && !tarla) {
      const cerceveMat = new THREE.MeshBasicMaterial({ color: koyu ? '#9aa2e0' : RENK.boya, transparent: true, opacity: 0.85, depthWrite: false });
      const c0 = T * 0.4;
      izg.boyaHedef.forEach((v, i) => {
        if (!v) return;
        const c = this.k.merkez(i % izg.en, Math.floor(i / izg.en));
        for (const [dx, dz, en, boy] of [
          [0, -c0, 2 * c0, 0.045],
          [0, c0, 2 * c0, 0.045],
          [-c0, 0, 0.045, 2 * c0],
          [c0, 0, 0.045, 2 * c0],
        ] as const) {
          const m = new THREE.Mesh(new THREE.PlaneGeometry(en, boy), cerceveMat);
          m.rotation.x = -Math.PI / 2;
          m.position.set(c.x + dx, KARO_UST + 0.004, c.z + dz);
          grup.add(m);
        }
      });
    }
    void tarla;
  }

  /** Tarlada hedef karo toprak mı (bahçe kurulumu taş yerine toprak karo koyar) */
  static tarlaKaresi(izg: Izgara, dunya: DunyaTanimi, i: number): boolean {
    return dunya.boyaTuru === 'ek' && izg.boyaHedef[i];
  }

  private boyaMesh(i: number): THREE.Mesh {
    let m = this.boyalar.get(i);
    if (!m) {
      const { izg, T, grup } = this.k;
      const c = this.k.merkez(i % izg.en, Math.floor(i / izg.en));
      m = new THREE.Mesh(new RoundedBoxGeometry(T * 0.86, 0.012, T * 0.86, 2, 0.004), this.boyaMat);
      m.position.set(c.x, KARO_UST + 0.002, c.z);
      m.receiveShadow = true;
      grup.add(m);
      this.boyalar.set(i, m);
    }
    return m;
  }

  private filiz(i: number): THREE.Group {
    let f = this.filizler.get(i);
    if (!f) {
      const { izg, grup, koyu } = this.k;
      const c = this.k.merkez(i % izg.en, Math.floor(i / izg.en));
      f = new THREE.Group();
      const toprak = new THREE.Mesh(new THREE.CircleGeometry(0.3, 28), new THREE.MeshStandardMaterial({ color: koyu ? '#3d2c1f' : RENK.ekili, roughness: 1 }));
      toprak.rotation.x = -Math.PI / 2;
      toprak.position.y = 0.004;
      f.add(toprak);
      const yaprakMat = new THREE.MeshStandardMaterial({ color: koyu ? '#5f9a46' : RENK.filiz, roughness: 0.6, side: THREE.DoubleSide });
      const sap = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.16, 8), yaprakMat);
      sap.position.y = 0.08;
      f.add(sap);
      for (const a of [0.4, 0.4 + Math.PI]) {
        const y = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), yaprakMat);
        y.scale.set(0.085, 0.018, 0.045);
        y.position.set(Math.cos(a) * 0.07, 0.16, Math.sin(a) * 0.07);
        y.rotation.y = -a;
        y.rotation.z = 0.35;
        y.castShadow = true;
        f.add(y);
      }
      f.position.set(c.x - 0.28, KARO_UST, c.z + 0.26);
      grup.add(f);
      this.filizler.set(i, f);
    }
    return f;
  }

  // --- İnşaat -------------------------------------------------------------------------
  private insaatKur() {
    const { izg, grup, dokular, koyu, T, dunya } = this.k;
    // Alanın kenarı: sarı-siyah uyarı şeridi
    const W = izg.en * T;
    const D = izg.boy * T;
    const serit = seritDokusu();
    dokular.push(serit);
    // Şerit hep uzunlamasına kurulur; yan kenarlar düzlemde 90° döndürülür (doku yönü bozulmasın)
    for (const [x, z, uzunluk, dikey] of [
      [0, -(D / 2 + 0.12), W + 0.36, false],
      [0, D / 2 + 0.12, W + 0.36, false],
      [-(W / 2 + 0.12), 0, D + 0.12, true],
      [W / 2 + 0.12, 0, D + 0.12, true],
    ] as const) {
      const t = serit.clone();
      t.repeat.set(Math.max(1, uzunluk / 0.5), 1);
      t.needsUpdate = true;
      dokular.push(t);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(uzunluk, 0.12), new THREE.MeshStandardMaterial({ map: t, roughness: 0.7 }));
      m.rotation.set(-Math.PI / 2, 0, dikey ? Math.PI / 2 : 0);
      m.position.set(x, 0.05, z);
      grup.add(m);
    }
    // Hayalet küpler (hedef gizli değilse)
    if (!dunya.hedefGizli) {
      const hayaletMat = new THREE.MeshStandardMaterial({ color: koyu ? '#9fd6cf' : '#ffffff', transparent: true, opacity: koyu ? 0.12 : 0.22, roughness: 0.3, depthWrite: false });
      const kenarMat = new THREE.LineBasicMaterial({ color: koyu ? '#9fd6cf' : '#2a9d94', transparent: true, opacity: 0.7 });
      const hGeo = new THREE.BoxGeometry(KUP * 0.99, KUP * 0.99, KUP * 0.99);
      const kGeo = new THREE.EdgesGeometry(hGeo);
      izg.yapiHedef.forEach((t, i) => {
        if (!t) return;
        const liste: THREE.Object3D[] = [];
        for (let h = 0; h < t; h++) {
          const g = new THREE.Group();
          g.add(new THREE.Mesh(hGeo, hayaletMat));
          g.add(new THREE.LineSegments(kGeo, kenarMat));
          g.position.copy(this.kupYeri(i, h));
          grup.add(g);
          liste.push(g);
        }
        this.hayaletler.set(i, liste);
      });
    }
  }

  /** i. hücrede h. kattaki (0'dan) küpün merkezi */
  kupYeri(i: number, h: number): THREE.Vector3 {
    const { izg } = this.k;
    const c = this.k.merkez(i % izg.en, Math.floor(i / izg.en));
    return new THREE.Vector3(c.x, KARO_UST + KUP / 2 + h * KUP, c.z);
  }

  kupMalzemesi(i: number): THREE.MeshStandardMaterial {
    const { izg } = this.k;
    const x = i % izg.en;
    const y = Math.floor(i / izg.en);
    return this.kupMatlari[(x + y * 2) % this.kupMatlari.length];
  }

  /** En yüksek hedef ya da konmuş kule (kamera ve dron uçuş yüksekliği için) */
  static enYuksek(izg: Izgara): number {
    return Math.max(1, ...izg.yapiHedef);
  }

  // --- Güncelleme -------------------------------------------------------------------
  guncelle(d: DunyaDurumu, hata: Hata | null) {
    const { izg, grup, dunya } = this.k;
    this.buyuyen.visible = false;
    this.inenKup.visible = false;
    // Çizgiler
    if (izg.tur === 'cizim') {
      const var_ = new Set(d.cizgiler);
      for (const [kk, m] of this.cizgiler) m.visible = var_.has(kk);
      for (const kk of d.cizgiler) {
        let m = this.cizgiler.get(kk);
        if (!m) {
          m = this.cizgiMesh(kk, this.cizgiMatCizilen, 0.1);
          grup.add(m);
          this.cizgiler.set(kk, m);
        }
        m.visible = true;
        m.material = hata?.tur === 'yanlisCizgi' && hata.cizgi === kk ? this.cizgiMatHata : this.cizgiMatCizilen;
      }
    }
    // Boya / tarla
    const boyali = new Set(d.boyali);
    const tarla = dunya.boyaTuru === 'ek';
    for (let i = 0; i < izg.en * izg.boy; i++) {
      const verilen = izg.boyaVerilen[i];
      const var_ = verilen || boyali.has(i);
      if (tarla) {
        if (var_ || this.filizler.has(i)) this.filiz(i).visible = var_ && izg.boyaHedef[i];
        if (var_ && !izg.boyaHedef[i]) {
          const m = this.boyaMesh(i);
          m.material = this.boyaHataMat;
          m.visible = true;
        } else if (this.boyalar.has(i)) this.boyalar.get(i)!.visible = false;
      } else if (var_ || this.boyalar.has(i)) {
        const m = this.boyaMesh(i);
        m.visible = var_;
        m.material = !verilen && !izg.boyaHedef[i] ? this.boyaHataMat : this.boyaMat;
        m.scale.set(1, 1, 1);
      }
    }
    // Küpler
    if (izg.tur === 'insaat') {
      const hataHucre = hata?.tur === 'yanlisKup' ? hucreNo(izg, hata.x, hata.y) : -1;
      d.kupler.forEach((n, i) => {
        let liste = this.kupler.get(i);
        if (!liste && n === 0) return;
        if (!liste) {
          liste = [];
          this.kupler.set(i, liste);
        }
        while (liste.length < n) {
          const m = new THREE.Mesh(this.kupGeo, this.kupMalzemesi(i));
          m.castShadow = true;
          m.receiveShadow = true;
          m.position.copy(this.kupYeri(i, liste.length));
          grup.add(m);
          liste.push(m);
        }
        liste.forEach((m, h) => {
          m.visible = h < n;
          m.material = i === hataHucre && h === n - 1 ? this.kupHataMat : this.kupMalzemesi(i);
        });
        const hay = this.hayaletler.get(i);
        if (hay) hay.forEach((g, h) => (g.visible = h >= n));
      });
    }
    // Noktalar
    const isaretli = new Set(d.noktalar);
    for (const [i, g] of this.noktalar) g.visible = isaretli.has(i);
    for (const i of d.noktalar) {
      const g = this.nokta(i);
      g.visible = true;
      const yanlis = !izg.noktaHedef[i];
      (g.children[0] as THREE.Mesh).material = yanlis ? this.boyaHataMat : this.noktaMat;
      (g.children[2] as THREE.Mesh).material = yanlis ? this.kupHataMat : this.noktaBasMat;
    }
  }

  private noktaMat = new THREE.MeshStandardMaterial({ color: RENK.nokta, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2 });
  private noktaBasMat = new THREE.MeshStandardMaterial({ color: RENK.nokta, roughness: 0.35, emissive: RENK.nokta, emissiveIntensity: 0.1 });

  private nokta(i: number): THREE.Group {
    let g = this.noktalar.get(i);
    if (!g) {
      const { izg, grup } = this.k;
      const c = this.k.merkez(i % izg.en, Math.floor(i / izg.en));
      g = new THREE.Group();
      const disk = new THREE.Mesh(new THREE.CircleGeometry(0.13, 28), this.noktaMat);
      disk.rotation.x = -Math.PI / 2;
      disk.position.y = 0.014;
      g.add(disk);
      const igne = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.34, 8), new THREE.MeshStandardMaterial({ color: '#dcd6c8', roughness: 0.4, metalness: 0.3 }));
      igne.position.y = 0.17;
      igne.castShadow = true;
      g.add(igne);
      const bas = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), this.noktaBasMat);
      bas.position.y = 0.36;
      bas.castShadow = true;
      g.add(bas);
      g.position.set(c.x, 0, c.z);
      if (this.k.dunya.koordinat) g.scale.setScalar(1.45);
      grup.add(g);
      this.noktalar.set(i, g);
    }
    return g;
  }

  /** Nokta konurken iğnenin inişi (u 0…1) */
  noktaIndir(i: number, u: number) {
    const g = this.nokta(i);
    g.visible = true;
    g.position.y = (1 - u) * 0.5;
    g.scale.setScalar((0.6 + 0.4 * u) * (this.k.dunya.koordinat ? 1.45 : 1));
  }

  /** Boyanırken / ekilirken belirme (u 0…1) */
  boyaBelir(i: number, u: number) {
    const { izg, dunya } = this.k;
    if (dunya.boyaTuru === 'ek' && izg.boyaHedef[i]) {
      const f = this.filiz(i);
      f.visible = true;
      f.scale.setScalar(Math.max(0.01, u));
      return;
    }
    const m = this.boyaMesh(i);
    m.visible = true;
    m.material = izg.boyaHedef[i] || izg.boyaVerilen[i] ? this.boyaMat : this.boyaHataMat;
    m.scale.set(Math.max(0.05, u), 1, Math.max(0.05, u));
  }

  /** Kamera boyutlandırması için katmanın yüksekliği (inşaatta hedef kuleler) */
  yukseklik(): number {
    const { izg } = this.k;
    return izg.tur === 'insaat' ? KARO_UST + DunyaKatmani.enYuksek(izg) * KUP : 0;
  }

  /** Dünyadaki koordinat → saha noktası (koordinat düzleminde etiketler için dışarıya açık) */
  koordinat(x: number, y: number) {
    return koordinatlar(this.k.izg, x, y);
  }
}

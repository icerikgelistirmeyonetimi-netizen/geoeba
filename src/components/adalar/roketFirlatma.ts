import * as THREE from 'three';

/*
 * Ortaokul adasının cam piramidinden roket fırlatma (kullanıcı isteği, 2026-09-24): üzerine gelince
 * piramit arka taban kenarındaki menteşeden geriye yatar, zeminin altındaki roket yükselir, ateşlenir
 * ve gökyüzünde küçülerek kaybolur, piramit kapanır. Her üzerine gelişte bir kez; sürekli döngü yok.
 *
 * Zaman çizelgesi saf fonksiyonlardır (jsdom'da WebGL yok; motor örneği kurulamaz, bunlar sınanır).
 * Alev ve duman sahnede yumuşak sprite'lardır; roketin kendisi Blender modelidir (scripts/adalar/roket.py).
 */

const gecis = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const cikis = (t: number) => 1 - Math.pow(1 - t, 3);
const kenetle = (t: number) => Math.min(1, Math.max(0, t));

/** Zaman çizelgesi (saniye, üzerine gelişten itibaren) ve hareket ölçüleri. */
export const FIRLATMA = {
  /** Kapak açısı: 45°'de kapağın ön kenarı roketin yolunun arkasına (Blender y≈8.47) çekilir. */
  kapakAcisi: (45 * Math.PI) / 180,
  acilma: [0, 0.8] as const,
  /** Roket zeminin altından çıkıp lülesi zeminde durana dek yükselir. */
  yukselme: [0.45, 1.3] as const,
  /** Alev yanar, roket hafifçe titrer, tabanda duman kabarır. */
  atesleme: 1.3,
  kalkis: 1.75,
  /** Kalkış ivmesi (m/s²): 1.5 s'de ~13 m yükselir, ana kameranın kadrajından çıkar. */
  ivme: 12,
  /** Gökyüzünde uzaklaşır gibi küçülerek kaybolur (kadraj dışına çıkmadığı görünümler için). */
  kaybolma: [2.75, 3.3] as const,
  kapanma: [3.35, 4.2] as const,
  sure: 4.2,
} as const;

/** Kapak açısı (radyan): açılır, roket gidene dek açık kalır, kapanır; dizinin dışında 0. */
export function kapakAcisi(s: number): number {
  const F = FIRLATMA;
  if (!(s > F.acilma[0]) || s >= F.kapanma[1]) return 0;
  if (s < F.acilma[1]) return F.kapakAcisi * gecis((s - F.acilma[0]) / (F.acilma[1] - F.acilma[0]));
  if (s < F.kapanma[0]) return F.kapakAcisi;
  return F.kapakAcisi * (1 - gecis((s - F.kapanma[0]) / (F.kapanma[1] - F.kapanma[0])));
}

export interface RoketDurumu {
  /** Duruş konumundan (zeminin altında gizli) yukarı öteleme, m */
  yukseklik: number;
  /** Uzaklaşırken küçülme 1 → 0 (0: görünmez) */
  olcek: number;
  /** Alev düzeyi 0–1 */
  alev: number;
  /** Duman üretim oranı 0–1 */
  duman: number;
  /** Ateşlemede titreme genliği 0–1 */
  titreme: number;
  /** Duman biçimi: 1 zeminde kabaran bulut (ateşleme, kalkışın ilk anı), 0 roketin ardındaki iz */
  yayilma: number;
}

const DURUS: RoketDurumu = { yukseklik: 0, olcek: 1, alev: 0, duman: 0, titreme: 0, yayilma: 0 };

/** `s` saniyedeki roket durumu; `yukselis` roketin lülesi zemine gelene dek yükselmesi (m, JSON `rise`). */
export function roketDurumu(s: number, yukselis: number): RoketDurumu {
  const F = FIRLATMA;
  if (!(s > F.yukselme[0]) || s >= F.sure) return DURUS;
  if (s < F.yukselme[1]) {
    return { ...DURUS, yukseklik: yukselis * cikis((s - F.yukselme[0]) / (F.yukselme[1] - F.yukselme[0])) };
  }
  if (s < F.kalkis) {
    const alev = kenetle((s - F.atesleme) / 0.15);
    return { yukseklik: yukselis, olcek: 1, alev, duman: 0.75 * alev, titreme: alev, yayilma: 1 };
  }
  const tau = s - F.kalkis;
  const tirmanis = 0.5 * F.ivme * tau * tau;
  const olcek = s < F.kaybolma[0] ? 1 : 1 - gecis(kenetle((s - F.kaybolma[0]) / (F.kaybolma[1] - F.kaybolma[0])));
  return {
    yukseklik: yukselis + tirmanis,
    olcek,
    alev: olcek,
    duman: Math.max(0, 1 - tau / 1.3),
    titreme: 0,
    // İlk metrede zemindeki bulut sürer, sonra roketin ardında iz bırakır
    yayilma: Math.max(0, 1 - tirmanis / 1.2),
  };
}

// ---------------------------------------------------------------------------
// Alev ve duman: yumuşak kenarlı sprite'lar (tuval dokusu), ortam kapatmasına katılmaz
// ---------------------------------------------------------------------------

function tuvalDokusu(genislik: number, yukseklik: number, ciz: (c: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const tuval = document.createElement('canvas');
  tuval.width = genislik;
  tuval.height = yukseklik;
  const c = tuval.getContext('2d');
  if (c) ciz(c);
  const doku = new THREE.CanvasTexture(tuval);
  doku.colorSpace = THREE.SRGBColorSpace;
  return doku;
}

/** Dumanın yumuşak bulutu: ortası dolgun, kenarı saydam; hafif düzensiz kenar için üç iç içe leke. */
function dumanDokusu(): THREE.CanvasTexture {
  return tuvalDokusu(128, 128, (c) => {
    for (const [x, y, r, a] of [[64, 66, 62, 0.85], [52, 58, 40, 0.5], [76, 60, 38, 0.45]] as const) {
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(255,255,255,${a})`);
      g.addColorStop(0.5, `rgba(255,255,255,${a * 0.6})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, 128, 128);
    }
  });
}

/**
 * Alev damlası (üst kenar lülede): dış katman doygun turuncu-sarı (normal karışım: açık gökte de
 * rengi okunur), çekirdek sıcak beyaz (ekleyerek karışım: parlama).
 */
function alevDokusu(cekirdek: boolean): THREE.CanvasTexture {
  return tuvalDokusu(64, 160, (c) => {
    c.save();
    c.scale(1, 2.5);
    const g = c.createRadialGradient(32, 8, 1, 32, 12, 54);
    if (cekirdek) {
      g.addColorStop(0, 'rgba(255,252,236,1)');
      g.addColorStop(0.35, 'rgba(255,236,170,0.8)');
      g.addColorStop(1, 'rgba(255,200,120,0)');
    } else {
      g.addColorStop(0, 'rgba(255,236,160,1)');
      g.addColorStop(0.3, 'rgba(255,184,64,0.95)');
      g.addColorStop(0.62, 'rgba(250,112,38,0.7)');
      g.addColorStop(1, 'rgba(235,84,30,0)');
    }
    c.fillStyle = g;
    c.fillRect(0, 0, 64, 64);
    c.restore();
  });
}

interface Duman {
  sprite: THREE.Sprite;
  malzeme: THREE.SpriteMaterial;
  yas: number;
  omur: number;
  konum: THREE.Vector3;
  hiz: THREE.Vector3;
  olcek0: number;
  olcek1: number;
  opaklik: number;
}

const DUMAN_SAYISI = 110;
/** Tam oranda saniyedeki duman sayısı. */
const DUMAN_HIZI = 72;
/** Bulutlar arasında hafif ton farkı: düz beyaz lekeler yerine derinlik. */
const DUMAN_TONLARI = ['#fbf8f1', '#f3eee4', '#ebe6dc', '#f7f3ea'];

export class RoketEfekti {
  readonly grup = new THREE.Group();
  private readonly dumanDoku = dumanDokusu();
  private readonly alevDoku = alevDokusu(false);
  private readonly cekirdekDoku = alevDokusu(true);
  private readonly alev: THREE.Sprite;
  private readonly cekirdek: THREE.Sprite;
  private readonly dumanlar: Duman[] = [];
  private kaynak: THREE.Vector3 | null = null;
  private alevDuzeyi = 0;
  private dumanOrani = 0;
  private yayilma = 0;
  private birikim = 0;
  private sira = 0;

  constructor() {
    this.grup.name = 'roket-efekti';
    this.alev = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: this.alevDoku, transparent: true, depthWrite: false })
    );
    this.cekirdek = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: this.cekirdekDoku, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    for (const s of [this.alev, this.cekirdek]) {
      s.center.set(0.5, 1); // sprite'ın üst ortası lülede: alev aşağı uzar
      s.visible = false;
      s.renderOrder = 4;
      s.userData.aoDisi = true;
      this.grup.add(s);
    }
    for (let i = 0; i < DUMAN_SAYISI; i += 1) {
      const malzeme = new THREE.SpriteMaterial({
        map: this.dumanDoku,
        color: new THREE.Color(DUMAN_TONLARI[i % DUMAN_TONLARI.length]),
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(malzeme);
      sprite.visible = false;
      sprite.renderOrder = 3;
      sprite.userData.aoDisi = true;
      this.grup.add(sprite);
      this.dumanlar.push({
        sprite, malzeme, yas: 0, omur: 1, konum: new THREE.Vector3(), hiz: new THREE.Vector3(), olcek0: 0.2, olcek1: 0.7, opaklik: 0.9,
      });
    }
  }

  /**
   * Bu karenin alev/duman kaynağı: lülenin dünya konumu (null: roket yok), alev ve duman düzeyi,
   * dumanın biçimi (1: zeminde kabaran bulut, 0: roketin ardındaki iz).
   */
  besle(lule: THREE.Vector3 | null, alev: number, duman: number, yayilma = 0): void {
    if (lule) (this.kaynak ??= new THREE.Vector3()).copy(lule);
    else this.kaynak = null;
    this.alevDuzeyi = lule ? alev : 0;
    this.dumanOrani = lule ? duman : 0;
    this.yayilma = yayilma;
  }

  guncelle(dt: number, zaman: number): void {
    // Alev: hafif titreşen iki katman (turuncu dış, sıcak beyaz çekirdek)
    const alevVar = this.kaynak !== null && this.alevDuzeyi > 0.01;
    this.alev.visible = this.cekirdek.visible = alevVar;
    if (alevVar && this.kaynak) {
      const k = this.alevDuzeyi;
      const oynama = 1 + Math.sin(zaman * 47) * 0.09 + Math.sin(zaman * 29 + 1.3) * 0.06;
      this.alev.position.copy(this.kaynak);
      this.cekirdek.position.copy(this.kaynak);
      this.alev.scale.set(0.24 * k, 0.62 * k * oynama, 1);
      this.cekirdek.scale.set(0.12 * k, 0.3 * k * (2 - oynama), 1);
    }
    // Duman: kaynak açıkken orana göre yeni bulutlar, yaşayanlar büyüyüp solar
    if (this.kaynak && this.dumanOrani > 0) {
      this.birikim += dt * DUMAN_HIZI * this.dumanOrani;
      while (this.birikim >= 1) {
        this.birikim -= 1;
        this.dumanBirak(this.kaynak, this.yayilma);
      }
    } else {
      this.birikim = 0;
    }
    for (const d of this.dumanlar) {
      if (!d.sprite.visible) continue;
      d.yas += dt;
      const u = d.yas / d.omur;
      if (u >= 1) {
        d.sprite.visible = false;
        continue;
      }
      d.konum.addScaledVector(d.hiz, dt);
      d.hiz.multiplyScalar(Math.max(0, 1 - dt * 1.4)); // hava direnci: yayılma yavaşlar
      d.hiz.y += dt * 0.12; // sıcak duman hafifçe yükselir
      d.sprite.position.copy(d.konum);
      const olcek = d.olcek0 + (d.olcek1 - d.olcek0) * cikis(u);
      d.sprite.scale.set(olcek, olcek, 1);
      // Kısa belirme (patlamasın), sonra yavaş solma
      d.malzeme.opacity = d.opaklik * kenetle(u / 0.08) * Math.pow(1 - u, 1.4);
    }
  }

  private dumanBirak(kaynak: THREE.Vector3, yayilma: number): void {
    const d = this.dumanlar[this.sira];
    this.sira = (this.sira + 1) % this.dumanlar.length;
    const aci = Math.random() * Math.PI * 2;
    // Zeminde: yana hızla yayılan iri bulut; iz: yerinde kalan, büyüyen sütun
    const yay = yayilma * (0.55 + Math.random() * 0.6) + (1 - yayilma) * (0.05 + Math.random() * 0.15);
    d.konum.set(kaynak.x + Math.cos(aci) * 0.05, kaynak.y - 0.06 - (1 - yayilma) * Math.random() * 0.2, kaynak.z + Math.sin(aci) * 0.05);
    d.hiz.set(Math.cos(aci) * yay, 0.05 + Math.random() * 0.1, Math.sin(aci) * yay);
    d.yas = 0;
    d.omur = 1.5 + Math.random() * 0.9;
    d.olcek0 = 0.2 + Math.random() * 0.08 + yayilma * 0.08;
    d.olcek1 = 0.75 + Math.random() * 0.35 + yayilma * 0.35;
    d.opaklik = 0.8 + Math.random() * 0.15;
    d.malzeme.rotation = Math.random() * Math.PI * 2;
    d.sprite.visible = true;
  }

  dispose(): void {
    this.dumanDoku.dispose();
    this.alevDoku.dispose();
    this.cekirdekDoku.dispose();
    (this.alev.material as THREE.SpriteMaterial).dispose();
    (this.cekirdek.material as THREE.SpriteMaterial).dispose();
    for (const d of this.dumanlar) d.malzeme.dispose();
    this.grup.removeFromParent();
  }
}

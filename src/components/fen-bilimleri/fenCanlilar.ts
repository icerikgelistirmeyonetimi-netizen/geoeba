import * as THREE from 'three';

/**
 * Köyün canlıları: web_aktar.py'nin ayrı köklerde aktardığı hayvanlar burada canlandırılır.
 *
 * - `kartal_ucan`: kanyonun üstünde sekiz çizerek süzülür; dönüşlerde iki yöne de yatar.
 * - `kartal_tunek` / `kartal_tunek_ucus`: arkadaki kayalıkta tüneyen kartal arada kalkar,
 *   doğu ormanının üstünde bir tur atar ve aynı tüneğe geri konar (iki poz yer değiştirir).
 * - `keci_buyuk` / `keci_kucuk`: doğu kolunun kaya basamaklarında bekler, dönüp yan basamağa
 *   sıçrar. Basamak listesi kökün extras alanından (Blender özel özelliği) okunur.
 *
 * Hareketli gövdeler 1. katmandadır: önbelleklenen GTAO ve sis derinliği onları görmez,
 * duragan gölge haritası eski bir siluet bırakmaz (gölge düşürmezler; keçiler yumuşak bir
 * leke gölgesi taşır). Hareket azaltma tercihi etkinse güncelleme çağrılmaz ve hepsi durur.
 */

const YUKARI = new THREE.Vector3(0, 1, 0);
const _ileri = new THREE.Vector3();
const _sag = new THREE.Vector3();
const _ust = new THREE.Vector3();
const _matris = new THREE.Matrix4();
const _donus = new THREE.Quaternion();
const _sonraki = new THREE.Vector3();
const _capraz = new THREE.Vector3();

interface Canli {
  guncelle(adim: number): void;
}

/** Gövdenin yerel +X eksenini `ileri` yönüne çevirir; `yatis` ileri ekseni etrafında yan yatıştır. */
function yonlendir(nesne: THREE.Object3D, ileri: THREE.Vector3, yatis = 0) {
  _ileri.copy(ileri);
  if (_ileri.lengthSq() < 1e-8) return;
  _ileri.normalize();
  _sag.crossVectors(_ileri, YUKARI);
  if (_sag.lengthSq() < 1e-6) _sag.set(0, 0, 1);
  _sag.normalize();
  _ust.crossVectors(_sag, _ileri).normalize();
  _matris.makeBasis(_ileri, _ust, _sag);
  nesne.quaternion.setFromRotationMatrix(_matris);
  if (yatis) {
    _donus.setFromAxisAngle(_ileri, yatis);
    nesne.quaternion.premultiply(_donus);
  }
}

function hareketliKatman(kok: THREE.Object3D) {
  kok.traverse((nesne) => {
    nesne.layers.set(1);
    if (nesne instanceof THREE.Mesh) {
      nesne.castShadow = false;
      nesne.receiveShadow = true;
    }
  });
}

function yumusak(alt: number, ust: number, deger: number) {
  return THREE.MathUtils.smoothstep(deger, alt, ust);
}

/** Eğri üzerindeki dönüş için yatış açısı: sol dönüşte sola, sağ dönüşte sağa yatar. */
function egriYatisi(egri: THREE.Curve<THREE.Vector3>, u: number, teget: THREE.Vector3, hiz: number, abarti: number) {
  const adim = .004;
  egri.getTangentAt((u + adim) % 1, _sonraki);
  _capraz.crossVectors(teget, _sonraki);
  const egrilik = (_capraz.y / adim) / egri.getLength();
  return THREE.MathUtils.clamp(-Math.atan(abarti * hiz * hiz * egrilik / 9.8), -.62, .62);
}

/** Kanyon üstünde sekiz çizerek süzülen kartal: her turda bir sola, bir sağa döner. */
class SuzulenKartal implements Canli {
  private readonly egri: THREE.CatmullRomCurve3;
  private readonly uzunluk: number;
  private readonly hiz = 4.3;
  private u = Math.random();
  private zaman = Math.random() * 10;
  private readonly konum = new THREE.Vector3();
  private readonly teget = new THREE.Vector3();

  constructor(private readonly nesne: THREE.Object3D) {
    const merkez = new THREE.Vector3(-7, 13.6, -1);
    const noktalar: THREE.Vector3[] = [];
    for (let i = 0; i < 48; i += 1) {
      const s = i / 48 * Math.PI * 2;
      noktalar.push(new THREE.Vector3(
        merkez.x + 9.5 * Math.sin(2 * s),
        merkez.y + 1.2 * Math.sin(2 * s + 1.1),
        merkez.z + 14 * Math.cos(s),
      ));
    }
    this.egri = new THREE.CatmullRomCurve3(noktalar, true, 'centripetal');
    this.uzunluk = this.egri.getLength();
    this.guncelle(0);
  }

  guncelle(adim: number) {
    this.zaman += adim;
    this.u = (this.u + this.hiz * adim / this.uzunluk) % 1;
    this.egri.getPointAt(this.u, this.konum);
    this.egri.getTangentAt(this.u, this.teget);
    // Hafif süzülme salınımı: gövde nefes alır gibi alçalıp yükselir.
    this.konum.y += Math.sin(this.zaman * 1.3) * .18;
    this.nesne.position.copy(this.konum);
    const yatis = egriYatisi(this.egri, this.u, this.teget, this.hiz, 2.3) + Math.sin(this.zaman * .9) * .04;
    yonlendir(this.nesne, this.teget, yatis);
  }
}

/** Tünekteki kartal: bekler, kalkar, doğu ormanının üstünde bir tur atar, aynı tüneğe konar. */
class TunekKartali implements Canli {
  private readonly tunek: THREE.Vector3;
  private readonly tunekDonusu = new THREE.Quaternion();
  private readonly egri: THREE.CatmullRomCurve3;
  private readonly uzunluk: number;
  private readonly hiz = 5.2;
  private durum: 'tunek' | 'ucus' = 'tunek';
  private sayac = 9 + Math.random() * 14;
  private u = 0;
  private zaman = 0;
  private readonly konum = new THREE.Vector3();
  private readonly teget = new THREE.Vector3();

  constructor(private readonly tunekPozu: THREE.Object3D, private readonly ucusPozu: THREE.Object3D) {
    this.tunek = tunekPozu.position.clone();
    const yon = Number(tunekPozu.userData.yon);
    const bakis = Number.isFinite(yon) ? yon : -.5;
    tunekPozu.rotation.set(0, bakis, 0);
    this.tunekDonusu.copy(tunekPozu.quaternion);
    ucusPozu.position.copy(this.tunek);
    ucusPozu.visible = false;
    const t = this.tunek;
    this.egri = new THREE.CatmullRomCurve3([
      t.clone(),
      new THREE.Vector3(t.x + 2.6, t.y + 2.4, t.z - 3.6),
      new THREE.Vector3(34, 10, -27),
      new THREE.Vector3(40.5, 13, -24),
      new THREE.Vector3(42.5, 14.2, -12),
      new THREE.Vector3(36, 14.6, -2),
      new THREE.Vector3(26, 13.8, 2.5),
      new THREE.Vector3(16, 13.2, -6),
      new THREE.Vector3(13.5, 12.6, -16),
      new THREE.Vector3(19, 9.2, -24),
      // Uzun ve yatık bir son yaklaşma: kuş tüneğe düşmez, süzülerek gelir.
      new THREE.Vector3(22.6, 6.6, -23.2),
      new THREE.Vector3(25.4, 5.0, -20.2),
      t.clone(),
    ], false, 'centripetal');
    this.uzunluk = this.egri.getLength();
  }

  guncelle(adim: number) {
    this.zaman += adim;
    if (this.durum === 'tunek') {
      // Tünekte hafifçe sağa sola bakınır.
      this.tunekPozu.quaternion.copy(this.tunekDonusu);
      _donus.setFromAxisAngle(YUKARI, Math.sin(this.zaman * .7) * .05 + Math.sin(this.zaman * .23) * .04);
      this.tunekPozu.quaternion.premultiply(_donus);
      this.sayac -= adim;
      if (this.sayac <= 0) this.kalk();
      return;
    }
    // Kalkışta ve konuşta yavaş, tur boyunca hızlı.
    const carpan = THREE.MathUtils.clamp(.2 + 1.5 * Math.sin(Math.PI * this.u), .2, 1);
    this.u += this.hiz * carpan * adim / this.uzunluk;
    if (this.u >= 1) {
      this.kon();
      return;
    }
    this.egri.getPointAt(this.u, this.konum);
    this.egri.getTangentAt(this.u, this.teget);
    this.ucusPozu.position.copy(this.konum);
    const yatis = egriYatisi(this.egri, this.u, this.teget, this.hiz * carpan, 2.0);
    yonlendir(this.ucusPozu, this.teget, yatis);
    // Son metrelerde gövde tünekteki duruşuna döner; kanatlar açık, burun tüneğe bakar ve
    // konmadan önce kuş gibi burnunu kaldırıp frenler (flare).
    const konus = yumusak(.88, 1, this.u);
    if (konus > 0) {
      this.ucusPozu.quaternion.slerp(this.tunekDonusu, konus);
      this.ucusPozu.rotateZ(.45 * Math.sin(Math.PI * konus));
    }
  }

  private kalk() {
    this.durum = 'ucus';
    this.u = 0;
    this.tunekPozu.visible = false;
    this.ucusPozu.visible = true;
    this.ucusPozu.position.copy(this.tunek);
  }

  private kon() {
    this.durum = 'tunek';
    this.sayac = 16 + Math.random() * 22;
    this.ucusPozu.visible = false;
    this.tunekPozu.visible = true;
    this.tunekPozu.quaternion.copy(this.tunekDonusu);
  }
}

/**
 * Kaya basamaklarında otlayıp yan basamağa geçen dağ keçisi. Geçiş, adım adım ilerleyen
 * alçak bir yürüyüştür (küçük bir tümsekle); yüksek bir sıçrama uzaktan zıplayan taş gibi
 * okunuyordu. Gövde adımlarla hafifçe inip kalkar, burun eğime göre döner.
 */
class Keci implements Canli {
  private durum: 'bekle' | 'don' | 'zipla' | 'in' = 'bekle';
  private sayac: number;
  private sure = 0;
  private gecen = 0;
  private su: number;
  private hedef = -1;
  private readonly baslangic = new THREE.Vector3();
  private readonly bitis = new THREE.Vector3();
  private readonly ilkDonus = new THREE.Quaternion();
  private readonly sonDonus = new THREE.Quaternion();
  private yukseklik = 1;
  private zaman = Math.random() * 7;

  constructor(
    private readonly nesne: THREE.Object3D,
    private readonly basamaklar: THREE.Vector3[],
    ilk: number,
    private readonly dolu: Set<number>,
    private readonly yavru: boolean,
  ) {
    this.su = THREE.MathUtils.clamp(ilk, 0, basamaklar.length - 1);
    if (dolu.has(this.su)) this.su = basamaklar.findIndex((_, i) => !dolu.has(i));
    dolu.add(this.su);
    this.sayac = 4 + Math.random() * (yavru ? 6 : 10);
    nesne.position.copy(basamaklar[this.su]);
    yonlendir(nesne, new THREE.Vector3(yavru ? -1 : 1, 0, yavru ? .3 : -.2));
    this.sonDonus.copy(nesne.quaternion);
    // Keçiler leke gölgesi taşımaz: basamaklar arasında kayan koyu bir disk uzaktan düşen taş gibi okunuyordu.
  }

  guncelle(adim: number) {
    this.zaman += adim;
    if (this.durum === 'bekle') {
      // Otlar gibi başını hafifçe eğip kaldırır (yerel Z sağ eksendir: burun aşağı).
      const egilme = Math.max(0, Math.sin(this.zaman * .8)) * .06;
      this.nesne.quaternion.copy(this.sonDonus);
      this.nesne.rotateZ(-egilme);
      this.sayac -= adim;
      if (this.sayac <= 0) this.hedefSec();
      return;
    }
    this.gecen += adim;
    const t = Math.min(1, this.gecen / this.sure);
    if (this.durum === 'don') {
      this.nesne.quaternion.slerpQuaternions(this.ilkDonus, this.sonDonus, yumusak(0, 1, t));
      if (t >= 1) {
        this.durum = 'zipla';
        this.gecen = 0;
        const yatay = Math.hypot(this.bitis.x - this.baslangic.x, this.bitis.z - this.baslangic.z);
        const yukari = Math.max(0, this.bitis.y - this.baslangic.y);
        // Yavaş, adımlı geçiş; yalnız yukarı çıkarken biraz daha belirgin bir tümsek.
        this.sure = THREE.MathUtils.clamp(.9 + yatay * .3 + yukari * .2, 1.3, 2.6);
        this.yukseklik = .25 + yatay * .05 + yukari * .3;
      }
      return;
    }
    if (this.durum === 'zipla') {
      const kavis = 4 * t * (1 - t);
      // Yol boyunca üç kısa adım: gövde hafifçe inip kalkar.
      const adim = Math.abs(Math.sin(t * Math.PI * 3)) * .07;
      this.nesne.position.lerpVectors(this.baslangic, this.bitis, t);
      this.nesne.position.y += this.yukseklik * kavis + adim;
      // Burun eğime göre hafifçe döner: dikey hız yönü, yatayla harmanlanır.
      const dikeyHiz = (this.bitis.y - this.baslangic.y) + this.yukseklik * (4 - 8 * t);
      _ileri.set(this.bitis.x - this.baslangic.x, 0, this.bitis.z - this.baslangic.z);
      const yatay = Math.max(.3, _ileri.length());
      _ileri.normalize().multiplyScalar(yatay).addScaledVector(YUKARI, dikeyHiz * .22 * this.sure);
      yonlendir(this.nesne, _ileri);
      if (t >= 1) {
        this.durum = 'in';
        this.gecen = 0;
        this.sure = .32;
        this.nesne.position.copy(this.bitis);
        this.dolu.delete(this.su);
        this.su = this.hedef;
        this.hedef = -1;
      }
      return;
    }
    // İniş: ön ayaklar üstüne kısa bir çöküş, sonra doğrulma.
    const cokus = Math.sin(t * Math.PI) * .09;
    this.nesne.quaternion.copy(this.sonDonus);
    this.nesne.rotateZ(-cokus);
    if (t >= 1) {
      this.durum = 'bekle';
      // Geçişler seyrek: keçiler çoğu zaman basamakta durup otlar.
      this.sayac = 9 + Math.random() * (this.yavru ? 12 : 18);
    }
  }

  private hedefSec() {
    const simdi = this.basamaklar[this.su];
    const adaylar = this.basamaklar
      .map((konum, i) => ({ i, uzaklik: Math.hypot(konum.x - simdi.x, konum.z - simdi.z) }))
      .filter(({ i, uzaklik }) => i !== this.su && !this.dolu.has(i) && uzaklik < 5.4);
    if (!adaylar.length) {
      this.sayac = 3 + Math.random() * 4;
      return;
    }
    const secim = adaylar[Math.floor(Math.random() * adaylar.length)];
    this.hedef = secim.i;
    this.dolu.add(this.hedef);
    this.baslangic.copy(simdi);
    this.bitis.copy(this.basamaklar[this.hedef]);
    this.ilkDonus.copy(this.nesne.quaternion);
    _ileri.set(this.bitis.x - this.baslangic.x, 0, this.bitis.z - this.baslangic.z);
    const gecici = new THREE.Object3D();
    yonlendir(gecici, _ileri);
    this.sonDonus.copy(gecici.quaternion);
    this.durum = 'don';
    this.gecen = 0;
    this.sure = .55;
  }
}

function basamaklariOku(veri: unknown): THREE.Vector3[] {
  let liste: unknown = veri;
  if (typeof liste === 'string') {
    try { liste = JSON.parse(liste); } catch { return []; }
  }
  if (!Array.isArray(liste)) return [];
  const sonuc: THREE.Vector3[] = [];
  for (const oge of liste) {
    if (!Array.isArray(oge) || oge.length !== 3 || !oge.every((n) => typeof n === 'number' && Number.isFinite(n))) continue;
    sonuc.push(new THREE.Vector3(oge[0], oge[1], oge[2]));
  }
  return sonuc;
}

export class FenCanlilari {
  /** Leke gölgeleri gibi yardımcı nesneler; sahneye eklenir. */
  readonly grup = new THREE.Group();
  private readonly canlilar: Canli[] = [];

  constructor(kok: THREE.Object3D) {
    this.grup.name = 'Canlılar · yardımcı nesneler';
    const ucan = kok.getObjectByName('kartal_ucan');
    if (ucan) {
      hareketliKatman(ucan);
      this.canlilar.push(new SuzulenKartal(ucan));
    }
    const tunek = kok.getObjectByName('kartal_tunek');
    const ucus = kok.getObjectByName('kartal_tunek_ucus');
    if (tunek && ucus) {
      hareketliKatman(tunek);
      hareketliKatman(ucus);
      this.canlilar.push(new TunekKartali(tunek, ucus));
    }
    const dolu = new Set<number>();
    for (const ad of ['keci_buyuk', 'keci_kucuk']) {
      const nesne = kok.getObjectByName(ad);
      if (!nesne) continue;
      const basamaklar = basamaklariOku(nesne.userData.basamaklar);
      if (basamaklar.length < 2) continue;
      hareketliKatman(nesne);
      const ilk = Number(nesne.userData.ilkBasamak);
      this.canlilar.push(new Keci(nesne, basamaklar, Number.isFinite(ilk) ? ilk : 0, dolu, ad === 'keci_kucuk'));
    }
  }

  get sayi() { return this.canlilar.length; }

  guncelle(adim: number) {
    if (!(adim > 0)) return;
    for (const canli of this.canlilar) canli.guncelle(adim);
  }

  dispose() {
    this.grup.traverse((nesne) => {
      if (nesne instanceof THREE.Mesh) {
        nesne.geometry.dispose();
        (nesne.material as THREE.Material).dispose();
      }
    });
    this.grup.removeFromParent();
  }
}

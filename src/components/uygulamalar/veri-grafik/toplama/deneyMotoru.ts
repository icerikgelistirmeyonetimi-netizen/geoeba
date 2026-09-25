/**
 * Veri topla — deney çalıştırma motoru (React'siz; zamanlayıcı dışarıdan verilir, testte sahte saatle sürülür).
 *
 * Eski örnekleyici panelinin çalıştırma döngüsünün davranışını taşır ve VT §11.10'a göre genişletir:
 * - "N kez at": önce görünür atış bütçesi (`canlandirmaPlani`) kadar atış sahnede canlandırılır; her birinin satırı
 *   aşama oranında (para %80, küp %70, torba %85) ya da çarkta ibre durunca (`transitionend`; yedek zaman aşımı
 *   `carkYedekSuresi`) yazılır. Kalan atışlar anında yapılır: kare başına en çok 24 ms iş, satırlar birkaç büyük
 *   parçada tek `veri` çağrısıyla yazılır (her çağrı uygulamayı yeniden çizer; az çağrı = akıcı). Tabloya yazılmayan
 *   deneyin (500 ve üstü ya da tablo dolu) sonuçları sonunda tek çağrıyla özete yazılır. Tek hareket kuralı: anında
 *   kısımda sahne durur, parlama ve halka yoktur.
 * - Tek atış (sahneye dokunma): aynı "dokunuş" çalışmasında birikir; her atıştan sonra çalışma bitirilir ki etiketi
 *   gerçek sayıyla yazılsın ("3. deney (5)").
 * - Seri: aynı deney 20, 50, 100, 200, 500, 1000 ve 2000 atışla, anında hızda sırayla yapılır; bitince Deney özeti
 *   Çizgi grafiğinde gösterilir.
 * - Durdur her an çalışır: çalışma o ana kadarki atış sayısıyla kaydedilir ("Durduruldu: 14 atış …").
 * Çalışma kayıtları (`n`, `sayilar`) toplamaDurumu.toplamaVerisiYaz'da sayılır; motor yalnız satırları gönderir.
 */
import { EN_COK_CALISMA, type Arastirma, type DeneyNesnesi, type DeneyPlani, type HizSecimi } from '../arastirma';
import {
  SERI,
  TABLOYA_YAZMA_SINIRI,
  ayniSonuc,
  deneyEtiketi,
  durdurulduMetni,
  enCokAtis,
  etkinIzlenen,
  fiil,
  nesneDuzenegi,
  seriBittiMetni,
  sonrakiDeneyNo,
  tabloDoluMetni,
  tabloyaYazilirMi,
  tamamlandiMetni,
  torbaBosaldiMetni,
} from '../deney';
import {
  ANINDA_KARE_BUTCESI,
  asamaOranlari,
  butceMetni,
  canlandirmaPlani,
  carkSonucDurusu,
  carkYedekSuresi,
  tekAtisSuresi,
  zarYuzAdedi,
  zarYuzDizisi,
  type CanlandirmaPlani,
} from '../canlandirma';
import { calismaBaslat, satirDegerleri, tekCekilis, type CalismaDurumu, type Cekilis, type OrnekleyiciAyari } from '../ornekleyici';
import { mulberry32, rastgeleTohum, type Uretec } from '../rastgele';
import { kimlikUret, sayiYaz } from '../veri';
import type { ToplamaVerisi } from '../toplamaDurumu';
import { ibreDurmaAcisi, sonrakiIbreAcisi } from './sahneler/CarkSahnesi';

// ── Dış dünya ─────────────────────────────────────────────────────────────────

/** Zamanlayıcı: tarayıcıda setTimeout / requestAnimationFrame / performance.now; testte sahte saat */
export interface Zamanlayici {
  zaman(fn: () => void, ms: number): number;
  iptal(id: number): void;
  kare(fn: () => void): number;
  kareIptal(id: number): void;
  simdi(): number;
}

/** Motorun çıktıları: panel bunları C'nin geri çağrılarına ve kendi durumuna bağlar */
export interface MotorCikisi {
  veri(v: ToplamaVerisi): void;
  yeniSatir(kimlik: string | null): void;
  akis(akis: boolean): void;
  bildirim(metin: string): void;
  duyuru(metin: string): void;
  ozeteGec(): void;
  gorunum(g: MotorGorunumu): void;
}

/** Her adımda okunan güncel ayar (hız menüsü çalışırken değişebilir) */
export interface MotorAyari {
  hiz: HizSecimi;
  azaltilmis: boolean;
  tabloSatiri: number;
  /** sahnedeki nesnenin boyu (px): çark ibresinin etiketlerden uzak durma açısı buna göre seçilir */
  boyut: number;
}

export type CalismaTuru = 'kosu' | 'seri' | 'dokunus';

/** Panelin çizdiği hâl: sahne, son atış yuvası ve ilerleme */
export interface MotorGorunumu {
  calisiyor: boolean;
  tur: CalismaTuru | null;
  /** sürmekte olan (ya da son) çalışmanın numarası */
  no: number | null;
  hedef: number;
  yapilan: number;
  /** seride kaçıncı deney (1'den) / kaç deney */
  seri: { sira: number; adet: number } | null;
  /** "İlk 10 atış görünür, kalanı hızlı" (görünür bütçe devredeyken) */
  butce: string | null;
  /** her canlandırılan atışta artar (sahnelerin canlandırma anahtarı) */
  anahtar: number;
  /** o atışın süresi (ms); 0 → durağan (anında kısım, azaltılmış hareket) */
  sure: number;
  /** sahnenin gösterdiği çekiliş (satır değerleri: [s0] ya da iki küpte [s0, s1, toplam]) */
  degerler: string[] | null;
  /** sayı küpü: küp başına dönerken gösterilecek ara yüzler */
  zarYuzleri: number[][] | null;
  /** çark ibresinin birikimli açısı ve dönme bitince çerçevelenecek dilim */
  ibreAcisi: number;
  carkSecilen: number | null;
  /** torbadan geri atmadan çekişte bu deneyde çıkan toplar (sırayla) */
  cekilenler: string[];
  /** son atış yuvası: satır yazıldığında güncellenir */
  son: { degerler: string[]; sira: number; no: number } | null;
}

export const BOS_GORUNUM: MotorGorunumu = {
  calisiyor: false,
  tur: null,
  no: null,
  hedef: 0,
  yapilan: 0,
  seri: null,
  butce: null,
  anahtar: 0,
  sure: 0,
  degerler: null,
  zarYuzleri: null,
  ibreAcisi: 0,
  carkSecilen: null,
  cekilenler: [],
  son: null,
};

// ── Saf yardımcılar ───────────────────────────────────────────────────────────

/** Çarkın dilimleri (planın bütün dilimleri, tekCekilis'in dilim indeksiyle birebir) */
export function carkDilimleri(d: DeneyPlani): { etiket: string; oran: number }[] {
  return d.cark.dilimler.map((x) => ({ etiket: x.etiket.trim(), oran: Number.isFinite(x.yuzde) && x.yuzde > 0 ? x.yuzde : 0 }));
}

/** Çekilişin izlenen sütundaki değeri (iki küpte toplam) izlenen sonuç mu */
function izlenenMi(d: DeneyPlani, satir: readonly string[]): boolean {
  const deger = d.nesne === 'iki-zar' ? satir[2] ?? '' : satir[0] ?? '';
  return ayniSonuc(deger, etkinIzlenen(d));
}

/** aria-live: "20 atış tamamlandı: Tura 11, yüzde 55" */
export function tamamlandiDuyurusu(d: DeneyPlani, n: number, sayi: number): string {
  const yuzde = sayiYaz(n > 0 ? (sayi / n) * 100 : 0, 1);
  const iz = etkinIzlenen(d);
  const ad = d.nesne === 'iki-zar' ? `toplam ${iz}` : d.nesne === 'zar' ? `${iz} sayısı` : iz;
  return `${n} ${fiil(d.nesne)} tamamlandı: ${ad} ${sayi}, yüzde ${yuzde}`;
}

/** Seride yapılabilecek deneyler (geri atmadan torbada top sayısını aşan atış sayıları çıkar) */
export function seriAdimlari(d: DeneyPlani): number[] {
  const enCok = enCokAtis(d);
  return SERI.filter((n) => n <= enCok);
}

/** Seri bu nesnede anlamlı mı: geri atmadan çekişte hayır (olasılık her çekişte değişir) */
export function seriKullanilabilir(d: DeneyPlani): boolean {
  return !(d.nesne === 'torba' && !d.torba.geriAt) && seriAdimlari(d).length >= 2;
}

// ── Motor ─────────────────────────────────────────────────────────────────────

interface Calisma {
  tur: CalismaTuru;
  no: number;
  hedef: number;
  yapilan: number;
  /** izlenen sonucun bu çalışmadaki sayısı (tost) */
  sayi: number;
  d: DeneyPlani;
  nesne: DeneyNesnesi;
  ayar: OrnekleyiciAyari;
  durum: CalismaDurumu;
  rnd: Uretec;
  plan: CanlandirmaPlani;
  /** henüz canlandırılmamış görünür atış sayısı */
  gorunurKalan: number;
  zamanlayicilar: number[];
  kare: number | null;
  /** çark: ibre durunca çağrılacak satır yazımı */
  donmeBekleyen: (() => void) | null;
  /** seri: kalan adımlar ve ilk numara */
  seri: { adimlar: number[]; sira: number; adet: number } | null;
  /** satırlar Tablom'a yazılıyor mu (500 ve üstü ya da tablo dolu: hayır, yalnız özet) */
  tabloya: boolean;
  /** tabloya yazılmayan deneyde henüz gönderilmemiş çekilişler (sonunda tek çağrı) */
  birikmis: Cekilis[];
}

/** Anında kısmın kare başına en çok atışı: tabloya yazılan deney birkaç büyük parçada (seride 5, tekte 6 parça) */
export function anindaParcasi(anindaAdet: number, seri: boolean): number {
  return Math.max(8, Math.ceil(Math.max(0, anindaAdet) / (seri ? 5 : 6)));
}

/** Dokunuşla atılan tek atışların çalışması (numarası ve torba durumu atışlar arasında sürer) */
interface DokunusCalismasi {
  no: number;
  kimlik: string;
  durum: CalismaDurumu;
  sira: number;
}

export class DeneyMotoru {
  private calisma: Calisma | null = null;
  private dokunus: DokunusCalismasi | null = null;
  private g: MotorGorunumu = BOS_GORUNUM;
  private akisAcik = false;

  constructor(
    private readonly saat: Zamanlayici,
    private readonly cikis: MotorCikisi,
    private readonly ayarAl: () => MotorAyari,
    private readonly uretecAl: () => Uretec = () => mulberry32(rastgeleTohum()),
  ) {}

  get gorunum(): MotorGorunumu {
    return this.g;
  }

  get calisiyor(): boolean {
    return this.calisma !== null;
  }

  private guncelle(parca: Partial<MotorGorunumu>): void {
    this.g = { ...this.g, ...parca };
    this.cikis.gorunum(this.g);
  }

  private akisYaz(acik: boolean): void {
    if (this.akisAcik === acik) return;
    this.akisAcik = acik;
    this.cikis.akis(acik);
  }

  /** Araştırma, nesne ya da kayıt kipi değişince: sahne boşalır, dokunuş çalışması unutulur */
  sifirla(): void {
    this.durdur(true);
    this.dokunus = null;
    this.g = { ...BOS_GORUNUM, anahtar: this.g.anahtar, ibreAcisi: this.g.ibreAcisi };
    this.cikis.gorunum(this.g);
  }

  /** Saklanan çalışma sınırı doluysa uyarır (yeni çalışma açılamaz) */
  private sinirDolu(a: Arastirma): boolean {
    if (a.deney.calismalar.length < EN_COK_CALISMA) return false;
    this.cikis.bildirim(`En çok ${EN_COK_CALISMA} deney saklanır: yeni deney için “Geri al” ile eskilerini silin.`);
    return true;
  }

  /** "N kez at": yeni bir simülasyon çalışması; çalışırken çağrılırsa bir şey yapmaz */
  kos(a: Arastirma, n: number): boolean {
    if (this.calisma || a.yontem !== 'deney' || this.sinirDolu(a)) return false;
    const d = a.deney;
    const hedef = Math.max(1, Math.min(Math.floor(n) || 1, enCokAtis(d)));
    const ayar = this.ayarAl();
    const no = sonrakiDeneyNo(d.calismalar);
    if (hedef < TABLOYA_YAZMA_SINIRI && !tabloyaYazilirMi(hedef, ayar.tabloSatiri)) this.cikis.bildirim(tabloDoluMetni(d.nesne));
    this.dokunus = null;
    this.baslat(d, 'kosu', no, hedef, canlandirmaPlani(hedef, ayar.hiz, ayar.azaltilmis, d.nesne), null);
    return true;
  }

  /** "Atış sayısı artınca ne olur?": 20 → 2000 seri, anında; bitince Deney özeti Çizgi grafiğinde */
  seri(a: Arastirma): boolean {
    if (this.calisma || a.yontem !== 'deney' || !seriKullanilabilir(a.deney) || this.sinirDolu(a)) return false;
    const d = a.deney;
    const adimlar = seriAdimlari(d);
    const no = sonrakiDeneyNo(d.calismalar);
    this.dokunus = null;
    this.baslat(d, 'seri', no, adimlar[0], canlandirmaPlani(adimlar[0], 3, true, d.nesne), { adimlar, sira: 0, adet: adimlar.length });
    return true;
  }

  /** Sahneye dokunma: tek atış (canlandırmalı); atışlar aynı "dokunuş" çalışmasında birikir */
  tekAtis(a: Arastirma): boolean {
    if (this.calisma || a.yontem !== 'deney') return false;
    const d = a.deney;
    const ayar = this.ayarAl();
    let dk = this.dokunus;
    const kayitli = dk ? d.calismalar.find((c) => !c.gercek && c.no === dk?.no) : undefined;
    const duzenekKimligi = `${d.nesne}|${d.torba.geriAt}|${JSON.stringify(d.cark.dilimler)}|${JSON.stringify(d.torba.toplar)}`;
    if (!dk || !kayitli || dk.kimlik !== duzenekKimligi) {
      if (this.sinirDolu(a)) return false;
      dk = { no: sonrakiDeneyNo(d.calismalar), kimlik: duzenekKimligi, durum: calismaBaslat(nesneDuzenegi(d).aygitlar), sira: 0 };
      this.dokunus = dk;
    }
    const sure = tekAtisSuresi(d.nesne, ayar.azaltilmis);
    const plan: CanlandirmaPlani = { gorunur: 1, sure, aninda: 0, kilitli: false };
    this.baslat(d, 'dokunus', dk.no, 1, plan, null, dk.durum, dk.sira);
    return true;
  }

  private baslat(
    d: DeneyPlani,
    tur: CalismaTuru,
    no: number,
    hedef: number,
    plan: CanlandirmaPlani,
    seri: Calisma['seri'],
    durum?: CalismaDurumu,
    oncekiSira = 0,
  ): void {
    const ayar = nesneDuzenegi(d);
    const tabloSatiri = this.ayarAl().tabloSatiri;
    const c: Calisma = {
      tur,
      no,
      hedef,
      yapilan: 0,
      sayi: 0,
      d,
      nesne: d.nesne,
      ayar,
      durum: durum ?? calismaBaslat(ayar.aygitlar),
      rnd: this.uretecAl(),
      plan,
      gorunurKalan: plan.gorunur,
      zamanlayicilar: [],
      kare: null,
      donmeBekleyen: null,
      seri,
      tabloya: tur === 'dokunus' || (hedef < TABLOYA_YAZMA_SINIRI && tabloyaYazilirMi(hedef, tabloSatiri)),
      birikmis: [],
    };
    this.calisma = c;
    this.cikis.veri({ calismaBaslat: { no, kayit: 'simulasyon', hedef } });
    const dokunusSirasi = tur === 'dokunus' ? oncekiSira : 0;
    this.guncelle({
      calisiyor: tur !== 'dokunus' || plan.sure > 0,
      tur,
      no,
      hedef: tur === 'dokunus' ? dokunusSirasi + 1 : hedef,
      yapilan: tur === 'dokunus' ? dokunusSirasi : 0,
      seri: seri ? { sira: seri.sira + 1, adet: seri.adet } : null,
      butce: butceMetni(plan, d.nesne),
      cekilenler: tur === 'dokunus' && dokunusSirasi > 0 ? this.g.cekilenler : [],
      carkSecilen: tur === 'dokunus' ? this.g.carkSecilen : null,
    });
    if (c.gorunurKalan > 0) this.adim();
    else {
      this.akisYaz(true);
      this.cikis.yeniSatir(null);
      c.kare = this.saat.kare(() => this.aninda());
    }
  }

  private zamanla(c: Calisma, fn: () => void, ms: number): void {
    c.zamanlayicilar.push(this.saat.zaman(fn, Math.max(0, Math.round(ms))));
  }

  /** Canlandırmalı tek adım: çekiliş → sahne → (aşama oranında ya da ibre durunca) satır → kalan süre → sonraki */
  private adim(): void {
    const c = this.calisma;
    if (!c) return;
    if (c.yapilan >= c.hedef) return this.bitir('tamam');
    const ayar = this.ayarAl();
    // Görünür bütçe bitti (ya da hız Anında / hareket azaltıldı): kalan atışlar anında
    if (c.tur !== 'dokunus' && (c.gorunurKalan <= 0 || ayar.hiz === 3 || ayar.azaltilmis)) {
      c.gorunurKalan = 0;
      this.akisYaz(true);
      c.kare = this.saat.kare(() => this.aninda());
      return;
    }
    // Hız çalışırken değiştiyse sonraki atışlar yeni süreyle
    const T = c.tur === 'dokunus' ? c.plan.sure : canlandirmaPlani(c.hedef, ayar.hiz, false, c.nesne).sure || c.plan.sure;
    const ck = tekCekilis(c.ayar, c.durum, c.rnd);
    if (!ck) return this.bitir('bos');
    c.gorunurKalan -= 1;
    const degerler = satirDegerleri(c.ayar, ck);
    const parca: Partial<MotorGorunumu> = { anahtar: this.g.anahtar + 1, sure: T, degerler };
    if (c.nesne === 'zar' || c.nesne === 'iki-zar') {
      const adet = zarYuzAdedi(T);
      parca.zarYuzleri = degerler.slice(0, c.nesne === 'iki-zar' ? 2 : 1).map((v) => zarYuzDizisi(c.rnd, adet, Number(v)));
    }
    if (c.nesne === 'cark') {
      const hedef = ibreDurmaAcisi(carkDilimleri(c.d), ck.secimler[0] ?? 0, c.rnd(), ayar.boyut);
      parca.ibreAcisi = T > 0 ? sonrakiIbreAcisi(this.g.ibreAcisi, hedef) : hedef;
      parca.carkSecilen = null;
    }
    this.guncelle(parca);
    const basZamani = this.saat.simdi();
    let yazildi = false;
    const satirYaz = () => {
      if (yazildi || this.calisma !== c) return;
      yazildi = true;
      c.donmeBekleyen = null;
      this.satirlariYaz(c, [ck], true);
      if (c.tur === 'dokunus' || T >= 700) {
        this.cikis.duyuru(`${fiil(c.nesne).charAt(0).toLocaleUpperCase('tr')}${fiil(c.nesne).slice(1)} ${this.g.son?.sira ?? c.yapilan}: ${degerler.join(' + ').replace(/ \+ (\d+)$/, ' = $1')}`);
      }
      // Sonuç okunabilsin: atışın kalan süresi, başlangıca göre (zamanlayıcı kayması birikmez); çarkta kısa bir duruş
      const kalan =
        c.nesne === 'cark' ? carkSonucDurusu(T) : Math.max(0, basZamani + T - this.saat.simdi());
      if (c.yapilan >= c.hedef) {
        if (T > 0 && c.tur !== 'dokunus') this.zamanla(c, () => this.bitir('tamam'), kalan);
        else this.bitir('tamam');
      } else this.zamanla(c, () => this.adim(), kalan);
    };
    if (T <= 0) satirYaz();
    else if (c.nesne === 'cark') {
      c.donmeBekleyen = satirYaz;
      this.zamanla(c, satirYaz, carkYedekSuresi(T));
    } else this.zamanla(c, satirYaz, T * (asamaOranlari(c.nesne).satir ?? 0.8));
  }

  /** Çarkın ibresi durdu (`transitionend`): bekleyen satır yazılır */
  donmeBitti(): void {
    const f = this.calisma?.donmeBekleyen;
    if (f) f();
  }

  /**
   * Anında kısım: kare başına en çok 24 ms iş. Tabloya yazılan deneyde satırlar birkaç büyük parçada tek çağrıyla
   * yazılır; tabloya yazılmayan deneyde çekilişler biriktirilir ve sonunda tek çağrıyla özete yazılır (her `veri`
   * çağrısı uygulamayı yeniden çizer). Sahne kare başına bir kez, son çekilişle ve durağan güncellenir.
   */
  private aninda(): void {
    const c = this.calisma;
    if (!c) return;
    c.kare = null;
    const bas = this.saat.simdi();
    const yapilan = () => c.yapilan + c.birikmis.length;
    const kareBasina = c.tabloya ? anindaParcasi(c.hedef - c.plan.gorunur, !!c.seri) : c.hedef;
    const cekilenler: Cekilis[] = [];
    let bos = false;
    while (yapilan() + cekilenler.length < c.hedef && cekilenler.length < kareBasina) {
      const ck = tekCekilis(c.ayar, c.durum, c.rnd);
      if (!ck) {
        bos = true;
        break;
      }
      cekilenler.push(ck);
      if (this.saat.simdi() - bas >= ANINDA_KARE_BUTCESI) break;
    }
    if (cekilenler.length > 0) {
      if (c.tabloya) this.satirlariYaz(c, cekilenler, false);
      else c.birikmis.push(...cekilenler);
      const son = cekilenler[cekilenler.length - 1];
      const degerler = satirDegerleri(c.ayar, son);
      const parca: Partial<MotorGorunumu> = { anahtar: this.g.anahtar + 1, sure: 0, degerler, zarYuzleri: null };
      if (!c.tabloya) parca.yapilan = yapilan();
      if (c.nesne === 'cark') {
        const i = son.secimler[0] ?? 0;
        parca.ibreAcisi = ibreDurmaAcisi(carkDilimleri(c.d), i, 0.5, this.ayarAl().boyut);
        parca.carkSecilen = i;
      }
      this.guncelle(parca);
    }
    const bitti = bos || yapilan() >= c.hedef;
    if (bitti && c.birikmis.length > 0) {
      const liste = c.birikmis;
      c.birikmis = [];
      this.satirlariYaz(c, liste, false);
    }
    if (bos) return this.bitir('bos');
    if (bitti) return this.bitir('tamam');
    c.kare = this.saat.kare(() => this.aninda());
  }

  /** Satırları tek `veri` çağrısıyla yazar; sayıları ve son atış yuvasını günceller */
  private satirlariYaz(c: Calisma, liste: Cekilis[], canli: boolean): void {
    const ekle = liste.map((ck) => {
      const hucreler = satirDegerleri(c.ayar, ck);
      if (izlenenMi(c.d, hucreler)) c.sayi += 1;
      return { kimlik: kimlikUret('r'), hucreler, calisma: c.no };
    });
    c.yapilan += ekle.length;
    this.cikis.veri({ ekle });
    if (canli) this.cikis.yeniSatir(ekle[ekle.length - 1].kimlik);
    const cekilenler =
      c.nesne === 'torba' && !c.d.torba.geriAt ? [...this.g.cekilenler, ...ekle.map((e) => e.hucreler[0] ?? '')] : this.g.cekilenler;
    let sira = c.yapilan;
    if (c.tur === 'dokunus' && this.dokunus && this.dokunus.no === c.no) {
      this.dokunus.sira += ekle.length;
      sira = this.dokunus.sira;
    }
    const parca: Partial<MotorGorunumu> = {
      yapilan: c.tur === 'dokunus' ? sira : c.yapilan,
      cekilenler,
      son: { degerler: ekle[ekle.length - 1].hucreler, sira, no: c.no },
    };
    if (c.nesne === 'cark' && canli) {
      const son = liste[liste.length - 1];
      parca.carkSecilen = son.secimler[0] ?? null;
    }
    this.guncelle(parca);
  }

  /** Çalışmayı bitirir: kayıt kapanır (etiket gerçek atış sayısıyla), tost ve duyuru; seride sıradaki deney başlar */
  private bitir(neden: 'tamam' | 'bos' | 'dur'): void {
    const c = this.calisma;
    if (!c) return;
    if (c.birikmis.length > 0) {
      const liste = c.birikmis;
      c.birikmis = [];
      this.satirlariYaz(c, liste, false);
    }
    this.temizle(c);
    this.calisma = null;
    this.cikis.veri({ calismaBitir: c.no });
    if (c.tur === 'dokunus') {
      if (neden === 'bos') this.cikis.bildirim(torbaBosaldiMetni(this.dokunus?.sira ?? c.yapilan));
      this.guncelle({ calisiyor: false });
      return;
    }
    if (neden === 'bos') this.cikis.bildirim(torbaBosaldiMetni(c.yapilan));
    else if (neden === 'dur') {
      if (c.yapilan > 0) this.cikis.bildirim(durdurulduMetni(c.nesne, { n: c.yapilan, etiket: deneyEtiketi(c.no, c.yapilan) }));
    } else if (!c.seri) {
      this.cikis.bildirim(tamamlandiMetni(c.d, c.yapilan, c.sayi));
      this.cikis.duyuru(tamamlandiDuyurusu(c.d, c.yapilan, c.sayi));
    }
    if (c.seri && neden === 'tamam' && c.seri.sira + 1 < c.seri.adimlar.length) {
      const sira = c.seri.sira + 1;
      const hedef = c.seri.adimlar[sira];
      this.baslat(c.d, 'seri', c.no + 1, hedef, canlandirmaPlani(hedef, 3, true, c.nesne), { ...c.seri, sira });
      return;
    }
    this.akisYaz(false);
    this.guncelle({ calisiyor: false, butce: null, sure: 0, zarYuzleri: null });
    if (c.seri) {
      const yapilan = neden === 'tamam' ? c.seri.adet : c.seri.sira + (c.yapilan > 0 ? 1 : 0);
      if (neden === 'tamam') {
        this.cikis.ozeteGec();
        this.cikis.bildirim(seriBittiMetni(yapilan));
        this.cikis.duyuru(`Seri tamamlandı: ${yapilan} deney`);
      }
    }
  }

  private temizle(c: Calisma): void {
    c.zamanlayicilar.forEach((z) => this.saat.iptal(z));
    c.zamanlayicilar = [];
    if (c.kare !== null) this.saat.kareIptal(c.kare);
    c.kare = null;
    c.donmeBekleyen = null;
  }

  /** Durdur: çalışma o ana kadarki atışlarla kaydedilir; `sessiz` iken tost yok (sökülme, sıfırlama) */
  durdur(sessiz = false): void {
    const c = this.calisma;
    if (!c) return;
    if (sessiz) {
      if (c.birikmis.length > 0) {
        const liste = c.birikmis;
        c.birikmis = [];
        this.satirlariYaz(c, liste, false);
      }
      this.temizle(c);
      this.calisma = null;
      this.cikis.veri({ calismaBitir: c.no });
      this.akisYaz(false);
      this.g = { ...this.g, calisiyor: false, butce: null, sure: 0 };
      return;
    }
    this.bitir('dur');
  }

  /** Bileşen söküldü: iş yarıda kalmasın (çalışma kaydı kapanır), akış kapanır */
  sok(): void {
    this.durdur(true);
  }
}

/** Tarayıcı zamanlayıcısı */
export const TARAYICI_ZAMANLAYICISI: Zamanlayici = {
  zaman: (fn, ms) => window.setTimeout(fn, ms),
  iptal: (id) => window.clearTimeout(id),
  kare: (fn) => window.requestAnimationFrame(() => fn()),
  kareIptal: (id) => window.cancelAnimationFrame(id),
  simdi: () => (typeof performance !== 'undefined' ? performance.now() : Date.now()),
};


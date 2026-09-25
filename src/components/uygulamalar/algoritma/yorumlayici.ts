/**
 * Algoritma Laboratuvarı — yorumlayıcı.
 *
 * Program bir dünyada baştan sona çalıştırılır ve her adımın ardından dünyanın durumu kaydedilir
 * (iz). Arayüz izi ileri/geri oynatır: "adım", "geri adım", hız bu sayede yeniden hesap yapmadan
 * çalışır. Çalışma belirlenimcidir (rastgelelik yok).
 *
 * Adım türleri:
 * - tur          döngünün yeni turu başlıyor (koşullu döngüde koşul "hayır" dedi)
 * - donguBitti   koşullu döngünün koşulu "evet" dedi, döngüden çıkılıyor
 * - kosul        "eğer" bloğu koşula baktı (evet / hayır)
 * - eylem        robot bir eylem yaptı (hata olabilir: çalışma orada durur)
 * - atama        bir değişken yeni değer aldı
 * - cagri        kendi tanımlanan bir komut çalışmaya başladı
 *
 * Komut tanımları (tanim) sırada çalışmaz; yalnız çağrıldıklarında gövdeleri çalışır.
 *
 * Sonsuz döngü: koşullu bir döngü, robot yerinden kıpırdamadan, hiçbir şeye dokunmadan ve hiçbir
 * değişken değişmeden DURGUN_TUR_SINIRI tur dönerse çalışma durdurulur. Toplam adım ADIM_SINIRI ile sınırlıdır.
 */
import {
  KEZ_IFADE_EN_COK,
  govdeliMi,
  karsilastirmaMi,
  type Blok,
  type EylemTuru,
  type Ifade,
  type Karsilastirma,
  type Kosul,
  type Program,
} from './program';
import {
  baslangicDurumu,
  eylemUygula,
  hedefEksikleri,
  kosulDegeri,
  olcumDegeri,
  type DunyaDurumu,
  type DunyaTanimi,
  type Eksik,
  type Hata,
  type Hedef,
} from './dunya';

export const DURGUN_TUR_SINIRI = 20;
export const ADIM_SINIRI = 600;
export const CAGRI_DERINLIGI = 8;

export type AdimTuru = 'tur' | 'donguBitti' | 'kosul' | 'eylem' | 'atama' | 'cagri';

export interface Adim {
  tur: AdimTuru;
  blokId: string;
  /** Adımdan SONRAKİ dünya durumu */
  durum: DunyaDurumu;
  /** Çalışan blokların kimlikleri (dıştan içe; son eleman bu adımın bloğu) */
  yigin: string[];
  /** Döngülerin o anki turu: blokId → tur (1'den) */
  turlar: Record<string, number>;
  turNo?: number;
  /** Döngünün toplam tur sayısı (n kez) */
  toplamTur?: number;
  kosul?: Kosul;
  sonuc?: boolean;
  /** Karşılaştırmanın iki yanının o anki değerleri */
  degerler?: [number, number];
  eylem?: EylemTuru;
  /** Atama: değişken ve yeni değeri */
  degisken?: string;
  deger?: number;
  /** Çağrılan komut */
  komut?: string;
  hata?: Hata;
}

export interface BlokSayimi {
  /** Eylem / atama: kaç kez yapıldı · döngü: kaç tur döndü · eğer: kaç kez baktı · komut: kaç kez çağrıldı */
  calisma: number;
  evet: number;
  hayir: number;
}

export interface CalismaSonucu {
  basarili: boolean;
  hata: Hata | null;
  eksikler: Eksik[];
}

export interface Iz {
  baslangic: DunyaDurumu;
  adimlar: Adim[];
  sayimlar: Record<string, BlokSayimi>;
  sonuc: CalismaSonucu;
  son: DunyaDurumu;
}

class Durdur extends Error {
  constructor(readonly hata: Hata) {
    super(hata.tur);
  }
}

/** Değişkenlerin tamsayı olmayan değerleri iki basamağa yuvarlanır (kayan nokta tortusu kalmasın) */
const yuvarla = (n: number) => Math.round(n * 1e6) / 1e6;

export function calistir(program: Program, dunya: DunyaTanimi, hedef: Hedef): Iz {
  const baslangic = baslangicDurumu(dunya);
  let durum = baslangic;
  const adimlar: Adim[] = [];
  const sayimlar: Record<string, BlokSayimi> = {};
  const yigin: string[] = [];
  const turlar: Record<string, number> = {};
  /** Son "ilerleme" (konum, dokunma ya da değişken değişimi) anındaki adım sayısı */
  let sonIlerleme = 0;
  const tanimlar = new Map<string, Blok[]>();
  for (const b of program) if (b.tur === 'tanim') tanimlar.set(b.ad, b.govde);
  let derinlik = 0;

  const say = (id: string) => (sayimlar[id] ??= { calisma: 0, evet: 0, hayir: 0 });
  const kaydet = (a: Omit<Adim, 'durum' | 'yigin' | 'turlar'>) => {
    adimlar.push({ ...a, durum, yigin: [...yigin], turlar: { ...turlar } });
    if (adimlar.length >= ADIM_SINIRI) {
      throw new Durdur({ tur: 'cokUzun', x: durum.x, y: durum.y, yon: durum.yon, blokId: a.blokId });
    }
  };
  const dur = (tur: Hata['tur'], blokId: string, ek: Partial<Hata> = {}): never => {
    throw new Durdur({ tur, x: durum.x, y: durum.y, yon: durum.yon, blokId, ...ek });
  };

  const deger = (i: Ifade, blokId: string): number => {
    switch (i.tur) {
      case 'sayi':
        return i.deger;
      case 'olcum':
        return olcumDegeri(durum, i.olcum);
      case 'degisken': {
        const v = durum.degiskenler[i.ad];
        if (v === undefined) dur('tanimsiz', blokId, { ad: i.ad });
        return v as number;
      }
      case 'islem': {
        const a = deger(i.sol, blokId);
        const b = deger(i.sag, blokId);
        switch (i.op) {
          case '+':
            return yuvarla(a + b);
          case '-':
            return yuvarla(a - b);
          case '×':
            return yuvarla(a * b);
          case '÷':
            if (b === 0) dur('bolmeSifir', blokId);
            return yuvarla(a / b);
          case 'mod':
            if (b === 0) dur('bolmeSifir', blokId);
            return ((a % b) + b) % b;
        }
      }
    }
  };

  const karsilastir = (k: Karsilastirma, blokId: string): { sonuc: boolean; degerler: [number, number] } => {
    const a = deger(k.sol, blokId);
    const b = deger(k.sag, blokId);
    const sonuc = k.op === '<' ? a < b : k.op === '>' ? a > b : k.op === '=' ? a === b : k.op === '≠' ? a !== b : k.op === '≤' ? a <= b : a >= b;
    return { sonuc, degerler: [a, b] };
  };

  const kosulBak = (k: Kosul, blokId: string): { sonuc: boolean; degerler?: [number, number] } =>
    karsilastirmaMi(k) ? karsilastir(k, blokId) : { sonuc: kosulDegeri(durum, k) };

  const eylem = (b: Blok & { tur: 'eylem' }) => {
    const once = durum;
    const { durum: yeni, hata } = eylemUygula(durum, b.eylem, b.id);
    durum = yeni;
    say(b.id).calisma += 1;
    const ilerledi =
      yeni.x !== once.x ||
      yeni.y !== once.y ||
      yeni.sepet !== once.sepet ||
      yeni.harcanan !== once.harcanan ||
      yeni.cizgiler.length !== once.cizgiler.length ||
      yeni.boyali.length !== once.boyali.length ||
      yeni.noktalar.length !== once.noktalar.length ||
      yeni.kupler.some((k, i) => k !== once.kupler[i]) ||
      yeni.bitkiler.some((k, i) => k.gubre !== once.bitkiler[i].gubre);
    if (ilerledi) sonIlerleme = adimlar.length;
    kaydet({ tur: 'eylem', blokId: b.id, eylem: b.eylem, hata: hata ?? undefined });
    if (hata) throw new Durdur(hata);
  };

  const dizi = (liste: Blok[]) => {
    for (const b of liste) blok(b);
  };

  const blok = (b: Blok) => {
    // Komut tanımı sırada çalışmaz
    if (b.tur === 'tanim') return;
    yigin.push(b.id);
    try {
      switch (b.tur) {
        case 'eylem':
          eylem(b);
          return;
        case 'ata': {
          const v = deger(b.ifade, b.id);
          const eski = durum.degiskenler[b.degisken];
          durum = { ...durum, degiskenler: { ...durum.degiskenler, [b.degisken]: v } };
          say(b.id).calisma += 1;
          if (eski !== v) sonIlerleme = adimlar.length;
          kaydet({ tur: 'atama', blokId: b.id, degisken: b.degisken, deger: v });
          return;
        }
        case 'cagir': {
          const govde = tanimlar.get(b.ad);
          if (!govde) dur('bilinmeyenKomut', b.id, { ad: b.ad });
          if (derinlik >= CAGRI_DERINLIGI) dur('derin', b.id, { ad: b.ad });
          say(b.id).calisma += 1;
          kaydet({ tur: 'cagri', blokId: b.id, komut: b.ad });
          derinlik += 1;
          try {
            dizi(govde as Blok[]);
          } finally {
            derinlik -= 1;
          }
          return;
        }
        case 'eger': {
          const { sonuc, degerler } = kosulBak(b.kosul, b.id);
          const s = say(b.id);
          s.calisma += 1;
          if (sonuc) s.evet += 1;
          else s.hayir += 1;
          kaydet({ tur: 'kosul', blokId: b.id, kosul: b.kosul, sonuc, degerler });
          if (sonuc) dizi(b.govde);
          else if (b.degilse) dizi(b.degilse);
          return;
        }
        case 'tekrarlaKez': {
          let kez = b.kez;
          if (b.kezIfade) {
            const v = deger(b.kezIfade, b.id);
            if (!Number.isInteger(v) || v < 0 || v > KEZ_IFADE_EN_COK) dur('gecersizSayi', b.id, { deger: v });
            kez = v;
          }
          for (let t = 1; t <= kez; t++) {
            turlar[b.id] = t;
            say(b.id).calisma += 1;
            kaydet({ tur: 'tur', blokId: b.id, turNo: t, toplamTur: kez });
            dizi(b.govde);
          }
          delete turlar[b.id];
          return;
        }
        case 'tekrarlaKadar': {
          // Koşullu döngü: her turdan önce koşula bakılır
          let t = 0;
          let durgun = 0;
          for (;;) {
            const { sonuc, degerler } = kosulBak(b.kosul, b.id);
            if (sonuc) {
              say(b.id).evet += 1;
              kaydet({ tur: 'donguBitti', blokId: b.id, kosul: b.kosul, sonuc: true, degerler });
              break;
            }
            t += 1;
            turlar[b.id] = t;
            const s = say(b.id);
            s.calisma += 1;
            s.hayir += 1;
            const bas = adimlar.length;
            kaydet({ tur: 'tur', blokId: b.id, turNo: t, kosul: b.kosul, sonuc: false, degerler });
            dizi(b.govde);
            // Bu turda ilerleme olmadıysa (son ilerleme turun başından önceyse) durgun tur sayısı artar
            durgun = sonIlerleme > bas ? 0 : durgun + 1;
            if (durgun >= DURGUN_TUR_SINIRI) dur('sonsuz', b.id);
          }
          delete turlar[b.id];
          return;
        }
      }
    } finally {
      yigin.pop();
    }
  };

  let hata: Hata | null = null;
  try {
    dizi(program);
  } catch (e) {
    if (e instanceof Durdur) hata = e.hata;
    else throw e;
  }
  const eksikler = hata ? [] : hedefEksikleri(durum, hedef);
  return {
    baslangic,
    adimlar,
    sayimlar,
    sonuc: { basarili: !hata && eksikler.length === 0, hata, eksikler },
    son: durum,
  };
}

/** İzden sayısal özetler (başarı cümleleri ve soruların cevapları bunlardan hesaplanır). */
export function izOzeti(iz: Iz) {
  const eylemSayisi = (e: EylemTuru) => iz.adimlar.filter((a) => a.tur === 'eylem' && a.eylem === e && !a.hata).length;
  return {
    sulama: eylemSayisi('sula'),
    ileri: eylemSayisi('ileri'),
    toplama: eylemSayisi('topla'),
    gubre: eylemSayisi('gubreVer'),
    donus: eylemSayisi('sagaDon') + eylemSayisi('solaDon'),
    boya: eylemSayisi('boya') + eylemSayisi('ek'),
    kup: iz.son.kupler.reduce((a, b) => a + b, 0),
    nokta: iz.son.noktalar.length,
    /** Robotun çizdiği farklı birim çizgi sayısı */
    cizgi: iz.son.cizgiler.length,
    kalanSu: iz.son.depo,
    harcananSu: iz.son.harcanan,
    sepet: iz.son.sepet,
    degiskenler: iz.son.degiskenler,
  };
}

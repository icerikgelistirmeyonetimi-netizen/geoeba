/**
 * Algoritma Laboratuvarı — sınama ve geri bildirim.
 *
 * Program görünen dünyada ve sınama dünyalarında (sürpriz dünya dahil) çalıştırılır. Her dünya
 * için çocuğun anlayacağı dilde bir ileti üretilir: ileti suçlamaz, nerede ve ne olduğunu söyler.
 * Yıldızlar: ★ görünen dünyada doğru · ★★ bütün dünyalarda doğru · ★★★ ayrıca verimli.
 */
import { KEZ_IFADE_EN_COK, blokSayisi, sayiMetni, type Program } from './program';
import { ADIM_SINIRI, DURGUN_TUR_SINIRI, calistir, type CalismaSonucu, type Iz } from './yorumlayici';
import { SULAMA_LITRE, cikisX, hedefAdi, izgara, koordinatlar, surprizDunya, type DunyaTanimi, type Eksik, type Hata, type Hedef, type SurprizAyari } from './dunya';

export interface SinamaAyari {
  gorunen: DunyaTanimi;
  sinama: DunyaTanimi[];
  surpriz?: SurprizAyari;
  hedef: Hedef;
  /** ★★★ ölçütü */
  enFazlaBlok?: number;
  /** Bitkinin adı iletilerde: "saksı" ya da "bitki" */
  bitkiAdi: 'saksı' | 'bitki';
}

export interface DunyaSonucu {
  dunya: DunyaTanimi;
  /** Görünen dünya mı */
  gorunen: boolean;
  iz: Iz;
  basarili: boolean;
  ileti: string;
}

export interface SinamaSonucu {
  dunyalar: DunyaSonucu[];
  yildiz: 0 | 1 | 2 | 3;
  blokSayisi: number;
  /** ★★ var ama ★★★ yoksa neden */
  verimlilikNotu: string | null;
}

// ---------------------------------------------------------------------------
// Türkçe yardımcılar
// ---------------------------------------------------------------------------

/** [2, 5, 9] → "2., 5. ve 9." */
export function siraListesi(s: readonly number[]): string {
  const p = s.map((n) => `${n}.`);
  if (p.length <= 1) return p.join('');
  return `${p.slice(0, -1).join(', ')} ve ${p[p.length - 1]}`;
}

/** Sıra sayılarıyla ad tekil kalır: "5. ve 7. saksı". */
function bitkiYazi(adi: string, s: readonly number[]): string {
  return `${siraListesi(s)} ${adi}`;
}

function yerAdi(h: { x: number }, bitkiSayisi: number): string {
  if (h.x === 0) return 'başlangıçta';
  if (h.x === bitkiSayisi + 1) return 'çıkışta';
  return `${h.x}. hücrede`;
}

/** (3, 2) biçiminde koordinat */
export function noktaMetni(p: { x: number; y: number }): string {
  return `(${sayiMetni(p.x)}, ${sayiMetni(p.y)})`;
}

/** İnşaat alanında özne dron: "Robot …" cümleleri "Dron …" olur (çıkışlı inşaat atölyeleri, sonsuz döngü) */
export function ozneli(metin: string, dunya: DunyaTanimi | undefined): string {
  return dunya && izgara(dunya).tur === 'insaat' ? metin.replace(/\bRobot\b/g, 'Dron') : metin;
}

export function hataIletisi(h: Hata, dunya: DunyaTanimi, bitkiAdi: string): string {
  return ozneli(hataIletisiHam(h, dunya, bitkiAdi), dunya);
}

function hataIletisiHam(h: Hata, dunya: DunyaTanimi, bitkiAdi: string): string {
  const n = dunya.bitkiler.length;
  const g = izgara(dunya);
  switch (h.tur) {
    case 'yanlisCizgi':
      return dunya.eksen ? 'Robot şekilde olmayan bir çizgi çizdi; aynadaki çizgiyle eşleşmiyor.' : 'Robot şekilde olmayan bir çizgi çizdi.';
    case 'yanlisBoya':
      if (dunya.boyaTuru === 'ek') return 'Robot tarlanın dışına tohum ekti.';
      return dunya.eksen ? 'Robot boyanmayacak bir kareyi boyadı; aynadaki kareyle eşleşmiyor.' : 'Robot boyanmayacak bir kareyi boyadı.';
    case 'yanlisKup':
      return h.alt === 'fazla' ? `Bu kule ${h.hedefYukseklik} küp olmalı; fazladan küp kondu.` : 'Dron küpü yanlış yere koydu; burada küp olmayacaktı.';
    case 'yanlisNokta':
      return `Robot yanlış noktayı işaretledi: ${noktaMetni(koordinatlar(g, h.x, h.y))}.`;
    case 'tanimsiz':
      return `${h.ad} değişkeninin henüz bir değeri yok. Önce ona bir değer ver.`;
    case 'gecersizSayi':
      return `Tekrar sayısı ${sayiMetni(h.deger ?? 0)} olamaz; 0 ile ${KEZ_IFADE_EN_COK} arasında bir tam sayı olmalı.`;
    case 'bolmeSifir':
      return 'Sıfıra bölme yapılamaz.';
    case 'bilinmeyenKomut':
      return `${h.ad} diye bir komut tanımlanmadı.`;
    case 'derin':
      return `${h.ad} komutu kendini çok kez çağırdı.`;
    default:
      break;
  }
  if (h.tur === 'duvar' && h.alt === 'kenar') return g.tur === 'insaat' ? 'Dron inşaat alanının kenarına geldi; daha ileri gidemez.' : 'Robot sahanın kenarına geldi; daha ileri gidemez.';
  if (g.bahce) {
    // Bahçe: hücre numarası yerine gördüğü şey
    if (h.tur === 'duvar') return h.alt === 'cit' ? (dunya.boyaTuru === 'ek' ? 'Robot tarlanın çitine çarptı.' : 'Robot bahçenin çitine çarptı.') : 'Robot çalıya çarptı.';
    if (h.tur === 'bosSula') return 'Robot boş yeri suladı; orada saksı yok.';
    if (h.tur === 'bosTopla' && h.alt !== 'kalmamis') return 'Robot boş yerde toplamaya çalıştı; orada domates yok.';
    if (h.tur === 'bosGubre') return 'Robot boş yere gübre verdi; orada bitki yok.';
  }
  switch (h.tur) {
    case 'duvar':
      if (h.yon === 1 || h.yon === 3) return 'Robot yana dönmüştü; ilerleyince sıranın kenarındaki duvara çarptı.';
      if (h.x === n + 1) return 'Robot çıkışa vardıktan sonra da ilerledi ve duvara çarptı.';
      if (h.x === 0) return 'Robot geriye doğru ilerledi ve başlangıçtaki duvara çarptı.';
      return 'Robot duvara çarptı.';
    case 'tasma':
      return `${h.bitki}. ${bitkiAdi === 'saksı' ? 'saksının' : 'bitkinin'} toprağı zaten nemliydi; su taştı.`;
    case 'bosSula':
      return `Robot ${yerAdi(h, n)} suladı; orada saksı yok, su boşa aktı.`;
    case 'depoBos': {
      // Kaç litre kaldığı ve nerede bittiği: "1 litre var, bir sulama 2 litre" (2x ≤ 30 görevlerinde asıl nokta)
      const kalan = h.deger ?? 0;
      const ne = kalan > 0 ? `depoda yetecek su kalmadı: ${kalan} litre var, bir sulama ${SULAMA_LITRE} litre.` : 'depoda su kalmadı.';
      return h.bitki ? `${h.bitki}. ${bitkiAdi === 'saksı' ? 'saksıya' : 'bitkiye'} gelince ${ne}` : `D${ne.slice(1)}`;
    }
    case 'ham':
      return `${h.bitki}. bitkideki domates yeşildi; ham domates koparıldı.`;
    case 'bosTopla':
      if (h.alt === 'kalmamis') return `${h.bitki}. bitkide toplanacak domates kalmamıştı.`;
      return `Robot ${yerAdi(h, n)} toplamaya çalıştı; orada domates yok.`;
    case 'gereksizGubre':
      return `${h.bitki}. ${bitkiAdi === 'saksı' ? 'saksıdaki fidenin' : 'bitkinin'} yaprakları sağlamdı; gübre gereksizdi.`;
    case 'bosGubre':
      return `Robot ${yerAdi(h, n)} gübre verdi; orada bitki yok.`;
    case 'sonsuz':
      return `Robot ${DURGUN_TUR_SINIRI} turdur yerinden kıpırdamadı. Döngü hiç bitmeyecek gibi görünüyor.`;
    case 'cokUzun':
      return `Program çok uzun sürdü; ${ADIM_SINIRI} adımdan sonra durduruldu.`;
    default:
      return 'Program durdu.';
  }
}

/** "(2, 3) ve (4, 5)" */
function noktaListesi(p: readonly { x: number; y: number }[]): string {
  const m = p.map(noktaMetni);
  return m.length <= 1 ? m.join('') : `${m.slice(0, -1).join(', ')} ve ${m[m.length - 1]}`;
}

export function eksikIletisi(e: Eksik, bitkiAdi: string, dunya?: DunyaTanimi): string {
  return ozneli(eksikIletisiHam(e, bitkiAdi, dunya), dunya);
}

function eksikIletisiHam(e: Eksik, bitkiAdi: string, dunya?: DunyaTanimi): string {
  switch (e.tur) {
    case 'cikis': {
      if (e.uzaklik !== undefined) {
        const ad = dunya ? hedefAdi(dunya) : { yalin: 'çıkış', yonelme: 'çıkışa', belirtme: 'çıkışı' };
        if (e.gecti) return `Robot ${ad.belirtme} ${e.uzaklik} kare geçti.`;
        return `Robot ${ad.yonelme} varamadı: ${ad.yalin} ${e.uzaklik} kare uzakta.`;
      }
      if (!e.bakilmayan.length) return 'Robot çıkışa varamadı.';
      // Yönelme hâli: saksıya / bitkiye
      return `Robot çıkışa varamadı; ${siraListesi(e.bakilmayan)} ${bitkiAdi === 'saksı' ? 'saksıya' : 'bitkiye'} hiç uğramadı.`;
    }
    case 'susuz':
      return `${bitkiYazi(bitkiAdi, e.bitkiler)} susuz kaldı.`;
    case 'gubresiz':
      return `Sararmış yapraklı ${bitkiYazi(bitkiAdi, e.bitkiler)} gübresiz kaldı.`;
    case 'dalda':
      return e.bitkiler.length === 1
        ? `${e.bitkiler[0]}. bitkideki olgun domates dalda kaldı.`
        : `${e.bitkiler.length} olgun domates dalda kaldı (${siraListesi(e.bitkiler)} bitki).`;
    case 'uzunYol': {
      const ad = dunya ? hedefAdi(dunya) : { yonelme: 'çıkışa' };
      return `Robot ${ad.yonelme} ${e.adim} adımda vardı. Daha kısa bir yol var: ${e.enKisa} adım.`;
    }
    case 'cizim':
      return `Şeklin ${e.eksik} çizgisi eksik kaldı.`;
    case 'boya':
      return dunya?.boyaTuru === 'ek' ? `Tarlada ${e.eksik} kare boş kaldı.` : `${e.eksik} kare boyanmadı.`;
    case 'yapi':
      return e.kuleler > 1 ? `Yapıda ${e.eksik} küp eksik (${e.kuleler} kulede).` : `Yapıda ${e.eksik} küp eksik.`;
    case 'nokta':
      return e.noktalar.length === 1 ? `${noktaMetni(e.noktalar[0])} noktası işaretlenmedi.` : `${noktaListesi(e.noktalar)} noktaları işaretlenmedi.`;
    case 'degisken':
      return e.olan === undefined
        ? `${e.ad} değişkenine hiç değer verilmedi; ${sayiMetni(e.beklenen)} olmalıydı.`
        : `${e.ad} ${sayiMetni(e.beklenen)} olmalıydı; program bitince ${sayiMetni(e.olan)} oldu.`;
  }
}

/** Çalışmanın tek cümlelik açıklaması (başarılıysa olumlu). */
export function sonucIletisi(s: CalismaSonucu, dunya: DunyaTanimi, bitkiAdi: string): string {
  if (s.hata) return hataIletisi(s.hata, dunya, bitkiAdi);
  if (s.eksikler.length) return s.eksikler.map((e) => eksikIletisi(e, bitkiAdi, dunya)).join(' ');
  return 'Program bu dünyada doğru çalıştı.';
}

// ---------------------------------------------------------------------------
// Sınama
// ---------------------------------------------------------------------------

export function sina(program: Program, a: SinamaAyari, tohum: number): SinamaSonucu {
  const liste: { dunya: DunyaTanimi; gorunen: boolean }[] = [
    { dunya: a.gorunen, gorunen: true },
    ...a.sinama.map((d) => ({ dunya: d, gorunen: false })),
  ];
  if (a.surpriz) liste.push({ dunya: surprizDunya(a.surpriz, tohum), gorunen: false });
  const dunyalar = liste.map(({ dunya, gorunen }) => {
    const iz = calistir(program, dunya, a.hedef);
    return { dunya, gorunen, iz, basarili: iz.sonuc.basarili, ileti: sonucIletisi(iz.sonuc, dunya, a.bitkiAdi) };
  });
  const n = blokSayisi(program);
  const gorunenTamam = dunyalar[0].basarili;
  const hepsi = dunyalar.every((d) => d.basarili);
  const verimli = a.enFazlaBlok === undefined || n <= a.enFazlaBlok;
  const yildiz: SinamaSonucu['yildiz'] = !gorunenTamam ? 0 : !hepsi ? 1 : verimli ? 3 : 2;
  return {
    dunyalar,
    yildiz,
    blokSayisi: n,
    verimlilikNotu: yildiz === 2 && a.enFazlaBlok !== undefined ? `Programında ${n} blok var. Aynı işi ${a.enFazlaBlok} blokla yapmak mümkün.` : null,
  };
}

/** Görünen dünyadaki başarısızlık için ilk ileti (Çalıştır düğmesi sonrası). */
export function tekDunyaSonucu(program: Program, dunya: DunyaTanimi, hedef: Hedef, bitkiAdi: SinamaAyari['bitkiAdi']): DunyaSonucu {
  const iz = calistir(program, dunya, hedef);
  return { dunya, gorunen: true, iz, basarili: iz.sonuc.basarili, ileti: sonucIletisi(iz.sonuc, dunya, bitkiAdi) };
}

/** Dünyanın kısa şeması (sınama listesi): "K Y K" gibi, çıkış dahil hücre sayısı. */
export function dunyaUzunlugu(d: DunyaTanimi): number {
  return cikisX(d) + 1;
}

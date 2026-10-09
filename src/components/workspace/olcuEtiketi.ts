import { ARALIK } from './esitlikCizimi';

/**
 * Düz bir çizgiyi ölçen etiketler (doğru parçası uzunluğu, çokgen kenarı, iki nokta arası mesafe,
 * doğru/ışın üzerindeki |AB|) ölçtükleri çizgiye PARALEL yazılır; teknik resimdeki ölçü yazıları gibi.
 *
 * Kural: yazı hiçbir zaman baş aşağı okunmaz. Açı [-90°, 90°) aralığına katlanır; tam dikey çizgide
 * yazı aşağıdan yukarıya (sayfanın sağından okunur gibi) durur. Girdi EKRAN koordinatıdır (y aşağı).
 * Değer çizimin her karesinde uç noktalardan yeniden hesaplandığı için çizgi döndürüldüğünde ya da bir
 * ucu taşındığında etiket yeni doğrultuya kendiliğinden uyar.
 */
export function etiketAcisi(dx: number, dy: number): number {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return 0;
  if (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9) return 0;
  let aci = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (aci >= 90) aci -= 180;
  else if (aci < -90) aci += 180;
  return Object.is(aci, -0) ? 0 : aci;
}

/** SVG `transform` değeri: etiketi kendi merkezi (cx, cy) çevresinde çizgiye paralel döndürür. */
export function etiketDondurme(dx: number, dy: number, cx: number, cy: number): string {
  const aci = etiketAcisi(dx, dy);
  if (aci === 0) return '';
  return `rotate(${Number(aci.toFixed(2))} ${cx} ${cy})`;
}

/**
 * Etiket, ölçtüğü şekle olan başlangıç uzaklığını bu kadar (ekran px) aşınca "uzak" sayılır:
 * o andan sonra yalnızca değer değil TAM yazım kullanılır (|AB| = 8 br) ve yazı çizgiye paralel
 * değil DÜZ durur. Kullanıcı isteği: kenarın üstündeyken sade değer, uzaklaşınca hangi şeye ait
 * olduğu okunsun; bunun için aşırı uzaklaştırmak gerekmesin.
 */
export const ETIKET_UZAK_ESIK = 18;

interface EtiketNoktasi { x: number; y: number }

/** Noktanın sonlu doğru parçasına en kısa uzaklığı; uçların dışında en yakın uç kullanılır. */
function parcayaUzaklik(p: EtiketNoktasi, a: EtiketNoktasi, b: EtiketNoktasi): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const boy = Math.hypot(dx, dy);
  if (boy < 1e-9) return Math.hypot(p.x - a.x, p.y - a.y);
  const ux = dx / boy;
  const uy = dy / boy;
  const izdusus = Math.max(0, Math.min(boy, (p.x - a.x) * ux + (p.y - a.y) * uy));
  return Math.hypot(p.x - a.x - izdusus * ux, p.y - a.y - izdusus * uy);
}

/**
 * Merkez ve kayma ekran pikselidir. Kenar boyunca taşımak etiketi uzaklaştırmaz;
 * kenarın öbür yanına geri getirilen etiket de yeniden yakın sayılır. Başlangıç
 * merkezi, kutunun ve eşitlik çentiğinin gerektirdiği sabit açıklığı korur.
 */
export function cizgiEtiketiUzakta(
  a: EtiketNoktasi, b: EtiketNoktasi, merkez: EtiketNoktasi, kayma: EtiketNoktasi,
  esik: number = ETIKET_UZAK_ESIK,
): boolean {
  const son = { x: merkez.x + kayma.x, y: merkez.y + kayma.y };
  return parcayaUzaklik(son, a, b) > parcayaUzaklik(merkez, a, b) + esik;
}

/** Köşeye yaklaşan ya da köşenin çevresinde aynı uzaklıkta taşınan açı etiketi kısa kalır. */
export function aciEtiketiUzakta(
  kose: EtiketNoktasi, merkez: EtiketNoktasi, kayma: EtiketNoktasi,
  esik: number = ETIKET_UZAK_ESIK,
): boolean {
  const baslangic = Math.hypot(merkez.x - kose.x, merkez.y - kose.y);
  const son = Math.hypot(merkez.x + kayma.x - kose.x, merkez.y + kayma.y - kose.y);
  return son > baslangic + esik;
}

/** Ekran geometrisi: y aşağı, açılar radyan ve tarama yönü işaretlidir. */
export interface YayEtiketGeometrisi {
  merkez: EtiketNoktasi;
  yaricap: number;
  baslangic: number;
  tarama: number;
}

/** Sonlu yayın en yakın noktası; taramanın dışında çember yerine yayın uçlarını kullanır. */
function yayaYakinlik(yay: YayEtiketGeometrisi, p: EtiketNoktasi): { uzaklik: number; aci: number } {
  const dx = p.x - yay.merkez.x;
  const dy = p.y - yay.merkez.y;
  if (yay.yaricap < 1e-9) return { uzaklik: Math.hypot(dx, dy), aci: yay.baslangic };
  const tamTur = 2 * Math.PI;
  const aci = Math.hypot(dx, dy) < 1e-9 ? yay.baslangic : Math.atan2(dy, dx);
  const yon = yay.tarama < 0 ? -1 : 1;
  const fark = ((yon * (aci - yay.baslangic)) % tamTur + tamTur) % tamTur;
  if (Math.abs(yay.tarama) >= tamTur - 1e-9 || fark <= Math.abs(yay.tarama) + 1e-9 || tamTur - fark < 1e-9) {
    return { uzaklik: Math.abs(Math.hypot(dx, dy) - yay.yaricap), aci };
  }
  const ucaUzaklik = (t: number) => Math.hypot(dx - yay.yaricap * Math.cos(t), dy - yay.yaricap * Math.sin(t));
  const sonAci = yay.baslangic + yay.tarama;
  const basa = ucaUzaklik(yay.baslangic);
  const sona = ucaUzaklik(sonAci);
  return basa <= sona ? { uzaklik: basa, aci: yay.baslangic } : { uzaklik: sona, aci: sonAci };
}

/**
 * Yay boyunca taşınan yakın etiket, en yakın yay noktasındaki teğete paralel döner.
 * Yaydan uzaklaşınca yatay olur. Kısa kutunun başlangıç merkezi her iki biçimde de
 * aynı kalır; dışarıdan yayın içine getirilen etiketin gerçek uzaklığı yeniden ölçülür.
 */
export function yayEtiketiYerlesimi(
  yay: YayEtiketGeometrisi, merkez: EtiketNoktasi, kayma: EtiketNoktasi,
  esik: number = ETIKET_UZAK_ESIK,
): { uzak: boolean; donmeAcisi: number } {
  const baslangic = yayaYakinlik(yay, merkez);
  const son = yayaYakinlik(yay, { x: merkez.x + kayma.x, y: merkez.y + kayma.y });
  const uzak = son.uzaklik > baslangic.uzaklik + esik;
  return {
    uzak,
    donmeAcisi: uzak || yay.yaricap < 1e-9 ? 0 : etiketAcisi(-Math.sin(son.aci), Math.cos(son.aci)),
  };
}

/** Eski çağıranlar için kayıklık eşiği; geometriye yakınlıkta yukarıdaki işlevler kullanılır. */
export function etiketUzaklasmisMi(kaymaX: number, kaymaY: number, esik: number = ETIKET_UZAK_ESIK): boolean {
  return Math.hypot(kaymaX, kaymaY) > esik;
}

/** Doğrusal ölçü etiketinin EKRAN çerçevesi: a→b birim yönü, sol normali, boyu ve orta noktası (px). */
export interface CizgiCercevesi { ex: number; ey: number; nx: number; ny: number; boy: number; ox: number; oy: number }

export function cizgiCercevesi(a: EtiketNoktasi, b: EtiketNoktasi): CizgiCercevesi | null {
  const dx = b.x - a.x, dy = b.y - a.y;
  const boy = Math.hypot(dx, dy);
  if (!(boy > 1e-6)) return null;
  const ex = dx / boy, ey = dy / boy;
  return { ex, ey, nx: -ey, ny: ex, boy, ox: (a.x + b.x) / 2, oy: (a.y + b.y) / 2 };
}

/**
 * Etiket MERKEZİNİN kenar eksenindeki yeri (ekran px → eksen): `boyunca` orta noktadan kenar boyunun
 * kesri, `dik` ÇİZGİNİN KENDİSİNDEN işaretli uzaklık (dünya birimi, a→b'nin sol normali yönünde).
 * Doğal konuma değil çizgiye göre ölçülür: parça dikeyden geçerken etiketin doğal tarafı değişse de
 * elle konmuş etiket çizgiye göre aynı yerde kalır (2026-09-25: "dik açıya kaydırdığımda uzunluk
 * ölçümünü uzağa fırlatıyor").
 */
export function kenarEksenine(p: EtiketNoktasi, c: CizgiCercevesi, zoom: number): { boyunca: number; dik: number } {
  const rx = p.x - c.ox, ry = p.y - c.oy;
  return { boyunca: (rx * c.ex + ry * c.ey) / c.boy, dik: (rx * c.nx + ry * c.ny) / (zoom || 1) };
}

/** Kenar ekseni → etiket merkezinin ekran yeri: kenar kısalıp uzadıkça aynı ORANDA kayar, çizgiye uzaklığı korur. */
export function kenarEkseninden(o: { boyunca: number; dik: number }, c: CizgiCercevesi, zoom: number): EtiketNoktasi {
  const t = o.boyunca * c.boy;
  const n = o.dik * (zoom || 1);
  return { x: c.ox + c.ex * t + c.nx * n, y: c.oy + c.ey * t + c.ny * n };
}

/**
 * Saklanan `eksenDik`in bugünkü karşılığı. `taban`, sürükleme anında VARSAYILAN yerin dik uzaklığıdır; `simdi`
 * bugünkü varsayılanınki (ikisi de çizgiye göre işaretli, aynı birimde). Varsayılan çizgiye yaklaşıp uzaklaştıysa
 * (uzunluk ölçümü kesikli çizgili kattan yalın banda geçti ya da tersi, eşitlik çentiği geldi) etiket AYNI YANDA
 * durdukça bu farkla kayar: elle verilen kayıklık korunur, yerleşim değişimi etiketi "uzak" yapmaz. Doğal yan
 * dönünce (parça dikeyden geçti: |simdi| = |taban|) ya da etiket çizginin öbür yanına taşınmışsa dik uzaklık
 * değişmez; kayma etiketi öbür yana geçiremez (en çok çizginin üstüne, 0'a iner). Taban yoksa (eski kayıt) aynen.
 */
export function tabanaGoreDik(dik: number, taban: number | undefined, simdi: number): number {
  if (taban === undefined || !Number.isFinite(taban) || !Number.isFinite(simdi) || Math.abs(taban) < 1e-9) return dik;
  if (Math.sign(dik) !== Math.sign(taban)) return dik;
  const sonuc = dik + Math.sign(taban) * (Math.abs(simdi) - Math.abs(taban));
  return Math.sign(sonuc) === Math.sign(taban) ? sonuc : 0;
}

/** Açı yayının temel yarıçapı (etiket yerleşim pikseli; ekranda etiketOlcegi ile çarpılır). */
export const ACI_YAYI_YARICAPI = 22;
/**
 * Dar açıda yay en çok bu kadar büyür. 55'te 10° açının yayı ~10 px kalıyor, kollardaki eş uzunluk çentiği gibi
 * kısa bir çizgi görünüyordu (doğrulama, 2026-09-25); kol sınırı (aşağıda) kısa kollu açıyı zaten frenler.
 */
export const ACI_YAYI_EN_BUYUK = 90;
/** Dar açıda hedeflenen en kısa yay boyu (px): r · θ bu değerin altına düşmesin diye yarıçap büyür. */
const ACI_YAYI_HEDEF_BOY = 18;
/**
 * Kol sınırı: yay, kısa kolun ORTASINDAKİ eş uzunluk çentiğinin ve uzunluk etiketinin altında kalır
 * (r ≤ kol/2 − 11: tek çentikten 11 px, üçlü öbeğin ucundan 7 px içeride). %70 sınırında yay, kol boyu ≈ 2r
 * olan yaygın üçgenlerde (25°'de ~2 br kol) çentiğin tam üstüne düşüp onunla '+' ya da tek çubuk oluşturuyordu.
 */
const ACI_YAYI_KOL_PAYI = 11;

/**
 * Açı yayının yarıçapı (etiket yerleşim pikseli). 60° ve üstünde (dış açı dahil) sabit 22; dar açıda yay
 * okunur kalsın diye büyür (kullanıcı, 2026-09-25: "dar açılarda açı dairesi çok küçük kalıyor"):
 * r = max(22, hedef / θ), en çok 90 ve kısa kolun yarısından 11 px içeride; hiçbir durumda 22'nin altına inmez.
 * Hedef yay boyu 18 px'tir; eş açı çentiği taşıyan açıda çentik sayısıyla uzar (düz öğedeki kural:
 * (k − 1) · ARALIK + 16), böylece üçlü çentik yayı baştan sona kaplayan sıkışık bir blok olmaz ve
 * yay boyu çentiğin alt sınırının hep üstünde kalır (yöne göre görünüp kaybolmaz).
 * Yay çizimi, eş açı çentikleri ve açı rozetinin yerleşimi AYNI değeri kullanır.
 */
export function aciYayYaricapi(derece: number, kisaKolPx?: number, centikSayisi = 0): number {
  if (!Number.isFinite(derece) || derece <= 0 || derece >= 60) return ACI_YAYI_YARICAPI;
  const k = Number.isFinite(centikSayisi) ? Math.max(0, Math.round(centikSayisi)) : 0;
  const hedef = Math.max(ACI_YAYI_HEDEF_BOY, k > 0 ? (k - 1) * ARALIK + 16 : 0);
  let r = Math.min(ACI_YAYI_EN_BUYUK, hedef / ((derece * Math.PI) / 180));
  if (kisaKolPx !== undefined && Number.isFinite(kisaKolPx)) r = Math.min(r, kisaKolPx / 2 - ACI_YAYI_KOL_PAYI);
  return Math.max(ACI_YAYI_YARICAPI, r);
}

/** Aynı köşedeki iç içe açıların yayları arasındaki en az aralık (etiket yerleşim pikseli). */
export const ACI_YAYI_ARALIK = 8;

/** Bir köşedeki açı: yön açıları (radyan, işaretli tarama) ve aciYayYaricapi'nin verdiği yarıçap. */
export interface KoseAcisi {
  id: string;
  /** Köşe noktasının kimliği: yalnız aynı köşedeki açılar karşılaştırılır. */
  kose: string;
  baslangic: number;
  tarama: number;
  r: number;
  /** Yarıçapı değişmez (dik açı karesi bugünkü boyutta kalır); yine de içteki açı olarak sayılır. */
  sabit?: boolean;
}

/**
 * AYNI KÖŞEDEKİ AÇILAR (ders kitabı düzeni): kapsayan açının yayı, kapsadığı açıların yaylarının DIŞINDA durur.
 * Dar açıda yay büyüdüğü için 20° + 30° = 50° gibi iç içe açılarda kapsayan 50°'nin 22'lik yayı en içte kalıyor,
 * '50°' rozeti de başka bir açının yayıyla ışın arasına düşüyordu (doğrulama, 2026-09-25). Kapsayan açı,
 * kapsadığı her açının yayından en az ACI_YAYI_ARALIK dışarı alınır. Aynı kollu iç ve dış açı (tümler) da
 * birbirinden bu kadar ayrılır; 3-4 px arayla çift çizgi gibi durmaz. Dönen harita her açının son yarıçapıdır.
 */
export function koseAcilariniAyir(acilar: readonly KoseAcisi[]): Map<string, number> {
  const TUR = 2 * Math.PI;
  const EPS = 1e-6;
  const sonuc = new Map<string, number>();
  const aralik = (a: KoseAcisi) => {
    const boy = Math.min(TUR, Math.abs(a.tarama));
    const bas = a.tarama < 0 ? a.baslangic + a.tarama : a.baslangic;
    return { bas: ((bas % TUR) + TUR) % TUR, boy };
  };
  const fark = (x: number, y: number) => ((((y - x) % TUR) + TUR) % TUR);
  // İçteki (Y) açının taraması dıştakinin (X) içinde mi (kollar ortak olabilir)?
  const kapsar = (x: { bas: number; boy: number }, y: { bas: number; boy: number }) => {
    if (!(x.boy > y.boy + EPS)) return false;
    let d = fark(x.bas, y.bas);
    if (d > TUR - EPS) d = 0;
    return d + y.boy <= x.boy + EPS;
  };
  // Aynı iki kolu paylaşan iç ve dış açı: taramalar tam turu tamamlar, biri ötekinin bittiği yerden başlar
  const tumler = (x: { bas: number; boy: number }, y: { bas: number; boy: number }) => {
    if (Math.abs(x.boy + y.boy - TUR) > EPS) return false;
    const d = fark(x.bas + x.boy, y.bas);
    return d < EPS || d > TUR - EPS;
  };
  const koseler = new Map<string, KoseAcisi[]>();
  for (const a of acilar) {
    sonuc.set(a.id, a.r);
    const liste = koseler.get(a.kose);
    if (liste) liste.push(a);
    else koseler.set(a.kose, [a]);
  }
  for (const liste of koseler.values()) {
    if (liste.length < 2) continue;
    // Küçük taramadan büyüğe: içteki açıların son yarıçapı, onları kapsayanınkinden önce bellidir
    const sirali = liste.map((a) => ({ a, ar: aralik(a) })).sort((x, y) => x.ar.boy - y.ar.boy || (x.a.id < y.a.id ? -1 : 1));
    for (let i = 0; i < sirali.length; i++) {
      const { a, ar } = sirali[i];
      if (a.sabit) continue;
      let r = sonuc.get(a.id)!;
      for (let j = 0; j < i; j++) {
        const ic = sirali[j];
        if (kapsar(ar, ic.ar) || (tumler(ar, ic.ar) && ar.boy > ic.ar.boy + EPS)) {
          r = Math.max(r, sonuc.get(ic.a.id)! + ACI_YAYI_ARALIK);
        }
      }
      sonuc.set(a.id, r);
    }
  }
  return sonuc;
}

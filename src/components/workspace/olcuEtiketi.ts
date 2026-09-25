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

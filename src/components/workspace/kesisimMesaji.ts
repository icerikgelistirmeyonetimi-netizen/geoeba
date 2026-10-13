/**
 * Kesiştir aracının bildirimi (alan uzmanı, atölye inceleme 4. tur, ortaokul).
 *
 * Eski metin nesne adlarını olduğu gibi diziyordu ve okunmuyordu: "ABG Açıortayı ile Dik doğru: G / AB tek noktada
 * kesişiyor: L". Önerilen biçim: "d ile e doğrularının kesişim noktası L(x; y)". Burada her çizginin okunur adı
 * kurulur ("G noktasından AB doğrusuna dik doğru"), ikinci ad tamlayan ekini alır ("…doğrunun") ve kesişim
 * noktası koordinatıyla yazılır. İki düz doğruda ders kitabı biçimi kullanılır: "AB ile CD doğrularının …".
 */
import type { MathObject } from '@/types/math';
import { formatCoordinate } from '@/math/coordinates';

/** Nokta adı gibi duran sözcük (A, AB, [AB], |AB|, A', A₁): küçük harfe çevrilmez. */
const NOKTA_ADI = /^[[\]|(]*[A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜ0-9'′₀-₉_]*[\]|)]*$/u;

/** Tür sözcüklerini küçük harfe çevirir, nokta adlarını korur ("AB Doğrusu" → "AB doğrusu"). */
function kucukTurler(metin: string): string {
  return metin
    .trim()
    .split(/\s+/)
    .map((s) => (NOKTA_ADI.test(s) ? s : s.toLocaleLowerCase('tr-TR')))
    .join(' ');
}

const katla = (s: string) => s.toLocaleLowerCase('tr-TR');

/** Nesnenin cümle içinde okunur adı; her zaman Türkçe bir tür adıyla biter ("AB doğrusu", "A merkezli çember"). */
export function okunurAd(o: MathObject): string {
  const ham = (o.label ?? '').trim();
  const k = katla(ham);
  switch (o.type) {
    case 'line': {
      const m = /^(dik|paralel) doğru:\s*(.+?)\s*\/\s*(.+)$/iu.exec(ham);
      if (m) return `${m[2]} noktasından ${m[3]} doğrusuna ${katla(m[1])} doğru`;
      return k.includes('doğru') || k.includes('dikme') ? kucukTurler(ham) : `${ham} doğrusu`;
    }
    case 'ray':
      return k.includes('ışın') || k.includes('açıortay') ? kucukTurler(ham) : `${ham} ışını`;
    case 'segment': {
      const m = /^[[|](.+)[\]|]$/u.exec(ham);
      if (m) return `[${m[1]}] doğru parçası`;
      return k.includes('doğru parça') ? kucukTurler(ham) : `${ham} doğru parçası`;
    }
    case 'circle':
      return k.includes('çember') || k.includes('daire') ? kucukTurler(ham) : `${ham} çemberi`;
    case 'arc':
      return k.includes('yay') ? kucukTurler(ham) : `${ham} yayı`;
    case 'sector':
      return k.includes('dilim') ? kucukTurler(ham) : `${ham} daire dilimi`;
    case 'ellipse':
      return k.includes('elips') ? kucukTurler(ham) : `${ham} elipsi`;
    default:
      return kucukTurler(ham || 'şekil');
  }
}

const UNLULER = 'aıoueiöü';
function uyum(unlu: string): string {
  if ('aı'.includes(unlu)) return 'ı';
  if ('ei'.includes(unlu)) return 'i';
  if ('ou'.includes(unlu)) return 'u';
  return 'ü';
}

/** Ad öbeğinin son sözcüğüne tamlayan (ilgi) eki: "doğrusu" → "doğrusunun", "çember" → "çemberin". */
export function tamlayan(ad: string): string {
  const k = katla(ad);
  const son = k[k.length - 1];
  if (!son) return ad;
  if (UNLULER.includes(son)) return `${ad}n${uyum(son)}n`;
  const unlu = [...k].reverse().find((c) => UNLULER.includes(c));
  return `${ad}${uyum(unlu ?? 'e')}n`;
}

const buyukBasla = (s: string) => (s ? s[0].toLocaleUpperCase('tr-TR') + s.slice(1) : s);

export interface KesisimNoktasi {
  ad: string;
  x: number;
  y: number;
}

/** "L(2; −0,3)" biçimi (iki ondalık; virgül ayırıcı). */
export const noktaKoordinatli = (n: KesisimNoktasi): string => `${n.ad}${formatCoordinate(n, 2)}`;

const EGRI = new Set(['circle', 'arc', 'sector', 'ellipse']);

/**
 * Kesişim bildirimi. `gorunmeyen`: görünür alanın dışında kalan noktaların adları (öğrenci harfi tuvalde arayıp
 * bulamıyordu; görmek için uzaklaştırması söylenir).
 */
export function kesisimMesaji(
  o1: MathObject, o2: MathObject, noktalar: readonly KesisimNoktasi[], gorunmeyen: readonly string[] = [],
): string {
  const a1 = okunurAd(o1);
  const a2 = okunurAd(o2);
  const ikiDogru = o1.type === 'line' && o2.type === 'line' && / doğrusu$/u.test(a1) && / doğrusu$/u.test(a2);
  const ozne = ikiDogru
    ? `${a1.replace(/ doğrusu$/u, '')} ile ${a2.replace(/ doğrusu$/u, '')} doğrularının`
    : `${a1} ile ${tamlayan(a2)}`;
  const liste = noktalar.map(noktaKoordinatli);
  const listeMetni = liste.length > 1 ? `${liste.slice(0, -1).join(', ')} ve ${liste[liste.length - 1]}` : liste[0] ?? '';
  const teget = noktalar.length === 1 && (EGRI.has(o1.type) || EGRI.has(o2.type));
  let cumle = teget
    ? `${ozne} değme noktası ${listeMetni} (teğet)`
    : `${ozne} kesişim ${noktalar.length > 1 ? 'noktaları' : 'noktası'} ${listeMetni}`;
  if (gorunmeyen.length) {
    cumle += `. ${gorunmeyen.join(', ')} görünür alanın dışında; görmek için uzaklaştırın`;
  }
  return buyukBasla(cumle) + '.';
}

/** Kesişim yoksa: "AB doğrusu ile CD doğrusu kesişmiyor." */
export function kesismiyorMesaji(o1: MathObject, o2: MathObject): string {
  return `${buyukBasla(okunurAd(o1))} ile ${okunurAd(o2)} kesişmiyor.`;
}

/**
 * 2B tuvalde 3B cisimlerin üstten görünüm bilgisi: cismin YANINDA tek satır, birbirine ve cisimlere binmeden.
 *
 * Alan uzmanı (4. tur, geoeba (3).xlsx [175]): 'Küp 1 (Kare)', 'Koni 1 (Daire (Koni))' başlıkları ve alt alta
 * dizilen hacim / taban alanı kutuları birbirinin üstüne biniyor, çizim alanını kalabalıklaştırıyordu. Artık her cisim
 * için tek bir satır vardır ("Küp 1 · Taban alanı = 9 birimkare · V = 27 br³"); satır cismin sağına konur, orada başka bir
 * cisim, ölçü etiketi ya da önceki bir satır varsa sola, üste, alta ve kaydırılmış konumlara bakılır (rozetleriYerlestir).
 * Taban biçiminin adı (Kare, Daire…) yazılmaz: çizimin kendisi gösteriyor.
 */
import { formatTurkishNumber } from './coordinates';
import { metinDugumleri, metniSeslendir } from './matematikYazimi';
import { kutuOlcusu } from './yazimDuzeni';
import type { ProjectedSolid2D } from './solidProjection2D';

/** Ekran dikdörtgeni (sol üst köşe + boyut, piksel) */
export interface EkranKutusu {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Satırın iki parçası: kalın yazılan ad ve değerler ("Taban alanı = 9 birimkare · V = 27 br³"). `yalnizAd` (ilkokul, 4. tur
 * [180]): yalnız cismin adı — bu kipte izdüşüm etiketinde taban alanı ve hacim değerleri gösterilmez.
 */
export function cisimBilgiSatiri(
  proj: Pick<ProjectedSolid2D, 'name' | 'type' | 'topView' | 'badge'>,
  secenek: { yalnizAd?: boolean } = {},
): { ad: string; degerler: string } {
  if (secenek.yalnizAd) return { ad: proj.name, degerler: '' };
  const parcalar: string[] = [];
  if (!proj.topView) parcalar.push(...proj.badge.dimParts);
  // Kürenin tabanı yoktur: üstten görünüşü daire olsa da "taban alanı" yazılmaz
  else if (proj.type !== 'sphere') parcalar.push(`Taban alanı = ${formatTurkishNumber(proj.topView.baseArea)} birimkare`);
  parcalar.push(`V = ${formatTurkishNumber(proj.badge.volume)} br³`);
  return { ad: proj.name, degerler: parcalar.join(' · ') };
}

/** Standart MatematikEtiketi ile aynı yazım ve kutu ölçüsü: çizim ile çakışma hesabı birlikte değişir. */
export function cisimEtiketYazimi(metin: string, px = 11) {
  const satirlar = [metinDugumleri(metin)];
  return { satirlar, olcu: kutuOlcusu(satirlar, px), sesli: metniSeslendir(metin), ipucu: metin };
}

export function cisimBilgiEtiketi(satir: { ad: string; degerler: string }, px = 11) {
  return cisimEtiketYazimi([satir.ad, satir.degerler].filter(Boolean).join(' · '), px);
}

export function satirGenisligi(satir: { ad: string; degerler: string }, px = 11): number {
  return cisimBilgiEtiketi(satir, px).olcu.genislik;
}

/** Üstten görünümün ekrandaki sınır kutusu (çokgen köşeleri ya da daire). */
export function izdusumGovdesi(proj: Pick<ProjectedSolid2D, 'topView' | 'footprint'>): EkranKutusu {
  const tv = proj.topView;
  if (tv?.radius) {
    return { x: tv.centerScreen.x - tv.radius, y: tv.centerScreen.y - tv.radius, w: 2 * tv.radius, h: 2 * tv.radius };
  }
  const noktalar = tv?.points?.length ? tv.points : proj.footprint.points;
  if (noktalar.length === 0) {
    const c = proj.footprint.centerScreen;
    return { x: c.x, y: c.y, w: 0, h: 0 };
  }
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of noktalar) {
    x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y);
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** Kenar ölçü etiketlerinin standart yazı boyu ve yakınlık ölçeğine göre ekrandaki kutuları. */
export function kenarEtiketKutulari(proj: Pick<ProjectedSolid2D, 'topView'>, olcek: number, px = 11): EkranKutusu[] {
  return (proj.topView?.dimensionLabels ?? []).map((l) => {
    const { olcu } = cisimEtiketYazimi(l.text, px);
    const w = olcu.genislik * olcek;
    const h = olcu.yukseklik * olcek;
    return { x: l.x - w / 2, y: l.y - h / 2, w, h };
  });
}

export interface RozetGirdisi {
  id: string;
  govde: EkranKutusu;
  kenarlar: EkranKutusu[];
  /** Satırın ekrandaki boyutu (ölçek uygulanmış) */
  w: number;
  h: number;
}

const kesisim = (a: EkranKutusu, b: EkranKutusu) =>
  Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

/**
 * Her cismin satırının MERKEZİ. Sırayla denenen yerler: sağ, sol, üst, alt; sonra sağ ve sol, satır yüksekliği
 * adımlarıyla aşağı / yukarı kaydırılmış. Bir yer, bütün cisim gövdelerine, kenar ölçü etiketlerine, tuvalin
 * düğmelerine (engeller) ve önceden yerleşmiş satırlara binmiyor ve (verildiyse) tuvalin içinde kalıyorsa seçilir;
 * hiçbiri boş değilse en az binen yer. Gövdesi tuvalin dışındaki cisim için yer verilmez (satırı çizilmez).
 */
export function rozetleriYerlestir(
  girdiler: readonly RozetGirdisi[],
  aralik: number,
  tuval?: { w: number; h: number },
  /** Tuvalin üstündeki sabit HTML katmanları (eksenSayilari.tuvalEngelleri) */
  engeller: readonly EkranKutusu[] = [],
): Map<string, { x: number; y: number }> {
  const sabit: EkranKutusu[] = [...girdiler.flatMap((g) => [g.govde, ...g.kenarlar]), ...engeller];
  const yerlesen: EkranKutusu[] = [];
  const sonuc = new Map<string, { x: number; y: number }>();
  for (const g of girdiler) {
    const { govde, w, h } = g;
    // Gövdesi tuvalin tamamen dışında kalan cismin satırı yazılmaz (kenara yapışıp düğmelerin altına girmesin)
    if (tuval && !(govde.x < tuval.w && govde.x + govde.w > 0 && govde.y < tuval.h && govde.y + govde.h > 0)) continue;
    const ortaY = govde.y + govde.h / 2;
    const ortaX = govde.x + govde.w / 2;
    const sag = govde.x + govde.w + aralik + w / 2;
    const sol = govde.x - aralik - w / 2;
    // Alttaki kenar etiketinin (varsa) altına iner
    const altSinir = Math.max(govde.y + govde.h, ...g.kenarlar.map((k) => k.y + k.h));
    const adaylar: { x: number; y: number }[] = [
      { x: sag, y: ortaY },
      { x: sol, y: ortaY },
      { x: ortaX, y: govde.y - aralik - h / 2 },
      { x: ortaX, y: altSinir + aralik + h / 2 },
    ];
    for (let k = 1; k <= 6; k++) {
      const d = k * (h + aralik / 2);
      adaylar.push({ x: sag, y: ortaY + d }, { x: sag, y: ortaY - d }, { x: sol, y: ortaY + d }, { x: sol, y: ortaY - d });
    }
    let enIyi = adaylar[0];
    let enAz = Infinity;
    for (const a of adaylar) {
      const kutu = { x: a.x - w / 2, y: a.y - h / 2, w, h };
      let puan = 0;
      for (const e of sabit) puan += kesisim(kutu, e);
      for (const e of yerlesen) puan += 4 * kesisim(kutu, e); // satır satıra binmesin: daha ağır
      if (tuval) {
        const ic = kesisim(kutu, { x: 0, y: 0, w: tuval.w, h: tuval.h });
        puan += 2 * (w * h - ic);
      }
      if (puan < enAz - 1e-9) {
        enAz = puan;
        enIyi = a;
        if (puan === 0) break;
      }
    }
    yerlesen.push({ x: enIyi.x - w / 2, y: enIyi.y - h / 2, w, h });
    sonuc.set(g.id, enIyi);
  }
  return sonuc;
}

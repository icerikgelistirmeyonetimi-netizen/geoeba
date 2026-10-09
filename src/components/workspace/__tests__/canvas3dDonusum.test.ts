import { describe, expect, it } from 'vitest';
import type { Solid3DObject, Solid3DType } from '@/types/workspace3d';
import { generateSolidMesh } from '@/math/geometry3d';
import { cismiDondur, cismiOlcekle } from '@/math/donusum3d';
import {
  aciyiYuvarla,
  ayritOlcusu,
  ayritiDegistir,
  duzlemEtiketi,
  duzlemNormali,
  eksenEtrafindaAci,
  eksenKamerayaBakiyor,
  eulerMetni,
  hacimAlanMetni,
  halkaAcisi,
  halkaDuzlemiAcik,
  karsiYuz,
  kutuKoseleri,
  olcekNotu,
  ikiParmakKamera,
  kameraEtkilesimi,
  parmakCifti,
  surukleAcisi,
  turkceSayiOku,
  turkceSayiYaz,
  tutamacOlcegi,
  uzunlukMetni,
} from '../canvas3dDonusum';

function cisim(type: Solid3DType, ek: Partial<Solid3DObject> = {}): Solid3DObject {
  return {
    id: `s-${type}`, type, name: `${type} 1`, position: { x: 1, y: 2, z: 0 },
    dimensions: { width: 3, height: 4, depth: 2, radius: 1.5 }, rotation: { x: 0, y: 0, z: 0 },
    color: '#3b82f6', opacity: 0.85, showWireframe: true, showVertices: true, showFaces: true, unfoldProgress: 0, selectedFaceIndex: null, ...ek,
  };
}

describe('surukleAcisi (serbest sürükleme)', () => {
  it('yatay sürükleme z eksenine, dikey sürükleme kamera sağ vektörüne gider (piksel başına 0,5°)', () => {
    expect(surukleAcisi(100, 0, false)).toEqual({ zDerece: 50, sagDerece: 0 });
    expect(surukleAcisi(0, -40, false)).toEqual({ zDerece: 0, sagDerece: -20 });
    expect(surukleAcisi(20, 10, false)).toEqual({ zDerece: 10, sagDerece: 5 });
  });
  it('Shift basılıyken 15° adımlara yuvarlar', () => {
    expect(surukleAcisi(100, 0, true).zDerece).toBe(45);
    expect(surukleAcisi(14, 0, true).zDerece).toBe(0);
    expect(surukleAcisi(0, 50, true).sagDerece).toBe(30);
    expect(aciyiYuvarla(-22, true)).toBe(-15);
    expect(aciyiYuvarla(-22, false)).toBe(-22);
  });
  it('sürükleme açısı cismiDondur ile uygulanınca Euler z toplanır', () => {
    const { zDerece } = surukleAcisi(180, 0, false);
    expect(cismiDondur(cisim('cube'), 'z', zDerece).rotation).toEqual({ x: 0, y: 0, z: 90 });
  });
});

describe('halkaAcisi (eksen halkası sürükleme)', () => {
  const merkez = { x: 100, y: 100 };
  it('izleyiciye bakan eksende ekranda saat yönünün tersi pozitif dönmedir', () => {
    // Sağdan (3 yönü) yukarıya (12 yönü): ekranda saat yönünün tersi (y aşağı olduğundan ham fark negatif)
    expect(halkaAcisi(merkez, { x: 150, y: 100 }, { x: 100, y: 50 }, true)).toBeCloseTo(90);
    expect(halkaAcisi(merkez, { x: 150, y: 100 }, { x: 100, y: 50 }, false)).toBeCloseTo(-90);
  });
  it('başlangıç ya da şimdiki nokta merkezdeyse 0; Shift 15° adımlara yuvarlar', () => {
    expect(halkaAcisi(merkez, merkez, { x: 150, y: 100 }, true)).toBe(0);
    expect(halkaAcisi(merkez, { x: 150, y: 100 }, { x: 100 + 50 * Math.cos(0.7), y: 100 - 50 * Math.sin(0.7) }, true, true)).toBe(45);
  });
  it('eksenKamerayaBakiyor: kamera ileri vektörünün o bileşeni negatifse eksen izleyiciye bakar', () => {
    expect(eksenKamerayaBakiyor('z', { x: 0, y: 0.7, z: -0.7 })).toBe(true);
    expect(eksenKamerayaBakiyor('y', { x: 0, y: 0.7, z: -0.7 })).toBe(false);
  });
  it('halkaDuzlemiAcik: kenardan görünen halka (|eksen · ileri| küçük) ekran açısı yedeğine düşer', () => {
    // Önden bakış: ileri = +y → z ve x halkaları kenardan, y halkası yüzden
    expect(halkaDuzlemiAcik('z', { x: 0, y: 1, z: 0 })).toBe(false);
    expect(halkaDuzlemiAcik('x', { x: 0, y: 1, z: 0 })).toBe(false);
    expect(halkaDuzlemiAcik('y', { x: 0, y: 1, z: 0 })).toBe(true);
    // İzometrik: ileri ≈ (−0,58; 0,69; −0,42) → üçü de açık
    expect(halkaDuzlemiAcik('z', { x: -0.58, y: 0.69, z: -0.42 })).toBe(true);
  });
});

describe('eksenEtrafindaAci (halka düzlemindeki kesişim vektörlerinden açı)', () => {
  it('sağ el kuralı: eksen yönünde bakınca saat yönünün tersi pozitif; bakış yanından bağımsız', () => {
    expect(eksenEtrafindaAci('z', { x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 })).toBe(90);
    expect(eksenEtrafindaAci('z', { x: 1, y: 0, z: 0 }, { x: 0, y: -1, z: 0 })).toBe(-90);
    expect(eksenEtrafindaAci('x', { x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: 1 })).toBe(90);
    expect(eksenEtrafindaAci('y', { x: 0, y: 0, z: 1 }, { x: 1, y: 0, z: 0 })).toBe(90);
  });
  it('eksen doğrultusundaki bileşen atılır; sıfır vektörde 0; Shift 15° adım', () => {
    expect(eksenEtrafindaAci('z', { x: 1, y: 0, z: 5 }, { x: 0, y: 1, z: -3 })).toBe(90);
    expect(eksenEtrafindaAci('z', { x: 0, y: 0, z: 2 }, { x: 1, y: 0, z: 0 })).toBe(0);
    expect(eksenEtrafindaAci('z', { x: 1, y: 0, z: 0 }, { x: 1, y: 0.4, z: 0 }, true)).toBe(15);
  });
  it('eğik bakışta ekran açısı yanıltır, düzlem açısı doğru kalır (izometrik z halkası, gerçek izdüşüm)', () => {
    // Kamera (yaw −40°, pitch 25°) ile z halkasına yüzden bakılmaz: 90°lik gerçek dönme ekranda ≈ 41° taranır.
    // Düzlemdeki kesişim vektörleri ise dönmenin kendisidir.
    const merkez = { x: 1, y: 2, z: 1.5 };
    const v0 = { x: 1, y: 0, z: 0 };
    const v1 = { x: 0, y: 1, z: 0 };
    expect(eksenEtrafindaAci('z', v0, v1)).toBe(90);
    // Aynı iki noktanın ekran izdüşümü (yaklaşık; eğik bakışın ürettiği elips)
    const ekran = (p: { x: number; y: number; z: number }) => ({ x: p.x * 0.77 + p.y * 0.64, y: -(p.z * 0.9) + (p.x * 0.64 - p.y * 0.77) * 0.42 });
    const m = ekran(merkez);
    const okunan = halkaAcisi(m, ekran({ x: merkez.x + v0.x, y: merkez.y + v0.y, z: merkez.z }), ekran({ x: merkez.x + v1.x, y: merkez.y + v1.y, z: merkez.z }), true);
    expect(okunan).toBeGreaterThan(0);
    expect(Math.abs(okunan - 90)).toBeGreaterThan(20);
  });
});

describe('tutamacOlcegi', () => {
  const merkez = { x: 200, y: 200 };
  it('merkeze uzaklık oranını verir ve 0,05–50 aralığına kırpar', () => {
    expect(tutamacOlcegi(merkez, { x: 250, y: 200 }, { x: 300, y: 200 })).toBe(2);
    expect(tutamacOlcegi(merkez, { x: 250, y: 200 }, { x: 225, y: 200 })).toBe(0.5);
    expect(tutamacOlcegi(merkez, { x: 201, y: 200 }, { x: 900, y: 200 })).toBe(50);
    expect(tutamacOlcegi(merkez, { x: 250, y: 200 }, { x: 200, y: 200 })).toBe(0.05);
  });
  it('başlangıç noktası merkezin üstündeyse 1 (bölme hatası yok)', () => {
    expect(tutamacOlcegi(merkez, merkez, { x: 300, y: 200 })).toBe(1);
  });
  it('oran cismiOlcekle ile uygulanınca küp kenarı ikiye katlanır, taban yerinde kalır', () => {
    const k = tutamacOlcegi(merkez, { x: 250, y: 200 }, { x: 300, y: 200 });
    const s = cismiOlcekle(cisim('cube'), k, 'taban');
    expect(s.dimensions.width).toBe(6);
    expect(s.position).toEqual({ x: 1, y: 2, z: 0 });
  });
});

describe('olcekNotu ve ölçüm metinleri', () => {
  it('ölçek notu: hacim k³, alan k²', () => {
    expect(olcekNotu(2)).toBe('Kenarlar 2 katına çıktı: hacim 8 kat, yüzey alanı 4 kat');
    expect(olcekNotu(0.5)).toBe('Kenarlar 0,5 katına indi: hacim 0,125 kat, yüzey alanı 0,25 kat');
  });
  it('hacim/alan rozeti Türkçe sayıyla yazılır', () => {
    expect(hacimAlanMetni(cisim('cube'))).toBe('V = 27 br³ · A = 54 br²');
    expect(hacimAlanMetni(cisim('prism'))).toBe('V = 24 br³ · A = 52 br²');
  });
  it('Euler okuması', () => {
    expect(eulerMetni({ x: 0, y: 0, z: 90 })).toBe('x: 0°, y: 0°, z: 90°');
    expect(eulerMetni({ x: 12.34, y: -45, z: 0 })).toBe('x: 12,3°, y: -45°, z: 0°');
  });
  it('uzunluk metni tam sayıda ondalıksız', () => {
    expect(uzunlukMetni(3)).toBe('3 br');
    expect(uzunlukMetni(2.5)).toBe('2,5 br');
    expect(uzunlukMetni(Math.sqrt(2))).toBe('1,41 br');
  });
});

describe('karsiYuz', () => {
  const KARSI: Record<string, string> = {
    'Alt Taban': 'Üst Taban', 'Ön Yüz': 'Arka Yüz', 'Sol Yüz': 'Sağ Yüz',
    'Sol Dikdörtgen': 'Sağ Dikdörtgen', 'Ön Üçgen': 'Arka Üçgen', 'Ön Üçgen Kapak': 'Arka Üçgen Kapak',
    'Alt Daire': 'Üst Daire',
  };
  const karsiEtiket = (etiket: string) => KARSI[etiket] ?? Object.keys(KARSI).find((k) => KARSI[k] === etiket) ?? null;

  it.each<[Solid3DType, number]>([['cube', 0], ['cube', 0.6], ['prism', 0], ['prism', 1], ['triangular_prism', 0], ['triangular_prism', 0.5], ['cylinder', 0], ['cylinder', 0.4]])(
    '%s (açınım %s): eşleme generateSolidMesh yüz etiketleriyle uyuşur',
    (type, unfold) => {
      const s = cisim(type, { unfoldProgress: unfold });
      const faces = generateSolidMesh(s).faces;
      let eslesme = 0;
      faces.forEach((f, i) => {
        const karsi = karsiYuz(type, i, unfold > 0);
        const beklenen = karsiEtiket(f.label || '');
        if (karsi === null) {
          expect(beklenen === null || !faces.some((g) => g.label === beklenen), `${f.label} karşılığı bulunmalıydı`).toBe(true);
        } else {
          expect(faces[karsi].label).toBe(beklenen);
          expect(karsiYuz(type, karsi, unfold > 0)).toBe(i);
          eslesme++;
        }
      });
      expect(eslesme).toBeGreaterThan(0);
    }
  );
  it('piramit, koni ve kürede eşleme yok', () => {
    expect(karsiYuz('pyramid', 1)).toBeNull();
    expect(karsiYuz('cone', 0)).toBeNull();
    expect(karsiYuz('sphere', 0)).toBeNull();
    expect(karsiYuz('triangular_prism', 0)).toBeNull();
  });
});

describe('ayrıt ölçme', () => {
  it('küpün ayrıtı 3 br; orta nokta kenarın ortası', () => {
    const o = ayritOlcusu(cisim('cube'), 0)!;
    expect(o.uzunluk).toBeCloseTo(3);
    expect(o.orta).toEqual({ x: 1, y: 0.5, z: 0 });
    expect(ayritOlcusu(cisim('cube'), 99)).toBeNull();
  });
  it('döndürülmüş cisimde ayrıt uzunluğu değişmez', () => {
    const s = cismiDondur(cisim('prism'), 'x', 37);
    expect(ayritOlcusu(s, 0)!.uzunluk).toBeCloseTo(3);
    expect(ayritOlcusu(s, 8)!.uzunluk).toBeCloseTo(4);
  });
  it('aynı ayrıta ikinci tıklama etiketi kaldırır', () => {
    const a = { solidId: 'k', edgeIdx: 2 };
    const liste = ayritiDegistir([], a);
    expect(liste).toEqual([a]);
    expect(ayritiDegistir(liste, { solidId: 'k', edgeIdx: 2 })).toEqual([]);
    expect(ayritiDegistir(liste, { solidId: 'k', edgeIdx: 3 })).toHaveLength(2);
  });
});

describe('kutuKoseleri', () => {
  it('küpün sınır kutusu 8 köşe; döndürülünce köşeler cisimle birlikte döner', () => {
    const k = kutuKoseleri(cisim('cube'));
    expect(k).toHaveLength(8);
    expect(Math.min(...k.map((p) => p.z))).toBe(0);
    expect(Math.max(...k.map((p) => p.z))).toBe(3);
    const d = kutuKoseleri(cismiDondur(cisim('cube'), 'z', 45));
    expect(d).toHaveLength(8);
    expect(Math.max(...d.map((p) => p.x)) - Math.min(...d.map((p) => p.x))).toBeCloseTo(3 * Math.SQRT2);
  });
  it('tutamaçlar döndürülmüş prizmanın KENDİ köşelerinde durur (dünya eksenli kutu gibi boşlukta yüzmez)', () => {
    const s = cismiDondur(cisim('prism'), { x: 1, y: 1, z: 0 }, 37, 'merkez');
    const vs = generateSolidMesh(s).vertices;
    for (const k of kutuKoseleri(s)) {
      const enYakin = Math.min(...vs.map((v) => Math.hypot(v.x - k.x, v.y - k.y, v.z - k.z)));
      expect(enYakin).toBeLessThan(1e-6);
    }
  });
  it('silindir ve konide kutu taban dairesini ve yüksekliği sarar', () => {
    const k = kutuKoseleri(cisim('cylinder', { position: { x: 0, y: 0, z: 0 } }));
    expect(Math.max(...k.map((p) => p.z))).toBeCloseTo(4);
    expect(Math.max(...k.map((p) => p.x))).toBeCloseTo(1.5);
    expect(Math.min(...k.map((p) => p.y))).toBeCloseTo(-1.5);
  });
});

describe('Türkçe sayı okuma', () => {
  it('virgül ve nokta kabul edilir, boşluklar atılır', () => {
    expect(turkceSayiOku('1,5')).toBe(1.5);
    expect(turkceSayiOku('2.25')).toBe(2.25);
    expect(turkceSayiOku(' -3 ')).toBe(-3);
    expect(turkceSayiOku('−4,5')).toBe(-4.5);
    expect(turkceSayiOku('0')).toBe(0);
  });
  it('geçersiz metin null', () => {
    expect(turkceSayiOku('')).toBeNull();
    expect(turkceSayiOku('abc')).toBeNull();
    expect(turkceSayiOku('1,2,3')).toBeNull();
    expect(turkceSayiOku('2x')).toBeNull();
  });
  it('yazma: virgüllü, tam sayıda ondalıksız', () => {
    expect(turkceSayiYaz(1.5)).toBe('1,5');
    expect(turkceSayiYaz(4)).toBe('4');
  });
});

describe('ayna düzlemi', () => {
  it('etiket ve normal', () => {
    expect(duzlemEtiketi('xy', 0)).toBe('xy düzlemi (z = 0)');
    expect(duzlemEtiketi('yz', 2.5)).toBe('yz düzlemi (x = 2,5)');
    expect(duzlemNormali('xz')).toEqual({ x: 0, y: 1, z: 0 });
    expect(duzlemNormali('yz')).toEqual({ x: 1, y: 0, z: 0 });
  });
});

describe('kameraEtkilesimi: fare tuşu şeması', () => {
  it('orta tuş görünümü döndürür, Shift ile kaydırır', () => {
    expect(kameraEtkilesimi(1, false, false)).toBe('orbit');
    expect(kameraEtkilesimi(1, true, false)).toBe('pan');
  });
  it('sağ tuş her zaman kaydırır (2B alışkanlığı)', () => {
    expect(kameraEtkilesimi(2, false, false)).toBe('pan');
    expect(kameraEtkilesimi(2, true, false)).toBe('pan');
  });
  it('Alt + sol tuş kaydırır; yalın sol tuş araca bırakılır', () => {
    expect(kameraEtkilesimi(0, false, true)).toBe('pan');
    expect(kameraEtkilesimi(0, true, false)).toBeNull();
    expect(kameraEtkilesimi(0, false, false)).toBeNull();
  });
});

describe('iki parmak: kaydırma ve yakınlaştırma', () => {
  it('orta nokta kayması kaydırma, aralık oranı yakınlaştırma verir', () => {
    const once = parmakCifti({ x: 100, y: 100 }, { x: 200, y: 100 });
    const sonra = parmakCifti({ x: 130, y: 140 }, { x: 330, y: 140 });
    expect(once).toEqual({ orta: { x: 150, y: 100 }, uzaklik: 100 });
    const k = ikiParmakKamera(once, sonra);
    expect(k.dPanX).toBe(80);
    expect(k.dPanY).toBe(40);
    expect(k.zoomCarpani).toBe(2);
  });
  it('parmaklar kapanınca uzaklaşır, üst üste parmak oranı bozmaz', () => {
    expect(ikiParmakKamera(parmakCifti({ x: 0, y: 0 }, { x: 200, y: 0 }), parmakCifti({ x: 50, y: 0 }, { x: 150, y: 0 })).zoomCarpani).toBe(0.5);
    expect(ikiParmakKamera(parmakCifti({ x: 0, y: 0 }, { x: 0, y: 0 }), parmakCifti({ x: 0, y: 0 }, { x: 10, y: 0 })).zoomCarpani).toBe(10);
  });
});

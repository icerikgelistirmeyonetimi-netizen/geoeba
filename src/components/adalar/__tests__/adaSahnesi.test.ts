import { beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';

/*
 * Motor modülü dinamik olarak yüklenir: özgün parça, modül içe aktarılmadan önce
 * kaydedilir; böylece içe aktarmanın global ShaderChunk'ı değiştirmediği sınanabilir.
 */
const ORIJINAL_PARCA = THREE.ShaderChunk.lights_fragment_begin;
const YONLU_CAGRI_MALZEME =
  'RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );';
const YONLU_CAGRI_DOLGU =
  'RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, dolguMalzeme, reflectedLight );';

let modul: typeof import('../adaSahnesi');

beforeAll(async () => {
  modul = await import('../adaSahnesi');
});

/** Yönlü ışık döngüsü: getDirectionalLightInfo çağrısından döngü sonuna kadar. */
function yonluBolum(parca: string): string {
  const bas = parca.indexOf('getDirectionalLightInfo( directionalLight, directLight );');
  expect(bas).toBeGreaterThan(-1);
  const son = parca.indexOf('#pragma unroll_loop_end', bas);
  expect(son).toBeGreaterThan(bas);
  return parca.slice(bas, son);
}

describe('dolguIsigiYamasi', () => {
  it('yönlü dolgu ışıklarını yalnız dağınık aydınlatmaya indirir', () => {
    const yamali = modul.dolguIsigiYamasi(ORIJINAL_PARCA);
    expect(yamali).not.toBe(ORIJINAL_PARCA);
    expect(yamali).toContain('dolguMalzeme');
    expect(yamali).toContain('UNROLLED_LOOP_INDEX > 0');

    // Yönlü ışık RE_Direct çağrısı dolguMalzeme ile yapılır
    const yonlu = yonluBolum(yamali);
    expect(yonlu).toContain('PhysicalMaterial dolguMalzeme = material;');
    expect(yonlu).toContain(YONLU_CAGRI_DOLGU);
    expect(yonlu).not.toContain(YONLU_CAGRI_MALZEME);

    // Nokta ve spot ışıkları özgün malzemeyle kalır
    const yonluOncesi = yamali.slice(0, yamali.indexOf('getDirectionalLightInfo( directionalLight, directLight );'));
    expect(yonluOncesi).toContain(YONLU_CAGRI_MALZEME);
    expect(yonluOncesi).not.toContain('dolguMalzeme');
  });

  it('idempotent: ikinci uygulama sonucu değiştirmez', () => {
    const bir = modul.dolguIsigiYamasi(ORIJINAL_PARCA);
    const iki = modul.dolguIsigiYamasi(bir);
    expect(iki).toBe(bir);
    expect(iki.split('PhysicalMaterial dolguMalzeme').length - 1).toBe(1);
  });

  it('desen eşleşmezse parçayı değiştirmeden döner', () => {
    const parca = 'void main() { gl_FragColor = vec4( 1.0 ); }';
    expect(modul.dolguIsigiYamasi(parca)).toBe(parca);
  });

  it('modülü içe aktarmak global ShaderChunk.lights_fragment_begin parçasını değiştirmez', () => {
    // Modül gerçekten yüklendi (motor sınıfı ve yama fonksiyonu erişilebilir)
    expect(modul.AdaSahnesi).toBeTypeOf('function');
    expect(THREE.ShaderChunk.lights_fragment_begin).toBe(ORIJINAL_PARCA);
    expect(THREE.ShaderChunk.lights_fragment_begin).not.toContain('dolguMalzeme');
  });
});

/*
 * Atölye aletlerinin açı matematiği. Motor sınıfı jsdom'da kurulamaz (WebGL yok),
 * bu yüzden hareket saf fonksiyonlarda tutulur ve burada doğrudan sınanır.
 */
describe('ibreTaramaAcisi', () => {
  it('yüklemede ve açılış animasyonu boyunca ibre duruşta kalır', () => {
    expect(modul.ibreTaramaAcisi(0)).toBe(0);
    expect(modul.ibreTaramaAcisi(3.4)).toBe(0);
    expect(modul.ibreTaramaAcisi(modul.IBRE_GECIKME)).toBe(0); // tarama başı: sıçrama yok
  });

  it('gerçekten ileri geri gider: +genlik, duruş, −genlik, duruş', () => {
    const g = modul.IBRE_GECIKME;
    expect(modul.ibreTaramaAcisi(g + 0.9)).toBeCloseTo(modul.IBRE_GENLIK, 6); // u=0.25 → 85°
    expect(modul.ibreTaramaAcisi(g + 1.8)).toBeCloseTo(0, 6); // u=0.5 → 60°
    expect(modul.ibreTaramaAcisi(g + 2.7)).toBeCloseTo(-modul.IBRE_GENLIK, 6); // u=0.75 → 35°
    // Tarama sonu: kayan nokta yüzünden u tam 1'in bir epsilon altına düşebilir
    expect(Math.abs(modul.ibreTaramaAcisi(g + modul.IBRE_SURE))).toBeLessThan(1e-12);

    let artiVar = false;
    let eksiVar = false;
    for (let t = 0; t <= 20; t += 0.05) {
      const a = modul.ibreTaramaAcisi(t);
      if (a > 0) artiVar = true;
      if (a < 0) eksiVar = true;
    }
    expect(artiVar).toBe(true);
    expect(eksiVar).toBe(true);
  });

  it('taramalar arasında gerçekten bekler ("arada bir")', () => {
    // 3.6 s tarama + 6.4 s durgunluk. Dikiş noktasında (u ≈ 1) kayan nokta
    // artığı kalabilir; sayısal olarak sıfır sayılır.
    for (let t = 7.1; t <= 13.5; t += 0.1) {
      expect(Math.abs(modul.ibreTaramaAcisi(t)), `t=${t.toFixed(2)}`).toBeLessThan(1e-12);
    }
  });

  it('periyodik, sınırlı ve sürekli', () => {
    for (let i = 0; i < 50; i += 1) {
      const t = i * 0.37;
      expect(modul.ibreTaramaAcisi(t)).toBeCloseTo(modul.ibreTaramaAcisi(t + modul.IBRE_PERIYOT), 9);
    }
    for (let t = 0; t <= 30; t += 0.01) {
      expect(Math.abs(modul.ibreTaramaAcisi(t))).toBeLessThanOrEqual(modul.IBRE_GENLIK + 1e-9);
      // Dikiş noktasında sıçrama olmamalı
      expect(Math.abs(modul.ibreTaramaAcisi(t + 0.01) - modul.ibreTaramaAcisi(t))).toBeLessThan(
        modul.IBRE_GENLIK * 0.05
      );
    }
  });

  it('genlik duruş açısına göre kemerin 0–180 bandında kalır', () => {
    // İbre kendi düzleminde döner; ucu (1.72) kemerin çentiklerinden (1.975) içeride kaldığı
    // için açı ne olursa olsun çarpışma yok. Sınır yalnız okunabilirlik: 0/180 uçlarına taşmamak.
    const durus = Math.PI / 3; // modeldeki 60 derece
    const genlik = modul.ibreGenligi(durus);
    expect(genlik).toBeCloseTo(modul.IBRE_GENLIK, 9);
    expect(durus + genlik).toBeLessThanOrEqual(Math.PI - modul.IBRE_KENAR_PAYI + 1e-9);
    expect(durus - genlik).toBeGreaterThanOrEqual(modul.IBRE_KENAR_PAYI - 1e-9);
  });

  it('duruş açısı uca yakınsa genlik kısılır, bilinmiyorsa varsayılan kalır', () => {
    // Model değişip ibre 20 derecede dururken bile 5 derecenin altına inmez
    const dar = modul.ibreGenligi((20 * Math.PI) / 180);
    expect(dar).toBeCloseTo((15 * Math.PI) / 180, 9);
    expect(modul.ibreGenligi(undefined)).toBe(modul.IBRE_GENLIK);
    expect(modul.ibreGenligi(Number.NaN)).toBe(modul.IBRE_GENLIK);
    // Kısılmış genlik salınıma gerçekten uygulanır
    expect(modul.ibreTaramaAcisi(modul.IBRE_GECIKME + 0.9, dar)).toBeCloseTo(dar, 6);
  });

  it('azHareket benzetimi: zaman ilerlemezse ibre kıpırdamaz', () => {
    expect(modul.ibreTaramaAcisi(0)).toBe(0);
  });
});

describe('pergelTurAcisi', () => {
  it('tam tur atar ve iki uçta hızı sıfırdır', () => {
    expect(modul.pergelTurAcisi(0)).toBe(0);
    expect(modul.pergelTurAcisi(0.5)).toBeCloseTo(Math.PI, 9);
    expect(modul.pergelTurAcisi(1)).toBeCloseTo(Math.PI * 2, 9);
  });

  it('0–1 arasında kesin monoton artar', () => {
    let onceki = -1;
    for (let i = 0; i <= 40; i += 1) {
      const a = modul.pergelTurAcisi(i / 40);
      expect(a).toBeGreaterThan(onceki);
      onceki = a;
    }
  });

  it('ilerleme aralık dışına taşarsa kenetlenir', () => {
    expect(modul.pergelTurAcisi(-1)).toBe(0);
    expect(modul.pergelTurAcisi(2)).toBeCloseTo(Math.PI * 2, 9);
  });
});

describe('saatAcisi', () => {
  const DERECE = Math.PI / 180;
  const an = (s: number, dk: number, sn: number, ms = 0) => new Date(2026, 8, 24, s, dk, sn, ms);

  it("akrep ve yelkovan yerel saati gösterir (12'den saat yönünde, 12'lik kadran)", () => {
    expect(modul.saatAcisi('akrep', an(3, 0, 0))).toBeCloseTo(90 * DERECE, 9);
    expect(modul.saatAcisi('yelkovan', an(3, 0, 0))).toBeCloseTo(0, 9);
    expect(modul.saatAcisi('akrep', an(15, 30, 0))).toBeCloseTo(105 * DERECE, 9);
    expect(modul.saatAcisi('yelkovan', an(15, 30, 0))).toBeCloseTo(180 * DERECE, 9);
    expect(modul.saatAcisi('akrep', an(0, 0, 0))).toBeCloseTo(0, 9);
  });

  it('yelkovan saniyelerle kesintisiz ilerler', () => {
    expect(modul.saatAcisi('yelkovan', an(10, 10, 30))).toBeCloseTo(63 * DERECE, 9);
  });

  it('saniye ibresi tikle ilerler: saniyenin başında önceki çizgide, tikten sonra yeni çizgide durur', () => {
    const tik = modul.SANIYE_TIK_SURESI * 1000;
    expect(modul.saatAcisi('saniye', an(8, 0, 15, 0))).toBeCloseTo(84 * DERECE, 9);
    const ara = modul.saatAcisi('saniye', an(8, 0, 15, tik / 2));
    expect(ara).toBeGreaterThan(84 * DERECE);
    expect(ara).toBeLessThan(90 * DERECE);
    expect(modul.saatAcisi('saniye', an(8, 0, 15, tik))).toBeCloseTo(90 * DERECE, 9);
    expect(modul.saatAcisi('saniye', an(8, 0, 15, 999))).toBeCloseTo(90 * DERECE, 9);
  });

  it('tik kapalıyken (azaltılmış hareket) saniye ibresi doğrudan çizgisine atlar', () => {
    expect(modul.saatAcisi('saniye', an(8, 0, 15, 0), false)).toBeCloseTo(90 * DERECE, 9);
  });
});

describe('acisalFark', () => {
  it('en kısa yoldan işaretli farkı verir, 12 çizgisinden geçişi de', () => {
    const DERECE = Math.PI / 180;
    expect(modul.acisalFark(10 * DERECE, 40 * DERECE)).toBeCloseTo(30 * DERECE, 9);
    expect(modul.acisalFark(40 * DERECE, 10 * DERECE)).toBeCloseTo(-30 * DERECE, 9);
    expect(modul.acisalFark(350 * DERECE, 10 * DERECE)).toBeCloseTo(20 * DERECE, 9);
    expect(modul.acisalFark(10 * DERECE, 350 * DERECE)).toBeCloseTo(-20 * DERECE, 9);
    expect(modul.acisalFark(-6 * DERECE, 354 * DERECE)).toBeCloseTo(0, 9);
    expect(Math.abs(modul.acisalFark(0, 180 * DERECE))).toBeCloseTo(Math.PI, 9);
  });
});

describe('kubbeAcisi', () => {
  it('tarama başlamadan ve bittikten sonra kubbe duruşta (yarık izleyiciye bakar)', () => {
    expect(modul.kubbeAcisi(0)).toBe(0);
    expect(modul.kubbeAcisi(-1)).toBe(0);
    expect(modul.kubbeAcisi(modul.KUBBE_SURE)).toBe(0);
    expect(modul.kubbeAcisi(modul.KUBBE_SURE + 30)).toBe(0); // sürekli döngü yok
  });

  it('adım hedeflerine varır ve hedefte bekler; son adım duruşa döner', () => {
    let s = 0;
    for (const [hedef, donus, bekleme] of modul.KUBBE_ADIMLARI) {
      s += donus;
      expect(modul.kubbeAcisi(s + 1e-6)).toBeCloseTo(hedef, 6);
      if (bekleme > 0) expect(modul.kubbeAcisi(s + bekleme / 2)).toBeCloseTo(hedef, 9);
      s += bekleme;
    }
    expect(s).toBeCloseTo(modul.KUBBE_SURE, 9);
    expect(modul.KUBBE_ADIMLARI[modul.KUBBE_ADIMLARI.length - 1][0]).toBe(0);
  });

  it('iki yana da döner, sürekli ve sakin: 1/60 s adımda sıçrama yok (tepe hız < 86°/s), açı ±60° içinde', () => {
    let onceki = 0;
    let enKucuk = 0;
    let enBuyuk = 0;
    for (let s = 0; s <= modul.KUBBE_SURE + 0.5; s += 1 / 60) {
      const a = modul.kubbeAcisi(s);
      expect(Math.abs(a - onceki)).toBeLessThan(0.025);
      expect(Math.abs(a)).toBeLessThanOrEqual((60 * Math.PI) / 180);
      enKucuk = Math.min(enKucuk, a);
      enBuyuk = Math.max(enBuyuk, a);
      onceki = a;
    }
    expect(enBuyuk).toBeGreaterThan(0.5);
    expect(enKucuk).toBeLessThan(-0.5);
  });
});

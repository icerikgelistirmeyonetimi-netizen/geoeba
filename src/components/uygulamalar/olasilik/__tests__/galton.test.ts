import { beforeAll, describe, expect, it } from 'vitest';
import {
  binom,
  frekansSatirlari,
  galtonKutuSayimlari,
  galtonTeorikOranlar,
  istenenAdi,
  istenenMi,
  ornekUzay,
  pascalSatiri,
  sablonUyarilari,
  sonucAnahtari,
  sonucEtiketi,
  sonucKisaEtiketi,
  teorikOlasilik,
  varsayilanSablon,
  type GaltonKosulu,
  type Sablon,
} from '../olasilik';
import { mulberry32, sayimlariBirlestir, tekDeneme, topluDeneme } from '../simulasyon';
import {
  GORUNEN_SABLON_TURLERI,
  SABLON_ADLARI,
  SABLON_TURLERI,
  bosDurum,
  durumuCoz,
  durumuSerilestir,
  sablonuDogrula,
  sablonuGuncelle,
  sonuclariEkle,
  sonucuDogrula,
} from '../durum';

const galton = (satir: number, istenen: GaltonKosulu = { tip: 'orta' }): Extract<Sablon, { tur: 'galton' }> => ({ tur: 'galton', satir, istenen });

describe('binom ve Pascal üçgeni', () => {
  it('binom katsayıları', () => {
    expect(binom(6, 3)).toBe(20);
    expect(binom(10, 5)).toBe(252);
    expect(binom(5, 0)).toBe(1);
    expect(binom(5, 5)).toBe(1);
    expect(binom(4, 5)).toBe(0);
    expect(binom(4, -1)).toBe(0);
  });

  it('Pascal satırı simetrik ve toplamı 2^n', () => {
    expect(pascalSatiri(6)).toEqual([1, 6, 15, 20, 15, 6, 1]);
    for (let n = 2; n <= 10; n++) {
      const s = pascalSatiri(n);
      expect(s.length).toBe(n + 1);
      expect(s.reduce((a, b) => a + b, 0)).toBe(2 ** n);
      expect(s).toEqual([...s].reverse());
    }
  });

  it('teorik oranların toplamı 1', () => {
    const o = galtonTeorikOranlar(7);
    expect(o.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
    expect(o[0]).toBeCloseTo(1 / 128, 12);
  });
});

describe('Galton teorik olasılıklar', () => {
  it('varsayılan şablon: 6 satır, ortadaki kutu', () => {
    expect(varsayilanSablon('galton')).toEqual({ tur: 'galton', satir: 6, istenen: { tip: 'orta' } });
  });

  it('örnek uzay: n+1 kutu, ağırlık C(n,k), toplam 2^n', () => {
    const u = ornekUzay(galton(6));
    expect(u.durumlar.length).toBe(7);
    expect(u.durumlar.map((d) => d.agirlik)).toEqual([1, 6, 15, 20, 15, 6, 1]);
    expect(u.toplam).toBe(64);
  });

  it('n=6 orta → 20/64 = 5/16, formül', () => {
    const p = teorikOlasilik(galton(6));
    expect(p.istenen).toBe(20);
    expect(p.tum).toBe(64);
    expect(p.kesir).toEqual({ pay: 5, payda: 16 });
    expect(p.formul).toBe('İstenen yollar / Tüm yollar = C(6,3) / 2⁶ = 20 / 64 = 5/16 ≈ %31,3');
  });

  it('n=5 orta → (10+10)/32 = 5/8', () => {
    const p = teorikOlasilik(galton(5));
    expect(p.istenen).toBe(20);
    expect(p.tum).toBe(32);
    expect(p.kesir).toEqual({ pay: 5, payda: 8 });
    expect(p.formul).toContain('(C(5,2)+C(5,3)) / 2⁵ = (10+10) / 32 = 20 / 32 = 5/8');
  });

  it('en az: C(6,4)+C(6,5)+C(6,6) = 22 / 64', () => {
    const p = teorikOlasilik(galton(6, { tip: 'enAz', kutu: 4 }));
    expect(p.istenen).toBe(22);
    expect(p.kesir).toEqual({ pay: 11, payda: 32 });
    expect(p.formul).toContain('(C(6,4)+C(6,5)+C(6,6)) / 2⁶ = (15+6+1) / 64 = 22 / 64');
  });

  it('en fazla: C(4,0)+C(4,1) = 5 / 16', () => {
    const p = teorikOlasilik(galton(4, { tip: 'enFazla', kutu: 1 }));
    expect(p.istenen).toBe(5);
    expect(p.tum).toBe(16);
  });

  it('uzun toplam kısaltılır ama değer doğrudur', () => {
    const p = teorikOlasilik(galton(10, { tip: 'enAz', kutu: 1 }));
    expect(p.istenen).toBe(1023);
    expect(p.formul).toContain('C(10,1)+…+C(10,10)');
    // Sayı toplamında tüm terimler yazılır (belirsiz "10+45+…+1" yok)
    expect(p.formul).toContain('(10+45+120+210+252+210+120+45+10+1) / 1024 = 1023 / 1024');
    expect(p.formul).toContain('/ 2¹⁰');
  });

  it('kesin olay "= 1" diye yazılır, "1/1" değil', () => {
    const p = teorikOlasilik(galton(6, { tip: 'enAz', kutu: 0 }));
    expect(p.formul).toBe('İstenen yollar / Tüm yollar = (C(6,0)+…+C(6,6)) / 2⁶ = (1+6+15+20+15+6+1) / 64 = 64 / 64 = 1 ≈ %100,0');
    expect(p.formul).not.toContain('1/1');
    expect(p.formul).not.toContain('^');
  });

  it('n=2 tüm kutular 1/4, 1/2, 1/4', () => {
    expect(teorikOlasilik(galton(2, { tip: 'kutu', kutu: 0 })).kesir).toEqual({ pay: 1, payda: 4 });
    expect(teorikOlasilik(galton(2, { tip: 'kutu', kutu: 1 })).kesir).toEqual({ pay: 1, payda: 2 });
    expect(teorikOlasilik(galton(2, { tip: 'kutu', kutu: 2 })).kesir).toEqual({ pay: 1, payda: 4 });
  });
});

describe('Galton etiketleri', () => {
  it('istenenMi: orta çift/tek, belirli, en az, en fazla', () => {
    const s = (kutu: number) => ({ tur: 'galton' as const, yol: [], kutu });
    expect(istenenMi(galton(6), s(3))).toBe(true);
    expect(istenenMi(galton(6), s(2))).toBe(false);
    expect(istenenMi(galton(5), s(2))).toBe(true);
    expect(istenenMi(galton(5), s(3))).toBe(true);
    expect(istenenMi(galton(5), s(4))).toBe(false);
    expect(istenenMi(galton(6, { tip: 'kutu', kutu: 1 }), s(1))).toBe(true);
    expect(istenenMi(galton(6, { tip: 'enAz', kutu: 4 }), s(5))).toBe(true);
    expect(istenenMi(galton(6, { tip: 'enFazla', kutu: 1 }), s(2))).toBe(false);
    expect(istenenMi(galton(6), { tur: 'para', yuz: 'tura' })).toBe(false);
  });

  it('istenenAdi: 1..n+1 numaralı kutular', () => {
    expect(istenenAdi(galton(6))).toBe('Ortadaki kutu (4. kutu)');
    expect(istenenAdi(galton(5))).toBe('Ortadaki kutular (3. ve 4. kutu)');
    expect(istenenAdi(galton(6, { tip: 'kutu', kutu: 2 }))).toBe('3. kutu');
    expect(istenenAdi(galton(6, { tip: 'enAz', kutu: 4 }))).toBe('≥ 5. kutu');
    expect(istenenAdi(galton(6, { tip: 'enFazla', kutu: 1 }))).toBe('≤ 2. kutu');
  });

  it('sonuç etiketi, kısa etiket ve anahtar', () => {
    const sonuc = { tur: 'galton' as const, yol: [1, 0, 1, 0, 0, 1], kutu: 3 };
    expect(sonucEtiketi(galton(6), sonuc)).toBe('4. kutu');
    expect(sonucKisaEtiketi(galton(6), sonuc)).toBe('K4');
    expect(sonucAnahtari(galton(6), sonuc)).toBe('g:3');
  });

  it('frekans satırları: n+1 satır, soldan sağa, istenenler işaretli', () => {
    const satirlar = frekansSatirlari(galton(4, { tip: 'enAz', kutu: 3 }));
    expect(satirlar.map((s) => s.anahtar)).toEqual(['g:0', 'g:1', 'g:2', 'g:3', 'g:4']);
    expect(satirlar.map((s) => s.etiket)[0]).toBe('1. kutu');
    expect(satirlar.map((s) => s.istenen)).toEqual([false, false, false, true, true]);
  });

  it('uyarılar: aralık dışı kutu ve satır', () => {
    expect(sablonUyarilari(galton(6))).toEqual([]);
    expect(sablonUyarilari(galton(4, { tip: 'kutu', kutu: 7 })).length).toBe(1);
    expect(sablonUyarilari(galton(12)).length).toBeGreaterThan(0);
  });

  it('kutu sayımları dizisi', () => {
    expect(galtonKutuSayimlari(3, { 'g:0': 2, 'g:2': 5, 'r:x': 9 })).toEqual([2, 0, 5, 0]);
  });
});

describe('Galton simülasyonu', () => {
  it('tek deneme: n uzunluklu 0/1 yol, kutu = toplam', () => {
    const u = mulberry32(3);
    for (let i = 0; i < 50; i++) {
      const s = tekDeneme(galton(7), u);
      expect(s?.tur).toBe('galton');
      if (s?.tur !== 'galton') return;
      expect(s.yol.length).toBe(7);
      expect(s.yol.every((b) => b === 0 || b === 1)).toBe(true);
      expect(s.kutu).toBe(s.yol.reduce((a, b) => a + b, 0));
    }
  });

  it('10 000 denemede göreli sıklıklar teorikten ≤ 0,02 sapar', () => {
    const sablon = galton(6);
    const sonuclar = topluDeneme(sablon, 10000, mulberry32(2024));
    expect(sonuclar.length).toBe(10000);
    const sayim = galtonKutuSayimlari(6, sayimlariBirlestir(sablon, sonuclar));
    const teorik = galtonTeorikOranlar(6);
    sayim.forEach((s, k) => expect(Math.abs(s / 10000 - teorik[k])).toBeLessThanOrEqual(0.02));
  });
});

describe('Galton durumu', () => {
  it('sekmelerde torbadan sonra görünür; kart gizli kalır; adı', () => {
    expect(GORUNEN_SABLON_TURLERI).toEqual(['para', 'zar', 'cark', 'torba', 'galton']);
    expect(SABLON_TURLERI).toContain('kart');
    expect(SABLON_ADLARI.galton).toBe('Galton Tahtası');
  });

  it('şablon doğrulama: satır 2–10 tamsayı, koşul şekli ve aralığı', () => {
    expect(sablonuDogrula({ tur: 'galton', satir: 6, istenen: { tip: 'orta' } }, 'galton')).toEqual(galton(6));
    expect(sablonuDogrula({ tur: 'galton', satir: 4, istenen: { tip: 'enAz', kutu: 3 } }, 'galton')).toEqual(galton(4, { tip: 'enAz', kutu: 3 }));
    expect(sablonuDogrula({ tur: 'galton', satir: 1, istenen: { tip: 'orta' } }, 'galton')).toBeNull();
    expect(sablonuDogrula({ tur: 'galton', satir: 11, istenen: { tip: 'orta' } }, 'galton')).toBeNull();
    expect(sablonuDogrula({ tur: 'galton', satir: 4.5, istenen: { tip: 'orta' } }, 'galton')).toBeNull();
    expect(sablonuDogrula({ tur: 'galton', satir: 4, istenen: { tip: 'kutu', kutu: 5 } }, 'galton')).toBeNull();
    expect(sablonuDogrula({ tur: 'galton', satir: 4, istenen: { tip: 'yildiz' } }, 'galton')).toBeNull();
    expect(sablonuDogrula({ tur: 'galton', satir: 4 }, 'galton')).toBeNull();
  });

  it('sonuç doğrulama: bozuk yol, kutu ≠ toplam, satır uyuşmazlığı', () => {
    expect(sonucuDogrula({ tur: 'galton', yol: [1, 0, 1], kutu: 2 })).toEqual({ tur: 'galton', yol: [1, 0, 1], kutu: 2 });
    expect(sonucuDogrula({ tur: 'galton', yol: [1, 2, 1], kutu: 4 })).toBeNull();
    expect(sonucuDogrula({ tur: 'galton', yol: [1, 0, 1], kutu: 1 })).toBeNull();
    expect(sonucuDogrula({ tur: 'galton', yol: 'abc', kutu: 1 })).toBeNull();
    expect(sonucuDogrula({ tur: 'galton', yol: [1, 0, 1], kutu: 2 }, galton(4))).toBeNull();
  });

  it('satır sayısı değişince sayaçlar sıfırlanır', () => {
    let d = sablonuGuncelle(bosDurum(), galton(6));
    d = sonuclariEkle(d, topluDeneme(galton(6), 30, mulberry32(1)));
    expect(d.deneme).toBe(30);
    d = sablonuGuncelle(d, galton(8));
    expect(d.deneme).toBe(0);
    expect(d.sayimlar).toEqual({});
    expect(d.son).toEqual([]);
  });

  it('kayıt gidiş-dönüş; yol uzunluğu satırla uyuşmayan son sonuçlar atılır', () => {
    let d = sablonuGuncelle(bosDurum(), galton(5, { tip: 'kutu', kutu: 1 }));
    d = sonuclariEkle(d, topluDeneme(galton(5), 12, mulberry32(9)));
    const cozulen = durumuCoz(durumuSerilestir(d));
    expect(cozulen?.sablonTuru).toBe('galton');
    expect(cozulen?.sablonlar.galton).toEqual(galton(5, { tip: 'kutu', kutu: 1 }));
    expect(cozulen?.son.length).toBe(12);
    expect(cozulen?.deneme).toBe(12);
    const ham = JSON.parse(durumuSerilestir(d));
    ham.son[0] = { tur: 'galton', yol: [1, 1], kutu: 2 };
    expect(durumuCoz(JSON.stringify(ham))?.son.length).toBe(11);
  });
});

/* Sahne yardımcıları: modül dinamik yüklenir (içe aktarma DOM'a dokunmamalı) */
let m: typeof import('../deneySahnesi');
beforeAll(async () => {
  m = await import('../deneySahnesi');
});

describe('Galton sahne yardımcıları', () => {
  it('civiKonumlari: satır i\'de i+1 çivi, simetrik, üst satır en yukarıda', () => {
    const c = m.civiKonumlari(4);
    expect(c.length).toBe(10);
    for (let i = 0; i < 4; i++) {
      const satir = c.filter((p) => p.satir === i);
      expect(satir.length).toBe(i + 1);
      expect(satir.reduce((t, p) => t + p.x, 0)).toBeCloseTo(0, 9);
    }
    expect(c.find((p) => p.satir === 0)!.y).toBeGreaterThan(c.find((p) => p.satir === 3)!.y);
    const s1 = c.filter((p) => p.satir === 1);
    expect(s1[1].x - s1[0].x).toBeCloseTo(m.GALTON_ARALIK, 9);
  });

  it('kutuX: kutular simetrik ve bir aralık arayla', () => {
    expect(m.kutuX(3, 6)).toBeCloseTo(0, 9);
    expect(m.kutuX(0, 6)).toBeCloseTo(-m.kutuX(6, 6), 9);
    expect(m.kutuX(4, 6) - m.kutuX(3, 6)).toBeCloseTo(m.GALTON_ARALIK, 9);
  });

  it('bilyeYolu: her adım yarım aralık sola/sağa, çivilerin tepesinden geçer, son nokta kutu merkezinde', () => {
    const yol = [1, 0, 1, 1, 0, 1];
    const p = m.bilyeYolu(yol);
    expect(p.length).toBe(yol.length + 2);
    const civiler = m.civiKonumlari(6);
    for (let i = 0; i < yol.length; i++) {
      const civi = civiler.find((c) => c.satir === i && Math.abs(c.x - p[i + 1].x) < 1e-9);
      expect(civi).toBeTruthy();
      expect(p[i + 1].y).toBeGreaterThan(civi!.y);
      const sonraki = i + 1 < yol.length ? p[i + 2].x : p[p.length - 1].x;
      expect(sonraki - p[i + 1].x).toBeCloseTo((yol[i] ? 1 : -1) * (m.GALTON_ARALIK / 2), 9);
    }
    const son = p[p.length - 1];
    expect(son.x).toBeCloseTo(m.kutuX(4, 6), 9);
    expect(son.y).toBeLessThan(m.galtonYerlesimi(6).kutuY);
  });

  it('yolKonumu: başta huni ağzı, sonda iniş noktası', () => {
    const p = m.bilyeYolu([0, 0, 1]);
    expect(m.yolKonumu(p, 0.2, 0)).toEqual({ x: p[0].x, y: p[0].y });
    const son = m.yolKonumu(p, 0.2, 1);
    expect(son.x).toBeCloseTo(p[p.length - 1].x, 9);
    expect(son.y).toBeCloseTo(0.2, 9);
  });

  it('yiginOlcegi: kapasite içinde birebir, aşınca oranlı', () => {
    expect(m.yiginOlcegi([1, 3, 0], 28)).toEqual({ gorunen: [1, 3, 0], temsil: 1, oranli: false });
    const o = m.yiginOlcegi([10, 280, 140, 1, 0], 28);
    expect(o.oranli).toBe(true);
    expect(o.temsil).toBe(10);
    expect(o.gorunen).toEqual([1, 28, 14, 1, 0]);
    expect(Math.max(...o.gorunen)).toBe(28);
  });

  it('temsilMetni: küçükte bir ondalık, büyükte tam sayı', () => {
    expect(m.temsilMetni(37 / 36)).toBe('1,0');
    expect(m.temsilMetni(8.46)).toBe('8,5');
    expect(m.temsilMetni(94.6)).toBe('95');
  });

  it('yiginKonumu: sütunlar kutuya ortalı, kat kat yükselir, kutuya sığar, kapasitede sınırlı', () => {
    const sutun = m.GALTON_YIGIN_SUTUN;
    const kat0 = Array.from({ length: sutun }, (_, i) => m.yiginKonumu(2, 4, i));
    const ust = m.yiginKonumu(2, 4, sutun);
    kat0.forEach((p) => expect(p.y).toBeCloseTo(kat0[0].y, 9));
    expect(ust.y).toBeGreaterThan(kat0[0].y);
    expect(kat0.reduce((t, p) => t + p.x, 0) / sutun).toBeCloseTo(m.kutuX(2, 4), 9);
    // En dış bilyeler bölmelere taşmaz
    expect(kat0[sutun - 1].x + m.GALTON_BILYE_R).toBeLessThan(m.kutuX(2, 4) + m.GALTON_ARALIK / 2 - 0.009);
    expect(m.yiginKonumu(2, 4, 999)).toEqual(m.yiginKonumu(2, 4, m.GALTON_YIGIN_KAPASITE - 1));
    expect(m.yiginKonumu(2, 4, m.GALTON_YIGIN_KAPASITE - 1).y).toBeLessThan(m.galtonYerlesimi(4).kutuY);
  });

  it('sonBilyeKonumu: birebir ölçekte yığının son yuvası, oranlı ölçekte dolu yığının üstünde (örtüşme yok)', () => {
    const K = m.GALTON_YIGIN_KAPASITE;
    // Birebir: son bilye v. bilyenin yuvası, yığın bir eksik çizilir
    expect(m.sonBilyeKonumu(3, 6, 5, false)).toEqual({ ...m.yiginKonumu(3, 6, 4), cikar: true });
    // Oranlı ve kutu tam dolu: hiçbir dolu yuvayla çakışmaz, en üst sıranın üstündedir
    const ust = m.sonBilyeKonumu(3, 6, K, true);
    expect(ust.cikar).toBe(false);
    for (let s = 0; s < K; s++) {
      const p = m.yiginKonumu(3, 6, s);
      expect(Math.hypot(p.x - ust.x, p.y - ust.y)).toBeGreaterThanOrEqual(2 * m.GALTON_BILYE_R - 1e-9);
    }
    expect(ust.y).toBeGreaterThan(m.yiginKonumu(3, 6, K - 1).y);
    // Oranlı ve kısmen dolu: orta sütunun ilk boş yuvasında, altı dolu (havada durmaz)
    for (let v = 1; v < K; v++) {
      const p = m.sonBilyeKonumu(3, 6, v, true);
      const doluMu = (sira: number) => sira < v;
      const orta = Math.floor(m.GALTON_YIGIN_SUTUN / 2);
      const kat = Math.round((p.y - m.yiginKonumu(3, 6, 0).y) / (m.GALTON_BILYE_R * 2));
      expect(doluMu(kat * m.GALTON_YIGIN_SUTUN + orta)).toBe(false);
      if (kat > 0) expect(doluMu((kat - 1) * m.GALTON_YIGIN_SUTUN + orta)).toBe(true);
      expect(p.x).toBeCloseTo(m.yiginKonumu(3, 6, orta).x, 9);
    }
  });
});

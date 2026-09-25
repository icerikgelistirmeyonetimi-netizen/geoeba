import { describe, expect, it } from 'vitest';
import { aciEtiketiUzakta, cizgiEtiketiUzakta, etiketAcisi, etiketDondurme, yayEtiketiYerlesimi, type YayEtiketGeometrisi, cizgiCercevesi, kenarEksenine, kenarEkseninden } from '../olcuEtiketi';

describe('etiketAcisi — ölçü etiketi çizgiye paralel', () => {
  it('yatay çizgide yön ne olursa olsun 0°', () => {
    expect(etiketAcisi(10, 0)).toBe(0);
    expect(etiketAcisi(-10, 0)).toBe(0);
  });

  it('eğik çizgide çizginin açısını verir; sağdan sola çizilmişse 180° katlanır', () => {
    expect(etiketAcisi(10, 10)).toBeCloseTo(45);
    expect(etiketAcisi(10, -10)).toBeCloseTo(-45);
    expect(etiketAcisi(-10, 10)).toBeCloseTo(-45); // 135° → -45°
    expect(etiketAcisi(-10, -10)).toBeCloseTo(45); // -135° → 45°
  });

  it('tam dikey çizgide yazı aşağıdan yukarıya okunur (-90°), nokta sırasından bağımsız', () => {
    expect(etiketAcisi(0, 10)).toBe(-90);
    expect(etiketAcisi(0, -10)).toBe(-90);
  });

  it('yazı asla baş aşağı değildir: her yön için açı [-90, 90) aralığında', () => {
    for (let i = 0; i < 360; i += 7) {
      const t = (i * Math.PI) / 180;
      const aci = etiketAcisi(Math.cos(t), Math.sin(t));
      expect(aci).toBeGreaterThanOrEqual(-90);
      expect(aci).toBeLessThan(90);
      // Çizginin kendi doğrultusuyla paralel: fark 0 ya da 180°
      const fark = Math.abs((((aci - i) % 180) + 180) % 180);
      expect(Math.min(fark, 180 - fark)).toBeLessThan(1e-9);
    }
  });

  it('sıfır ya da geçersiz vektörde 0°', () => {
    expect(etiketAcisi(0, 0)).toBe(0);
    expect(etiketAcisi(Number.NaN, 1)).toBe(0);
  });

  it('etiketDondurme etiketi merkezi çevresinde döndürür, yatayda boş kalır', () => {
    expect(etiketDondurme(10, 0, 100, 50)).toBe('');
    expect(etiketDondurme(10, 10, 100, 50)).toBe('rotate(45 100 50)');
    expect(etiketDondurme(0, 10, 12.5, 7)).toBe('rotate(-90 12.5 7)');
  });
});

describe('çizgi etiketi gerçek kenar uzaklığına göre biçim değiştirir', () => {
  const a = { x: 0, y: 0 };
  const b = { x: 400, y: 300 };
  // Orta noktadan kenara dik 20 px açıklık: (-0,6; 0,8) * 20.
  const merkez = { x: 188, y: 166 };

  it('başlangıçta ve eğik kenar boyunca 150 px taşındığında yakın kalır', () => {
    expect(cizgiEtiketiUzakta(a, b, merkez, { x: 0, y: 0 })).toBe(false);
    expect(cizgiEtiketiUzakta(a, b, merkez, { x: 120, y: 90 })).toBe(false);
  });

  it('dik yönde uzaklaşınca açılır, kenara ve öbür yanına dönünce kısalır', () => {
    expect(cizgiEtiketiUzakta(a, b, merkez, { x: -30, y: 40 })).toBe(true);
    expect(cizgiEtiketiUzakta(a, b, merkez, { x: 12, y: -16 })).toBe(false);
    expect(cizgiEtiketiUzakta(a, b, merkez, { x: 24, y: -32 })).toBe(false);
    expect(cizgiEtiketiUzakta(a, b, merkez, { x: 42, y: -56 })).toBe(true);
  });

  it('sonlu kenarın ucunu aşınca uzaktaki uzantıya yapışmaz', () => {
    expect(cizgiEtiketiUzakta(a, b, merkez, { x: 280, y: 210 })).toBe(true);
    expect(cizgiEtiketiUzakta(a, b, merkez, { x: -280, y: -210 })).toBe(true);
  });

  it('uçların sırası ve dikey kenar yakınlık kararını değiştirmez', () => {
    const ust = { x: 50, y: 0 };
    const alt = { x: 50, y: 400 };
    const etiket = { x: 70, y: 200 };
    for (const [p, q] of [[ust, alt], [alt, ust]]) {
      expect(cizgiEtiketiUzakta(p, q, etiket, { x: 0, y: 100 })).toBe(false);
      expect(cizgiEtiketiUzakta(p, q, etiket, { x: 40, y: 0 })).toBe(true);
    }
  });

  it('çentik veya ölçü katmanı için bırakılan başlangıç açıklığını korur', () => {
    const etiket = { x: 100, y: 80 };
    const yataySon = { x: 200, y: 0 };
    expect(cizgiEtiketiUzakta(a, yataySon, etiket, { x: 0, y: 0 })).toBe(false);
    expect(cizgiEtiketiUzakta(a, yataySon, etiket, { x: 0, y: 18 })).toBe(false);
    expect(cizgiEtiketiUzakta(a, yataySon, etiket, { x: 0, y: 19 })).toBe(true);
    expect(cizgiEtiketiUzakta(a, yataySon, etiket, { x: 0, y: 19 }, 24)).toBe(false);
  });

  it('kayıtlı dünya kayıklığını ekran pikseline çevirdikten sonra zooma göre karar verir', () => {
    const karar = (zoom: number) => cizgiEtiketiUzakta(
      { x: 0, y: 0 }, { x: 10 * zoom, y: 0 },
      { x: 5 * zoom, y: 20 }, { x: 0, y: 0.3 * zoom },
    );
    expect(karar(40)).toBe(false);
    expect(karar(80)).toBe(true);
  });

  it('uçları çakışan parçada noktaya uzaklığı kullanır', () => {
    const nokta = { x: 5, y: 6 };
    const etiket = { x: 25, y: 6 };
    expect(cizgiEtiketiUzakta(nokta, nokta, etiket, { x: -20, y: 0 })).toBe(false);
    expect(cizgiEtiketiUzakta(nokta, nokta, etiket, { x: 19, y: 0 })).toBe(true);
  });
});

describe('açı etiketi köşeye gerçek uzaklığına göre biçim değiştirir', () => {
  const kose = { x: 100, y: 100 };
  const merkez = { x: 130, y: 140 }; // köşeden 50 px

  it('köşeye veya yaya yaklaşırken büyük sürüklemeyi uzaklaşma saymaz', () => {
    expect(aciEtiketiUzakta(kose, merkez, { x: 0, y: 0 })).toBe(false);
    expect(aciEtiketiUzakta(kose, merkez, { x: -18, y: -24 })).toBe(false);
    expect(aciEtiketiUzakta(kose, merkez, { x: -30, y: -40 })).toBe(false);
  });

  it('köşenin çevresinde aynı yarıçapta taşınınca yakın kalır', () => {
    expect(aciEtiketiUzakta(kose, merkez, { x: -70, y: -10 })).toBe(false);
    expect(aciEtiketiUzakta(kose, merkez, { x: -60, y: -80 })).toBe(false);
  });

  it('dışarı taşınınca açılır ve köşeye dönünce yeniden kısalır', () => {
    expect(aciEtiketiUzakta(kose, merkez, { x: 12, y: 16 })).toBe(true);
    expect(aciEtiketiUzakta(kose, merkez, { x: -12, y: -16 })).toBe(false);
    expect(aciEtiketiUzakta(kose, merkez, { x: 12, y: 16 }, 25)).toBe(false);
  });
});

describe('yay etiketi sonlu yaya yakınlığı ve teğet yönünü izler', () => {
  const merkez = { x: 210, y: 160 };
  const nokta = (derece: number, r = 120) => ({
    x: merkez.x + r * Math.cos(derece * Math.PI / 180),
    y: merkez.y + r * Math.sin(derece * Math.PI / 180),
  });
  const ceyrek: YayEtiketGeometrisi = { merkez, yaricap: 100, baslangic: 0, tarama: Math.PI / 2 };
  const karar = (yay: YayEtiketGeometrisi, bas: { x: number; y: number }, son: { x: number; y: number }) =>
    yayEtiketiYerlesimi(yay, bas, { x: son.x - bas.x, y: son.y - bas.y });

  it('yay boyunca 18 px üstünde taşınırken kısa kalır ve yeni teğete döner', () => {
    const bas = nokta(30);
    const son = nokta(60);
    expect(Math.hypot(son.x - bas.x, son.y - bas.y)).toBeGreaterThan(18);
    expect(karar(ceyrek, bas, bas).donmeAcisi).toBeCloseTo(-60);
    const sonuc = karar(ceyrek, bas, son);
    expect(sonuc.uzak).toBe(false);
    expect(sonuc.donmeAcisi).toBeCloseTo(-30);
  });

  it('dışarı uzaklaşınca yataylaşır, yayın üstüne veya iç yanına dönünce teğeti izler', () => {
    const bas = nokta(30);
    expect(karar(ceyrek, bas, nokta(30, 150))).toEqual({ uzak: true, donmeAcisi: 0 });
    expect(karar(ceyrek, bas, nokta(30, 100)).uzak).toBe(false);
    const ic = karar(ceyrek, bas, nokta(30, 80));
    expect(ic.uzak).toBe(false);
    expect(ic.donmeAcisi).toBeCloseTo(-60);
    expect(karar(ceyrek, bas, nokta(30, 50))).toEqual({ uzak: true, donmeAcisi: 0 });
  });

  it('küçük yayın dışında çemberin öbür yanına götürülünce yakın sayılmaz', () => {
    expect(karar(ceyrek, nokta(45), nokta(225))).toEqual({ uzak: true, donmeAcisi: 0 });
  });

  it('yay ucuna yakınken çember uzantısının değil, uç noktanın teğetini kullanır', () => {
    const bas = nokta(45);
    const ilkUca = karar(ceyrek, bas, nokta(-5, 100));
    expect(ilkUca.uzak).toBe(false);
    expect(ilkUca.donmeAcisi).toBeCloseTo(-90);
    const sonUca = karar(ceyrek, bas, nokta(95, 100));
    expect(sonUca.uzak).toBe(false);
    expect(sonUca.donmeAcisi).toBeCloseTo(0);
  });

  it('sıfırı geçen büyük yayda taramanın içini ve eksik yayı ayırır', () => {
    const buyuk = { ...ceyrek, baslangic: 300 * Math.PI / 180, tarama: 300 * Math.PI / 180 };
    const bas = nokta(0);
    const sifirSonrasi = karar(buyuk, bas, nokta(20));
    expect(sifirSonrasi.uzak).toBe(false);
    expect(sifirSonrasi.donmeAcisi).toBeCloseTo(-70);
    expect(karar(buyuk, bas, nokta(210)).uzak).toBe(false);
    expect(karar(buyuk, bas, nokta(270))).toEqual({ uzak: true, donmeAcisi: 0 });
  });

  it('ters yönden tanımlanan aynı yayda uzaklık ve okunabilir teğet değişmez', () => {
    const ters = { ...ceyrek, baslangic: Math.PI / 2, tarama: -Math.PI / 2 };
    for (const derece of [-60, -5, 0, 30, 75, 90, 95, 210]) {
      const ileriSonuc = karar(ceyrek, nokta(45), nokta(derece));
      const tersSonuc = karar(ters, nokta(45), nokta(derece));
      expect(tersSonuc.uzak).toBe(ileriSonuc.uzak);
      expect(tersSonuc.donmeAcisi).toBeCloseTo(ileriSonuc.donmeAcisi);
    }
    const tersBuyuk = { ...ceyrek, baslangic: 240 * Math.PI / 180, tarama: -300 * Math.PI / 180 };
    expect(karar(tersBuyuk, nokta(0), nokta(20)).uzak).toBe(false);
    expect(karar(tersBuyuk, nokta(0), nokta(270)).uzak).toBe(true);
  });

  it('negatif tarama ekranın üst yarısını izler', () => {
    const ustYay = { ...ceyrek, tarama: -Math.PI / 2 };
    const sonuc = karar(ustYay, nokta(-30), nokta(-60));
    expect(sonuc.uzak).toBe(false);
    expect(sonuc.donmeAcisi).toBeCloseTo(30);
    expect(karar(ustYay, nokta(-30), nokta(45)).uzak).toBe(true);
  });

  it.each([2 * Math.PI, -2 * Math.PI])('tam çemberde bütün yönler yakın kalır (tarama %s)', (tarama) => {
    const tam = { ...ceyrek, baslangic: 0.37, tarama };
    for (const derece of [0, 45, 90, 180, 270, 350]) {
      const sonuc = karar(tam, nokta(30), nokta(derece));
      expect(sonuc.uzak).toBe(false);
      expect(sonuc.donmeAcisi).toBeGreaterThanOrEqual(-90);
      expect(sonuc.donmeAcisi).toBeLessThan(90);
    }
  });

  it('sıfır taramayı tam çember değil tek uç noktası olarak değerlendirir', () => {
    const tekNokta = { ...ceyrek, tarama: 0 };
    expect(karar(tekNokta, nokta(0), nokta(0)).uzak).toBe(false);
    expect(karar(tekNokta, nokta(0), nokta(90)).uzak).toBe(true);
  });

  it('sıfır yarıçapta sonlu uzaklık ve yatay yön üretir', () => {
    const sifir = { ...ceyrek, yaricap: 0 };
    const bas = nokta(0, 20);
    expect(karar(sifir, bas, merkez)).toEqual({ uzak: false, donmeAcisi: 0 });
    expect(karar(sifir, bas, nokta(90, 20))).toEqual({ uzak: false, donmeAcisi: 0 });
    expect(karar(sifir, bas, nokta(0, 39))).toEqual({ uzak: true, donmeAcisi: 0 });
  });
});

describe('kenar ekseni: etiket çizgiye göre saklanır (kullanıcı, 2026-09-25)', () => {
  const A = { x: 0, y: 0 };
  it('ekran yeri kenar eksenine çevrilip geri alınınca aynı kalır', () => {
    const c = cizgiCercevesi(A, { x: 300, y: -150 })!;
    const p = { x: 190, y: -60 };
    const geri = kenarEkseninden(kenarEksenine(p, c, 40), c, 40);
    expect(geri.x).toBeCloseTo(p.x, 9);
    expect(geri.y).toBeCloseTo(p.y, 9);
  });

  it('kenar yarıya inince etiket aynı ORANDA kalır, çizgiye uzaklığı değişmez', () => {
    const uzun = cizgiCercevesi(A, { x: 400, y: 0 })!;
    const eksen = kenarEksenine({ x: 280, y: -20 }, uzun, 40); // %70'te, çizginin 20 px üstünde
    expect(eksen.boyunca).toBeCloseTo(0.2, 9);
    const kisa = cizgiCercevesi(A, { x: 200, y: 0 })!;
    const p = kenarEkseninden(eksen, kisa, 40);
    expect(p.x).toBeCloseTo(140, 9); // yine %70
    expect(p.y).toBeCloseTo(-20, 9); // çizgiye uzaklık aynı
  });

  it('çizginin ÜSTÜNE konmuş etiket parça dikeyden geçerken çizgide kalır (fırlamaz)', () => {
    const yatik = cizgiCercevesi(A, { x: 20, y: -200 })!; // neredeyse dikey
    const eksen = kenarEksenine({ x: 10, y: -100 }, yatik, 40); // tam orta noktada, çizginin üstünde
    expect(eksen.dik).toBeCloseTo(0, 9);
    const dikey = cizgiCercevesi(A, { x: 0, y: -200 })!; // tam dikey
    const p = kenarEkseninden(eksen, dikey, 40);
    expect(p.x).toBeCloseTo(0, 9);
    expect(p.y).toBeCloseTo(-100, 9);
  });

  it('kenar dönünce etiket de onunla döner (aynı eksende kalır)', () => {
    const yatay = cizgiCercevesi(A, { x: 200, y: 0 })!;
    const eksen = kenarEksenine({ x: 150, y: 0 }, yatay, 40);
    const dikey = cizgiCercevesi(A, { x: 0, y: -200 })!;
    const p = kenarEkseninden(eksen, dikey, 40);
    expect(p.x).toBeCloseTo(0, 9);
    expect(p.y).toBeCloseTo(-150, 9);
  });

  it('noktaya dönüşmüş kenarın çerçevesi yoktur (eski x/y kullanılır)', () => {
    expect(cizgiCercevesi(A, { x: 0, y: 0 })).toBeNull();
  });
});

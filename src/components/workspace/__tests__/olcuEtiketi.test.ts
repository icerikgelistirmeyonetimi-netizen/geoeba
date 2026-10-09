import { describe, expect, it } from 'vitest';
import { ACI_YAYI_ARALIK, ACI_YAYI_EN_BUYUK, ACI_YAYI_YARICAPI, aciYayYaricapi, koseAcilariniAyir, tabanaGoreDik, type KoseAcisi, aciEtiketiUzakta, cizgiEtiketiUzakta, etiketAcisi, etiketDondurme, yayEtiketiYerlesimi, type YayEtiketGeometrisi, cizgiCercevesi, kenarEksenine, kenarEkseninden } from '../olcuEtiketi';

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

describe('aciYayYaricapi — dar açıda yay okunur kalır', () => {
  const rad = (d: number) => (d * Math.PI) / 180;

  it('60° ve üstünde (dik, geniş, dış açı) bugünkü 22 aynen kalır; çentik sayısı da değiştirmez', () => {
    for (const d of [60, 75, 90, 120, 179, 180, 200, 300, 350]) expect(aciYayYaricapi(d)).toBe(ACI_YAYI_YARICAPI);
    expect(aciYayYaricapi(90, 10)).toBe(22);
    expect(aciYayYaricapi(60, undefined, 3)).toBe(22);
  });

  it('dar açıda r = max(22, 18/θ): yay boyu ~18 px olur', () => {
    const r = (d: number) => aciYayYaricapi(d);
    expect(r(45)).toBeCloseTo(18 / rad(45), 6);
    expect(r(25)).toBeCloseTo(18 / rad(25), 6);
    expect(r(25) * rad(25)).toBeCloseTo(18, 6);
    // 46,9° civarından 60°'ye kadar zaten 22: geçiş sıçramasız
    expect(r(50)).toBe(22);
    expect(r(59.9)).toBe(22);
  });

  it("çok dar açıda üst sınır 90: 10°'de yay ~16 px, 55'teki ~10 px değil", () => {
    expect(ACI_YAYI_EN_BUYUK).toBe(90);
    expect(aciYayYaricapi(10)).toBe(90);
    expect(aciYayYaricapi(10) * rad(10)).toBeGreaterThan(15);
    expect(aciYayYaricapi(1)).toBe(90);
    // Tek çentiğin alt sınırı (10 px yay) 10°'de de sağlanır
    expect(aciYayYaricapi(10, 1000, 1) * rad(10)).toBeGreaterThanOrEqual(10);
  });

  it('açı küçüldükçe yay büyür (azalmayan), 22 ile 90 arasında kalır', () => {
    let onceki = aciYayYaricapi(60);
    for (let d = 59; d >= 1; d -= 1) {
      const r = aciYayYaricapi(d);
      expect(r).toBeGreaterThanOrEqual(onceki - 1e-12);
      expect(r).toBeGreaterThanOrEqual(22);
      expect(r).toBeLessThanOrEqual(90);
      onceki = r;
    }
  });

  it("kolun ortasındaki eş uzunluk çentiğinin altında kalır (r ≤ kol/2 − 11) ama 22'nin altına inmez", () => {
    expect(aciYayYaricapi(20, 105.6)).toBeCloseTo(105.6 / 2 - 11, 9);
    // 2 br kolda üçlü eş açı çentiği (en az 14 px yay) 25°'de yine sığar
    expect(aciYayYaricapi(25, 88, 3) * rad(25)).toBeGreaterThanOrEqual(14);
    expect(aciYayYaricapi(20, 20)).toBe(22);
    expect(aciYayYaricapi(20, 1000)).toBeCloseTo(18 / rad(20), 6);
    // Doğrulama bulgusu: 2 br (88 px) kollu 25° açıda yay çentiğin (44 px) tam üstüne düşüyordu
    for (const kol of [44, 66, 80.1, 82, 88, 103, 105.6, 176]) {
      const r = aciYayYaricapi(25, kol);
      if (r > 22) expect(r).toBeLessThan(kol / 2 - 10);
    }
  });

  it('eş açı çentiği taşıyan açıda hedef yay boyu çentik sayısıyla uzar: üçlü çentik 18 px yaya sıkışmaz', () => {
    // 1 ve 2 çentik: 18 / 20 px; 3 çentik: (3 − 1) · 4 + 16 = 24 px
    expect(aciYayYaricapi(40, undefined, 1) * rad(40)).toBeCloseTo(18, 6);
    expect(aciYayYaricapi(40, undefined, 2) * rad(40)).toBeCloseTo(20, 6);
    expect(aciYayYaricapi(40, undefined, 3) * rad(40)).toBeCloseTo(24, 6);
    // Üçlü çentiğin alt sınırı (k − 1) · 4 + 10 = 18 px: sınıra değil, 6 px üstüne oturur (yöne göre kaybolmaz)
    for (let d = 5; d < 60; d += 0.5) {
      const r = aciYayYaricapi(d, undefined, 3);
      if (r > 22 && r < 90) expect(r * rad(d)).toBeGreaterThanOrEqual(24 - 1e-9);
    }
  });

  it('geçersiz girdide temel yarıçap', () => {
    expect(aciYayYaricapi(NaN)).toBe(22);
    expect(aciYayYaricapi(0)).toBe(22);
    expect(aciYayYaricapi(-5)).toBe(22);
    expect(aciYayYaricapi(20, NaN)).toBeCloseTo(18 / rad(20), 6);
    expect(aciYayYaricapi(20, undefined, NaN)).toBeCloseTo(18 / rad(20), 6);
  });
});

describe('koseAcilariniAyir — aynı köşede kapsayan açının yayı dışta', () => {
  const rad = (d: number) => (d * Math.PI) / 180;
  const aci = (id: string, bas: number, tarama: number, r: number, ek: Partial<KoseAcisi> = {}): KoseAcisi =>
    ({ id, kose: 'O', baslangic: rad(bas), tarama: rad(tarama), r, ...ek });

  it('20° + 30° = 50°: kapsayan 50° açının yayı ikisinin de dışına alınır', () => {
    const r = koseAcilariniAyir([
      aci('a20', 0, 20, aciYayYaricapi(20)), aci('a30', 20, 30, aciYayYaricapi(30)), aci('a50', 0, 50, aciYayYaricapi(50)),
    ]);
    expect(r.get('a20')).toBeCloseTo(aciYayYaricapi(20), 9);
    expect(r.get('a30')).toBeCloseTo(aciYayYaricapi(30), 9);
    expect(r.get('a50')).toBeCloseTo(aciYayYaricapi(20) + ACI_YAYI_ARALIK, 9);
  });

  it('yön (işaretli tarama) ve ±180° sınırı fark etmez', () => {
    const r = koseAcilariniAyir([aci('ic', 170, -20, 51.6), aci('dis', 175, -40, 25.8)]);
    expect(r.get('dis')).toBeCloseTo(51.6 + ACI_YAYI_ARALIK, 9);
    const r2 = koseAcilariniAyir([aci('ic', 175, 10, 90), aci('dis', 170, 30, 34.4)]);
    expect(r2.get('dis')).toBeCloseTo(98, 9);
  });

  it('aynı kollu iç ve dış açı (tümler) 3-4 px arayla çift çizgi gibi durmaz', () => {
    const r = koseAcilariniAyir([aci('ic', 0, 40, 25.8), aci('dis', 0, -320, 22)]);
    expect(r.get('ic')).toBeCloseTo(25.8, 9);
    expect(r.get('dis')).toBeCloseTo(25.8 + ACI_YAYI_ARALIK, 9);
  });

  it('komşu açılar, başka köşeler ve özdeş açılar birbirini itmez', () => {
    const r = koseAcilariniAyir([
      aci('k1', 0, 20, 51.6), aci('k2', 20, 30, 34.4), aci('b', 0, 50, 22, { kose: 'P' }), aci('e1', 0, 40, 25.8, { kose: 'Q' }), aci('e2', 0, 40, 25.8, { kose: 'Q' }),
    ]);
    expect(r.get('k2')).toBeCloseTo(34.4, 9);
    expect(r.get('b')).toBe(22);
    expect(r.get('e1')).toBeCloseTo(25.8, 9);
    expect(r.get('e2')).toBeCloseTo(25.8, 9);
  });

  it('dik açı karesi büyümez ama içindeki açı olarak kapsayanı dışa iter', () => {
    const r = koseAcilariniAyir([aci('d', 0, 90, 22, { sabit: true }), aci('k', 0, 30, 34.4), aci('g', 0, 120, 22)]);
    expect(r.get('d')).toBe(22);
    expect(r.get('g')).toBeCloseTo(34.4 + ACI_YAYI_ARALIK, 9);
  });
});

describe('tabanaGoreDik: elle kaydırılmış etiket varsayılan yeriyle birlikte kayar', () => {
  it('kesikli kattan (1,23) yalın banda (0,5) geçince 6 px boyunca kaydırılmış etiket de banda iner, geri döner', () => {
    // Doğrulama bulgusu: kayıklık mutlak saklandığı için etiket eski katta kalıyor, "uzak" sayılıp çapaya çevriliyordu
    expect(tabanaGoreDik(-1.2331, -1.2331, -0.5)).toBeCloseTo(-0.5, 9);
    // Kayıt değişmez; varsayılan geri gelince etiket de eski katına döner
    expect(tabanaGoreDik(-1.2331, -1.2331, -1.2331)).toBeCloseTo(-1.2331, 9);
    // Elle verilen dik kayıklık (0,2 dışarı) korunur
    expect(tabanaGoreDik(1.4, 1.2, 0.5)).toBeCloseTo(0.7, 9);
  });

  it('doğal yan dönünce (aynı büyüklük, ters işaret) etiket çizgiye göre yerinde kalır', () => {
    expect(tabanaGoreDik(1.2, 1.2, -1.2)).toBeCloseTo(1.2, 9);
  });

  it('öbür yana taşınmış etiket kıpırdamaz; kayma etiketi öbür yana geçiremez', () => {
    expect(tabanaGoreDik(-0.7, 1.2, 0.5)).toBe(-0.7);
    expect(tabanaGoreDik(0.3, 1.2, 0.5)).toBe(0);
  });

  it('tabanı olmayan eski kayıt ve geçersiz girdi aynen kalır', () => {
    expect(tabanaGoreDik(1.4, undefined, 0.5)).toBe(1.4);
    expect(tabanaGoreDik(1.4, 0, 0.5)).toBe(1.4);
    expect(tabanaGoreDik(1.4, NaN, 0.5)).toBe(1.4);
    expect(tabanaGoreDik(1.4, 1.2, NaN)).toBe(1.4);
  });
});

import { describe, expect, it, vi } from 'vitest';
import {
  BITIS_PAYI,
  EN_KUCUK_OLCEK,
  HAREKET_EGRISI,
  KAPANIS_KARELERI,
  HUNI_ADIM,
  HUNI_EGRISI,
  HUNI_EVRE,
  YEDEK_YUVA,
  boyutKareleri,
  dikdortgen,
  donusumMetni,
  hedefeDonusum,
  huniGorunurlugu,
  huniKoseleri,
  oynat,
  yedekYuva,
  yumusak,
  yuvaKareleri,
} from '../pencereAnimasyonu';
import { homografiMatrisi, homografiUygula } from '../homografi';

describe('pencere hareketi geometrisi', () => {
  const pencere = { x: 0, y: 0, w: 1200, h: 700 };
  // Görev çubuğundaki uygulama düğmesi: pencerenin altında, solda
  const dugme = { x: 200, y: 720, w: 140, h: 46 };

  it('yuvaya dönüşüm: merkezler çakışır, ölçek yuva / pencere', () => {
    const d = hedefeDonusum(pencere, dugme);
    expect(d.x).toBeCloseTo(200 + 70 - 600);
    expect(d.y).toBeCloseTo(720 + 23 - 350);
    expect(d.sx).toBeCloseTo(140 / 1200);
    expect(d.sy).toBeCloseTo(46 / 700);
  });

  it('pencere aşağıdaki yuvadan yukarı çekilir: öteleme aşağı doğru, ölçek 1\'den küçük', () => {
    const d = hedefeDonusum(pencere, dugme);
    expect(d.y).toBeGreaterThan(0);
    expect(d.sx).toBeLessThan(1);
    expect(d.sy).toBeLessThan(1);
  });

  it('ölçek sıfıra inmez (tekil matris), ölçüsüz pencerede 1 kalır', () => {
    expect(hedefeDonusum(pencere, { x: 0, y: 0, w: 0, h: 0 }).sx).toBe(EN_KUCUK_OLCEK);
    expect(hedefeDonusum(pencere, { x: 0, y: 0, w: 0, h: 0 }).sy).toBe(EN_KUCUK_OLCEK);
    const d = hedefeDonusum({ x: 0, y: 0, w: 0, h: 0 }, dugme);
    expect(d.sx).toBe(1);
    expect(d.sy).toBe(1);
  });

  it('FLIP: eski dikdörtgen hedef verilince yeni yerleşimden eskiye döner', () => {
    const eski = { x: 96, y: 21, w: 1008, h: 588 };
    const d = hedefeDonusum(pencere, eski);
    expect(d.sx).toBeCloseTo(0.84);
    expect(d.sy).toBeCloseTo(0.84);
    expect(d.x).toBeCloseTo(96 + 504 - 600);
    expect(d.y).toBeCloseTo(21 + 294 - 350);
  });

  it('yedek yuva: alanın alt orta kenarı, en çok YEDEK_YUVA genişliğinde', () => {
    const y = yedekYuva({ x: 10, y: 20, w: 1000, h: 600 });
    expect(y).toEqual({ x: 10 + (1000 - YEDEK_YUVA.w) / 2, y: 620, w: YEDEK_YUVA.w, h: YEDEK_YUVA.h });
    expect(yedekYuva({ x: 0, y: 0, w: 100, h: 50 }).w).toBe(100);
  });

  it('DOMRect benzeri ölçü sade dikdörtgene çevrilir', () => {
    expect(dikdortgen({ left: 1, top: 2, width: 3, height: 4 })).toEqual({ x: 1, y: 2, w: 3, h: 4 });
  });

  it('dönüşüm metni translate → scale sırasında, binde bire yuvarlanır', () => {
    expect(donusumMetni({ x: -330.00049, y: 393, sx: 0.116666, sy: 0.0657142 })).toBe(
      'translate(-330px, 393px) scale(0.117, 0.066)'
    );
  });

  it('kapanış çekilip söner; büyüt / geri al eski dikdörtgenden yenisine', () => {
    const d = hedefeDonusum(pencere, dugme);
    expect(KAPANIS_KARELERI[0]).toMatchObject({ transform: 'none', opacity: 1 });
    expect(KAPANIS_KARELERI[1]).toMatchObject({ opacity: 0 });
    const boyut = boyutKareleri(d);
    expect(boyut[0].transform).toBe(donusumMetni(d));
    expect(boyut[1].transform).toBe('none');
  });
});

describe('huni yolu (yuvaya daralarak çekilme / yuvadan genişleyerek çıkma)', () => {
  const pencere = { x: 0, y: 60, w: 1200, h: 640 };
  const yuva = { x: 200, y: 720, w: 140, h: 46 };
  const genislik = (k: ReturnType<typeof huniKoseleri>, ust: boolean) => (ust ? k[1][0] - k[0][0] : k[2][0] - k[3][0]);

  it('yumuşak eğri 0→1, uçlarda kırpılır', () => {
    expect(yumusak(-1)).toBe(0);
    expect(yumusak(0)).toBe(0);
    expect(yumusak(0.5)).toBeCloseTo(0.5);
    expect(yumusak(1)).toBe(1);
    expect(yumusak(2)).toBe(1);
  });

  it('t = 0 pencerenin kendi köşeleri, t = 1 yuvanın köşeleri (pencerenin sol üstüne göre)', () => {
    expect(huniKoseleri(pencere, yuva, 0)).toEqual([
      [0, 0],
      [1200, 0],
      [1200, 640],
      [0, 640],
    ]);
    const son = huniKoseleri(pencere, yuva, 1);
    expect(son[0]).toEqual([200, 660]);
    expect(son[1]).toEqual([340, 660]);
    expect(son[2]).toEqual([340, 706]);
    expect(son[3]).toEqual([200, 706]);
  });

  it('ilk evre bitince pencere daralıp aşağı kaymıştır: altı üstünden dar (huni), yuva kadar dar değil', () => {
    const k = huniKoseleri(pencere, yuva, HUNI_EVRE.ILK);
    const ustBeklenen = pencere.w * (1 - HUNI_EVRE.UST_PAY) + yuva.w * HUNI_EVRE.UST_PAY;
    const altBeklenen = pencere.w * (1 - HUNI_EVRE.ALT_PAY) + yuva.w * HUNI_EVRE.ALT_PAY;
    expect(genislik(k, true)).toBeLessThan(ustBeklenen + 1e-6);
    expect(genislik(k, false)).toBeLessThan(altBeklenen + 1e-6);
    expect(genislik(k, true)).toBeGreaterThan(genislik(k, false) * 1.3);
    expect(genislik(k, false)).toBeGreaterThan(yuva.w * 2);
    // Üst kenar aşağı kaymış, alt kenar yuvanın üstüne yakın
    expect(k[0][1]).toBeGreaterThan(200);
    expect(k[3][1]).toBeGreaterThanOrEqual(pencere.h);
    expect(k[0][1]).toBeLessThan(k[3][1]);
  });

  it('her ara adımda dörtgen düzgün kalır: sol < sağ, üst < alt, üst kenar alt kenardan dar değil', () => {
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      const k = huniKoseleri(pencere, yuva, t);
      expect(k[0][0]).toBeLessThan(k[1][0]);
      expect(k[3][0]).toBeLessThan(k[2][0]);
      expect(k[0][1]).toBeLessThanOrEqual(k[3][1]);
      expect(k[1][1]).toBeLessThanOrEqual(k[2][1]);
      expect(genislik(k, true)).toBeGreaterThanOrEqual(genislik(k, false) - 1e-9);
    }
  });

  it('görünürlük: yuvaya girerken (son çeyrek) EN_SOLUK değerine iner, öncesinde tam', () => {
    expect(huniGorunurlugu(0)).toBe(1);
    expect(huniGorunurlugu(HUNI_EVRE.SOLMA)).toBe(1);
    expect(huniGorunurlugu(1)).toBeCloseTo(HUNI_EVRE.EN_SOLUK);
    expect(huniGorunurlugu(0.9)).toBeLessThan(1);
    expect(huniGorunurlugu(0.9)).toBeGreaterThan(HUNI_EVRE.EN_SOLUK);
  });

  it('küçültme kareleri: pencereden yuvaya, ara değerlemesiz (step-end), kökeni sol üstte, sonda matrix3d ve soluk', () => {
    const k = yuvaKareleri(pencere, yuva, 'kucult');
    expect(k).toHaveLength(HUNI_ADIM + 1);
    expect(k[0]).toMatchObject({ offset: 0, transform: 'none', opacity: 1 });
    const son = k[k.length - 1];
    expect(son.offset).toBe(1);
    expect(String(son.transform).startsWith('matrix3d(')).toBe(true);
    expect(son.opacity).toBeCloseTo(HUNI_EVRE.EN_SOLUK);
    for (let i = 1; i < k.length; i++) expect(Number(k[i].offset)).toBeGreaterThan(Number(k[i - 1].offset));
    expect(k.every((kare) => kare.transformOrigin === '0 0' && kare.easing === 'step-end')).toBe(true);
  });

  it('açılış kareleri küçültmenin tersi: yuvadan başlar, pencerede biter', () => {
    const ac = yuvaKareleri(pencere, yuva, 'ac', 8);
    const kucult = yuvaKareleri(pencere, yuva, 'kucult', 8);
    expect(ac).toHaveLength(9);
    expect(ac[0].transform).toBe(kucult[8].transform);
    expect(ac[0].opacity).toBeCloseTo(HUNI_EVRE.EN_SOLUK);
    expect(ac[8]).toMatchObject({ transform: 'none', opacity: 1 });
    expect(ac[3].transform).toBe(kucult[5].transform);
  });

  it('son karenin homografisi pencerenin köşelerini yuvaya taşır', () => {
    const M = homografiMatrisi(pencere.w, pencere.h, huniKoseleri(pencere, yuva, 1));
    expect(M).not.toBeNull();
    const [x0, y0] = homografiUygula(M!, 0, 0);
    const [x1, y1] = homografiUygula(M!, pencere.w, pencere.h);
    expect(x0).toBeCloseTo(200);
    expect(y0).toBeCloseTo(660);
    expect(x1).toBeCloseTo(340);
    expect(y1).toBeCloseTo(706);
  });
});

describe('oynat', () => {
  function sahteEleman() {
    const hareket = { cancel: vi.fn(), finish: vi.fn(), onfinish: null as null | ((e: unknown) => void), currentTime: 0 as number, playState: undefined as AnimationPlayState | undefined };
    const animate = vi.fn(() => hareket);
    return { el: { animate }, hareket, animate };
  }

  it('Web Animations ile oynatır, bitince geri çağrı çalışır', () => {
    const { el, hareket, animate } = sahteEleman();
    const bitti = vi.fn();
    oynat(el, KAPANIS_KARELERI, { sure: 160, doldur: 'forwards' }, bitti);
    expect(animate).toHaveBeenCalledTimes(1);
    const [kareler, secenekler] = animate.mock.calls[0] as unknown as [Keyframe[], KeyframeAnimationOptions];
    expect(kareler).toEqual(KAPANIS_KARELERI);
    expect(secenekler).toEqual({ duration: 160, easing: HAREKET_EGRISI, fill: 'forwards' });
    expect(bitti).not.toHaveBeenCalled();
    hareket.onfinish?.({});
    expect(bitti).toHaveBeenCalledTimes(1);
  });

  it('huni karelerinde bütün-hareket eğrisi linear geçirilir (eğri örneklere işlidir)', () => {
    const { el, animate } = sahteEleman();
    oynat(el, KAPANIS_KARELERI, { sure: 100, egri: HUNI_EGRISI });
    expect(HUNI_EGRISI).toBe('linear');
    expect((animate.mock.calls[0] as unknown as [Keyframe[], KeyframeAnimationOptions])[1].easing).toBe('linear');
  });

  it('varsayılan doldurma backwards (giriş hareketleri dönüşüm bırakmaz)', () => {
    const { el, animate } = sahteEleman();
    oynat(el, KAPANIS_KARELERI, { sure: 100 });
    expect((animate.mock.calls[0] as unknown as [Keyframe[], KeyframeAnimationOptions])[1].fill).toBe('backwards');
  });

  it('iptal edilince hareket durur ve geri çağrı bir daha çağrılmaz', () => {
    const { el, hareket } = sahteEleman();
    const bitti = vi.fn();
    const iptal = oynat(el, KAPANIS_KARELERI, { sure: 100 }, bitti);
    iptal();
    expect(hareket.cancel).toHaveBeenCalledTimes(1);
    hareket.onfinish?.({});
    expect(bitti).not.toHaveBeenCalled();
  });

  it('bitiş olayı gelmezse süre + BITIS_PAYI sonra yedek zamanlayıcı geri çağrıyı bir kez çağırır', () => {
    vi.useFakeTimers();
    try {
      const { el, hareket } = sahteEleman();
      const bitti = vi.fn();
      oynat(el, KAPANIS_KARELERI, { sure: 100 }, bitti);
      vi.advanceTimersByTime(100 + BITIS_PAYI - 1);
      expect(bitti).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(bitti).toHaveBeenCalledTimes(1);
      // Görüntü de son kareye atlatılır (durum makinesiyle uyumlu kalsın)
      expect(hareket.finish).toHaveBeenCalledTimes(1);
      // Geç gelen bitiş olayı ikinci kez çağırmaz
      hareket.onfinish?.({});
      expect(bitti).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('yedek zamanlayıcı duraklatılmış ya da ilerleyen hareketi kesmez, takılmış hareketi bitirir', () => {
    vi.useFakeTimers();
    try {
      const { el, hareket } = sahteEleman();
      const bitti = vi.fn();
      oynat(el, KAPANIS_KARELERI, { sure: 100 }, bitti);
      // Duraklatılmış (ör. geliştirici araçları): beklenir
      hareket.playState = 'paused';
      vi.advanceTimersByTime(100 + BITIS_PAYI);
      expect(bitti).not.toHaveBeenCalled();
      // Yavaş da olsa ilerliyor: beklenir
      hareket.playState = 'running';
      hareket.currentTime = 10;
      vi.advanceTimersByTime(100 + BITIS_PAYI);
      expect(bitti).not.toHaveBeenCalled();
      hareket.currentTime = 20;
      vi.advanceTimersByTime(100 + BITIS_PAYI);
      expect(bitti).not.toHaveBeenCalled();
      // Zaman ilerlemiyor (arka plan sekmesi): son kareye atlatılır ve bitti çağrılır
      vi.advanceTimersByTime(100 + BITIS_PAYI);
      expect(hareket.finish).toHaveBeenCalledTimes(1);
      expect(bitti).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('bitiş olayı gelince yedek zamanlayıcı iptal olur; iptal de zamanlayıcıyı keser', () => {
    vi.useFakeTimers();
    try {
      const a = sahteEleman();
      const bittiA = vi.fn();
      oynat(a.el, KAPANIS_KARELERI, { sure: 100 }, bittiA);
      a.hareket.onfinish?.({});
      vi.advanceTimersByTime(1000);
      expect(bittiA).toHaveBeenCalledTimes(1);
      expect(a.hareket.finish).not.toHaveBeenCalled();

      const b = sahteEleman();
      const bittiB = vi.fn();
      const iptal = oynat(b.el, KAPANIS_KARELERI, { sure: 100 }, bittiB);
      iptal();
      vi.advanceTimersByTime(1000);
      expect(bittiB).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('süre 0 ya da API yoksa hareket atlanır, geri çağrı hemen çalışır', () => {
    const { el, animate } = sahteEleman();
    const bitti = vi.fn();
    oynat(el, KAPANIS_KARELERI, { sure: 0 }, bitti);
    expect(animate).not.toHaveBeenCalled();
    expect(bitti).toHaveBeenCalledTimes(1);

    const bitti2 = vi.fn();
    oynat({}, KAPANIS_KARELERI, { sure: 200 }, bitti2);
    expect(bitti2).toHaveBeenCalledTimes(1);
  });

  it('az hareket tercihinde atlanır', () => {
    const { el, animate } = sahteEleman();
    const bitti = vi.fn();
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    try {
      oynat(el, KAPANIS_KARELERI, { sure: 200 }, bitti);
    } finally {
      vi.unstubAllGlobals();
    }
    expect(animate).not.toHaveBeenCalled();
    expect(bitti).toHaveBeenCalledTimes(1);
  });
});

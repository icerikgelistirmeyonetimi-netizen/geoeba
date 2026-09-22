import { describe, expect, it } from 'vitest';
import {
  eksenSayilariniYerlestir,
  kesisir,
  orijinRozetiKutusu,
  tahminiMetinGenisligi,
  tuvalEngelleri,
  METIN_ALT,
  METIN_UST,
  type Dikdortgen,
  type EksenCentigi,
  type EksenSayilariGirdisi,
  type EksenSayilariSonucu,
  type SayiYerlesimi,
} from '../eksenSayilari';
import { formatTurkishNumber } from '@/math/coordinates';

// Canvas'taki gibi: ekrandaki alanın her yanında 16 adım fazlası, değerler toFixed(4)
function centikler(orijin: number, zoom: number, adim: number, uzunluk: number, yon: 1 | -1): EksenCentigi[] {
  const minD = yon === 1 ? (0 - orijin) / zoom : (orijin - uzunluk) / zoom;
  const maxD = yon === 1 ? (uzunluk - orijin) / zoom : orijin / zoom;
  const tampon = adim * 16;
  const bas = Math.floor((minD - tampon) / adim) * adim;
  const son = Math.ceil((maxD + tampon) / adim) * adim;
  const out: EksenCentigi[] = [];
  for (let v = bas; v <= son + 1e-9; v += adim) {
    const deger = Number(v.toFixed(4));
    out.push({ deger, ekran: orijin + yon * deger * zoom, metin: formatTurkishNumber(deger) });
  }
  return out;
}

interface Kurulum {
  W?: number;
  H?: number;
  ox: number;
  oy: number;
  zoom?: number;
  adim?: number;
  fs?: number;
  cisimSecici?: boolean;
}

function kur(k: Kurulum): { g: EksenSayilariGirdisi; s: EksenSayilariSonucu } {
  const W = k.W ?? 921;
  const H = k.H ?? 618;
  const zoom = k.zoom ?? 44;
  const adim = k.adim ?? 1;
  const g: EksenSayilariGirdisi = {
    genislik: W,
    yukseklik: H,
    orijin: { x: k.ox, y: k.oy },
    xCentikleri: centikler(k.ox, zoom, adim, W, 1),
    yCentikleri: centikler(k.oy, zoom, adim, H, -1),
    adim,
    yaziBoyu: k.fs ?? 10,
    engeller: tuvalEngelleri(W, H, { cisimSecici: k.cisimSecici }),
  };
  return { g, s: eksenSayilariniYerlestir(g) };
}

const gorunenler = (s: EksenSayilariSonucu, eksen: 'x' | 'y' | 'hepsi' = 'hepsi'): SayiYerlesimi[] =>
  (eksen === 'hepsi' ? [...s.x.ogeler, ...s.y.ogeler] : s[eksen].ogeler).map((o) => o.sayi).filter((n) => n.gorunur);

const sag = (r: Dikdortgen) => r.x + r.w;
const alt = (r: Dikdortgen) => r.y + r.h;

/** Her durumda geçerli olması gereken kurallar (hatalar toplanır, tek expect: rastgele taramada hızlı) */
function kuralHatalari(g: EksenSayilariGirdisi, s: EksenSayilariSonucu): string[] {
  const W = g.genislik;
  const H = g.yukseklik;
  const engeller = g.engeller ?? [];
  const rozetler = [s.rozetler.artiX, s.rozetler.artiY, s.rozetler.eksiY].filter((r) => r.gorunur);
  const hepsi = gorunenler(s);
  const h: string[] = [];
  const e = 1e-6;
  for (const n of hepsi) {
    const ad = `${n.metin}@(${n.kutu.x.toFixed(1)},${n.kutu.y.toFixed(1)})`;
    // sol panel / tutamaç şeridinin dışında, sağ kenardan en az 8 px içeride, üst/alttan kesilmeden
    if (n.kutu.x < 24 - e) h.push(`${ad} sol şeritte`);
    if (sag(n.kutu) > W - 8 + e) h.push(`${ad} sağ kenara yakın`);
    if (n.kutu.y < 4 - e) h.push(`${ad} üstten kesik`);
    if (alt(n.kutu) > H - 4 + e) h.push(`${ad} alttan kesik`);
    for (const k of engeller) if (kesisir(n.kutu, k)) h.push(`${ad} x engel ${JSON.stringify(k)}`);
    for (const r of rozetler) if (kesisir(n.kutu, r)) h.push(`${ad} x rozet`);
    if (s.orijinRozeti && kesisir(n.kutu, s.orijinRozeti)) h.push(`${ad} x (0; 0)`);
    if (n.deger === 0) h.push('0 etiketlendi');
  }
  for (let i = 0; i < hepsi.length; i++)
    for (let j = i + 1; j < hepsi.length; j++)
      if (kesisir(hepsi[i].kutu, hepsi[j].kutu)) h.push(`${hepsi[i].metin} x ${hepsi[j].metin}`);
  for (const r of rozetler) {
    const ad = `rozet@(${r.x},${r.y})`;
    if (r.x < 4 || r.y < 4 || sag(r) > W - 4 || alt(r) > H - 4) h.push(`${ad} kenar dışında`);
    for (const k of engeller) if (kesisir(r, k)) h.push(`${ad} x engel ${JSON.stringify(k)}`);
    if (s.orijinRozeti && kesisir(r, s.orijinRozeti)) h.push(`${ad} x (0; 0)`);
  }
  for (let i = 0; i < rozetler.length; i++)
    for (let j = i + 1; j < rozetler.length; j++) if (kesisir(rozetler[i], rozetler[j])) h.push('rozet x rozet');
  // Rozet kendi yarı ekseninin yanında: +x orijinin sağında, +y üstünde, -y altında
  const { x: ox, y: oy } = g.orijin;
  const { artiX, artiY, eksiY } = s.rozetler;
  if (artiX.gorunur && artiX.x < ox + 4 - e) h.push(`+x@(${artiX.x},${artiX.y}) orijinin solunda`);
  if (artiY.gorunur && alt(artiY) > oy - 4 + e) h.push(`+y@(${artiY.x},${artiY.y}) orijinin altında`);
  if (eksiY.gorunur && eksiY.y < oy + 4 - e) h.push(`-y@(${eksiY.x},${eksiY.y}) orijinin üstünde`);
  return h;
}

function degismezler(g: EksenSayilariGirdisi, s: EksenSayilariSonucu) {
  expect(kuralHatalari(g, s), `orijin (${g.orijin.x.toFixed(1)}, ${g.orijin.y.toFixed(1)}) ${g.genislik}x${g.yukseklik} fs ${g.yaziBoyu}`).toEqual([]);
}

describe('tahminiMetinGenisligi', () => {
  it('Manrope 700 ile ölçülen genişliklerin üst sınırı (10 px)', () => {
    const olculen: Record<string, number> = { '7': 6.2, '13': 10.97, '-13': 14.41, '1000': 24.13, '-1000': 28.33, '0,25': 21.44, '-1,75': 27 };
    for (const [m, w] of Object.entries(olculen)) {
      const t = tahminiMetinGenisligi(m, 10);
      expect(t, m).toBeGreaterThanOrEqual(w);
      expect(t, m).toBeLessThan(w * 1.35 + 2);
    }
  });
  it('yazı boyuyla doğrusal büyür', () => {
    const a = tahminiMetinGenisligi('-240', 10) - 1;
    const b = tahminiMetinGenisligi('-240', 20) - 1;
    expect(b).toBeCloseTo(a * 2, 6);
  });
});

describe('tuvalEngelleri', () => {
  it('ölçülen katmanları kapsar (921 x 618)', () => {
    const W = 921;
    const H = 618;
    const e = tuvalEngelleri(W, H);
    const kapsar = (d: Dikdortgen) => e.some((k) => k.x <= d.x && k.y <= d.y && sag(k) >= sag(d) && alt(k) >= alt(d));
    expect(kapsar({ x: 16, y: 12, w: 168, h: 36 })).toBe(true); // Seç, El, Geri Al, Yinele
    expect(kapsar({ x: 12, y: H - 23, w: 206, h: 11 })).toBe(true); // alt bilgi
    expect(kapsar({ x: W - 48, y: H - 90, w: 36, h: 78 })).toBe(true); // yakınlaştırma
    expect(kapsar({ x: W - 159, y: H - 66, w: 95, h: 50 })).toBe(true); // komut hapı
    expect(kapsar({ x: W - 151, y: H - 62, w: 95, h: 50 })).toBe(true); // dar pencerede komut hapı
    expect(e).toHaveLength(4);
    expect(tuvalEngelleri(W, H, { cisimSecici: true })).toHaveLength(5);
  });
});

describe('y sayıları (T1)', () => {
  it('orijin solda ekran dışında: sayılar çentiklerin SAĞINDA, sola hizalı, sol panelden uzak', () => {
    const { g, s } = kur({ ox: -300, oy: 309 });
    expect(s.y.durum).toBe('sol');
    expect(s.y.sayiYonu).toBe('sag');
    const ys = gorunenler(s, 'y');
    expect(ys.length).toBeGreaterThan(8);
    for (const n of ys) {
      expect(n.hiza).toBe('start');
      expect(n.x).toBe(24);
    }
    // eksi işaretli iki haneli sayılar tam görünür
    expect(ys.some((n) => n.metin === '-5')).toBe(true);
    // çentikler sayının solunda, sayıya değmez
    for (const o of s.y.ogeler) expect(o.centik.x2).toBeLessThan(24);
    degismezler(g, s);
  });

  it('kullanıcı durumu (orijin sol-altta uzakta, zoom 66): "13" ve "20" kesilmez', () => {
    const W = 1241;
    const H = 898;
    const { g, s } = kur({ W, H, ox: -567.6, oy: H + 435.6, zoom: 66 });
    const ys = gorunenler(s, 'y').map((n) => n.metin);
    expect(ys).toEqual(expect.arrayContaining(['10', '11', '12', '13', '14', '15']));
    for (const n of gorunenler(s, 'y')) expect(n.kutu.x).toBeGreaterThanOrEqual(24);
    degismezler(g, s);
  });

  it('uzun sayılar (-13, -240, 1000, 0,25, -1,75) solda eksen dışındayken bütünüyle görünür', () => {
    const vakalar: Kurulum[] = [
      { ox: -300, oy: -200, zoom: 44 }, // -5 .. -20
      { ox: -200, oy: -300, zoom: 5, adim: 10 }, // -60 .. -240
      { ox: -4500, oy: 618 + 4500, zoom: 5, adim: 10 }, // ~900 .. 1020
      { ox: -300, oy: -200, zoom: 300, adim: 0.25 }, // -0,75 .. -2,75
      { ox: -300, oy: 618 + 200, zoom: 300, adim: 0.25 }, // 0,75 .. 2,75
    ];
    for (const v of vakalar) {
      const { g, s } = kur(v);
      const ys = gorunenler(s, 'y');
      expect(ys.length).toBeGreaterThan(3);
      for (const n of ys) {
        expect(n.hiza).toBe('start');
        expect(n.kutu.x).toBeGreaterThanOrEqual(24);
      }
      degismezler(g, s);
    }
    const { s } = kur({ ox: -4500, oy: 618 + 4500, zoom: 5, adim: 10 });
    expect(gorunenler(s, 'y').some((n) => n.metin === '1000')).toBe(true);
    const d = kur({ ox: -300, oy: 618 + 200, zoom: 300, adim: 0.25 }).s;
    expect(gorunenler(d, 'y').some((n) => n.metin === '1,25')).toBe(true);
  });

  it('eksen ekranda ve solda yer var: sayılar eksenin solunda, sağa hizalı (eskisi gibi ox - 8)', () => {
    const { g, s } = kur({ ox: 400, oy: 309 });
    expect(s.y.durum).toBe('ekranda');
    expect(s.y.sayiYonu).toBe('sol');
    for (const n of gorunenler(s, 'y')) {
      expect(n.hiza).toBe('end');
      expect(n.x).toBe(392);
    }
    degismezler(g, s);
  });

  it('eksen ekranda ama sol kenara çok yakın (4, 12, 15, 28 px): bütün sütun sağa geçer', () => {
    for (const ox of [0, 4, 12, 15, 28]) {
      const { g, s } = kur({ ox, oy: 309 });
      expect(s.y.durum).toBe('ekranda');
      expect(s.y.sayiYonu).toBe('sag');
      const ys = gorunenler(s, 'y');
      expect(ys.length).toBeGreaterThan(8);
      for (const n of ys) {
        expect(n.hiza).toBe('start');
        expect(n.kutu.x).toBeGreaterThanOrEqual(24);
        expect(n.x).toBe(Math.max(ox + 8, 24));
      }
      // "-5" gibi eksi sayılar da (eski hatada eksi işareti kayboluyordu)
      expect(ys.some((n) => n.metin.startsWith('-'))).toBe(true);
      degismezler(g, s);
    }
  });

  it('eksen sağda ekran dışında: sağ kenarın içinde, sağa hizalı, çentiklerin solunda', () => {
    const W = 921;
    const { g, s } = kur({ ox: W + 200, oy: 309 });
    expect(s.y.durum).toBe('sag');
    expect(s.y.sayiYonu).toBe('sol');
    const ys = gorunenler(s, 'y');
    expect(ys.length).toBeGreaterThan(8);
    for (const n of ys) {
      expect(n.hiza).toBe('end');
      expect(sag(n.kutu)).toBeLessThanOrEqual(W - 8);
    }
    for (const o of s.y.ogeler) expect(o.centik.x1).toBeGreaterThan(W - 16);
    degismezler(g, s);
  });

  it('eksen sağ kenara çok yakın ekranda: sayılar sağ kenardan en az 8 px içeride', () => {
    const W = 921;
    for (const d of [0, 4, 15, 28]) {
      const { g, s } = kur({ ox: W - d, oy: 309 });
      for (const n of gorunenler(s, 'y')) expect(sag(n.kutu)).toBeLessThanOrEqual(W - 8);
      degismezler(g, s);
    }
  });

  it('sayılar çentiğe dikeyde ortalanır', () => {
    const { s } = kur({ ox: 400, oy: 309 });
    for (const o of s.y.ogeler) {
      const orta = o.sayi.kutu.y + o.sayi.kutu.h / 2;
      expect(Math.abs(orta - o.centik.y1)).toBeLessThan(1.5);
    }
  });
});

describe('x sayıları (T2)', () => {
  it('eksen ekranda: sayılar eksenin altında, ortalı (eskisi gibi)', () => {
    const { g, s } = kur({ ox: 460, oy: 309 });
    expect(s.x.durum).toBe('ekranda');
    expect(s.x.sayiYonu).toBe('alt');
    for (const n of gorunenler(s, 'x')) {
      expect(n.hiza).toBe('middle');
      expect(n.kutu.y).toBeGreaterThan(309 + 3);
    }
    degismezler(g, s);
  });

  it('eksen alt kenara yakın ekranda: sayılar eksenin üstüne geçer ve alt bilgiye inmez', () => {
    const H = 618;
    for (const d of [4, 15, 20, 28, 40]) {
      const { g, s } = kur({ ox: 460, oy: H - d });
      expect(s.x.durum).toBe('ekranda');
      expect(s.x.sayiYonu).toBe('ust');
      for (const n of gorunenler(s, 'x')) {
        expect(alt(n.kutu)).toBeLessThanOrEqual(H - 29);
        expect(alt(n.kutu)).toBeLessThanOrEqual(H - d - 3);
      }
      degismezler(g, s);
    }
  });

  it('eksen aşağıda ekran dışında: sıra alt bilginin, düğmelerin ve komut hapının üstünde / dışında', () => {
    const W = 921;
    const H = 618;
    const { g, s } = kur({ ox: 460, oy: H + 300 });
    expect(s.x.durum).toBe('alt');
    expect(s.x.sayiYonu).toBe('ust');
    const xs = gorunenler(s, 'x');
    expect(xs.length).toBeGreaterThan(10);
    const engeller = tuvalEngelleri(W, H);
    for (const n of xs) {
      expect(alt(n.kutu)).toBeLessThanOrEqual(H - 29);
      for (const e of engeller) expect(kesisir(n.kutu, e)).toBe(false);
    }
    // çentikler alt bilginin üstünde
    for (const o of s.x.ogeler) expect(o.centik.y2).toBeLessThanOrEqual(H - 23);
    // sağ alttaki düğmelerin altına düşenler çizilmez
    expect(s.x.ogeler.some((o) => o.sayi.neden === 'engel' && o.sayi.x > W - 163)).toBe(true);
    degismezler(g, s);
  });

  it('eksen yukarıda ekran dışında: sıra üst kenarda, araç düğmelerinin altına düşen sayılar çizilmez', () => {
    const { g, s } = kur({ ox: 460, oy: -300 });
    expect(s.x.durum).toBe('ust');
    expect(s.x.sayiYonu).toBe('alt');
    const araclar = { x: 16, y: 12, w: 168, h: 36 };
    for (const n of gorunenler(s, 'x')) {
      expect(kesisir(n.kutu, araclar)).toBe(false);
      expect(n.kutu.y).toBeGreaterThanOrEqual(8);
    }
    const dusen = s.x.ogeler.filter((o) => o.sayi.neden === 'engel');
    expect(dusen.length).toBeGreaterThan(0);
    for (const o of dusen) expect(o.sayi.x).toBeLessThan(200);
    degismezler(g, s);
  });

  it('üst kenara 0-8 px yakın eksende sayılar yapışık sırayla aynı yerde (kaydırırken zıplamaz)', () => {
    const disarida = kur({ ox: 460, oy: -1 }).s;
    for (const oy of [0, 4, 8]) {
      const s = kur({ ox: 460, oy }).s;
      expect(s.x.ogeler[0].sayi.y).toBeCloseTo(disarida.x.ogeler[0].sayi.y, 6);
    }
  });

  it('alt bilgi bandındaki eksende sayılar yapışık sırayla aynı yerde', () => {
    const H = 618;
    const disarida = kur({ ox: 460, oy: H + 1 }).s;
    for (const oy of [H - 29, H - 10, H]) {
      const s = kur({ ox: 460, oy }).s;
      expect(s.x.ogeler[0].sayi.y).toBeCloseTo(disarida.x.ogeler[0].sayi.y, 6);
    }
  });

  it('eksen ortadayken en soldaki sayı tutamaç şeridine girmez (eski "-10" hatası)', () => {
    const { g, s } = kur({ ox: 460.5, oy: 309 });
    const xs = gorunenler(s, 'x');
    const enSol = Math.min(...xs.map((n) => n.kutu.x));
    expect(enSol).toBeGreaterThanOrEqual(24);
    expect(s.x.ogeler.some((o) => o.sayi.metin === '-10' && o.sayi.neden === 'kenar')).toBe(true);
    degismezler(g, s);
  });

  it('sağ kenarda kesilen sayı çizilmez', () => {
    const W = 921;
    const { s } = kur({ ox: 460.5, oy: 309 });
    for (const n of gorunenler(s, 'x')) expect(sag(n.kutu)).toBeLessThanOrEqual(W - 8);
  });
});

describe('köşeler ve çakışmalar (T3)', () => {
  const koseler: Array<[string, (W: number, H: number) => { ox: number; oy: number }]> = [
    ['sol-alt', (W, H) => ({ ox: -300, oy: H + 300 })],
    ['sol-ust', () => ({ ox: -300, oy: -300 })],
    ['sag-alt', (W, H) => ({ ox: W + 300, oy: H + 300 })],
    ['sag-ust', (W) => ({ ox: W + 300, oy: -300 })],
  ];
  for (const [ad, f] of koseler) {
    it(`${ad}: hiçbir sayı başka bir sayıyla, rozetle ya da düğmeyle çakışmaz`, () => {
      for (const [W, H] of [
        [921, 618],
        [1241, 898],
        [1529, 898],
      ]) {
        const { g, s } = kur({ W, H, ...f(W, H) });
        expect(gorunenler(s, 'x').length).toBeGreaterThan(5);
        expect(gorunenler(s, 'y').length).toBeGreaterThan(5);
        degismezler(g, s);
      }
    });
  }

  it('sol-alt köşede çakışan sayılardan köşeye en yakın olan düşer', () => {
    const W = 921;
    const H = 618;
    // x = 30'da "8" (kutusu y sütununun içinde) ve y = H-40'ta "8" (yapışık x sırasının hizasında)
    const { s } = kur({ W, H, ox: -322, oy: H + 312 });
    const kesisenler = [...s.x.ogeler, ...s.y.ogeler].filter((o) => o.sayi.neden === 'kesisme');
    expect(kesisenler.length).toBeGreaterThan(0);
    for (const o of kesisenler) {
      // düşen sayının köşeye uzaklığı, onunla çakışan ve kalan sayınınkinden küçük ya da eşit
      const k = o.sayi;
      const koseX = s.y.cizgiX;
      const koseY = s.x.cizgiY;
      const eksen = s.x.ogeler.includes(o) ? 'x' : 'y';
      const karsi = (eksen === 'x' ? s.y.ogeler : s.x.ogeler).map((p) => p.sayi).filter((n) => n.gorunur && kesisir(n.kutu, k.kutu, 4));
      const ben = eksen === 'x' ? Math.abs(k.x - koseX) : Math.abs(k.kutu.y + k.kutu.h / 2 - koseY);
      for (const n of karsi) {
        const o2 = eksen === 'x' ? Math.abs(n.kutu.y + n.kutu.h / 2 - koseY) : Math.abs(n.x - koseX);
        expect(ben).toBeLessThanOrEqual(o2 + 1e-9);
      }
    }
  });

  it('eksenler ekrandayken orijin çevresindeki x ve y sayıları çakışmaz', () => {
    for (const zoom of [20, 26, 30, 44, 66]) {
      const { g, s } = kur({ ox: 460.5, oy: 309, zoom, adim: zoom < 26 ? 2 : 1 });
      degismezler(g, s);
    }
  });

  it('(0; 0) rozetinin altında kalan sayı çizilmez (eskiden rozetin arkasında gizli kalıyordu)', () => {
    const { s } = kur({ ox: 460, oy: 309, zoom: 44 });
    const bir = s.x.ogeler.find((o) => o.deger === 1)!;
    expect(bir.sayi.gorunur).toBe(false);
    expect(bir.sayi.neden).toBe('engel');
    expect(s.orijinRozeti).not.toBeNull();
  });
});

describe('yön rozetleri (T4)', () => {
  it('ekseni ekran dışındaysa rozet gizli', () => {
    const W = 921;
    const H = 618;
    const a = kur({ ox: -300, oy: H + 300 }).s;
    expect(a.rozetler.artiX.gorunur).toBe(false);
    expect(a.rozetler.artiY.gorunur).toBe(false);
    expect(a.rozetler.eksiY.gorunur).toBe(false);
    const b = kur({ ox: -300, oy: 309 }).s; // yalnız y ekseni dışarıda
    expect(b.rozetler.artiX.gorunur).toBe(true);
    expect(b.rozetler.artiY.gorunur).toBe(false);
    expect(b.rozetler.eksiY.gorunur).toBe(false);
    const c = kur({ ox: 460, oy: -300 }).s; // yalnız x ekseni dışarıda (üstte)
    expect(c.rozetler.artiX.gorunur).toBe(false);
    // görünen y ekseninin hepsi eksi yarı: "+y" gizli, "-y" altta
    expect(c.rozetler.artiY.gorunur).toBe(false);
    expect(c.rozetler.eksiY.gorunur).toBe(true);
    const c2 = kur({ ox: 460, oy: 618 + 300 }).s; // x ekseni altta dışarıda: hepsi artı yarı
    expect(c2.rozetler.artiY.gorunur).toBe(true);
    expect(c2.rozetler.eksiY.gorunur).toBe(false);
    const d = kur({ ox: W + 300, oy: H + 300 }).s;
    expect([d.rozetler.artiX, d.rozetler.artiY, d.rozetler.eksiY].some((r) => r.gorunur)).toBe(false);
  });

  it('varsayılan görünümde rozetler eski yerlerinde', () => {
    const W = 921;
    const H = 618;
    const { g, s } = kur({ ox: 460.5, oy: 309 });
    expect(s.rozetler.artiX).toMatchObject({ gorunur: true, x: W - 46, y: 309 - 24 });
    expect(s.rozetler.artiY).toMatchObject({ gorunur: true, x: 470.5, y: 10 });
    expect(s.rozetler.eksiY).toMatchObject({ gorunur: true, x: 470.5, y: H - 30 });
    degismezler(g, s);
  });

  it('y ekseni araç düğmelerinin altındaysa +y rozeti düğmelerin altına iner', () => {
    const { g, s } = kur({ ox: 100, oy: 309 });
    expect(s.rozetler.artiY.gorunur).toBe(true);
    expect(s.rozetler.artiY.y).toBeGreaterThanOrEqual(52);
    degismezler(g, s);
  });

  it('y ekseni alt bilginin üstündeyse -y rozeti alt bilginin üstüne çıkar', () => {
    const H = 618;
    const { g, s } = kur({ ox: 100, oy: 309 });
    expect(s.rozetler.eksiY.gorunur).toBe(true);
    expect(alt(s.rozetler.eksiY)).toBeLessThanOrEqual(H - 29);
    degismezler(g, s);
  });

  it('x ekseni sağ alttaki düğmelerin hizasındaysa +x rozeti düğmelere girmez', () => {
    const H = 618;
    for (const oy of [H - 40, H - 60, H - 80]) {
      const { g, s } = kur({ ox: 460, oy });
      expect(s.rozetler.artiX.gorunur).toBe(true);
      degismezler(g, s);
    }
  });

  it('orijin alt kenara yakınken -y rozeti orijin halkasına ve (0; 0) rozetine binmez', () => {
    const H = 618;
    for (const d of [4, 10, 15, 20, 28]) {
      const { g, s } = kur({ ox: 460, oy: H - d });
      const halka = { x: 460 - 15, y: H - d - 15, w: 30, h: 30 };
      for (const r of [s.rozetler.artiX, s.rozetler.artiY, s.rozetler.eksiY].filter((q) => q.gorunur)) {
        expect(kesisir(r, halka)).toBe(false);
      }
      degismezler(g, s);
    }
  });

  it('sağ üst köşede +x ve +y üst üste binmez', () => {
    const W = 921;
    const { g, s } = kur({ ox: W - 20, oy: 20 });
    degismezler(g, s);
    const { g: g2, s: s2 } = kur({ ox: W - 20, oy: 20, cisimSecici: true });
    degismezler(g2, s2);
  });
});

describe('yazı ölçeği ve seyreltme', () => {
  it('axisScale 1,25 / 2 ve fontScale 2 ile bütün kurallar geçerli', () => {
    for (const fs of [12.5, 20, 40]) {
      for (const [ox, oy] of [
        [-300, 918],
        [-300, -300],
        [1221, 918],
        [460, 309],
        [12, 309],
        [460, 600],
      ]) {
        const { g, s } = kur({ ox, oy, fs });
        degismezler(g, s);
      }
    }
  });

  it('büyük yazıda sayı sırası üst kenardan kesilmez (eski: taban 16 px sabit)', () => {
    const { s } = kur({ ox: 460, oy: -300, fs: 20 });
    for (const n of gorunenler(s, 'x')) expect(n.kutu.y).toBeGreaterThanOrEqual(8);
    expect(gorunenler(s, 'x').length).toBeGreaterThan(5);
  });

  it('komşu sayılar üst üste binecekse adımın katlarıyla seyreltilir; kalanlar kaydırınca değişmez', () => {
    const a = kur({ ox: -300, oy: 918, fs: 40 }).s;
    const b = kur({ ox: -300 - 44 * 3, oy: 918 + 44 * 2, fs: 40 }).s;
    const xa = gorunenler(a, 'x').map((n) => n.deger);
    expect(xa.length).toBeGreaterThan(3);
    const kat = Math.min(...xa.slice(1).map((v, i) => v - xa[i]));
    expect(kat).toBeGreaterThan(1);
    for (const v of xa) expect(Math.abs(v) % kat).toBe(0);
    for (const v of gorunenler(b, 'x').map((n) => n.deger)) expect(Math.abs(v) % kat).toBe(0);
    // normal yazıda seyreltme yok
    const n = kur({ ox: -300, oy: 918 }).s;
    expect(n.x.ogeler.some((o) => o.sayi.neden === 'seyrek')).toBe(false);
    expect(n.y.ogeler.some((o) => o.sayi.neden === 'seyrek')).toBe(false);
  });

  it('sık sabit ızgarada (0,25 adım, zoom 44) sayılar okunur kalır', () => {
    const { g, s } = kur({ ox: 460, oy: 309, zoom: 44, adim: 0.25 });
    expect(s.x.ogeler.some((o) => o.sayi.neden === 'seyrek')).toBe(true);
    degismezler(g, s);
  });
});

describe('genel', () => {
  it('0 hiçbir eksende etiketlenmez ve çentik de çizilmez', () => {
    const { s } = kur({ ox: 460, oy: 309 });
    expect(s.x.ogeler.some((o) => o.deger === 0)).toBe(false);
    expect(s.y.ogeler.some((o) => o.deger === 0)).toBe(false);
  });

  it('yalnız ekrandaki çentikler döner (ızgara listesinin tamponu atılır)', () => {
    const W = 921;
    const H = 618;
    const { g, s } = kur({ ox: 460, oy: 309 });
    expect(g.xCentikleri.length).toBeGreaterThan(s.x.ogeler.length + 20);
    for (const o of s.x.ogeler) expect(o.centik.x1 >= 0 && o.centik.x1 <= W).toBe(true);
    for (const o of s.y.ogeler) expect(o.centik.y1 >= 0 && o.centik.y1 <= H).toBe(true);
  });

  it('metin kutusu satır kutusudur: 1,1 em yukarı, 0,3 em aşağı', () => {
    expect(METIN_UST).toBe(1.1);
    expect(METIN_ALT).toBe(0.3);
    const { s } = kur({ ox: 460, oy: 309 });
    const n = gorunenler(s, 'x')[0];
    expect(n.kutu.h).toBeCloseTo(14, 6);
    expect(n.y - n.kutu.y).toBeCloseTo(11, 6);
  });

  it('boyut yoksa (ilk kare) boş sonuç', () => {
    const s = eksenSayilariniYerlestir({
      genislik: 0,
      yukseklik: 0,
      orijin: { x: 0, y: 0 },
      xCentikleri: [{ deger: 1, ekran: 10, metin: '1' }],
      yCentikleri: [],
      yaziBoyu: 10,
    });
    expect(s.x.ogeler).toHaveLength(0);
    expect(s.rozetler.artiX.gorunur).toBe(false);
  });

  it('rastgele görünümlerde bütün kurallar her zaman geçerli', () => {
    let tohum = 12345;
    const rnd = () => {
      tohum = (tohum * 1103515245 + 12345) % 2147483648;
      return tohum / 2147483648;
    };
    const zoomlar: Array<[number, number]> = [
      [5, 10],
      [13, 2],
      [26, 1],
      [44, 1],
      [66, 1],
      [120, 0.5],
      [300, 0.25],
    ];
    for (let i = 0; i < 400; i++) {
      const [W, H] = rnd() < 0.5 ? [921, 618] : [1241, 898];
      const [zoom, adim] = zoomlar[Math.floor(rnd() * zoomlar.length)];
      const ox = -600 + rnd() * (W + 1200);
      const oy = -600 + rnd() * (H + 1200);
      const fs = [10, 12.5, 20][Math.floor(rnd() * 3)];
      const { g, s } = kur({ W, H, ox, oy, zoom, adim, fs, cisimSecici: rnd() < 0.2 });
      degismezler(g, s);
    }
  });
});

describe('onarım: rozet yanı, dar tuvalde 3B seçici, büyük "(0; 0)" yazısı, sütun yanı, yapışık çentikler', () => {
  const W = 1241;
  const H = 898;

  it('yön rozeti öbür yarı eksene geçmez; yer yoksa gizlenir', () => {
    // Orijin sol-alt köşeye yakın (60, H-60): "-y" eskiden x ekseninin ÜSTÜNE, "1" çentiğinin yanına kayıyordu
    const a = kur({ W, H, ox: 60, oy: H - 60 });
    expect(a.s.rozetler.eksiY.gorunur).toBe(false);
    expect(a.s.rozetler.artiY.gorunur).toBe(true);
    expect(alt(a.s.rozetler.artiY)).toBeLessThanOrEqual(H - 64);
    degismezler(a.g, a.s);
    // x ekseni üstten 6 px: "+y" (eskiden orijinin altına iniyordu) gizli, "-y" altta
    const b = kur({ W, H, ox: W / 2, oy: 6 });
    expect(b.s.rozetler.artiY.gorunur).toBe(false);
    expect(b.s.rozetler.eksiY.gorunur).toBe(true);
    degismezler(b.g, b.s);
    // x ekseni alttan 6 px: "-y" gizli, "+y" üstte
    const c = kur({ W, H, ox: W / 2, oy: H - 6 });
    expect(c.s.rozetler.eksiY.gorunur).toBe(false);
    expect(c.s.rozetler.artiY.gorunur).toBe(true);
    degismezler(c.g, c.s);
    // y ekseni sağdan 20 px: "+x" (eskiden orijinin soluna kayıyordu) gizli
    const d = kur({ W, H, ox: W - 20, oy: H / 2 });
    expect(d.s.rozetler.artiX.gorunur).toBe(false);
    degismezler(d.g, d.s);
    // Kenarlar boyunca tarama (sağ alt köşedeki düğmeler dahil)
    for (const ox of [4, 30, 60, 120, W / 2, W - 120, W - 60, W - 20, W - 4])
      for (let oy = 0; oy <= H; oy += 6) {
        const k = kur({ W, H, ox, oy });
        degismezler(k.g, k.s);
      }
  });

  it('varsayılan görünümde rozetler yine görünür ve eski yerlerinde', () => {
    const { s } = kur({ W, H, ox: W / 2, oy: H / 2 });
    expect(s.rozetler.artiX).toMatchObject({ gorunur: true, x: W - 46, y: H / 2 - 24 });
    expect(s.rozetler.artiY).toMatchObject({ gorunur: true, x: W / 2 + 10, y: 10 });
    expect(s.rozetler.eksiY).toMatchObject({ gorunur: true, x: W / 2 + 10, y: H - 30 });
  });

  it('3B seçici: geniş tuvalde sağ üstte, dar tuvalde (2D + 3D, üç sütun) araçların altına sarılır', () => {
    const kapsar = (e: Dikdortgen[], d: Dikdortgen) => e.some((k) => k.x <= d.x && k.y <= d.y && sag(k) >= sag(d) && alt(k) >= alt(d));
    const genis = tuvalEngelleri(921, 618, { cisimSecici: true });
    expect(kapsar(genis, { x: 921 - 16 - 238.6, y: 15, w: 238.6, h: 30 })).toBe(true);
    expect(genis.some((k) => k.y > 50 && k.y < 60)).toBe(false);
    for (const dar of [402, 412, 430]) {
      const e = tuvalEngelleri(dar, 618, { cisimSecici: true });
      expect(kapsar(e, { x: 16, y: 56, w: 238.6, h: 30 }), `W=${dar}`).toBe(true);
      expect(e.some((k) => k.x === dar - 260), `W=${dar}`).toBe(false);
    }
    // Eşik yakınında (447 px) iki konum da ayrılır
    const esik = tuvalEngelleri(447, 618, { cisimSecici: true });
    expect(kapsar(esik, { x: 16, y: 56, w: 238.6, h: 30 })).toBe(true);
    expect(kapsar(esik, { x: 447 - 16 - 238.6, y: 15, w: 238.6, h: 30 })).toBe(true);
    // Cisim yoksa seçici de yok
    expect(tuvalEngelleri(402, 618)).toHaveLength(4);
  });

  it('dar tuvalde (402 px) cisim varken sayılar ve rozetler seçicinin altına girmez; üst sıra boş kalmaz', () => {
    const DW = 402;
    const DH = 618;
    const secici = { x: 16, y: 56, w: 238.6, h: 30 };
    const vakalar: Array<[string, number, number, number]> = [
      ['S1', -8.6 * 66, DH + 6.6 * 66, 66],
      ['alt-sol', -300, DH + 300, 44],
      ['ust-sag', DW + 300, -300, 44],
      ['ust-sol', -300, -300, 44],
      ['y-sol-15', 15, DH / 2, 44],
      ['ilk-bolge', 70, DH - 70, 44],
      ['orta', DW / 2, DH / 2, 44],
    ];
    for (const [ad, ox, oy, zoom] of vakalar) {
      const { g, s } = kur({ W: DW, H: DH, ox, oy, zoom, cisimSecici: true });
      for (const n of gorunenler(s)) expect(kesisir(n.kutu, secici), `${ad} ${n.metin}`).toBe(false);
      for (const r of [s.rozetler.artiX, s.rozetler.artiY, s.rozetler.eksiY].filter((q) => q.gorunur))
        expect(kesisir(r, secici), `${ad} rozet`).toBe(false);
      degismezler(g, s);
    }
    // Orijin sağ üstte ekran dışında: üst x sırasının sağ kısmı yazılır (eskiden hepsi düşüyordu)
    const { s } = kur({ W: DW, H: DH, ox: DW + 300, oy: -300, cisimSecici: true });
    expect(gorunenler(s, 'x').length).toBeGreaterThanOrEqual(3);
    expect(gorunenler(s, 'y').length).toBeGreaterThan(5);
  });

  it('büyük eksen yazısında "(0; 0)" metninin taşan kısmı da engeldir', () => {
    for (const [fs, zoom] of [
      [20, 36],
      [20, 44],
      [30, 44],
      [40, 44],
      [40, 90],
    ]) {
      const ox = 600.5;
      const oy = 400;
      const kutu = orijinRozetiKutusu({ x: ox, y: oy }, W, H, fs)!;
      // Roboto Mono: 6 karakter x 0,6 em, ortası orijin + 32, tabanı orijin + 22
      const metin = { x: ox + 32 - 1.8 * fs, y: oy + 22 - 1.05 * fs, w: 3.6 * fs, h: 1.3 * fs };
      expect(kutu.x).toBeLessThanOrEqual(metin.x);
      expect(sag(kutu)).toBeGreaterThanOrEqual(sag(metin));
      expect(kutu.y).toBeLessThanOrEqual(metin.y);
      expect(alt(kutu)).toBeGreaterThanOrEqual(alt(metin));
      const { g, s } = kur({ W, H, ox, oy, zoom, fs });
      for (const n of gorunenler(s)) expect(kesisir(n.kutu, metin), `fs ${fs} z ${zoom} ${n.metin}`).toBe(false);
      degismezler(g, s);
    }
    // Normal yazıda kutu eskisi gibi (rozet çerçevesi)
    expect(orijinRozetiKutusu({ x: 100, y: 100 }, W, H, 10)).toEqual({ x: 107, y: 107, w: 50, h: 22 });
  });

  it('y sütununun yanı yalnız çizilecek sayılara bakar (alt bilginin altındaki "-10" sütunu sağa atmaz)', () => {
    // y ekseni x = 48'de; "-10" çentiği alt bilgi bandında (y = H - 20): o sayı zaten çizilmez
    const a = kur({ W, H, ox: 48, oy: H - 460 });
    const eksiOn = a.s.y.ogeler.find((o) => o.deger === -10)!;
    expect(eksiOn).toBeDefined();
    expect(eksiOn.sayi.gorunur).toBe(false);
    expect(a.s.y.sayiYonu).toBe('sol');
    degismezler(a.g, a.s);
    // "-10" çizilebilir yerdeyse ve solda sığmıyorsa sütun sağa geçer (kesilmez)
    const b = kur({ W, H, ox: 48, oy: H - 560 });
    expect(b.s.y.ogeler.find((o) => o.deger === -10)!.sayi.gorunur).toBe(true);
    expect(b.s.y.sayiYonu).toBe('sag');
    degismezler(b.g, b.s);
  });

  it('köşede x ve y sayıları arasında en az 4 px kalır', () => {
    for (const [ox, oy] of [
      [-322, H + 312],
      [-300, H + 300],
      [-260, H + 260],
      [W + 260, H + 260],
      [-260, -260],
    ]) {
      const { s } = kur({ W, H, ox, oy });
      for (const a of gorunenler(s, 'x')) for (const b of gorunenler(s, 'y')) expect(kesisir(a.kutu, b.kutu, 4)).toBe(false);
    }
  });

  it('yapışık sırada sayısı düşen çentik çizilmez; gerçek eksende bütün çentikler çizilir', () => {
    // y sütunu solda yapışık: araç düğmelerinin ve alt bilginin yanındaki çentikler çizilmez
    const a = kur({ W, H, ox: -300, oy: H / 2 }).s;
    const gizli = a.y.ogeler.filter((o) => !o.centikGorunur);
    expect(gizli.length).toBeGreaterThan(0);
    for (const o of a.y.ogeler) if (o.sayi.gorunur) expect(o.centikGorunur).toBe(true);
    for (const o of gizli) expect(o.sayi.gorunur).toBe(false);
    expect(gizli.some((o) => o.centik.y1 < 52)).toBe(true);
    expect(gizli.some((o) => o.centik.y1 > H - 29)).toBe(true);
    // x ekseni ekranda: hepsi çizilir (sayısı rozetin altında kalan da)
    for (const o of a.x.ogeler) expect(o.centikGorunur).toBe(true);
    // x sırası altta yapışık: komut hapının ve düğmelerin altındakiler çizilmez
    const b = kur({ W, H, ox: W / 2, oy: H + 300 }).s;
    expect(b.x.ogeler.some((o) => !o.centikGorunur && o.centik.x1 > W - 163)).toBe(true);
    for (const o of b.x.ogeler) if (o.sayi.gorunur) expect(o.centikGorunur).toBe(true);
    for (const o of b.y.ogeler) expect(o.centikGorunur).toBe(true);
  });

  it('dar tuvallerde rastgele görünümlerde bütün kurallar geçerli', () => {
    let tohum = 777;
    const rnd = () => {
      tohum = (tohum * 1103515245 + 12345) % 2147483648;
      return tohum / 2147483648;
    };
    const boyutlar: Array<[number, number]> = [
      [402, 618],
      [412, 618],
      [447, 618],
      [543, 898],
      [716, 512],
    ];
    for (let i = 0; i < 300; i++) {
      const [DW, DH] = boyutlar[Math.floor(rnd() * boyutlar.length)];
      const zoom = [26, 44, 66][Math.floor(rnd() * 3)];
      const ox = -400 + rnd() * (DW + 800);
      const oy = -400 + rnd() * (DH + 800);
      const fs = [10, 12.5, 20][Math.floor(rnd() * 3)];
      const { g, s } = kur({ W: DW, H: DH, ox, oy, zoom, fs, cisimSecici: rnd() < 0.6 });
      degismezler(g, s);
    }
  });
});

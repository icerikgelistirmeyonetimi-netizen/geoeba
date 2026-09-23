/**
 * Eşitlik işaretleri — onarım sınamaları (bağımsız doğrulayıcıların bulduğu kusurlar).
 *
 * 1) Uygulamanın KENDİ inşaları noktaları 4 basamağa yuvarlar (komutlarda round4, tuvalde kenara yapıştırma
 *    ve kesişim noktaları). Eşitlik toleransı bu payı kapsamazsa uygulamanın kendi çizdiği eşkenar üçgenin
 *    bir kenarı işaretsiz kalıyordu: çizim, öğrenciye eşkenar üçgenin bir kenarının farklı olduğunu söylüyordu.
 * 2) Numaralama alanı: üst üste binen ama birleşik OLMAYAN iki EŞ kare farklı çizgi sayısı alıyordu ("4 ≠ 4").
 * 3) Kalabalık/sığmayan gruplar sessizce atlanıyordu; artık sayılıyor (komut iletisi söylüyor).
 * 4) Elle işaret, otomatik eşini çıplak bırakıyordu; esitlikGrupAnahtarlari birlikte işaretlemeyi sağlar.
 */
import { describe, expect, it } from 'vitest';
import type { MathObject } from '@/types/math';
import { esitlikGrupAnahtarlari, esitlikIsaretleri, uzunlukEsit, type EsitlikSonucu } from '../esitlikIsaretleri';

type Extra = Record<string, unknown>;
const pt = (id: string, x: number, y: number, extra: Extra = {}) =>
  ({ id, type: 'point', label: id.replace(/^pt-/, ''), showLabel: true, x, y, color: '#2563eb', visible: true, isIndependent: true, createdAt: 0, ...extra }) as MathObject;
const seg = (id: string, a: string, b: string, extra: Extra = {}) =>
  ({ id, type: 'segment', label: id, showLabel: true, startPointId: a, endPointId: b, color: '#0284c7', visible: true, thickness: 2.5, createdAt: 0, ...extra }) as MathObject;
const poly = (id: string, ids: string[], extra: Extra = {}) =>
  ({ id, type: 'polygon', label: id, showLabel: true, pointIds: ids, color: '#10b981', visible: true, createdAt: 0, ...extra }) as MathObject;
const circle = (id: string, c: string, r: string, extra: Extra = {}) =>
  ({ id, type: 'circle', label: id, showLabel: true, centerPointId: c, radiusPointId: r, color: '#8b5cf6', visible: true, createdAt: 0, ...extra }) as MathObject;

/** Uygulamanın depoladığı gibi 4 basamağa yuvarlanmış koordinat. */
const y4 = (n: number) => Number(n.toFixed(4));
const kare = (on: string, x: number, y: number, a: number) => [
  pt(`pt-${on}1`, x, y), pt(`pt-${on}2`, x + a, y), pt(`pt-${on}3`, x + a, y + a), pt(`pt-${on}4`, x, y + a),
  poly(on, [`pt-${on}1`, `pt-${on}2`, `pt-${on}3`, `pt-${on}4`]),
];
const sayilar = (s: EsitlikSonucu, sahipId: string) => [...new Set(s.isaretler.filter((m) => m.sahipId === sahipId).map((m) => m.sayi))].sort();

/**
 * “A merkezli, yarıçapı 6 olan çember çiz” + “çemberin üzerine 3 nokta koy” + “BCD üçgeni çiz”
 * komutlarının ürettiği sahne: çember üzerindeki noktalar 4 basamağa yuvarlıdır.
 */
function cemberUstundeEskenar(): MathObject[] {
  const r = 6;
  const acilar = [Math.PI / 2, Math.PI / 2 + (2 * Math.PI) / 3, Math.PI / 2 + (4 * Math.PI) / 3];
  const [b, c, d] = acilar.map((a, i) => pt(`pt-${'BCD'[i]}`, y4(r * Math.cos(a)), y4(r * Math.sin(a)), { onObjectId: 'circ-A' }));
  return [
    pt('pt-A', 0, 0), pt('pt-R', r, 0), circle('circ-A', 'pt-A', 'pt-R'),
    b, c, d, poly('BCD', ['pt-B', 'pt-C', 'pt-D']),
  ];
}

describe('tolerans: uygulamanın 4 basamaklı koordinat yuvarlaması', () => {
  it('çember üzerine konmuş üç noktanın eşkenar üçgeninde ÜÇ kenar da işaretlenir', () => {
    const objects = cemberUstundeEskenar();
    const s = esitlikIsaretleri(objects);
    expect(s.isaretler.map((m) => m.anahtar).sort()).toEqual(['edge:BCD:0', 'edge:BCD:1', 'edge:BCD:2']);
    expect(sayilar(s, 'BCD')).toEqual([1]);
    // Gerçekten yuvarlanmış veriyle çalışıyoruz: kenarlar birebir eşit DEĞİL.
    const uz = [...s.ogeler.values()].map((o) => o.uzunluk);
    expect(Math.max(...uz) - Math.min(...uz)).toBeGreaterThan(1e-6);
    expect(Math.max(...uz) - Math.min(...uz)).toBeLessThan(2e-4);
  });

  it('pergel inşası: yuvarlanmış kesişim noktasından çıkan iki kenar tabanla birlikte işaretlenir', () => {
    // A(0,0) ve B(6,0) merkezli 6 yarıçaplı çemberlerin kesişimi: (3, 3√3), tuvalde 4 basamağa yuvarlanır.
    const objects = [
      pt('pt-A', 0, 0), pt('pt-B', 6, 0), pt('pt-K', 3, y4(3 * Math.sqrt(3)), { construction: { kind: 'intersection', objectIds: ['c1', 'c2'] } }),
      circle('c1', 'pt-A', 'pt-B'), circle('c2', 'pt-B', 'pt-A'),
      seg('AB', 'pt-A', 'pt-B'), seg('AK', 'pt-A', 'pt-K'), seg('BK', 'pt-B', 'pt-K'),
    ];
    const s = esitlikIsaretleri(objects);
    expect(s.isaretler.map((m) => m.anahtar).sort()).toEqual(['seg:AB', 'seg:AK', 'seg:BK']);
    expect(new Set(s.isaretler.map((m) => m.sayi))).toEqual(new Set([1]));
  });

  it('ekranda aynı görünen GERÇEK farklar hâlâ işaretlenmez', () => {
    const iki = (l1: number, l2: number) =>
      esitlikIsaretleri([pt('pt-O', 0, 0), pt('pt-P', l1, 0), pt('pt-Q', 0, l2), seg('s1', 'pt-O', 'pt-P'), seg('s2', 'pt-O', 'pt-Q')]).isaretler.length;
    expect(iki(10.39, 10.388)).toBe(0);      // fark 2e-3, tolerans 3,5e-4
    expect(iki(5, 5.004)).toBe(0);
    expect(iki(6, 6.002)).toBe(0);
    expect(iki(0.05, 0.0502)).toBe(0);       // küçük şekilde pay uzunluğun binde biriyle sınırlı
    expect(iki(10.3924, 10.392328633814905)).toBe(2); // yuvarlama gürültüsü: işaretlenir
    expect(iki(5, 5 + 3e-9)).toBe(2);
  });

  it('tolerans tablosu: yuvarlama payı ölçekle sınırlı', () => {
    expect(uzunlukEsit(10.3924, 10.392328633814905)).toBe(true);
    expect(uzunlukEsit(10.39, 10.3903)).toBe(true);   // 3e-4: yuvarlama payının içinde (sınır 3,54e-4)
    expect(uzunlukEsit(10.39, 10.3904)).toBe(false);  // 4e-4: payın dışında
    expect(uzunlukEsit(10.39, 10.3915)).toBe(false);  // 1,5e-3: gerçek fark
    expect(uzunlukEsit(0.02, 0.0201)).toBe(false);    // küçük ölçekte pay 2e-5
    expect(uzunlukEsit(1000, 1000.19)).toBe(false);   // "10,39 ile 10,388"in bağıl farkı (1,9e-4) ölçeklenmiş hâli
    expect(uzunlukEsit(1000, 1000.0001)).toBe(true);  // yalnız gürültü
  });
});

describe('numaralama alanı: eş ama birleşik olmayan şekiller', () => {
  it('üst üste binen İKİ EŞ kare aynı çizgi sayısını alır ("4 ≠ 4" demez)', () => {
    const s = esitlikIsaretleri([...kare('K', 0, 0, 4), ...kare('M', 2, 2, 4)]);
    expect(sayilar(s, 'K')).toEqual([1]);
    expect(sayilar(s, 'M')).toEqual([1]);
    expect(s.gruplar).toHaveLength(2);
    expect(s.gruplar.every((g) => g.sayi === 1)).toBe(true);
  });

  it('ölçüleri farklı olan çakışık şekiller yine farklı sayı alır', () => {
    const s = esitlikIsaretleri([...kare('K', 0, 0, 4), ...kare('M', 2, 2, 3)]);
    expect(sayilar(s, 'K')).toEqual([1]);
    expect(sayilar(s, 'M')).toEqual([2]);
  });

  it('uzaktaki eş kare kendi alanında yine 1 ile başlar', () => {
    const s = esitlikIsaretleri([...kare('K', 0, 0, 4), ...kare('U', 40, 40, 4)]);
    expect(sayilar(s, 'K')).toEqual([1]);
    expect(sayilar(s, 'U')).toEqual([1]);
  });
});

describe('atlanan gruplar sayılır', () => {
  it('13 kenarlı düzgün çokgen işaretlenmez ama atlanan olarak bildirilir', () => {
    const n = 13, r = 5;
    const noktalar = Array.from({ length: n }, (_, i) => pt(`pt-${i}`, y4(r * Math.cos((2 * Math.PI * i) / n)), y4(r * Math.sin((2 * Math.PI * i) / n))));
    const s = esitlikIsaretleri([...noktalar, poly('P13', noktalar.map((p) => p.id))]);
    expect(s.isaretler).toHaveLength(0);
    expect(s.atlananGruplar).toBe(1);
  });

  it('normal sahnede atlanan yoktur', () => {
    expect(esitlikIsaretleri(cemberUstundeEskenar()).atlananGruplar).toBe(0);
  });
});

describe('çember değmesi: ızgara (eski eleme sahneyi büyütünce sessizce kapanıyordu)', () => {
  /** 260 çember, her birinin üstünde bir nokta ve merkezden o noktaya bir yarıçap parçası (1300 nesne). */
  const cemberSahnesi = () => {
    const o: MathObject[] = [];
    for (let i = 0; i < 260; i++) {
      const x = (i % 16) * 7, y = Math.floor(i / 16) * 7;
      o.push(pt(`c${i}`, x, y), pt(`r${i}`, x + 3, y), circle(`ci${i}`, `c${i}`, `r${i}`),
        pt(`q${i}`, x - 3, y, { onObjectId: `ci${i}` }),
        seg(`s${i}`, `c${i}`, `q${i}`), seg(`t${i}`, `c${i}`, `r${i}`));
    }
    return o;
  };

  it('büyük sahnede de çember üstündeki nokta bağlar ve hesap bir kare altında kalır', () => {
    const o = cemberSahnesi();
    const s = esitlikIsaretleri(o);
    // Her çemberde iki eşit yarıçap parçası var: q noktası çemberin üstünde olduğu için aynı bileşene girer.
    expect(s.isaretler).toHaveLength(520);
    expect(new Set(s.isaretler.map((m) => m.sayi))).toEqual(new Set([1]));
    esitlikIsaretleri(o); // ısınma
    const t = performance.now();
    for (let i = 0; i < 3; i++) esitlikIsaretleri(o);
    const sure = (performance.now() - t) / 3;
    // Anlamlı sayı yazdırılır (tek başına ~9 ms; ızgara öncesi ~42 ms). Eşik gevşek: vitest testleri paralel
    // çalıştırır, duvar saati yüke bağlıdır; burada yalnız felaket ölçekli bir gerilemeyi yakalıyoruz.
    console.log(`  çember ızgarası: ${sure.toFixed(1)} ms/çağrı, ${o.length} nesne`);
    expect(sure).toBeLessThan(400);
  });
});

describe('esitlikGrupAnahtarlari: elle işaret eşini çıplak bırakmaz', () => {
  it('otomatik grubun bir üyesi verilince grubun tamamı döner', () => {
    const objects = [...kare('K', 0, 0, 4)];
    const s = esitlikIsaretleri(objects);
    expect(esitlikGrupAnahtarlari(s, 'edge:K:0').sort()).toEqual(['edge:K:0', 'edge:K:1', 'edge:K:2', 'edge:K:3']);
  });

  it('grubu olmayan öğede yalnız kendisi döner (temsilciye çevrilerek)', () => {
    const objects = [pt('pt-A', 0, 0), pt('pt-B', 3, 0), pt('pt-C', 0, 7), seg('AB', 'pt-A', 'pt-B'), seg('AC', 'pt-A', 'pt-C')];
    const s = esitlikIsaretleri(objects);
    expect(esitlikGrupAnahtarlari(s, 'seg:AB')).toEqual(['seg:AB']);
  });
});

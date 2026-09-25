/**
 * Tam sayı hesapları: alan ve çevre GÖRÜNEN tam sayılardan hesaplanır ki öğrencinin elle bulduğu sonuçla
 * çelişmesin (kullanıcı isteği, 2026-09-25).
 */
import { describe, expect, it } from 'vitest';
import {
  tamSayiAlan, tamSayiCemberCevresi, tamSayiCevre, tamSayiDaireAlani, toplamiKoruyarakYuvarla,
} from '../tamSayiHesap';
import { alan, aci, cevre, olcuMetni, sesli, aciklama, uzunluk, yazimAyari } from '../matematikYazimi';

const TAM = yazimAyari({ olcuYazimi: 'tam', aciYazimi: 'sapka', tamSayiOlcu: true });
const P = (x: number, y: number) => ({ x, y });
/** Görünen adlı nokta (yazım adları .label'dan değil, görünen nokta adından okur) */
const N = (label: string) => ({ label, showLabel: true, visible: true });

describe('çevre: görünen kenarların toplamı', () => {
  it('kenarları 6,08 · 5,83 · 6 olan üçgenin çevresi 6 + 6 + 6 = 18', () => {
    // A(0,0) B(6,0) C(1,5,5,83...) — kenarlar ≈ 6, 6,08, 5,83 civarı
    const k = [P(0, 0), P(6, 0), P(1, 5.83)];
    const r = tamSayiCevre(k);
    const gorunen = [6, Math.round(Math.hypot(5, 5.83)), Math.round(Math.hypot(1, 5.83))];
    expect(r.deger).toBe(gorunen.reduce((a, b) => a + b, 0));
    expect(r.yaklasik).toBe(true);
    expect(r.sabitBasamak).toBe(true);
  });

  it('tam sayı kenarlı dikdörtgende çevre kesindir (≈ yok)', () => {
    expect(tamSayiCevre([P(0, 0), P(6, 0), P(6, 4), P(0, 4)])).toEqual({ deger: 20, yaklasik: false, sabitBasamak: true });
  });
});

describe('alan: dikdörtgen ve dik üçgende görünen kenarlardan', () => {
  it('2,4 × 3,6 dikdörtgen: görünen 2 × 4 = 8 (gerçek 8,64)', () => {
    const r = tamSayiAlan([P(0, 0), P(2.4, 0), P(2.4, 3.6), P(0, 3.6)], 2.4 * 3.6);
    expect(r.deger).toBe(8);
    expect(r.yaklasik).toBe(true);
  });

  it('3-4-5 dik üçgen: 3 × 4 / 2 = 6, kesin', () => {
    expect(tamSayiAlan([P(0, 0), P(3, 0), P(0, 4)], 6)).toEqual({ deger: 6, yaklasik: false, sabitBasamak: true });
  });

  it('dik kenarları 3 ve 5 olan üçgen: 7,5 (virgüllü ama kesin)', () => {
    const r = tamSayiAlan([P(0, 0), P(3, 0), P(0, 5)], 7.5);
    expect(r.deger).toBe(7.5);
    expect(r.sabitBasamak).toBe(true);
  });

  it('dik olmayan üçgen: gerçek alan tam sayıya yuvarlanır', () => {
    const r = tamSayiAlan([P(0, 0), P(6, 0), P(2, 5)], 15.2);
    expect(r.deger).toBe(15);
  });
});

describe('daire: görünen yarıçapla', () => {
  it('r = 5,83 → görünen 6 → alan π·36', () => {
    expect(tamSayiDaireAlani(5.83).deger).toBeCloseTo(Math.PI * 36, 9);
    expect(tamSayiCemberCevresi(5.83).deger).toBeCloseTo(2 * Math.PI * 6, 9);
  });
});

describe('açı toplamı korunur', () => {
  it('59,6 + 59,6 + 60,8 → toplam 180 kalır', () => {
    const r = toplamiKoruyarakYuvarla([59.6, 59.6, 60.8], 180);
    expect(r.reduce((a, b) => a + b, 0)).toBe(180);
    for (const x of r) expect(Number.isInteger(x)).toBe(true);
  });

  it('36,87 + 53,13 + 90 → 37 + 53 + 90', () => {
    expect(toplamiKoruyarakYuvarla([36.87, 53.13, 90], 180)).toEqual([37, 53, 90]);
  });

  it('toplam tutmuyorsa düz yuvarlar', () => {
    expect(toplamiKoruyarakYuvarla([10.4, 20.6], 100)).toEqual([10, 21]);
  });
});

describe('yazım: tam sayı ayarı', () => {
  it('uzunluk tam sayı yazılır ve ≈ KULLANILMAZ (kullanıcı isteği)', () => {
    const o = uzunluk(N('A'), N('B'), 6.08);
    expect(olcuMetni(o, TAM)).toBe('|AB| = 6 br');
    expect(olcuMetni(uzunluk(N('A'), N('B'), 6), TAM)).toBe('|AB| = 6 br');
  });

  it('açı tam sayı yazılır', () => {
    expect(olcuMetni(aci(N('A'), N('B'), N('C'), 163.9, { basamak: 1 }), TAM)).toContain('164°');
  });

  it('ekran okuyucu ve ipucu da aynı sayıyı söyler', () => {
    const o = uzunluk(N('A'), N('B'), 6.08);
    expect(sesli(o, TAM)).toContain('altı');
    expect(sesli(o, TAM)).not.toContain('virgül');
    expect(sesli(o, TAM)).not.toContain('yaklaşık');
    expect(aciklama(o, TAM)).toBe('AB uzunluğu: 6 br');
  });

  it('sabit basamaklı türetilmiş değer yuvarlanmaz (7,5 kalır)', () => {
    const o = { ...alan([P(0, 0), P(3, 0), P(0, 5)] as never, 7.5), sabitBasamak: true };
    expect(olcuMetni(o, TAM)).toContain('7,5');
  });

  it('ayar kapalıyken eski basamaklar geçerli', () => {
    const KAPALI = yazimAyari({ olcuYazimi: 'tam', aciYazimi: 'sapka', tamSayiOlcu: false });
    expect(olcuMetni(uzunluk(N('A'), N('B'), 6.08), KAPALI)).toBe('|AB| = 6,08 br'); // 2 basamakta kesin
    expect(olcuMetni(cevre([P(0, 0), P(1, 0), P(0, 1)] as never, 3.41), KAPALI)).toContain('3,41');
  });
});

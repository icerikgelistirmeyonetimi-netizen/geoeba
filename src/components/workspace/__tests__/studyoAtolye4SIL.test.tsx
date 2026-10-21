// @vitest-environment node
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { MathObject, PointObject, PolygonObject, SegmentObject } from '@/types/math';
import type { Solid3DObject } from '@/types/workspace3d';
import { reflectPointAcrossLine } from '@/math/geometry';
import { toplamdanYuvarlananCevre, tamSayiCevre } from '@/math/tamSayiHesap';
import { cokgenKartSatirlari, olcumKartKutulari } from '@/math/olcuYazimlari';
import { olcuMetni, uzunluk, type YazimAyari } from '@/math/matematikYazimi';
import { cisimBilgiSatiri, satirGenisligi } from '@/math/cisimEtiketleri2B';
import {
  ceyregeYuvarla, ilkokulDonusAcisi, ilkokulDonusAdi,
  ilkokulGorunumu, kenarZemineParalelMi, kenarlarZemineParalelMi,
} from '../ilkokulKipi';
import {
  adayNoktasi, adayiSina, ayniDogruMu, katlamaYarilari, katlanmisNokta, ortusmeyenOran, sekilUzerindeParca, simetriDogrulari,
  simetriDogrusuMu, simetriSayisiMetni, sinamaBildirimi,
} from '../simetriSinama';
import { uzunlukOlcBirimi } from '../olcuYuvarlama';
import { aracYonergesi } from '../aracYonergeleri';
import { gruplariSuz } from '../kademeDuzeyleri';
import { TREE_TOOL_GROUPS } from '../treeToolDefinitions';
import { cetvelCentikYollari, cetvelMenusu, gonyeMenusu } from '../olcmeAraclari';
import { RotateGizmo } from '../RotateGizmo';
import { SimetriSinamaCubugu, SimetriSinamaKatmani, type SimetriSinama, type SimetriSinamaDurumu } from '../SimetriSinamaArayuzu';
import { ILKOKUL_3B_ARACLARI, arac3BGorunurMu } from '../kademeDuzeyleri3B';
import { ilkokulCisimOzellikleri, ilkokulOlcekNotu, ilkokulOzellikMetni } from '../ilkokul3B';
import { ILKOKUL_3B_DONUS_YONLERI } from '../ilkokul3B';

/*
 * Atölye inceleme 4. tur (geoeba (3).xlsx 17:57), Serbest Çizim Stüdyosu — İLKOKUL kademesi, Umut IŞIK, satır 176–180.
 * Bütün kurallar yalnız ilkokulda; ortaokul / lise yazımı ve araçları değişmez.
 */

const KOK = path.resolve(__dirname, '..');
const oku = (ad: string) => readFileSync(path.join(KOK, ad), 'utf8');

const nokta = (id: string, x: number, y: number, label = ''): PointObject => ({
  id, type: 'point', label, showLabel: false, x, y, color: '#000', visible: true, isIndependent: true, createdAt: 0,
});
const P = (x: number, y: number) => ({ x, y });
const cokgen = (id: string, pointIds: string[], ek: Partial<PolygonObject> = {}): PolygonObject => ({
  id, type: 'polygon', label: 'Çokgen', showLabel: false, pointIds, color: '#10b981', visible: true, showPerimeter: true, createdAt: 0, ...ek,
});

const ILKOKUL_YAZIMI: YazimAyari = { olcuYazimi: 'tam', aciYazimi: 'sapka', tamSayi: true, yaklasikSozcukle: true };
const TAM_SAYI_YAZIMI: YazimAyari = { olcuYazimi: 'tam', aciYazimi: 'sapka', tamSayi: true };

/** Tabanı 4, yüksekliği 4 br ikizkenar üçgen (uzmanın örneği): kenarlar 4, √20, √20 */
const ikizkenar = [nokta('a', 0, 0), nokta('b', 4, 0), nokta('c', 2, 4)];
const dikdortgen = [nokta('p', 0, 0), nokta('q', 4, 0), nokta('r', 4, 3), nokta('s', 0, 3)];

describe('[176] ilkokulda çevre: istenen çevrede gerçek kenarlar toplanır, sonra yuvarlanır', () => {
  it('ikizkenar üçgen (taban 4, yükseklik 4): 12 değil yaklaşık 13 br', () => {
    const r = toplamdanYuvarlananCevre(ikizkenar);
    expect(r.deger).toBe(13);
    expect(r.yaklasik).toBe(true);
    // Eski kural (kenar kenar yuvarlama) 12 veriyordu: ortaokul / lise "tam sayı ölçü" ayarında değişmedi
    expect(tamSayiCevre(ikizkenar).deger).toBe(12);
    const [ilkokulCevre] = cokgenKartSatirlari(ikizkenar, false, true, true, true).olculer;
    expect(olcuMetni(ilkokulCevre, ILKOKUL_YAZIMI)).toBe('Çevre yaklaşık 13 br');
    const [eskiCevre] = cokgenKartSatirlari(ikizkenar, false, true, true).olculer;
    expect(olcuMetni(eskiCevre, TAM_SAYI_YAZIMI)).toBe('Çevre = 12 br');
  });

  it('kenarları zemine paralel tam sayılı şekilde çevre kesin: "Çevre = 14 br"', () => {
    const [c] = cokgenKartSatirlari(dikdortgen, false, true, true, true).olculer;
    expect(olcuMetni(c, ILKOKUL_YAZIMI)).toBe('Çevre = 14 br');
    // Izgarada olmayan dikdörtgen 2,4 × 3,4: gerçek 11,6 → yaklaşık 12 (kenar kenar yuvarlama 10 derdi)
    const kayik = [nokta('1', 0, 0), nokta('2', 2.4, 0), nokta('3', 2.4, 3.4), nokta('4', 0, 3.4)];
    expect(olcuMetni(cokgenKartSatirlari(kayik, false, true, true, true).olculer[0], ILKOKUL_YAZIMI)).toBe('Çevre yaklaşık 12 br');
  });

  it('tam sayı olmayan uzunluk tuval etiketinde de "yaklaşık" der (yalnız ilkokul yazımında)', () => {
    const egik = uzunluk(ikizkenar[1], ikizkenar[2], Math.hypot(2, 4));
    expect(olcuMetni(egik, ILKOKUL_YAZIMI)).toBe('yaklaşık 4 br');
    expect(olcuMetni(uzunluk(ikizkenar[0], ikizkenar[1], 4), ILKOKUL_YAZIMI)).toBe('4 br');
    // Ortaokul / lise tam sayı yazımı: eskisi gibi '≈' yok (kullanıcı kararı, 25.09)
    expect(olcuMetni(egik, TAM_SAYI_YAZIMI)).toBe('4 br');
    // Ondalık yazım (ortaokul varsayılanı) değişmez
    expect(olcuMetni(egik, { olcuYazimi: 'tam', aciYazimi: 'sapka', tamSayi: false })).toBe('≈ 4,47 br');
  });

  it('eğik kenar tanınır: kareli zeminde yatay / dikey paralel, izometrikte dikey ve ±30°', () => {
    expect(kenarlarZemineParalelMi(dikdortgen)).toBe(true);
    expect(kenarlarZemineParalelMi(ikizkenar)).toBe(false);
    expect(kenarZemineParalelMi(P(0, 0), P(0, 5), 'noktali')).toBe(true);
    expect(kenarZemineParalelMi(P(0, 0), P(Math.cos(Math.PI / 6), Math.sin(Math.PI / 6)), 'izometrik')).toBe(true);
    expect(kenarZemineParalelMi(P(0, 0), P(1, 0), 'izometrik')).toBe(false);
  });

  it('istenen eğik çokgen çevresini sayısal gösterir; ölçülmeden önce kart oluşturmaz', () => {
    const ucgen = cokgen('u', ['a', 'b', 'c'], { showPerimeter: false });
    const kartlar = (p: PolygonObject) => olcumKartKutulari({
      objects: ilkokulGorunumu([...ikizkenar, p]),
      viewport: { width: 800, height: 600, zoom: 40, panX: 0, panY: 0 } as never,
      yazim: ILKOKUL_YAZIMI, px: () => 11,
    });
    expect(kartlar(ucgen)).toHaveLength(0);
    const olculen = { ...ucgen, showPerimeter: true };
    expect(kartlar(olculen).find(k => k.anahtar === 'perimeter')?.duz).toBe('Çevre yaklaşık 13 br');
    expect(ucgen.showPerimeter).toBe(false);
    const elle = { ...olculen, labelTexts: { perimeter: 'Benim etiketim' } };
    expect(kartlar(elle).find(k => k.anahtar === 'perimeter')?.duz).toBe('Benim etiketim');
  });

  it('çevre aracı ve kart aynı gerçek toplamı, ilkokulun yaklaşık yazımıyla kullanır', () => {
    const canvas = oku('Canvas.tsx');
    expect(canvas).toContain('cokgenKartSatirlari(polyPoints, false, true, yazim.tamSayi, ilkokul)');
    expect(canvas).toMatch(/ilkokul \? \{ yaklasikSozcukle: true \} : \{\}/);
    expect(canvas).not.toContain('egikCevreUyarisi');
    expect(canvas).not.toContain('ilkokulCevreGorunumu');
  });

});

describe('[177] ilkokulda ekranda "cm" yok: bütün ölçmeler br, cetvel tam / yarım birim çentikli', () => {
  it('Uzunluk Ölç ilkokulda br yazar ve adında "(cm)" yok; lise değişmez', () => {
    expect(uzunlukOlcBirimi('ilkokul')).toBe('br');
    expect(uzunlukOlcBirimi('lise')).toBe('cm');
    const ad = (k: 'ilkokul' | 'lise') => gruplariSuz(TREE_TOOL_GROUPS, k).flatMap((g) => g.tools).find((t) => t.id === 'measure_distance')?.name;
    expect(ad('ilkokul')).toBe('Uzunluk Ölç');
    expect(ad('lise')).toBe('Uzunluk Ölç (cm)');
    const y = aracYonergesi('measure_distance', 0, { ilkokul: true })!;
    expect(`${y.baslik} ${y.aciklama}`).not.toMatch(/cm|santimetre/i);
    expect(y.aciklama).toContain('birim (br)');
  });

  it('eski ya da başka kademede cm ile ölçülmüş parça ilkokul görünümünde br yazar; veri değişmez', () => {
    const seg: SegmentObject = {
      id: 's', type: 'segment', label: '|AB|', showLabel: true, startPointId: 'a', endPointId: 'b', unit: 'cm', showLength: true,
      color: '#000', visible: true, createdAt: 0,
    };
    const g = ilkokulGorunumu([nokta('a', 0, 0, 'A'), nokta('b', 3, 0, 'B'), seg]);
    expect((g.find((o) => o.id === 's') as SegmentObject).unit).toBe('br');
    expect(seg.unit).toBe('cm');
  });

  it('cetvel: ilkokulda milimetreyi andıran onda bir çentik yok, yarım birim çentiği var; öbür kademelerde onda bir var', () => {
    const ilk = cetvelCentikYollari(10, 60, true);
    expect(ilk.onda).toBe('');
    expect(ilk.yarim).not.toBe('');
    expect(ilk.birim.match(/M/g)).toHaveLength(11);
    expect(cetvelCentikYollari(10, 60).onda).not.toBe('');
  });
});

describe('[178] Simetri Keşfet ilkokulda sınama aracı: aday doğru → Katla → örtüşme; Yansıt tamamlama', () => {
  const kare = [P(0, 0), P(3, 0), P(3, 3), P(0, 3)];
  const dikd = [P(0, 0), P(4, 0), P(4, 2), P(0, 2)];
  const duzgun = (n: number) => Array.from({ length: n }, (_, i) => P(5 + 2 * Math.cos((2 * Math.PI * i) / n), 5 + 2 * Math.sin((2 * Math.PI * i) / n)));

  it('simetri doğrusu sayıları: kare 4, dikdörtgen 2, eşkenar üçgen 3, düzgün beşgen 5, altıgen 6, sekizgen 8', () => {
    expect(simetriDogrulari(kare)).toHaveLength(4);
    expect(simetriDogrulari(dikd)).toHaveLength(2);
    expect(simetriDogrulari(duzgun(3))).toHaveLength(3);
    expect(simetriDogrulari(duzgun(5))).toHaveLength(5);
    expect(simetriDogrulari(duzgun(6))).toHaveLength(6);
    expect(simetriDogrulari(duzgun(8))).toHaveLength(8);
    // İkizkenar üçgen 1, çeşitkenar üçgen 0, paralelkenar 0
    expect(simetriDogrulari([P(0, 0), P(4, 0), P(2, 4)])).toHaveLength(1);
    expect(simetriDogrulari([P(0, 0), P(6, 0), P(1, 3)])).toHaveLength(0);
    // (0,0), (5,0), (1,3): kenarlar 5, 5, √10 — ikizkenar, 1 simetri doğrusu
    expect(simetriDogrulari([P(0, 0), P(5, 0), P(1, 3)])).toHaveLength(1);
    expect(simetriDogrulari([P(0, 0), P(4, 0), P(5, 2), P(1, 2)])).toHaveLength(0);
    // Kenarı üzerinde fazladan (doğrusal) köşe sayıyı değiştirmez
    expect(simetriDogrulari([P(0, 0), P(1.5, 0), P(3, 0), P(3, 3), P(0, 3)])).toHaveLength(4);
    expect(simetriSayisiMetni(4)).toBe('Bu şeklin 4 simetri doğrusu var.');
    expect(simetriSayisiMetni(0)).toBe('Bu şeklin simetri doğrusu yok.');
  });

  it('örtüşme denetimi: doğru adayda iki yarı örtüşür (örtüşmeyen alan ≈ 0); dikdörtgenin köşegeninde örtüşmez', () => {
    const dikey = { a: P(1.5, -1), b: P(1.5, 4) };
    expect(simetriDogrusuMu(kare, dikey)).toBe(true);
    expect(adayiSina(kare, dikey)).toBe('dogru');
    expect(ortusmeyenOran(kare, dikey)).toBeLessThan(0.02);
    const kosegen = { a: P(0, 0), b: P(4, 2) };
    expect(simetriDogrusuMu(dikd, kosegen)).toBe(false);
    expect(adayiSina(dikd, kosegen)).toBe('yanlis');
    expect(ortusmeyenOran(dikd, kosegen)).toBeGreaterThan(0.2);
    // Karenin köşegeni simetri doğrusudur
    expect(adayiSina(kare, { a: P(0, 0), b: P(3, 3) })).toBe('dogru');
    expect(ortusmeyenOran(kare, { a: P(0, 0), b: P(3, 3) })).toBeLessThan(0.02);
    // Kayık dikey doğru: yanlış, örtüşmeyen bölge var
    expect(adayiSina(kare, { a: P(1, -1), b: P(1, 4) })).toBe('yanlis');
    expect(ortusmeyenOran(kare, { a: P(1, -1), b: P(1, 4) })).toBeGreaterThan(0.2);
    // Şeklin dışından geçen doğru
    expect(adayiSina(kare, { a: P(5, -1), b: P(5, 4) })).toBe('disinda');
    expect(sinamaBildirimi('dogru')).toContain('örtüştü');
    expect(sinamaBildirimi('yanlis')).toContain('örtüşmedi');
  });

  it('katlama canlandırması: t = 0 yerinde, t = ½ doğrunun üstünde, t = 1 var olan yansıtmanın sonucu', () => {
    const d = { a: P(1.5, -1), b: P(1.5, 4) };
    expect(katlanmisNokta(P(0, 2), d, 0)).toEqual(P(0, 2));
    const orta = katlanmisNokta(P(0, 2), d, 0.5);
    expect(orta.x).toBeCloseTo(1.5);
    expect(orta.y).toBeCloseTo(2);
    expect(katlanmisNokta(P(0, 2), d, 1)).toEqual(reflectPointAcrossLine(P(0, 2), d.a, d.b));
    const { katlanan, sabit } = katlamaYarilari(kare, d);
    expect(katlanan.length).toBeGreaterThanOrEqual(4);
    expect(sabit.length).toBeGreaterThanOrEqual(4);
  });

  it('aday uç yakalama: köşe, kenar ortası, merkez; yoksa yarım birimlik ızgara', () => {
    expect(adayNoktasi(P(0.1, 0.05), kare, 0.3)).toEqual(P(0, 0));
    expect(adayNoktasi(P(1.6, -0.1), kare, 0.3)).toEqual(P(1.5, 0));
    expect(adayNoktasi(P(1.45, 1.55), kare, 0.3)).toEqual(P(1.5, 1.5));
    expect(adayNoktasi(P(6.2, 7.8), kare, 0.3)).toEqual(P(6, 8));
    expect(adayNoktasi(P(6.3, 7.7), kare, 0.3)).toEqual(P(6.5, 7.5));
    // Çizilen parça şeklin iki yanına taşar ve aynı doğrudur
    const parca = sekilUzerindeParca(kare, { a: P(1.5, 0), b: P(1.5, 3) }, 0.8);
    expect(ayniDogruMu(parca, { a: P(1.5, 0), b: P(1.5, 3) })).toBe(true);
    expect(Math.min(parca.a.y, parca.b.y)).toBeCloseTo(-0.8);
    expect(Math.max(parca.a.y, parca.b.y)).toBeCloseTo(3.8);
  });

  it('ilkokulda Yansıt ve Simetri Keşfet başlık ve yönergede ayrışır; ortaokul yönergesi değişmez', () => {
    const yansit = aracYonergesi('reflect', 0, { ilkokul: true })!;
    const kesfet = aracYonergesi('symmetry', 0, { ilkokul: true })!;
    expect(yansit.baslik).toBe('Yansıt');
    expect(yansit.aciklama).toContain('tamamla');
    expect(kesfet.baslik).toBe('Simetri Keşfet');
    expect(kesfet.aciklama).toContain('Katla');
    expect(yansit.aciklama).not.toBe(kesfet.aciklama);
    expect(aracYonergesi('symmetry', 0)!.baslik).toBe('Yansıtma');
  });

  it('tuval: ilkokul Simetri Keşfet kendi akışında; katman ve çubuk yalnız ilkokulda (kaynak)', () => {
    const canvas = oku('Canvas.tsx');
    expect(canvas).toMatch(/if \(activeTool === 'symmetry' && ilkokul && svgRef\.current\) \{/);
    expect(canvas).toContain("etkin: ilkokul && activeTool === 'symmetry',");
    expect(canvas).toContain('<SimetriSinamaKatmani sinama={simetri} viewport={viewport} imlec={mouseWorldPos} />');
    expect(canvas).toContain("{activeTool === 'symmetry' && ilkokul && <SimetriSinamaCubugu sinama={simetri} />}");
    // İlkokul Yansıt çubuğu yalnız reflect'te
    expect(canvas).toContain("{activeTool === 'reflect' && ilkokul && (() => {");
  });

  it('Simetri Keşfet çubuğu ve katmanı: adım yönergesi, Katla (iki uç yokken pasif), bulunan sayısı, örtüşmeyen bölge', () => {
    const sinama = (durum: Partial<SimetriSinamaDurumu> | null, ek: Partial<SimetriSinama> = {}): SimetriSinama => ({
      etkin: true,
      durum: durum ? { sekilId: 'k', uclar: [], katlama: null, sonuc: null, mesaj: null, ...durum } : null,
      koseler: [P(0, 0), P(4, 0), P(4, 2), P(0, 2)],
      bulunanlar: [],
      ogrenciBulunan: 0,
      esik: 0.4,
      animasyonda: false,
      tiklama: () => {},
      katla: () => {},
      yeniDogru: () => {},
      hepsiniGoster: () => {},
      ...ek,
    });
    const bos = renderToStaticMarkup(<SimetriSinamaCubugu sinama={sinama(null)} />);
    expect(bos).toContain('Simetri doğrusunu aradığın şekle dokun');
    expect(bos).not.toContain('data-katla');
    const iki = renderToStaticMarkup(<SimetriSinamaCubugu sinama={sinama({ uclar: [P(0, 0), P(4, 2)] })} />);
    expect(iki).toContain('«Katla»ya bas');
    expect(iki).not.toMatch(/disabled="" data-katla/);
    const tek = renderToStaticMarkup(<SimetriSinamaCubugu sinama={sinama({ uclar: [P(0, 0)] })} />);
    expect(tek).toMatch(/disabled="" data-katla="true"/);
    expect(tek).toContain('Bulunan: 0');
    const sonuc = renderToStaticMarkup(<SimetriSinamaCubugu sinama={sinama({ uclar: [P(0, 0), P(4, 2)], katlama: 1, sonuc: 'yanlis', mesaj: sinamaBildirimi('yanlis') })} />);
    expect(sonuc).toContain('İki yarı örtüşmedi');
    const vp = { width: 800, height: 600, zoom: 40, panX: 0, panY: 0 } as never;
    const katman = (s: SimetriSinama) => renderToStaticMarkup(<svg><SimetriSinamaKatmani sinama={s} viewport={vp} imlec={P(0, 0)} /></svg>);
    const yanlis = katman(sinama({ uclar: [P(0, 0), P(4, 2)], katlama: 1, sonuc: 'yanlis' }));
    expect(yanlis).toContain('data-ortusmeyen-bolge');
    expect(yanlis).toContain('fill-rule="evenodd"');
    const dogru = katman(sinama({ uclar: [P(2, -1), P(2, 3)], katlama: 1, sonuc: 'dogru' }));
    expect(dogru).not.toContain('data-ortusmeyen-bolge');
    expect(dogru).toContain('data-katlanan-yari');
    // Etkin değilse hiçbir şey çizilmez (ortaokul / lise)
    expect(katman(sinama({}, { etkin: false }))).toBe('<svg></svg>');
  });
});

describe('[179] ilkokulda döndürme çeyrek / yarım / tam dönüş + yön; gönyede derece yok', () => {
  it('dönüş adları ve açıları (saat yönünün tersi pozitif)', () => {
    expect(ilkokulDonusAcisi(1, 'saat')).toBe(-90);
    expect(ilkokulDonusAcisi(2, 'ters')).toBe(180);
    expect(ilkokulDonusAcisi(4, 'saat')).toBe(-360);
    expect(ilkokulDonusAdi(-90)).toBe('çeyrek dönüş saat yönünde');
    expect(ilkokulDonusAdi(90)).toBe('çeyrek dönüş saat yönünün tersine');
    expect(ilkokulDonusAdi(180)).toBe('yarım dönüş');
    expect(ilkokulDonusAdi(-270)).toBe('üç çeyrek dönüş saat yönünde');
    expect(ilkokulDonusAdi(360)).toBe('tam dönüş');
    expect(ilkokulDonusAdi(0)).toBe('');
    expect(ceyregeYuvarla(50)).toBe(90);
    expect(ceyregeYuvarla(-40)).toBe(0);
    expect(ceyregeYuvarla(-130)).toBe(-90);
  });

  it('döndürme paleti: ilkokulda çeyrek / yarım / tam dönüş ve yön düğmeleri, derece yok; öbür kademelerde hazır dereceler', () => {
    const ilk = renderToStaticMarkup(
      <svg><RotateGizmo center={{ x: 200, y: 200 }} feedbackDeg={-90} onFreeRotateStart={() => {}} onRotate={() => {}} ilkokul /></svg>,
    );
    for (const metin of ['Çeyrek dönüş', 'Yarım dönüş', 'Tam dönüş', 'Saat yönünde', 'Saat yönünün tersine', 'çeyrek dönüş saat yönünde']) {
      expect(ilk, metin).toContain(metin);
    }
    expect(ilk).not.toContain('°');
    const orta = renderToStaticMarkup(
      <svg><RotateGizmo center={{ x: 200, y: 200 }} feedbackDeg={null} onFreeRotateStart={() => {}} onRotate={() => {}} /></svg>,
    );
    expect(orta).toContain('45°');
    expect(orta).not.toContain('Çeyrek dönüş');
  });

  it('yönerge, gönye ve cetvel menüleri ilkokulda derece yazmaz', () => {
    const y = aracYonergesi('rotate', 0, { ilkokul: true })!;
    expect(`${y.baslik} ${y.aciklama}`).not.toContain('°');
    expect(y.aciklama).toContain('çeyrek dönüş');
    expect(aracYonergesi('rotate', 0)!.aciklama).toContain('30°');
    const metinler = (m: ReturnType<typeof gonyeMenusu>): string[] => m.flatMap((x) => [x.label, ...(x.submenu ?? []).map((s) => s.label)]);
    expect(metinler(gonyeMenusu({ donusSvg: 0, ilkokul: true })).join(' ')).not.toContain('°');
    expect(metinler(gonyeMenusu({ donusSvg: 0, ilkokul: true })).join(' ')).toContain('Çeyrek dönüş (saat yönünde)');
    expect(metinler(gonyeMenusu({ donusSvg: 0 })).join(' ')).toContain('45°');
    expect(metinler(cetvelMenusu({ boy: 10, donusSvg: 0, ilkokul: true })).join(' ')).not.toContain('°');
    // Gönye çeyrek dönüşü: saat yönünde → SVG dönüşü +90 (matematik −90)
    const ceyrek = gonyeMenusu({ donusSvg: 0, ilkokul: true })[0].submenu![0].eylem;
    expect(ceyrek).toEqual({ tur: 'gonyeDonus', donusSvg: 90 });
  });

  it('gönye çiziminde 90° / 45° yazıları ve dönüş okuması ilkokulda gizli (kaynak)', () => {
    const olcme = oku('MeasurementInstruments.tsx');
    expect(olcme).toContain('{Lp >= 150 && !ilkokul && (');
    expect(olcme).toContain("{aktifTutamac === 'don' && !ilkokul && okumaHapi(donusOkumasi(donus)");
    expect(olcme).toContain('gonyeMenusu({ donusSvg: setsquareRotation, ilkokul })');
    const canvas = oku('Canvas.tsx');
    expect(canvas).toMatch(/if \(ilkokul\) \{\s*\n\s*deg = ceyregeYuvarla\(deg\);/);
    expect((canvas.match(/ilkokul=\{ilkokul\}/g) ?? []).length).toBeGreaterThanOrEqual(4);
  });
});

describe('[180] 3B ilkokul: eksen, koordinat, negatif sayı yok; cisim özellikleri yüz / köşe / ayrıt ve yüz biçimleri', () => {
  const cisim = (type: Solid3DObject['type'], width: number, height: number, depth: number, ek: Partial<Solid3DObject> = {}): Solid3DObject => ({
    id: type, type, name: 'Cisim 1', position: { x: 0, y: 0, z: 0 }, dimensions: { width, height, depth, radius: width / 2 },
    rotation: { x: 0, y: 0, z: 0 }, color: '#3b82f6', ...ek,
  } as Solid3DObject);

  it('yüz, köşe, ayrıt sayısı ve yüz biçimleri', () => {
    expect(ilkokulCisimOzellikleri(cisim('cube', 3, 3, 3))).toEqual({ yuz: 6, kose: 8, ayrit: 12, yuzler: '6 kare' });
    expect(ilkokulCisimOzellikleri(cisim('prism', 4, 2, 3)).yuzler).toBe('6 dikdörtgen');
    expect(ilkokulCisimOzellikleri(cisim('prism', 3, 4, 3)).yuzler).toBe('2 kare, 4 dikdörtgen'); // Kare Prizma
    expect(ilkokulCisimOzellikleri(cisim('triangular_prism', 4, 3, 2))).toEqual({ yuz: 5, kose: 6, ayrit: 9, yuzler: '2 üçgen, 3 dikdörtgen' });
    expect(ilkokulCisimOzellikleri(cisim('cylinder', 2, 3, 2)).yuzler).toBe('2 daire, 1 eğri yüz');
    expect(ilkokulCisimOzellikleri(cisim('sphere', 2, 2, 2)).yuzler).toBe('1 eğri yüz');
    // MAT.3.3.1 içeriğindeki tabloyla aynı: eğri yüzeyli cisimlerde köşe ve ayrıt sayılmaz
    expect(ilkokulCisimOzellikleri(cisim('cylinder', 2, 3, 2))).toMatchObject({ yuz: 3, kose: 0, ayrit: 0 });
    expect(ilkokulCisimOzellikleri(cisim('cone', 2, 3, 2))).toMatchObject({ yuz: 2, kose: 0, ayrit: 0 });
    const ozet = ilkokulOzellikMetni(cisim('cube', 3, 3, 3));
    expect(ozet).toBe('6 yüz (6 kare) · 8 köşe · 12 ayrıt');
    expect(ozet).not.toMatch(/br|V =|A =/);
    expect(ilkokulOlcekNotu(2)).toBe('Kenarlar 2 katına çıktı');
    expect(ILKOKUL_3B_DONUS_YONLERI.map((y) => y.ad).join(' ')).not.toMatch(/[xyz]|°/);
  });

  it('Eksenler satırı ilkokulda yok; ortaokulda var', () => {
    expect(ILKOKUL_3B_ARACLARI).not.toContain('show_axes');
    expect(arac3BGorunurMu('ilkokul', 'show_axes')).toBe(false);
    expect(arac3BGorunurMu('ilkokul', 'show_grid')).toBe(true);
    expect(arac3BGorunurMu('ortaokul', 'show_axes')).toBe(true);
  });

  it('2B izdüşüm etiketi ilkokulda yalnız cismin adı (taban alanı, hacim, birimkare, br³ yok)', () => {
    const proj = { name: 'Küp 1', type: 'cube', topView: { baseArea: 9 }, badge: { volume: 27, dimParts: [] } } as never;
    expect(cisimBilgiSatiri(proj, { yalnizAd: true })).toEqual({ ad: 'Küp 1', degerler: '' });
    expect(cisimBilgiSatiri(proj).degerler).toBe('Taban alanı = 9 birimkare · V = 27 br³');
    expect(satirGenisligi({ ad: 'Küp 1', degerler: '' })).toBeLessThan(satirGenisligi(cisimBilgiSatiri(proj)));
  });

  it('3B tuval: eksenler, eksen harfleri, koordinat rozeti ve yüz alanı ilkokulda gizli; hacim rozeti yerine özellikler (kaynak)', () => {
    const c3 = oku('Canvas3D.tsx');
    expect(c3).toContain('t.axesGroup.visible = camera.showAxes && eksenlerGorunur;');
    expect(c3).toContain('{eksenlerGorunur && overlays.gizmoLabels.map(');
    expect(c3).toContain('{eksenlerGorunur && overlays.coordBadges.map(');
    expect(c3).toContain('{overlays.faceBadge && !ilkokul3B && (');
    expect(c3).toContain('{ilkokul3B ? ilkokulOzellikMetni(seciliCisim) : seciliOlcuMetni}');
    expect(c3).toContain('{seciliCisim && (ilkokul3B || seciliOlcuMetni) && (');
    expect(c3).toContain('hacimAlanMetni(seciliCisim, cisimOlcumleri[seciliCisim.id] ?? {})');
    expect(c3).toContain('data-ilkokul-donus-yonleri');
    const canvas = oku('Canvas.tsx');
    expect(canvas).toContain('const yalnizAd = cisimIzdusumuYalnizAd(kademe);');
    expect(canvas).toContain('yalnizAd: yalnizAd || !cisimIzdusumOlcumleri[solid.id]');
    expect(canvas).toContain('{showDetails && !yalnizAd && cisimIzdusumOlcumleri[solid.id] &&');
  });
});

import { describe, expect, it } from 'vitest';
import {
  BASLANGIC_DURUMU,
  PENCERE_YERLESIM,
  SURELER,
  akisIndirgeyici,
  atlanabilir,
  geriDikdortgeni,
  masaustunde,
  ondekiPencere,
  pencereDurumu,
  pencereKatmani,
  pencereSinirla,
  type AkisDurumu,
  type AkisOlayi,
} from '../akis';

function calistir(olaylar: AkisOlayi[], baslangic: AkisDurumu = BASLANGIC_DURUMU): AkisDurumu {
  return olaylar.reduce(akisIndirgeyici, baslangic);
}

const masa = () => calistir([{ tur: 'ATLA' }]);
const ac = (id: string): AkisOlayi => ({ tur: 'PENCERE_AC', id });

describe('akis', () => {
  it('3B yol: yukleniyor → yaklasma → devir → acilis → masaustu → uygulama', () => {
    let d = BASLANGIC_DURUMU;
    expect(d.faz).toBe('yukleniyor');
    d = akisIndirgeyici(d, { tur: 'MODEL_YUKLENDI' });
    expect(d.faz).toBe('yaklasma');
    expect(d.ekran).toBe('karanlik');
    d = akisIndirgeyici(d, { tur: 'ACILIS_LOGO' });
    expect(d.faz).toBe('yaklasma');
    expect(d.ekran).toBe('acilis');
    d = akisIndirgeyici(d, { tur: 'KAMERA_VARDI' });
    expect(d.faz).toBe('devir');
    expect(d.ucBoyut).toBe(true);
    d = akisIndirgeyici(d, { tur: 'DEVIR_BITTI' });
    expect(d.faz).toBe('acilis');
    expect(d.ucBoyut).toBe(false);
    d = akisIndirgeyici(d, { tur: 'ACILIS_BITTI' });
    expect(d.faz).toBe('masaustu');
    expect(d.ekran).toBe('masaustu');
    expect(d.pencereler).toEqual([]);
    d = akisIndirgeyici(d, ac('cizim'));
    expect(d.faz).toBe('uygulama');
    expect(pencereDurumu(d, 'cizim')).toBe('acik');
    expect(d.otomatikAcildi).toBe(true);
  });

  it('3B yok: yukleniyor → acilis (tam ekran) → masaustu', () => {
    const d = calistir([{ tur: 'UCBOYUT_YOK' }]);
    expect(d.faz).toBe('acilis');
    expect(d.ucBoyut).toBe(false);
    expect(d.ekran).toBe('acilis');
    const son = akisIndirgeyici(d, { tur: 'ACILIS_BITTI' });
    expect(son.faz).toBe('masaustu');
  });

  it('yaklaşma sırasında motor hatası açılışa düşürür', () => {
    const d = calistir([{ tur: 'MODEL_YUKLENDI' }, { tur: 'UCBOYUT_YOK' }]);
    expect(d.faz).toBe('acilis');
    expect(d.ucBoyut).toBe(false);
  });

  it('sırasız olaylar yok sayılır (aynı nesne döner)', () => {
    const d = BASLANGIC_DURUMU;
    expect(akisIndirgeyici(d, { tur: 'KAMERA_VARDI' })).toBe(d);
    expect(akisIndirgeyici(d, { tur: 'DEVIR_BITTI' })).toBe(d);
    expect(akisIndirgeyici(d, { tur: 'ACILIS_BITTI' })).toBe(d);
    expect(akisIndirgeyici(d, ac('cizim'))).toBe(d);
    expect(akisIndirgeyici(d, { tur: 'PENCERE_KUCULT', id: 'cizim' })).toBe(d);
    expect(akisIndirgeyici(d, { tur: 'PENCERE_KAPAT', id: 'cizim' })).toBe(d);
    expect(akisIndirgeyici(d, { tur: 'PENCERE_ODAK', id: 'cizim' })).toBe(d);
    expect(akisIndirgeyici(d, { tur: 'PENCERE_BUYUT', id: 'cizim' })).toBe(d);
    expect(akisIndirgeyici(d, { tur: 'PENCERE_TASI', id: 'cizim', konum: { x: 1, y: 1 } })).toBe(d);
    expect(akisIndirgeyici(d, { tur: 'BASLAT_MENUSU', acik: true })).toBe(d);
    const yaklasma = akisIndirgeyici(d, { tur: 'MODEL_YUKLENDI' });
    expect(akisIndirgeyici(yaklasma, { tur: 'MODEL_YUKLENDI' })).toBe(yaklasma);
  });

  it('ATLA her fazdan masaüstüne götürür, masaüstünde etkisizdir', () => {
    for (const olaylar of [
      [],
      [{ tur: 'MODEL_YUKLENDI' }],
      [{ tur: 'MODEL_YUKLENDI' }, { tur: 'KAMERA_VARDI' }],
      [{ tur: 'UCBOYUT_YOK' }],
    ] as AkisOlayi[][]) {
      const d = akisIndirgeyici(calistir(olaylar), { tur: 'ATLA' });
      expect(d.faz).toBe('masaustu');
      expect(d.ucBoyut).toBe(false);
      expect(d.ekran).toBe('masaustu');
    }
    const m = calistir([ac('cizim')], masa());
    expect(akisIndirgeyici(m, { tur: 'ATLA' })).toBe(m);
  });

  it('tek pencere: aç → küçült → geri getir → kapat → yeniden aç', () => {
    let d = calistir([ac('cizim')], masa());
    expect(pencereDurumu(d, 'cizim')).toBe('acik');
    expect(pencereDurumu(d, 'olasilik')).toBe('kapali');
    d = akisIndirgeyici(d, { tur: 'PENCERE_KUCULT', id: 'cizim' });
    expect(pencereDurumu(d, 'cizim')).toBe('kucuk');
    expect(d.faz).toBe('masaustu');
    expect(ondekiPencere(d)).toBeNull();
    // Küçükken tekrar küçültme etkisiz
    expect(akisIndirgeyici(d, { tur: 'PENCERE_KUCULT', id: 'cizim' })).toBe(d);
    d = akisIndirgeyici(d, ac('cizim'));
    expect(pencereDurumu(d, 'cizim')).toBe('acik');
    expect(d.faz).toBe('uygulama');
    // Açık ve öndeyken yeniden açma etkisiz
    expect(akisIndirgeyici(d, ac('cizim'))).toBe(d);
    d = akisIndirgeyici(d, { tur: 'PENCERE_KAPAT', id: 'cizim' });
    expect(pencereDurumu(d, 'cizim')).toBe('kapali');
    expect(d.faz).toBe('masaustu');
    expect(akisIndirgeyici(d, { tur: 'PENCERE_KAPAT', id: 'cizim' })).toBe(d);
    d = akisIndirgeyici(d, ac('cizim'));
    expect(pencereDurumu(d, 'cizim')).toBe('acik');
    // Küçük pencere de kapatılabilir
    const kucuk = calistir([{ tur: 'PENCERE_KUCULT', id: 'cizim' }], d);
    expect(pencereDurumu(akisIndirgeyici(kucuk, { tur: 'PENCERE_KAPAT', id: 'cizim' }), 'cizim')).toBe('kapali');
    // Küçük pencere ODAK ile de geri gelir
    const geri = akisIndirgeyici(kucuk, { tur: 'PENCERE_ODAK', id: 'cizim' });
    expect(pencereDurumu(geri, 'cizim')).toBe('acik');
    expect(geri.faz).toBe('uygulama');
  });

  it('çoklu pencere: son açılan/odaklanan öndedir, katman sırası buna göre', () => {
    let d = calistir([ac('cizim'), ac('veri-grafik'), ac('olasilik')], masa());
    expect(d.pencereler.map((p) => p.id)).toEqual(['cizim', 'veri-grafik', 'olasilik']);
    expect(ondekiPencere(d)?.id).toBe('olasilik');
    expect(pencereKatmani(d, 'cizim')).toBe(1);
    expect(pencereKatmani(d, 'olasilik')).toBe(3);
    expect(pencereKatmani(d, 'yok')).toBe(0);
    expect(d.acilisSayaci).toBe(3);
    expect(d.pencereler.map((p) => p.sira)).toEqual([0, 1, 2]);

    // Görev çubuğundan Veri ve Grafik'e geçiş: öne gelir, diğerleri açık kalır
    d = akisIndirgeyici(d, { tur: 'PENCERE_ODAK', id: 'veri-grafik' });
    expect(d.pencereler.map((p) => p.id)).toEqual(['cizim', 'olasilik', 'veri-grafik']);
    expect(ondekiPencere(d)?.id).toBe('veri-grafik');
    expect(d.pencereler.every((p) => p.durum === 'acik')).toBe(true);
    // Öndekine tekrar odak etkisiz
    expect(akisIndirgeyici(d, { tur: 'PENCERE_ODAK', id: 'veri-grafik' })).toBe(d);
    // PENCERE_AC de zaten açık pencereyi öne getirir (açılış sayacı artmaz)
    d = akisIndirgeyici(d, ac('cizim'));
    expect(ondekiPencere(d)?.id).toBe('cizim');
    expect(d.acilisSayaci).toBe(3);
    expect(d.pencereler.find((p) => p.id === 'cizim')?.sira).toBe(0);
  });

  it('çoklu pencere: küçültülen arkaya gider, bir sonraki açık pencere öne çıkar; kapatınca sökülür', () => {
    let d = calistir([ac('cizim'), ac('veri-grafik'), ac('olasilik')], masa());
    d = akisIndirgeyici(d, { tur: 'PENCERE_KUCULT', id: 'olasilik' });
    expect(pencereDurumu(d, 'olasilik')).toBe('kucuk');
    expect(ondekiPencere(d)?.id).toBe('veri-grafik');
    expect(d.faz).toBe('uygulama');
    expect(d.pencereler[0].id).toBe('olasilik');
    d = akisIndirgeyici(d, { tur: 'PENCERE_KUCULT', id: 'veri-grafik' });
    expect(ondekiPencere(d)?.id).toBe('cizim');
    d = akisIndirgeyici(d, { tur: 'PENCERE_KUCULT', id: 'cizim' });
    expect(ondekiPencere(d)).toBeNull();
    expect(d.faz).toBe('masaustu');
    expect(d.pencereler).toHaveLength(3);
    // Küçük pencereyi geri getirince en öne gelir
    d = akisIndirgeyici(d, ac('veri-grafik'));
    expect(ondekiPencere(d)?.id).toBe('veri-grafik');
    expect(d.faz).toBe('uygulama');
    // Kapat: kayıt silinir, kalanlar korunur
    d = akisIndirgeyici(d, { tur: 'PENCERE_KAPAT', id: 'veri-grafik' });
    expect(d.pencereler.map((p) => p.id)).toEqual(['cizim', 'olasilik']);
    expect(d.faz).toBe('masaustu');
    expect(akisIndirgeyici(d, { tur: 'PENCERE_KAPAT', id: 'veri-grafik' })).toBe(d);
    // Yeniden açılan pencere yeni bir sıra alır (kaydırma ilerler)
    d = akisIndirgeyici(d, ac('veri-grafik'));
    expect(d.pencereler.find((p) => p.id === 'veri-grafik')?.sira).toBe(3);
    expect(d.acilisSayaci).toBe(4);
  });

  it('büyüt / geri al ve sürükleme konumu', () => {
    let d = calistir([ac('cizim')], masa());
    expect(d.pencereler[0].buyuk).toBe(true);
    d = akisIndirgeyici(d, { tur: 'PENCERE_BUYUT', id: 'cizim' });
    expect(d.pencereler[0].buyuk).toBe(false);
    expect(akisIndirgeyici(d, { tur: 'PENCERE_BUYUT', id: 'cizim', buyuk: false })).toBe(d);
    d = akisIndirgeyici(d, { tur: 'PENCERE_TASI', id: 'cizim', konum: { x: 120, y: 40 } });
    expect(d.pencereler[0].konum).toEqual({ x: 120, y: 40 });
    expect(akisIndirgeyici(d, { tur: 'PENCERE_TASI', id: 'cizim', konum: { x: 120, y: 40 } })).toBe(d);
    // Büyütünce konum korunur (geri alınca aynı yere döner)
    d = akisIndirgeyici(d, { tur: 'PENCERE_BUYUT', id: 'cizim', buyuk: true });
    expect(d.pencereler[0].buyuk).toBe(true);
    expect(d.pencereler[0].konum).toEqual({ x: 120, y: 40 });
    // Küçült/geri getir konumu ve büyüklüğü bozmaz
    d = calistir([{ tur: 'PENCERE_KUCULT', id: 'cizim' }, ac('cizim')], d);
    expect(d.pencereler[0].konum).toEqual({ x: 120, y: 40 });
    expect(d.pencereler[0].buyuk).toBe(true);
  });

  it('geri alınmış yerleşim: %84 ortalanmış, her pencere 32 px kayar, alanın içinde kalır', () => {
    const r0 = geriDikdortgeni(0, 1440, 844);
    expect(r0.w).toBe(Math.round(1440 * PENCERE_YERLESIM.ORAN));
    expect(r0.h).toBe(Math.round(844 * PENCERE_YERLESIM.ORAN));
    expect(r0.x).toBe(Math.round((1440 - r0.w) / 2));
    expect(r0.y).toBe(Math.round((844 - r0.h) / 2));
    const r1 = geriDikdortgeni(1, 1440, 844);
    expect(r1.x - r0.x).toBe(PENCERE_YERLESIM.KAYDIRMA);
    expect(r1.y - r0.y).toBe(PENCERE_YERLESIM.KAYDIRMA);
    const r2 = geriDikdortgeni(2, 1440, 844);
    expect(r2.x - r0.x).toBe(2 * PENCERE_YERLESIM.KAYDIRMA);
    // Döngü: DONGU. pencere başa döner
    expect(geriDikdortgeni(PENCERE_YERLESIM.DONGU, 1440, 844)).toEqual(r0);
    // Küçük alanda taşmaz
    for (let sira = 0; sira < 8; sira++) {
      const r = geriDikdortgeni(sira, 640, 400);
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.y).toBeGreaterThanOrEqual(0);
      expect(r.x + r.w).toBeLessThanOrEqual(640);
      expect(r.y + r.h).toBeLessThanOrEqual(400);
    }
    expect(geriDikdortgeni(0, 0, 0)).toEqual({ x: 0, y: 0, w: 0, h: 0 });
  });

  it('pencereSinirla: sürüklenen pencere ekran içinde kalır', () => {
    expect(pencereSinirla({ x: -50, y: -20 }, 400, 300, 1000, 600)).toEqual({ x: 0, y: 0 });
    expect(pencereSinirla({ x: 900, y: 500 }, 400, 300, 1000, 600)).toEqual({ x: 600, y: 300 });
    expect(pencereSinirla({ x: 100.4, y: 50.6 }, 400, 300, 1000, 600)).toEqual({ x: 100, y: 51 });
    // Pencere alandan büyükse sol üst köşeye yaslanır
    expect(pencereSinirla({ x: 30, y: 30 }, 1200, 800, 1000, 600)).toEqual({ x: 0, y: 0 });
  });

  it('başlat menüsü yalnız masaüstünde açılır; pencere açılınca kapanır', () => {
    let d = masa();
    d = akisIndirgeyici(d, { tur: 'BASLAT_MENUSU', acik: true });
    expect(d.baslatMenusu).toBe(true);
    expect(akisIndirgeyici(d, { tur: 'BASLAT_MENUSU', acik: true })).toBe(d);
    d = akisIndirgeyici(d, ac('cizim'));
    expect(d.baslatMenusu).toBe(false);
    d = akisIndirgeyici(d, { tur: 'BASLAT_MENUSU', acik: true });
    expect(d.baslatMenusu).toBe(true);
    // Menüden zaten öndeki uygulama seçilince menü kapanır
    d = akisIndirgeyici(d, ac('cizim'));
    expect(d.baslatMenusu).toBe(false);
    d = akisIndirgeyici(d, { tur: 'BASLAT_MENUSU', acik: true });
    d = akisIndirgeyici(d, { tur: 'BASLAT_MENUSU', acik: false });
    expect(d.baslatMenusu).toBe(false);
  });

  it('yardımcılar ve süreler', () => {
    expect(masaustunde('masaustu')).toBe(true);
    expect(masaustunde('uygulama')).toBe(true);
    expect(masaustunde('yaklasma')).toBe(false);
    expect(atlanabilir('yukleniyor')).toBe(true);
    expect(atlanabilir('acilis')).toBe(true);
    expect(atlanabilir('masaustu')).toBe(false);
    expect(SURELER.YAKLASMA).toBe(3400);
    expect(SURELER.HIZLI_BITIS).toBeLessThanOrEqual(400);
    expect(SURELER.DEVIR).toBe(450);
    expect(SURELER.UCBOYUT_SOLMA).toBe(350);
    expect(SURELER.GIRIS_DURAGAN).toBe(400);
    expect(SURELER.PENCERE_ACILIS).toBe(460);
    expect(SURELER.PENCERE_KUCULTME).toBe(400);
    expect(SURELER.PENCERE_KAPANIS).toBe(160);
    expect(SURELER.PENCERE_BOYUT).toBe(260);
    expect(PENCERE_YERLESIM.ORAN).toBe(0.84);
    expect(PENCERE_YERLESIM.KAYDIRMA).toBe(32);
  });
});

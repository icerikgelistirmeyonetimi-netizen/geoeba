import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import VeriGrafikUygulamasi, { DEPO_ANAHTARI } from '../index';
import { baslangicDurumu, ornegiYukle, type Durum } from '../durum';
import { sinifKurallari, sinifSekmesi } from '../sinifKurallari';

const bos = () => undefined;
vi.mock('../ortak', async (orijinal) => {
  const m = await orijinal<typeof import('../ortak')>();
  return { ...m, useBoyut: (...a: Parameters<typeof m.useBoyut>) => {
    const b = m.useBoyut(...a);
    return b.genislik === 0 && b.yukseklik === 0 ? { genislik: 1000, yukseklik: 600 } : b;
  }};
});
function ciz(id: string, ek: Partial<Durum> = {}) {
  const d = { ...ornegiYukle(baslangicDurumu(), id)!.durum, ipucu: 'kapali', ...ek };
  const g = globalThis as { window?: unknown }, eski = g.window;
  g.window = { localStorage: { getItem: (k: string) => k === DEPO_ANAHTARI ? JSON.stringify(d) : null, setItem: bos, removeItem: bos } };
  try { return renderToStaticMarkup(<VeriGrafikUygulamasi pencereGenisligi={1280} />); }
  finally { if (eski === undefined) delete g.window; else g.window = eski; }
}
describe('Uzman 6. tur: karşılaştırma ve grafik kontrolleri', () => {
  it('bütün sınıflarda ve sınıfsız kayıtta saçılım kapalı, eski seçim Nokta olarak açılır', () => {
    for (const s of [1,2,3,4,5,6,7,8,null] as const) {
      const k=sinifKurallari(s);
      expect(k.sekmeler).not.toContain('sacilim');
      expect(sinifSekmesi('sacilim',k)).toBe('nokta');
      expect(k.sutunaDonustur).toBe(false);
    }
  });
  it.each(['mac','iklim'])('%s istatistikte iki grubu yalnız bir değişken sekmesinde karşılaştırır', (id) => {
    const h=ciz(id,{sekme:'istatistik'});
    expect(h.match(/data-degisken-turu=/g)).toHaveLength(1);
    expect(h).toContain('en büyük değer − en küçük değer');
    expect(h).not.toContain('Sütunlara dönüştür');
  });
  // Uzman 7. tur bu kararı değiştirdi: iki ayrı panel yerine tek grafikte, ortak eksenlerde iki (dört) çizgi
  // (ayrıntılı beklentiler: uzman7.test.tsx).
  it('7-A ve 7-B tek çizgi grafiğinde iki çizgidir; 8. sınıf ekran süresi tek grafikte dört çizgidir', () => {
    for(const [id,n] of [['sinav',2],['ekran',4]] as const) {
      const h=ciz(id,{sekme:'cizgi'});
      expect(h.match(/data-grafik="cizgi"/g),id).toHaveLength(1);
      expect(h.match(/<path [^>]*data-cizgi-grubu=/g),id).toHaveLength(n);
      expect(h.match(/data-cizgi-seri=/g),id).toHaveLength(n);
    }
  });
  it.each(['mac','sinav','ekran'])('%s Etiketler açıldığında nokta grafiğine görünür veri etiketi ekler', id => {
    const secenekler={ortalama:false,oms:false,etiketler:false};
    const kapali=ciz(id,{sekme:'nokta',secenekler});
    const acik=ciz(id,{sekme:'nokta',secenekler:{...secenekler,etiketler:true}});
    const adet=(h:string)=>(h.match(/data-deger-etiketi|data-yigin-sayisi/g)??[]).length;
    expect(adet(kapali)).toBe(0);
    expect(adet(acik)).toBeGreaterThan(0);
    expect(acik).not.toContain('Standart sapma');
  });
  it('ekran süresi dört şubeyi nokta ve sütun grafiklerinde yan yana karşılaştırarak açılır', () => {
    const d=ornegiYukle(baslangicDurumu(),'ekran')!.durum;
    expect(d.tablo.sutunlar.find(s=>s.id===d.ikinciDegisken)?.ad).toBe('Şube');
    expect(ciz('ekran',{sekme:'nokta'})).toContain('data-yan-yana-karsilastirma');
    const h=ciz('ekran',{sekme:'sutun'});
    expect(h).toContain('data-ikili');
  });
});

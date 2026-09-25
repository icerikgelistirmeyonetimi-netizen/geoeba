// Sahip: C (vg/index.tsx, vg/manifest.tsx: manifest, yerleşim, uygulama kökü, araç çubuğu)
import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import VeriGrafikUygulamasi, {
  ARAC_DUGME_GENISLIKLERI,
  DAR_ARAC_CUBUGU,
  aracDuzeyiBul,
  DAR_SERIT,
  DEPO_ANAHTARI,
  DIKEY_ESIGI,
  DIKEY_KAYDIR_ESIGI,
  KESIF_KARTI_ORANI,
  OZET_SALT_OKUNUR_NOTU,
  PANEL_EN_AZ,
  PANEL_GENISLIGI_CSS,
  arastirmaliDuzenle,
  manifest,
  seritDuzeyiBul,
  tabloIslemiUygula,
  yerlesimModu,
} from '../index';
import { anketSatiri, hazirSoruUygula } from '../arastirma';
import { planiUygula, toplamaVerisiYaz } from '../toplamaDurumu';
import { hucreYaz, ornekBul, ornekVeriOlustur, satirSil, tabloOlustur, type VeriTablosu } from '../veri';
import { BosDurum, DaireBilgisi } from '../BosDurum';
import {
  CIZGI_SIRA_NOTU,
  GRUP_EN_COK,
  birimUyumlu,
  cizgiSiraNotuGerekli,
  daireGorunumu,
  degerSikligiTablosu,
  grupPanelleri,
  karsilastirmaAdaylari,
  karsilastirmaTuru,
  pngBandi,
  siraEtiketiMi,
  sutundaSiklikGerekli,
  varsayilanDaireModu,
} from '../grafikKurallari';
import { baslangicDurumu, sutunBirimi } from '../durum';
import { DOLU_ZEMIN, DUGME_BIRINCIL, TurIsareti, paneldekiTus } from '../ortak';
import { Tost, tostSuresi } from '../Tost';

describe('Veri ve Grafik uygulaması (sunucu tarafı akıllı çizim)', () => {
  it('manifest sözleşmeye uyar', () => {
    expect(manifest.id).toBe('veri-grafik');
    expect(manifest.ad).toBe('Veri ve Grafik');
    expect(manifest.kisaAd).toBe('Veri ve Grafik');
    expect(manifest.renk).toBe('#216a78');
    expect(React.isValidElement(manifest.simge)).toBe(true);
    expect(DEPO_ANAHTARI).toBe('geoeba_veri-grafik_v1');
  });

  it('yerleşim (§0 sade 2 panel): panel açıkken 760 px ve üstünde panel | grafik (bantli), altında alt alta; kapalıyken tablo | grafik', () => {
    expect([DIKEY_ESIGI, DIKEY_KAYDIR_ESIGI]).toEqual([720, 760]);
    // Panel açık: 1366, 1147 (büyütülmemiş), 1022 ve eşikte iki sütun; eşiğin altında alt alta (üç sütun yok)
    for (const g of [1920, 1366, 1147, 1022, 900, 760]) expect(yerlesimModu(g, true)).toBe('bantli');
    expect(yerlesimModu(759, true)).toBe('dikey-kaydir');
    expect(yerlesimModu(700, true)).toBe('dikey-kaydir');
    // Panel kapalı: bugünkü düzen
    expect(yerlesimModu(1366, false)).toBe('iki-sutun');
    expect(yerlesimModu(900, false)).toBe('iki-sutun');
    expect(yerlesimModu(720, false)).toBe('iki-sutun');
    expect(yerlesimModu(719, false)).toBe('dikey');
    expect(yerlesimModu(600, false)).toBe('dikey');
  });

  it('uygulama kökü sekmeler ve tabloyla çizilir', () => {
    const html = renderToStaticMarkup(<VeriGrafikUygulamasi pencereGenisligi={1000} />);
    expect(html).toContain('data-uygulama="veri-grafik"');
    expect(html).toContain('role="tablist"');
    expect(html).toContain('Örnek veri');
    expect(html).toContain('Boy (cm)');
    // Açılış örneğinin (boy) ilk öğrencisi: örneğe kalan tek bağ
    expect(html).toContain(ornekVeriOlustur('boy').satirlar[0].hucreler[0]);
    // Sade kabuk: tek "İndir" menüsü, "Temizle" tablonun altında, deney verisi yokken küme seçici yok,
    // değişken grafiğin üstündeki sekmelerle seçilir (ayrıca "Eksen" açılır listesi yok)
    expect(html).toContain('İndir');
    expect(html).toContain('Temizle');
    expect(html).not.toContain('aria-label="Veri kümesi"');
    // Değişken seçimi grafiğin üstündeki sekmelerde (üst şeritte çip yok)
    // Tek değişkenli varsayılan veride değişken sekme satırı çizilmez (adı grafikte yazar); seçenek şeridi grafiğin altında
    expect(html).not.toContain('aria-label="Grafikteki değişken"');
    expect(html).toContain('data-secenek-seridi');
    expect(html).not.toContain('aria-label="Grafikte gösterilen değişken"');
    expect(html).not.toContain('aria-label="Eksene atanacak değişken"');
    expect(html).toContain('aria-label="Grafik seçenekleri"');
    // Seçenek şeridi grafik alanının altında (sunucuda grafik ölçülmeden çizilmez, şerit yine de yerinde)
    expect(html.indexOf('data-secenek-seridi')).toBeGreaterThan(html.indexOf('id="vg-grafik-alani"'));
    // Veri türüne göre: tek sayısal değişkenli tabloda saçılım sekmesi pasif ve nedeni ipucunda
    expect(html).toMatch(/aria-disabled="true"[^>]*title="Saçılım grafiği iki sayısal değişken/);
    expect(html).toContain('>Saçılım<');
    // Tabloda "+ Satır" düğmesi yok; altta yazmaya hazır boş satır var
    expect(html).toContain('data-bos-satir');
    expect(html).toContain('aria-label="Yeni satır, Boy (cm)"');
    expect(html).not.toMatch(/<\/span> Satır<\/button>/);
  });
});

describe('renk anahtarı: kategoriye göre renklendirme (bütün grafikler, istatistik, tablo)', () => {
  it('uygulama: araç çubuğunda "Grafik ayarları" düğmesi', () => {
    const html = renderToStaticMarkup(<VeriGrafikUygulamasi pencereGenisligi={1000} />);
    expect(html).toContain('data-grafik-ayarlari-dugmesi');
    expect(html).toContain('Grafik ayarları');
  });
});

describe('kabuk: dar pencere, tost, tür çipi, koyu tema (C-1)', () => {
  /** Araç çubuğunun sağındaki düğmelerin HTML'i */
  const aracDugmeleri = (html: string) => html.slice(html.indexOf('data-arac-dugmeleri'), html.indexOf('aria-label="Veri"'));

  it('dar kökte (< 1000 px) sağdaki dört düğme yalnız simge; erişilebilir adları aynı ve title taşır', () => {
    expect(DAR_ARAC_CUBUGU).toBe(1000);
    const dar = aracDugmeleri(renderToStaticMarkup(<VeriGrafikUygulamasi pencereGenisligi={900} />));
    for (const ad of ['Örnek veri', 'Veri topla', 'İndir', 'Grafik ayarları']) expect(dar).toContain(`aria-label="${ad}"`);
    expect(dar).not.toContain('Deneyle topla');
    expect(dar).toContain('title="Örnek veri"');
    expect(dar).toContain('title="İndir"');
    // Görünür yazı yok: düğmeler 44 × 44
    expect(dar).not.toMatch(/>Örnek veri</);
    expect(dar).not.toMatch(/>İndir</);
    expect(dar.match(/ w-11 px-0 /g)?.length).toBe(4);
    // Genişte yazılı düğmeler (erişilebilir ad yazıdan gelir)
    const genis = aracDugmeleri(renderToStaticMarkup(<VeriGrafikUygulamasi pencereGenisligi={1200} />));
    expect(genis).toContain('Örnek veri');
    expect(genis).toMatch(/aria-pressed="false"[^>]*data-veri-topla-dugmesi=""><svg[\s\S]*?<\/svg>Veri topla<\/button>/);
    expect(genis).not.toContain('Deneyle topla');
    expect(genis).not.toContain('aria-label="Örnek veri"');
    expect(genis).not.toContain(' w-11 px-0 ');
  });

  it('tost: tablo alanında (grafiği örtmez), alt şeridin üstünde canlı bölge; eylemli 8 sn, eylemsiz 3 sn; Geri al düğmesi 44 px', () => {
    const html = renderToStaticMarkup(<VeriGrafikUygulamasi pencereGenisligi={1200} />);
    const bolge = html.indexOf('data-tost-alani');
    expect(html).toMatch(/role="status" aria-live="polite" class="pointer-events-none absolute inset-x-0 +z-20[^"]*" style="bottom:\d+px"/);
    // Tablo sütununda (aside) ve tablonun alt şeridinden sonra; grafik alanında değil
    expect(bolge).toBeGreaterThan(html.indexOf('aria-label="Veri"'));
    expect(bolge).toBeGreaterThan(html.indexOf('data-tablo-alt-serit'));
    expect(bolge).toBeLessThan(html.indexOf('id="vg-grafik-alani"'));
    // Kap verilmezse eski konum (alttan 12 px)
    expect(renderToStaticMarkup(<Tost tost={null} onKapat={() => undefined} />)).toContain('bottom-3');
    expect(tostSuresi({})).toBe(3000);
    expect(tostSuresi({ eylem: { ad: 'Geri al', calistir: () => undefined } })).toBe(8000);
    expect(tostSuresi({ sure: 5000 })).toBe(5000);
    const tost = renderToStaticMarkup(<Tost tost={{ kimlik: 1, metin: '24 satır silindi.', eylem: { ad: 'Geri al', calistir: () => undefined } }} onKapat={() => undefined} />);
    expect(tost).toContain('24 satır silindi.');
    expect(tost).toContain('data-tost');
    expect(tost).toMatch(/<button[^>]*class="[^"]*h-11[^"]*"[^>]*data-tost-eylemi/);
    expect(tost).toContain('Geri al');
    expect(tost).toContain('pointer-events-auto');
    expect(renderToStaticMarkup(<Tost tost={null} onKapat={() => undefined} />)).not.toContain('data-tost=');
    // Kapalı tablo bandında sağ pay: hap "Tabloyu göster" düğmesinin solunda ortalanır; pay yoksa sağ kenar verilmez
    expect(renderToStaticMarkup(<Tost tost={null} onKapat={() => undefined} alt={0} sag={150} />)).toContain('style="bottom:0;right:150px"');
    expect(renderToStaticMarkup(<Tost tost={null} onKapat={() => undefined} alt={10} sag={0} />)).toContain('style="bottom:10px"');
  });

  it('tür çipi: sayısalda "123", kategorikte "Abc" (12 px, kalın, yuvarlak)', () => {
    const sayi = renderToStaticMarkup(<TurIsareti tur="sayi" />);
    const etiket = renderToStaticMarkup(<TurIsareti tur="etiket" />);
    expect(sayi).toContain('>123<');
    expect(etiket).toContain('>Abc<');
    for (const h of [sayi, etiket]) {
      expect(h).toContain('aria-hidden="true"');
      expect(h).toContain('rounded-full');
      expect(h).toContain('text-[12px]');
      expect(h).toContain('font-bold');
      expect(h).toContain('h-6');
    }
    // Kategorik çip lavanta tonunda
    expect(etiket).toContain('#7f88c4');
  });

  it('koyu temada dolu düğme ve etkin grafik sekmesi koyulaştırılmış zeminde beyaz yazı', () => {
    expect(DOLU_ZEMIN).toContain('dark:bg-[hsl(175_58%_30%)]');
    expect(DOLU_ZEMIN).toContain('dark:text-white');
    expect(DUGME_BIRINCIL).toContain(DOLU_ZEMIN);
    const html = renderToStaticMarkup(<VeriGrafikUygulamasi pencereGenisligi={1200} />);
    expect(html).toMatch(/aria-selected="true"[^>]*class="[^"]*dark:bg-\[hsl\(175_58%_30%\)\]/);
  });

  it('seçenek şeridi tek satır: kaydırılabilir, satır atlamaz, dolgusu ince (≤ 52 px)', () => {
    const html = renderToStaticMarkup(<VeriGrafikUygulamasi pencereGenisligi={1200} />);
    const serit = html.slice(html.lastIndexOf('<div', html.indexOf('data-secenek-seridi')), html.indexOf('data-secenek-seridi'));
    expect(serit).toContain('flex-nowrap');
    expect(serit).toContain('overflow-x-auto');
    expect(serit).toContain('py-0.5');
    expect(serit).not.toContain('flex-wrap ');
    expect(html).toMatch(/aria-label="Grafik seçenekleri" class="[^"]*p-0\.5/);
    expect(DAR_SERIT).toBe(640);
    expect(PANEL_EN_AZ).toBe(140);
  });

  it('ilk açılış: açılış örneği (boy) Keşif şeridiyle; şerit grafik sütununda, grafik alanının hemen üstünde', () => {
    const html = renderToStaticMarkup(<VeriGrafikUygulamasi pencereGenisligi={1200} />);
    const boy = ornekBul('boy')!;
    expect(html).toContain('data-ornek-ipucu="serit"');
    expect(html).toContain('data-kesfet');
    expect(html).toContain(boy.hikaye.arastirmaSorusu);
    expect(html).toContain('aria-label="İpucunu kapat"');
    const serit = html.indexOf('data-ornek-ipucu');
    expect(serit).toBeGreaterThan(html.indexOf('role="tabpanel"'));
    expect(serit).toBeLessThan(html.indexOf('id="vg-grafik-alani"'));
    // Kart görünümü ilk açılışta kapalı; seçenekler kapalı (öğrenci önce tahmin eder)
    expect(html).not.toContain('data-kesif-karti');
    const secenekGrubu = html.slice(html.indexOf('aria-label="Grafik seçenekleri"'));
    expect(secenekGrubu.slice(0, secenekGrubu.indexOf('</div>'))).not.toContain('aria-pressed="true"');
  });

  it('tablonun başlık satırı yalnız tablo sütununda: örneğin adı ve Keşif kartını açıp kapatan 44 px "i" düğmesi', () => {
    const html = renderToStaticMarkup(<VeriGrafikUygulamasi pencereGenisligi={1200} />);
    const baslik = html.indexOf('data-tablo-basligi');
    expect(baslik).toBeGreaterThan(html.indexOf('aria-label="Veri"'));
    expect(baslik).toBeLessThan(html.indexOf('role="tabpanel"'));
    expect(html).toContain(`title="${ornekBul('boy')!.ad}" data-tablo-adi`);
    expect(html).toMatch(/<h2 class="[^"]*text-\[14px\] font-bold[^"]*"[^>]*data-tablo-adi/);
    expect(html).toMatch(/<button type="button" aria-label="Keşif kartı" aria-pressed="true"[^>]*class="grid h-11 w-11[^"]*"[^>]*data-ipucu-dugmesi/);
    expect(KESIF_KARTI_ORANI).toBe(0.34);
  });

  it('sütun birimi: parantezli ek birimdir', () => {
    expect(sutunBirimi('Boy (cm)')).toBe('cm');
    expect(sutunBirimi('Sıcaklık (°C)')).toBe('°C');
    expect(sutunBirimi('Selma')).toBeNull();
    expect(sutunBirimi('Boş ()')).toBeNull();
  });
});

// ── C-3: grafiklerin bağlanma kuralları (grafikKurallari.ts), boş durum, seçenek şeridi düzeyleri ──

const kimlik = (t: VeriTablosu, ad: string) => t.sutunlar.find((s) => s.ad === ad)!.id;
const indeks = (t: VeriTablosu, ad: string) => t.sutunlar.findIndex((s) => s.ad === ad);

describe('Karşılaştır: aynı birimli sayısal değişkenler ve kategorik gruplar (M14)', () => {
  it('birim: aynı birim ya da ikisi de birimsiz uyumlu', () => {
    expect(birimUyumlu('Erzurum (°C)', 'İzmir (°C)')).toBe(true);
    expect(birimUyumlu('Selma', 'Yasemin')).toBe(true);
    expect(birimUyumlu('Boy (cm)', 'Boy ( CM )')).toBe(true);
    expect(birimUyumlu('Haftalık çalışma (saat)', 'Matematik puanı')).toBe(false);
    expect(birimUyumlu('Boy (cm)', 'Kütle (kg)')).toBe(false);
  });

  it('nokta: mac ikinci sayısal değişken, sinav "Sınıf (gruplara ayır)", calisma başka birimi listelemez', () => {
    const mac = ornekVeriOlustur('mac');
    expect(karsilastirmaAdaylari(mac, kimlik(mac, 'Selma'), 'nokta')).toEqual([
      { id: kimlik(mac, 'Yasemin'), ad: 'Yasemin', tur: 'sayi', etiket: 'Yasemin', neden: null },
    ]);
    const sinav = ornekVeriOlustur('sinav');
    const s = karsilastirmaAdaylari(sinav, kimlik(sinav, 'Puan'), 'nokta');
    expect(s).toEqual([{ id: kimlik(sinav, 'Sınıf'), ad: 'Sınıf', tur: 'grup', etiket: 'Sınıf (gruplara ayır)', neden: null }]);
    expect(karsilastirmaTuru(sinav, kimlik(sinav, 'Puan'), kimlik(sinav, 'Sınıf'), 'nokta')).toBe('grup');
    const calisma = ornekVeriOlustur('calisma');
    const c = karsilastirmaAdaylari(calisma, kimlik(calisma, 'Haftalık çalışma (saat)'), 'nokta');
    expect(c.map((a) => a.etiket)).toEqual(['Sınıf (gruplara ayır)']);
    expect(karsilastirmaTuru(calisma, kimlik(calisma, 'Haftalık çalışma (saat)'), kimlik(calisma, 'Matematik puanı'), 'nokta')).toBeNull();
  });

  it(`en çok ${GRUP_EN_COK} grup: fazlası pasif ve gerekçeli; boş sütun pasif`, () => {
    const t = tabloOlustur(
      ['Ad', 'Renk', 'Boş', 'Boy (cm)'],
      ['a', 'b', 'c', 'd', 'e'].map((r, i) => [`K${i}`, r, '', 140 + i]),
      [undefined, 'etiket', 'etiket', 'sayi'],
    );
    const a = karsilastirmaAdaylari(t, kimlik(t, 'Boy (cm)'), 'nokta');
    const renk = a.find((x) => x.ad === 'Renk')!;
    expect(renk.tur).toBe('grup');
    expect(renk.neden).toMatch(/En çok 4 gruba ayrılabilir; Renk sütununda 5 farklı değer var/);
    expect(a.find((x) => x.ad === 'Boş')!.neden).toBe('Boş sütununda henüz değer yok.');
    expect(karsilastirmaTuru(t, kimlik(t, 'Boy (cm)'), kimlik(t, 'Renk'), 'nokta')).toBeNull();
  });

  it('kategorik ana değişken yalnız gruplara ayrılır; çizgi ve istatistikte yalnız aynı birimli sayısal; öteki grafiklerde liste yok', () => {
    const atik = ornekVeriOlustur('atik');
    const a = karsilastirmaAdaylari(atik, kimlik(atik, 'En çok çıkan atık'), 'nokta');
    expect(a.map((x) => [x.etiket, x.neden])).toEqual([['Sınıf (gruplara ayır)', null]]);
    const iklim = ornekVeriOlustur('iklim');
    expect(karsilastirmaAdaylari(iklim, kimlik(iklim, 'Erzurum (°C)'), 'cizgi').map((x) => x.ad)).toEqual(['İzmir (°C)']);
    const sinav = ornekVeriOlustur('sinav');
    expect(karsilastirmaAdaylari(sinav, kimlik(sinav, 'Puan'), 'cizgi')).toEqual([]);
    expect(karsilastirmaAdaylari(sinav, kimlik(sinav, 'Puan'), 'istatistik')).toEqual([]);
    for (const sekme of ['sutun', 'daire', 'sacilim'] as const) expect(karsilastirmaAdaylari(iklim, kimlik(iklim, 'Erzurum (°C)'), sekme)).toEqual([]);
    expect(karsilastirmaTuru(iklim, kimlik(iklim, 'Erzurum (°C)'), kimlik(iklim, 'Erzurum (°C)'), 'nokta')).toBeNull();
  });

  it('gruplara ayırma: sinav 7-A ve 7-B, 15\'er veri, başlık "7-A (15 veri)"; sıra verilirse o sıra; grubu boş satır panele girmez', () => {
    const sinav = ornekVeriOlustur('sinav');
    const g = grupPanelleri(sinav, indeks(sinav, 'Puan'), indeks(sinav, 'Sınıf'));
    expect(g.map((p) => p.baslik)).toEqual(['7-A (15 veri)', '7-B (15 veri)']);
    expect(g.map((p) => p.satirlar.length)).toEqual([15, 15]);
    expect(grupPanelleri(sinav, indeks(sinav, 'Puan'), indeks(sinav, 'Sınıf'), ['7-B', '7-A']).map((p) => p.kategori)).toEqual(['7-B', '7-A']);
    const t = tabloOlustur(['Ad', 'Grup', 'Puan'], [['a', 'X', 5], ['b', '', 6], ['c', 'Y', ''], ['d', 'Y', 7]], [undefined, 'etiket', 'sayi']);
    const p = grupPanelleri(t, 2, 1);
    expect(p.map((x) => [x.kategori, x.satirlar, x.veriSayisi])).toEqual([['X', [0], 1], ['Y', [2, 3], 1]]);
  });
});

describe('Daire, sayısal değişken: her satır, değerlerin sıklığı ya da bilgi kutusu (M08)', () => {
  it('varsayılan: en az 8 veri ve tekrar varsa sıklık, değilse her satır', () => {
    expect(varsayilanDaireModu([1, 2, 2, 3, 3, 3, 4, 5])).toBe('siklik');
    expect(varsayilanDaireModu([1, 2, 2, 3])).toBe('satir');
    expect(varsayilanDaireModu([1, 2, 3, 4, 5, 6, 7, 8, 9])).toBe('satir');
  });

  it('öncelik: kullanıcı seçimi → bağlı örnek → veri', () => {
    const tekrarli = [1, 1, 2, 2, 3, 3, 4, 4];
    expect(daireGorunumu('satir', 'uygunDegil', tekrarli)).toBe('satir');
    expect(daireGorunumu(null, 'uygunDegil', tekrarli)).toBe('uygunDegil');
    expect(daireGorunumu(null, 'siklik', [1, 2])).toBe('siklik');
    expect(daireGorunumu(null, null, tekrarli)).toBe('siklik');
    expect(daireGorunumu(null, undefined, [5, 7, 9])).toBe('satir');
  });

  it('sıklık tablosu: sütun kategorik olur, değerler yeniden yazılır, sıra küçükten büyüğe; öteki sütunlar aynı', () => {
    const kitap = ornekVeriOlustur('kitap');
    const j = indeks(kitap, 'Kitap sayısı');
    const { tablo, sira } = degerSikligiTablosu(kitap, j);
    expect(sira).toEqual(['0', '1', '2', '3', '4', '5', '6']);
    expect(tablo.sutunlar[j].tur).toBe('etiket');
    expect(tablo.sutunlar[0]).toBe(kitap.sutunlar[0]);
    expect(tablo.satirlar.length).toBe(kitap.satirlar.length);
    const t = tabloOlustur(['Ad', 'Süre'], [['a', '2,50'], ['b', 'x'], ['c', 10], ['d', 2.5]]);
    const s = degerSikligiTablosu(t, 1);
    expect(s.tablo.satirlar.map((r) => r.hucreler[1])).toEqual(['2,5', '', '10', '2,5']);
    expect(s.sira).toEqual(['2,5', '10']);
  });

  it('bilgi kutusu: metin, iki seçim, data-daire-bilgi; düğmeler en az 52 px', () => {
    const html = renderToStaticMarkup(<DaireBilgisi degiskenAdi="Boy" onSiklik={() => undefined} onSatir={() => undefined} />);
    expect(html).toContain('data-daire-bilgi');
    expect(html).toContain('Daire grafiği bir bütünün parçalarını gösterir; Boy değerleri toplanınca bir bütün oluşturmaz.');
    expect(html).toContain('Değerlerin sıklığını göster');
    expect(html).toContain('Her satırı dilim yap');
    expect(html.match(/min-h-\[52px\]/g)?.length).toBe(2);
  });
});

describe('Sütun: çok veride değerlerin sıklığı (M21)', () => {
  it("40'tan çok veri ve en çok 30 farklı değer", () => {
    const tekrar = (n: number, farkli: number) => Array.from({ length: n }, (_, i) => i % farkli);
    expect(sutundaSiklikGerekli(tekrar(40, 5))).toBe(false);
    expect(sutundaSiklikGerekli(tekrar(41, 5))).toBe(true);
    expect(sutundaSiklikGerekli(tekrar(60, 30))).toBe(true);
    expect(sutundaSiklikGerekli(tekrar(60, 31))).toBe(false);
  });
});

describe('Çizgi: satırlar bir sıra değilse not (M40)', () => {
  it('sıra bildiren adlar: ay, gün, "3. hafta", "Hafta 3", tarih, saat, yalnız sayı', () => {
    for (const e of ['Ocak', 'şubat', 'Oca', 'Pazartesi', '1. hafta', '3.gün', '2. maç', '4. ölçüm', 'Hafta 3', '3 Kasım', '12.03.2025', '2025-03-12', '08:30', '2024', '5', 'Mart 2024'])
      expect(siraEtiketiMi(e), e).toBe(true);
    for (const e of ['Ayşe', '7C-01', 'K01', 'Uyku', '1. pusula', 'Elma', '']) expect(siraEtiketiMi(e), e).toBe(false);
  });

  it('boy, gun, kitap ve sinav notlu; fide, sicaklik, iklim, mac, cikolata notsuz; adsız tablo notsuz', () => {
    for (const id of ['boy', 'gun', 'kitap', 'sinav']) expect(cizgiSiraNotuGerekli(ornekVeriOlustur(id)), id).toBe(true);
    for (const id of ['fide', 'sicaklik', 'iklim', 'mac', 'cikolata']) expect(cizgiSiraNotuGerekli(ornekVeriOlustur(id)), id).toBe(false);
    expect(cizgiSiraNotuGerekli(tabloOlustur(['Ad', 'Değer'], [['', 1], ['', 2], ['', 3]]))).toBe(false);
    expect(CIZGI_SIRA_NOTU).toBe('Çizgi grafiği zamanla değişimi gösterir; bu satırlar bir sıra değil. Sütun grafiğini deneyin.');
  });
});

describe('PNG bandı ve boş durum (M16, M32)', () => {
  it('bant: araştırma sorusu > örnek sorusu > değişken adı; alt başlık "‹kimden / tablo adı› · N veri"', () => {
    expect(pngBandi({ arastirmaSorusu: 'En sevilen meyve?', kimden: '6-A sınıfı', ornekSorusu: 'x', tabloAdi: 'Meyve', veriSayisi: 24 })).toEqual({
      baslik: 'En sevilen meyve?',
      altBaslik: '6-A sınıfı · 24 veri',
    });
    const mac = ornekBul('mac')!;
    expect(pngBandi({ ornekSorusu: mac.hikaye.arastirmaSorusu, degiskenAdi: 'Selma', tabloAdi: mac.ad, veriSayisi: 10 })).toEqual({
      baslik: mac.hikaye.arastirmaSorusu,
      altBaslik: `${mac.ad} · 10 veri`,
    });
    expect(pngBandi({ degiskenAdi: 'Boy (cm)', tabloAdi: 'Boy (cm)', veriSayisi: 3 })).toEqual({ baslik: 'Boy (cm)', altBaslik: '3 veri' });
    expect(pngBandi({ arastirmaSorusu: '  ', degiskenAdi: null, tabloAdi: 'Tablom', veriSayisi: 0 })).toEqual({ baslik: 'Tablom', altBaslik: '0 veri' });
  });

  it('BosDurum: 48 px çizim, başlık 16 px kalın, iki yol (en az 52 px), data-bos-durum', () => {
    const html = renderToStaticMarkup(<BosDurum onTabloyaYaz={() => undefined} onOrnekSec={() => undefined} />);
    expect(html).toContain('data-bos-durum');
    expect(html).toMatch(/<svg viewBox="0 0 48 48" class="h-12 w-12/);
    expect(html).toMatch(/class="[^"]*text-\[16px\] font-bold[^"]*">Grafik için veri yok</);
    expect(html).toContain('Tabloya değer yazın ya da örnek veri seçin.');
    expect(html).toContain('Tabloya yaz');
    expect(html).toContain('Örnek veri seç');
    expect(html.match(/min-h-\[52px\]/g)?.length).toBe(2);
  });
});

describe('seçenek şeridi düzeyleri: tam, orta, kısmi, dar (tek satır)', () => {
  const nokta = ['Ortalama', 'Ortanca', 'Ortalama mutlak sapma', 'Etiketler', 'Sütunlara dönüştür'];
  it('640 px altında simgeli, 480 altında en dar; sığdığı en geniş düzey; ölçülmeden tam (tahminle)', () => {
    // 1366'da grafik sütunu ≈ 846 px: tahminle sinav'da ölçü düğmeleri (Ortalama, Ortanca, Ortalama mutlak sapma) yazılı
    // kalır, önce Etiketler ve Sütunlara dönüştür simgeye iner ('kismi'); "Sınıf (gruplara ayır)" kesilmez
    expect(seritDuzeyiBul(846, nokta, 'Sınıf (gruplara ayır)', 2)).toBe('kismi');
    expect(seritDuzeyiBul(520, nokta, 'Sınıf (gruplara ayır)', 2)).toBe('en-dar');
    expect(seritDuzeyiBul(470, [], null)).toBe('en-dar');
    expect(seritDuzeyiBul(0, nokta, 'Sınıf (gruplara ayır)', 2)).toBe('tam');
    expect(seritDuzeyiBul(600, [], null)).toBe('dar');
    expect(seritDuzeyiBul(846, nokta, null, 2)).toBe('tam');
    expect(seritDuzeyiBul(1500, nokta, 'Sınıf (gruplara ayır)', 2)).toBe('tam');
    expect(seritDuzeyiBul(900, nokta, 'Yasemin', 2)).toBe('tam');
    expect(seritDuzeyiBul(820, nokta, 'Yasemin', 2)).toBe('orta');
    expect(seritDuzeyiBul(700, nokta, 'Sınıf (gruplara ayır)', 2)).toBe('kismi');
    expect(seritDuzeyiBul(660, nokta, 'Sınıf (gruplara ayır)', 2)).toBe('dar');
    // İkincil düğme verilmezse (çizgi, daire, sütun) kısmi düzey yok: ortadan doğrudan dara
    expect(seritDuzeyiBul(700, nokta, 'Sınıf (gruplara ayır)')).toBe('dar');
  });

  it('ölçülen yazı genişlikleriyle (1366, ekran): gereken 841 px, şerit 846 px → orta (bütün düğmeler yazılı)', () => {
    // 1366'da tarayıcıda ölçülen yazılar: düğmeler 12 px kalın, seçim kutusu 13 px kalın
    const olculen: Record<string, number> = { Ortalama: 53, Ortanca: 46, 'Ortalama mutlak sapma': 135, Etiketler: 49, 'Sütunlara dönüştür': 112 };
    const olc = (m: string, tur: 'dugme' | 'secim' | 'etiket') => olculen[m] ?? (tur === 'secim' ? 123 : tur === 'etiket' ? 69 : null);
    expect(seritDuzeyiBul(846, nokta, 'Şube (gruplara ayır)', 2, olc)).toBe('orta');
    // 817 px'lik şeritte (calisma: tablo daha geniş) ölçü düğmeleri yazılı, ikincil ikisi simge
    expect(seritDuzeyiBul(817, nokta, 'Şube (gruplara ayır)', 2, olc)).toBe('kismi');
    // Ölçer null dönerse tahmine düşer
    expect(seritDuzeyiBul(846, nokta, 'Sınıf (gruplara ayır)', 2, () => null)).toBe('kismi');
  });

  it('araç çubuğu kademeli daralır: önce Grafik ayarları, sonra İndir, en son Örnek veri ve Veri topla simge', () => {
    // 1366'da sekmeler 434 px: dört düğme yazılı
    expect(aracDuzeyiBul(1364, 434)).toBe(0);
    // 900'de yalnız dişli simge (eskiden dördü de simgeydi, yanında 250 px boş kalıyordu)
    expect(aracDuzeyiBul(900, 434)).toBe(1);
    expect(aracDuzeyiBul(820, 434)).toBe(2);
    expect(aracDuzeyiBul(760, 434)).toBe(4);
    // Sekmeler ölçülmeden (sunucu çizimi) eski kural: 1000 px altında dördü de simge
    expect(aracDuzeyiBul(900, 0)).toBe(4);
    expect(aracDuzeyiBul(1200, 0)).toBe(0);
    const { ornek, topla, indir, ayar } = ARAC_DUGME_GENISLIKLERI;
    expect(ornek + topla + indir + ayar).toBe(424);
  });

  it('uygulama: nokta şeridinde Ortanca düğmesi (Ortalama ile Ortalama mutlak sapma arasında), basılı değil', () => {
    const html = renderToStaticMarkup(<VeriGrafikUygulamasi pencereGenisligi={1200} />);
    const grup = html.slice(html.indexOf('aria-label="Grafik seçenekleri"'));
    const i = (ad: string) => grup.indexOf(`>${ad}</span>`);
    expect(i('Ortanca')).toBeGreaterThan(i('Ortalama'));
    expect(i('Ortanca')).toBeLessThan(i('Ortalama mutlak sapma'));
    expect(grup).toMatch(/aria-pressed="false"[^>]*>(<svg[\s\S]*?<\/svg>)<span>Ortanca<\/span>/);
  });
});

// ── C-4 / C-5: Veri topla paneli (yerleşim, soru şeridi, tablo bandı, eski kaydın göçü) ──

/** Bağlı bir anket araştırması (meyve, 3 cevap) kaydı; panel açık ya da kapalı */
function toplamaKaydi(acik: boolean): string {
  let d = planiUygula(baslangicDurumu(), hazirSoruUygula('meyve')!).durum;
  d = toplamaVerisiYaz(d, { ekle: ['Elma', 'Muz', 'Elma'].map((s, i) => ({ kimlik: `r${i}`, hucreler: anketSatiri(d.arastirma!, s) })) });
  return JSON.stringify({ ...d, toplamaAcik: acik, ipucu: 'serit' });
}

/**
 * Eski örnekleyicinin (C-5'ten önceki sürüm) kaydı: Tablom boy örneği (24 satır), "Deney sonuçları" kümesi açık ve dolu
 * (Çekiliş + Sonuç), Ölçümler dolu, eski panel açık, sekme Saçılım (deney kümesinin görünümü)
 */
function eskiKayit(): string {
  const tablo = ornekVeriOlustur('boy');
  return JSON.stringify({
    surum: 1,
    tablo,
    sekme: 'sacilim',
    degisken: 'vg-ay-para',
    ikinciDegisken: null,
    yDegisken: null,
    aralik: null,
    secenekler: { ortalama: false, oms: false, etiketler: false },
    sutunModu: false,
    yuvarlamaAdimi: 1,
    adimlariGoster: false,
    etkinKume: 'deney',
    gorunumler: { tablom: { degisken: tablo.sutunlar[1].id, ikinciDegisken: null, aralik: null } },
    deneyTablosu: {
      sutunlar: [
        { id: 'vg-cekilis', ad: 'Çekiliş', tur: 'etiket' },
        { id: 'vg-ay-para', ad: 'Sonuç', tur: 'etiket' },
      ],
      satirlar: ['Yazı', 'Tura', 'Tura', 'Yazı', 'Tura'].map((s, i) => ({ id: `e${i}`, hucreler: [String(i + 1), s] })),
    },
    olcumTablosu: { sutunlar: [{ id: 'vg-tekrar', ad: 'Tekrar', tur: 'etiket' }, { id: 'vg-olcu-x-1', ad: 'Tura sayısı (10 çekiliş)', tur: 'sayi' }], satirlar: [{ id: 'o1', hucreler: ['1', '6'] }] },
    ornekleyici: { aygitlar: [{ id: 'ay-para', tur: 'karistirici', degisken: 'Sonuç', ogeler: [{ etiket: 'Yazı', adet: 1 }, { etiket: 'Tura', adet: 1 }], iadeli: true }], toplamSutunu: false, cekilisSayisi: 20, hiz: 1, olcum: { kaynak: 'ay-para', olcu: 'sayisi', hedef: 'Tura' } },
    ornekleyiciAcik: true,
  });
}

/** Sunucu çizimini sahte bir localStorage'lı pencereyle yapar (durum ilk çizimde okunur) */
function pencereyle<T>(depo: Record<string, string>, f: () => T): T {
  const g = globalThis as { window?: unknown };
  const eski = g.window;
  g.window = { localStorage: { getItem: (k: string) => depo[k] ?? null, setItem: () => undefined, removeItem: () => undefined } };
  try {
    return f();
  } finally {
    if (eski === undefined) delete g.window;
    else g.window = eski;
  }
}

describe('C-4 / C-5: "Veri topla" paneli (yerleşim, soru şeridi, tablo bandı, eski kaydın göçü)', () => {
  it('panel genişliği 1366\'da ≈ 410 px (320–420)', () => {
    expect(PANEL_GENISLIGI_CSS).toBe('clamp(320px, 30%, 420px)');
  });

  it('kayıtsız açılış: panel kapalı, "Veri topla" araç çubuğunda (Örnek veri ile İndir arasında), eski yol yok', () => {
    const html = renderToStaticMarkup(<VeriGrafikUygulamasi pencereGenisligi={1366} />);
    expect(html).toContain('data-yerlesim="iki-sutun"');
    expect(html).toMatch(/aria-pressed="false"[^>]*data-veri-topla-dugmesi/);
    const dugmeler = html.slice(html.indexOf('data-arac-dugmeleri'), html.indexOf('data-yerlesim'));
    expect(dugmeler.indexOf('Veri topla')).toBeGreaterThan(dugmeler.indexOf('Örnek veri'));
    expect(dugmeler.indexOf('Veri topla')).toBeLessThan(dugmeler.indexOf('İndir'));
    expect(html).not.toContain('data-veri-topla-paneli');
    for (const eski of ['Deneyle topla', 'data-ornekleyici', 'Örnekleyici', 'uc-sutun']) expect(html).not.toContain(eski);
  });

  it('panel açık: iki sütun (panel | grafik), tablo grafiğin altında kapalı bant, soru şeridi ve Keşif yok', () => {
    const html = pencereyle({ [DEPO_ANAHTARI]: toplamaKaydi(true) }, () => renderToStaticMarkup(<VeriGrafikUygulamasi pencereGenisligi={1366} />));
    expect(html).toContain('data-yerlesim="bantli"');
    expect(html).toContain('data-veri-topla-paneli');
    expect(html).toContain('data-toplama-alani="bantli"');
    expect(html).toContain(`style="width:${PANEL_GENISLIGI_CSS}"`);
    // Tablo sütunu yok; tablo grafik alanının altında, seçenek şeridinin üstünde kapalı bant
    expect(html).not.toContain('aria-label="Veri"');
    expect(html).toContain('data-tablo-bandi="kapali"');
    expect(html.indexOf('data-tablo-bandi-kabi')).toBeGreaterThan(html.indexOf('id="vg-grafik-alani"'));
    expect(html.indexOf('data-tablo-bandi-kabi')).toBeLessThan(html.indexOf('data-secenek-seridi'));
    expect(html).toMatch(/3 satır/);
    // Tek araç çubuğu: "Veri topla" basılı, "Deneyle topla" yok; sırası Örnek veri · Veri topla · İndir
    expect(html).toMatch(/aria-pressed="true"[^>]*data-veri-topla-dugmesi/);
    expect(html).not.toContain('Deneyle topla');
    const dugmeler = html.slice(html.indexOf('data-arac-dugmeleri'), html.indexOf('data-yerlesim'));
    expect(dugmeler.indexOf('Veri topla')).toBeGreaterThan(dugmeler.indexOf('Örnek veri'));
    expect(dugmeler.indexOf('Veri topla')).toBeLessThan(dugmeler.indexOf('İndir'));
    // §0: panel açıkken grafik sütununda soru şeridi, Keşif şeridi ya da not yok; soru panelin görev metninde
    expect(html).not.toContain('data-soru-seridi');
    expect(html).not.toContain('data-ornek-ipucu');
    expect(html).toContain('Sınıfımızda en çok sevilen meyve hangisi?');
  });

  it('panel kapalı: tablo solda, grafik sütununda soru şeridi ("3 veri"), tablo başlığında soru şeridi düğmesi', () => {
    const html = pencereyle({ [DEPO_ANAHTARI]: toplamaKaydi(false) }, () => renderToStaticMarkup(<VeriGrafikUygulamasi pencereGenisligi={1366} />));
    expect(html).toContain('data-yerlesim="iki-sutun"');
    expect(html).toContain('aria-label="Veri"');
    expect(html).not.toContain('data-veri-topla-paneli');
    expect(html).toMatch(/aria-pressed="false"[^>]*data-veri-topla-dugmesi/);
    const serit = html.slice(html.indexOf('data-soru-seridi'));
    expect(serit).toContain('Araştırma sorusu:');
    expect(serit).toContain('Sınıfımızda en çok sevilen meyve hangisi?');
    expect(serit).toContain('3 veri');
    expect(serit).toContain('aria-label="Soru şeridini gizle"');
    expect(html).toContain('aria-label="Soru şeridi"');
    // Soru şeridi grafik alanının üstünde (ipucu yuvası)
    expect(html.indexOf('data-soru-seridi')).toBeLessThan(html.indexOf('id="vg-grafik-alani"'));
  });

  it('dar pencerede (< 760) panel üstte tam genişlik (440 px), altında grafik (360 px) ve tablo bandı; gövde kayar', () => {
    const html = pencereyle({ [DEPO_ANAHTARI]: toplamaKaydi(true) }, () => renderToStaticMarkup(<VeriGrafikUygulamasi pencereGenisligi={740} />));
    expect(html).toContain('data-yerlesim="dikey-kaydir"');
    expect(html).toContain('data-toplama-alani="dikey-kaydir"');
    expect(html).toContain('h-[440px] w-full');
    // Tablo sütunu yok: grafik önce, tablo grafiğin altında bant
    expect(html).not.toContain('aria-label="Veri"');
    expect(html).toContain('h-[360px] shrink-0');
    expect(html.indexOf('data-tablo-bandi-kabi')).toBeGreaterThan(html.indexOf('id="vg-grafik-alani"'));
  });

  it('eski örnekleyici kaydı (deney dolu, panel açık, Saçılım): Veri topla paneli açık, Tablom aynen, sekme Nokta, eski deney önceki tabloda', () => {
    const tablo = ornekVeriOlustur('boy');
    const html = pencereyle({ [DEPO_ANAHTARI]: eskiKayit() }, () => renderToStaticMarkup(<VeriGrafikUygulamasi pencereGenisligi={1366} />));
    // Eski panel açıktı: Veri topla paneli açık gelir (sade 2 panel, "Ne araştıralım?")
    expect(html).toContain('data-yerlesim="bantli"');
    expect(html).toContain('data-veri-topla-paneli="" data-gorunum="baslangic"');
    expect(html).toMatch(/aria-pressed="true"[^>]*data-veri-topla-dugmesi/);
    for (const eski of ['Deneyle topla', 'data-ornekleyici', 'Deney sonuçları', 'Ölçümler']) expect(html).not.toContain(eski);
    // Tablom aynen (24 satır; bantta son satırın değeri); küme seçici yok
    expect(html).toContain(`${tablo.satirlar.length} satır`);
    expect(html).not.toContain('aria-label="Veri kümesi"');
    // Saçılım bu tabloda çizilemez (tek sayısal değişken): Nokta seçili, "çizilemiyor" iletisi yok
    expect(html).toMatch(/aria-selected="true"[^>]*>Nokta</);
    expect(html).not.toContain('data-sacilim-kullanilamaz');
    expect(html).toContain('id="veri-panel-nokta"');
  });

  it('tablo düzenlemesi: bağlı deneyde çalışmaların sayıları tablodan yeniden hesaplanır; panelin tablo işlemi planı da yazar', () => {
    let d = planiUygula(baslangicDurumu(), hazirSoruUygula('para')!).durum;
    d = toplamaVerisiYaz(d, { calismaBaslat: { no: 1, kayit: 'simulasyon', hedef: 3 }, ekle: ['Tura', 'Yazı', 'Tura'].map((s, i) => ({ kimlik: `p${i}`, hucreler: [s] })), calismaBitir: 1 });
    expect(d.arastirma!.deney.calismalar[0].n).toBe(3);
    const silindi = arastirmaliDuzenle(d, satirSil(d.tablo, 0));
    expect(silindi.tablo.satirlar).toHaveLength(2);
    expect(silindi.arastirma!.deney.calismalar[0].n).toBe(2);
    // Değişiklik yoksa araştırma aynı nesne
    expect(arastirmaliDuzenle(d, d.tablo).arastirma).toBe(d.arastirma);
    // Anket: yeniden adlandırma tabloyu ve planı birlikte yazar
    let m = planiUygula(baslangicDurumu(), hazirSoruUygula('meyve')!).durum;
    m = toplamaVerisiYaz(m, { ekle: [{ kimlik: 'm1', hucreler: anketSatiri(m.arastirma!, 'Elma') }] });
    const yeniTablo = hucreYaz(m.tablo, 0, 0, 'Yeşil elma');
    const yeniPlan = { ...m.arastirma!, anket: { ...m.arastirma!.anket, secenekler: m.arastirma!.anket.secenekler.map((s) => (s === 'Elma' ? 'Yeşil elma' : s)) } };
    const y = tabloIslemiUygula(m, yeniTablo, yeniPlan);
    expect(y.tablo).toBe(yeniTablo);
    expect(y.arastirma!.anket.secenekler[0]).toBe('Yeşil elma');
    // Deney özeti açıkken de Tablom'a yazılır (özet ondan yeniden hesaplanır)
    const ozetteyken = tabloIslemiUygula({ ...d, etkinKume: 'ozet' }, satirSil(d.tablo, 0));
    expect(ozetteyken.tablo.satirlar).toHaveLength(2);
    expect(ozetteyken.etkinKume).toBe('ozet');
  });

  it('Deney özeti notu (salt okunur tablo)', () => {
    expect(OZET_SALT_OKUNUR_NOTU).toBe('Deney özeti kendiliğinden hesaplanır; düzenlemek için Atışlar tablosunu kullanın.');
  });

  it('tuşlar: odak Veri topla panelindeyken genel tuş işleyicileri (açık menünün Escape\'i) tuşu yakalamaz', () => {
    const icinde = { closest: (s: string) => (s === '[data-veri-topla-paneli]' ? {} : null) };
    const disinda = { closest: () => null };
    expect(paneldekiTus(icinde as unknown as EventTarget)).toBe(true);
    expect(paneldekiTus(disinda as unknown as EventTarget)).toBe(false);
    // Belge ya da pencere hedefi (closest yok) ve hedefsiz olay: genel işleyici çalışır
    expect(paneldekiTus({} as EventTarget)).toBe(false);
    expect(paneldekiTus(null)).toBe(false);
  });
});

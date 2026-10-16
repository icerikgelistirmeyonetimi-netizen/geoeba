import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SINIF4 } from '../sinif4';
import { SINIF5 } from '../sinif5';
import { SINIF7 } from '../sinif7';
import { calistir } from '../yorumlayici';
import { programKur } from '../program';
import { aritmetikSorusu, aritmetikYorumDogru, islemSatirlari } from '../AritmetikInceleme';
import { BlokDuzenleyici } from '../BlokDuzenleyici';
import { CozumKarti } from '../CozumKarti';
import { oturumKaydi, oturumaUygunSinif } from '../oturum';
import { bosKayit } from '../kayit';

describe('TEGM Algoritma revizyonları', () => {
  it('sulanan sayacına doğru sayı yazmak gerçek sulama yerine geçmez', () => {
    for (const g of SINIF7.find((u) => u.id === 's7-denklem')!.gorevler) {
      const sayi = g.hedef.degiskenler!.sulanan;
      const sahte = programKur(['ileri', ['ata', 'sulanan', sayi]], 'sahte-');
      const sonuc = calistir(sahte, g.dunya, g.hedef).sonuc;
      expect(sonuc.basarili, g.id).toBe(false);
      expect(sonuc.eksikler).toContainEqual({ tur: 'sulamaSayisi', beklenen: sayi, olan: 0 });
      expect(calistir(g.cozum, g.dunya, g.hedef).sonuc.basarili, g.id).toBe(true);
    }
  });

  it('sayaç görevlerinde toplama bloğu yalnız toplama istenen görevde bulunur', () => {
    const gorevler = SINIF5.find((u) => u.id === 's5-sayac')!.gorevler;
    for (const g of gorevler) expect(g.aracKutusu.some((b) => b.tur === 'eylem' && b.eylem === 'topla'), g.id).toBe(g.id === 's5-sayac-5');
    expect(gorevler[0].yonerge).toContain('Eksik kodu bul ve tamamla');
  });

  it('4. sınıf soruları derece yerine çeyrek dönüşü sayar', () => {
    const u = SINIF4.find((u) => u.id === 's4-aci')!;
    expect(JSON.stringify(u)).not.toMatch(/derece|°/i);
    for (const g of u.gorevler) expect(g.basari(calistir(g.cozum, g.dunya, g.hedef))).not.toMatch(/derece|°/i);
    const kare = u.gorevler.find((g) => g.id === 's4-aci-5')!;
    expect(kare.tahmin!.cevap(calistir(kare.cozum, kare.dunya, kare.hedef))).toBe(4);
  });

  it('5. sınıfta işlem sonucu ve açıklama birlikte doğru olmalıdır', () => {
    for (const g of SINIF5.flatMap((u) => u.gorevler)) {
      const s = aritmetikSorusu(g);
      expect(aritmetikYorumDogru(g, String(s.cevap), s.dogru), g.id).toBe(true);
      expect(aritmetikYorumDogru(g, String(s.cevap), (s.dogru + 1) % 3), g.id).toBe(false);
      expect(aritmetikYorumDogru(g, String(s.cevap + 1), s.dogru), g.id).toBe(false);
    }
    const toplam = SINIF5.flatMap((u) => u.gorevler).find((g) => g.id === 's5-toplam-2')!;
    expect(aritmetikSorusu(toplam)).toMatchObject({ cevap: 2, islem: '2000 ÷ 1000' });
  });

  it('işlem tablosu yalnız yürütülen adımları ve gerçek ara değerleri gösterir', () => {
    const g = SINIF5[0].gorevler[0];
    const iz = calistir(g.cozum, g.dunya, g.hedef);
    expect(islemSatirlari(g.cozum, iz, -1)).toEqual([]);
    const satirlar = islemSatirlari(g.cozum, iz, iz.adimlar.length - 1);
    expect(satirlar.map((s) => s.islem)).toEqual(['0', '0 + 1', '1 + 1', '2 + 1', '3 + 1']);
    expect(satirlar.at(-1)!.sonuc).toBe('sayaç: 4');
  });

  it('uzun araç kutusu kod alanını kapatmaz ve doğru çözüm ayrı okunur', () => {
    const g = SINIF7[0].gorevler[1];
    const html = renderToStaticMarkup(<BlokDuzenleyici program={g.cozum} aracKutusu={g.aracKutusu} onDegis={() => {}} />);
    expect(html).toContain('max-h-[32%]');
    expect(html).toContain('data-program-alani');
    const cozum = renderToStaticMarkup(<CozumKarti program={g.cozum} onKapat={() => {}} />);
    expect(cozum).toContain('Örnek doğru çözüm');
    expect(cozum).not.toContain('data-arac-kutusu');
  });

  it('oturum kademesi kayıtla veya sınıf menüsüyle aşılmaz', () => {
    const ilkokul = bosKayit();
    expect(oturumKaydi(ilkokul, 'ortaokul').unite).toBe('s5-sayac');
    expect(oturumKaydi({ ...ilkokul, unite: 's8-oteleme' }, 'ilkokul').unite).toBe(ilkokul.unite);
    expect(oturumaUygunSinif(5, 'ilkokul')).toBe(false);
    expect(oturumaUygunSinif(4, 'ortaokul')).toBe(false);
    expect(oturumaUygunSinif(8, 'lise')).toBe(false);
  });
});

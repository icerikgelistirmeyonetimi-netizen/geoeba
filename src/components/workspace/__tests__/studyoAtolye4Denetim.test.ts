import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { VARSAYILAN_GORUNUM_AYARLARI } from '@/state/WorkspaceContext';
import { aracGorunurMu, aracSecilebilirMi } from '../kademeDuzeyleri';
import { kapaliAracKaliplari, kapaliAraciOnerir } from '../CommandPanel';

/*
 * Atölye inceleme 4. tur S1 — denetçi düzeltmeleri (studyoAtolye4.test.tsx'in tamamlayıcısı).
 */

const KOK = path.resolve(__dirname, '..');
const oku = (ad: string) => readFileSync(path.join(KOK, ad), 'utf8');

describe('[165] Varsayılana Sıfırla bütün düzlem ayarlarını geri alır', () => {
  it('"Eşit Uzunlukları İşaretle" de varsayılana (açık) döner', () => {
    expect(VARSAYILAN_GORUNUM_AYARLARI.showEqualityMarks).toBe(true);
    const kapatilmis = { showGrid: false, showAxes: false, showEqualityMarks: false, backgroundColor: '#fef9c3' };
    const sifirlanmis = { ...kapatilmis, ...VARSAYILAN_GORUNUM_AYARLARI };
    expect(sifirlanmis).toMatchObject({ showGrid: true, showAxes: true, showEqualityMarks: true, backgroundColor: '#ffffff' });
  });

  it('Ayarlar penceresindeki her düzlem onay kutusunun alanı sıfırlama listesinde', () => {
    const menu = oku('WorkspaceMenuBar.tsx');
    const alanlar = [...menu.matchAll(/onChange=\{\(e\) => setViewport\(\(prev\) => \(\{ \.\.\.prev, (\w+): e\.target\.checked \}\)\)\}/g)].map((m) => m[1]);
    expect(alanlar.length).toBeGreaterThanOrEqual(6);
    for (const alan of alanlar) expect(Object.keys(VARSAYILAN_GORUNUM_AYARLARI), alan).toContain(alan);
  });
});

describe('Ekle > Görsel görsel aracını seçer (proje dosyası seçicisini değil)', () => {
  it('madde Görsel Ekle aracını seçer ve aracın kısayolunu gösterir; araç panelde yoksa madde de yok', () => {
    const menu = oku('WorkspaceMenuBar.tsx');
    const madde = menu.slice(menu.indexOf("{aracMenudeGorunur('image') && ("), menu.indexOf('<span>Görsel</span>') + 40);
    expect(madde).toContain("onSelectTool('image')");
    expect(madde).not.toContain('fileInputRef');
    expect(menu.slice(menu.indexOf('<span>Görsel</span>'), menu.indexOf('<span>Görsel</span>') + 120)).toContain('<AracKisayolu arac="image" />');
    expect(aracGorunurMu('ortaokul', 'image')).toBe(false);
    expect(aracGorunurMu('tum', 'image')).toBe(true);
  });
});

describe('[166] ortaokulda komut kutusu kapalı aracı seçen öneriyi göstermez', () => {
  const ortaokul = kapaliAracKaliplari((arac) => aracSecilebilirMi('ortaokul', arac));

  it('kapalı aracı seçen öneriler süzülür; açık araç ve şekil kurma önerileri kalır', () => {
    expect(kapaliAraciOnerir('Elips aracını seç', ortaokul)).toBe(true);
    expect(kapaliAraciOnerir('elips aracına geç ve eksenleri gizle', ortaokul)).toBe(true);
    expect(kapaliAraciOnerir('Görsel Ekle aracını seç', ortaokul)).toBe(true);
    expect(kapaliAraciOnerir('Nokta aracını seç', ortaokul)).toBe(false);
    expect(kapaliAraciOnerir('Açıölçer aracını seç', ortaokul)).toBe(false);
    expect(kapaliAraciOnerir('Merkezi (0;0) olan elips çiz', ortaokul)).toBe(false);
  });

  it('lise ve "Tüm araçlar"da hiçbir öneri süzülmez', () => {
    for (const duzey of ['tum', 'lise'] as const) {
      const kaliplar = kapaliAracKaliplari((arac) => aracSecilebilirMi(duzey, arac));
      expect(kaliplar, duzey).toEqual([]);
      expect(kapaliAraciOnerir('Elips aracını seç', kaliplar)).toBe(false);
    }
  });
});

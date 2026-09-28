import { describe, expect, it } from 'vitest';
import { ekranKonumu } from '../useOynatici';
import { calistir } from '../yorumlayici';
import { GOREVLER, HASAT_COZUMU, SULAMA_PROGRAMI, gorevSirasi } from '../unite';
import type { Iz } from '../yorumlayici';

const gorev = (id: string) => GOREVLER[gorevSirasi(id)];

describe('oynatıcı: ekran konumu (kod düzenlenince iz yenilenir)', () => {
  it('yüklü iz ekrandaki izse ve konum izin içindeyse konum; değilse başlangıç (−1)', () => {
    const uzun = calistir(HASAT_COZUMU, gorev('hasat-yaz').dunya, gorev('hasat-yaz').hedef);
    const kisa = calistir(SULAMA_PROGRAMI, gorev('sulama-yaz').dunya, gorev('sulama-yaz').hedef);
    expect(uzun.adimlar.length).toBeGreaterThan(kisa.adimlar.length);
    // Aynı iz: konum olduğu gibi (başlangıç dâhil)
    expect(ekranKonumu(uzun, uzun, -1)).toBe(-1);
    expect(ekranKonumu(uzun, uzun, 0)).toBe(0);
    expect(ekranKonumu(uzun, uzun, uzun.adimlar.length - 1)).toBe(uzun.adimlar.length - 1);
    // Program değişti, yeni iz henüz yüklenmedi: eski konum yeni izi aşsa da aşmasa da başlangıç
    expect(ekranKonumu(uzun, kisa, uzun.adimlar.length - 1)).toBe(-1);
    expect(ekranKonumu(uzun, kisa, 0)).toBe(-1);
    expect(ekranKonumu(null, kisa, 3)).toBe(-1);
    // Aynı iz ama konum izin dışında (savunma): başlangıç
    expect(ekranKonumu(kisa, kisa, kisa.adimlar.length)).toBe(-1);
  });

  it('ekranın "önceki durum" okuması yeni izde patlamaz: adım varsa onun durumu, yoksa başlangıç', () => {
    const uzun = calistir(HASAT_COZUMU, gorev('hasat-yaz').dunya, gorev('hasat-yaz').hedef);
    const kisa: Iz = calistir(SULAMA_PROGRAMI, gorev('sulama-yaz').dunya, gorev('sulama-yaz').hedef);
    const eskiKonum = uzun.adimlar.length - 1;
    const izKonumu = ekranKonumu(uzun, kisa, eskiKonum);
    const onceki = izKonumu > 0 ? kisa.adimlar[izKonumu - 1].durum : kisa.baslangic;
    expect(onceki).toBe(kisa.baslangic);
    // Eski (yanlış) okuma: yeni izde o adım yok
    expect(kisa.adimlar[eskiKonum - 1]).toBeUndefined();
  });
});

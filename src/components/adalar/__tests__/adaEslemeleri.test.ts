import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { curriculumData } from '@/curriculum/curriculumData';
import { ADA_SINIFLARI, KADEME_ADALARI, kademeAdasi, sahneSinifKimligi, sinifAdi, sinifNumarasi, temaBilgisi, temaSayisiMetni, uniteAdi } from '../adaEslemeleri';

describe('ada eşlemeleri', () => {
  it('sahne sınıf kimliklerini müfredat numarasına çevirir', () => {
    expect(sinifNumarasi('hazirlik')).toBe(0);
    expect(sinifNumarasi(9)).toBe(9);
    expect(sinifNumarasi('12')).toBe(12);
    expect(sinifNumarasi('13')).toBeNull();
    expect(sinifNumarasi('atolye')).toBeNull();
    expect(sinifNumarasi(-1)).toBeNull();
  });

  it('dönüşüm iki yönlü tutarlıdır', () => {
    for (const siniflar of Object.values(ADA_SINIFLARI)) {
      for (const sinif of siniflar) expect(sinifNumarasi(sahneSinifKimligi(sinif))).toBe(sinif);
    }
    expect(sahneSinifKimligi(0)).toBe('hazirlik');
    expect(sinifAdi(0)).toBe('Hazırlık');
    expect(sinifAdi(7)).toBe('7. Sınıf');
  });

  it('her kademe adasının sınıfları müfredatta o kademede ve ünite içeriyor', () => {
    for (const ada of KADEME_ADALARI) {
      const kademe = curriculumData.levels[ada.id];
      expect(kademe).toBeDefined();
      const mufredatSiniflari = kademe.grades.map((g) => g.gradeNumber).sort((a, b) => a - b);
      expect([...ADA_SINIFLARI[ada.id]].sort((a, b) => a - b)).toEqual(mufredatSiniflari);
      for (const g of kademe.grades) expect(g.themes.length).toBeGreaterThan(0);
    }
  });

  it('büyük harfli ünite adlarını Türkçe başlık düzenine çevirir', () => {
    expect(uniteAdi('SAYILAR VE NİCELİKLER (1)')).toBe('Sayılar ve Nicelikler (1)');
    expect(uniteAdi('GEOMETRİK ŞEKİLLER')).toBe('Geometrik Şekiller');
    expect(uniteAdi('İŞLEMLERDEN CEBİRSEL DÜŞÜNMEYE')).toBe('İşlemlerden Cebirsel Düşünmeye');
    expect(uniteAdi('MAT.5.1 GEOMETRİK ŞEKİLLER')).toBe('Geometrik Şekiller');
    expect(uniteAdi('VERİDEN OLASILIĞA')).toBe('Veriden Olasılığa');
  });

  it('bilinmeyen kademe kimliği için null döner', () => {
    expect(kademeAdasi('lise')?.baslik).toBe('Lise Adası');
    expect(kademeAdasi('ana-sayfa')).toBeNull();
    expect(kademeAdasi(null)).toBeNull();
  });
});

describe('sınıf paneli: tema etiketleri (alan uzmanları, 2. tur)', () => {
  it('sınıfın bölümleri "tema" diye sayılır', () => {
    expect(temaSayisiMetni(6)).toBe('6 tema');
    expect(temaSayisiMetni(1)).toBe('1 tema');
  });

  it('tema satırında konu ve ders saati yerine öğrenme çıktısı sayısı yazılır', () => {
    const tema = curriculumData.levels.ortaokul.grades.find((g) => g.gradeNumber === 7)!.themes[0];
    expect(temaBilgisi(tema)).toBe(`${tema.topics.length} öğrenme çıktısı`);
    expect(temaBilgisi(tema)).not.toMatch(/konu|saat/);
  });

  it('her temada öğrenme çıktısı sayısı konu (MAT.x.y.z) sayısına eşit: yazılan sayı doğru', () => {
    for (const kademe of Object.values(curriculumData.levels)) {
      for (const g of kademe.grades) {
        for (const tema of g.themes) {
          const kodlar = new Set(tema.topics.map((t) => t.code));
          expect(kodlar.size, `${g.gradeNumber} ${tema.code}`).toBe(tema.topics.length);
          expect(tema.outcomeCount, `${g.gradeNumber} ${tema.code}`).toBe(tema.topics.length);
        }
      }
    }
  });

  it('ada ekranında görünen ya da okunan metinlerde "ünite" ve "ders saati" geçmez', () => {
    const kaynak = readFileSync(path.resolve(__dirname, '../AdaEkrani.tsx'), 'utf8');
    // Yorum satırları ekranda görünmez; kod ve JSX satırları denetlenir
    const kod = kaynak
      .split(/\r?\n/)
      .filter((satir) => !/^\s*(\/\/|\/\*|\*|\{\s*\/\*)/.test(satir))
      .join('\n');
    expect(kod).not.toMatch(/[üÜ]nite/);
    expect(kod).not.toMatch(/ders saati/);
    expect(kod).not.toMatch(/\} konu ·/);
  });
});

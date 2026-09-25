// Sahip: yok (P0'da donduruldu; hiçbir paket değiştirmez)
/**
 * Sabit test tabloları: 2026-09-24 itibarıyla veri.ts'teki mac, sicaklik, calisma, gun ve boy örneklerinin birebir
 * kopyası. Grafik, tablo ve durum testleri örnek veriye değil bunlara bağlanır; örnekler değişince bu testler kırılmaz.
 */
import { tabloOlustur, type VeriTablosu } from '../veri';

/** Basketbol: Selma ve Yasemin (aynı ortalama 17; ortalama mutlak sapma 6,4 ve 1,2) */
export function sabitMac(): VeriTablosu {
  return tabloOlustur(
    ['Maç', 'Selma', 'Yasemin'],
    [
      ['1. maç', 18, 17],
      ['2. maç', 5, 15],
      ['3. maç', 32, 19],
      ['4. maç', 17, 16],
      ['5. maç', 13, 18],
    ],
  );
}

/** Bir ilin aylık ortalama sıcaklığı (12 ay, ondalıklı) */
export function sabitSicaklik(): VeriTablosu {
  return tabloOlustur(
    ['Ay', 'Sıcaklık (°C)'],
    [
      ['Ocak', 4.5],
      ['Şubat', 5.5],
      ['Mart', 8.5],
      ['Nisan', 13],
      ['Mayıs', 18],
      ['Haziran', 23],
      ['Temmuz', 26.5],
      ['Ağustos', 26],
      ['Eylül', 22],
      ['Ekim', 16],
      ['Kasım', 10.5],
      ['Aralık', 6],
    ],
  );
}

/** Haftalık çalışma süresi ve matematik puanı; Sınıf (A / B, 10'ar öğrenci) ikinci sütunda kategorik */
export function sabitCalisma(): VeriTablosu {
  return tabloOlustur(
    ['Öğrenci', 'Sınıf', 'Haftalık çalışma (saat)', 'Matematik puanı'],
    [
      ['Aylin', 'A', 2, 55],
      ['Berk', 'A', 3, 61],
      ['Cansu', 'A', 4, 62],
      ['Doruk', 'A', 5, 69],
      ['Esra', 'A', 6, 70],
      ['Furkan', 'A', 6, 75],
      ['Gizem', 'A', 7, 78],
      ['Hasan', 'A', 8, 81],
      ['İpek', 'A', 9, 86],
      ['Kağan', 'A', 10, 90],
      ['Lara', 'B', 1, 47],
      ['Mustafa', 'B', 2, 51],
      ['Nil', 'B', 3, 58],
      ['Orhan', 'B', 4, 56],
      ['Pamir', 'B', 5, 63],
      ['Rana', 'B', 6, 64],
      ['Serkan', 'B', 7, 70],
      ['Tuğçe', 'B', 8, 72],
      ['Ufuk', 'B', 9, 76],
      ['Yeliz', 'B', 10, 82],
    ],
    [undefined, 'etiket'],
  );
}

/** Bir günün saatleri (toplam 24 saat, 6 etkinlik) */
export function sabitGun(): VeriTablosu {
  return tabloOlustur(
    ['Etkinlik', 'Süre (saat)'],
    [
      ['Uyku', 9],
      ['Okul', 7],
      ['Ders çalışma', 2],
      ['Oyun', 2.5],
      ['Yemek', 1.5],
      ['Diğer', 2],
    ],
  );
}

/** Sınıfın boy uzunlukları (24 öğrenci, 145–159 cm) */
export function sabitBoy(): VeriTablosu {
  return tabloOlustur(
    ['Öğrenci', 'Boy (cm)'],
    [
      ['Ayşe', 152],
      ['Mehmet', 158],
      ['Zeynep', 149],
      ['Ali', 151],
      ['Elif', 155],
      ['Can', 146],
      ['Defne', 152],
      ['Emre', 159],
      ['Selin', 150],
      ['Kerem', 153],
      ['Nehir', 148],
      ['Yusuf', 154],
      ['Ece', 152],
      ['Burak', 145],
      ['Lale', 151],
      ['Mert', 156],
      ['Derya', 153],
      ['Onur', 150],
      ['İrem', 155],
      ['Tolga', 149],
      ['Melis', 154],
      ['Arda', 152],
      ['Duru', 153],
      ['Kaan', 151],
    ],
  );
}

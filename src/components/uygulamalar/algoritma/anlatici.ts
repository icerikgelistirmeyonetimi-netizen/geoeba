/**
 * Algoritma Laboratuvarı — adım anlatıcısı: yorumlayıcının her adımını çocuğun anlayacağı bir
 * cümleye çevirir (sahnenin altındaki altyazı ve ekran okuyucu için canlı bölge).
 */
import type { DunyaDurumu, DunyaTanimi } from './dunya';
import { SULAMA_LITRE, bitkiSirasi, hedefAdi, hedefteMi, hucreNo, izgara, koordinatlar } from './dunya';
import { hataIletisi, noktaMetni, ozneli } from './degerlendirme';
import type { Blok, Program } from './program';
import { blokBul, govdeliMi, karsilastirmaMetni, karsilastirmaMi, sayiMetni } from './program';
import type { Adim } from './yorumlayici';

const SORU: Record<string, string> = {
  cikistayim: 'Çıkışta mıyım',
  toprakKuru: 'Toprak kuru mu',
  domatesKirmizi: 'Domates kırmızı mı',
  yaprakSari: 'Yaprak sarı mı',
};

function yer(x: number, n: number, bitkiAdi: string): string {
  if (x === 0) return 'başlangıçta';
  if (x === n + 1) return 'çıkışta';
  return `${x}. ${bitkiAdi}${bitkiAdi === 'saksı' ? 'nın' : 'nin'} önünde`;
}

const buyukHarf = (s: string) => s.charAt(0).toLocaleUpperCase('tr-TR') + s.slice(1);

export function adimAnlatimi(a: Adim, onceki: DunyaDurumu, program: Program, dunya: DunyaTanimi, bitkiAdi: 'saksı' | 'bitki'): string {
  return ozneli(adimAnlatimiHam(a, onceki, program, dunya, bitkiAdi), dunya);
}

function adimAnlatimiHam(a: Adim, onceki: DunyaDurumu, program: Program, dunya: DunyaTanimi, bitkiAdi: 'saksı' | 'bitki'): string {
  const n = dunya.bitkiler.length;
  if (a.hata) return hataIletisi(a.hata, dunya, bitkiAdi);
  const blok = blokBul(program, a.blokId) as Blok | null;
  const g = izgara(dunya);
  switch (a.tur) {
    case 'tur': {
      if (blok && blok.tur === 'tekrarlaKez') return `${a.turNo}. tur (toplam ${a.toplamTur ?? blok.kez}).`;
      if (a.kosul && karsilastirmaMi(a.kosul) && a.degerler) return `${a.turNo}. tur: ${karsilastirmaMetni(a.kosul)} değil (${sayiMetni(a.degerler[0])}), devam.`;
      return `${a.turNo}. tur: Robot çıkışta değil, devam ediyor.`;
    }
    case 'donguBitti':
      if (a.kosul && karsilastirmaMi(a.kosul)) return `${karsilastirmaMetni(a.kosul)} oldu; tekrar bitti.`;
      return 'Robot çıkışa vardı; tekrar bitti.';
    case 'kosul': {
      const atla = blok && govdeliMi(blok) && !a.sonuc ? (blok.tur === 'eger' && blok.degilse ? ' Değilse kolu çalışır.' : ' İçteki bloklar atlanır.') : '';
      if (a.kosul && karsilastirmaMi(a.kosul) && a.degerler) {
        return `${karsilastirmaMetni(a.kosul)} mi? ${sayiMetni(a.degerler[0])} ile ${sayiMetni(a.degerler[1])}: ${a.sonuc ? 'Evet.' : 'Hayır.'}${atla}`;
      }
      return `Robot baktı: ${SORU[(a.kosul as string) ?? ''] ?? 'Koşul doğru mu'}? ${a.sonuc ? 'Evet.' : 'Hayır.'}${atla}`;
    }
    case 'atama':
      return `${a.degisken} şimdi ${sayiMetni(a.deger ?? 0)}.`;
    case 'cagri':
      return `${a.komut} komutu çalışıyor.`;
    case 'eylem': {
      const d = a.durum;
      const sira = bitkiSirasi(onceki) + 1;
      switch (a.eylem) {
        case 'ileri':
          if (g.tur === 'insaat') return 'Dron bir kare ilerledi.';
          if (g.tur === 'cizim') {
            if (dunya.koordinat) return `Robot ${noktaMetni(koordinatlar(g, d.x, d.y))} noktasına geldi.`;
            return d.kalem ? 'Robot bir birim çizgi çekti.' : 'Robot çizmeden bir birim ilerledi.';
          }
          if (g.bahce) {
            const ad = hedefAdi(dunya).yalin;
            if (!dunya.adimIzi) return 'Robot bir kare ilerledi.';
            return `Robot ${d.izler.length}. adımı attı.${hedefteMi(d) ? ` ${buyukHarf(ad)} burada!` : ''}`;
          }
          return `Robot bir adım ilerledi; şimdi ${yer(d.x, n, bitkiAdi)}.`;
        case 'sagaDon':
          return g.tur === 'insaat' ? 'Dron sağa döndü.' : 'Robot sağa döndü.';
        case 'solaDon':
          return g.tur === 'insaat' ? 'Dron sola döndü.' : 'Robot sola döndü.';
        case 'sula':
          return g.bahce ? `Robot ${sira}. saksıyı suladı.` : `Robot ${sira}. saksıyı suladı (${SULAMA_LITRE} litre). Depoda ${d.depo} litre kaldı.`;
        case 'topla':
          return `Robot ${sira}. bitkideki olgun domatesi topladı. Sepette ${d.sepet} domates var.`;
        case 'gubreVer':
          return `Robot ${sira}. saksıdaki sararmış fideye gübre verdi.`;
        case 'boya':
          return `Robot kareyi boyadı (${d.boyali.length}. kare).`;
        case 'ek':
          return `Robot tohum ekti (${d.boyali.length}. kare).`;
        case 'koy': {
          const h = d.kupler[hucreNo(g, d.x, d.y)] ?? 0;
          return h > 1 ? `Dron bir küp koydu; bu kulede ${h} küp var.` : 'Dron bir küp koydu.';
        }
        case 'isaretle':
          return `Robot ${noktaMetni(koordinatlar(g, d.x, d.y))} noktasını işaretledi.`;
        case 'kalemKaldir':
          return 'Robot kalemi kaldırdı; artık çizmeden gider.';
        case 'kalemIndir':
          return 'Robot kalemi indirdi; artık çizerek gider.';
        default:
          return '';
      }
    }
  }
  return '';
}

/** Robot hazırken tuvalin altındaki cümle; 1–2. sınıfta (kart) "Kartları diz" */
export function baslangicAnlatimi(dunya: DunyaTanimi, kart = !!dunya.adimIzi): string {
  const n = dunya.bitkiler.length;
  const g = izgara(dunya);
  const kur = kart ? 'Kartları diz, sonra Çalıştır düğmesine bas.' : 'Kodu kur, sonra Çalıştır düğmesine bas.';
  if (g.tur === 'insaat') return `Dron hazır. ${kur}`;
  if (g.tur === 'cizim') return dunya.koordinat ? `Robot ${noktaMetni(koordinatlar(g, g.bas.x, g.bas.y))} noktasında. ${kur}` : `Çizgi robotu hazır. ${kur}`;
  if (g.bahce) return `Robot hazır. ${kur}`;
  return `Robot başlangıçta. Sırada ${n} ${dunya.bitkiler[0]?.tur === 'domates' ? 'domates fidesi' : 'saksı'} var.`;
}

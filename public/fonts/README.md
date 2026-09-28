# Düzenlenmiş yazı tipleri

Bu klasördeki dosyalar Google Fonts'taki **Manrope** ve **Fraunces** ailelerinin projeye özel
kesimleridir. Tek değişiklik: küçük **"a"** harfi (ve aksanlı türevleri â à á ä ã å ā ă ą) tek
katlı olarak fontun kendi gliflerinden yeniden çizildi.

- **Fraunces**: `a` = `q` glifinin üst kısmı (çanak + sağa serifli gövde tepesi) ile `d` glifinin
  gövde altı (ayak serifi). İlerleme genişliği `q` ile aynı. Kesimler: wght 500 ve 600, opsz 32,
  SOFT 0, WONK 1 (Google'ın sunduğu varsayılan görünüm).
- **Manrope**: `a` = `q` glifinin taban çizgisinde kesilmiş hâli; özgün `a` ilerleme genişliğine
  sığdırıldı (gövde kalınlığı korunur), bu yüzden `src/math/manropeTablosu.ts` ölçüleri geçerlidir.
  Kesimler: wght 500, 600, 700, 800 (uygulamanın önceden Google Fonts'tan yüklediği ağırlıklar).
- Kiril blokları çıkarıldı; Latin, Latin-ek, Yunanca ve simgeler, tüm OpenType özellikleri korundu.

Üretim betiği: `scripts/yazi-tipi-tek-katli-a.py` (fontTools + skia-pathops + brotli);
adımları: değişken fontu `instancer` ile sabitle, `q`/`d` gliflerini
pathops ile kes/birleştir, `a` glifini değiştir, aksanlı a'ları yeniden kur, woff2 olarak kaydet.

## Lisans

Her iki aile de SIL Open Font License 1.1 ile dağıtılır ve **Reserved Font Name** bildirmez;
değiştirme ve gömme serbesttir. Değiştirilmiş kesimler de OFL 1.1 altındadır; iç ad tablosunda
aile adı "Manrope GeoEBA" / "Fraunces GeoEBA" olarak işaretlendi. Lisans metinleri:
`OFL-Manrope.txt`, `OFL-Fraunces.txt`.

- Copyright 2018 The Manrope Project Authors (https://github.com/googlefonts/manrope)
- Copyright 2018 The Fraunces Project Authors (https://github.com/undercasetype/Fraunces)

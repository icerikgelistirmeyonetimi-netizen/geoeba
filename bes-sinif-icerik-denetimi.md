# 5. sınıf kazanım içerik sayfaları — tasarım denetimi (2026-10-26)

## Özet

- **Kapsam:** `public/kazanim-icerikleri/MAT.5.*-a.html` — 23 sayfa, her boyutta 282 ekran (kapak, 236 alt sayfa, tebrik).
- **Ada paneli bağlantısı doğru:** 5. sınıfın 7 temasındaki 14 konu, 23 sayfanın hepsine bağlı; boş ya da bağsız konu yok.
- **Düzeltildi:** 19 sayfanın 52 alt sayfasında sağ paneldeki taşma (seçenekler, kartlar, düğmeler panelin altında
  gizli kalıyordu; 3–140 px). Son taramada iki boyutta da (1280×720 ve panelin telefonda kullandığı 960×540) hiçbir
  alt sayfada taşma yok.
- **Hizalama düzeltildi:** 20 sayfada panel genişliğine yayılan eylem düğmelerinin yazısı sola yaslıydı, ortalandı;
  MAT.5.1.4'te kartın içeriği yarısı ortalı, yarısı sola dayalıydı, sola hizalandı.
- **Metin değişmedi:** yazılar, yazı boyutları, sorular, betikler ve etkinlikler bayt düzeyinde aynı. Eklenen tek şey her
  sayfanın sonundaki küçük bir stil bloğu (aşağıda nasıl doğrulandığı var).
- **İçerik (dil, yazım, matematik doğruluğu) denetimi yapılmadı:** kullanıcı «dil ve hata kontrolüne gerek yok» dedi.
- Commit edilmedi.

## Yöntem

- Her sayfa Playwright (Chromium) ile açıldı. Kapak, her alt sayfa (`SABLON_GEC(n)`) ve tebrik ekranı üç boyutta
  ölçüldü ve ekran görüntüsü alındı:
  - **1280×720:** masaüstü.
  - **960×540:** ada paneli sayfayı en az bu boyutta çizip küçültüyor. Telefonda dikey tutuşta iframe'in 960×542'de
    çizilip 0,325 ölçekle gösterildiği gerçek panelde ölçüldü, yani telefonda görülen budur.
  - **390×844 mobil:** sayfanın telefonda doğrudan (panelsiz) açılması.
- Ölçülenler: kırpılan ya da kaydırılan kutular, üst üste binen ve örtülen yazılar, sahne dışına taşan yazılar, ekran
  görüntüsündeki zemine göre kontrast, kırık görseller, konsol ve ağ hataları, yatay kaydırma, karışık hiza.
- Koyu tema: açık ve koyu sistem temasında aynı ekranların piksel farkı alındı, fark yok. Sayfalarda koyu tema kuralı
  yok; her iki temada da aynı açık tasarımla açılıyorlar, görünmez olan öğe yok.
- Konsol ve ağ hatası: 23 sayfada 0. Kırık görsel: 0.

## Ada paneli bağlantısı

`liste.json` ve `eslesme-raporu.json` (21.10.2026 aktarımı) ile `scripts/veri/cerceve-kazanim-eslemesi.json` karşılaştırıldı.
Uygulamada da açıldı: Ortaokul Adası → 5. Sınıf, 7 tema, toplam 23 içerik. «Dikdörtgenin Çevre Uzunluğu ve Alanı» 4 sekmeyle
(MAT.5.4.1–5.4.4) açılıyor ve iframe doğru sayfayı yüklüyor.

| Konu (proje kodu) | Sayfa(lar) |
|---|---|
| MAT.5.1.1 Temel Geometrik Çizimler ve İnşalar | 5.3.1, 5.3.2 |
| MAT.5.1.2 Açı Ölçme | 5.3.3, 5.3.4 |
| MAT.5.1.3 Çokgenler ve Çember | 5.3.5, 5.3.6, 5.3.7 |
| MAT.5.2.1 Çok Basamaklı Sayıları Okuma ve Yazma | 5.1.1 |
| MAT.5.2.3 Doğal Sayılarla Dört İşlem İçeren Problem Çözme | 5.1.2 |
| MAT.5.3.1 Dikdörtgenin Çevre Uzunluğu ve Alanı | 5.4.1, 5.4.2, 5.4.3, 5.4.4 |
| MAT.5.4.1 Kesirlerin Farklı Gösterimleri | 5.1.3 |
| MAT.5.4.2 Kesirlerin Karşılaştırılması | 5.1.4 |
| MAT.5.5.1 Kategorik Veri Dağılımları | 5.5.1, 5.5.2 |
| MAT.5.6.1 Eşitliğin Korunumu | 5.2.1 |
| MAT.5.6.3 İşlem Önceliği | 5.2.2 |
| MAT.5.6.4 Örüntüler | 5.2.3 |
| MAT.5.6.5 Temel Aritmetik İşlemler ve Algoritma | 5.2.4 |
| MAT.5.7.1 Öznel Olasılık | 5.6.1, 5.6.2 |

Proje kodları MEB kodlarından farklı sıralanıyor. Eşleşme çerçeve tablosuyla yapılıyor ve tutarlı.

## Düzeltmeler nasıl yapıldı

- Her sayfaya `</main>`dan hemen sonra tek bir `<style id="gorsel-duzen-5">` bloğu eklendi (0,35–2,6 KB).
- Blok yalnız **boşluk, dolgu, aralık ve en az yükseklik** değiştiriyor; gereken yerde **sütun oranı** ve **hiza** da.
  Yazı boyutu kuralları (`yazi-standardi`) olduğu gibi kaldı.
- Sayfanın kendi sınıfları için kurallar `@layer sayfa { … }` içinde, özgün kuralla aynı seçiciyle yazıldı. Böylece seçili,
  doğru ve yanlış durum kuralları eskisi gibi çalışıyor.
- Şablonun katmansız sınıfları (`.kart`, `.kavram-kart`, `.parca-btn`, `.buton`) sayfanın kendi dolgu ve aralık değerlerini
  eziyordu. Bunlar için katmansız `#cerceve #sayfa-N …` kuralı kullanıldı.
- Sütun oranı yalnız sahnesi oranını koruyan SVG (`preserveAspectRatio="xMidYMid meet"`) ya da boyutunu kendisi okuyan 3B
  olan alt sayfalarda değiştirildi. Sahne yalnız biraz küçülüyor, bozulmuyor.
- Etkisiz kural bırakılmadı: her kural tek tek kaldırılıp etkisi ölçüldü, şablonun ezdiği kurallar silindi.
- **Kaynak da güncellendi:** aynı blok üretim kaynağına da yazıldı (`C:\Semih TiRYAKi\icerik_gelistirme_yeni - Kopya\cikti\`).
  Sonraki `npm run kazanim:aktar` düzeltmeleri silmez. Aktarım dönüşümü kaynağa uygulandığında 23 kopyanın 23'ü de birebir
  aynı çıkıyor.
- **Metin değişmedi:** değişiklik öncesi yedekle karşılaştırıldı. Blok çıkarılınca 46 dosyanın (23 kopya + 23 kaynak) her
  baytı eskisiyle aynı.

## Sayfa sayfa

«Taşma» kontrol paneli gövdesinin kaydırma payıdır: o kadar piksel içerik görünmüyordu. 1280×720'de ölçüldü. Hepsi
düzeltmeden sonra 0. «Düğme hizası», panel genişliğindeki eylem düğmelerinde sola yaslı yazının ortalanmasıdır.

### MAT.5.1.1 — Çok basamaklı sayılar (15 alt sayfa)
**Düzeltilen**
- s2 (5 px): son yörünge satırının alt kenarı kırpılıyordu. Satır aralığı daraltıldı.
- s3 (40 px): «Birler Bölüğü» satırı panelin altında kalıyordu. Grup kutusu, küp kartı ve satır dolguları daraltıldı.
- s8 (24 px): üçüncü bölük seçeneği yarım görünüyordu. Seçenek dolguları daraltıldı.
- s13 (26 px): D şıkkı hiç görünmüyordu. Soru kartı dolgusu ve şık yüksekliği azaltıldı.

### MAT.5.1.2 — Dört işlem problemleri (12 alt sayfa)
**Düzeltilen**
- s1 (6 px) ve s11 (8 px): son kart satırları kırpılıyordu.
- s4 (90 px): kart havuzunun son satırı görünmüyordu. Sütun 7/5 → 6,4/5,6 yapıldı, kart ve yuva aralıkları daraltıldı.
- s5 (72 px): «Tahmin Değeri» satırı görünmüyordu. Aynı sütun ayarı yapıldı, A/B strateji düğmeleri alt alta yerine yan yana.
- s7 (59 px): kamyonet kasası sayacı ve çubuğu görünmüyordu. Kart ve sayaç dolguları daraltıldı.
- Düğme hizası: s2, s3, s5.

### MAT.5.1.3 — Kesirlerin gösterimleri (11 alt sayfa)
**Düzeltilen**
- s1 (108 px): tepsi durum tablosu (Tepsi 1–2, Tam Sayılı, Bileşik Kesir) görünmüyordu. Gruplar arasında hem `gap` hem
  `margin` vardı, çift boşluk kaldırıldı ve dolgular daraltıldı.
- s5 (61 px): «Model Durumu» ve «Tümünü Temizleyelim» görünmüyordu.
- s10 (69 px): üçüncü model kartının onay düğmesi görünmüyordu. Model adı ve gerekçe rozeti tek satıra alındı.
- Düğme hizası: s4, s5.

### MAT.5.1.4 — Kesirlerin karşılaştırılması (9 alt sayfa)
**Düzeltilen**
- s1 (70 px): «Bileşik Kesir» kartının alt yarısı görünmüyordu. Rozet ve kart dolguları daraltıldı.
- s1 hiza (kullanıcının gösterdiği sorun): şablonun `.kavram-kart` ortalaması içerik bloğunu kartın ortasına itiyordu.
  Rozet ortada, kesir ve açıklama solda görünüyordu. Kart içeriği sola hizalandı.
- Düğme hizası: s4, s8.

### MAT.5.2.1 — Eşitliğin korunumu (17 alt sayfa)
**Düzeltilen**
- s7 (62 px): sonuç kartları görünmüyordu, rozetler iki satıra kırılıyordu. Sütun 8/4 → 7/5 yapıldı (3B sahne boyutunu
  kendisi okuyor).
- s11 (9 px): «Dağılma Özelliği» notu kırpılıyordu.
- s12 (18 px): kural kartlarının ikinci satırı yarım görünüyordu.
- s16 (46 px): gerekçe kartları görünmüyordu. «35 × (7 + 3)» düğmesi iki satıra kırılıyordu; iki senaryo düğmesi eşit
  genişlikte ve tek satır yapıldı.
- Düğme hizası: s1, s7, s9, s14.

### MAT.5.2.2 — İşlem önceliği (11 alt sayfa)
**Düzeltilen**
- s6 (5 px) ve s8 (9 px): son kartlar kırpılıyordu.
- s9 (48 px): C ve D şıkları görünmüyordu.
- Düğme hizası: s1.

### MAT.5.2.3 — Örüntüler (13 alt sayfa)
**Düzeltilen**
- s4 (33 px, ayrıca sağdan 6 px): kural özeti formülü alttan ve sağdan kırpılıyordu.
- s6 (66 px): C ve D şıkları görünmüyordu.
- s8 (42 px): «Gerekçe Yuvası» görünmüyordu.
- s9 (3 px): son yuvanın kenarı kırpılıyordu.
- Düğme hizası: s7, s9, s10.

### MAT.5.2.4 — Algoritmalar (10 alt sayfa)
**Düzeltilen**
- Taşma yok.
- Düğme hizası: s1 («2 Küp Gönder», «Onaylayalım»).

### MAT.5.3.1 — Geometrik çizimler: araçlar (12 alt sayfa)
**Düzeltilen**
- s5 (32 px): «Cetveli Hizala / Noktaları Birleştir» düğmeleri yarım görünüyordu.
- Düğme hizası: s8.

### MAT.5.3.2 — Geometrik çizimler: yansıtma (9 alt sayfa)
**Düzeltilen**
- s6 (32 px): «Yeni duvarın parçaları» seçenekleri görünmüyordu.
- s7 (96 px): «Eş uzunluktaki doğru parçaları» kutusu görünmüyordu. Sütun 8/4 → 7,4/4,6 yapıldı, başlık tek satıra indi.
- Düğme hizası: s3.

### MAT.5.3.3 — Açı ölçme (7 alt sayfa)
**Düzeltilen**
- Taşma yok.
- Düğme hizası: s1.

### MAT.5.3.4 — Doğruların oluşturduğu açılar (11 alt sayfa)
**Düzeltilen**
- s6 (16 px): envanter tablosunun son satırı kırpılıyordu.
- s10 (28 px): onay alanı görünmüyordu.
- Düğme hizası: s3, s4, s7.

### MAT.5.3.5 — Çokgenler (6 alt sayfa)
**Düzeltilen**
- s2 (33 px): sayaç kutusunun alt satırı görünmüyordu.
- s3 (83 px): kenar uzunlukları ve özellik kutusu görünmüyordu. Sütun 8/4 → 7,2/4,8 yapıldı.
- s5 (15–54 px): kavram kartları her açılışta karışık sıralanıyor, sıralamaya göre 1–2 satırı görünmüyordu. Sütun
  7/5 → 6,4/5,6 yapıldı; üç ayrı açılışta en kötü sıralamada da sığıyor.
- Düğme hizası: s5.

### MAT.5.3.6 — Çokgenlerin özellikleri (12 alt sayfa)
**Düzeltilen**
- s3 (42 px): raptiye kutusu yarım görünüyordu.
- s10 (45 px): «Bu şekil düzgün çokgen mi?» şıkları görünmüyordu.
- Düğme hizası: s3.

### MAT.5.3.7 — Çember (10 alt sayfa)
**Düzeltilen**
- s1 (14 px): tahmin kartlarının son satırı kırpılıyordu.
- s2 (32 px): «Hedeflenen Şekil» satırı görünmüyordu.
- s3 (31 px): C ve D şıkları yarım görünüyordu.

### MAT.5.4.1 — Dikdörtgenin çevresi (6 alt sayfa)
**Düzeltilen**
- s5 (140 px, en büyük taşma): E şıkkı ve durum kartı görünmüyordu, eylem düğmeleri iki satıra kırılıyordu. Sütun
  8/4 → 7/5 yapıldı ve şık yüksekliği azaltıldı.
- Düğme hizası: s2.

### MAT.5.4.2 — Dikdörtgenin alanı: birim kare (8 alt sayfa)
**Düzeltilen**
- s3 (12 px): toplam alan sayacının kenarı kırpılıyordu.
- Düğme hizası: s1, s2, s4.

### MAT.5.4.3 — Alan ve çevre ilişkisi (7 alt sayfa)
**Düzeltilen**
- Sorun yok, dosyaya dokunulmadı.

### MAT.5.4.4 — Çevre ve alan problemleri (11 alt sayfa)
**Düzeltilen**
- s3 (82 px): kare sayısı ve durum kutusu görünmüyordu. Sütun 8/4 → 7/5 yapıldı.
- s4 (89 px): kart havuzunun alt satırları görünmüyordu. Sütun 7/5 → 6,4/5,6 yapıldı, başlık tek satıra indi.
- s10 (48 px): üçüncü sera kartı görünmüyordu. Kartlar `.kavram-kart` olduğu için şablonun 12 px iç aralığı sayfanın 3 px'ini
  eziyordu; düzeltildi.
- Düğme hizası: s8.

### MAT.5.5.1 — Kategorik veri (17 alt sayfa)
**Düzeltilen**
- s1 (70 px): son soru kartı görünmüyordu.
- s3 (49 px): son sözcük blokları görünmüyordu.
- s7 (54 px): sıklık tablosunun son satırları ve «Toplam» görünmüyordu.
- s8 (46 px): D ve E şıkları görünmüyordu.
- s10 (26 px): frekans tablosunun son satırı kırpılıyordu.
- s11 (6 px): ikinci hedef kartının kenarı kırpılıyordu.
- s12 (15 px): son sonuç kartı yarım görünüyordu.
- s13 (79 px): C ve D şıkları görünmüyordu.
- s7 ve s13'te sütun 7/5 → 6,4/5,6 yapıldı.
- Düğme hizası: s9, s10.

### MAT.5.5.2 — Başkalarının verisi (7 alt sayfa)
**Düzeltilen**
- Taşma yok.
- Düğme hizası: s3.

### MAT.5.6.1 — Olasılık 0–1 (9 alt sayfa)
**Düzeltilen**
- s2 (58 px): üçüncü çıktı kutusu görünmüyordu.
- Düğme hizası: s4.

### MAT.5.6.2 — Az/çok olasılıklı (6 alt sayfa)
**Düzeltilen**
- s5 (46 px): olasılık çubuğunun ibresi ve ölçek etiketleri görünmüyordu.
- Düğme hizası: s4.

Değerlendirme (son) alt sayfalarının hiçbirinde taşma yoktu. Bu alt sayfalara dokunulmadı.

## Düzeltilmeyen, yalnız raporlanan tasarım bulguları

1. **Kapaktaki «Süreç Bileşenleri» listesi kaydırmalı.** Bu şablonun tasarımı: liste kendi kaydırma çubuğu ve aşağı okuyla
   geliyor. Panel taşması kapsamına alınmadı. Görünmeyen kısım (1280×720 / 960×540):

   | Sayfa | Görünmeyen kısım |
   |---|---|
   | 5.1.2 | 380 / 323 px |
   | 5.4.4 | 383 / 326 px |
   | 5.5.1 | 340 / 288 px |
   | 5.2.3 | 239 / 164 px |
   | 5.2.1 | 191 / 122 px |
   | 5.1.3 | 118 / 113 px |
   | 5.3.7 | 108 / 103 px |
   | 5.3.4 | 80 / 81 px |
   | 5.1.4 | 76 / 79 px |
   | 5.1.1 | 10 / 26 px |
   | 5.5.2 | 0 / 16 px |

   Kapak düzeninde «Öğrenme Çıktısı» kutusu çoğunlukla boş kalırken süreç kutusu taşıyor. Şablon düzeyinde ele alınırsa
   bütün sınıflar düzelir.
2. **Sayfa telefonda doğrudan (panelsiz) dikey açılırsa sahne iki yandan kırpılıyor.** Bu bütün sınıfların şablonundaki bir
   sorun. 1280 px'lik `#cerceve` dönüşümden önceki genişliğiyle mobil düzen genişliğini 390'dan 613 px'e çıkarıyor. Ada
   panelinde ve tam ekranda görülmüyor, çünkü iframe en az 960×540 çiziliyor. Yalnız sayfa adresi telefonda doğrudan
   açılırsa (ör. CDN bağlantısı paylaşılırsa) görülüyor. Denenen basit CSS'ler (`overflow:clip`, `contain`,
   `position:fixed`) çözmedi; şablonun ölçek betiğinde ele alınmalı.
3. **Kontrast (değiştirilmedi, kullanıcı yalnız taşma düzeltilsin dedi):**
   - Şablonun altın vurgu rengi `--vurgu: #dfa800` bazı sayfalarda beyaz zeminde yazı rengi olarak kullanılmış (≈2,1:1).
     Örnekler: 5.1.1 s1 nüfus sayıları («5 803 614», «85 372 377»), 5.1.3 s5 «%45 / 0,45», 5.2.2 s5 «1 / 2» ve s10 değeri,
     5.2.3 s7 «4 Katının / 1 Fazlası» (açık altın zeminde 1,8:1) ve s11 değerleri, 5.3.4 s5 «Üç Paralel». Şablonda daha koyu
     `--vurgu-koyu: #b28600` var.
   - Şablon rozetleri: «KEŞİF / UYGULAMA…» etiketi 2,8:1. Kapaktaki «Matematik» rozeti ile a/b/c harf rozetleri (beyaz üstüne
     #ff6f4d) 2,8:1. Bütün sınıflarda aynı.
   - 5.2.2 s8: kavanoz içindeki «Beş Kalem / Üç Defter» etiketleri açık mavi zeminde turuncu (2,5:1) ve kavanozun kenar
     çizgisine biniyor.
4. **Şablon sınıfları sayfa stillerini sessizce eziyor.** `.kart`, `.kavram-kart`, `.parca-btn` ve `.buton` katmansız
   tanımlı. Sayfaların `@layer sayfa` içindeki dolgu, aralık ve en az yükseklik değerleri bu sınıfları taşıyan öğelerde hiç
   uygulanmıyor. Örnek: kart içi aralık 3 px yazılmış, 12 px görünüyor; `.kavram-kart` sütuna çevrildiğinde içerik ortalanıyor.
   5. sınıfta görünür soruna yol açtığı yerler düzeltildi. Kök neden şablonda, bütün sınıfları etkiliyor.
5. **5.3.5 s3 sahnesi:** doğruların uçlarındaki «d1, d2, d3» etiketleri sahne kutusunun dışında kalıyor, görünmüyor.
   Bu düzeltmeden önce de böyleydi; sahne çiziminden kaynaklanıyor.
6. **Ölçümler etkinliklerin başlangıç durumunda yapıldı.** Bazı panellerde etkileşimden sonra yeni satır beliriyor
   (ör. 5.2.1 s7 özet satırı, 5.1.1 s3 «3 Basamak» rozetleri). Düzeltilen panellerin çoğunda bunlar için yer kaldı, ama her
   etkinlik baştan sona oynatılarak denenmedi.

## İçerik sorunları

İçerik (dil, yazım, matematiksel doğruluk, kazanım uyumu) denetimi kullanıcının isteğiyle yapılmadı. Metinlere dokunulmadı.
TDK yazım denetimi ayrı bir oturumda yürüyor.

## Notlar

- Değişen dosyalar: `public/kazanim-icerikleri/` altında 22 sayfa (MAT.5.4.3 hariç; bu klasör git'te izleniyor) ve
  üretim kaynağındaki aynı 22 dosya. `MAT.6.1.7` dosyalarına dokunulmadı.
- `out/kazanim-icerikleri/` (izlenen statik derleme) eski hâlinde. Bir sonraki `next build` ile güncellenir.
- Diğer sınıfların panel taşmaları ayrı bir oturumda aynı yöntemle ele alınıyor. Araçlar ve devir notu ortak not klasöründe
  (`bes-sinif-araclar/NOT.md`).

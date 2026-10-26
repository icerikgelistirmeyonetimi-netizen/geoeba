# Kazanım İçerikleri Yazım Denetimi Raporu

**Tarih:** 25 Ekim 2026 · **Kapsam:** `public/kazanim-icerikleri/*.html` (309 içerik sayfası) ve bu sayfaların yüklediği `ortak/*.js` şablon betikleri · **Dayanak:** [tdk-yazim-kurallari.md](tdk-yazim-kurallari.md) (TDK *Yazım Kılavuzu* kural sayfaları ve Güncel Türkçe Sözlük; kural kimlikleri bu dosyadaki `[XX-n]` kimlikleridir)

> **Düzeltme durumu (25 Ekim 2026):** Bu rapor denetim anındaki hâli gösterir. Onayınızla, bağlamı doğrulanan bulgular 81 sayfada düzeltildi; binlik ayırıcı ve *birim kare / birim küp* kararınız gereği olduğu gibi bırakıldı. Neyin düzeltildiği, neyin neden düzeltilmediği: [yazim-duzeltmeleri.md](yazim-duzeltmeleri.md).
>
> Bütün bulguların tek tek listesi (filtrelenebilir) yanındaki [yazim-denetimi-bulgular.csv](yazim-denetimi-bulgular.csv) dosyasındadır (Excel'de açılır, ayraç `;`).

**Güven düzeyi:** **kesin** = TDK kuralına ya da sözlük maddesine açıkça aykırı; **olası** = bağlama, anlama ya da üslup kararına bağlı, gözle bakılmalı.

**Dosya adı ile kapak kodu:** 55 sayfanın dosya adı içerikteki kazanım koduyla çapraz düşüyor (ör. `MAT.6.1.7-a.html` içinde MAT.6.1.8 var). Tablolarda her bulgu için dosya adı ve kapaktaki kod birlikte verildi; çapraz olanlar ⚠ ile işaretli.

## Özet

| Kural türü | Kesin | Olası | Etkilenen sayfa |
|---|---:|---:|---:|
| Şapka | 55 | 3 | 36 |
| Ek yazımı | 32 | 10 | 24 |
| Büyük harf | 0 | 2 | 2 |
| Sayı/birim | 241 | 37 | 43 |
| Birleşik kelime | 355 | 2 | 66 |
| Noktalama | 8 | 13 | 15 |
| Diğer yazım | 6 | 16 | 12 |
| Binlik ayırıcı (üslup kararı, ayrı bölüm) | — | 710 | 70 |

Toplam 309 sayfanın 188 tanesinde en az bir bulgu var (binlik ayırıcı dâhil). Sayılar dosya başına tekilleştirilmiş geçişlerdir; aynı metin bir sayfada birden çok kez geçiyorsa bir kez sayıldı.

### En sık hatalar

| # | Hata | Kural türü | Geçiş | Sayfa | Güven |
|---:|---|---|---:|---:|---|
| 1 | `birim kare / birim küp` → **birimkare / birimküp** (ekli biçimleriyle) | Birleşik kelime · BK-17 | 352 | 61 | kesin |
| 2 | Ondalık kesirde nokta (ör. `1.5` → `1,5`) | Sayı/birim · SY-8 | 232 | 31 | kesin |
| 3 | Saatte iki nokta (ör. `08:30` → `08.30`) | Sayı/birim · SY-2 | 36 | 5 | olası |
| 4 | Üslü birime kesme (ör. `cm²'dir` → `cm²dir`) | Ek yazımı · KS-6 | 23 | 14 | kesin |
| 5 | Kesik sayfa başlığı | Diğer yazım · DI-7 | 16 | 7 | olası |
| 6 | `madeni para` → **madenî para** | Şapka · DI-4 | 11 | 5 | kesin |
| 7 | `Merkezi eğilim` → **Merkezî eğilim** | Şapka · DI-4 | 8 | 3 | kesin |
| 8 | `mı` → **mı?** | Noktalama · NK-9 | 6 | 6 | olası |
| 9 | `Kasesi` → **Kâsesi** | Şapka · DI-3 | 6 | 2 | kesin |
| 10 | `Güneşin` → **Güneş'in** | Ek yazımı · EK-8 | 6 | 2 | olası |
| 11 | `mu` → **mu?** | Noktalama · NK-9 | 5 | 4 | olası |
| 12 | `yelken :` → **yelken:** | Noktalama · NK-1 | 4 | 1 | kesin |
| 13 | `3'er` → **üçer** | Sayı/birim · SY-11 | 4 | 2 | kesin |
| 14 | `tezgahında` → **tezgâhında** | Şapka · DI-3 | 3 | 3 | kesin |
| 15 | `tezgahı` → **tezgâhı** | Şapka · DI-3 | 3 | 3 | kesin |

### Öne çıkanlar

- **Şapka:** Sözlükte şapkalı olan *kâse, tezgâh, kâğıt, hikâye, güzergâh, zekâ, hâlen, hâl (hâli, hâlinde, hâlde), dâhil* şapkasız yazılmış. Nispet î'si eksik sıfatlar: *merkezî eğilim, madenî para, temsilî örneklem, tarihî*. Sayfaların büyük bölümü şapka bakımından temiz; kapaklardaki kazanım metinlerinde *dâhil* doğru yazılmış.
- **Ondalık nokta:** En yaygın kesin hata. Kaydırıcı göstergeleri, limit tabloları ve grafik etiketleri `1.5`, `0.25` gibi noktalı ondalık gösteriyor. Ayrıca 59 sayfanın betiği sayıları `toFixed` ile biçimlendiriyor ve virgüle çevirmiyor; bu sayfalarda etkileşim sırasında ekrana gelen sayılar da büyük olasılıkla noktalıdır (Bölüm 4.2).
- **birimkare / birimküp:** TDK sözlüğünde bitişik madde; içeriklerde hep ayrı yazılmış. Düzeltilecekse bütün sayfalarda birlikte ele alınmalı.
- **Üslü birimlere kesme:** TDK, üs işaretli kısaltmalara gelen eki kesmesiz yazar (*m²ye, cm³e*). Sorularda `kaç cm²'dir?` biçimi yaygın.
- **Binlik ayırıcı:** TDK dört ve daha çok basamaklı sayıları noktayla gruplar (*1.000*). İçerikler MEB ders kitabı üslubunu izliyor: dört basamakta ayırıcı yok, beş ve üstünde boşluk (*10 000*). Bu, tek tek hata olarak değil, üslup kararı olarak ayrı bölümde verildi.
- **Temiz çıkan konular:** Bağlaç *de/da*, *ki*, soru eki *mi* ve kesme işaretinin genel kullanımı çok büyük ölçüde doğru; bu türlerde yalnız birkaç bulgu var.

## Yöntem ve sınırlar

- **Çıkarılan metin:** Kapak, sayfa başlıkları, yönergeler, düğme ve etiketler, seçenekler, SVG içi yazılar (`<text>`, `<title>`), görünür değer öznitelikleri (`data-*` içindeki dönüt ve başlık metinleri), ekran okuyucu etiketleri (`aria-label`) ve sayfa betiklerindeki dizgiler (dönütler, soru ve seçenek metinleri). Betik yorumları ve `console` iletileri gibi geliştirici metinleri dışarıda bırakıldı. Toplam yaklaşık 147 bin metin parçası, 68 bin ayrık metin tarandı.
- **Ayrı tutulanlar:** Matematik gösterimi (`\( … \)` içi), değişken adları, kazanım kodları ve kod tanımlayıcıları yanlış alarm sayılmadı. Matematik içinde yalnız ondalık nokta denetlendi; çünkü o da ekranda görünür.
- **Sözlük doğrulaması:** Kelime yazımları Güncel Türkçe Sözlük madde listesiyle karşılaştırıldı (sozluk.gov.tr'nin madde listesi tek seferde alındı). Şüpheli kelimeler ayrıca `sozluk.gov.tr/gts` sorgusuyla tek tek doğrulandı (yaklaşık 40 sorgu, aralıklı, önbellekli).
- **Elle ayıklama:** Otomatik taramanın yanlış alarmları elle elendi. Örnekler: SVG'de alt alta satırların birleşmesi, şık harfiyle metnin birleşmesi, *kat sayısı* (katların sayısı) ile *katsayı*, *paralel kenar* (kenar) ile *paralelkenar* (şekil), *eş kenar* ile *eşkenar*, *tahmini* (tahmin+i) ile *tahminî*, cebirsel terimler (`2km`), boşluk doldurma yuvalı cümleler.
- **Görünmeyen metinler:** `aria-label` (ekran okuyucu) ve `data-baslik` (betiklerde okunduğu görülmedi, ekranda görünmüyor olabilir) bulguları tablolarda ayrıca belirtildi; düzeltme önceliği düşüktür.
- **Dinamik metin:** Betikte parçalanarak birleştirilen cümleler (`"Doğru! " + sayi + " cm"`) parça parça denetlendi; sayının yerine geçen eklerin uyumu bu yüzden denetlenemedi. Sayfalar tarayıcıda tek tek çalıştırılmadı.
- **Denetim sırasında değişen dosyalar:** Başka oturumlar bazı sayfaların görselleri üzerinde çalışıyordu.
  - Denetim başladıktan sonra değişen sayfalar: `MAT.10.6.1-a.html` (kapak: MAT.10.2.1), `MAT.10.6.2-a.html` (kapak: MAT.10.2.2), `MAT.6.1.7-a.html` (kapak: MAT.6.1.8), `MAT.6.1.8-a.html` (kapak: MAT.6.1.7).
  - Metin çıkarıldıktan sonra yeniden değişenler: `MAT.10.6.1-a.html`, `MAT.6.1.7-a.html`, `MAT.6.1.8-a.html`. Bu sayfaların metni rapor yazılırken yeniden çıkarılıp karşılaştırıldı; görünen metin aynı kaldı, değişiklikler görsel. Raporu okuduğunuz sırada bu sayfalar yine değişmiş olabilir.
  - Klasörde beliren geçici dosyalar denetlenmedi: `_once-MAT.10.6.1-a.html`.

## 1. Şapka (düzeltme işareti)

Dayanak: [DI-2] anlam ayırt eden çiftler (*hâl/hal, hâlâ/hala*), [DI-3] ince *g, k*'den sonra *â* (*kâğıt, tezgâh, hikâye*), [DI-4] nispet î'si (*merkezî, madenî*), [DI-7] kelime düzeyinde sözlük maddesi esastır. Bağlantı: https://tdk.gov.tr/icerik/yazim-kurallari/duzeltme-isareti/

### 1.1 Şapka eksik

| Dosya — kapaktaki kod | Bölüm | Bağlam | Yazılan → Önerilen | Kural | Güven |
|---|---|---|---|---|---|
| `MAT.1.1.4-a.html` — kapak: **MAT.1.1.4** | sayfa 3 | Mutfak tezgahında iki ahşap sepet ve portakallar <br>_ekran okuyucu etiketi (görünmez)_ | `tezgahında` → **tezgâhında** | [DI-3](https://tdk.gov.tr/icerik/yazim-kurallari/duzeltme-isareti/) | kesin |
| `MAT.1.1.7-a.html` — kapak: **MAT.1.1.7** | sayfa 4 | Mutfak tezgahı üzerinde 5 elmalı alçak ahşap kasa ve yaklaşık 15 elma içeren derin silindirik hasır sepet <br>_ekran okuyucu etiketi (görünmez)_ | `tezgahı` → **tezgâhı** | [DI-3](https://tdk.gov.tr/icerik/yazim-kurallari/duzeltme-isareti/) | kesin |
| `MAT.1.2.3-a.html` — kapak: **MAT.1.2.3** | sayfa 2 | Sağ kefe halen ağır basıyor | `halen` → **hâlen** | [DI-7](https://sozluk.gov.tr/) | kesin |
| `MAT.10.4.2-a.html` — kapak: **MAT.10.1.2** ⚠ | sayfa 17 | Güzergah İçi İkmal <br>_sayfa başlık özniteliği (ekranda görünmüyor olabilir)_ | `Güzergah` → **Güzergâh** | [DI-3](https://tdk.gov.tr/icerik/yazim-kurallari/duzeltme-isareti/) | kesin |
| `MAT.12.2.8-a.html` — kapak: **MAT.12.4.8** ⚠ | sayfa 6 | …nun \( x = 0 \) noktasındaki teğet eğimi sıfır yani \( f'(0) = 0 \) olduğu halde bu noktada yerel ekstremum oluşmamasının temel nedeni hangisidir?… | `halde` → **hâlde** | [DI-2](https://tdk.gov.tr/icerik/yazim-kurallari/duzeltme-isareti/) | kesin |
| `MAT.2.1.2-a.html` — kapak: **MAT.2.1.2** | sayfa 9 | 46 sayısının basamak değerlerinin toplamı şeklinde çözümlenmiş hali hangisidir? | `hali` → **hâli** | [DI-2](https://tdk.gov.tr/icerik/yazim-kurallari/duzeltme-isareti/) | kesin |
| `MAT.2.1.7-a.html` — kapak: **MAT.2.1.7** | sayfa 1 | 3B mutfak tezgahında karpuz dilimleme ve yarım parçaları inceleme sahnesi <br>_ekran okuyucu etiketi (görünmez)_ | `tezgahında` → **tezgâhında** | [DI-3](https://tdk.gov.tr/icerik/yazim-kurallari/duzeltme-isareti/) | kesin |
| `MAT.2.2.1-a.html` — kapak: **MAT.2.2.1** | sayfa 7 | Onluk bozma stratejisi pazar tezgahı 3B sahnesi <br>_ekran okuyucu etiketi (görünmez)_ | `tezgahı` → **tezgâhı** | [DI-3](https://tdk.gov.tr/icerik/yazim-kurallari/duzeltme-isareti/) | kesin |
| `MAT.2.2.3-a.html` — kapak: **MAT.2.2.3** | sayfa 9 | \( 15 - 6 = 9 \) çıkarma işleminin tersine dönüştürülmüş hali olan toplama işlemi aşağıdakilerden hangisidir? | `hali` → **hâli** | [DI-2](https://tdk.gov.tr/icerik/yazim-kurallari/duzeltme-isareti/) | kesin |
| `MAT.2.3.1-a.html` — kapak: **MAT.2.3.1** | sayfa 9 | Zeka küpü | `Zeka` → **Zekâ** | [DI-3](https://tdk.gov.tr/icerik/yazim-kurallari/duzeltme-isareti/) | kesin |
| `MAT.2.3.4-a.html` — kapak: **MAT.2.3.4** | sayfa 2 | Cisimlerin Farklı Halleri <br>_sayfa başlık özniteliği (ekranda görünmüyor olabilir)_ | `Halleri` → **Hâlleri** | [DI-2](https://tdk.gov.tr/icerik/yazim-kurallari/duzeltme-isareti/) | kesin |
| `MAT.2.3.5-a.html` — kapak: **MAT.2.3.5** | sayfa 4 | Çorba Kasesi, Su Bardağı ve Çay Fincanı ile Sıvı Ölçme Sahnesi <br>_ekran okuyucu etiketi (görünmez)_ | `Kasesi` → **Kâsesi** | [DI-3](https://tdk.gov.tr/icerik/yazim-kurallari/duzeltme-isareti/) | kesin |
| `MAT.2.3.5-a.html` — kapak: **MAT.2.3.5** | sayfa 4 | Çorba Kasesi | `Kasesi` → **Kâsesi** | [DI-3](https://tdk.gov.tr/icerik/yazim-kurallari/duzeltme-isareti/) | kesin |
| `MAT.2.3.5-a.html` — kapak: **MAT.2.3.5** | sayfa 4 | Çorba kasesi 2 su bardağı su ile tam dolmaktadır. | `kasesi` → **kâsesi** | [DI-3](https://tdk.gov.tr/icerik/yazim-kurallari/duzeltme-isareti/) | kesin |
| `MAT.3.3.1-a.html` — kapak: **MAT.3.3.1** | sayfa 7 | Baskı Kağıdı | `Kağıdı` → **Kâğıdı** | [DI-3](https://tdk.gov.tr/icerik/yazim-kurallari/duzeltme-isareti/) | kesin |
| `MAT.3.3.5-a.html` — kapak: **MAT.3.3.5** | sayfa 1 | Çorba Kasesi | `Kasesi` → **Kâsesi** | [DI-3](https://tdk.gov.tr/icerik/yazim-kurallari/duzeltme-isareti/) | kesin |
| `MAT.3.3.5-a.html` — kapak: **MAT.3.3.5** | sayfa 7 | Çorba Kasesi | `Kasesi` → **Kâsesi** | [DI-3](https://tdk.gov.tr/icerik/yazim-kurallari/duzeltme-isareti/) | kesin |
| `MAT.3.3.5-a.html` — kapak: **MAT.3.3.5** | sayfa 7 | Çorba kasesi | `kasesi` → **kâsesi** | [DI-3](https://tdk.gov.tr/icerik/yazim-kurallari/duzeltme-isareti/) | kesin |
| `MAT.4.2.9-a.html` — kapak: **MAT.4.2.9** | sayfa 4 | Açık manav tezgahında yan yana 4 ahşap kasa ve her kasada 5 kırmızı elma <br>_ekran okuyucu etiketi (görünmez)_ | `tezgahında` → **tezgâhında** | [DI-3](https://tdk.gov.tr/icerik/yazim-kurallari/duzeltme-isareti/) | kesin |
| `MAT.4.3.3-a.html` — kapak: **MAT.4.3.3** | sayfa 1 | Ölçme Araçları Çalışma Tezgahı ve Çevre Ölçme Bölmesi <br>_ekran okuyucu etiketi (görünmez)_ | `Tezgahı` → **Tezgâhı** | [DI-3](https://tdk.gov.tr/icerik/yazim-kurallari/duzeltme-isareti/) | kesin |
| `MAT.4.3.6-a.html` — kapak: **MAT.4.3.6** | sayfa 7 | İki usta da 4 takoz kullandığı halde açılar neden farklı çıkmıştır? | `halde` → **hâlde** | [DI-2](https://tdk.gov.tr/icerik/yazim-kurallari/duzeltme-isareti/) | kesin |
| `MAT.5.1.1-a.html` — kapak: **MAT.5.1.1** | — | Elazığ | `Elazığ` → **Elâzığ** | [DI-3](https://tdk.gov.tr/icerik/yazim-kurallari/duzeltme-isareti/) | olası |
| `MAT.5.1.1-a.html` — kapak: **MAT.5.1.1** | — | Birleşik Arap Emirlikleri | `Emirlikleri` → **Emîrlikleri** | [DI-7](https://sozluk.gov.tr/) | olası |
| `MAT.5.2.2-a.html` — kapak: **MAT.5.2.2** | sayfa 8 | Problem Hikayesi <br>_sayfa başlık özniteliği (ekranda görünmüyor olabilir)_ | `Hikayesi` → **Hikâyesi** | [DI-3](https://tdk.gov.tr/icerik/yazim-kurallari/duzeltme-isareti/) | kesin |
| `MAT.5.2.2-a.html` — kapak: **MAT.5.2.2** | sayfa 8 | Problem Hikayesi Seçenekleri <br>_ekran okuyucu etiketi (görünmez)_ | `Hikayesi` → **Hikâyesi** | [DI-3](https://tdk.gov.tr/icerik/yazim-kurallari/duzeltme-isareti/) | kesin |
| `MAT.5.5.1-a.html` — kapak: **MAT.5.5.1** | sayfa 6 | Tüm seçenekler dahil edilmelidir. | `dahil` → **dâhil** | [DI-7](https://sozluk.gov.tr/) | kesin |
| `MAT.7.4.6-a.html` — kapak: **MAT.7.4.6** | sayfa 5 | Gereken kaplama kağıdı | `kağıdı` → **kâğıdı** | [DI-3](https://tdk.gov.tr/icerik/yazim-kurallari/duzeltme-isareti/) | kesin |
| `MAT.7.4.6-a.html` — kapak: **MAT.7.4.6** | sayfa 5 | 3 Gereken kaplama kağıdı | `kağıdı` → **kâğıdı** | [DI-3](https://tdk.gov.tr/icerik/yazim-kurallari/duzeltme-isareti/) | kesin |
| `MAT.8.4.3-a.html` — kapak: **MAT.8.4.3** | sayfa 3 | Silindirin 16 düşey dilim halinde prizmaya dönüştüğü 3B sahne <br>_ekran okuyucu etiketi (görünmez)_ | `halinde` → **hâlinde** | [DI-2](https://tdk.gov.tr/icerik/yazim-kurallari/duzeltme-isareti/) | kesin |
| `MAT.9.3.2-a.html` — kapak: **MAT.9.5.2** ⚠ | sayfa 4 | Aday burs kuralını sağladığı halde elendi. Hatalı karar düğümünü seçelim. | `halde` → **hâlde** | [DI-2](https://tdk.gov.tr/icerik/yazim-kurallari/duzeltme-isareti/) | kesin |

### 1.2 Nispet î'si eksik

| Dosya — kapaktaki kod | Bölüm | Bağlam | Yazılan → Önerilen | Kural | Güven |
|---|---|---|---|---|---|
| `MAT.12.5.1-a.html` — kapak: **MAT.12.5.1** | sayfa 2 | Merkezi eğilim | `Merkezi eğilim` → **Merkezî eğilim** | [DI-4](https://tdk.gov.tr/icerik/yazim-kurallari/duzeltme-isareti/) | kesin |
| `MAT.2.1.8-a.html` — kapak: **MAT.2.1.8** | kapak | 1 TL gerçek madeni para <br>_SVG başlığı (üzerine gelince ipucu)_ | `madeni para` → **madenî para** | [DI-4](https://tdk.gov.tr/icerik/yazim-kurallari/duzeltme-isareti/) | kesin |
| `MAT.2.1.8-a.html` — kapak: **MAT.2.1.8** | kapak | 50 kuruş gerçek madeni para <br>_SVG başlığı (üzerine gelince ipucu)_ | `madeni para` → **madenî para** | [DI-4](https://tdk.gov.tr/icerik/yazim-kurallari/duzeltme-isareti/) | kesin |
| `MAT.2.1.8-a.html` — kapak: **MAT.2.1.8** | kapak | 25 kuruş gerçek madeni para <br>_SVG başlığı (üzerine gelince ipucu)_ | `madeni para` → **madenî para** | [DI-4](https://tdk.gov.tr/icerik/yazim-kurallari/duzeltme-isareti/) | kesin |
| `MAT.3.1.16-a.html` — kapak: **MAT.3.1.16** | sayfa 9 | 1 Türk Lirası Madeni Para <br>_ekran okuyucu etiketi (görünmez)_ | `Madeni Para` → **Madenî Para** | [DI-4](https://tdk.gov.tr/icerik/yazim-kurallari/duzeltme-isareti/) | kesin |
| `MAT.4.3.4-a.html` — kapak: **MAT.4.3.4** | sayfa 1 | Madeni Para <br>_ekran okuyucu etiketi (görünmez)_ | `Madeni Para` → **Madenî Para** | [DI-4](https://tdk.gov.tr/icerik/yazim-kurallari/duzeltme-isareti/) | kesin |
| `MAT.4.3.4-a.html` — kapak: **MAT.4.3.4** | sayfa 7 | Madeni para | `Madeni para` → **Madenî para** | [DI-4](https://tdk.gov.tr/icerik/yazim-kurallari/duzeltme-isareti/) | kesin |
| `MAT.4.3.4-a.html` — kapak: **MAT.4.3.4** | sayfa 7 | A Madeni para | `Madeni para` → **Madenî para** | [DI-4](https://tdk.gov.tr/icerik/yazim-kurallari/duzeltme-isareti/) | kesin |
| `MAT.5.3.3-a.html` — kapak: **MAT.5.3.3** | sayfa 7 | Klavyeden açının tahmini değerini yazmalıdır. | `tahmini değerini` → **tahminî değerini** | [DI-4](https://tdk.gov.tr/icerik/yazim-kurallari/duzeltme-isareti/) | olası |
| `MAT.6.5.1-a.html` — kapak: **MAT.6.5.1** | sayfa 15 | Merkezi Eğilim | `Merkezi Eğilim` → **Merkezî Eğilim** | [DI-4](https://tdk.gov.tr/icerik/yazim-kurallari/duzeltme-isareti/) | kesin |
| `MAT.6.6.1-a.html` — kapak: **MAT.6.6.1** | sayfa 6 | Bir madeni para 50 kez havaya atılmış ve 28 kez tura gelmiştir. Tura gelme olayının b… | `madeni para` → **madenî para** | [DI-4](https://tdk.gov.tr/icerik/yazim-kurallari/duzeltme-isareti/) | kesin |
| `MAT.7.6.1-a.html` — kapak: **MAT.7.6.1** | sayfa 12 | Merkezi eğilimler başarıyla belirlendi. | `Merkezi eğilimler` → **Merkezî eğilimler** | [DI-4](https://tdk.gov.tr/icerik/yazim-kurallari/duzeltme-isareti/) | kesin |
| `MAT.8.6.2-a.html` — kapak: **MAT.8.6.2** | sayfa 2 | Merkezi Eğilim Yanılgısı <br>_sayfa başlık özniteliği (ekranda görünmüyor olabilir)_ | `Merkezi Eğilim` → **Merkezî Eğilim** | [DI-4](https://tdk.gov.tr/icerik/yazim-kurallari/duzeltme-isareti/) | kesin |
| `MAT.8.6.2-a.html` — kapak: **MAT.8.6.2** | sayfa 2 | Maaş Sayı Doğrusu ve Merkezi Eğilim Göstergeleri <br>_SVG başlığı (üzerine gelince ipucu)_ | `Merkezi Eğilim` → **Merkezî Eğilim** | [DI-4](https://tdk.gov.tr/icerik/yazim-kurallari/duzeltme-isareti/) | kesin |
| `MAT.8.6.2-a.html` — kapak: **MAT.8.6.2** | sayfa 7 | Merkezi Eğilim Ölçüleri | `Merkezi Eğilim` → **Merkezî Eğilim** | [DI-4](https://tdk.gov.tr/icerik/yazim-kurallari/duzeltme-isareti/) | kesin |
| `MAT.8.6.2-a.html` — kapak: **MAT.8.6.2** | sayfa 7 | Merkezi Eğilim Ölçüleri Kanıt Alanı <br>_ekran okuyucu etiketi (görünmez)_ | `Merkezi Eğilim` → **Merkezî Eğilim** | [DI-4](https://tdk.gov.tr/icerik/yazim-kurallari/duzeltme-isareti/) | kesin |
| `MAT.8.6.2-a.html` — kapak: **MAT.8.6.2** | sayfa 7 | Dengeli Merkezi Eğilim Ölçütü <br>_ekran okuyucu etiketi (görünmez)_ | `Merkezi Eğilim` → **Merkezî Eğilim** | [DI-4](https://tdk.gov.tr/icerik/yazim-kurallari/duzeltme-isareti/) | kesin |
| `MAT.8.6.2-a.html` — kapak: **MAT.8.6.2** | sayfa 7 | Dengeli Merkezi Eğilim | `Merkezi Eğilim` → **Merkezî Eğilim** | [DI-4](https://tdk.gov.tr/icerik/yazim-kurallari/duzeltme-isareti/) | kesin |
| `MAT.8.7.1-a.html` — kapak: **MAT.8.7.1** | sayfa 6 | Bir şans standı sorumlusu, hilesiz bir madeni parayı 5 kez havaya atmış ve 4 kez yazı gelmesi üzerine "Bu parada yazı ge… | `madeni parayı` → **madenî parayı** | [DI-4](https://tdk.gov.tr/icerik/yazim-kurallari/duzeltme-isareti/) | kesin |
| `MAT.8.7.1-a.html` — kapak: **MAT.8.7.1** | sayfa 6 | Madeni paralarda deneysel olasılık yaklaşımı hiçbir zaman kullanılamaz. | `Madeni paralarda` → **Madenî paralarda** | [DI-4](https://tdk.gov.tr/icerik/yazim-kurallari/duzeltme-isareti/) | kesin |
| `MAT.9.5.5-a.html` — kapak: **MAT.9.4.5** ⚠ | sayfa 1 | Tarihi saat kulesi, ölçüm çubuğu ve gölgelerinden oluşan 3B meydan sahnesi <br>_ekran okuyucu etiketi (görünmez)_ | `Tarihi saat kulesi,` → **Tarihî saat kulesi,** | [DI-4](https://tdk.gov.tr/icerik/yazim-kurallari/duzeltme-isareti/) | kesin |
| `MAT.9.7.2-a.html` — kapak: **MAT.9.7.2** | sayfa 1 | Madeni para ve sayı küpü deneyi örnek uzay listesi <br>_ekran okuyucu etiketi (görünmez)_ | `Madeni para` → **Madenî para** | [DI-4](https://tdk.gov.tr/icerik/yazim-kurallari/duzeltme-isareti/) | kesin |
| `MAT.9.7.2-a.html` — kapak: **MAT.9.7.2** | sayfa 10 | Düzgün bir madeni paranın art arda 3 kez atılması deneyinde tüm olası sonuçlar hiyerarşik bi… | `madeni paranın` → **madenî paranın** | [DI-4](https://tdk.gov.tr/icerik/yazim-kurallari/duzeltme-isareti/) | kesin |
| `MAT.9.7.2-a.html` — kapak: **MAT.9.7.2** | sayfa 10 | Hilesiz bir madeni para atma deneyinde Tura gelme olayının teorik olasılığı 0,5'tir. Bu deney… | `madeni para` → **madenî para** | [DI-4](https://tdk.gov.tr/icerik/yazim-kurallari/duzeltme-isareti/) | kesin |
| `MAT.9.7.2-a.html` — kapak: **MAT.9.7.2** | sayfa 6 | Madeni para yazı | `Madeni para` → **Madenî para** | [DI-4](https://tdk.gov.tr/icerik/yazim-kurallari/duzeltme-isareti/) | kesin |
| `MAT.H.5.1-a.html` — kapak: **MAT.H.5.1** | sayfa 4 | Doğru! Tüm katmanlar örneklendiği için temsili örneklemdir. | `temsili örneklemdir.` → **temsilî örneklemdir.** | [DI-4](https://tdk.gov.tr/icerik/yazim-kurallari/duzeltme-isareti/) | kesin |
| `MAT.H.5.1-a.html` — kapak: **MAT.H.5.1** | sayfa 4 | Temsili örneklem: Üst, orta ve alt katmanların hepsinden örnek alındı. | `Temsili örneklem:` → **Temsilî örneklem:** | [DI-4](https://tdk.gov.tr/icerik/yazim-kurallari/duzeltme-isareti/) | kesin |
| `MAT.H.5.1-a.html` — kapak: **MAT.H.5.1** | sayfa 4 | B Temsili Örneklem | `Temsili Örneklem` → **Temsilî Örneklem** | [DI-4](https://tdk.gov.tr/icerik/yazim-kurallari/duzeltme-isareti/) | kesin |

_Denetlenip sorun bulunmayanlar:_ *tahmini, merkezi, şekli, temsili, adedi* gibi kelimelerin büyük çoğunluğu iyelikli kullanım (*tahmin+i*: "Elma Tahmini", "çemberin merkezi") olduğu için doğrudur; yalnız sıfat olarak kullanıldıkları yerler listelendi. *adet* (sayı) işaretsiz doğru kullanılmış; *kâr* gereken bir bağlam bulunmadı (*kar tanesi* doğru); *plân, lâzım* gibi gereksiz şapka yok.

## 2. Ek yazımı

Dayanak: [EK-8]/[EK-9] kesme işaretinin kullanıldığı ve kullanılmadığı yerler, [EK-10]/[KS-5] ek okunuşa göre seçilir, [KS-6] üslü kısaltmalara kesme konmaz, [SY-12] kesre gelen ek paydaya göre seçilir, [EK-1] bağlaç *de/da*, [EK-5] soru eki *mi*. Bağlantı: https://tdk.gov.tr/icerik/yazim-kurallari/kesme-isareti/ · https://tdk.gov.tr/icerik/yazim-kurallari/kisaltmalar/

### 2.1 Üslü ifadeye gelen ek kesmeyle ayrılmış

| Dosya — kapaktaki kod | Bölüm | Bağlam | Yazılan → Önerilen | Kural | Güven |
|---|---|---|---|---|---|
| `MAT.10.2.5-a.html` — kapak: **MAT.10.4.5** ⚠ | sayfa 16 | f artan ise f ile f⁻¹’in kesişim noktaları y = x üzerindedir; f(x) = x denklemini sa… | `f⁻¹’in` → **f⁻¹in** | [KS-6](https://tdk.gov.tr/icerik/yazim-kurallari/kisaltmalar/) | kesin |
| `MAT.10.2.5-a.html` — kapak: **MAT.10.4.5** ⚠ | sayfa 9 | İz tamamlandı: Şimdi f⁻¹'in tanım kümesini seçelim. | `f⁻¹'in` → **f⁻¹in** | [KS-6](https://tdk.gov.tr/icerik/yazim-kurallari/kisaltmalar/) | kesin |
| `MAT.12.2.5-a.html` — kapak: **MAT.12.4.5** ⚠ | sayfa 14 | Tablodaki her eğim 3a²'ye eşit; öngörü f′(3) = 3 · 9 = 27. | `3a²'ye` → **3a²ye** | [KS-6](https://tdk.gov.tr/icerik/yazim-kurallari/kisaltmalar/) | kesin |
| `MAT.12.3.3-a.html` — kapak: **MAT.12.2.3** ⚠ | sayfa 9 | …a stratejisine göre bu su birikintisinin en-kesit alanı kaç m²'dir? | `m²'dir` → **m²dir** | [KS-6](https://tdk.gov.tr/icerik/yazim-kurallari/kisaltmalar/) | kesin |
| `MAT.12.3.3-a.html` — kapak: **MAT.12.2.3** ⚠ | sayfa 9 | …yla özdeş olduğuna göre, depoda biriken toplam su hacmi kaç m³'tür? | `m³'tür` → **m³tür** | [KS-6](https://tdk.gov.tr/icerik/yazim-kurallari/kisaltmalar/) | kesin |
| `MAT.12.5.1-a.html` — kapak: **MAT.12.5.1** | sayfa 16 | PM₁₀ verisinde  ⟦M⟧  ve  ⟦M⟧  µg/m³'tür. Çeyrekler açıklığı kuralına göre ( ⟦M⟧ ) üst sınırı ( ⟦M⟧… | `µg/m³'tür` → **µg/m³tür** | [KS-6](https://tdk.gov.tr/icerik/yazim-kurallari/kisaltmalar/) | kesin |
| `MAT.6.4.1-a.html` — kapak: **MAT.6.4.1** | sayfa 2 | Sıra Ekle butonuna tıklayarak 1 m²'lik zemini desimetrekare karolarıyla kaplayalım. | `m²'lik` → **m²lik** | [KS-6](https://tdk.gov.tr/icerik/yazim-kurallari/kisaltmalar/) | kesin |
| `MAT.6.4.1-a.html` — kapak: **MAT.6.4.1** | sayfa 4 | Sürgüyü kaydırarak 1 cm²'lik mikro plakayı milimetrekarelik küplerle dolduralım. | `cm²'lik` → **cm²lik** | [KS-6](https://tdk.gov.tr/icerik/yazim-kurallari/kisaltmalar/) | kesin |
| `MAT.6.4.2-a.html` — kapak: **MAT.6.4.2** | sayfa 9 | …şmaktadır. Buna göre başlangıçtaki paralelkenarın alanı kaç cm²'dir? | `cm²'dir` → **cm²dir** | [KS-6](https://tdk.gov.tr/icerik/yazim-kurallari/kisaltmalar/) | kesin |
| `MAT.6.4.2-a.html` — kapak: **MAT.6.4.2** | sayfa 9 | …de edilmektedir. Buna göre bu üçgenlerden birinin alanı kaç cm²'dir? | `cm²'dir` → **cm²dir** | [KS-6](https://tdk.gov.tr/icerik/yazim-kurallari/kisaltmalar/) | kesin |
| `MAT.6.4.3-a.html` — kapak: **MAT.6.4.3** | sayfa 6 | çiçek tarhı ve teras dışında kalan çim alanı kaç m²'dir? | `m²'dir` → **m²dir** | [KS-6](https://tdk.gov.tr/icerik/yazim-kurallari/kisaltmalar/) | kesin |
| `MAT.7.4.10-a.html` — kapak: **MAT.7.4.10** | sayfa 13 | …⟦M⟧  alalım). Buna göre dinlenme terasının yüzey alanı kaç m²'dir? | `m²'dir` → **m²dir** | [KS-6](https://tdk.gov.tr/icerik/yazim-kurallari/kisaltmalar/) | kesin |
| `MAT.7.4.10-a.html` — kapak: **MAT.7.4.10** | sayfa 13 | …bağıntısıyla hesaplandığına göre kaplama yapılacak alan kaç m²'dir? | `m²'dir` → **m²dir** | [KS-6](https://tdk.gov.tr/icerik/yazim-kurallari/kisaltmalar/) | kesin |
| `MAT.7.4.2-a.html` — kapak: **MAT.7.4.2** | sayfa 9 | …m² ve 12 cm² olan dikdörtgenler prizmasının yüzey alanı kaç cm²'dir? | `cm²'dir` → **cm²dir** | [KS-6](https://tdk.gov.tr/icerik/yazim-kurallari/kisaltmalar/) | kesin |
| `MAT.7.4.2-a.html` — kapak: **MAT.7.4.2** | sayfa 9 | …ekliği 10 cm olan kare dik prizmanın toplam yüzey alanı kaç cm²'dir? | `cm²'dir` → **cm²dir** | [KS-6](https://tdk.gov.tr/icerik/yazim-kurallari/kisaltmalar/) | kesin |
| `MAT.7.4.5-a.html` — kapak: **MAT.7.4.5** | sayfa 10 | …mamen doldurulmuştur. Buna göre bu deponun toplam hacmi kaç m³'tür? | `m³'tür` → **m³tür** | [KS-6](https://tdk.gov.tr/icerik/yazim-kurallari/kisaltmalar/) | kesin |
| `MAT.7.4.5-a.html` — kapak: **MAT.7.4.5** | sayfa 2 | 1 m³'lük ahşap blokları depolama alanına yerleştirerek toplam hacmi… | `m³'lük` → **m³lük** | [KS-6](https://tdk.gov.tr/icerik/yazim-kurallari/kisaltmalar/) | kesin |
| `MAT.7.4.6-a.html` — kapak: **MAT.7.4.6** | sayfa 12 | …leştirilmektedir. Bağıntısı  ⟦M⟧  olan bu kutunun hacmi kaç cm³'tür? | `cm³'tür` → **cm³tür** | [KS-6](https://tdk.gov.tr/icerik/yazim-kurallari/kisaltmalar/) | kesin |
| `MAT.7.4.7-a.html` — kapak: **MAT.7.4.7** | sayfa 7 | …ım daireden oluşmaktadır. Buna göre pistin toplam alanı kaç m²'dir? ( ⟦M⟧  alalım.) | `m²'dir` → **m²dir** | [KS-6](https://tdk.gov.tr/icerik/yazim-kurallari/kisaltmalar/) | kesin |
| `MAT.7.4.9-a.html` — kapak: **MAT.7.4.9** | sayfa 12 | …nlukları 14 cm ve 8 cm olan bir eşkenar dörtgenin alanı kaç cm²'dir? | `cm²'dir` → **cm²dir** | [KS-6](https://tdk.gov.tr/icerik/yazim-kurallari/kisaltmalar/) | kesin |
| `MAT.7.4.9-a.html` — kapak: **MAT.7.4.9** | sayfa 12 | …abanlara ait dik yüksekliği 5 cm olan bir yamuğun alanı kaç cm²'dir? | `cm²'dir` → **cm²dir** | [KS-6](https://tdk.gov.tr/icerik/yazim-kurallari/kisaltmalar/) | kesin |
| `MAT.8.3.5-a.html` — kapak: **MAT.8.3.5** | sayfa 9 | …ar üzerine kurulan karelerin alanları sırasıyla 9 cm² ve 16 cm²'dir. Buna göre bu üçgenin hipotenüsü üzerine kurulan karenin al… | `cm²'dir` → **cm²dir** | [KS-6](https://tdk.gov.tr/icerik/yazim-kurallari/kisaltmalar/) | kesin |
| `MAT.8.3.5-a.html` — kapak: **MAT.8.3.5** | sayfa 9 | …öre bu üçgenin hipotenüsü üzerine kurulan karenin alanı kaç cm²'dir? | `cm²'dir` → **cm²dir** | [KS-6](https://tdk.gov.tr/icerik/yazim-kurallari/kisaltmalar/) | kesin |

### 2.2 Ek uyumu (harf, kesir, sayıdan sonra okunuşa göre)

| Dosya — kapaktaki kod | Bölüm | Bağlam | Yazılan → Önerilen | Kural | Güven |
|---|---|---|---|---|---|
| `MAT.10.2.3-a.html` — kapak: **MAT.10.4.3** ⚠ | sayfa 9 | Başlangıç noktasının y değeri k'dır: (2, 1) noktasına bakalım. | `k'dır` → **k'dir** | [EK-10](https://tdk.gov.tr/icerik/yazim-kurallari/kisaltmalar/) | kesin |
| `MAT.10.2.4-a.html` — kapak: **MAT.10.4.4** ⚠ | sayfa 12 | a'yı değiştirelim; yatay doğru yerinde kalır. k'yı değiştirelim; yatay doğru yer değiştirir. | `k'yı` → **k'yi** | [EK-10](https://tdk.gov.tr/icerik/yazim-kurallari/kisaltmalar/) | kesin |
| `MAT.10.2.4-a.html` — kapak: **MAT.10.4.4** ⚠ | sayfa 12 | Sözel önerme tamam: x = r'de tanımsız, eğri y = k'ya yaklaşır | `k'ya` → **k'ye** | [EK-10](https://tdk.gov.tr/icerik/yazim-kurallari/kisaltmalar/) | kesin |
| `MAT.10.2.4-a.html` — kapak: **MAT.10.4.4** ⚠ | sayfa 12 | Sondaki sabit terim k'dır: k = −1 olmalı | `k'dır` → **k'dir** | [EK-10](https://tdk.gov.tr/icerik/yazim-kurallari/kisaltmalar/) | kesin |
| `MAT.10.2.4-a.html` — kapak: **MAT.10.4.4** ⚠ | sayfa 12 | ✓ Sözel: x = r için tanımsız; eğri y = k'ya yaklaşır | `k'ya` → **k'ye** | [EK-10](https://tdk.gov.tr/icerik/yazim-kurallari/kisaltmalar/) | kesin |
| `MAT.10.2.4-a.html` — kapak: **MAT.10.4.4** ⚠ | sayfa 7 | Dikey işlem k'yı da değiştirdi: Önce çarpalım ya da yansıtalım, sonra öteley… | `k'yı` → **k'yi** | [EK-10](https://tdk.gov.tr/icerik/yazim-kurallari/kisaltmalar/) | kesin |
| `MAT.11.1.2-a.html` — kapak: **MAT.11.3.2** ⚠ | sayfa 11 | Grafikte dokunarak sınayalım; ok tuşlarıyla x'i kaydırıp Enter'a basalım <br>_ekran okuyucu etiketi (görünmez)_ | `Enter'a` → **Enter'e** | [EK-10](https://tdk.gov.tr/icerik/yazim-kurallari/kisaltmalar/) | olası |
| `MAT.7.2.1-a.html` — kapak: **MAT.7.2.1** | sayfa 8 | 2/3'lik Kısım | `2/3'lik` → **2/3'lük** | [SY-12](https://tdk.gov.tr/icerik/yazim-kurallari/sayilarin-yazilisi/) | kesin |

### 2.3 Kesme işareti eksik

| Dosya — kapaktaki kod | Bölüm | Bağlam | Yazılan → Önerilen | Kural | Güven |
|---|---|---|---|---|---|
| `MAT.10.4.1-a.html` — kapak: **MAT.10.1.1** ⚠ | sayfa 6 | ▢ Güneşi tepeye alalım | `Güneşi` → **Güneş'i** | [EK-8](https://tdk.gov.tr/icerik/yazim-kurallari/kesme-isareti/) | olası |
| `MAT.10.4.4-a.html` — kapak: **MAT.10.1.4** ⚠ | sayfa 1 | Pisagorla Kosinüs Çıkarımı <br>_sayfa başlık özniteliği (ekranda görünmüyor olabilir)_ | `Pisagorla` → **Pisagor'la** | [EK-8](https://tdk.gov.tr/icerik/yazim-kurallari/kesme-isareti/) | kesin |
| `MAT.4.1.6-a.html` — kapak: **MAT.4.1.6** | sayfa 1 | Kare Kesir Modeli: 4 parçadan 2si taranmış <br>_ekran okuyucu etiketi (görünmez)_ | `2si` → **2'si** | [EK-8](https://tdk.gov.tr/icerik/yazim-kurallari/kesme-isareti/) | kesin |
| `MAT.4.4.1-a.html` — kapak: **MAT.4.4.1** | sayfa 6 | Güneşin batıdan doğması | `Güneşin` → **Güneş'in** | [EK-8](https://tdk.gov.tr/icerik/yazim-kurallari/kesme-isareti/) | olası |
| `MAT.4.4.1-a.html` — kapak: **MAT.4.4.1** | sayfa 7 | Güneşin batıdan <br>_veri özniteliği (data-satir1) — betik ekrana yazıyorsa görünür_ | `Güneşin` → **Güneş'in** | [EK-8](https://tdk.gov.tr/icerik/yazim-kurallari/kesme-isareti/) | olası |
| `MAT.4.4.1-a.html` — kapak: **MAT.4.4.1** | sayfa 7 | Güneşin batıdan doğması <br>_veri özniteliği (data-metin) — betik ekrana yazıyorsa görünür_ | `Güneşin` → **Güneş'in** | [EK-8](https://tdk.gov.tr/icerik/yazim-kurallari/kesme-isareti/) | olası |
| `MAT.4.4.1-a.html` — kapak: **MAT.4.4.1** | sayfa 9 | Güneşin batıdan doğması → Kesin olay | `Güneşin` → **Güneş'in** | [EK-8](https://tdk.gov.tr/icerik/yazim-kurallari/kesme-isareti/) | olası |
| `MAT.5.6.1-a.html` — kapak: **MAT.5.6.1** | sayfa 4 | Güneşin batıdan | `Güneşin` → **Güneş'in** | [EK-8](https://tdk.gov.tr/icerik/yazim-kurallari/kesme-isareti/) | olası |
| `MAT.5.6.1-a.html` — kapak: **MAT.5.6.1** | sayfa 4 | Olay Güneşin batıdan doğması | `Güneşin` → **Güneş'in** | [EK-8](https://tdk.gov.tr/icerik/yazim-kurallari/kesme-isareti/) | olası |
| `MAT.6.1.1-a.html` — kapak: **MAT.6.1.1** | sayfa 4 | 4lu | `4lu` → **4'lü** | [EK-8](https://tdk.gov.tr/icerik/yazim-kurallari/kesme-isareti/) | olası |
| `MAT.6.1.1-a.html` — kapak: **MAT.6.1.1** | sayfa 4 | 5li | `5li` → **5'li** | [EK-8](https://tdk.gov.tr/icerik/yazim-kurallari/kesme-isareti/) | olası |

_Denetlenip sorun bulunmayanlar:_ bağlaç *de/da* ile bulunma eki ayrımı, bağlaç *ki* ve *-ki* eki, soru eki *mi*'nin ayrı yazımı ve ünlü uyumu, sayılara gelen eklerin uyumu (*5'ten, 3'üncü, 10'a*), cins isimlere gereksiz kesme ve özel adlara gelen yapım ekleri taramada temiz çıktı.

## 3. Büyük harf

Dayanak: [BH-15] belirli tarih bildirmeyen ay ve gün adları küçük yazılır; [BH-7] gök cismi olarak *Güneş*. Bağlantı: https://tdk.gov.tr/icerik/yazim-kurallari/buyuk-harflerin-kullanildigi-yerler/

| Dosya — kapaktaki kod | Bölüm | Bağlam | Yazılan → Önerilen | Kural | Güven |
|---|---|---|---|---|---|
| `MAT.2.1.9-a.html` — kapak: **MAT.2.1.9** | sayfa 11 | Bir takvim yaprağında haftanın günleri Pazartesi'den başlayarak sıralanmıştır. Buna göre haftanın 5. günü aşağıdakilerden hangisidir? | `Pazartesi'den` → **pazartesiden** | [BH-15](https://tdk.gov.tr/icerik/yazim-kurallari/buyuk-harflerin-kullanildigi-yerler/) | olası |
| `MAT.7.7.3-a.html` — kapak: **MAT.7.7.3** | sayfa 7 | …', II. 'P harfiyle başlaması' ile 'hafta sonu olması', III. 'Salı olması' ile 'çarşamba olması' çiftleri veriliyor. Bu çiftlerin 'Ayrık Olaylar… | `Salı olması` → **salı olması** | [BH-15](https://tdk.gov.tr/icerik/yazim-kurallari/buyuk-harflerin-kullanildigi-yerler/) | olası |

_Denetlenip sorun bulunmayanlar:_ cümle başında küçük harf, büyük harfle yazımda *I/İ* karışıklığı, küçük yazılmış özel ad ya da dil adı bulunmadı. Tarih bildiren gün adları (*2 Mayıs Salı*) doğru biçimde büyük yazılmış.

## 4. Sayı ve birim

Dayanak: [SY-8] ondalık ayırıcı virgül, [SY-11] üleştirme sayıları yazıyla, [SY-5] yüzde işareti, [SY-2] saat, [SY-17]/[KS-3] birim simgesi. Bağlantı: https://tdk.gov.tr/icerik/yazim-kurallari/sayilarin-yazilisi/

### 4.1 Ondalık kesirde nokta

Sayfa başına toplandı. Örnekler bağlamıyla birlikte verildi; bütün geçişler CSV dosyasında.

| Dosya — kapaktaki kod | Geçiş | Örnekler (yazılan → önerilen) | Örnek bağlam | Güven |
|---|---:|---|---|---|
| `MAT.12.2.5-a.html` — kapak: **MAT.12.4.5** ⚠ | 22 | `0.5`→`0,5`, `2.00`→`2,00`, `4.00`→`4,00`, `1.00`→`1,00`, `1.5`→`1,5`, `0.1`→`0,1` … | 0.5 | kesin |
| `MAT.10.2.2-a.html` — kapak: **MAT.10.4.2** ⚠ | 21 | `2.0`→`2,0`, `4.0`→`4,0`, `1.0`→`1,0`, `0.5`→`0,5`, `1.5`→`1,5`, `3.0`→`3,0` … | x = -2.0 | kesin |
| `MAT.12.2.9-a.html` — kapak: **MAT.12.4.9** ⚠ | 20 | `1.9`→`1,9`, `2.1`→`2,1`, `1.50`→`1,50`, `0.00`→`0,00`, `1.0`→`1,0`, `2.0`→`2,0` … | 1.9 | kesin |
| `MAT.12.2.2-a.html` — kapak: **MAT.12.4.2** ⚠ | 20 | `1.9`→`1,9`, `1.99`→`1,99`, `2.01`→`2,01`, `2.1`→`2,1`, `4.8`→`4,8`, `4.98`→`4,98` … | x = 1.9 noktası hedef yuvası | kesin |
| `MAT.10.2.3-a.html` — kapak: **MAT.10.4.3** ⚠ | 16 | `0.5`→`0,5`, `4.0`→`4,0`, `2.0`→`2,0`, `1.0`→`1,0`, `1.6`→`1,6`, `1.2`→`1,2` … | \( p(x) = 0.5\sqrt{x+6}-4 \) | kesin |
| `MAT.12.2.1-a.html` — kapak: **MAT.12.4.1** ⚠ | 16 | `1.00`→`1,00`, `3.00`→`3,00`, `5.00`→`5,00`, `1.9`→`1,9`, `1.99`→`1,99`, `1.999`→`1,999` … | 1.00 | kesin |
| `MAT.9.2.1-a.html` — kapak: **MAT.9.2.1** | 15 | `2.0`→`2,0`, `1.0`→`1,0`, `0.2`→`0,2`, `2.5`→`2,5`, `10.0`→`10,0`, `6.0`→`6,0` … | 2.0 | kesin |
| `MAT.10.4.1-a.html` — kapak: **MAT.10.1.1** ⚠ | 11 | `4.5`→`4,5`, `7.5`→`7,5`, `0.60`→`0,60`, `0.80`→`0,80`, `0.75`→`0,75`, `1.33`→`1,33` | 4.5 br | kesin |
| `MAT.10.2.4-a.html` — kapak: **MAT.10.4.4** ⚠ | 10 | `0.5`→`0,5`, `2.00`→`2,00`, `0.50`→`0,50`, `2.0`→`2,0`, `4.0`→`4,0`, `1.00`→`1,00` | a = 0.5 | kesin |
| `MAT.10.2.5-a.html` — kapak: **MAT.10.4.5** ⚠ | 9 | `0.5`→`0,5` | A′(0.5, 2) | kesin |
| `MAT.11.1.1-a.html` — kapak: **MAT.11.3.1** ⚠ | 9 | `1.0`→`1,0`, `0.0`→`0,0`, `0.5`→`0,5` | k = +1.0 | kesin |
| `MAT.12.2.7-a.html` — kapak: **MAT.12.4.7** ⚠ | 8 | `1.0`→`1,0`, `0.5`→`0,5`, `1.6`→`1,6`, `4.0`→`4,0`, `8.0`→`8,0` | f Eğim Değeri: 1.0 | kesin |
| `MAT.6.1.6-a.html` — kapak: **MAT.6.1.6** | 6 | `0.5`→`0,5`, `0.75`→`0,75`, `0.4`→`0,4`, `0.33333333`→`0,33333333`, `0.83333333`→`0,83333333`, `0.44444444`→`0,44444444` | 0.5 | kesin |
| `MAT.12.3.1-a.html` — kapak: **MAT.12.2.1** ⚠ | 6 | `0.00`→`0,00`, `0.90`→`0,90`, `0.05`→`0,05`, `3.12`→`3,12` | 0.00 br | kesin |
| `MAT.12.3.2-a.html` — kapak: **MAT.12.2.2** ⚠ | 6 | `7.0`→`7,0`, `20.0`→`20,0`, `3.0`→`3,0`, `11.0`→`11,0`, `3.5`→`3,5`, `0.0`→`0,0` | 7.0 br | kesin |
| `MAT.8.3.1-a.html` — kapak: **MAT.8.3.1** | 6 | `8.0`→`8,0`, `7.8`→`7,8`, `6.7`→`6,7` | a Kenarı: 8.0 br | kesin |
| `MAT.11.1.2-a.html` — kapak: **MAT.11.3.2** ⚠ | 4 | `0.0`→`0,0`, `5.0`→`5,0`, `1.0`→`1,0`, `6.28`→`6,28` | 0.0 saniye | kesin |
| `MAT.12.2.6-a.html` — kapak: **MAT.12.4.6** ⚠ | 4 | `2.0`→`2,0`, `1.00`→`1,00`, `0.20`→`0,20` | x₀ = -2.0 | kesin |
| `MAT.10.2.6-a.html` — kapak: **MAT.10.4.6** ⚠ | 3 | `0.0`→`0,0`, `10.0`→`10,0`, `4.2`→`4,2` | Yükseklik (m) 0.0 | kesin |
| `MAT.10.5.1-a.html` — kapak: **MAT.10.6.1** ⚠ | 3 | `1.00`→`1,00`, `4.00`→`4,00`, `3.33`→`3,33` | İzdüşüm Oranı: Δx₁/Δx₂ = Δy₁/Δy₂ = 1.00 | kesin |
| `MAT.11.1.4-a.html` — kapak: **MAT.11.3.4** ⚠ | 3 | `1.00`→`1,00`, `2.00`→`2,00` | Girdi (x): 1.00 | kesin |
| `MAT.10.4.2-a.html` — kapak: **MAT.10.1.2** ⚠ | 2 | `2.0`→`2,0`, `4.0`→`4,0` | 2.0 | kesin |
| `MAT.12.1.5-a.html` — kapak: **MAT.12.1.5** | 2 | `17.5`→`17,5` | 17.5 TL/m³ | kesin |
| `MAT.12.5.1-a.html` — kapak: **MAT.12.5.1** | 2 | `1.3`→`1,3`, `0.00`→`0,00` | Kilitlendi (m ≈ -1.3) | kesin |
| `MAT.8.5.3-a.html` — kapak: **MAT.8.5.3** | 2 | `2.5`→`2,5`, `1.5`→`1,5` | Başlangıç: x = -2.5, z = -1.5 | kesin |
| `MAT.11.1.6-a.html` — kapak: **MAT.11.3.6** ⚠ | 1 | `1.5`→`1,5` | \( R = 1.5 \) | kesin |
| `MAT.12.1.4-a.html` — kapak: **MAT.12.1.4** | 1 | `2.60`→`2,60` | y = +2.60 | kesin |
| `MAT.12.4.2-a.html` — kapak: **MAT.12.3.2** ⚠ | 1 | `0.75`→`0,75` | 0.75 πr² = 0.75 πr² | kesin |
| `MAT.8.2.2-a.html` — kapak: **MAT.8.2.2** | 1 | `0.0`→`0,0` | Zaman (sn) 0.0 | kesin |
| `MAT.9.2.3-a.html` — kapak: **MAT.9.2.3** | 1 | `0.0`→`0,0` | 0.0 saat | kesin |
| `MAT.H.1.1-a.html` — kapak: **MAT.H.1.1** | 1 | `0.0`→`0,0` | m = 0.0 | kesin |

### 4.2 Betikte noktalı biçimlenen sayılar (olası)

Aşağıdaki sayfaların betikleri sayıyı `toFixed(...)` ile biçimlendiriyor ve sonucu virgüle çeviren bir kod (`replace(".", ",")`, `toLocaleString("tr")`) içermiyor. Bu sayılar ekrana yazılıyorsa öğrenci etkileşim sırasında noktalı ondalık görür ([SY-8]). Statik metinde görünmediği için tek tek doğrulanamadı.

| Dosya — kapaktaki kod | `toFixed` sayısı |
|---|---:|
| `MAT.1.1.5-a.html` — kapak: **MAT.1.1.5** | 3 |
| `MAT.1.2.1-a.html` — kapak: **MAT.1.2.1** | 7 |
| `MAT.1.3.2-a.html` — kapak: **MAT.1.3.2** | 7 |
| `MAT.10.1.2-a.html` — kapak: **MAT.10.3.2** | 16 |
| `MAT.10.2.1-a.html` — kapak: **MAT.10.4.1** | 27 |
| `MAT.10.3.1-a.html` — kapak: **MAT.10.5.1** | 2 |
| `MAT.10.3.2-a.html` — kapak: **MAT.10.5.2** | 2 |
| `MAT.11.1.8-a.html` — kapak: **MAT.11.3.8** | 2 |
| `MAT.11.2.3-a.html` — kapak: **MAT.11.2.3** | 8 |
| `MAT.11.2.4-a.html` — kapak: **MAT.11.2.4** | 2 |
| `MAT.12.1.1-a.html` — kapak: **MAT.12.1.1** | 11 |
| `MAT.12.1.4-a.html` — kapak: **MAT.12.1.4** | 45 |
| `MAT.12.2.6-a.html` — kapak: **MAT.12.4.6** | 4 |
| `MAT.12.3.1-a.html` — kapak: **MAT.12.2.1** | 6 |
| `MAT.2.1.6-a.html` — kapak: **MAT.2.1.6** | 3 |
| `MAT.2.1.7-a.html` — kapak: **MAT.2.1.7** | 11 |
| `MAT.2.2.5-a.html` — kapak: **MAT.2.2.5** | 2 |
| `MAT.3.1.12-a.html` — kapak: **MAT.3.1.12** | 10 |
| `MAT.3.1.13-a.html` — kapak: **MAT.3.1.13** | 4 |
| `MAT.3.1.6-a.html` — kapak: **MAT.3.1.6** | 5 |
| `MAT.3.2.8-a.html` — kapak: **MAT.3.2.8** | 5 |
| `MAT.3.3.2-a.html` — kapak: **MAT.3.3.2** | 1 |
| `MAT.3.3.3-a.html` — kapak: **MAT.3.3.3** | 4 |
| `MAT.4.2.5-v2-a.html` — kapak: **MAT.4.2.5** | 6 |
| `MAT.4.2.6-a.html` — kapak: **MAT.4.2.6** | 2 |
| `MAT.4.3.10-a.html` — kapak: **MAT.4.3.10** | 3 |
| `MAT.4.3.5-a.html` — kapak: **MAT.4.3.5** | 7 |
| `MAT.4.3.7-a.html` — kapak: **MAT.4.3.7** | 8 |
| `MAT.5.1.1-a.html` — kapak: **MAT.5.1.1** | 4 |
| `MAT.5.2.4-a.html` — kapak: **MAT.5.2.4** | 1 |
| `MAT.5.3.2-a.html` — kapak: **MAT.5.3.2** | 46 |
| `MAT.5.3.3-a.html` — kapak: **MAT.5.3.3** | 7 |
| `MAT.5.3.5-a.html` — kapak: **MAT.5.3.5** | 30 |
| `MAT.5.3.7-a.html` — kapak: **MAT.5.3.7** | 63 |
| `MAT.5.4.1-a.html` — kapak: **MAT.5.4.1** | 8 |
| `MAT.6.3.2-a.html` — kapak: **MAT.6.3.2** | 26 |
| `MAT.6.5.1-a.html` — kapak: **MAT.6.5.1** | 1 |
| `MAT.7.3.1-a.html` — kapak: **MAT.7.3.1** | 1 |
| `MAT.7.4.1-a.html` — kapak: **MAT.7.4.1** | 2 |
| `MAT.7.4.10-a.html` — kapak: **MAT.7.4.10** | 1 |
| `MAT.7.4.7-a.html` — kapak: **MAT.7.4.7** | 15 |
| `MAT.7.4.9-a.html` — kapak: **MAT.7.4.9** | 7 |
| `MAT.7.5.2-a.html` — kapak: **MAT.7.5.2** | 6 |
| `MAT.8.1.1-a.html` — kapak: **MAT.8.1.1** | 4 |
| `MAT.8.1.3-a.html` — kapak: **MAT.8.1.3** | 6 |
| `MAT.8.2.2-a.html` — kapak: **MAT.8.2.2** | 5 |
| `MAT.8.2.4-a.html` — kapak: **MAT.8.2.4** | 1 |
| `MAT.8.4.1-a.html` — kapak: **MAT.8.4.1** | 66 |
| `MAT.8.4.3-a.html` — kapak: **MAT.8.4.3** | 25 |
| `MAT.9.2.3-a.html` — kapak: **MAT.9.2.3** | 23 |
| `MAT.9.5.1-a.html` — kapak: **MAT.9.4.1** | 36 |
| `MAT.H.2.1-a.html` — kapak: **MAT.H.2.1** | 1 |
| `MAT.H.3.1-a.html` — kapak: **MAT.H.3.1** | 1 |
| `MAT.H.3.2-a.html` — kapak: **MAT.H.3.2** | 2 |
| `MAT.H.4.1-a.html` — kapak: **MAT.H.4.1** | 3 |
| `MAT.H.4.3-a.html` — kapak: **MAT.H.4.3** | 19 |
| `MAT.H.4.4-a.html` — kapak: **MAT.H.4.4** | 1 |
| `MAT.H.4.5-a.html` — kapak: **MAT.H.4.5** | 27 |
| `MAT.H.5.1-a.html` — kapak: **MAT.H.5.1** | 6 |

### 4.3 Üleştirme sayısı rakamla, yüzde, birim

| Dosya — kapaktaki kod | Bölüm | Bağlam | Yazılan → Önerilen | Kural | Güven |
|---|---|---|---|---|---|
| `MAT.10.6.1-a.html` — kapak: **MAT.10.2.1** ⚠ | sayfa 12 | Grup toplamına oranla: 35 / 50 = % 70. | `% 70` → **%70** | [SY-5](https://tdk.gov.tr/icerik/yazim-kurallari/sayilarin-yazilisi/) | kesin |
| `MAT.3.2.6-a.html` — kapak: **MAT.3.2.6** | sayfa 11 | Ali, stanttaki 5 hediye kutusunun her birinde 6'şar oyuncak olduğunu görerek toplam oyuncak sayısını  ⟦M⟧  şekl… | `6'şar` → **altışar** | [SY-11](https://tdk.gov.tr/icerik/yazim-kurallari/sayilarin-yazilisi/) | kesin |
| `MAT.3.3.4-a.html` — kapak: **MAT.3.3.4** | sayfa 7 | 5cm | `5cm` → **5 cm** | [SY-17](https://tdk.gov.tr/icerik/yazim-kurallari/sayilarin-yazilisi/) | olası |
| `MAT.6.1.1-a.html` — kapak: **MAT.6.1.1** | sayfa 2 | 6'nın katları 6'şar artarak sayı doğrusunda sonsuza uzanır. | `6'şar` → **altışar** | [SY-11](https://tdk.gov.tr/icerik/yazim-kurallari/sayilarin-yazilisi/) | kesin |
| `MAT.6.1.1-a.html` — kapak: **MAT.6.1.1** | sayfa 5 | Sütun ekledikçe kare sayısı 3'er artıyor, model katları da gösterir. | `3'er` → **üçer** | [SY-11](https://tdk.gov.tr/icerik/yazim-kurallari/sayilarin-yazilisi/) | kesin |
| `MAT.6.1.4-a.html` — kapak: **MAT.6.1.4** | sayfa 2 | 24 kg pirinç 6'şar kilogram olarak kaç torbaya boşaltılacak, hesaplayalım. | `6'şar` → **altışar** | [SY-11](https://tdk.gov.tr/icerik/yazim-kurallari/sayilarin-yazilisi/) | kesin |
| `MAT.6.4.1-a.html` — kapak: **MAT.6.4.1** | sayfa 7 | Bir dikdörtgensel bölgenin ardışık kenar uzunlukları 10'ar kat büyütülüyor. Alan, ardışık kenar uzunluklarının çarpımı… | `10'ar` → **onar** | [SY-11](https://tdk.gov.tr/icerik/yazim-kurallari/sayilarin-yazilisi/) | kesin |
| `MAT.9.3.1-a.html` — kapak: **MAT.9.5.1** ⚠ | sayfa 11 | 10 ve 14'ten 3'er çıkaralım: 0'a uğramadan negatife geçiliyor mu | `3'er` → **üçer** | [SY-11](https://tdk.gov.tr/icerik/yazim-kurallari/sayilarin-yazilisi/) | kesin |
| `MAT.9.3.1-a.html` — kapak: **MAT.9.5.1** ⚠ | sayfa 11 | 3'ün katından 3'er çıkarınca tam 0'a ulaşılır | `3'er` → **üçer** | [SY-11](https://tdk.gov.tr/icerik/yazim-kurallari/sayilarin-yazilisi/) | kesin |
| `MAT.9.3.1-a.html` — kapak: **MAT.9.5.1** ⚠ | sayfa 13 | 20'den 3'er çıkarınca 2'den −1'e atlanır; n = 0 hiç olmaz. | `3'er` → **üçer** | [SY-11](https://tdk.gov.tr/icerik/yazim-kurallari/sayilarin-yazilisi/) | kesin |

### 4.4 Saatte iki nokta (olası)

TDK saati noktayla yazar (*08.30*). Bu bulgular saat okuma sayfalarındaki dijital saat göstergelerinden geliyor; dijital ekran görünümü bilinçli olarak taklit ediliyorsa korunabilir. Sayfa başına toplandı; tek tek geçişler CSV dosyasında.

| Dosya — kapaktaki kod | Geçiş | Bölümler | Örnekler (yazılan → önerilen) | Örnek bağlam | Güven |
|---|---:|---|---|---|---|
| `MAT.3.1.12-a.html` — kapak: **MAT.3.1.12** | 22 | kapak, sayfa 10, sayfa 8, sayfa 9 | `08:30`→`08.30`, `14:00`→`14.00`, `00:00`→`00.00`, `16:00`→`16.00`, `04:00`→`04.00` … | 08:30 | olası |
| `MAT.2.1.9-a.html` — kapak: **MAT.2.1.9** | 11 | kapak, sayfa 2, sayfa 3, sayfa 4, sayfa 5, sayfa 6, sayfa 7 | `02:30`→`02.30`, `08:30`→`08.30`, `03:00`→`03.00`, `02:15`→`02.15`, `02:45`→`02.45` … | Saat 2 buçuk (02:30) | olası |
| `MAT.3.1.13-a.html` — kapak: **MAT.3.1.13** | 1 | kapak | `08:30`→`08.30` | 08:30 | olası |
| `MAT.3.1.14-a.html` — kapak: **MAT.3.1.14** | 1 | kapak | `08:30`→`08.30` | 08:30 | olası |
| `MAT.7.1.7-a.html` — kapak: **MAT.7.1.7** | 1 | sayfa 1 | `12:00`→`12.00` | 12:00 | olası |

### 4.5 Binlik ayırıcı — üslup kararı

[SY-7] TDK dört ve daha çok basamaklı sayıları sondan üçlü gruplara ayırıp araya nokta koyar (*1.000; 4.567; 326.197*). İçerikler ise MEB matematik ders kitabı üslubunu izliyor: dört basamaklı sayılar ayırıcısız (*1450*), beş ve daha çok basamaklılar boşlukla (*10 000*). Bu bir yazım yanlışından çok kurumsal üslup kararıdır; karar verilirse bütün içeriğe tek seferde uygulanmalı. (Not: TDK'nin nokta kullanımı, matematikte çarpma noktasıyla karışabilir: [MN-3].)

| Dosya — kapaktaki kod | 4 basamak, ayırıcısız | 5+ basamak, ayırıcısız | Boşlukla gruplanmış |
|---|---:|---:|---:|
| `MAT.4.1.4-a.html` — kapak: **MAT.4.1.4** | 97 | 0 | 0 |
| `MAT.4.1.3-v2-a.html` — kapak: **MAT.4.1.3** | 64 | 0 | 0 |
| `MAT.4.1.1-a.html` — kapak: **MAT.4.1.1** | 8 | 32 | 12 |
| `MAT.11.1.6-a.html` — kapak: **MAT.11.3.6** ⚠ | 5 | 1 | 32 |
| `MAT.10.1.3-a.html` — kapak: **MAT.10.3.3** ⚠ | 34 | 2 | 0 |
| `MAT.5.1.1-a.html` — kapak: **MAT.5.1.1** | 0 | 1 | 33 |
| `MAT.4.1.2-a.html` — kapak: **MAT.4.1.2** | 5 | 4 | 17 |
| `MAT.4.1.13-v2-a.html` — kapak: **MAT.4.1.13** | 25 | 0 | 0 |
| `MAT.3.1.15-v2-a.html` — kapak: **MAT.3.1.15** | 24 | 0 | 0 |
| `MAT.6.1.7-a.html` — kapak: **MAT.6.1.8** ⚠ | 21 | 0 | 0 |
| `MAT.12.5.1-a.html` — kapak: **MAT.12.5.1** | 16 | 0 | 4 |
| `MAT.4.1.3-a.html` — kapak: **MAT.4.1.3** | 5 | 2 | 10 |
| `MAT.7.4.5-a.html` — kapak: **MAT.7.4.5** | 17 | 0 | 0 |
| `MAT.4.2.2-v2-a.html` — kapak: **MAT.4.2.2** | 14 | 0 | 0 |
| `MAT.6.1.2-a.html` — kapak: **MAT.6.1.2** | 8 | 3 | 2 |
| `MAT.12.1.5-a.html` — kapak: **MAT.12.1.5** | 6 | 3 | 2 |
| `MAT.4.1.13-a.html` — kapak: **MAT.4.1.13** | 10 | 0 | 1 |
| `MAT.11.3.1-a.html` — kapak: **MAT.11.1.1** ⚠ | 10 | 0 | 0 |
| `MAT.9.7.1-a.html` — kapak: **MAT.9.7.1** | 10 | 0 | 0 |
| `MAT.9.2.2-a.html` — kapak: **MAT.9.2.2** | 0 | 10 | 0 |
| `MAT.10.1.2-a.html` — kapak: **MAT.10.3.2** ⚠ | 5 | 4 | 0 |
| `MAT.10.7.2-a.html` — kapak: **MAT.10.7.2** | 9 | 0 | 0 |
| `MAT.4.2.4-a.html` — kapak: **MAT.4.2.4** | 9 | 0 | 0 |
| `MAT.3.1.3-a.html` — kapak: **MAT.3.1.3** | 8 | 0 | 0 |
| `MAT.6.4.1-a.html` — kapak: **MAT.6.4.1** | 3 | 0 | 5 |
| `MAT.3.1.1-a.html` — kapak: **MAT.3.1.1** | 7 | 0 | 0 |
| `MAT.11.1.3-a.html` — kapak: **MAT.11.3.3** ⚠ | 2 | 0 | 5 |
| `MAT.5.2.1-a.html` — kapak: **MAT.5.2.1** | 7 | 0 | 0 |
| `MAT.12.2.2-a.html` — kapak: **MAT.12.4.2** ⚠ | 3 | 2 | 1 |
| `MAT.6.1.5-b.html` — kapak: **MAT.6.1.5** | 4 | 0 | 2 |
| `MAT.12.1.1-a.html` — kapak: **MAT.12.1.1** | 4 | 0 | 2 |
| `MAT.3.1.15-a.html` — kapak: **MAT.3.1.15** | 6 | 0 | 0 |
| `MAT.10.2.3-a.html` — kapak: **MAT.10.4.3** ⚠ | 5 | 0 | 0 |
| `MAT.9.7.2-a.html` — kapak: **MAT.9.7.2** | 5 | 0 | 0 |
| `MAT.4.2.2-a.html` — kapak: **MAT.4.2.2** | 5 | 0 | 0 |
| `MAT.3.1.2-a.html` — kapak: **MAT.3.1.2** | 4 | 0 | 0 |
| `MAT.12.2.1-a.html` — kapak: **MAT.12.4.1** ⚠ | 3 | 0 | 0 |
| `MAT.3.1.4-a.html` — kapak: **MAT.3.1.4** | 3 | 0 | 0 |
| `MAT.12.2.3-a.html` — kapak: **MAT.12.4.3** ⚠ | 0 | 0 | 3 |
| `MAT.6.4.4-a.html` — kapak: **MAT.6.4.4** | 0 | 0 | 3 |
| `MAT.6.6.1-a.html` — kapak: **MAT.6.6.1** | 3 | 0 | 0 |
| `MAT.11.1.5-a.html` — kapak: **MAT.11.3.5** ⚠ | 2 | 0 | 0 |
| `MAT.11.2.4-a.html` — kapak: **MAT.11.2.4** | 2 | 0 | 0 |
| `MAT.H.1.1-a.html` — kapak: **MAT.H.1.1** | 2 | 0 | 0 |
| `MAT.2.1.8-a.html` — kapak: **MAT.2.1.8** | 2 | 0 | 0 |
| `MAT.4.2.3-a.html` — kapak: **MAT.4.2.3** | 2 | 0 | 0 |
| `MAT.7.1.5-a.html` — kapak: **MAT.7.1.5** | 2 | 0 | 0 |
| `MAT.7.1.7-a.html` — kapak: **MAT.7.1.7** | 2 | 0 | 0 |
| `MAT.8.1.1-a.html` — kapak: **MAT.8.1.1** | 1 | 1 | 0 |
| `MAT.H.5.1-a.html` — kapak: **MAT.H.5.1** | 2 | 0 | 0 |
| `MAT.3.1.11-a.html` — kapak: **MAT.3.1.11** | 1 | 0 | 0 |
| `MAT.3.1.5-a.html` — kapak: **MAT.3.1.5** | 1 | 0 | 0 |
| `MAT.3.1.6-a.html` — kapak: **MAT.3.1.6** | 1 | 0 | 0 |
| `MAT.3.1.8-a.html` — kapak: **MAT.3.1.8** | 1 | 0 | 0 |
| `MAT.5.1.2-a.html` — kapak: **MAT.5.1.2** | 1 | 0 | 0 |
| `MAT.10.2.6-a.html` — kapak: **MAT.10.4.6** ⚠ | 1 | 0 | 0 |
| `MAT.10.4.1-a.html` — kapak: **MAT.10.1.1** ⚠ | 1 | 0 | 0 |
| `MAT.10.6.2-a.html` — kapak: **MAT.10.2.2** ⚠ | 1 | 0 | 0 |
| `MAT.11.1.2-a.html` — kapak: **MAT.11.3.2** ⚠ | 0 | 0 | 1 |
| `MAT.12.2.5-a.html` — kapak: **MAT.12.4.5** ⚠ | 1 | 0 | 0 |
| `MAT.4.2.7-a.html` — kapak: **MAT.4.2.7** | 1 | 0 | 0 |
| `MAT.4.2.8-a.html` — kapak: **MAT.4.2.8** | 1 | 0 | 0 |
| `MAT.5.2.4-a.html` — kapak: **MAT.5.2.4** | 1 | 0 | 0 |
| `MAT.5.5.1-a.html` — kapak: **MAT.5.5.1** | 1 | 0 | 0 |
| `MAT.6.2.1-a.html` — kapak: **MAT.6.2.1** | 1 | 0 | 0 |
| `MAT.8.1.2-a.html` — kapak: **MAT.8.1.2** | 0 | 1 | 0 |
| `MAT.8.2.2-a.html` — kapak: **MAT.8.2.2** | 1 | 0 | 0 |
| `MAT.8.4.3-a.html` — kapak: **MAT.8.4.3** | 0 | 1 | 0 |
| `MAT.8.6.1-a.html` — kapak: **MAT.8.6.1** | 1 | 0 | 0 |
| `MAT.9.6.2-a.html` — kapak: **MAT.9.6.2** | 0 | 1 | 0 |

## 5. Birleşik kelime

Dayanak: [BK-17] matematik terimleri sözlükteki madde biçimine göre yazılır; [SY-4] sayı adları ayrı yazılır. Bağlantı: https://tdk.gov.tr/icerik/yazim-kurallari/bitisik-yazilan-birlesik-kelimeler/ · https://sozluk.gov.tr/

### 5.1 birim kare / birim küp → birimkare / birimküp

Sözlükte *birimkare* ("alanın hesaplanmasında kullanılan birim") ve *birimküp* bitişik madde; ayrı yazılışları sözlükte yok. İçeriklerde her yerde ayrı yazılmış. Güven "kesin" (sözlüğe göre); ancak MEB kitaplarındaki kullanımla birlikte bir üslup kararı olarak da değerlendirilebilir.

| Dosya — kapaktaki kod | Geçiş | Yazılan biçimler | Örnek bağlam |
|---|---:|---|---|
| `MAT.5.4.2-a.html` — kapak: **MAT.5.4.2** | 51 | `Birim Kare`, `Birim karelerden`, `Birim kareler`, `Birim kare`, `birim kareyle` … | Birim Kare |
| `MAT.7.4.4-a.html` — kapak: **MAT.7.4.4** | 40 | `birim küp`, `birim küple`, `Birim küp`, `Birim küpler`, `birim küptür` … | birim küp |
| `MAT.7.4.3-a.html` — kapak: **MAT.7.4.3** | 40 | `Birim küp`, `birim küp`, `birim küpleri`, `birim küplerle`, `birim küptür` … | Toplam Hacim = 36 Birim küp |
| `MAT.2.3.6-a.html` — kapak: **MAT.2.3.6** | 13 | `Birim Kare`, `birim kare`, `birim karelerle`, `birim karelere`, `birim kareye` | Birim Kare |
| `MAT.8.1.1-a.html` — kapak: **MAT.8.1.1** | 12 | `birim küp`, `birim kare`, `Birim Küp` | ⟦M⟧  birim küp |
| `MAT.H.4.1-a.html` — kapak: **MAT.H.4.1** | 11 | `Birim Küp`, `birim küp`, `Birim küplerden`, `Birim küpler`, `Birim küpü` | Birim Küp |
| `MAT.7.4.2-a.html` — kapak: **MAT.7.4.2** | 11 | `Birim kareler`, `birim karelerini`, `Birim Karelerle`, `Birim kareli`, `birim kare` | Birim kareler toplamı doğru hesaplandı. |
| `MAT.9.5.4-a.html` — kapak: **MAT.9.4.4** ⚠ | 9 | `birim kare`, `Birim kareleri`, `Birim Kareler` | / 25 birim kare |
| `MAT.9.1.1-a.html` — kapak: **MAT.9.1.1** | 8 | `Birim Küp`, `Birim küpü`, `Birim küp`, `birim küplerle` | Birim Küp |
| `MAT.12.1.1-a.html` — kapak: **MAT.12.1.1** | 7 | `birim karedeki`, `Birim kare`, `Birim Kare`, `birim kareye` | Alan kartlarını birim karedeki eşleşen dilimlere sürükleyelim. |
| `MAT.6.1.1-a.html` — kapak: **MAT.6.1.1** | 7 | `birim kare`, `birim kareyi`, `Birim kareler`, `Birim kare` | 3 sıralı dikdörtgenlerdeki birim kare sayıları 3'ün katlarıdır. |
| `MAT.5.4.4-a.html` — kapak: **MAT.5.4.4** | 6 | `Birim Kare`, `birim kare`, `Birim kare` | Birim Kare |
| `MAT.6.4.3-a.html` — kapak: **MAT.6.4.3** | 6 | `Birim kareleri`, `birim kare`, `Birim kareli`, `birim kareleri`, `birim karelerle` | Birim kareleri yeniden sayalım. |
| `MAT.10.3.1-a.html` — kapak: **MAT.10.5.1** ⚠ | 5 | `birim küp` | 6 birim küp (3 × 2 düşey blok) |
| `MAT.5.2.3-a.html` — kapak: **MAT.5.2.3** | 5 | `birim küp`, `Birim Küpten` | 1. adımda 5, 2. adımda 9, 3. adımda 13 birim küp içeren bir blok örüntüsünde, adımlar arasındaki sab |
| `MAT.6.1.6-a.html` — kapak: **MAT.6.1.6** | 5 | `Birim Küp`, `birim küpün`, `birim küpü` | 1 Tam Birim Küp |
| `MAT.6.4.2-a.html` — kapak: **MAT.6.4.2** | 5 | `Birim kareli`, `birim kare`, `Birim Kare`, `Birim kare` | Birim kareli ızgara üzerindeki bir dikdörtgenin tabanı 6 birim ve yüksek… |
| `MAT.7.4.9-a.html` — kapak: **MAT.7.4.9** | 5 | `birim kare`, `Birim kare`, `birim kareler`, `birim kareleri` | Çözüm: taban × yükseklik = 8 × 3 = 24 birim kare. |
| `MAT.8.3.5-a.html` — kapak: **MAT.8.3.5** | 5 | `Birim Küp`, `birim küpler`, `birim kare` | Birim Küp Dengesi |
| `MAT.1.1.8-a.html` — kapak: **MAT.1.1.8** | 4 | `birim küp`, `Birim Küp` | …kırmızı oyuncak arabayı dengelemek için yaklaşık kaç ahşap birim küp gerekir? |
| `MAT.2.1.1-a.html` — kapak: **MAT.2.1.1** | 4 | `birim küpten`, `birim küpü`, `Birim Küp`, `Birim küpleri` | 5 onluk blok ve 2 birim küpten oluşan model hangi sayıya karşılık gelir? |
| `MAT.2.1.3-a.html` — kapak: **MAT.2.1.3** | 4 | `Birim Küplü` | 7 Birim Küplü Kule |
| `MAT.3.1.7-a.html` — kapak: **MAT.3.1.7** | 4 | `birim kareleri`, `Birim Kare`, `birim küp` | Adımdaki birim kareleri sayalım. |
| `MAT.6.2.2-a.html` — kapak: **MAT.6.2.2** | 4 | `Birim Küp`, `Birim küpleri` | Birim Küp |
| `MAT.7.6.2-a.html` — kapak: **MAT.7.6.2** | 4 | `Birim Küp`, `Birim küpü`, `birim küpün` | Birim Küp |
| `MAT.4.3.10-a.html` — kapak: **MAT.4.3.10** | 4 | `birim küp`, `birim kare` | Her katında 4 birim küp bulunan 3 katlı kule için toplam kaç birim küp gerekir? |
| `MAT.6.1.3-a.html` — kapak: **MAT.6.1.3** | 4 | `Birim karelerle`, `birim kareleri`, `Birim kareleri` | Birim karelerle yalnızca tek sıra hâlinde dikdörtgen oluşturabilen, yani 1… |
| `MAT.9.1.4-a.html` — kapak: **MAT.9.1.4** | 4 | `birim küp`, `Birim küplerden`, `birim küplerin`, `Birim küp` | 24 birim küp |
| `MAT.7.4.6-a.html` — kapak: **MAT.7.4.6** | 4 | `birim küpler`, `birim küp` | …tları 4 ve 3 birim, yüksekliği 5 birim olan kargo kolisi ve birim küpler 3B sahnesi |
| `MAT.8.3.6-a.html` — kapak: **MAT.8.3.6** | 4 | `Birim kare`, `birim kareleri` | 9 Birim kare |
| `MAT.10.1.1-a.html` — kapak: **MAT.10.3.1** ⚠ | 3 | `birim küple`, `Birim Küpler`, `birim küpten` | ⟦M⟧  birim küple oluşturulan bir prizmanın ayrıt uzunlukları belirlenirken s… |
| `MAT.10.4.3-a.html` — kapak: **MAT.10.1.3** ⚠ | 3 | `birim kare`, `Birim kareli` | 2 · 1/2 = 1, iki üçgenin alanı da 12 birim kare |
| `MAT.5.1.1-a.html` — kapak: **MAT.5.1.1** | 3 | `Birim Küp`, `Birim küpleri` | Birim Küp |
| `MAT.8.6.2-a.html` — kapak: **MAT.8.6.2** | 3 | `Birim Küp`, `Birim küpü` | Birim Küp |
| `MAT.5.1.3-a.html` — kapak: **MAT.5.1.3** | 3 | `birim kareleri`, `birim kareden`, `birim kareyi` | Önce birim kareleri boyayalım. |
| `MAT.5.4.3-a.html` — kapak: **MAT.5.4.3** | 3 | `birim kare`, `birim karedir` | Kenar uzunlukları doğal sayı ve alanı 16 birim kare olan bir dikdörtgenin kenar uzunlukları 2 birim  |
| `MAT.7.4.7-a.html` — kapak: **MAT.7.4.7** | 3 | `birim kare` | 1π birim kare |
| `MAT.10.1.3-a.html` — kapak: **MAT.10.3.3** ⚠ | 2 | `Birim Küp` | 7 Birim Küp (Dışarıda) |
| `MAT.2.1.4-a.html` — kapak: **MAT.2.1.4** | 2 | `birim küpten`, `birim küp` | 20 birim küpten oluşan kule sahnesi |
| `MAT.3.2.8-a.html` — kapak: **MAT.3.2.8** | 2 | `birim küpleri`, `Birim Küp` | Sağ kefeye eksik birim küpleri ekleyerek teraziyi dengeleyelim. |
| `MAT.7.2.1-a.html` — kapak: **MAT.7.2.1** | 2 | `Birim Küp`, `birim küpten` | Birim Küp |
| `MAT.4.1.6-a.html` — kapak: **MAT.4.1.6** | 2 | `birim küpten`, `birim küplere` | Her blok 4 eş birim küpten oluşan bir bütünü ( ⟦M⟧ ) simgeler. |
| `MAT.4.3.3-a.html` — kapak: **MAT.4.3.3** | 2 | `Birim kareli` | Geometri Tahtası: Birim kareli modeller ve şekiller için uygundur. |
| `MAT.4.3.4-a.html` — kapak: **MAT.4.3.4** | 2 | `birim kare` | 1 birim kare pul |
| `MAT.9.5.3-a.html` — kapak: **MAT.9.4.3** ⚠ | 2 | `Birim kareleri`, `birim kareleri` | Birim kareleri yeniden sayalım. |
| `MAT.5.2.1-a.html` — kapak: **MAT.5.2.1** | 2 | `Birim küplerden`, `birim kare` | Birim küplerden oluşan prizma ve katman ayırma 3B sahnesi |
| `MAT.6.1.2-a.html` — kapak: **MAT.6.1.2** | 2 | `birim küp` | birim küp |
| `MAT.7.3.1-a.html` — kapak: **MAT.7.3.1** | 2 | `birim kareler` | Köşelerden sadece yatay birim kareler sayılarak simetri doğrusunun diğer tarafına geçilmelidir. |
| `MAT.7.4.5-a.html` — kapak: **MAT.7.4.5** | 2 | `Birim Küp`, `birim küplere` | Birim Küp (Dağılıyor) |
| `MAT.1.2.2-a.html` — kapak: **MAT.1.2.2** | 1 | `birim küp` | Küp Ekle sarı birim küp |
| `MAT.2.1.5-a.html` — kapak: **MAT.2.1.5** | 1 | `birim küp` | 4 adet birim küp kulesi |
| `MAT.3.1.6-a.html` — kapak: **MAT.3.1.6** | 1 | `Birim Küp` | 3B Birim Küp Kuleleri ile Çift Sayıların Toplamı Sahnesi |
| `MAT.H.4.3-a.html` — kapak: **MAT.H.4.3** | 1 | `Birim Küp` | Birim Küp |
| `MAT.4.2.1-a.html` — kapak: **MAT.4.2.1** | 1 | `birim küpleri` | 8 birimlik kuleyi 10'a tamamlamak için sağ kuledeki birim küpleri sol kuleye taşıyalım. |
| `MAT.4.3.8-a.html` — kapak: **MAT.4.3.8** | 1 | `Birim kareleri` | Birim kareleri yeniden sayalım. |
| `MAT.8.2.1-a.html` — kapak: **MAT.8.2.1** | 1 | `Birim kareleri` | Birim kareleri yeniden sayalım. |
| `MAT.8.5.2-a.html` — kapak: **MAT.8.5.2** | 1 | `Birim kareleri` | Birim kareleri yeniden sayalım. |
| `MAT.4.3.9-a.html` — kapak: **MAT.4.3.9** | 1 | `birim karelerle` | Üçgenin alanını birim karelerle hesaplamak |
| `MAT.7.1.5-a.html` — kapak: **MAT.7.1.5** | 1 | `birim küplerle` | Somut birim küplerle oran korunum modeli |
| `MAT.7.2.3-a.html` — kapak: **MAT.7.2.3** | 1 | `birim küptür` | …ler 4 blok yüksekliğinde eşitlendi. Toplam hacim 3 × 4 = 12 birim küptür. |
| `MAT.8.1.3-a.html` — kapak: **MAT.8.1.3** | 1 | `Birim kare` | Birim kare ve hipotenüs köşegen mekanizması 3B sahnesi |

### 5.2 Öteki birleşik yazım bulguları

| Dosya — kapaktaki kod | Bölüm | Bağlam | Yazılan → Önerilen | Kural | Güven |
|---|---|---|---|---|---|
| `MAT.11.2.5-a.html` — kapak: **MAT.11.2.5** | sayfa 6 | Onikigen Çardak Tabanı (12 Kenar) | `Onikigen` → **On ikigen** | [SY-4](https://tdk.gov.tr/icerik/yazim-kurallari/sayilarin-yazilisi/) | olası |
| `MAT.2.2.4-a.html` — kapak: **MAT.2.2.4** | sayfa 2 | Üç tane dört onikidir. | `onikidir` → **on ikidir** | [SY-4](https://tdk.gov.tr/icerik/yazim-kurallari/sayilarin-yazilisi/) | kesin |
| `MAT.6.3.4-a.html` — kapak: **MAT.6.3.4** | sayfa 2 | İkiz Kenar Yuvası <br>_ekran okuyucu etiketi (görünmez)_ | `İkiz Kenar` → **İkizkenar** | [BK-17](https://sozluk.gov.tr/) | kesin |
| `MAT.6.4.5-a.html` — kapak: **MAT.6.4.5** | sayfa 6 | Sabit Kat Sayı | `Sabit Kat Sayı` → **Sabit Katsayı** | [BK-17](https://sozluk.gov.tr/) | olası |
| `MAT.8.6.1-a.html` — kapak: **MAT.8.6.1** | sayfa 1 | Tamsayı adet | `Tamsayı` → **Tam sayı** | [BK-17](https://sozluk.gov.tr/) | kesin |

_Denetlenip sorun bulunmayanlar:_ *birçok, birkaç, herhangi, hiçbir, her şey, bir şey, art arda, yan yana, dikdörtgen, ikizkenar, eşkenar, paralelkenar, açıortay, kenarortay, yarıçap, katsayı, tam sayı, metrekare* ve yardımcı fiilli birleşikler (*fark etmek, kabul etmek*) doğru yazılmış. Yalnız iki yerde *tamsayı* bitişik geçiyordu; o da 5.2'de.

## 6. Noktalama

Dayanak: [NK-1] işaret önceki kelimeye bitişik yazılır, [NK-9] soru işareti. Bağlantı: https://tdk.gov.tr/icerik/yazim-kurallari/noktalama-isaretleri-aciklamalar/

| Dosya — kapaktaki kod | Bölüm | Bağlam | Yazılan → Önerilen | Kural | Güven |
|---|---|---|---|---|---|
| `MAT.1.3.4-a.html` — kapak: **MAT.1.3.4** | sayfa 3 | Öndeki yelken : üçgen | `yelken :` → **yelken:** | [NK-1](https://tdk.gov.tr/icerik/yazim-kurallari/noktalama-isaretleri-aciklamalar/) | kesin |
| `MAT.1.3.4-a.html` — kapak: **MAT.1.3.4** | sayfa 3 | Büyük yelken : üçgen | `yelken :` → **yelken:** | [NK-1](https://tdk.gov.tr/icerik/yazim-kurallari/noktalama-isaretleri-aciklamalar/) | kesin |
| `MAT.1.3.4-a.html` — kapak: **MAT.1.3.4** | sayfa 3 | Küçük yelken : üçgen | `yelken :` → **yelken:** | [NK-1](https://tdk.gov.tr/icerik/yazim-kurallari/noktalama-isaretleri-aciklamalar/) | kesin |
| `MAT.1.3.4-a.html` — kapak: **MAT.1.3.4** | sayfa 3 | Arkadaki yelken : üçgen | `yelken :` → **yelken:** | [NK-1](https://tdk.gov.tr/icerik/yazim-kurallari/noktalama-isaretleri-aciklamalar/) | kesin |
| `MAT.10.2.2-a.html` — kapak: **MAT.10.4.2** ⚠ | sayfa 17 | Grafik mi Tam Kare mi <br>_sayfa başlık özniteliği (ekranda görünmüyor olabilir)_ | `mi` → **mi?** | [NK-9](https://tdk.gov.tr/icerik/yazim-kurallari/noktalama-isaretleri-aciklamalar/) | olası |
| `MAT.10.2.4-a.html` — kapak: **MAT.10.4.4** ⚠ | sayfa 14 | Doğru mu Yanlış mı <br>_sayfa başlık özniteliği (ekranda görünmüyor olabilir)_ | `mı` → **mı?** | [NK-9](https://tdk.gov.tr/icerik/yazim-kurallari/noktalama-isaretleri-aciklamalar/) | olası |
| `MAT.11.1.3-a.html` — kapak: **MAT.11.3.3** ⚠ | sayfa 13 | Artan mı Azalan mı <br>_sayfa başlık özniteliği (ekranda görünmüyor olabilir)_ | `mı` → **mı?** | [NK-9](https://tdk.gov.tr/icerik/yazim-kurallari/noktalama-isaretleri-aciklamalar/) | olası |
| `MAT.12.2.7-a.html` — kapak: **MAT.12.4.7** ⚠ | sayfa 10 | Tanımla mı Kuralla mı <br>_sayfa başlık özniteliği (ekranda görünmüyor olabilir)_ | `mı` → **mı?** | [NK-9](https://tdk.gov.tr/icerik/yazim-kurallari/noktalama-isaretleri-aciklamalar/) | olası |
| `MAT.12.3.3-a.html` — kapak: **MAT.12.2.3** ⚠ | kapak | e Geliştirdiği stratejileri kullanarak problemi çözer . | `çözer .` → **çözer.** | [NK-1](https://tdk.gov.tr/icerik/yazim-kurallari/noktalama-isaretleri-aciklamalar/) | kesin |
| `MAT.12.3.3-a.html` — kapak: **MAT.12.2.3** ⚠ | sayfa 6 | Teğet Parçaları Doğru mu <br>_sayfa başlık özniteliği (ekranda görünmüyor olabilir)_ | `mu` → **mu?** | [NK-9](https://tdk.gov.tr/icerik/yazim-kurallari/noktalama-isaretleri-aciklamalar/) | olası |
| `MAT.12.5.1-a.html` — kapak: **MAT.12.5.1** | sayfa 13 | İlişki Neden-Sonuç mu <br>_sayfa başlık özniteliği (ekranda görünmüyor olabilir)_ | `mu` → **mu?** | [NK-9](https://tdk.gov.tr/icerik/yazim-kurallari/noktalama-isaretleri-aciklamalar/) | olası |
| `MAT.12.5.1-a.html` — kapak: **MAT.12.5.1** | sayfa 8 | Ortalama mı Medyan mı <br>_sayfa başlık özniteliği (ekranda görünmüyor olabilir)_ | `mı` → **mı?** | [NK-9](https://tdk.gov.tr/icerik/yazim-kurallari/noktalama-isaretleri-aciklamalar/) | olası |
| `MAT.6.1.4-a.html` — kapak: **MAT.6.1.4** | sayfa 7 | 15 ve 20 sayılarının , otobüslerin duraktan kalkışını belirtir | `sayılarının ,` → **sayılarının,** | [NK-1](https://tdk.gov.tr/icerik/yazim-kurallari/noktalama-isaretleri-aciklamalar/) | kesin |
| `MAT.7.1.5-a.html` — kapak: **MAT.7.1.5** | sayfa 2 | Toplamsal mı Çarpımsal mı <br>_sayfa başlık özniteliği (ekranda görünmüyor olabilir)_ | `mı` → **mı?** | [NK-9](https://tdk.gov.tr/icerik/yazim-kurallari/noktalama-isaretleri-aciklamalar/) | olası |
| `MAT.7.4.7-a.html` — kapak: **MAT.7.4.7** | sayfa 4 | 3 Daire Alanı :  ⟦M⟧ | `Alanı :` → **Alanı:** | [NK-1](https://tdk.gov.tr/icerik/yazim-kurallari/noktalama-isaretleri-aciklamalar/) | kesin |
| `MAT.7.6.1-a.html` — kapak: **MAT.7.6.1** | sayfa 17 | Veri Soruyu Cevaplıyor mu <br>_sayfa başlık özniteliği (ekranda görünmüyor olabilir)_ | `mu` → **mu?** | [NK-9](https://tdk.gov.tr/icerik/yazim-kurallari/noktalama-isaretleri-aciklamalar/) | olası |
| `MAT.7.6.2-a.html` — kapak: **MAT.7.6.2** | sayfa 3 | Eşit Pay : Her iki dilimin merkez açısı 180° olup payları birbirine eş… | `Pay :` → **Pay:** | [NK-1](https://tdk.gov.tr/icerik/yazim-kurallari/noktalama-isaretleri-aciklamalar/) | kesin |
| `MAT.9.1.2-a.html` — kapak: **MAT.9.1.2** | sayfa 14 | Kesişime Ait mi <br>_sayfa başlık özniteliği (ekranda görünmüyor olabilir)_ | `mi` → **mi?** | [NK-9](https://tdk.gov.tr/icerik/yazim-kurallari/noktalama-isaretleri-aciklamalar/) | olası |
| `MAT.9.1.3-a.html` — kapak: **MAT.9.1.3** | sayfa 4 | Doğal sayılarda 2 − 5 işleminin sonucu doğal sayı mı | `mı` → **mı?** | [NK-9](https://tdk.gov.tr/icerik/yazim-kurallari/noktalama-isaretleri-aciklamalar/) | olası |
| `MAT.9.3.1-a.html` — kapak: **MAT.9.5.1** ⚠ | sayfa 11 | 10 ve 14'ten 3'er çıkaralım: 0'a uğramadan negatife geçiliyor mu | `mu` → **mu?** | [NK-9](https://tdk.gov.tr/icerik/yazim-kurallari/noktalama-isaretleri-aciklamalar/) | olası |
| `MAT.9.3.1-a.html` — kapak: **MAT.9.5.1** ⚠ | sayfa 11 | Algoritma Durur mu <br>_sayfa başlık özniteliği (ekranda görünmüyor olabilir)_ | `mu` → **mu?** | [NK-9](https://tdk.gov.tr/icerik/yazim-kurallari/noktalama-isaretleri-aciklamalar/) | olası |

_Not:_ "Doğru mu Yanlış mı", "Grafik mi Tam Kare mi" gibi soru biçimli başlık ve düğme etiketleri soru işaretsiz; [NK-9]'a göre soru sözlerinin sonuna soru işareti konur. Boşluk doldurma yuvası içeren cümlelerdeki ve `40 cm : 100 cm` gibi oran gösterimindeki boşluklar bulgu sayılmadı.

## 7. Diğer yazım yanlışları

Yazım yanlışları, birleşik yazılmış kelimeler ve sözlüğe aykırı biçimler ([DI-7]: kelime düzeyinde son söz sözlüğündür).

| Dosya — kapaktaki kod | Bölüm | Bağlam | Yazılan → Önerilen | Kural | Güven |
|---|---|---|---|---|---|
| `MAT.1.4.1-a.html` — kapak: **MAT.1.4.1** | kapak | a Kategorik veriye dayalı istatiksel araştırma gerektiren günlük yaşam durumu belirler. | `istatiksel` → **istatistiksel** | [DI-7](https://sozluk.gov.tr/) | kesin |
| `MAT.10.7.2-a.html` — kapak: **MAT.10.7.2** | sayfa 1 | Verilen Bilgiyi Okuyalımyalım | `Okuyalımyalım` → **Okuyalım** | [DI-7](https://sozluk.gov.tr/) | kesin |
| `MAT.12.2.9-a.html` — kapak: **MAT.12.4.9** ⚠ | kapak | a Türev bilgisininkullanılabileceği problemlerdeki matematiksel bileşenleri (problemi temsil eden fonksiy… | `bilgisininkullanılabileceği` → **bilgisinin kullanılabileceği** | [DI-7](https://sozluk.gov.tr/) | kesin |
| `MAT.12.3.2-a.html` — kapak: **MAT.12.2.2** ⚠ | sayfa 18 | Işık Huzmesi | `Huzmesi` → **Hüzmesi** | [DI-7](https://sozluk.gov.tr/) | kesin |
| `MAT.12.3.2-a.html` — kapak: **MAT.12.2.2** ⚠ | sayfa 18 | Işık Huzmesi bileşenini sürükleyelim <br>_ekran okuyucu etiketi (görünmez)_ | `Huzmesi` → **Hüzmesi** | [DI-7](https://sozluk.gov.tr/) | kesin |
| `MAT.9.3.1-a.html` — kapak: **MAT.9.5.1** ⚠ | sayfa 7 | Başlangıç noktasını belirleyelimyelim | `belirleyelimyelim` → **belirleyelim** | [DI-7](https://sozluk.gov.tr/) | kesin |

### 7.1 Kesik sayfa başlıkları (olası)

Bu başlıklar üretim sırasında kesilmiş (ör. *Fonksiyonun Sıfırları ve İşa*). Başlıklar `data-baslik` özniteliğinde duruyor; sayfa ve şablon betiklerinde bu özniteliği okuyan kod bulunamadı, yani ekranda görünmüyor olabilir. Yine de sayfa adı olarak başka bir yerde kullanılıyorsa düzeltilmeli. Ayrıca başlıklarda bağlaçlar küçük yazılır (*Taban Blokları ile …*: [BH-11]).

| Dosya — kapaktaki kod | Bölüm | Bağlam | Yazılan → Önerilen | Kural | Güven |
|---|---|---|---|---|---|
| `MAT.10.2.1-a.html` — kapak: **MAT.10.4.1** ⚠ | sayfa 4 | Fonksiyonun Sıfırları ve İşa <br>_sayfa başlık özniteliği (ekranda görünmüyor olabilir)_ | `Fonksiyonun Sıfırları ve İşa` → **Fonksiyonun Sıfırları ve İşareti** | [DI-7](https://sozluk.gov.tr/) | olası |
| `MAT.11.1.1-a.html` — kapak: **MAT.11.3.1** ⚠ | sayfa 3 | Tanjantın Tanımsız Olduğu De <br>_sayfa başlık özniteliği (ekranda görünmüyor olabilir)_ | `Tanjantın Tanımsız Olduğu De` → **(başlık tamamlanmalı)** | [DI-7](https://sozluk.gov.tr/) | olası |
| `MAT.4.1.2-a.html` — kapak: **MAT.4.1.2** | sayfa 1 | Taban Blokları İle Bölük Mod <br>_sayfa başlık özniteliği (ekranda görünmüyor olabilir)_ | `Taban Blokları İle Bölük Mod` → **Taban Blokları ile Bölük Modeli (?)** | [DI-7](https://sozluk.gov.tr/) | olası |
| `MAT.5.5.1-a.html` — kapak: **MAT.5.5.1** | sayfa 1 | Araştırma Sorusu Olan ve Olm <br>_sayfa başlık özniteliği (ekranda görünmüyor olabilir)_ | `Araştırma Sorusu Olan ve Olm` → **(başlık tamamlanmalı)** | [DI-7](https://sozluk.gov.tr/) | olası |
| `MAT.6.4.2-a.html` — kapak: **MAT.6.4.2** | sayfa 3 | Katmanlı Bloklarda Açısal De <br>_sayfa başlık özniteliği (ekranda görünmüyor olabilir)_ | `Katmanlı Bloklarda Açısal De` → **(başlık tamamlanmalı)** | [DI-7](https://sozluk.gov.tr/) | olası |
| `MAT.7.1.4-a.html` — kapak: **MAT.7.1.4** | sayfa 13 | Rasyonel Sayılarla Problem Ç <br>_sayfa başlık özniteliği (ekranda görünmüyor olabilir)_ | `Rasyonel Sayılarla Problem Ç` → **Rasyonel Sayılarla Problem Çözme (?)** | [DI-7](https://sozluk.gov.tr/) | olası |
| `MAT.H.4.1-a.html` — kapak: **MAT.H.4.1** | sayfa 9 | Geometri Tahtasında Çokgen İ <br>_sayfa başlık özniteliği (ekranda görünmüyor olabilir)_ | `Geometri Tahtasında Çokgen İ` → **(başlık tamamlanmalı)** | [DI-7](https://sozluk.gov.tr/) | olası |

## Ek: Kural kimlikleri

Kimliklerin tam açıklaması ve TDK kaynak bağlantıları [tdk-yazim-kurallari.md](tdk-yazim-kurallari.md) dosyasındadır. Bu dosyada ayrıca düzeltme işaretli kelimelerin sözlük sorgu tabloları (Bölüm 10) ve TDK sayfalarında açık hüküm bulunmayan konular (Bölüm 11: sayı ile birim arasındaki boşluk, *°* ve *%* sonrası ek vb.) vardır.


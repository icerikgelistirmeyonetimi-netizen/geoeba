# Yazım Düzeltmeleri — Uygulama Kaydı

**Tarih:** 25 Ekim 2026 · Dayanak: [yazim-denetimi-raporu.md](yazim-denetimi-raporu.md), [tdk-yazim-kurallari.md](tdk-yazim-kurallari.md)

Düzeltmeler hem üretim kaynağına (`C:\Semih TiRYAKi\icerik_gelistirme_yeni - Kopya\cikti`) hem geoeba kopyasına (`public/kazanim-icerikleri/`) aynı biçimde uygulandı; bir sonraki `npm run kazanim:aktar` düzeltmeleri geri almaz. Her değişiklik görünen metinde tam ifade aranarak yapıldı (betik değişken adları, `data-*` değerleri, SVG yol verileri değişmedi). Statik derleme (`out/`) güncellenmedi; bir sonraki derlemede yenilenir. Commit yapılmadı.

**Doğrulama:** 81 sayfada kaynak ile kopyanın değişiklikleri birebir aynı; değişen 45 betik bloğu `node --check` denetiminden geçti; betiklerde dizgi dışında hiçbir kod değişmedi (iskelet karşılaştırması). Değiştirilen metinlerin betikte sayı olarak okunmadığı denetlendi. MAT.10.2.2, 10.2.4, 4.4.1, 12.1.5, 12.2.2, 12.3.2 ve 9.3.1 tarayıcıda açılıp bütün sayfa kurulum işlevleri hatasız çalıştırıldı.

## Uygulanan düzeltmeler

81 sayfada 265 değişiklik (sayfa içi yorumlardaki aynı ifadeler de güncellendi; aşağıdaki listede yorumlar gösterilmedi).

| Sayfa — kapaktaki kod | Değişiklikler (önce → sonra) |
|---|---|
| `MAT.1.1.4-a.html` — **MAT.1.1.4** | `Mutfak tezgahında iki ahşap` → `Mutfak tezgâhında iki ahşap` |
| `MAT.1.1.7-a.html` — **MAT.1.1.7** | `Mutfak tezgahı üzerinde 5` → `Mutfak tezgâhı üzerinde 5` |
| `MAT.1.2.3-a.html` — **MAT.1.2.3** | `Sağ kefe halen ağır basıyor` → `Sağ kefe hâlen ağır basıyor` |
| `MAT.1.4.1-a.html` — **MAT.1.4.1** | `veriye dayalı istatiksel araştırma gerektiren` → `veriye dayalı istatistiksel araştırma gerektiren` |
| `MAT.10.2.1-a.html` — **MAT.10.4.1** | `Fonksiyonun Sıfırları ve İşa` → `Fonksiyonun Sıfırları ve İşaret` |
| `MAT.10.2.2-a.html` — **MAT.10.4.2** | `Grafik mi Tam Kare mi` → `Grafik mi, Tam Kare mi?`<br>`x = -2.0` → `x = -2,0`<br>`a = 2.0` → `a = 2,0`<br>`a = 0.5` → `a = 0,5`<br>`a = -1.5` → `a = -1,5`<br>`g(x) = -0.5(x-2)^2 + 3` → `g(x) = -0,5(x-2)^2 + 3` |
| `MAT.10.2.3-a.html` — **MAT.10.4.3** | `y değeri k'dır: (2, 1)` → `y değeri k'dir: (2, 1)`<br>`y = 1.6\sqrt{x - 2.0}` → `y = 1,6\sqrt{x - 2,0}` |
| `MAT.10.2.4-a.html` — **MAT.10.4.4** | `yerinde kalır. k'yı değiştirelim; yatay` → `yerinde kalır. k'yi değiştirelim; yatay`<br>`y = k'ya yaklaşır` → `y = k'ye yaklaşır`<br>`sabit terim k'dır: k =` → `sabit terim k'dir: k =`<br>`Dikey işlem k'yı da değiştirdi` → `Dikey işlem k'yi de değiştirdi`<br>`Doğru mu Yanlış mı` → `Doğru mu, Yanlış mı?`<br>`a = 0.5` → `a = 0,5`<br>`[-4, 4], 0.5 adımlı` → `[-4, 4], 0,5 adımlı`<br>`(V = 0.5)` → `(V = 0,5)`<br>`0.5 (Kritik Eşik)` → `0,5 (Kritik Eşik)` |
| `MAT.10.2.6-a.html` — **MAT.10.4.6** | `k = 4.2 \) m` → `k = 4,2 \) m` |
| `MAT.10.4.1-a.html` — **MAT.10.1.1** | `Güneşi tepeye alalım` → `Güneş'i tepeye alalım` |
| `MAT.10.4.2-a.html` — **MAT.10.1.2** | `Güzergah İçi İkmal` → `Güzergâh İçi İkmal` |
| `MAT.10.4.4-a.html` — **MAT.10.1.4** | `Pisagorla Kosinüs Çıkarımı` → `Pisagor'la Kosinüs Çıkarımı` |
| `MAT.10.7.2-a.html` — **MAT.10.7.2** | `Verilen Bilgiyi Okuyalımyalım` → `Verilen Bilgiyi Okuyalım` |
| `MAT.11.1.1-a.html` — **MAT.11.3.1** | `Tanjantın Tanımsız Olduğu De` → `Tanjantın Tanımsız Olduğu Değerler`<br>`-3, m: 0.5` → `-3, m: 0,5`<br>`k: 0.5, m: 3` → `k: 0,5, m: 3` |
| `MAT.11.1.3-a.html` — **MAT.11.3.3** | `Artan mı Azalan mı` → `Artan mı, Azalan mı?` |
| `MAT.12.1.5-a.html` — **MAT.12.1.5** | `17.5 TL/m³` → `17,5 TL/m³`<br>`17.5 ≤ 25 TL/m³` → `17,5 ≤ 25 TL/m³` |
| `MAT.12.2.1-a.html` — **MAT.12.4.1** | `2.001 girdi yuvası` → `2,001 girdi yuvası`<br>`2.1 girdi yuvası` → `2,1 girdi yuvası`<br>`1.9 girdi yuvası` → `1,9 girdi yuvası`<br>`1.99 girdi yuvası` → `1,99 girdi yuvası`<br>`1.999 girdi yuvası` → `1,999 girdi yuvası`<br>`2.01 girdi yuvası` → `2,01 girdi yuvası` |
| `MAT.12.2.2-a.html` — **MAT.12.4.2** | `x = 1.9 noktası hedef` → `x = 1,9 noktası hedef`<br>`x = 1.99 noktası hedef` → `x = 1,99 noktası hedef`<br>`x = 2.01 noktası hedef` → `x = 2,01 noktası hedef`<br>`x = 2.1 noktası hedef` → `x = 2,1 noktası hedef`<br>`1.9 girdisi için` → `1,9 girdisi için`<br>`f(x) değeri 4.8 kartı` → `f(x) değeri 4,8 kartı`<br>`x = 1.9` → `x = 1,9`<br>`1.99 girdisi için` → `1,99 girdisi için`<br>`f(x) değeri 4.98 kartı` → `f(x) değeri 4,98 kartı`<br>`x = 1.99` → `x = 1,99`<br>`2.1 girdisi için` → `2,1 girdisi için`<br>`f(x) değeri 5.2 kartı` → `f(x) değeri 5,2 kartı`<br>`x = 2.1` → `x = 2,1`<br>`2.01 girdisi için` → `2,01 girdisi için`<br>`f(x) değeri 5.02 kartı` → `f(x) değeri 5,02 kartı`<br>`x = 2.01` → `x = 2,01` |
| `MAT.12.2.5-a.html` — **MAT.12.4.5** | `f'(C) = -1.5` → `f'(C) = -1,5` |
| `MAT.12.2.7-a.html` — **MAT.12.4.7** | `Tanımla mı Kuralla mı` → `Tanımla mı, Kuralla mı?`<br>`\frac{dr}{dt} = 0.5 \text{ dm/sn}` → `\frac{dr}{dt} = 0,5 \text{ dm/sn}`<br>`\frac{dh}{dt} = 1.0 \text{ dm/sn}` → `\frac{dh}{dt} = 1,0 \text{ dm/sn}` |
| `MAT.12.2.8-a.html` — **MAT.12.4.8** | `\) olduğu halde bu noktada` → `\) olduğu hâlde bu noktada` |
| `MAT.12.2.9-a.html` — **MAT.12.4.9** | `Türev bilgisininkullanılabileceği problemlerdeki matematiksel` → `Türev bilgisinin kullanılabileceği problemlerdeki matematiksel`<br>`127.76 cm³` → `127,76 cm³`<br>`+4.92 (Pozitif)` → `+4,92 (Pozitif)`<br>`128.00 cm³` → `128,00 cm³`<br>`-4.68 (Negatif)` → `-4,68 (Negatif)` |
| `MAT.12.3.2-a.html` — **MAT.12.2.2** | `Işık Huzmesi` → `Işık Hüzmesi`<br>`7.0 br` → `7,0 br` |
| `MAT.12.3.3-a.html` — **MAT.12.2.3** | `alanı kaç m²'dir?` → `alanı kaç m²dir?`<br>`hacmi kaç m³'tür?` → `hacmi kaç m³tür?`<br>`kullanarak problemi çözer .` → `kullanarak problemi çözer.`<br>`Teğet Parçaları Doğru mu` → `Teğet Parçaları Doğru mu?` |
| `MAT.12.5.1-a.html` — **MAT.12.5.1** | ` µg/m³'tür. Çeyrekler açıklığı` → ` µg/m³tür. Çeyrekler açıklığı`<br>`Merkezi eğilim` → `Merkezî eğilim`<br>`Ortalama mı Medyan mı` → `Ortalama mı, Medyan mı?`<br>`İlişki Neden-Sonuç mu` → `İlişki Neden-Sonuç mu?`<br>`(m ≈ -1.3)` → `(m ≈ -1,3)` |
| `MAT.2.1.2-a.html` — **MAT.2.1.2** | `şeklinde çözümlenmiş hali hangisidir?` → `şeklinde çözümlenmiş hâli hangisidir?` |
| `MAT.2.1.7-a.html` — **MAT.2.1.7** | `3B mutfak tezgahında karpuz dilimleme` → `3B mutfak tezgâhında karpuz dilimleme` |
| `MAT.2.1.8-a.html` — **MAT.2.1.8** | `TL gerçek madeni para` → `TL gerçek madenî para`<br>`kuruş gerçek madeni para` → `kuruş gerçek madenî para` |
| `MAT.2.1.9-a.html` — **MAT.2.1.9** | `haftanın günleri Pazartesi'den başlayarak sıralanmıştır.` → `haftanın günleri pazartesiden başlayarak sıralanmıştır.` |
| `MAT.2.2.1-a.html` — **MAT.2.2.1** | `stratejisi pazar tezgahı 3B sahnesi` → `stratejisi pazar tezgâhı 3B sahnesi` |
| `MAT.2.2.3-a.html` — **MAT.2.2.3** | `tersine dönüştürülmüş hali olan toplama` → `tersine dönüştürülmüş hâli olan toplama` |
| `MAT.2.2.4-a.html` — **MAT.2.2.4** | `tane dört onikidir.` → `tane dört on ikidir.` |
| `MAT.2.3.1-a.html` — **MAT.2.3.1** | `Zeka küpü` → `Zekâ küpü` |
| `MAT.2.3.4-a.html` — **MAT.2.3.4** | `Cisimlerin Farklı Halleri` → `Cisimlerin Farklı Hâlleri` |
| `MAT.2.3.5-a.html` — **MAT.2.3.5** | `Çorba Kasesi, Su Bardağı` → `Çorba Kâsesi, Su Bardağı`<br>`Çorba Kasesi` → `Çorba Kâsesi`<br>`Çorba kasesi 2 su` → `Çorba kâsesi 2 su` |
| `MAT.3.1.16-a.html` — **MAT.3.1.16** | `Türk Lirası Madeni Para` → `Türk Lirası Madenî Para` |
| `MAT.3.2.6-a.html` — **MAT.3.2.6** | `her birinde 6'şar oyuncak olduğunu` → `her birinde altışar oyuncak olduğunu` |
| `MAT.3.3.1-a.html` — **MAT.3.3.1** | `Baskı Kağıdı` → `Baskı Kâğıdı` |
| `MAT.3.3.5-a.html` — **MAT.3.3.5** | `Çorba Kasesi` → `Çorba Kâsesi`<br>`Çorba kasesi` → `Çorba kâsesi` |
| `MAT.4.1.2-a.html` — **MAT.4.1.2** | `Taban Blokları İle Bölük Mod` → `Taban Blokları İle Bölük Modeli Gösterimi` |
| `MAT.4.1.6-a.html` — **MAT.4.1.6** | `4 parçadan 2si taranmış` → `4 parçadan 2'si taranmış` |
| `MAT.4.2.9-a.html` — **MAT.4.2.9** | `Açık manav tezgahında yan yana` → `Açık manav tezgâhında yan yana` |
| `MAT.4.3.3-a.html` — **MAT.4.3.3** | `Araçları Çalışma Tezgahı ve Çevre` → `Araçları Çalışma Tezgâhı ve Çevre` |
| `MAT.4.3.4-a.html` — **MAT.4.3.4** | `Madeni Para` → `Madenî Para`<br>`Madeni para` → `Madenî para` |
| `MAT.4.3.6-a.html` — **MAT.4.3.6** | `takoz kullandığı halde açılar neden` → `takoz kullandığı hâlde açılar neden` |
| `MAT.4.4.1-a.html` — **MAT.4.4.1** | `Güneşin batıdan` → `Güneş'in batıdan`<br>`Güneşin sabah doğması` → `Güneş'in sabah doğması` |
| `MAT.6.1.1-a.html` — **MAT.6.1.1** | `6'nın katları 6'şar artarak sayı` → `6'nın katları altışar artarak sayı`<br>`kare sayısı 3'er artıyor, model` → `kare sayısı üçer artıyor, model` |
| `MAT.6.1.4-a.html` — **MAT.6.1.4** | `kg pirinç 6'şar kilogram olarak` → `kg pirinç altışar kilogram olarak` |
| `MAT.6.4.1-a.html` — **MAT.6.4.1** | `kenar uzunlukları 10'ar kat büyütülüyor.` → `kenar uzunlukları onar kat büyütülüyor.`<br>`tıklayarak 1 m²'lik zemini desimetrekare` → `tıklayarak 1 m²lik zemini desimetrekare`<br>`kaydırarak 1 cm²'lik mikro plakayı` → `kaydırarak 1 cm²lik mikro plakayı` |
| `MAT.6.4.2-a.html` — **MAT.6.4.2** | `alanı kaç cm²'dir?` → `alanı kaç cm²dir?`<br>`Katmanlı Bloklarda Açısal De` → `Katmanlı Bloklarda Açısal Değişim` |
| `MAT.6.4.3-a.html` — **MAT.6.4.3** | `alanı kaç m²'dir?` → `alanı kaç m²dir?` |
| `MAT.6.4.5-a.html` — **MAT.6.4.5** | `Sabit Kat Sayı` → `Sabit Katsayı` |
| `MAT.6.5.1-a.html` — **MAT.6.5.1** | `Merkezi Eğilim` → `Merkezî Eğilim` |
| `MAT.6.6.1-a.html` — **MAT.6.6.1** | `Bir madeni para 50 kez` → `Bir madenî para 50 kez` |
| `MAT.7.1.4-a.html` — **MAT.7.1.4** | `Rasyonel Sayılarla Problem Ç` → `Rasyonel Sayılarla Problem Çözme` |
| `MAT.7.1.5-a.html` — **MAT.7.1.5** | `Toplamsal mı Çarpımsal mı` → `Toplamsal mı, Çarpımsal mı?` |
| `MAT.7.2.1-a.html` — **MAT.7.2.1** | `2/3'lik Kısım` → `2/3'lük Kısım` |
| `MAT.7.4.10-a.html` — **MAT.7.4.10** | `alanı kaç m²'dir?` → `alanı kaç m²dir?`<br>`alan kaç m²'dir?` → `alan kaç m²dir?` |
| `MAT.7.4.2-a.html` — **MAT.7.4.2** | `alanı kaç cm²'dir?` → `alanı kaç cm²dir?` |
| `MAT.7.4.5-a.html` — **MAT.7.4.5** | `hacmi kaç m³'tür?` → `hacmi kaç m³tür?`<br>`1 m³'lük ahşap blokları` → `1 m³lük ahşap blokları` |
| `MAT.7.4.6-a.html` — **MAT.7.4.6** | `Gereken kaplama kağıdı` → `Gereken kaplama kâğıdı`<br>`hacmi kaç cm³'tür?` → `hacmi kaç cm³tür?` |
| `MAT.7.4.7-a.html` — **MAT.7.4.7** | `alanı kaç m²'dir?` → `alanı kaç m²dir?`<br>`Daire Alanı : ` → `Daire Alanı: ` |
| `MAT.7.4.9-a.html` — **MAT.7.4.9** | `alanı kaç cm²'dir?` → `alanı kaç cm²dir?` |
| `MAT.7.6.1-a.html` — **MAT.7.6.1** | `Merkezi eğilimler başarıyla belirlendi.` → `Merkezî eğilimler başarıyla belirlendi.`<br>`Veri Soruyu Cevaplıyor mu` → `Veri Soruyu Cevaplıyor mu?` |
| `MAT.7.7.3-a.html` — **MAT.7.7.3** | `olması', III. 'Salı olması' ile 'çarşamba` → `olması', III. 'salı olması' ile 'çarşamba` |
| `MAT.8.3.1-a.html` — **MAT.8.3.1** | `a = 8.0 br` → `a = 8,0 br`<br>`b = 7.8 br` → `b = 7,8 br`<br>`c = 6.7 br` → `c = 6,7 br` |
| `MAT.8.3.5-a.html` — **MAT.8.3.5** | `ve 16 cm²'dir. Buna göre` → `ve 16 cm²dir. Buna göre` |
| `MAT.8.4.3-a.html` — **MAT.8.4.3** | `düşey dilim halinde prizmaya dönüştüğü` → `düşey dilim hâlinde prizmaya dönüştüğü` |
| `MAT.8.5.3-a.html` — **MAT.8.5.3** | `x = -2.5, z =` → `x = -2,5, z =`<br>`z = -1.5` → `z = -1,5` |
| `MAT.8.6.1-a.html` — **MAT.8.6.1** | `Tamsayı adet` → `Tam sayı adet` |
| `MAT.8.6.2-a.html` — **MAT.8.6.2** | `Merkezi Eğilim Yanılgısı` → `Merkezî Eğilim Yanılgısı`<br>`Doğrusu ve Merkezi Eğilim Göstergeleri` → `Doğrusu ve Merkezî Eğilim Göstergeleri`<br>`Merkezi Eğilim Ölçüleri` → `Merkezî Eğilim Ölçüleri`<br>`Dengeli Merkezi Eğilim Ölçütü` → `Dengeli Merkezî Eğilim Ölçütü` |
| `MAT.8.7.1-a.html` — **MAT.8.7.1** | `hilesiz bir madeni parayı 5 kez` → `hilesiz bir madenî parayı 5 kez`<br>`Madeni paralarda deneysel olasılık` → `Madenî paralarda deneysel olasılık` |
| `MAT.9.1.2-a.html` — **MAT.9.1.2** | `Kesişime Ait mi` → `Kesişime Ait mi?` |
| `MAT.9.1.3-a.html` — **MAT.9.1.3** | `işleminin sonucu doğal sayı mı` → `işleminin sonucu doğal sayı mı?` |
| `MAT.9.2.1-a.html` — **MAT.9.2.1** | `a = +0.2,\; r =` → `a = +0,2,\; r =`<br>`a = -2.5,\; r =` → `a = -2,5,\; r =`<br>`a = +1.0,\; r =` → `a = +1,0,\; r =` |
| `MAT.9.3.1-a.html` — **MAT.9.5.1** | `ve 14'ten 3'er çıkaralım: 0'a` → `ve 14'ten üçer çıkaralım: 0'a`<br>`3'ün katından 3'er çıkarınca tam` → `3'ün katından üçer çıkarınca tam`<br>`20'den 3'er çıkarınca 2'den` → `20'den üçer çıkarınca 2'den`<br>`Başlangıç noktasını belirleyelimyelim` → `Başlangıç noktasını belirleyelim`<br>`0'a uğramadan negatife geçiliyor mu` → `0'a uğramadan negatife geçiliyor mu?`<br>`Algoritma Durur mu` → `Algoritma Durur mu?` |
| `MAT.9.3.2-a.html` — **MAT.9.5.2** | `kuralını sağladığı halde elendi. Hatalı` → `kuralını sağladığı hâlde elendi. Hatalı` |
| `MAT.9.5.5-a.html` — **MAT.9.4.5** | `Tarihi saat kulesi, ölçüm çubuğu` → `Tarihî saat kulesi, ölçüm çubuğu` |
| `MAT.9.7.2-a.html` — **MAT.9.7.2** | `Düzgün bir madeni paranın art arda` → `Düzgün bir madenî paranın art arda`<br>`Hilesiz bir madeni para atma deneyinde` → `Hilesiz bir madenî para atma deneyinde`<br>`Madeni para ve sayı` → `Madenî para ve sayı`<br>`Madeni para yazı` → `Madenî para yazı` |
| `MAT.H.4.1-a.html` — **MAT.H.4.1** | `Geometri Tahtasında Çokgen İ` → `Geometri Tahtasında Çokgen İnşası` |
| `MAT.H.5.1-a.html` — **MAT.H.5.1** | `örneklendiği için temsili örneklemdir.` → `örneklendiği için temsilî örneklemdir.`<br>`Temsili örneklem: Üst, orta` → `Temsilî örneklem: Üst, orta`<br>`Temsili Örneklem` → `Temsilî Örneklem` |

_Matematik gösterimi içindeki ondalıklar `\( … \)` içinde `0{,}5` biçiminde yazıldı (MathJax virgülden sonra boşluk koymasın diye); ekranda "0,5" görünür. MAT.10.2.2'de betikteki `a = 0.5;` gibi sayı atamaları değiştirilmedi, yalnız düğme yazıları değişti._

## Betikte üretilen ondalık sayılar (`toFixed`)

Kaydırıcı göstergeleri, tablolar, dönütler ve formüller gibi etkileşim sırasında betiğin yazdığı sayılar da virgüllü gösterilecek biçimde düzeltildi. Düzeltmeler yine hem kaynağa hem kopyaya uygulandı (34 sayfa).

**Yöntem:**
- 3.043 `toFixed` çağrısının her biri bağlamına göre sınıflandırıldı. Yaklaşık 2.500'ü SVG koordinatı, `transform`, stil, `value`, `data-*`, anahtar ya da karşılaştırma değeriydi; bunlara dokunulmadı. Hesapta kullanılan değerler noktalı kaldı.
- Ekrana yazılan değerlerin hemen ardına `.replace(".", ",")` eklendi. LaTeX formüllerinde `.replace(".", "{,}")` kullanıldı, böylece MathJax virgülden sonra boşluk bırakmıyor.
- Betiğin çiğ sayı yazdığı birkaç yerde (`a + "/x"`, `lazerY` gibi) değer `String(…).replace(".", ",")` ile sarıldı. Yalnız ekranda kullanılan bir yardımcı işlev (MAT.10.4.1 `fmt`) de aynı biçimde düzeltildi.
- Betiğin sonradan yeniden yazdığı göstergelerin HTML'deki başlangıç değerleri de (ör. `a = 1.0`) virgüle çevrildi; sayfa açılışta noktalı, etkileşimden sonra virgüllü görünmüyor. Kaydırıcı ve eksen etiketleri, tablo hücreleri, kartlar ve düğme yazıları da çevrildi.
- **Koordinatlar:** Ondalık içeren koordinat çiftlerinde ayırıcı noktalı virgül oldu: `(2,0; 4,0)`, `A(2; 0,5)`, `P(3,5; 0,0)`. Bu, MAT.11.1.3'te zaten kullanılan biçimdir ve TDK'nin virgül içeren öğeleri noktalı virgülle ayırma kuralına (NK-6) uyar. Tam sayılı koordinatlar `(2, 3)` biçiminde kaldı.
- Dokunulmayanlar: `aria-valuenow` (değeri sayı olmak zorunda), kaydırıcıların `value` özelliği, `data-*` değerleri, SVG çizim verisi, TDK'ye uygun saat (`12.30`) ve binlik noktası (`39.811`).

**Doğrulama:**
- Kaynak ile kopya 34 sayfanın hepsinde aynı değişikliği aldı. Değişen betiklerin hepsi `node --check` denetiminden geçti.
- Kod iskeletinde (dizgiler ve yorumlar çıkarılmış kod) yalnız eklenen 140 `.replace` çağrısı ile birkaç `String(…)` sarmalayıcısı ve koordinat ayırıcısı farkı var; başka hiçbir kod değişmedi.
- Sayfaların betikte gösterge metnini sayı olarak okumadığı denetlendi.
- **Tarayıcı testi (her sayfa, değişiklikten önce ve sonra):** Sayfa yalıtılmış bir çerçevede açıldı, bütün sayfa kurulum işlevleri çalıştırıldı, kaydırıcılar üç farklı değere getirildi. Ardından metin düğümlerindeki, `aria-label`'lardaki ve tuval yazılarındaki noktalı ondalıklar sayıldı. Toplam **177 → 1**; kalan bir tane MAT.11.1.6'daki `39.811` (binlik noktası, doğru). JS hatası: önce 0, sonra 0.
- MathJax çıktısı denetlendi: `y = 1,1√(x − 2,2) + 1,6` gibi formüllerde virgül sıradan karakter olarak işleniyor, araya boşluk girmiyor.

| Sayfa — kapaktaki kod | Betiğe eklenen dönüşüm | Statik metinde çevrilen | Ekranda noktalı ondalık (önce → sonra) |
|---|---:|---:|---|
| `MAT.10.2.1-a.html` — **MAT.10.4.1** | 4 | 0 | 3 → 0 |
| `MAT.10.2.2-a.html` — **MAT.10.4.2** | 18 | 16 | 22 → 0 |
| `MAT.10.2.3-a.html` — **MAT.10.4.3** | 12 | 5 | 11 → 0 |
| `MAT.10.2.4-a.html` — **MAT.10.4.4** | 11 | 6 | 11 → 0 |
| `MAT.10.2.5-a.html` — **MAT.10.4.5** | 5 | 7 | 11 → 0 |
| `MAT.10.2.6-a.html` — **MAT.10.4.6** | 2 | 0 | 2 → 0 |
| `MAT.10.4.1-a.html` — **MAT.10.1.1** | 2 | 6 | 4 → 0 |
| `MAT.10.4.2-a.html` — **MAT.10.1.2** | 2 | 0 | 2 → 0 |
| `MAT.10.4.4-a.html` — **MAT.10.1.4** | 2 | 0 | 2 → 0 |
| `MAT.10.5.1-a.html` — **MAT.10.6.1** | 1 | 2 | 0 → 0 |
| `MAT.11.1.1-a.html` — **MAT.11.3.1** | 13 | 6 | 11 → 0 |
| `MAT.11.1.2-a.html` — **MAT.11.3.2** | 4 | 0 | 4 → 0 |
| `MAT.11.1.4-a.html` — **MAT.11.3.4** | 0 | 2 | 0 → 0 |
| `MAT.11.1.6-a.html` — **MAT.11.3.6** | 2 | 0 | 1 → 1 |
| `MAT.11.1.7-a.html` — **MAT.11.3.7** | 2 | 0 | 0 → 0 |
| `MAT.12.1.4-a.html` — **MAT.12.1.4** | 1 | 1 | 1 → 0 |
| `MAT.12.2.1-a.html` — **MAT.12.4.1** | 4 | 16 | 16 → 0 |
| `MAT.12.2.2-a.html` — **MAT.12.4.2** | 1 | 4 | 5 → 0 |
| `MAT.12.2.5-a.html` — **MAT.12.4.5** | 1 | 21 | 17 → 0 |
| `MAT.12.2.6-a.html` — **MAT.12.4.6** | 4 | 2 | 4 → 0 |
| `MAT.12.2.7-a.html` — **MAT.12.4.7** | 2 | 3 | 2 → 0 |
| `MAT.12.2.9-a.html` — **MAT.12.4.9** | 10 | 13 | 13 → 0 |
| `MAT.12.3.1-a.html` — **MAT.12.2.1** | 3 | 5 | 5 → 0 |
| `MAT.12.3.2-a.html` — **MAT.12.2.2** | 10 | 5 | 8 → 0 |
| `MAT.12.4.2-a.html` — **MAT.12.3.2** | 2 | 1 | 2 → 0 |
| `MAT.12.5.1-a.html` — **MAT.12.5.1** | 3 | 1 | 2 → 0 |
| `MAT.3.3.3-a.html` — **MAT.3.3.3** | 1 | 0 | 0 → 0 |
| `MAT.7.4.10-a.html` — **MAT.7.4.10** | 2 | 0 | 1 → 0 |
| `MAT.8.2.2-a.html` — **MAT.8.2.2** | 1 | 1 | 1 → 0 |
| `MAT.8.3.1-a.html` — **MAT.8.3.1** | 4 | 3 | 6 → 0 |
| `MAT.9.2.1-a.html` — **MAT.9.2.1** | 8 | 15 | 9 → 0 |
| `MAT.9.2.3-a.html` — **MAT.9.2.3** | 1 | 1 | 1 → 0 |
| `MAT.9.7.1-a.html` — **MAT.9.7.1** | 1 | 0 | 0 → 0 |
| `MAT.H.1.1-a.html` — **MAT.H.1.1** | 1 | 1 | 0 → 0 |

_Bir hata yakalandı ve düzeltildi:_ İlk turda çözümleyici `"x = "`, `"d = "` gibi gösterim dizgilerini SVG özniteliği (`x="…"`) sanıp atlamıştı; MAT.10.2.3'te de bir formülün üçüncü sayısı LaTeX içinde olduğu hâlde düz virgül almıştı. Tarayıcı testi bunları gösterdi; ikinci turda düzeltildi.

### Tarama: öteki sayfalar

`toFixed` kullanan ama bu turda değiştirilmesi gerekmeyen 92 sayfa da aynı tarayıcı testinden geçirildi. Hiçbirinde JS hatası yok; ekranda kalan 18 noktalı sayının hepsi TDK'ye uygun: saatler (MAT.3.1.12 `Saat 02.00`, MAT.8.6.1 `08.00`–`18.00`, MAT.7.6.1 `09.00`) ve binlik noktaları (MAT.8.1.1 `65.536`, MAT.H.5.1 `68.000 TL`, `500.000 TL`).

## Uygulanmayanlar ve gerekçesi

| Konu | Neden uygulanmadı |
|---|---|
| Binlik ayırıcı (1450, 10 000) | Kararınız: MEB üslubu korunacak. |
| *birim kare / birim küp* | Kararınız: açık (ayrı) yazılacak. |
| Değiştirmediğim sayfalardaki ondalıklar | `toFixed` kullanan öteki 92 sayfa da tarayıcıda tarandı; sonuç aşağıda "Tarama: öteki sayfalar" başlığında. Başka oturumların sayfaları (5. sınıf, MAT.6.1.7/6.1.8, MAT.10.6.1/10.6.2) bu turda da dışarıda bırakıldı. |
| Saat `08:30` biçimi (5 sayfa) | Saat okuma sayfalarında dijital saat ekranını gösteriyor; TDK `08.30` ister, ama dijital gösterim bilinçli olabilir. |
| `f⁻¹'in`, `3a²'ye` | TDK kuralı (KS-6) üslü kısaltma ve sayılar içindir; harfli üslü ifadeler için açık hüküm yok. |
| `Enter'a`, `Onikigen`, `İkiz Kenar Yuvası` | Okunuş ya da anlam kesin değil (tuş adının okunuşu; sözlükte *onikigen* maddesi yok; yuvanın *ikizkenar* mı *ikiz kenar* mı olduğu belirsiz). |
| Raporda olup yanlış alarm çıkanlar | `4lu`/`5li` ve `5cm` kod değerleri (ekranda "4'lü Kalıp" doğru yazılı); "yelken: üçgen", "15 ve 20 sayılarının [yuva]", "Eşit Pay:" ekranda doğru (etiketler ayrı ögelerde). |
| Başlıklarda büyük yazılmış bağlaçlar (*Taban Blokları İle…*, *Ölçek Ve Çizim*, *Açı İle Oluşturma*) | TDK bu kuralı eser adları için koyar (BH-11); web başlıkları için açık hüküm yok (BH-17). İsterseniz tutarlılık için küçültülebilir. |

### Başka oturumların üzerinde çalıştığı sayfalar

Bu sayfalara dokunulmadı. Bulguları raporda duruyor; o çalışmalar bitince uygulanabilir:

| Sayfa — kapaktaki kod | Bekleyen düzeltme |
|---|---|
| `MAT.10.6.1-a.html` — **MAT.10.2.1** | `% 70` → `%70` |
| `MAT.5.1.1-a.html` — **MAT.5.1.1** | `Elazığ` → `Elâzığ`, `Emirlikleri` → `Emîrlikleri` |
| `MAT.5.2.2-a.html` — **MAT.5.2.2** | `Hikayesi` → `Hikâyesi` |
| `MAT.5.3.3-a.html` — **MAT.5.3.3** | `tahmini değerini` → `tahminî değerini` |
| `MAT.5.5.1-a.html` — **MAT.5.5.1** | `dahil` → `dâhil`, `Araştırma Sorusu Olan ve Olm` → `(başlık tamamlanmalı)` |
| `MAT.5.6.1-a.html` — **MAT.5.6.1** | `Güneşin` → `Güneş'in` |

## Geri alma

geoeba kopyası git'te izlendiği için değişiklikler `git diff -- public/kazanim-icerikleri` ile görülür, `git checkout -- <dosya>` ile geri alınır (MAT.6.1.7, 6.1.8, 10.6.1, 10.6.2'deki farklar başka oturumlara aittir, bu çalışmayla ilgisi yoktur). Kaynak klasör de bir git deposudur. Ayrıca değişiklikten önceki dosyaların iki kopyası da geçici olarak şurada yedekli: `C:\Users\HP\AppData\Local\Temp\claude\C--Users-HP-Desktop-ebagebra-geoeba\914ce9f3-8cea-4a45-890c-f82a40ab05a7\scratchpad\denetim\yedek` (geçici klasördür, kalıcı değildir).

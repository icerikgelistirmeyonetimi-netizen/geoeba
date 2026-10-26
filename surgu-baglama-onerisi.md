# Sürgüyü nesnelerin konumuna ve ölçülerine bağlama (2B ve 3B): araştırma ve öneri

Tarih: 25 Ekim 2026. Durum: kısmen uygulandı; karar aşağıda.

> **Karar (25 Ekim 2026): sürgü konuma değil ÖLÇÜYE bağlanır.**
>
> - **Kaldırıldı:** noktanın x, y, z koordinatı, iki yönlü sürükleme, "A = (a, b)" komutu ve 3B cismin konumu (x, y, z).
>   Bu belgedeki koordinat satırları (3.1, 3.3, 3.4) ve "A = (a, b)" yolu geçersizdir.
> - **Uygulandı (2B):**
>   - doğru parçası, doğru ve ışın uzunluğu ile açı ölçüsü, nesnenin sağ tık menüsündeki "Sürgüye bağla" ile bağlanır;
>   - aynı menüde şekillerin ölçüleri de var (kenar, köşe açısı, yarıçap…);
>   - ayar penceresindeki liste eski kısa hâlinde kaldı: şekiller ve kaydırıcının kendi bağı.
> - **Uygulandı (3B):** sürgü paneli.
> - **Sırada (3B):** cismin ölçüleri (kenar; genişlik, derinlik, yükseklik; yarıçap), açınım oranı ve lisede dönme açısı.
> - **Neden ölçü:** kazanımlarda değişen şey ölçüdür ("kenar uzunluğu değişince alan nasıl değişir"). Konum bağı, sürükleme
>   ile aynı işi görür ve iki yönlü bağ, sürgü ile sürükleme arasında çakışma kuralları gerektirir.

Sorulan: sürgü bir noktanın x, y konumuna (3B'de x, y, z) ve 3B nesnelere bağlanabilsin. Arayüz bunu işlevsel yapmak için
nasıl olmalı? 2B'de de 3B'de de sürgü olmalı.

## 1. Bugünkü durum (kodda)

### 2B

| | Var olan |
|---|---|
| Ayarlar penceresindeki "Bağla" listesi | Çokgen (kenar uzunluğu, köşe açısı, kenar sayısı), çember (yarıçap), yay ve dilim (yarıçap, merkez açısı), elips (yarıçaplar, dönme açısı) |
| Bağlama motoru (`sliderBindings.planFor`) | Yukarıdakilere ek olarak **nokta x / y**, **doğru parçası / doğru / ışın uzunluğu** ve **açı ölçüsü** de hazır. Ama bunlar listede sunulmuyor; hiçbir komut da kurmuyor. |
| Veri modeli | Sürgüye bağlı nokta `construction: { kind: 'sliderPoint', mode: 'x' \| 'y' }` ile tutulur. Bir noktanın tek kurulumu olduğu için **aynı noktanın x'i ve y'si iki ayrı sürgüye bağlanamaz**. |

### 3B

| | Var olan |
|---|---|
| 2B nesneler 3B'de | Noktaların isteğe bağlı bir `z`'si var (`zEkseni.ts`); 3B görünüm noktaya dayalı her nesneyi bu z'de çizer. Ortaokul ve ilkokulda 2B nesneler 3B'de gizli. |
| Sürgüler 3B'de | Sürgüler ortak nesne listesinde duruyor ve 3B'deki fonksiyon grafikleri değerlerini kullanıyor, ama **3B tuvalde sürgü görünmüyor**, 3B'de sürgü eklenemiyor. |
| 3B cisimler | Konum (x, y, z), boyutlar (genişlik, yükseklik, derinlik, yarıçap), dönme ve açınım oranı var; **hiçbiri sürgüye bağlanamıyor**. Cisimler ayrı bir 3B deposunda duruyor, sürgüler 2B nesne listesinde. |
| 3B'de taşıma | Seçili nesnede x, y, z oklu taşıma kolu ve ortada düzlemde serbest taşıma tutamacı var. |

## 2. Başka araçlar nasıl yapıyor

- **Desmos ("hareketli nokta"):**
  - Koordinatlarından en az biri sürgü olan nokta tuvalde sürüklenebilir; **sürükleyince sürgünün değeri değişir** (iki yönlü bağ).
  - Sürükleme sürgünün sınırlarına ve adımına uyar.
  - Her koordinatta tek değişken değişebilir.
  - 3B'de nokta (x, y, z) yazılır; 3B'de sürgünün varsayılan aralığı −5…5.
- **GeoGebra:**
  - Sürgü serbest bir sayıdır, Cebir görünümünde durur; görünürlük düğmesiyle grafik görünümünde de gösterilir.
  - Tuvalde ekrana sabit ya da koordinat sistemine bağlı konumlanabilir.
  - Nokta A = (2 + a, 5 + b) gibi yazılınca koordinatları sürgüleri izler.
  - 3B grafik görünümünde serbest noktaya tıklamak taşıma kipini değiştirir: önce düzlemde (xOy), sonra yalnız z ekseni boyunca.
  - Canlandırma kipleri (gidip gelme, artan, azalan, bir kez artan) bizdekiyle aynı.

Ortak ders: sürgü sahnenin içine değil, **ekrana sabit** bir yere konur; bağ, nesnenin kendi menüsünden ya da yazarak kurulur.
Bağlı nokta sürüklenince sürgü de onu izler.

## 3. Öneri

### 3.1 Bağlanabilecekler

| Nesne | Özellik | 2B | 3B | Kademe |
|---|---|---|---|---|
| Nokta | x, y koordinatı | ✓ | ✓ | ortaokul, lise |
| Nokta | z koordinatı (yükseklik) | – | ✓ | lise (ortaokulda 2B nesneler 3B'de görünmüyor) |
| Doğru parçası, doğru, ışın | Uzunluk | ✓ | ✓ | ortaokul, lise |
| Açı | Ölçü | ✓ | ✓ | ortaokul, lise |
| Çokgen, çember, yay, dilim, elips | Bugünküler | ✓ | ✓ | bugünkü gibi |
| 3B cisim | Konum x, y, z | – | ✓ | lise |
| 3B cisim | Boyutlar (türüne göre: kenar; genişlik, derinlik, yükseklik; yarıçap) | – | ✓ | ortaokul, lise |
| 3B cisim | Dönme açısı (z ekseni çevresinde) | – | ✓ | lise |
| 3B cisim | Açınım oranı (0 kapalı → 1 açık) | – | ✓ | ortaokul, lise |

- Başka nesnelerden türeyen noktalar ve kilitli nesneler listede soluk görünür ve nedenini yazar. Bugünkü
  "düzenlenemiyor" kuralıyla aynı.
- İlkokulda sürgü yok; bugünkü kural sürer.

### 3.2 Bağı kurmanın üç yolu (aynı sonuca varır)

1. **Nesnenin sağ tık menüsünden (en hızlısı):**
   - "Sürgüye bağla" alt menüsü nesnenin özelliklerini listeler: x, y, z, uzunluk…
   - Seçilince iki seçenek çıkar: "Yeni sürgü" ya da var olan bir sürgü.
   - Yeni sürgü nesnenin yanına konur ve hemen bağlanır.
2. **Sürgü ayarlarından:** bugünkü "Bağla" bölümü. Nesne seçilir, ardından özellik seçilir; listeye nokta, parça, açı ve
   3B cisimler eklenir.
3. **Yazarak:**
   - "A = (a, b)" ya da "A = (a, b, c)" noktayı sürgülere bağlar (sürgü yoksa oluşturur).
   - "A noktasının x'ini a sürgüsüne bağla" da çalışır.
   - Cisimler için: "Küp 1'in kenarını k sürgüsüne bağla".

### 3.3 Bağlanınca sürgünün hazır değerleri

Kenar sayısında yaptığımız gibi sürgü kendini nesneye göre ayarlar; ondalık varsayılan olmaz (adım 1):

| Özellik | Değer | Aralık | Adım |
|---|---|---|---|
| Koordinat (x, y, z) | Şimdiki koordinat | Şimdiki değer ± 5, tam sayıya yuvarlanır (Desmos'un 3B varsayılanı gibi) | 1 |
| Uzunluk, boyut, yarıçap | Şimdiki ölçü | 1 … en az 10 (şimdiki ölçüyü kapsayacak kadar) | 1 |
| Açı, dönme | Şimdiki açı | 0 … 360 (üçgende 0 … 180) | 1 |
| Açınım oranı | Şimdiki oran | 0 … 1, yüzde olarak yazılır (%0 … %100) | 0,1 |

### 3.4 Sürükleme: iki yönlü bağ (önerilen)

- Bağlı koordinat sürüklenince **sürgü de değişir** (Desmos gibi). Değer sürgünün adımına oturur ve aralığında kalır.
- Bağsız koordinat serbesttir. Örneğin yalnız x bağlıysa nokta her yöne sürüklenir: x sürgüyle birlikte değişir, y
  serbest kalır.
- Öğrenci sürgüyü de noktayı da oynatabilir; ikisi hep aynı değeri gösterir. Bu, "değişkeni değiştir, nesneyi gör"
  ilişkisini iki yönden kurar.
- **3B'de:** taşıma kolunun bağlı eksendeki oku sürgüyü sürer. Ortadaki serbest tutamaç yalnız bağsız eksenleri taşır.
  Kolun okunda sürgünün adı da yazar ("x: a").
- **Seçenek (karar gerekli):** iki yönlü yerine bağlı ekseni kilitlemek. Bağlı eksende sürükleme kapalı olur ve kilit
  simgesi görünür. Daha basit ama daha az keşifçi.

### 3.5 3B'de sürgülerin yeri

- 3B tuvalin sol üstünde, araç düğmelerinin altında **ekrana sabit "Sürgüler" paneli**:
  - 2B'deki sürgü çubuğuyla aynı tasarım: başlık "a = 3 br", oynat ve ayar düğmeleri, altında bağ satırı ve zincir.
  - Kamera dönünce yerinde kalır; sahnenin içine konsa döndükçe okunmazdı. GeoGebra ve Desmos da sürgüyü sahnenin
    dışında tutar.
- **Tek kaynak:** 2B ve 3B aynı sürgü nesnesini gösterir.
  - 2B ile 3B yan yana açıkken sürgü 2B tuvalde görünür; 3B paneli yalnız 3B tek başına açıkken çıkar. Böylece iki kopya
    görünmez.
  - Cebir paneli açıkken sürgüler orada da bugünkü gibi durur.
- **3B'de sürgü ekleme:** panelin "+" düğmesi ve 3B araç panelinde "Sürgü" aracı.
- Panel küçültülebilir; boşken gizlenir.

### 3.6 Bağ satırı, askıya alma, canlandırma (bugünkü kurallar sürer)

- **Bağ satırı:** sürgünün altında "A · x" ya da "Küp 1 · kenar" yazar; zincir simgesiyle bağ geçici kapatılır.
- **Askıya alma:** bağ kapatılınca nesne bağlanmadan önceki yerine ya da ölçüsüne döner.
- **Bir nesneye birden çok bağ:** bir noktanın x'i ve y'si iki ayrı sürgüye bağlanabilir. Aynı özelliğe ikinci bağ
  gelince eskisinin yerini alır ve bunu söyler.
- **Canlandırma:** sürgü oynatılınca bağlı nesne hareket eder. İzi Göster ile birlikte noktanın çizdiği yol görünür
  (geometrik yer).
  - Örnek 1: x'i a'ya, y'si a²'ye bağlı nokta paraboldeki yolu çizer.
  - Örnek 2: 3B'de açınım oranına bağlı sürgü küpü açıp kapar.

## 4. Teknik notlar

- **Nokta x ve y'sinin iki ayrı sürgüye bağlanması:** bugünkü tek `sliderPoint` kurulumu yetmez. Kurulum x, y, z için ayrı
  sürgü kimlikleri taşımalı, örneğin `{ kind: 'sliderPoint', mode: 'xyz', x?: sliderId, y?: sliderId, z?: sliderId }`.
  Bağlı olmayan eksen serbest kalır.
- **z bağı:** `zEkseni.ts` bağımlı noktaların z'sini zaten hesaplıyor; sürgüye bağlı z oraya eklenir.
- **3B cisim bağları:**
  - Cisme `surguBaglari?: Partial<Record<'x' | 'y' | 'z' | 'genislik' | 'yukseklik' | 'derinlik' | 'yaricap' | 'donme' | 'acinim', string>>` eklenir.
  - Sürgü değişince cisim, 2B ile 3B deposu arasındaki köprüden (sceneBridge) güncellenir. Geri al tek adım olur.
  - Proje dosyası (`projectFile.ts`) bu alanı yazar ve okur.
- **İki yönlü sürükleme:** sürükleme bağlı koordinatı doğrudan yazmaz; sürgünün değerini (adıma oturtup aralıkta tutarak)
  yazar, koordinat oradan çözülür. Böylece tek doğru kaynak sürgüdür.
- **Kapsam:** sürgü değişken kapsamı bugün 6 ayrı yerde hesaplanıyor. Bu işle birlikte hepsi `surguKapsami`'na bağlanmalı
  (özgünleştirme raporundaki tutarsızlık 4).

## 5. Önerilen sıra

1. **2B, motoru hazır olanlar:**
   - listeye nokta x / y, parça uzunluğu ve açı;
   - x ile y için ayrı sürgü (veri modeli);
   - sağ tık "Sürgüye bağla";
   - iki yönlü sürükleme;
   - komut "A = (a, b)".
2. **3B'de sürgü paneli:** ekrana sabit panel, 3B'de sürgü ekleme, 2B ile senkron.
3. **3B bağları:** nokta z, cisim konumu, boyutları, dönmesi ve açınım oranı.

## 6. Karar gereken noktalar

1. **Sürükleme:** iki yönlü bağ (önerilen) mi, bağlı ekseni kilitlemek mi?
2. **3B'de sürgünün yeri:** tuval köşesinde yüzen panel (önerilen) mi, sol paneldeki bir sekme mi?
3. **Ortaokul:** cisim boyutu ve açınım bağları açık olsun mu (önerilen: evet; koordinat ve z yalnız lisede)?

## Kaynaklar

- [Desmos: Sliders and Movable Points](https://help.desmos.com/hc/en-us/articles/202529069-Sliders-and-Movable-Points)
- [Desmos topluluğu: When is a point draggable in Desmos?](https://cl.desmos.com/t/when-is-a-point-draggable-in-desmos-how-can-i-ensure-that-a-point-is-draggable/7831)
- [Desmos: Extending from 2D to 3D](https://help.desmos.com/hc/en-us/articles/19736835727885-Extending-from-2D-to-3D)
- [Desmos blog: Introducing movable points](https://blog.desmos.com/articles/introducing-movable-points/)
- [GeoGebra Wiki: Slider Tool](https://wiki.geogebra.org/en/Slider_Tool)
- [GeoGebra Wiki: Move Tool (3B'de xOy düzlemi / z ekseni kipleri)](https://wiki.geogebra.org/en/Move_Tool)
- [GeoGebra Wiki: 3D Graphics View](https://wiki.geogebra.org/en/3D)
- [GeoGebra: Variables, Sliders, and Input Boxes (A = (2 + a, 5 + b) örneği)](https://mat.geogebra.org/m/yrtb8pxc)

# Fen Keşif Köyü

İlkokul 3–4, ortaokul 5–8 ve bütün sınıflara açık Merak Laboratuvarı için özgün bir 3B öğrenme dünyası. Matematik Takımadaları'nın sıcak taş, ince metal ve cam mimari dilini, ormanlık bir kanyonun kaya teraslarına taşır; yapıların biçimi fen bilimlerine özgüdür.

## Mekânsal kurgu

Ormanlık kanyonun bir yamacında ilkokulun iki keşif pavyonu ve ekim bahçeleri, karşı yamacında ortaokulun dört yapısı yer alır. İlkokulda 3. sınıf güneyde, 4. sınıf kuzeyde durur; aralarındaki 17 birimlik mesafe, yüksekten bakan kamerada öndeki yapının arkadakini örtmesini önler. Ortaokulun dört yapısı 11,5 birim aralıkla birbirine yakın bir kare düzenindedir; ana aks aralarındaki koridordan geçer. Öndeki kaya terasında, bütün sınıfların ortak buluşma noktası olan daha büyük Merak Laboratuvarı bulunur. Büyütülen mikroskop bu terasın güçlü mimari işaretidir. Ahşap ve pirinç korkuluklu köprüler uçurumu geçer. Aynı doğal taş patikalar girişleri, köprüleri ve bahçeleri kesintisiz bağlar. Yapıları ayrı ayrı çevreleyen dikdörtgen sunum kaideleri kaldırılmıştır; ortak toprak ve bitki örtüsü bina ayaklarına kadar devam eder. Yerleşim, aşağıya uzanan kalın kaya katmanlarının tepesindedir. Derindeki nehir ve hafif vadi sisi yükseklik hissini güçlendirir.

| Sınıf | Yapı | Mimari kimlik |
| --- | --- | --- |
| 3 | Doğa Kaşifleri Evi | Yaprak biçimli sera, toprak ve bitki gözlemi |
| 4 | Kuvvet ve Işık Pavyonu | Katmanlı taş, iki kutuplu mıknatıs, devre sergisi |
| 5 | Gök ve Yaşam Gözlemevi | Teleskop kubbesi, Güneş–Dünya–Ay, hücre galerisi |
| 6 | Yörünge ve Hareket Merkezi | Sekiz gezegenli çatı, hareket arabası, kuvvet düzenekleri |
| 7 | Atom ve Enerji Enstitüsü | Atom tacı, prizma kanadı, optik ve enerji terasları |
| 8 | Yaşam ve İklim Biyosferi | DNA çift sarmalı, cam biyosfer, mevsim bahçeleri |
| Ortak | Merak Laboratuvarı | Açık avlu, üç cam fener, mikroskop ve deney masaları |

## İnce işçilik

Pencereler ayrı cam yüzeylerden ve düşey kayıtlardan oluşur. Çatıların kaburgaları, merdiven burunları, sütun bilezikleri, pirinç korkuluklar, ahşap bank çıtaları ve bitki saksıları gerçek geometridir. Ana yapıların önleri açık tutulur; ağaçlar kaya teraslarının gerisine ve orman yamaçlarına yerleşir. Bilim nesneleri cephelere rastgele yapıştırılmak yerine yapının merkezini, çatısını veya deney avlusunu tanımlar.

Köprülerde ayrı meşe tabliye parçaları, perçinler, baklava kafesler, lamine kemerler, oyma madalyonlar ve fenerler bulunur. Dağ keçileri, kanat tüyleri modellenmiş kartallar, eğreltiler ve kır çiçekleri çevrenin parçasıdır. İlkokulun canlı sarı, mercan ve mavi ayrıntıları; diğer sınıfların bilim temalarına göre değişen çatı renkleriyle dengelenir.

Yapılar çayırın önünde durur: sınıf yapıları 1,22, laboratuvar 1,6 ölçeğindedir; çayır tonları yapıların krem ve renkli çatılarından bir kademe daha koyu ve derin tutulur, cam yüzeyler daha belirgin renklidir (alfa 0,48) ve web sahnesinde kısık ortam haritasından bağımsız parlak yansımalar alır. Tabelalar üç kademelidir: İLKOKUL ve ORTAOKUL levhaları (7,6 ve 8,6 birim, 1,0 birimlik harf), her sınıfın önündeki tabela (4,6 yerel birim, 0,72 harf; dünya ölçeğinde yaklaşık 0,9 birimlik harf) ve LABORATUVAR levhası (6,6 yerel birim, 1,6 ölçekle dünyada 10,6 birim). Bütün levhalar üst kenarı geriye yatırılarak (0,3–0,4 radyan) yüksekten bakan kameraya çevrilir; taşıyıcıları dik kalır. Levhalar yapının önünde, girişin altında kalır; kamera yukarıdan baktığı için giriş kapısını örtmez. 7. sınıfın girişi doğrudan Laboratuvar Galerisi'nin kapısına açıldığından, bu sınıfın tabelası (3,5 yerel birim) kapı portalının batısında, batı kanadının önündedir; portal onu örtmez.

## Canlılar

Hayvanlar `koyu_olustur.py` içinde kendi köklerinde kurulur (`kartal_ucan`, `kartal_tunek`, `kartal_tunek_ucus`, `keci_buyuk`, `keci_kucuk`); `web_aktar.py` bu kökleri çevreyle birleştirmeden, kökün özel özellikleriyle (glTF extras) birlikte aktarır. Yerel +X yönü baştır; kökün konumu hayvanın ayak, uçuşta gövde noktasıdır. Web sahnesinde `fenCanlilar.ts` onları canlandırır:

- Süzülen kartal kanyonun üstünde (Three.js `-7, 13.6, -1` çevresinde) sekiz çizer; her turda bir sola, bir sağa yatarak döner.
- Arkadaki kayalıkta tüneyen kartal 16–38 saniyede bir kalkar, doğu ormanının üstünde bir tur atar ve aynı tüneğe süzülerek geri konar; tünek pozu ile uçuş pozu yer değiştirir. Blender posterinde yalnız tünek pozu görünür (uçuş pozunun `hide_render` bayrağı açıktır).
- İki krem-beyaz dağ keçisi (kahverengi kayalıkta kaya gibi kaybolmasınlar diye), doğu kanyon kolunun kameraya bakan kuzey duvarındaki altı düz tepeli seki kayasında (`DAG.basamak`) otlar; seyrek olarak dönüp yan basamağa adım adım, alçak bir tümsekle geçer. Basamak listesi keçi köklerinin `basamaklar` extras alanından okunur; iki keçi aynı basamağı paylaşmaz.

Hareketli gövdeler 1. katmandadır: önbelleklenen GTAO ve sis derinliği onları görmez, duragan gölge haritası eski bir siluet bırakmaz; gölge düşürmezler. Hareket azaltma tercihi etkinse hepsi durur.

### Dönen yapı parçaları

Her sınıfın bilim nesnesi yapının üstünde kendi alt kökünde durur: `fen_ortak.donen_grup(ad, pivot, before)` belirli bir andan sonra kurulan parçaları pivot konumlu bir Empty'ye taşır (dünya konumları `matrix_parent_inverse` ile korunur) ve Three.js koordinatındaki dönme eksenini `eksen` özel özelliğine yazar. `web_aktar.py` bu alt kökleri yapı kökünün altında ayrı düğüm olarak, extras'larıyla birlikte aktarır (`grade_4_dunya`, `grade_5_kubbe`, `grade_6_gunes_sistemi`, `grade_7_atom`, `grade_8_dna`, `LAB_taret`, `LAB_odak`). `_settle_new` yalnız kökün doğrudan çocuklarını indirir; alt kökler çocuklarıyla birlikte iner.

Web sahnesinde `fenDonenParcalar.ts` onları döndürür: fare bir yapının üzerine gelince (ya da yapı seçiliyken) 4. sınıfın jeolojik küresi kutup ekseninde (0,9 rad/sn), gözlemevi kubbesi kapak raylarıyla birlikte döner tablada (0,3), güneş sistemi modelinin yörünge ve gezegenleri güneş çevresinde (0,6), atom tacı (1,2) ve DNA çift sarmalı (0,8) düşey eksende hızlanır; fare ayrılınca yavaşlayarak durur (zaman sabitleri 0,45 / 0,9 sn). Küredeki pirinç eğik çubuk ve meridyen çerçevesi, teleskop, güneş ve DNA kürsüsü sabittir. Laboratuvardaki mikroskop kendi kendine oynar: 12–20 saniyede bir (laboratuvar üzerindeyken 5–8) objektif tareti 120° dönerek objektif değiştirir, ardından odak tekerleği ileri geri çevrilir (4 sn). Bu parçalar hayvanlar gibi 1. katmandadır: önbelleklenen GTAO ve sis derinliği onları görmez, dönerken AO yeniden hesaplanmaz ve kare hızı düşmez; gölge düşürmeyi sürdürürler ve hareket ettikleri sürece duragan gölge haritası her üç karede bir, durduklarında son bir kez tazelenir. Hareket azaltma tercihi etkinse dönmezler.

## Atmosfer

Web sahnesindeki arka orta zirve (Three.js yatay koordinatı `12, -40`) karlıdır. `fenKarliZirve.ts`, mevcut dağ yüzeyinin yüksekliğine ve eğimine bağlı, düzensiz etekli bir kar örtüsü uygular; altındaki kayalık geçiş ile diğer yeşil zirveler korunur. Aynı karlı bölgedeki ağaçların üst dalları ve taçları da kar tutar; alt yüzeyleri yeşil kalır. Kar da diğer yüzeyler gibi günün ışığından etkilenir.

Renk canlılığı: web çıktı gölgelendiricisi (`fenGorunum.ts`) ton eşlemeden önce doğrusal uzayda doygunluğu `DOYGUNLUK` (1,22) çarpanıyla artırır; poster aynı çarpanı Blender kompozitöründeki Hue/Saturation düğümüyle, görünüm dönüşümünden önce uygular (`posteri_render.py`). Güneş belirgin gölgeler için güçlü (3,15), yarımküre dolgusu ve ortam haritası kısıktır (0,52 / 0,14); böylece gri dolgu renkleri yıkamaz, yapılar çayırdan ayrılır. Vadi sisi hacimleri seyrektir (yoğunluk 0,10–0,11) ve sahne sisi 170 birimden sonra başlar; uzak zirveler süt rengine bulanmaz.

Web görünümünde günün saati değiştirilebilir. Güneş, ay, gökyüzü, bulutlar ve ortam ışığı birlikte değişir; gece aydınlatması yapıların okunurluğunu korur. Sis, yerleşimin dış kenarlarındaki gerçek 3B hacimlerde ışın yürütme ile çizilir ve yalnız ekran kenarlarında görünür; kanyon içinde sis yumağı yoktur (sürüklenen açık renkli bir kaya gibi okunuyordu). Opak yüzeylerin derinliği hesaba katılarak sis örneklemesi kaya, ağaç ve cephe yüzeylerinde sonlandırılır.

Dağ kütlesi düz bir vadi zemininde durmaz, bulut denizinin içinden yükselir (`fenBulutDenizi.ts`): en altta kapalı ve derinlik yazan bir bulut örtüsü, üstünde alan alan açılan, tepeleri gürültüyle kabaran iki yumak katmanı. Katmanlar duvarların eteğinde durur; duvarlar ve fosiller eteğe kadar görünür. Bulutlar günün saatine göre renk alır, yavaşça sürüklenir ve sahne sisiyle uzakta erir; şelaleler bu denize girerken dünya yüksekliğine göre solar. Kar doğrudan çayıra iner; zirve altında ayrı bir alpin kaya bandı yoktur. Tepeler hendeğe yaklaşırken yumuşakça söner; kanyon dudağı tepelerin yanında da alçak kalır. Güney ve doğu nehir kolları, iki ayrı kanyon ağzından aşağı uzanan hareketli şelalelerle devam eder. Şelale katmanlıdır (`fenSelale.ts`): düşerken genişleyip saçaklanan ana perde, ondan ayrılan iki ince yan iplik, perdenin kıvrıldığı çıkıntılarda kaya sıçramaları, dipte halkalar hâlinde yayılan köpük havuzu, yükselip dağılan püskürtü sisi ve damlalar. Şeritler değer gürültüsüyle üretilir; akış aşağıya doğru hızlanır, köpük artar. Sağ alttaki dalga düğmesi güney ve doğu şelalelerini sırayla gösterir; fosiller bu görünümlerde kameraya döner. Bu döngü tasarımın atmosfer kontrolüdür; belirli bir konum ve tarihe ait astronomik hesaplama değildir. Blender ana görselinde hafif hacimsel bulut ve sis vardır; saat kontrolü ve hareketli su etkileşimli web sahnesindedir.

Kaynak modelde güney kolunun sonu Blender koordinatlarında `(-24, -45, -7.55)` noktasındadır. Dış kenar yaklaşık 1,77 metre ileride, suyun 2,45 metre üzerinde kalan bir kaya dudağı oluşturur. `fenNehirAgzi.ts`, GLB yüklendiğinde güneydeki bu çıkış ile doğudaki Three.js `(50, -7.55, 23)` çıkışının çayır ve kaya geometrisini bir kopya üzerinde aşağı oyar; kanal tabanı Three.js koordinatlarında `y = -7.78` olur. Su yatağını yükseltmez, bina geometrilerine veya `.blend` ve `.glb` dosyalarına yazmaz. Şelale ve püskürtü sisi web sahnesinin hareketli atmosfer katmanıdır; kalıcı mimari kaynaklardan ayrı tutulur.

## Jeolojik katmanlar ve fosiller

Dış dağ kütlesi (`dag_arazisi.massif_outer_walls`) çayırın uçurum dudağından yuvarlanarak indiği bir omuzla başlar; altında `KATMANLAR` tablosundaki on üç katman iner. Her katmanın kendi üst ve alt halkası vardır: sert kireçtaşı ve kumtaşı dışa taşar, yumuşak çamurtaşı, şeyl ve damarlar geri çekilir (basamaklı "uçurum ve seki" profili). Katman halkaları mutlak yüksekliktedir; sınırlar tam yataydır, kaymış ya da kırık katman yoktur. Renkler köyün ilk sürümündeki sıcak kahve kaya ailesindedir; katmanlar biçim ve dokuyla okunur. Dorukların profili sivri koni değil yuvarlak kubbedir; arazi ızgarası kanyon dudağındaki testere dişini azaltmak için sıklaştırılmıştır (adım 0,5); dudağa ve yamaç eteğine yakın köşe noktaları tam kırışık çizgisine oturtulur, her hücrenin köşegeni yükseklik farkı küçük olan çift boyunca seçilir ve kanyonun bütün yüzeyleri yumuşak gölgelenir. Böylece kırışık çizgisi hücre kenarlarını izler, dişli bir kenar kalmaz. Dere tabanı suyun iki yanında kısa birer kıyı şeridi bırakır ve yamaç eteği yumuşak başlar; böylece ırmak kenarları tırtıklı görünmez. Güney ve doğu kolları kaya dudağının ötesine kadar sürer: kanyon ağzı modelde açılır ve su şeridi şelalenin başladığı dudağa kadar kesintisiz uzanır. Kanyon yamaçlarındaki kaya çıkıntıları seyrek ve iridir, dere çakılı ve köpük çizgisi yoktur. Kampüs çayırı sadedir: yol kenarında sınır taşı ya da eğrelti, çayırda şimşir, çiçek, kelebek, mineral küresi ya da bina önü saksısı yoktur; ekim bahçesi iki toprak yatağından oluşur, yol lambaları yalnız köprü yaklaşımlarında ve ana kavşaklardadır; orman zemininde ayrı parça yoktur. Ufak nesne kalabalığı ekranı karıştırmaz.

Katman yüzeyleri ve kanyonun iç duvarları tek bir `canyon_stratum` malzemesi taşır. Blender'da bu malzeme dünya yüksekliğini sabit adımlı bir renk rampasına ve gürültü dokusuna bağlar; web sahnesinde `fenKatmanlar.ts` aynı tabloyu çevre kökünün extras alanından okur ve her pikseli dudaktan derinliğine göre boyar: tane, ince tabakalanma çizgileri, dikey aşınma izleri ve katman sınırlarında koyu yatak çizgisi. Böylece vadi içindeki büyük üçgen yüzeyler bile sürekli, yatay bantlar gösterir. Serbest kaya parçaları (`cliffN`) yalnız tane dokusunu alır. Kar örtüsü gölgelendiricisi katman renginin üstüne zincirlenir.

Fosiller (`fosiller.py`) katman merkezlerine, duvara paralel kalın sırtlı koyu levhalar üzerinde açık renkli kabartma olarak yerleşir; `duvar_yuzeyi()` duvarın yerel çerçevesini verir, levha yüzü duvarın yerel dalgalanmasının en dış noktasına göre ayarlanır. Güney duvarında güney şelalesinin doğusunda dinozor (turuncu kumtaşı katmanı), batısında amonit, balık ve trilobit (deniz şeyli); doğu duvarında plesiosaur, balık ve amonit; güney duvarının doğu ucunda amonit ve trilobit vardır. Her fosil kendi kökünde (`fosil_*`) aktarılır; kök extras alanı türü (`tur`) ve duvarın dışa bakış yönünü (`bakis`) taşır. Web sahnesinde fosiller tıklanabilir: üzerine gelince levha ısınır, tıklanınca kamera duvarın dışa bakan yönünden alçak bir açıyla fosile yaklaşır ve `fenVerisi.FEN_FOSILLERI` içindeki bilgi paneli açılır (dönem, neler görüyoruz, katmanın hikâyesi, öğrenmeyle bağı; diğer fosillere geçiş düğmeleri; klavyede F tuşu fosilleri sırayla gezer). Katmanlar ve fosiller simgesel modellerdir; gerçek jeolojik zaman ölçeğini birebir temsil etmez.

## Müfredat dayanağı

Araştırma 27 Eylül 2026 tarihindeki resmî MEB programları üzerinden yapıldı. 2026–2027 geçişinde 3, 5, 6 ve 7. sınıflar TYMM; 4 ve 8. sınıflar önceki programla eşleştirildi. Kaynaklar, örnek öğrenme çıktıları ve mimari gerekçeler [kazanim-arastirmasi.md](kazanim-arastirmasi.md) içindedir.

Binalar bütün ünitelerin yerine geçmez. Her yapı baskın bir görsel kimlikle birkaç temel bilim alanına işaret eder. Atom halkaları ve gezegen büyüklükleri simgesel mimari öğelerdir; ölçekli fizik modelleri olarak sunulmaz. 3B önizlemede sınıf seçimi yapının temalarını ve program bağlantısını açar; henüz hazırlanmış ders etkinlikleri varmış gibi davranmaz.

## Dosyalar

- `fen-kesif-koyu.blend`: Malzemeleri, kameraları, ışıkları ve ayrı nesneleriyle düzenlenebilir ana sahne.
- `fen-kesif-koyu.png`: Ana köyün yüksek çözünürlüklü mimari görseli.
- `../public/fen-bilimleri/fen-kesif-koyu.glb`: Web için sıkıştırılmış, bina grupları korunan model.
- `../public/fen-bilimleri/detay-3.png` … `detay-8.png`, `detay-lab.png`: Yapıların ayrı katalog görselleri.
- `../src/app/fen-bilimleri/page.tsx`: Uygulamadaki bağımsız 3B önizleme rotası.
- `fen_ortak.py`, `yapilar_temel.py`, `yapilar_ileri.py`: Parametrik model kaynakları; `fen_ortak.donen_grup` dönen alt kökleri kurar.
- `koyu_olustur.py`: Çevre düzenleme, sahne, aydınlatma, ana render ve GLB aktarımı.
- `dag_arazisi.py`, `dag_dekorlari.py`, `kopru_mimarisi.py`: Kanyon, jeolojik katmanlar, bitkiler, hayvanlar ve ayrıntılı köprüler.
- `fosiller.py`: Katmanlara gömülü, kendi köklerinde aktarılan tıklanabilir fosiller.
- `../src/components/fen-bilimleri/fenCanlilar.ts`, `fenDonenParcalar.ts`, `fenKatmanlar.ts`, `fenSelale.ts`, `fenBulutDenizi.ts`: Web sahnesinde hayvan animasyonu, dönen yapı parçaları ve mikroskop oyunu, katman dokusu, şelale ve bulut denizi.
- `atmosfer.py`: Blender ana görselindeki çevre bulutları ve vadi sisi.
- `detaylari_render.py`: Sınıf yapılarının ayrı katalog çekimleri.
- `web_aktar.py`: Kaydedilmiş sahnenin geometrisini ve köşe normallerini tamponlar üzerinden birleştirip GLB üretir; kaynak sahneyi değiştirmez.
- `posteri_render.py`: Kaydedilmiş sahneden genel görünümü tekrar alır; modelin yeniden kurulması gerekmez.

## Yeniden üretme

Proje kökünde Blender 4.4 ile:

```powershell
& 'C:/Program Files/Blender Foundation/Blender 4.4/blender.exe' -b --factory-startup --python fen-bilimleri/koyu_olustur.py
& 'C:/Program Files/Blender Foundation/Blender 4.4/blender.exe' -b fen-bilimleri/fen-kesif-koyu.blend --python fen-bilimleri/detaylari_render.py
```

İlk komuta `-- --preview` eklenirse düşük örnekli önizleme, `-- --no-render` eklenirse yalnız model ve GLB üretilir (yaklaşık iki dakika). Web sahnesi geometrisi malzeme ve kök bazında birleştirilir; çevre, yedi yapı, beş hayvan ve dokuz fosil kökü ayrı düğümlerdir ve kök özel özellikleri glTF extras olarak aktarılır. Kaynak `.blend` dosyasında parçalar ayrı kalır. Haricî model servisi veya üretim API'si gerekmez.

Yalnız web modelini yenilemek için kaydedilmiş `.blend` dosyasını `--python fen-bilimleri/web_aktar.py` ile açın. Yalnız genel görsel için aynı dosyayı `--python fen-bilimleri/posteri_render.py` ile açın. PNG kaydıyla ilgili bir sorun yaşanırsa düzenlenebilir sahne korunur; model kurulumu tekrarlanmaz.

Uygulama `npm run dev` ile açıldıktan sonra `/fen-bilimleri` adresinden gezilir. Sınıf ve laboratuvar binalarına doğrudan tıklanarak seçim yapılır; kayan bina etiketleri ve alttaki sınıf menüsü gösterilmez. Tuval odaktayken 3–8 tuşları sınıfları, L tuşu laboratuvarı açar. Kamera odağı, sürükleyerek döndürme, yakınlaştırma ve genel görünüme dönüş desteklenir.

Web görünümü Three.js ile, yarım duyarlıklı HDR tamponunda donanımın desteklediği en fazla 4 örnekli kenar yumuşatma kullanılarak çizilir. Masaüstünde 1,5–2 aralığında piksel oranı, mobilde en fazla 1,5 kullanılır. `fenGorunum.ts`, opak geometriye bağlı yumuşak temas gölgelerini GTAO ile hesaplar; kamera sabitken derinlik, normal ve gölge sonucu tekrar hesaplanmaz. Cam, gökyüzü, sis ve seçim halkaları bu hesaba katılmaz. Ana güneş gölgesi masaüstünde en fazla 4096 piksel çözünürlüktedir; küçük mimari ayrıntıların temasını koruyan düşük normal sapması kullanılır.

AgX dönüşümüne, Blender posterindeki Medium High Contrast görünümünün 1,2 katsayılı logaritmik kontrast adımı eklenir. %18 gri pivotu Three.js'in log aralığına dönüştürülür; ton eşleme ve sRGB dönüşümü yalnız son çıktı geçişinde uygulanır. Değişiklik sadece fen sahnesinin yerel çıktı malzemesindedir. Ortam ışığı doğrudan güneşle dengelenir; günün saatine bağlı ışıklar çalışmaya devam eder. Bu yaklaşım posterdeki derinlik ve renk yoğunluğunu yaklaştırır; Cycles'ın bütün dolaylı ışık hesaplarının birebir karşılığı değildir. Gökyüzü bulutları sürekli Gauss alanlarından oluşur. CSS arka plan bulanıklığı kullanılmaz. Hareket azaltma tercihi etkinse bulut, sis ve nehir akışları sabit kalır.

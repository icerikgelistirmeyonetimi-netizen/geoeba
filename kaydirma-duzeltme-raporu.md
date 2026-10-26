# Kontrol paneli kaydırma düzeltmesi — rapor (2026-10-26)

Kazanım içerik sayfalarında (`public/kazanim-icerikleri/`, MAT.1–12 ve MAT.H; 5. sınıf ve MAT.6.1.7 hariç) sağdaki
kontrol panelinin gövdesi (`.bolum.etkilesim > .kontrol-govde`) 1280×720'de kutuya sığmıyor, şıklar/kartlar/düğmeler
panelin altında gizli kalıyordu. İş, kullanıcının «bitir artık, kalanları yapmanı istemiyorum» kararıyla yarıda bırakıldı.
Commit yok.

## Özet

| | Sayfa | Alt sayfa |
|---|---|---|
| Taranan | 285 | — |
| İlk taramada taşan | 245 | 802 |
| Bloğu yazılan (düzeltilen) | **106** | ilk taramadaki 381 taşan alt sayfanın 374'ü düzeldi (+ taramanın kaçırdığı birkaçı) |
| Gerekçeyle bırakılan (yazılan sayfalarda) | 6 sayfa | 7 alt sayfa (6'sı değerlendirme) |
| Yapılmayan (iş durduruldu) | **139** | — |

- **Yapılan sınıflar:** 3. sınıf (29 sayfa, tamamı), 4. sınıf 4.1.x–4.3.2 (24 sayfa), 10. sınıf (17, tamamı), 11. sınıf
  (15, tamamı), 12. sınıf (20, tamamı), 1. sınıftan yalnız MAT.1.1.2-a (pilot).
- **Hiç yapılmayan:** 1. sınıf (pilot dışında), 2. sınıf, 4. sınıf 4.3.3–4.4.2, 6., 7., 8., 9. sınıf ve hazırlık (H).
  58 sayfanın taslak CSS'i scratchpad'te var ama doğrulanmadı ve sayfalara YAZILMADI (liste aşağıda).
- **Ölçüt:** her alt sayfada `.kontrol-govde` scrollHeight − clientHeight ≤ 0 (1280×720); değerlendirmede soru noktası
  olanlarda her soru ayrı ölçüldü; karışık havuzlar için 3 yükleme.

## Ne yapıldı, nasıl

- Her sayfaya `</main>`dan hemen sonra tek `<style id="gorsel-duzen-tasma">` bloğu (0,3–4,4 KB; 20 000 karakterin çok
  altında). Aynı blok hem geoeba kopyasına hem üretim kaynağına (`C:\Semih TiRYAKi\icerik_gelistirme_yeni - Kopya\cikti\`)
  yazıldı; `npm run kazanim:aktar` çalıştırılmadı, bir sonraki aktarım düzeltmeyi silmez.
- Yalnız boşluk/dolgu/aralık/min-height. Sahne SVG (meet) ya da boyutunu kendisi okuyan 3B ise sütun oranı 7fr/5fr →
  6.4fr/5.6fr (sayfanın kendi 8fr/4fr'si → 7fr/5fr); sabit boyutlu 2B canvas'ta oran değişmedi. Birkaç yerde iki öğe alt
  alta yerine yan yana. Şablon sınıfları (`.kart`, `.kavram-kart`, `.parca-btn`, `.buton`) katmansız
  `#cerceve #sayfa-N …`, sayfa sınıfları `@layer sayfa` içinde aynı seçiciyle. Metin, yazı boyutu (`yazi-standardi`),
  sorular, betikler değişmedi.
- Hiza: panel genişliğindeki düğmelerde sola yaslı yazı bulunan sayfalara
  `#cerceve .bolum.etkilesim .buton { justify-content: center; }` eklendi (`hiza.py` bulgusu olan sayfalar).

## Doğrulama

- **106 / 106 sayfa:** blok çıkarılınca kopya ve kaynak, yazmadan önce alınan yedekle bayt bayt aynı; blok tek ve
  `</main>`dan hemen sonra; kopyadaki ve kaynaktaki blok aynı; aktarım dönüşümü(kaynak) == kopya.
  (MAT.4.1.10-a'nın tabanı aşağıdaki onaylı içerik değişikliklerinden sonra yenilendi.)
- **Taşma ölçümü:** 96 sayfa yalnız ajanların CSS'i sayfaya enjekte ederek yaptığı 3 yüklemeli ölçümle (`tara.py --duzen
  --tekrar 3`) doğrulandı. **Bloğu yazılmış gerçek dosyayla yalnız 10 sayfa ölçüldü:** MAT.1.1.2, 10.1.1, 10.1.2, 10.1.3,
  10.2.1, 10.2.3, 10.2.4, 10.2.5, 10.2.6 (headless) ve MAT.4.1.10 (headless'ta çöktüğü için uygulama içi tarayıcıda);
  sonuç ajan ölçümleriyle aynı (yalnız gerekçeyle bırakılan alt sayfalar taşıyor). Bütün sayfaların gerçek dosyayla toplu
  ölçümü, iş durdurulduğu için yarıda kesildi.

## Gerekçeyle bırakılan alt sayfalar

| Sayfa | Alt sayfa | Taşma | Neden |
|---|---|---|---|
| MAT.10.2.4-a | s2 | 172 px | Karşılaştırma kutusu, 4 yuva ve 3 sütunlu 7 kartlık havuz; sayfanın kendi 6fr/6fr oranı daraltılmadı. En sıkı boşlukla bile ~45 px kalıyor; yuva/havuz yeniden düzenlenmeden sığmıyor. |
| MAT.10.2.4-a | s18 (değerlendirme) | 2. soru 99, 4. soru 61 px | Soru metni uzun, şıklar şablonun sıkı değerinde; boşlukla en çok ~25 px. |
| MAT.10.2.6-a | s13 (değerlendirme) | 3. soru 30 px | Panel sayfanın kendi 4.8fr/7.2fr oranıyla zaten geniş; boşlukla ~28 px. |
| MAT.10.4.3-a | s9 (değerlendirme) | 5. soru 35 px | Beş iki satırlık şık + 6 satır soru; sayfanın kendi 6.5fr/5.5fr oranı; şık dolgusu 3 px'in altına inmeden sığmıyor. |
| MAT.11.1.2-a | s13 (değerlendirme) | 4. soru 50 px | 2–3 satırlık şıklar (60–86 px); boşlukla en çok ~28 px. |
| MAT.11.2.4-a | s12 (değerlendirme) | 3. soru 35 px | 7 satır soru + beş iki satırlık şık; soru–şık arası 2 px'e inmeden sığmıyor. |
| MAT.12.1.1-a | s25 (değerlendirme) | 4. soru 25 px | 8 satır soru; şık aralıkları 0–2 px'e inmeden sığmıyor. |

## Bilinen sınırlar ve notlar

- **Yalnız açılış durumu ölçüldü.** Etkileşimden sonra açılan öğeler (sonuç kartları, «Yeniden Başlatalım» düğmesi,
  genel kural kartı vb.) paneli yeniden taşırabilir; ajan notlarında örnekler var (ör. 4.2.1 s6, 4.2.3 s4, 10.1.3 s5,
  11.1.7 s3, 11.2.4 s3, 12.2.8 s1). 3.2.3 s7 ve 3.2.6 s10'un etkileşim sonrası hâlleri ayrıca düzeltildi.
- **Ezilen kartlar:** `min-height`'lı gövde çocukları sığmayınca küçülür ve ölçülen taşma gerçeğinden küçük çıkar
  (3.2.6 s9: 21 px ölçüldü, gerçekte 159 px; düzeltildi). Bu denetim (`--ezilme`) yalnız 3. sınıf B grubunda yapıldı;
  diğer yazılan sayfalarda yapılmadı.
- **Soru noktası olmayan değerlendirmeler:** tarama yalnız ilk (karışık sıralı) soruyu ölçer. 3. sınıf B ve 4. sınıf A
  gruplarında sorular tek tek gezildi (4.1.7 s8'de taramanın kaçırdığı 65 px, 3.2.7 s7'de 47 px bulunup düzeltildi);
  diğer gruplarda bu tür sayfalarda yalnız ilk soru ölçülmüş olabilir.
- 3B sahneli bazı alt sayfaların ekran görüntüsü yük altında zaman aşımına uğradı; bunlar yalnız ölçümle doğrulandı.
- MAT.10.3.2-a s7: panel genişleyince şablonun kendi betiği (`baslikTekrariniGizle`) soru sayacı başlık satırına
  sığdığı için «DEĞERLENDİRME» rozetini gizliyor (şablon davranışı).
- Önceden ayrışmış iki sayfa: MAT.6.6.1-a ve MAT.H.3.3-a'da bu işten önce de dönüşüm(kaynak) ≠ kopyaydı (yönerge
  metinleri farklı; 6.6.1 kaynağında `ortak/`'ta olmayan bir betik bloğu var). İkisine de blok yazılmadı.
- `out/` derlemesi güncellenmedi.

## İçerik değişikliği (kullanıcı onayıyla): MAT.4.1.10-a s6

- «Parçadan Bütüne» şemasında 18 bilyenin bütünün 3/4'ü olduğu yazmıyordu (÷ 3 adımı dayanaksızdı). Tepe kutusu
  «18 Bilye» → «3/4'ü 18 Bilye»; sığması için iki tepe kutusu 190 → 240 px (sol kutunun yazısı aynı).
- Ayrı oturum («MAT.4.1.10 s6: sırayla gelen ve canlanan kesir şeması») aynı alt sayfayı sıralı akışa çevirdi: önce
  «Çokluktan Parçaya», sonra «Parçadan Bütüne», sonra iki şema yan yana; her doğru yerleştirmede ÷/× adımı canlanıyor.
  Kopya ve kaynakta aynı; taşma bloğu yerinde.

## Çalışma ortamı

- Kullanıcının `next dev`'i (3000) iş sırasında bir süre kapandı; ölçümler `public/`'i sunan geçici statik sunucuyla
  (5200) sürdü, ölçümler 3000 ile birebir aynı çıktı. Sunucu kapatıldı.
- Üretim kaynağı klasörüne yazmak için oturuma klasör izni verildi; var olan dosyanın üzerine yazım ara sıra «Errno 22»
  verdiğinde aynı klasöre geçici dosya yazılıp yerine taşındı (geride geçici dosya yok).
- Araçlar, taslaklar, yedekler ve ajan notları: scratchpad `arac\` (`duzen\<SAYFA>.css`, `sonuc\*.md`), `yedek\`.

## Yapılmayan sayfalar (iş kullanıcı kararıyla durduruldu)

İlk taramada taşan 245 sayfadan 139 tanesine blok YAZILMADI. Taslağı olanlar (scratchpad `arac\duzen\`, doğrulanmamış) «taslak» diye işaretli.

| Sayfa | İlk taramadaki taşma (px; D = değerlendirme) | Taslak |
|---|---|---|
| MAT.H.1.1-a | s3:75 | taslak |
| MAT.H.2.1-a | s1:5 s5:18 s8:48 s9:12 s10:37 s13:115 s17:36 | — |
| MAT.H.3.1-a | s3:4 | taslak |
| MAT.H.3.3-a | s1:7 s5:15 | taslak |
| MAT.H.4.1-a | s2:4 | taslak |
| MAT.H.4.2-a | s1:2 s3:215 s4:151 s5:154 s6:114 s7:25 s8:20 | — |
| MAT.H.4.3-a | s6:28 | taslak |
| MAT.H.4.4-a | s4:97 s6:1 | taslak |
| MAT.H.4.5-a | s2:7 s4:5 s6:47 s7:9 | — |
| MAT.H.5.1-a | s3:25 s7:6 | taslak |
| MAT.1.1.1-v2-a | s2:60 s4:88 | taslak |
| MAT.1.1.3-a | s3:11 | taslak |
| MAT.1.1.4-a | s6:21 | taslak |
| MAT.1.2.1-a | s4:15 s6:32 | taslak |
| MAT.1.2.2-a | s4:76 | taslak |
| MAT.1.2.4-a | s1:48 s2:12 s3:83 s8:61 | taslak |
| MAT.1.3.1-a | s3:82 s4:84 s6:34 | taslak |
| MAT.1.3.2-a | s5:1 s8:19 | taslak |
| MAT.1.3.3-a | s3:7 | taslak |
| MAT.1.4.1-a | s11:3 | taslak |
| MAT.2.1.1-a | s1:65 | taslak |
| MAT.2.1.2-a | s1:80 s4:13 s6:54 s8:5 | taslak |
| MAT.2.1.3-a | s2:136 s6:19 | taslak |
| MAT.2.1.4-a | s7:55 | taslak |
| MAT.2.1.5-a | s5:90 | taslak |
| MAT.2.1.6-a | s6:53 | taslak |
| MAT.2.1.7-a | s1:108 s3:27 s4:36 s5:148 s6:134 | taslak |
| MAT.2.1.9-a | s7:2 | taslak |
| MAT.2.1.10-a | s2:1 s4:55 s5:58 | taslak |
| MAT.2.1.11-a | s2:28 s4:10 s5:3 | taslak |
| MAT.2.2.1-a | s4:25 s5:28 s6:66 s7:64 s8:63 s9:16 | taslak |
| MAT.2.2.5-a | s6:91 s7:75 s8:110 | taslak |
| MAT.2.2.5-v2-a | s3:73 s9:8 | taslak |
| MAT.2.3.1-a | s1:22 s2:62 s7:102 | taslak |
| MAT.2.3.2-a | s1:23 s5:16 | taslak |
| MAT.2.3.3-a | s1:79 s2:28 | taslak |
| MAT.2.3.4-a | s1:54 s2:106 s6:45 | taslak |
| MAT.2.3.6-a | s2:59 s4:56 s7:36 | taslak |
| MAT.2.3.7-a | s2:61 s3:8 | taslak |
| MAT.2.4.1-a | s2:79 s5:1 s10:32 s11:38 s15:74 | taslak |
| MAT.4.3.3-a | s2:46 s3:16 s5:6 | taslak |
| MAT.4.3.4-a | s5:18 | taslak |
| MAT.4.3.5-a | s2:2 s6:34 | taslak |
| MAT.4.3.6-a | s2:37 s4:15 | taslak |
| MAT.4.3.7-a | s3:40 s7:66 | taslak |
| MAT.4.3.8-a | s5:31 | taslak |
| MAT.4.3.9-a | s5:1 | taslak |
| MAT.4.4.1-a | s3:4 s8:42 | taslak |
| MAT.4.4.2-a | s1:58 s4:13 s6:59 s9:4 s10:16 s11:6 s12:55 s13:45 s14:44 s15:34 s17:56 | taslak |
| MAT.6.1.1-a | s1:40 s3:23 s4:11 | taslak |
| MAT.6.1.2-a | s3:68 s8:28 s9:31 | — |
| MAT.6.1.3-a | s5:77 | — |
| MAT.6.1.4-a | s2:5 s7:59 | — |
| MAT.6.1.5-b | s3:112 s6:68 s7:43 | — |
| MAT.6.1.6-a | s3:78 s4:88 | — |
| MAT.6.1.8-a | s11:7D | — |
| MAT.6.2.1-a | s1:10 s5:38 s6:35 s7:28 s8:1 s9:25 s10:30 | — |
| MAT.6.2.2-a | s1:52 s6:15 | — |
| MAT.6.2.3-a | s1:17 | — |
| MAT.6.3.1-a | s1:70 s2:4 s6:20 | — |
| MAT.6.3.2-a | s1:52 s5:41 s6:70 s10:72D | — |
| MAT.6.3.3-a | s3:68 s5:32 s6:50 s7:64 | — |
| MAT.6.3.4-a | s1:123 s3:4 s4:16 s7:18 s8:39 | — |
| MAT.6.4.1-a | s1:5 s4:22 | — |
| MAT.6.4.2-a | s1:16 s3:22 s4:63 s5:20 s7:67 | — |
| MAT.6.4.3-a | s1:88 s5:70 s6:168 s10:69 s14:53D | — |
| MAT.6.4.4-a | s1:72 s6:42D s7:70D s8:77D | — |
| MAT.6.4.5-a | s2:62 s4:19 s8:135 s10:45D | — |
| MAT.6.4.6-a | s1:47 s4:51 s6:63 | — |
| MAT.6.5.1-a | s1:45 s6:22 s7:79 s10:100 s15:25 | — |
| MAT.6.5.2-a | s3:49 s6:93 s7:3D | — |
| MAT.6.6.1-a | s2:4 | — |
| MAT.7.1.1-b | s7:16 | taslak |
| MAT.7.1.3-a | s5:11 | taslak |
| MAT.7.1.4-a | s1:25 s3:57 s4:10 s8:17 | taslak |
| MAT.7.1.5-a | s1:63 s2:86 s5:67 s11:83 s12:7 s16:67D | — |
| MAT.7.1.6-a | s1:42 s4:57 | taslak |
| MAT.7.1.7-a | s3:4 s4:74 s9:7 s11:45 | taslak |
| MAT.7.2.1-a | s1:16 s2:10 s3:1 s4:22 | taslak |
| MAT.7.2.2-a | s1:23 s6:24 s13:40 s15:3D | taslak |
| MAT.7.2.3-a | s5:35 s7:67 s8:45 | taslak |
| MAT.7.3.2-a | s5:40 | taslak |
| MAT.7.4.1-a | s6:3 | taslak |
| MAT.7.4.2-a | s1:2 s2:35 s6:74 s7:16 | — |
| MAT.7.4.5-a | s2:36 s4:8 s9:41 | — |
| MAT.7.4.6-a | s2:74 s4:32 s5:58 s7:34 s8:46 s9:32 s11:2 s12:35D | — |
| MAT.7.4.7-a | s3:35 s4:57 s5:36 s6:53 | — |
| MAT.7.4.8-a | s4:66 s5:59 | — |
| MAT.7.4.9-a | s1:13 s6:56 s9:16 | — |
| MAT.7.4.10-a | s3:66 s4:15 s5:37 s8:51 s9:56 s13:62D | taslak |
| MAT.7.5.1-a | s7:56 s9:27 | — |
| MAT.7.5.2-a | s1:20 s4:101 | — |
| MAT.7.6.1-a | s6:43 s9:45 s15:78 s17:31 s19:3D | — |
| MAT.7.6.2-a | s1:5 s2:41 s3:45 s4:62 s5:23 | — |
| MAT.7.7.1-a | s4:25 | — |
| MAT.7.7.2-a | s6:37 s9:35D | — |
| MAT.7.7.3-a | s4:29 s7:3D | — |
| MAT.8.1.1-a | s1:30 s2:44 s4:48 s10:7 s12:13D | — |
| MAT.8.1.2-a | s3:67 s7:35 | — |
| MAT.8.2.1-a | s7:26 | — |
| MAT.8.2.2-a | s1:28 s2:62 s5:1 s6:48 s7:8 s9:59 s10:30 | — |
| MAT.8.2.3-a | s1:35 s2:31 s3:52 s6:22 s8:58 | — |
| MAT.8.2.4-a | s1:34 s2:6 s3:46 | — |
| MAT.8.3.1-a | s2:18 s6:14 | — |
| MAT.8.3.2-a | s4:32 s6:3 s7:2D | — |
| MAT.8.3.3-a | s3:16 s6:51 | — |
| MAT.8.3.4-a | s3:36 s5:55 s6:15 s8:68 | — |
| MAT.8.3.5-a | s2:119 s3:23 s4:102 s5:33 | — |
| MAT.8.3.6-a | s4:16 s5:82 s6:52 s9:47 s10:70 s12:55D | — |
| MAT.8.4.1-a | s1:7 s3:43 s5:86 s8:38 | — |
| MAT.8.4.2-a | s5:24 | — |
| MAT.8.4.3-a | s1:22 s2:12 s5:3 | — |
| MAT.8.5.1-a | s1:21 s2:84 | — |
| MAT.8.5.2-a | s2:35 s3:54 s4:39 s11:3D | — |
| MAT.8.5.3-a | s2:13 s3:69 s10:83 s11:28 | — |
| MAT.8.6.1-a | s7:70 s8:108 s13:6 s15:3 s17:16 s18:3D | — |
| MAT.8.6.2-a | s2:74 s5:67 | — |
| MAT.8.7.1-a | s2:14 s4:11 s6:32D | — |
| MAT.9.1.1-a | s11:1 s14:30D | — |
| MAT.9.1.2-a | s7:47 s10:1 s13:9 s14:29 | — |
| MAT.9.1.3-a | s6:69 | — |
| MAT.9.1.4-a | s4:55 s5:38 s7:7D | — |
| MAT.9.2.1-a | s1:4 s3:94 s4:52 s6:42 s7:104 s11:43 s15:6 s19:35D | — |
| MAT.9.2.2-a | s2:24 s3:23 | — |
| MAT.9.2.3-a | s1:3 s4:28 s10:27 s13:16 s14:30D | — |
| MAT.9.3.1-a | s1:30 s3:63 s4:11 s7:66 s8:9 | — |
| MAT.9.3.2-a | s4:21 s5:53 s6:88 s7:76D | — |
| MAT.9.3.3-a | s1:10 s3:46 s9:4D | — |
| MAT.9.4.1-a | s1:18 s7:60 | — |
| MAT.9.5.1-a | s6:47 | — |
| MAT.9.5.2-a | s3:20 s7:21 s8:67D | — |
| MAT.9.5.3-a | s4:47 | — |
| MAT.9.5.4-a | s4:25 s6:31 | — |
| MAT.9.5.5-a | s3:47 s4:84 s5:13 s6:60 s7:51 s9:90 | — |
| MAT.9.6.1-a | s1:34 s2:24 s6:23 s8:27 s14:35 s18:1D s19:46D | — |
| MAT.9.6.2-a | s2:2 s6:9 s9:76D | — |
| MAT.9.7.1-a | s1:28 s7:62 | — |
| MAT.9.7.2-a | s1:36 s4:78 s9:20 s10:67D | — |
| MAT.10.5.2-a | s5:73 s7:52 s9:35D | — |

## Sayfa sayfa: düzeltilip yazılan sayfalar

Her alt sayfa satırı: önce (CSS'siz) taşma → sonra; «ne yapıldı» ajanın notudur. «Son ölçüm» satırı bloğu yazılmış gerçek dosyanın ölçümüdür (1280×720, bir yükleme).


### 1. sınıf

#### MAT.1.1.2-a
- s3: önce 82 px → sonra 0 — sahne SVG: 7fr/5fr → 6.4fr/5.6fr (başlık, yönerge, düğmeler satır kısalır), gövde aralığı 6px
- s5: önce 16 px → sonra 0 — sahne SVG: 6.4fr/5.6fr (başlık ile rozet tek satır)
- Son ölçüm (gerçek dosya): bütün alt sayfalarda ≤ 0


### 3. sınıf

#### MAT.3.1.2-a
- s1: önce 29 px → sonra 0 — hedef kutusu (.kart) dikey dolgu 8, blok kartları (.kavram-kart) dikey dolgu 5, kart aralığı 6, gövde aralığı 6 (3B sahne)
- (s1 hiza: «Sıfırlayalım» yazısı ortalandı)

#### MAT.3.1.3-a
- s6: önce 53 px → sonra 0 — sahne SVG: 8fr/4fr → 7fr/5fr (yönerge ve kural notu birer satır kısaldı), düğme dizisi üst boşluğu 6
- s7: önce 23 px → sonra 0 — seçenek düğmeleri (.parca-btn) en az 40 px / dikey dolgu 3, kart dikey dolgu 8, gövde aralığı 6
- s8: önce 64 px → sonra 0 — iki .panel kutu dikey dolgu 8, kaynak kart dış boşluğu 6, kural maddeleri dolgu 4 / aralık 4, gövde/başlık aralıkları 6
- (s2, s3 hiza: «Sıfırlayalım» yazıları ortalandı)

#### MAT.3.1.4-a
- s2: önce 37 px → sonra 0 — üç .panel kart dikey dolgu 8, iç aralık 4, gövde aralığı 6 (3B sahne)
- s3: önce 48 px → sonra 0 — sahne SVG: 8fr/4fr → 7fr/5fr; kutular dikey dolgu 8, pul alanı dolgu 3, gövde aralığı 6
- s7: önce 68 px → sonra 0 — sürüklenen katman önizlemesi ile «100'lük Katman» yazısı yan yana; kutular dikey dolgu 8, sayaç aralığı 6, gövde/başlık aralıkları 6 (3B sahne)
- (s1 «Blok Ekle», s2 «Geri Adım», s5, s6 hiza: düğme yazıları ortalandı)

#### MAT.3.1.6-a
- s1: önce 1 px → sonra 0 — gövde aralığı 6
- s3: önce 65 px → sonra 0 — iki grup dikey dolgu 8 / aralık 6, kule satırları dolgu 5, «Tek Sayı» rozetleri dikey dolgu 3, sonuç kartı dolgu 6, gövde/başlık aralıkları 6 (3B sahne)

#### MAT.3.1.7-a
- s2: önce 58 px → sonra 0 — kule kartlarında önizleme ile yazı yan yana (kart yüksekliği 110→62) (3B sahne)
- s5: önce 68 px → sonra 0 — kutu ve cümle blokları dolgu 6/4, cümle dizisi üst boşluğu 0, havuz başlığı boşlukları 4, kartlar (.kavram-kart) en az 44 px / dolgu 4, havuz aralığı 6, gövde/başlık aralıkları 6
- s6: önce 67 px → sonra 0 — kural ve adım kutuları dikey dolgu 8, aralık 4/6, adım satırları dolgu 6, gövde/başlık aralıkları 6 (3B sahne)
- (s1 «Sıfırlayalım», s6 «Fazlalığı Kaldır» hiza: düğme yazıları ortalandı)

#### MAT.3.1.8-a
- s1: önce 65 px → sonra 0 — sahne SVG: 7fr/5fr → 6.4fr/5.6fr; «Sık Bölge» ve «Seyrek Bölge» kutuları yan yana (karşılaştırma)
- s4: önce 112 px → sonra 0 — «Kamera Açıları» başlığı ile görünüm düğmeleri yan yana, kartlar dolgu 5 / aralık 4, rozet ve düğme dikey dolgusu 2/4, gövde/başlık aralıkları 6 (3B sahne, oran değişmedi). Ekran görüntüsü yük altında WebGL nedeniyle alınamadı; doğrulama ölçümle.

#### MAT.3.1.9-a
- s1: önce 44 px → sonra 0 — lejant kutusu (.kart) dikey dolgu 8 / aralık 6, lejant satırları dolgu 6, başlık aralıkları 6 (3B sahne)
- s5: önce 28 px → sonra 0 — iki .panel kutu dikey dolgu 8 / aralık 6, dilim kartları (.kavram-kart) dikey dolgu 6, gövde aralığı 6
- (s2, s3, s7 hiza: düğme yazıları ortalandı)
- Not: koordinatör taraması zaman aşımına uğramıştı; css'siz `--tekrar 3` ölçümüm s1:44, s5:28.

#### MAT.3.1.10-a
- s4: önce 36 px → sonra 0 — kart havuzu aralığı 14→6, parça kartları (.kavram-kart) dikey dolgu 5 px, başlık alt boşluğu 6 (sahne canvas, oran değişmedi)

#### MAT.3.1.11-a
- s1: önce 7 px → sonra 0 — bilgi kartı dikey dolgusu 14→10
- s3: önce 12 px → sonra 0 — gövde aralığı 6, iki .panel kutunun dikey dolgusu 8
- s4: önce 14 px → sonra 0 — gövde aralığı 6, .panel kartların dikey dolgusu 8
- s6: önce 69 px → sonra 0 — sahne SVG: sütun 8fr/4fr → 7fr/5fr (yönerge bir satır kısaldı), kart ızgarası ve kart iç aralığı 6
- (s5 hiza: «Tabağa Yerleştir» yazısı ortalandı)

#### MAT.3.1.12-a
- s1: önce 64 px → sonra 0 — kurma kolu ile «Kolu saat yönünde çevirelim.» notu yan yana; gösterge kartları dolgu 5, aralık 6 (3B sahne, oran değişmedi)
- s2: önce 6 px → sonra 0 — gövde aralığı 6, hedef pano (.kart) dikey dolgu 10
- s5: önce 55 px → sonra 0 — 12 dakika pulu 4 yerine 6 sütunda (iki sıra), pul dolgusu 4
- s6: önce 59 px → sonra 0 — tuş takımı sıraları ikişer yan yana (1–6 / 7–9, Sil, 0)
- s10: önce 27 px → sonra 0 — gövde aralığı 6, durum/eşleşme kutuları (.panel) dikey dolgu 8, alt boşluk 6
- (s3 hiza: tam genişlik «Sıfırlayalım» yazısı ortalandı)

#### MAT.3.1.13-a
- s1: önce 71 px → sonra 0 — iki .kart dikey dolgu 8, iç aralık 6, sayaç kutusu dolgu 4, gövde/başlık aralıkları 6 (3B sahne, oran değişmedi)
- s2: önce 8 px → sonra 0 — tek kutunun boşa giden alt boşluğu (12 px) kaldırıldı
- s3: önce 7 px → sonra 0 — peron kutusu (.panel) dikey dolgu 10, aralık 8
- s5: önce 70 px → sonra 0 — kutular dikey dolgu 8, denklik kartları dolgu 5, liste aralığı 6, gövde/başlık aralıkları 6
- s6: önce 22 px → sonra 0 — eşitlik kartları aralığı 6, dikey dolgu 8

#### MAT.3.1.14-a
- s6: önce 57 px → sonra 0 — not: ölçülen 57 px'ten büyük sorun vardı; yuvalar 84 px'e ezildiği için kartların süre satırları alttaki karta biniyordu. Sahne SVG: 7fr/5fr → 6.4fr/5.6fr, dört kart 2 × 2; kartlar (.kavram-kart) dolgu 4px 8px, iç aralık 4, `align-items: stretch` (başlık–rozet kart genişliğine yayıldı, süre etiketleri aynı sol hizada)
- (s1, s3, s5 hiza: düğme yazıları ortalandı)

#### MAT.3.1.15-a
- s1: önce 10 px → sonra 0 — blok havuzu ve durum kartı dikey dolgu 8, gövde aralığı 6
- s2: önce 41 px → sonra 0 — iki .panel kutu dikey dolgu 8 / aralık 6, şerit bilgisi ve askı satırları dolgu 4, gövde/başlık aralıkları 6

#### MAT.3.1.15-v2-a
- s3: önce 44 px → sonra 0 — iki kutu dikey dolgu 8 / aralık 6, konteyner kartı iç aralığı 6, durum kutuları ve kilit kartı dikey dolgu 6, gövde aralığı 6 (3B sahne, oran değişmedi)
- (s3 hiza: tam genişlik «Sıfırlayalım» yazısı ortalandı)

#### MAT.3.2.1-a
- s3: önce 59 px → sonra 0 — gövde aralığı 6; kefe, blok kaynağı ve «Çıkarma İlişkisi» kutularının dolguları 6–8 px (3B sahne, oran değişmedi)

#### MAT.3.2.2-a
- s1: önce 143 px → sonra 0 — 3B sahne 8fr/4fr → 7fr/5fr (yönerge 6 → 4 satır); işlem, basamak ve adım kartlarının dolgu/aralıkları
- s3: (taşma yok) panel genişliğindeki «Sıfırlayalım» yazısı ortalandı (hiza)

#### MAT.3.2.3-a
- s2: önce 5 px → sonra 0 — gövde aralığı 6, işlem kartı dolgusu 12
- s3: önce 32 px → sonra 0 — terim kartları (.kavram-kart) min-height 44 / dolgu 4
- s4: önce 17 px → sonra 0 — bilgi ve havuz kartı dolgusu 10, bilgi satırı aralığı 6
- s6: önce 62 px → sonra 0 — kart grupları dolgusu 8, şıklar min-height 40 / dolgu 3, aralıklar 6
- s7: önce 103 px → sonra 0 — etap düğmeleri 40 px, panel kutusu sıkılaştı, onluk blok kaynağında svg ile yazı yan yana;
  2. etap («5 Katı») açılınca açıklama satırıyla 40 px daha taşıyordu → hedef/vagon kartlarında etiket ile değer yan yana,
  bölüm aralığı ve panel başı 6 (iki etap da 0)
- s10: önce 106 px → sonra 0 — SVG sahne 7fr/5fr → 6.4fr/5.6fr (cevap havuzu 3 → 2 satır), kutu dolgusu 8, kart dolgusu 5
- s1: (taşma yok) «Sıfırlayalım» yazısı ortalandı (hiza)

#### MAT.3.2.4-a
- s1: önce 78 px → sonra 0 — 3B sahne 8fr/4fr → 7fr/5fr (başlık tek satıra iner); kart alanı ve satır dolguları
- s3: önce 38 px → sonra 0 — paket/bölme kartları (.kart) dolgusu 8, önizleme ve ızgara boşlukları 4–6
- s6: önce 91 px → sonra 0 — SVG 7fr/5fr → 6.4fr/5.6fr (başlık tek satır), parça kartları min-height 44, panel dolguları 8
- s7 (değerlendirme): önce 15 px (1. soru) → sonra 0 — şıklar min-height 40 / dolgu 3, şık aralığı 5, soru-şık aralığı 8; 5 soru da 0

#### MAT.3.2.5-a
- s2: önce 15 px → sonra 0 — gövde aralığı 6, «Denge Durumu» kutusu (.kart) dolgusu 8 / aralık 8 (3B sahne, oran değişmedi); «Sıfırlayalım» yazısı ortalandı

#### MAT.3.2.5-v2-a
- s2: önce 159 px → sonra 0 — SVG 8fr/4fr → 6.4fr/5.6fr (yönerge 4 → 3 satır); sayı/işlem kartı tepsilerinde başlık ile kartlar yan yana; kartlar min-height 44
- s4: önce 41 px → sonra 0 — blok kartları min-height 46 / dolgu 4, tepsi dolgusu 10, kart aralığı 6

#### MAT.3.2.6-a
- s4: önce 117 px → sonra 0 — SVG 6.4fr/5.6fr (yönerge 3 → 2 satır), ifade kartları min-height 44, yuva ve panel dolguları; «Sıfırlayalım» yazısı ortalandı
- s5: önce 69 px → sonra 0 — 3B sahne (ResizeObserver) 6.4fr/5.6fr, problem ve kefe kutusu dolguları, blok kartları min-height 46
- s9: önce 21 px (ezilme yüzünden; doğal 159 px) → sonra 0 — SVG 6.4fr/5.6fr, bölüm/gövde aralığı 6, problem kartları iç aralık 4 / dolgu 6, kart alt boşluğu 0, madde dolgusu 0 8; kartlar artık ezilmiyor
- s10: önce 22 px → sonra 0 — kutular (.kart) dolgusu 8, aralık 6, gövde aralığı 6; adım düğmelerine basınca işlem
  sonuçları açılıp 44 px daha taşıyordu → koli kaynağında simge ile yazı, sayaçta etiket ile sayı yan yana, sonuç
  kutusu dolgusu 3 (iki adım sonrası da 0)
- s11 (değerlendirme, listede yoktu): önce 5 px (5. soru) → sonra 0 — soru-şık aralığı 8, şık aralığı 5

#### MAT.3.2.7-a
- s1: önce 4 px → sonra 0 — gövde aralığı 6, palet kutusu dolgusu 8; «Sıfırlayalım» yazısı ortalandı
- s3: önce 93 px → sonra 0 — panel grupları dolgusu 6, durum satırları dolgusu 4, işlem kartları (.kavram-kart) iç aralık 2 / dolgu 4
- s4: önce 6 px → sonra 0 — rampa kutusu dolgusu 10, aralık 8
- s5: önce 27 px → sonra 0 — kart havuzu kartları min-height 48 / dolgu 5, aralık 8
- s7 (değerlendirme): önce 47 px (2. soru; ilk soruda 0) → sonra 0 — SVG 7fr/5fr → 6.4fr/5.6fr, şıklar min-height 40 / dolgu 3, şık aralığı 5; 5 soru da 0

#### MAT.3.2.8-a
- s1: önce 16 px → sonra 0 — kaynak ve durum kutusu dolguları (3B sahne, oran değişmedi)
- s4: önce 47 px → sonra 0 — paket kartları (.kavram-kart) iç aralık 4 / dolgu 4, kutu dolguları 6–8, gövde aralığı 6
- s5: önce 3 px → sonra 0 — gövde aralığı 6, kart dolgusu 12
- s1, s3, s6: panel genişliğindeki düğme yazıları ortalandı (hiza)

#### MAT.3.3.2-a
- s1: önce 20 px → sonra 0 — prizma düğmeleri min-height 40 / dolgu 3, durum paneli dolgusu 10 (3B sahne, oran değişmedi)
- s2: önce 127 px → sonra 0 — SVG 8fr/4fr → 7fr/5fr (başlık tek satır); sayaç ve takip kutusu dolgusu 6, şekil satırı dolgusu 2, rozet dolgusu 2
- s4: önce 54 px → sonra 0 — yalnız SVG 8fr/4fr → 7fr/5fr (başlık tek satır, yönerge 3 → 2 satır)
- s6: önce 82 px → sonra 0 — 3B sahne (ResizeObserver) 7fr/5fr, kutu dolgusu 6, kart aralığı 6, blok kartları dolgusu 5
- s5: «Sıfırlayalım» yazısı ortalandı (hiza)

#### MAT.3.3.3-a
- s1: önce 96 px → sonra 0 — bölüm/gövde aralığı ve panel başı 6, kutu dolgusu 6, araç ve iz düğmeleri min-height 40 / dolgu 2 (sahne SVG ama oran değişimi yönergeyi kısaltmıyordu; oran değişmedi)
- s6, s10: düğme yazıları ortalandı (hiza)

#### MAT.3.3.6-a
- s1: önce 24 px → sonra 0 — ayar kartları dolgusu 8 / aralık 8, ipucu üst boşluğu 6 (3B sahne, oran değişmedi)
- s2: önce 90 px → sonra 0 — kart dolgusu 8 / aralık 6, liste aralığı 4, simetri doğrusu satırları dolgusu 4 (onaylı hâli de)
- s2, s3, s4: düğme yazıları ortalandı (hiza)

#### MAT.3.3.7-a
- s1: önce 90 px → sonra 0 — SVG 8fr/4fr → 7fr/5fr; bölüm/gövde aralığı ve panel başı 6, kutu dolgusu 8, köşe satırları dolgusu 5
- s5: önce 59 px → sonra 0 — 3B sahne 8fr/4fr → 7fr/5fr (başlık tek satır, yönerge 3 → 2 satır), küp kartları dolgusu 8
- s3: «Sıfırlayalım» yazısı ortalandı (hiza)

#### MAT.3.3.8-a
- s1: önce 24 px → sonra 0 — yön blokları (.kavram-kart) min-height 46 / dolgu 5, grup dolgusu 6
- s2: önce 3 px → sonra 0 — kod kartları (.kart) dolgusu sayfanın kendi 10 px değerine çekildi, gövde aralığı 6
- s2, s5, s6: düğme yazıları ortalandı (hiza)

#### MAT.3.4.1-a
- s2: önce 47 px → sonra 0 — veri kartları min-height 46 / dolgu 5, kart alanı dolgusu 6, aralık 6; «Sıfırlayalım» ortalandı
- s4: önce 9 px → sonra 0 — havuz kutusu dolgusu 10, kart aralığı 8
- s6: önce 21 px → sonra 0 — sepet kartı (.kart) dolgusu 8 / aralık 8, yuva dolgusu 6 (3B sahne, oran değişmedi); düğme ortalandı
- s7: önce 50 px → sonra 0 — kutu dolgusu 10 / aralık 8, kutu başlığının şablon alt boşluğu 0, lejant satırları dolgusu 6; düğme ortalandı
- s15: önce 38 px → sonra 0 — tablo kartı dolgusu 8, hücre dolgusu 6, oyun kartları iç aralık 4 / dolgu 5


### 4. sınıf

#### MAT.4.1.1-a
- s1: önce 42 px → sonra 0 — 3B; etkileşim/gövde aralığı 10→6, `.s1-kart` dolgusu 8px, iç aralık 6px
- s2: önce 83 px → sonra 0 — 3B (abaküs); panel grubu alt boşluğu 0, dolgu 8px, hedef kart dolgusu 5px; etkileşim/gövde aralığı 6
- s3: önce 25 px → sonra 0 — SVG; 8fr/4fr → 7fr/5fr
- s7: önce 35 px → sonra 0 — SVG; 7fr/5fr → 6.4fr/5.6fr, gövde aralığı 6, tuş kutuları dolgusu 10px
- s8 (DEĞERLENDİRME): önce 4 px → sonra 0 — soru kartı aralığı 12→8 (5 sorunun hepsi 0)
- düğme yazıları ortalandı (s1, s5, s7 sola yaslı düğmeler)

#### MAT.4.1.2-a
- s1: önce 11 px → sonra 0 — bölük kutularının alt boşluğu (12px) kaldırıldı
- s4: önce 167 px → sonra 0 — 3B, oran korunur; «Rakam Silindiri» kartı «Basamak Bilgisi» kartının soluna alındı (140px sütun,
  etiket/not ortalı alt alta), kartların alt boşluğu 0, etkileşim/gövde aralığı 6. Not: bir basamağa yerleştirince
  «Konum: Yüz Binler Basamağı» ve uzun oran açıklaması kartı uzatıyor; etkileşim sonrası panelde kaydırma çıkabilir
  (ilk hâl ölçütü sağlanıyor)
- düğme yazıları ortalandı (s1 tam genişlik «Sıfırlayalım»)

#### MAT.4.1.3-a
- s1: önce 19 px → sonra 0 — SVG; 8fr/4fr → 7fr/5fr
- s2: önce 49 px → sonra 0 — 3B; etkileşim/gövde aralığı 6, hedef paneli dolgusu 10px / aralık 8, blok kartları dikey dolgu 6px, raf aralığı 6
- s3: önce 37 px → sonra 0 — 3B; «Hedef Sayı» etiketi ile sayı yan yana (flex row), gövde aralığı 6

#### MAT.4.1.3-v2-a
- s1: önce 32 px → sonra 0 — SVG; 7fr/5fr → 6.4fr/5.6fr, gövde aralığı 6
- s2: önce 7 px → sonra 0 — SVG; aynı oran, gövde aralığı 6, panel aralığı 6, koli bilgisi aralığı 4
- s3: önce 22 px → sonra 0 — SVG; aynı oran, gövde aralığı 6

#### MAT.4.1.4-a
- s4: önce 2 px → sonra 0 — panel kutusu aralığı 12→8
- s7: önce 2 px → sonra 0 — durum kutusu aralığı 12→8
- s9: önce 12 px → sonra 0 — SVG; 8fr/4fr → 7fr/5fr (başlık ve «Yeniden Başlayalım» tek satır)
- düğme yazıları ortalandı (s8, s9)

#### MAT.4.1.5-a
(Sunucu 3000'deyken bu sayfa `load` olayına 90 sn'de ulaşamadı; 5200'de sorunsuz ölçüldü.)
- s1: önce 12 px → sonra 0 — 3B; gövde aralığı 6
- s8: önce 82 px → sonra 0 — 3B; «Adım başı +1 / +3» kartları yan yana (2 sütun, başlık iki sütuna yayılır, yazı ortalı),
  etkileşim/gövde aralığı 6, kartların dikey dolgusu 10px

#### MAT.4.1.6-a
- s1: önce 11 px → sonra 0 — hedef kutusunun alt boşluğu (16px) kaldırıldı
- s2: önce 112 px → sonra 0 — 3B; «Bileşik Kesir» rozeti ile hedef kesir yan yana, kart dolguları 8px / aralık 6, etkileşim/gövde aralığı 6
- s5: önce 25 px → sonra 0 — 3B; gövde aralığı 6, fiş aralığı 6/4, fiş satırı dolgusu 4px
- s7: önce 85 px → sonra 0 — 3B; «Sipariş» etiketi ile kesir yan yana, durum kartı dolgusu 10px / aralık 8, kasa satırı dolgusu 6px, etkileşim/gövde aralığı 6

#### MAT.4.1.7-a
- s3: önce 11 px → sonra 0 — SVG; 8fr/4fr → 7fr/5fr
- s4: önce 46 px → sonra 0 — 3B; etkileşim/gövde aralığı 6, bilgi paneli dolgusu 6px / aralık 4, kap kartları dikey dolgu 6px, kart aralığı 6
- s7: önce 64 px → sonra 0 — 3B; kütle kartında ad ile kesir yan yana, gövde aralığı 6
- s8 (DEĞERLENDİRME): önce 65 px → sonra 0 — listede yoktu; sorular karışık sıralı, en uzun soruda son şık görünmüyordu
  (kendi ölçümüm, ilk soru rastgele olduğu için koordinatör taramasında 0 çıkmış). SVG; 7fr/5fr → 6.4fr/5.6fr, gövde aralığı 6; 5 sorunun hepsi 0
- düğme yazıları ortalandı (s4 tam genişlik «Sıfırlayalım»)

#### MAT.4.1.9-a
- s4: önce 96 px → sonra 0 — 3B; kesir bloğu kartlarında önizleme ile yazı yan yana (flex row), önizleme alt boşluğu 0
- düğme yazıları ortalandı (s1)

#### MAT.4.1.10-a
(Headless Chromium bu sayfada çöküyor — «Target crashed»; ölçüm uygulama içi tarayıcıda 1280×720'de yapıldı.)
- s1: önce 37 px → sonra 0 — durum paneli ve kart havuzu dolgusu/aralığı, elma kartları (.kavram-kart) dolgusu 4px, gövde aralığı 6px
- s2: önce 47 px → sonra 0 — sahne SVG: sayfanın 8fr/4fr oranı 7fr/5fr (başlık ile rozet tek satır), kutu dolgusu 10px
- s3: önce 75 px → sonra 0 — grup kutuları, blok kartları ve gösterge satırları dolgusu; panel ve gövde aralığı 6px
- s5: önce 92 px → sonra 0 — kart dolguları, vurgu/sonuç etiketleri 6px, kaynak kartı (.kavram-kart) 4px, panel aralığı 6px
- İÇERİK DÜZELTMESİ (kullanıcı onayıyla, 2026-10-26): s6 «Parçadan Bütüne» şemasında 18 bilyenin bütünün 3/4'ü olduğu
  yazmıyordu (÷ 3 adımı dayanaksızdı). Tepe kutusunun yazısı «18 Bilye» → «3/4'ü 18 Bilye»; sığması için iki tepe kutusu
  190 → 240 px (simetri; sol kutunun yazısı aynı). Kopya ve kaynakta aynı 14 satır; dönüşüm(kaynak) = kopya.
- Son ölçüm (gerçek dosya, uygulama içi tarayıcı): bütün alt sayfalarda 0

#### MAT.4.1.11-a
- s4: önce 67 px → sonra 0 — SVG; 8fr/4fr → 7fr/5fr (başlık tek satır), gövde aralığı 6
- düğme yazıları ortalandı (s1, s3)

#### MAT.4.1.12-a
- s4: önce 18 px → sonra 0 — 3B; gövde aralığı 6, durum kartı ve teslim kutusu dolgusu 10px / aralık 8
- s7: önce 34 px → sonra 0 — 3B; etkileşim/gövde aralığı 6, durum kartı dolgusu 10px, blok kartları dolgusu 6px, kart aralığı 6
- düğme yazıları ortalandı (s4 «Yeniden Başlatalım»)

#### MAT.4.1.13-a
- s3: önce 25 px → sonra 0 — SVG ama oran kazandırmıyordu; gövde aralığı 6, üç panelin dikey dolgusu 12→8

#### MAT.4.1.13-v2-a
- s1: önce 11 px → sonra 0 — 3B; gövde aralığı 6, bilgi/kart alanı dolgusu 10px, kart aralığı 8
- s2: önce 1 px → sonra 0 — panel grubu aralığı 8→6
- düğme yazıları ortalandı (s3)

#### MAT.4.2.1-a
- s2: önce 30 px → sonra 0 — gövde aralığı 6, iki panel kutusu ve adım satırlarının dikey dolgusu azaltıldı
- s6: önce 41 px → sonra 0 — gövde aralığı 6, şablon .kart dolgusu 14→8 (katmansız), adım satırı dolgusu 10→6 (3B sahne, oran değişmedi)

#### MAT.4.2.2-v2-a
- s1: önce 46 px → sonra 0 — panel kutusu, işlem kartı ve basamak satırlarının dolgu/aralığı azaltıldı (3B sahne, oran değişmedi)

#### MAT.4.2.3-a
- s3: önce 141 px → sonra 0 — sütun 7fr/5fr → 6.4fr/5.6fr (SVG), panel ve gövde aralığı 6, onluk kartları 52→44 px,
  işlem/karşılaştırma kartlarının dolgu ve aralıkları azaltıldı
- s4: önce 42 px → sonra 0 — kartların gap + margin-bottom çift aralığı tek aralığa indi, kart dolgusu 14→10

#### MAT.4.2.4-a
- s1: önce 65 px → sonra 0 (−10) — sütun 8fr/4fr → 7fr/5fr (3B, ResizeObserver): yönerge bir satır kısalır; şablon .kavram-kart aralığı 12→6, havuz/gösterge dolgusu
- s2: önce 28 px → sonra 0 (−9) — grup ve blok kartı dolgu/aralıkları azaltıldı (3B sahne, oran değişmedi)
- s3: önce 23 px → sonra 0 (−27) — adım kutuları ve panel dolguları azaltıldı
- s5: önce 95 px → sonra 0 (−12) — sütun 8fr/4fr → 7fr/5fr (SVG), kart dolgusu 12→8
- s8: önce 112 px → sonra 0 (−26) — sütun 8fr/4fr → 7fr/5fr (SVG), panel/adım dolgu ve aralıkları azaltıldı

#### MAT.4.2.6-a
- s1: önce 33 px → sonra 0 (−5) — grup paneli dolgu/aralığı ve havuz aralıkları azaltıldı (3B, oran değişmedi)
- s4: önce 9 px → sonra 0 (−11) — gövde aralığı 6, blok dolgusu 12→9

#### MAT.4.2.7-a
- s1: önce 27 px → sonra 0 (−17) — şablon .kavram-kart dolgusu 8→6 / en az 48 px, grup dolgu/aralığı
- s3: önce 43 px → sonra 0 (−15) — şablon .kart dolgusu 14→8 (katmansız), etiket hapları, panel/gövde aralığı 6
- s4: önce 26 px → sonra 0 (−18) — hikâye şıkları (.parca-btn) dikey dolgu 6→4, liste aralığı 5, başlık dolgusu (sayfanın 6fr/6fr oranı korundu)
- s5: önce 94 px → sonra 0 (−76) — sütun 8fr/4fr → 7fr/5fr (SVG): başlık ve iç başlık tek satıra iner
- s8: önce 90 px → sonra 0 (−13) — kart yatay dolgusu 16→10 ile durum rozeti ve not tek satıra sığar; iç başlık alt boşluğu 10→4; strateji kartları en az 46 px (3B, oran değişmedi)
- s10: önce 51 px → sonra 0 — şablon .kavram-kart aralığı 12→4, kart dolgusu 8→6, kart grubu aralığı 12→6, panel aralığı 6

#### MAT.4.2.8-a
- s2: önce 9 px → sonra 0 (−11) — grup dolgusu 10→6
- s3: önce 11 px → sonra 0 (−9) — panel grubu dolgusu 10→8, gövde aralığı 6 (3B, oran değişmedi)
- s4: önce 32 px → sonra 0 (−12) — şablon .kavram-kart dolgusu 8→6, şablon/çekmece kutusu dolgu ve aralıkları

#### MAT.4.3.1-a
- s3: önce 19 px → sonra 0 (−9) — havuz kutusu dolgu/aralığı, iç başlık alt boşluğu 10→0
- s4: önce 33 px → sonra 0 (−19) — lejant satırı ve eylem düğmeleri dolgusu, grup dolgusu (3B, oran değişmedi)

#### MAT.4.3.2-a
- s1: önce 64 px → sonra 0 (−24) — panel kutuları, küre alanı ve sayaç dolgusu, panel/gövde aralığı 6 (3B, oran değişmedi)
- s2: önce 42 px → sonra 0 (−12) — durum kartının gap + margin çift aralığı kalktı, araç paneli ve kenar yuvası dolgusu
- s3: önce 39 px → sonra 0 (−7) — şablon .kavram-kart aralığı 12→6 ve dolgusu 8→6, ızgara dolgu/aralığı
- s5: önce 16 px → sonra 0 (−12) — grup dolgu/aralığı
- s6: önce 55 px → sonra 0 — sütun 8fr/4fr → 7fr/5fr (SVG): başlık tek satıra, yönerge kısalır; çubuk kartı dolgusu 8→6, cetvel paneli dolgu/aralığı

#### MAT.4.3.10-a
- s5: önce 1 px → sonra 0 (−5) — gövde ve grup aralığı
- s7: önce 39 px → sonra 0 (−5) — kod kutusunun margin-bottom'u 10→0, adım satırı dolgusu 10→6, başlık aralıkları


### 10. sınıf

#### MAT.10.1.1-a
- s1: önce 23 px → sonra 0 — gövde aralığı 6px, iki `.kart` dolgusu 8px 14px (şablon 14px 16px)
- s2: önce 10 px → sonra 0 — gövde aralığı 6px, `.s2-kart` dolgusu 8px 12px, kaydırıcı grubu aralığı 6px
- s5: önce 37 px → sonra 0 — 8fr/4fr → 6.4fr/5.6fr (SVG); başlık ve yönerge birer satır kısaldı
- s8: önce 35 px → sonra 0 — gövde aralığı 6px, iki kartın dolgusu 8px 12px, sayaç kutuları 6px, koli kartı min-height 46px (oran denendi, satır kısaltmadı; geri alındı)
- s9 (değerlendirme): önce 45 px (1. soru 26, 4. soru 45) → sonra 0 — 7fr/5fr → 6.4fr/5.6fr (3B sahne); şıklar tek satıra indi
- Son ölçüm (gerçek dosya): bütün alt sayfalarda ≤ 0

#### MAT.10.1.2-a
- s1: önce 58 px → sonra 0 — 8fr/4fr → 6.4fr/5.6fr (SVG), gövde aralığı 6px, iki kutu dolgusu 8px 14px / aralık 6px, kart havuzu aralığı 6px
- s3: önce 59 px → sonra 0 — 7fr/5fr → 6.4fr/5.6fr (3B), gövde aralığı 6px, kart havuzu aralığı 6px, bilgi/kesit panelleri dolgusu 6–8px
- s7: önce 133 px → sonra 0 — 7fr/5fr → 6.4fr/5.6fr (3B; başlık bir, yönerge bir, koli kartları birer satır kısaldı), gövde aralığı 6px, `.s7-kutu` dolgusu 8px 14px / aralık 6px
- s8: önce 69 px → sonra 0 — 8fr/4fr → 6.4fr/5.6fr (SVG); başlık, yönerge ve «Simülasyonu Çalıştıralım» düğmesi kısaldı
- s10: önce 5 px → sonra 0 — gövde aralığı 6px, blok havuzu aralığı 6px
- s11: önce 53 px → sonra 0 — 8fr/4fr → 6.4fr/5.6fr (SVG)
- s12 (değerlendirme): önce 76 px (2. soru 76, 4. soru 25, 5. soru 39) → sonra 0 — 7fr/5fr → 6.4fr/5.6fr (SVG)
- Son ölçüm (gerçek dosya): bütün alt sayfalarda ≤ 0

#### MAT.10.1.3-a
- s3: önce 3 px → sonra 0 — gövde aralığı 6px, `.s3-kart` dolgusu 12px 14px
- s5: önce 33 px → sonra 0 — gövde aralığı 6px, iki panel dolgusu 8px 12px, kart havuzu aralığı 6px, `.s5-kart` aralığı 4px (şablonun 12px'i sayfanın 4px'ini eziyordu); oran denendi, kart satırlarını kısaltmadı, geri alındı
- s11: önce 58 px → sonra 0 — 7fr/5fr → 6.4fr/5.6fr (SVG), gövde aralığı 6px, karar şıkları min-height 40px / dolgu 3px
- s12 (değerlendirme): önce 4 px (2. ve 4. soru) → sonra 0 — panel aralığı 6px, `.panel-basi` alt dolgusu 6px
- Not: s5'te dört kart yerleşince «Genel Kural» kartı iki sütunu kaplayan yeni bir satır olarak açılıyor; bu sonraki durum
  tarama kapsamı dışında, ölçülmedi.
- Son ölçüm (gerçek dosya): bütün alt sayfalarda ≤ 0

#### MAT.10.2.1-a
- s3: önce 31 px → sonra 0 — 8fr/4fr → 6.4fr/5.6fr (SVG), gövde aralığı 6px
- s5: önce 38 px → sonra 0 — gövde aralığı 6px, bilgi kartı ve üç yuva dolgusu 8px 14px, yuva aralığı 6px
- s6: önce 8 px → sonra 0 — gövde aralığı 6px, `.s6-grup` dolgusu 8px 14px
- s9: önce 3 px → sonra 0 — gövde aralığı 6px, `.s9-kart` dolgusu 8px 14px
- s10: önce 67 px → sonra 0 — 7fr/5fr → 6.4fr/5.6fr (SVG), kart paneli dolgusu 10px 14px / aralık 8px, kart ızgarası aralığı 8px (kartlar karışık sıralı; en kötü dizilim ölçüldü)
- s11: önce 19 px → sonra 0 — gövde aralığı 6px, iki kart dolgusu 6px 14px, hipotez kutusu dolgusu 6px 12px
- s12 (değerlendirme): önce 71 px (2. soru 39, 4. soru 33, 5. soru 71) → sonra 0 — 7fr/5fr → 6.4fr/5.6fr (SVG); başlık ve şıklar satır kısaldı
- Son ölçüm (gerçek dosya): bütün alt sayfalarda ≤ 0

#### MAT.10.2.2-a
- s2: önce 61 px → sonra 0 — 7fr/5fr → 6.4fr/5.6fr (SVG), gövde aralığı 6px, üç kartın dolgusu 8px 14px
- s4: önce 43 px → sonra 0 — 8fr/4fr → 6.4fr/5.6fr (SVG), gövde aralığı 6px (eşleme düğmeleri 48px kaldı)
- s6: önce 39 px → sonra 0 — gövde aralığı 6px, `.s6-kart` dolgusu 8px 14px / aralık 6px, cebir kutusu dolgusu 6px 10px
- s9: önce 76 px → sonra 0 — panel aralığı 6px, `.panel-basi` alt dolgusu 6px, gövde aralığı 6px, iki panel dolgusu 8px 14px / aralık 6px, kart ızgarası aralığı 6px, rozet dolgusu 4px 12px, tahmin kartları min-height 44px / dolgu 5px (oran denendi, satır kısaltmadı; geri alındı)
- s11: önce 49 px → sonra 0 — sayfanın 6fr/6fr oranı korundu; gövde aralığı 6px, iki grup dolgusu 8px 14px / aralık 6px, sıfır seçenekleri min-height 40px / dolgu 3px, aralık 6px
- s12: önce 43 px → sonra 0 — 8fr/4fr → 6.4fr/5.6fr (SVG); havuz başlığı ve kart satırları kısaldı
- s13: önce 1 px → sonra 0 — gövde aralığı 6px
- s15: önce 93 px → sonra 0 — 8fr/4fr → 6.4fr/5.6fr (SVG), gövde aralığı 6px
- s18: önce 53 px → sonra 0 — 7fr/5fr → 6.4fr/5.6fr (SVG), gövde aralığı 6px

#### MAT.10.2.3-a
- s3: önce 60 px → sonra 0 — gövde aralığı 6, kural kartı alt boşluğu 0, tablo hücre dolgusu 4px, tablo içi koordinat kartları min 40px
- s11: önce 50 px → sonra 0 — sütun 6.4fr/5.6fr (SVG), gövde aralığı 6, kural kartlarına kendi yan dolgusu (8px 6px) → kartlar tek satır
- s12: önce 40 px → sonra 0 — sütun 6.4fr/5.6fr (SVG), gövde aralığı 6, fonksiyon seçim düğmeleri min 40px/3px
- s13: önce 133 px → sonra 0 — sütun 8fr/4fr → 7fr/5fr (SVG), gövde aralığı 6
- s15: önce 80 px → sonra 0 — sütun 8fr/4fr → 7fr/5fr (3B, ResizeObserver), gövde aralığı 6, grup aralığı 6, model kartları dolgusu 8px 12px
- Hiza: tam genişlikteki eylem düğmelerinde (s3, s13) yazı ortalandı.
- Son ölçüm (gerçek dosya): bütün alt sayfalarda ≤ 0

#### MAT.10.2.4-a
- s2: önce 172 px → DÜZELTİLMEDİ — sütun oranı sayfanın kendi 6fr/6fr değeri (daraltılmadı); panelde karşılaştırma
  kutusu + 4 yuva (2 satır, biri iki satırlık etiket) + 7 kartlık 3 sütunlu havuz (uzun kart 3–4 satır). Bütün
  aralık/dolgular en sıkıya (kart 40px, dolgu 4–6px) çekilse bile içerik ≈470 px, gövde ≈427 px: ≈45 px taşma kalır.
  Sığdırmak için yuvaların/kart havuzunun yerleşimini değiştirmek gerekir (dar yuvaya uzun kart düşünce yeniden taşar);
  ezilmiş görünüm yerine dokunulmadı.
- s3: önce 30 px → sonra 0 — gövde aralığı 6, sekme/grup alt boşlukları 0 (aralık gövdeden), yuva/üst satır 6px,
  kartlar sayfanın kendi dolgusuna (4px 8px)
- s4: önce 26 px → sonra 0 — giriş kutuları dikey dolgu 5px
- s5: önce 99 px → sonra 0 — sütun 6.4fr/5.6fr (SVG), gövde/bölüm aralığı 6, başlık alt dolgusu 6, kart dolgusu 8px 14px/aralık 6,
  formül alanı 4px 10px, durum rozetleri 4px 8px
- s6: önce 79 px → sonra 0 — gövde aralığı 6, kartların alt boşluğu 0 (aralık gövdeden), kart dolgusu 8px 14px,
  kaydırıcı/örnek düğmeler/geri bildirim boşlukları 4–6px
- s12: önce 72 px → sonra 0 — sütun 6.4fr/5.6fr (SVG), gövde/bölüm aralığı 6, başlık alt dolgusu 6, kutu dolgusu 8px 14px/aralık 6,
  formül min 46px
- s15: önce 34 px → sonra 0 — gövde/bölüm aralığı 6, başlık alt dolgusu 6, kart dolgusu 6px 12px, grafik/ayar kartı aralığı 2px
  (sütun oranı değişmedi: yönerge 6.4/5.6'da da 3 satır)
- s17: önce 16 px → sonra 0 — gövde aralığı 6, kutu dolgusu 8px 14px, kart ızgarası aralığı 6
- s18: önce 99 px (D) → DÜZELTİLMEDİ (değerlendirme) — 2. soru 99 px, 4. soru 61 px; soru metni uzun (2. soruda 254 px),
  5 şık şablonun sıkı değerlerinde (min 40, 3px dolgu, aralık 5); sütun oranı sayfanın kendi 6.5fr/5.5fr değeri.
  Aralıklarla en çok ≈25 px kazanılır; çok zorlamadan sığmıyor.
- Hiza: tam genişlikteki eylem düğmesinde (s3) yazı ortalandı.
- Son ölçüm (gerçek dosya): s2 172 px, s18 99 px

#### MAT.10.2.5-a
- s1: önce 6 px → sonra 0 — gövde aralığı 6, grup dolgusu 10px 14px
- s2: önce 79 px → sonra 0 — sütun 8fr/4fr → 7fr/5fr (SVG), gövde aralığı 6, bilgi/durum kutusu dolgusu 10px 14px
- s8: önce 46 px → sonra 0 — sütun 8fr/4fr → 7fr/5fr (3B; window 'resize' dinler, şablon sayfa geçişinde resize atar), gövde aralığı 6
- s11: önce 20 px → sonra 0 — gövde aralığı 6, şıklar dikey dolgu 3px, şık aralığı 6
- s12: önce 130 px → sonra 0 — sütun 8fr/4fr → 7fr/5fr (SVG), gövde/bölüm aralığı 6, başlık alt dolgusu 6, grup dolgusu 8px 14px/aralık 6,
  bloklar min 44px, seçim kutusu dikey dolgu 5px
- s14: önce 34 px → sonra 0 — sütun 8fr/4fr → 7fr/5fr (SVG), gövde aralığı 6
- s16: önce 57 px → sonra 0 — sütun 8fr/4fr → 7fr/5fr (SVG), gövde aralığı 6
- s17: önce 35 px (D, 4. soru) → sonra 0 — değerlendirme, hafif: sütun 7fr/5fr → 6.4fr/5.6fr (SVG), bölüm aralığı 6, başlık alt
  dolgusu 6, soru–şık aralığı 6, şık aralığı 4 (dört sorunun hepsi 0)
- Hiza: tam genişlikteki eylem düğmesinde (s12) yazı ortalandı.
- Son ölçüm (gerçek dosya): bütün alt sayfalarda ≤ 0

#### MAT.10.2.6-a
- s4: önce 15 px → sonra 0 — gövde aralığı 6, formül kutularının alt boşluğu 0 (aralık gövdeden)
- s7: önce 12 px → sonra 0 — gövde aralığı 6, grup dolgusu 10px 12px/aralık 6
- s8: önce 92 px → sonra 0 — sütun 8fr/4fr → 7fr/5fr (3B, ResizeObserver), gövde aralığı 6
- s10: önce 37 px → sonra 0 — gövde aralığı 6, model kartı dolgusu 10px 14px ve alt boşluğu 0, belirteç kartları min 44px, kart aralığı 8
- s11: önce 6 px → sonra 0 — gövde aralığı 6, grup dolgusu 10px 14px
- s12: önce 11 px → sonra 0 — gövde aralığı 6, kutu dolgusu 10px 14px
- s13: önce 30 px (D, 3. soru) → DÜZELTİLMEDİ (değerlendirme) — panel zaten geniş (sayfanın kendi 4.8fr/7.2fr değeri,
  daraltılmadı); soru metni 159 px + 5 şık (biri iki satır, 86 px) şablonun sıkı değerlerinde (min 40, 3px dolgu,
  aralık 5). Yalnız aralıklarla en çok ≈28 px kazanılır; çok zorlamadan sığmıyor.
- Hiza: `hiza.py --duzen` s6'daki tam genişlik «Sıfırlayalım» düğmesinde sola yaslı yazı buldu → düğme yazıları ortalandı.
- Son ölçüm (gerçek dosya): s13 30 px

#### MAT.10.3.1-a
- s2: önce 99 px → sonra 0 — 8fr/4fr → 7.4fr/4.6fr (SVG); VE/VEYA kural kartı, etiket hapı, özet ve durum paneli dolgu/aralıkları; gövde gap 6
- s3: önce 11 px → sonra 0 — 7.4fr/4.6fr (SVG): «MODELLEME» etiketi başlık satırına çıktı
- s8: önce 31 px → sonra 0 — panel dolgusu 12, aralık 8; adım blokları (şablon .kavram-kart) dikey dolgu 5 px; sayfanın 6fr/6fr oranı korundu
- s9: önce 14 px → sonra 0 — gövde gap 6, grup kutuları dolgusu 8 px (2B canvas: oran değişmedi)
- s10: önce 69 px → sonra 0 — 7.4fr/4.6fr (SVG); problem/rehber kartı (şablon .kart) dolgusu 8px 12px; gövde gap 6
- hiza: s1, s9 geniş eylem düğmelerinde sola yaslı yazı ortalandı (`.buton { justify-content: center }`)

#### MAT.10.3.2-a
- s2: önce 50 px → sonra 0 — tünel kartları (şablon .kavram-kart) 44 px / dolgu 4; durum kutusu ve havuz aralıkları; istasyon yuvası dolgusu; gövde gap 6 (3B sahne: oran değişmedi)
- s6: önce 5 px → sonra 0 — gövde gap 6, sonuç kutusu gap 6
- s7 (değerlendirme, 3. soru): önce 25 px → sonra 0 — 7fr/5fr → 6.4fr/5.6fr (SVG): soru metni bir satır kısaldı. Not: panel genişleyince şablonun kendi betiği (`baslikTekrariniGizle`, soru sayacı başlık satırına sığınca) «DEĞERLENDİRME» rozetini gizliyor; bu şablon davranışı, css ile yapılmadı
- hiza: s1, s6 eylem düğmelerinde sola yaslı yazı ortalandı

#### MAT.10.4.1-a
- s1: önce 99 px → sonra 0 — 7fr/5fr → 6.4fr/5.6fr (SVG); «Hipotez Panosu» şıkları 40 px; oran tablosu satır dolgusu 3 px; grup dolgu/aralık; gövde ve bölüm gap 6, panel başı alt dolgu 6
- s4: önce 32 px → sonra 0 — 6.4fr/5.6fr (SVG); cebir kartları 44 px; gövde gap 6
- s5: önce 26 px → sonra 0 — tablo satırı dolgusu 6px 12px, tablo aralığı 6, gövde gap 6
- s7: önce 87 px → sonra 0 — 6.4fr/5.6fr (SVG); önerme kartları 42 px; grup dolgu/aralık; ızgara aralıkları 6; gövde ve bölüm gap 6

#### MAT.10.4.2-a
- s1: önce 44 px → sonra 0 — «Denge Varsayımı» şıkları 40 px; grup dolgu/aralık; gövde gap 6 (3B sahne: oran değişmedi)
- s2: önce 6 px → sonra 0 — varsayım listesi aralığı 4, gövde gap 6 (6fr/6fr korundu)
- s5: önce 22 px → sonra 0 — varsayım kartları (şablon .kart) dolgusu 8px 14px; gövde gap 6
- s10: önce 55 px → sonra 0 — 7fr/5fr → 6.4fr/5.6fr (SVG): kart yazıları tek satıra indi; matris/havuz kapsayıcı dolgusu, havuz üst boşluğu 0
- s11: önce 41 px → sonra 0 — 6.4fr/5.6fr (SVG); kart dolgu/aralık; gövde gap 6
- s12: önce 32 px → sonra 0 — 6.4fr/5.6fr (SVG): «UYGULAMA» etiketi başlık satırına çıktı
- s13: önce 71 px → sonra 0 — önerme kartları 42 px; iç başlık satırı aralıkları; grup/zincir/depo aralıkları; bölüm gap 6, panel başı 6 (6fr/6fr korundu)
- s14: önce 8 px → sonra 0 — karışık havuz dört satıra düşünce kırpılıyordu; kartlar 44 px, grup dolgu/aralık (6fr/6fr korundu)
- s15: önce 22 px → sonra 0 — ayar ve sonuç paneli dolgu/aralık; gövde gap 6 (3B sahne: oran değişmedi)
- s17: önce 19 px → sonra 0 — mesafe kartları dolgusu 8px 16px, aralık 6; gövde gap 6
- hiza: s2, s15 eşit genişlikli eylem düğmelerinde sola yaslı yazı ortalandı

#### MAT.10.4.3-a
- s4: önce 47 px → sonra 0 — çarpan şıkları 40 px, kural kartları 44 px / dolgu 4px 8px; grup, bilgi satırı ve yuva dolgu/aralıkları; gövde gap 6
- s6: önce 70 px → sonra 0 — 8fr/4fr → 7.4fr/4.6fr (SVG): «KEŞİF» başlık satırına çıktı, yönerge ve 2. kart bir satır kısaldı; kart paneli aralığı 6
- s9 (değerlendirme, 5. soru): önce 35 px → DÜZELTİLMEDİ — beş şıkkın hepsi ~90 karakter, iki satır (60 px); soru metni 6 satır. Sayfanın kendi oranı 6.5fr/5.5fr (daraltılmaz); gap/dolgu ile en çok ~28 px kazanılıyor, kalanı şık dolgusunu 3 px'in altına indirmeyi gerektirir (çok zorlama). Dokunulmadı
- hiza: s6 panel genişliğindeki «Yeniden Deneyelim» yazısı ortalandı

#### MAT.10.4.4-a
- s1: önce 21 px → sonra 0 — karışık ispat kartı havuzu (dört satıra düşen sıralamada ~80 px'e çıkar); kartlar 40 px / dolgu 4; panel ve aralıklar; bölüm gap 6, panel başı 6 (6fr/6fr korundu)
- s2: önce 36 px → sonra 0 — 8fr/4fr → 7.4fr/4.6fr (SVG): «KEŞİF» başlık satırına çıktı; gövde gap 6
- s5: önce 53 px → sonra 0 — 8fr/4fr → 7.4fr/4.6fr (boyutunu kendisi okuyan 3B sahne): «UYGULAMA» başlık satırına çıktı; kart aralığı 6, gövde gap 6
- hiza: s2 panel genişliğindeki düğme yazısı ortalandı

#### MAT.10.5.1-a
- s1: önce 70 px → sonra 0 — 7fr/5fr → 6.4fr/5.6fr (SVG); ölçüm/tahmin kutuları (şablon .kart) dolgusu 8px 14px, aralık 8; ölçüm öğeleri dolgusu 6px 12px; şıklar 40 px; gövde gap 6
- s2: önce 22 px → sonra 0 — grup dolgusu 10px 14px, aralık 8; gövde gap 6
- s5: önce 43 px → sonra 0 — kart dolgusu 6px 12px, aralık 4; sayaç satırı dolgusu 4px 12px; gövde gap 6 (6.5fr/5.5fr korundu)
- s8: önce 66 px → sonra 0 — katsayı kartları 40 px / dolgu 4; havuz satır aralığı 6; panel dolgu/aralık; kesir satırı dolgusu 0; gövde gap 6 (6fr/6fr korundu)
- s9: önce 16 px → sonra 0 — bilgi kartı (şablon .kart) dolgusu 8px 14px; koordinat satırı dolgusu 6px 12px; gövde gap 6
- s10: önce 26 px → sonra 0 — seçenek şıkları 40 px; kart grubu dolgusu 8px 14px; gövde gap 6
- hiza: s2 eşit genişlikli «k = …» düğmelerinde yazı ortalandı

#### MAT.10.7.1-a
- s2: önce 26 px → sonra 0 — maç çifti kartları iç aralığı 4, dikey dolgu 4; havuz kutusu dolgusu 10px 14px, aralık 8
- s5: önce 38 px → sonra 0 — kart paneli iç başlık satırı alt boşluğu 4; panel dolgusu 10px 14px, aralık 8; kesir alanı dolgusu 8px 10px; gövde gap 6 (6fr/6fr korundu)
- s7: önce 47 px → sonra 0 — analiz kartları 44 px / dolgu 4; havuz kutusu dolgusu 10px 16px, aralık 8; kart dizilimi aralığı 6; gövde gap 6


### 11. sınıf

#### MAT.11.1.1-a
- s2: önce 18 px → sonra 0 — gövde aralığı 6, parametre kutularının dolgusu/aralığı
- s3: önce 105 px → sonra 0 — 8fr/4fr → 7fr/5fr (SVG), A–C şıkları 40 px, kart ve bilgi kutusu dolguları
- s4: önce 29 px → sonra 0 — fonksiyon kartları (.kavram-kart) 44 px, panel kutusu dolgusu, gövde aralığı
- s8: önce 41 px → sonra 0 — adım düğmeleri 40 px, grup dolgusu/aralığı
- s9: önce 70 px → sonra 0 — 8fr/4fr → 7fr/5fr (SVG), kart ve formül kutusu dolgusu
- s11: önce 2 px → sonra 0 — gövde aralığı
- s17: önce 10 px → sonra 0 — gövde aralığı, kutu dolgusu
- s19 (DEĞERLENDİRME): önce 17 px (4. soru) → sonra 0 — yalnız aralıklar (bölüm/başlık 6, `.deg-kap` 6, şık arası 3 px);
  şıklar kesirli ve iki satırlık, şık düğmelerine dokunulmadı. 6.4fr/5.6fr denendi, şıklar yine iki satır kaldı → geri alındı
- Ayrıca hiza: s4 «Sıfırlayalım», s12 panel genişliğindeki düğmede yazı ortalandı

#### MAT.11.1.2-a
- s1: önce 42 px → sonra 0 — 8fr/4fr → 7fr/5fr (sahne ResizeObserver'lı 3B); bu, düğme satırındaki «Sıfırlayalım»ın
  yatayda kırpılmasını da giderdi; veri kutusu dolgusu, gövde aralığı
- s5: önce 43 px → sonra 0 — kalıp (display) MathJax formüllerinin 20 px'lik üst/alt boşluğu 4 px, gövde aralığı
- s7: önce 58 px → sonra 0 — .kart grupları dolgusu, zaman şıkları 40 px, ölçüm/durum kutusu dolgusu (sahne 3B, oran korunur)
- s8: önce 73 px → sonra 0 — 7fr/5fr → 6.4fr/5.6fr (SVG; başlık tek satıra iner), özellik kartları 44 px, grup dolgusu
- s13 (DEĞERLENDİRME): önce 50 px (4. soru) → DÜZELTİLMEDİ — 4. sorunun şıkları 2–3 satırlık uzun metin (86/60 px);
  panel sayfanın kendi 5.5fr/6.5fr'si ile zaten geniş; aralıklarla en çok ~28 px kazanılıyor, kalanı için şıkları
  ezmek gerekir (diğer 5 soru 0)

#### MAT.11.1.3-a
- s7: önce 68 px → sonra 0 — 7fr/5fr → 6.4fr/5.6fr (SVG), .kart dolgusu/aralığı, başlık alanı alt boşluğu
- s9: önce 46 px → sonra 0 — 6.4fr/5.6fr (SVG; başlık tek satıra iner), bilgi kutusu dolgusu
- s10: önce 70 px → sonra 0 — 8fr/4fr → 7fr/5fr (SVG), fonksiyon kartları 44 px, havuz dolgusu/aralığı
- s11: önce 11 px → sonra 0 — gövde aralığı, kutu dolgusu
- Ayrıca hiza: s3, s10 panel genişliğindeki düğmede yazı ortalandı

#### MAT.11.1.4-a
- s1: önce 81 px → sonra 0 — 8fr/4fr → 7fr/5fr (SVG), kart dolguları, gövde aralığı
- s2: önce 29 px → sonra 0 — 8fr/4fr → 7fr/5fr (SVG; başlık tek satıra iner), gövde aralığı
- s3: önce 53 px → sonra 0 — tablo satırı dolgusu, tablo/havuz başlık satırının alt boşluğu, nokta kartları 44 px
- s8: önce 11 px → sonra 0 — kart alanı dolgusu/aralığı, gövde aralığı
- s9: önce 27 px → sonra 0 — .kart dolgusu/aralığı (sahne 3B, oran korunur)
- s10: önce 32 px (yalnız css'siz 3'lü ölçümde, yüklemeye bağlı) → sonra 0 — ayar ve gösterge kutularının dolgusu/aralığı
- s11: önce 57 px → sonra 0 — 8fr/4fr → 7fr/5fr (SVG; başlık ve kart yazıları satır kısalır)
- s12: önce 1 px → sonra 0 — .kart dolgusu
- Ayrıca hiza: s8 «Yeniden Deneyelim» yazısı ortalandı

#### MAT.11.1.5-a
- s1: önce 42 px → sonra 0 — 8fr/4fr → 7fr/5fr (SVG), kutu dolgusu, gövde aralığı
- s6: önce 4 px → sonra 0 — gövde aralığı, kart şeridinin alt boşluğu (sayfa zaten 6fr/6fr)
- s11: önce 58 px → sonra 0 — şıklar 40 px, şık arası 6, grup dolgusu (6.4fr/5.6fr denendi, yönerge kısalmadı → geri alındı)

#### MAT.11.1.6-a
- s1: önce 26 px → sonra 0 — kart dolgusu/aralığı, gövde aralığı
- s2: önce 3 px → sonra 0 — gövde aralığı
- s3: önce 10 px → sonra 0 — grup aralığı, gövde aralığı
- s4: önce 13 px → sonra 0 — ölçüm paneli aralığı, tablo paneli dolgusu (sayfa zaten 6fr/6fr)
- s6: önce 41 px → sonra 0 — 8fr/4fr → 7fr/5fr (SVG), kutu dolgusu
- s7: önce 56 px → sonra 0 — kart dolgusu/aralığı, yaş kutusu dolgusu (sahne 3B, oran korunur)
- s10: önce 52 px → sonra 0 — kutuların 12 px alt boşluğu kaldırıldı, kartlar 44 px, kutu dolgusu
- s16: önce 57 px → sonra 0 — ispat kartları 44 px, havuz dolgusu/aralığı
- Ayrıca hiza: s9 «× 1,5» düğmesinin yazısı ortalandı

#### MAT.11.1.7-a
- s3: önce 34 px → sonra 0 — 3B; gövde/bölüm aralığı 10 → 6, kart dolgusu 10 → 6, kart içi aralık 8 → 6
- s5: önce 49 px → sonra 0 — kart alanı dolgu/aralığı, iç fonksiyon kartı 52 → 44, adım kutuları dolgusu 10 → 6
- s10: önce 92 px → sonra 0 — 3B; grup dolgusu 10 → 6, kural kartları 52 → 42, hat düğmeleri 46 → 40, eylem düğmeleri 46 → 42, yuva 46 → 38, aralıklar
- s12: önce 94 px → sonra 0 — sütun 7/5 → 6.4/5.6, problem kartları 52 → 42, «PROBLEM HAVUZU» başlığının alt boşluğu 10 → 0, aralıklar 6 → 4

#### MAT.11.1.8-a
- s3: önce 46 px → sonra 0 — 3B; `.kart` dolgusu 14 → 8, lejant aralığı 8 → 6, bölüm/gövde aralıkları
- s6: önce 35 px → sonra 0 — kart havuzu kartları 52 → 46, kutu dolguları 12 → 8, havuz alt boşluğu 8 → 0
- s7: önce 18 px → sonra 0 — kartlar sayfanın kendi 44 px yüksekliğine döner (şablon 52 px'e eziyordu), gövde aralığı

#### MAT.11.2.1-a
- s4: önce 146 px → sonra 0 — sütun 6.4/5.6 (alan kartlarında başlık + değer tek satıra sığar), kutu/kart/çarpım satırı dolguları
- s9: önce 196 px → sonra 0 — dört yuva 2 × 2 ızgara (üstte koşul, altta sonuç yuvaları), önerme kartları 52 → 40, grup dolgusu 12 → 8, aralıklar
- s11: önce 52 px → sonra 0 — grup dolgusu 14 → 8, aralıklar 12 → 8, rozet dolgusu 8 → 6

#### MAT.11.2.2-a
- s1: önce 94 px → sonra 0 — sütun 6.4/5.6, `.kart` dolgusu 14 → 8, eğim satırları 6 → 4, aralıklar
- s3: önce 97 px → sonra 0 — sütun 8/4 → 7/5 (yönerge ve açıklama satır kısalır), kart dolgusu 12 → 8, aralıklar
- s6: önce 6 px → sonra 0 — kart içi şekil–ad aralığı 12 → 6 (sayfanın kendi değeri)

#### MAT.11.2.3-a
- s2: önce 83 px → sonra 0 — şıklar 48 → 40, grup dolgusu 12 → 8, aralıklar, durum kutusu dolgusu
- s5: önce 68 px → sonra 0 — 3B; panel yan dolgusu 12 → 10 ve başlık aralığı 8 → 6 ile «GÖZLEMCİLER / Mekânsal Konum» tek satıra sığar, dolgu/aralıklar
- s6: önce 71 px → sonra 0 — sütun 8/4 → 7/5 (başlık ve «AYRIŞTIRMA» etiketi tek satır), kart içi aralık 12 → 6

#### MAT.11.2.4-a
- s1: önce 13 px → sonra 0 — kartlar 52 → 44
- s2: önce 63 px → sonra 0 — sütun 8/4 → 7/5 (başlık tek satır, «En Küçük Alan» tek satır), grup dolgusu 14 → 10, aralıklar
- s3: önce 75 px → sonra 0 — sütun 6.4/5.6, gezinme düğmeleri dolgusu 7 → 4, tablo hücre dolgusu 5–6 → 3 (tüm satır durumlarında aynı), kutu dolgusu
- s12: önce 35 px → DÜZELTİLMEDİ — DEĞERLENDİRME; yalnız 3. soruda (7 satırlık soru metni + beş iki satırlık şık). Şıklar şablonda
  zaten 3 px dolguda, panel sayfanın kendi 6.5fr genişliğinde; bütün aralıklar (bölüm, başlık, soru–şık, şıklar arası, eylem
  düğmeleri) en aza indirilse ancak ~34 px kazanılıyor, soru ile şıklar arası 2 px'e inmeden sığmıyor → dokunulmadı.

#### MAT.11.2.5-a
- s2: önce 21 px → sonra 0 — nicelik kartları 52 → 44, kutu dolguları 12 → 8, havuz aralığı 10 → 6
- s3: önce 73 px → sonra 0 — panel dolgusu 14 → 8, takip satırları 6 → 4, aralıklar 8 → 6, bağıntı kutusu dolgusu
- s4: önce 6 px → sonra 0 — 3B; panel kartı dolgusu 10 → 8, aralık 8 → 6
- s5: önce 60 px → sonra 0 — giriş kutularının dikey dolgusu 8 → 6 (50 → 46 px), adım kartları dolgu/aralığı, formül kutusu dolgusu

#### MAT.11.3.1-a
- s3: önce 11 px → sonra 0 — kartlar 52 → 44
- s9: önce 20 px → sonra 0 — grafik kartı içi aralık 12 → 6 (sayfanın kendi değeri), başlık kutusu dolgu/alt boşluğu, havuz aralığı 12 → 8
- s10: önce 128 px → sonra 0 — sütun 8/4 → 7/5 (başlık, yönerge ve kart metinleri satır kısalır), `.kart` dolgusu 14 → 8, aralıklar, sıfırlama düğmesi dolgusu 7 → 4
- s14: önce 4 px → sonra 0 — DEĞERLENDİRME (5. soru); yalnız bölüm aralığı 10 → 6 ve başlık alt dolgusu 10 → 6

#### MAT.11.3.2-a
- s2: önce 17 px → sonra 0 — kart dolgusu 14 → 8, kart içi aralık 10 → 6

Not: ölçüt ilk durumdur. Etkileşimden sonra açılan öğeler (ör. 11.1.7 s3 «Eşit Değildir» kutusu, 11.1.8 s6 özet paragrafı,
11.2.4 s3 genel satır ve kural kartları, 11.3.2 s2 sonuç açıklaması) panelde ek yer ister; bunlar ölçülmedi.


### 12. sınıf

#### MAT.12.1.1-a
- s12: önce 34 px → sonra 0 — kart kutusu başlığının alt payı 0, şerit kartları aralık 4 / dolgu 6, gövde aralığı 6
- s20: önce 58 px → sonra 0 — 6.4fr/5.6fr (SVG), şablonun ezdiği kart aralığı 12 → 2 (sayfanın kendi değeri), gövde aralığı 6
- s25: önce 25 px (soru 4) → DÜZELTİLMEDİ — DEĞERLENDİRME; soru 4'ün metni 8 satır (254 px), şıklar şablonda zaten 37 px / 5 px aralıkta. Başlık + rozet + soru noktaları iki satıra kırılıyor; panel 6.4fr/5.6fr'ye genişlese de (524 px) tek satıra sığmıyor (h2 373 + rozet 191). Standart sıkılaştırmalar (bölüm/gövde aralığı 6, başlık alt dolgusu 6, soru payı 0) en çok ~16 px kazandırıyor; 25 px ancak şık aralıklarını da 0–2 px'e indirerek kazanılır → çok zorlama, dokunulmadı.
- hiza: s9, s13 düğme yazıları ortalandı

#### MAT.12.1.2-a
- s4: önce 6 px → sonra 0 — gövde aralığı 6, kutu dolgusu 10px 12px

#### MAT.12.1.3-a
- s1: önce 73 px → sonra 0 — sayfanın 8fr/4fr'si → 7fr/5fr (SVG; sahne okunur), kart dolgusu 8 / aralık 6, sürgü payı 2, gövde aralığı 6
- s3: önce 66 px → sonra 0 — 6.4fr/5.6fr (SVG): başlık tek satıra iner, yönerge 2 satır; gövde aralığı 6
- s4: önce 14 px → sonra 0 — kart alanı dolgusu 10, başlık/ızgara birleşen payı 10 → 6, ızgara aralığı 8, gövde aralığı 6

#### MAT.12.1.4-a
- s1: önce 93 px → sonra 0 — 8fr/4fr → 7fr/5fr (SVG); iki varsayım kartı yan yana (yazı ortalı), panel grubu aralığı 10
- s3: önce 31 px → sonra 0 — şıklar 40 px / dolgu 3, kart dolgusu 10px 14px / aralık 8, gövde aralığı 6
- s4: önce 51 px → sonra 0 — kartlar min 44 / dolgu 6, panel kartı dolgusu 8 / aralık 6, sürgü satırı aralığı 2, yuva dolgusu 4, havuz aralığı 6, gövde aralığı 6
- s7: önce 10 px → sonra 0 — şablonun ezdiği grafik kartı aralığı 12 → 6 (sayfanın kendi değeri)
- s8: önce 71 px → sonra 0 — şıklar 40 px / dolgu 3, grup dolgusu 8px 12px / aralık 6, seçenek/eylem düğmesi dolgusu 6, lejant üst payı 0, gövde aralığı 6
- s9: önce 16 px → sonra 0 — 6.4fr/5.6fr (SVG): yönerge ve kriter kutuları kısalır; gövde aralığı 6
- hiza: s10 düğme yazıları ortalandı

#### MAT.12.1.5-a
- s1: önce 26 px → sonra 0 — kart dolgusu 8px 14px / aralık 6, ölçü ve polinom kutusu dolgusu 6, düğme satırı üst payı 0, gövde aralığı 6
- s7: önce 49 px → sonra 0 — 6.4fr/5.6fr (SVG): başlık tek satıra iner; şıklar 40 px / dolgu 3, gövde aralığı 6
- hiza: s1, s4, s6 düğme yazıları ortalandı

#### MAT.12.2.1-a
- s1: önce 24 px → sonra 0 — kart dolgusu 10px 14px / aralık 6, gövde aralığı 6
- s4: önce 9 px → sonra 0 — şablonun .kart dolgusu 14 → 12, gövde aralığı 6
- hiza: s5 düğme yazısı ortalandı

#### MAT.12.2.2-a
- s12: önce 14 px → sonra 0 — kutu dolgusu 10px 14px / aralık 8, gövde aralığı 6
- hiza: s1, s4, s5, s11 düğme yazıları ortalandı

#### MAT.12.2.3-a
- s4: önce 21 px → sonra 0 — sayfanın 8fr/4fr'si → 7fr/5fr (SVG): başlık ve yönerge birer satır kısalır
- s6: önce 29 px → sonra 0 — kartların alt payı (10) 0, kart dolgusu 10px 12px, gövde aralığı 6
- s9: önce 58 px → sonra 0 — sayfanın 7.5fr/4.5fr'si → 6.4fr/5.6fr (SVG): karışık sıralanan eylem kartları en kötü 4 satır; kartlar min 44 / dolgu 6, grupların alt payı 0, raf aralığı 8, gövde aralığı 6
- s10: önce 55 px → sonra 0 — 6.4fr/5.6fr (boyutunu okuyan 3B sahne): yönerge 2 satır; kart dolgusu 10px 12px / aralık 8, gövde aralığı 6
- hiza: s1, s10 düğme yazıları ortalandı

#### MAT.12.2.4-a
- s5: önce 10 px → sonra 0 — şablonun ezdiği durum kartı aralığı 12 → 4, dolgu 8 → 6 (sayfanın kendi değeri)

#### MAT.12.2.5-a
- s2: önce 8 px → sonra 0 — kart alanı dolgusu 8px 12px, gövde aralığı 6
- s4: önce 28 px → sonra 0 — panel dolgusu 8px 12px, sütun dolgusu 6px 10px, formül satırı dolgusu 0, gövde aralığı 6
- s5: önce 55 px → sonra 0 — şablonun .kart dolgusu 14 → 8, türev kartları min 44 / dolgu 6, istasyon yuvaları min 44 / dolgu 6, aralıklar 8/6, gövde aralığı 6
- s8: önce 43 px → sonra 0 — ayar kartı dolgusu 10px 14px / aralık 8, hız kartları dolgu 6, yuvalar min 44 / dolgu 4 / aralık 6, gövde aralığı 6
- s9: önce 7 px → sonra 0 — yuva dolgusu 8px 14px, gövde aralığı 6
- s10: önce 71 px → sonra 0 — 6.4fr/5.6fr (SVG): yönerge 2 satır; ispat kartları min 44 / dolgu 6, kart alanı aralığı 8, hedef paneli dolgusu 10px 16px, gövde aralığı 6
- s12: önce 59 px → sonra 0 — sayfanın 8fr/4fr'si → 7fr/5fr (boyutunu okuyan 3B sahne); şablonun .kart dolgusu 14 → 10, kart başlığının alt payı 0, gövde aralığı 6
- hiza: s2, s5, s7, s9 düğme yazıları ortalandı

#### MAT.12.2.7-a
- s1: önce 52 px → sonra 0 — şıklar 40 px / dolgu 3, ayar/hipotez kutusu dolgusu 10px 16px, aralıklar 8/6, gövde aralığı 6
- s3: önce 20 px → sonra 0 — panel grubu dolgusu 8px 12px, gövde aralığı 6
- s5: önce 4 px → sonra 0 — kutuların alt payı (12) 0, gövde aralığı 6
- s7: önce 78 px → sonra 0 — tam genişlikteki «Hacim Türevi» kutusunda ad ve değer yan yana; panel grubu dolgusu 8px 14px / aralık 6, formül bloğu dolgusu 6, parametre kutuları dolgu 6 / aralık 6, ölçek aralığı 4, gövde aralığı 6
- s12: önce 99 px → sonra 0 — 6.4fr/5.6fr (SVG): yönerge 2 satır; kural blokları min 40 / dolgu 4, fonksiyon kartları alt payı 0 / dolgu 4px 10px, havuz üst payı 0, gövde aralığı 6
- hiza: s2 düğme yazısı ortalandı

#### MAT.12.2.8-a
- s1: önce 15 px → sonra 0 — `.s1-panel-grup` alt boşluğu 12 → 0, gövde aralığı 10 → 6
- s2: önce 66 px → sonra 0 — sütun 7fr/5fr → 6.4fr/5.6fr (SVG); `.s2-kart` (şablon .kavram-kart) dolgu 6 px, aralık 2 px
- s3: önce 2 px → sonra 0 — gövde aralığı 10 → 6

#### MAT.12.2.9-a
- s1: önce 7 px → sonra 0 — gövde aralığı 6, `.s1-kutu` aralığı 8 → 6
- s3: önce 80 px → sonra 0 — sütun 8fr/4fr → 7fr/5fr (SVG); grup alt boşluğu 0, kartlar min 44 px / dolgu 6, örüntü maddeleri dolgu 6
- s5: önce 35 px → sonra 0 — sütun 8fr/4fr → 7fr/5fr (SVG): yönerge bir satır, iki düğme tek satır
- s6: önce 30 px → sonra 0 — (canvas, oran korundu) kart dolgusu 10 → 6, kolon satırı ve özet dolgusu 4, gövde aralığı 6
- s8: önce 44 px → sonra 0 — (3B) `.s8-veri-kutu` (şablon .kart) dolgu 6, durum kutusu 8, ayar grubu 10, ızgara aralığı 8
- s12: önce 19 px → sonra 0 — panel dolguları 12 → 8, kök kartları min 44 px / dolgu 6, gövde aralığı 6
- s18 (DEĞERLENDİRME, 5. soru): önce 7 px → sonra 0 — `.deg-kap` ve `.deg-siklar` aralığı 4 (şıklar değişmedi)

#### MAT.12.3.1-a
- s1: önce 11 px → sonra 0 — yuva listesi aralığı 10 → 6
- s2: önce 12 px → sonra 0 — ayar kutusu alt boşluğu 10 → 0, gövde aralığı 6

#### MAT.12.3.2-a
- s3: önce 73 px → sonra 0 — kart dolgusu 8/aralık 6, veri kutuları dolgu 6/aralık 2, ızgara 6, durum rozeti dolgu 6, kaydırıcı üst boşluğu 0
- s4: önce 94 px → sonra 0 — sütun 8fr/4fr → 7fr/5fr (ResizeObserver'lı 3B); paneller (şablon .kart) dolgu 8, aralık 6, gövde aralığı 6
- s6: önce 28 px → sonra 0 — panel kutuları ve yay kartları dolgu 8, gövde aralığı 6
- s11: önce 9 px → sonra 0 — varsayım kartlarında sayfanın kendi 6 px dolgusu geri getirildi (şablon eziyordu), gövde aralığı 6
- s12: önce 55 px → sonra 0 — panel dolguları 8, durak yuvası 6, rapor maddesi 4, rozet 2, liste aralığı 6
- s13: önce 49 px → sonra 0 — kart dolgusu 8 / alt boşluk 0, kadran ve durum üst boşlukları 4–6, gövde aralığı 6
- s15: önce 31 px → sonra 0 — grup dolgusu 8 / aralık 6, kartlarda sayfanın kendi değerleri (min 42, dolgu 6) geri getirildi
- s16: önce 17 px → sonra 0 — (listede yoktu, `--tekrar 3` ile görüldü) aşama ve pano alt boşluğu 12 → 4, gövde aralığı 6
- s17: önce 16 px → sonra 0 — önerme şıkları min 40 / dolgu 3, şık aralığı 6, grup aralığı 8
- s18: önce 4 px → sonra 0 — terimler paneli dolgusu 16 → 12 (üst/alt)
- s19: önce 14 px → sonra 0 — hedef kartındaki başlık satırının şablon alt boşluğu 0, kart dolguları 10, gövde aralığı 6
- s22: önce 38 px → sonra 0 — denklem satırları arası 24 → 10 (yatay aralık aynı), grup dolgusu 10, gövde aralığı 6
- s23: önce 68 px → sonra 0 — (6fr/6fr korundu) kartlar min 42 / dolgu 5, sütun dolgusu 8 / aralık 6, yuva dolgusu 6, havuz aralığı 6
- s24: önce 13 px → sonra 0 — panel aralığı 14 → 8, başlık satırı alt boşluğu 10 → 4

#### MAT.12.3.3-a
- s3: önce 29 px → sonra 0 — kartların ek alt boşluğu 12 → 0, gövde aralığı 6
- s4: önce 54 px → sonra 0 — sütun 8fr/4fr → 7fr/5fr (SVG): başlık tek satır, yönerge ve iki satırlı şıklar kısalır; gövde aralığı 6
- s8: önce 69 px → sonra 0 — (3B, oran korundu) grup dolgusu 6 / alt boşluk 0 / aralık 6, kadran dolgusu 0, kaydırıcı boşluğu 2, rozet dolgusu 2

#### MAT.12.4.1-a
- s5: önce 37 px → sonra 0 — (3B) eleman şıkları min 40 / dolgu 3, panel dolgusu 12, gövde aralığı 6
- s7: önce 41 px → sonra 0 — (3B) kart dolgusu 10 / alt boşluk 0 / aralık 8, bilgi öğeleri dolgu 6 / aralık 2, ızgara 8

#### MAT.12.4.2-a
- s1: önce 25 px → sonra 0 — (3B) kart dolgusu 10 / aralık 6, gövde aralığı 6
- s2: önce 34 px → sonra 0 — (6fr/6fr korundu) kartlar (şablon .kavram-kart) min 44 / dolgu 6, boş sütunların en az yüksekliği 190 → 170, havuz üst boşluğu 4

#### MAT.12.4.3-a
- s1: önce 52 px → sonra 0 — (3B) kartlar (şablon .kart) dolgu 8, aralıklar 6–8, bileşen şıkları min 40 / dolgu 3, açıklama kutusu dolgu 6
- s3: önce 42 px → sonra 0 — panel grupları dolgu 10 / alt boşluk 0, gövde aralığı 6
- s7: önce 41 px → sonra 0 — (3B) kutular (şablon .kart) dolgu 8, strateji kartları dolgu 6, gövde aralığı 6
- s8: önce 50 px → sonra 0 — (3B) kartlarda sayfanın kendi aralığı (2 px) geri getirildi + dolgu 6, ana kutu dolgu 8 / aralık 6, yuva ve şerit dolgusu 4

#### MAT.12.5.1-a
- s3: önce 72 px → sonra 0 — sütun 8fr/4fr → 7fr/5fr (SVG): etiket başlık satırına çıkar, yönerge kısalır; havuz dolgusu 10 / aralık 8, kart aralığı 6
- s15: önce 116 px → sonra 0 — sütun 8fr/4fr → 6.4fr/5.6fr (SVG; 7fr/5fr ile 21 px kalıyordu): kart açıklamaları tek satıra iner; kart dolgusu 6, gövde aralığı 6 (sahne tam ekran görüntüsünde rahat okunuyor)

Not: ölçüt açılış durumudur; etkinlik bitince beliren düğme/sonuç satırlarıyla oluşan durumlar ayrıca ölçülmedi.

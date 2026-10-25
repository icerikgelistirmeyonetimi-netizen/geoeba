# Çizim Stüdyosu: çizim araçlarının yeniden düzenlenmesi ve hata düzeltmeleri

Tarih: 25 Ekim 2026. Durum: değişiklikler çalışma ağacında, **commit edilmedi**. Son durum: `tsc` 0, vitest 251 dosya /
9668 test yeşil.

Kapsam: Serbest Çizim Stüdyosu'nun bütün 2B çizim araçları ve 3B araç panelinin saf modülleri. İş dört turda ilerledi:

1. **Davranışı değiştirmeden yeniden düzenleme.** Önce yalnız "Temel Çizim Araçları" istendi, sonra kapsam bütün
   araçlara genişledi. Şart: kademe yapısı (ilkokul / ortaokul / lise / tüm araçlar) asla bozulmayacak.
2. **Okurken bulunan 21 hatanın düzeltilmesi** ("tüm sorunları çöz").
3. **Var olan işlevlerin yenilenmesi ve tutarsızlıkların giderilmesi.** Şart: araçlarda tek bir işlev bile eksilmeyecek.
4. **Kullanıcının tarayıcıda bulduğu yay / dilim / çember tutarsızlıkları** (bölüm 6).

---

## 1. Özet

| | Başlangıç | Şimdi |
|---|---|---|
| Test dosyası / test | 239 / 9210 | **251 / 9668**: 11 yeni dosya; hata düzeltmelerinin regresyonu `hataDuzeltmeleri.test.ts` ve `donusum3dAltYapi.test.ts` |
| `tsc --noEmit` | temiz | temiz |
| Kademe × araç matrisi | – | 4 kademede kayıt altında; **değişmedi** |
| Bulunan hatalar | – | 21 hata + tarayıcıda bulunan 7 tutarsızlık + testlerin yakaladığı 1 yeni hata; **hepsi düzeltildi** |
| Tarayıcı | – | İlkokul / Ortaokul / Lise oturumları; konsol hatası yok; deneme çizimleri silindi |

---

## 2. Kademe yapısı nasıl korundu

- **Kademe süzgeci modüllerine dokunulmadı:** `kademeDuzeyleri.ts`, `kademeDuzeyleri3B.ts` ve süzgeç işlevleri
  (`gruplariSuz`, `aracGorunurMu`, `aracSecilebilirMi`, `gruplari3BSuz`) aynı.
- **Araç kaydının kimlikleri, grup kimlikleri ve sırası birebir korundu:** `TOOL_GROUPS` ve `TREE_TOOL_GROUPS` artık tek
  kayıttan (`ARAC_GRUPLARI`) üretiliyor.
- **Değişiklikten önce kilitlendi:** `kademeAracMatrisi.test.ts` her kademe için şunları kaydetti; kayıt hiç
  değişmedi:
  - paneldeki araçlar ve sırası;
  - kısayol / komutla seçilebilirlik;
  - Araçlar menüsü;
  - kullanım kılavuzu;
  - 3B panel ve 3B kademe kuralları.
- **Tek kademe düzeltmesi (hata 19):** Kademe değişince etkin 3B araç artık denetleniyor. 2B'de bu zaten vardı.

---

## 3. Karakterizasyon ağı (değişiklikten ÖNCE yazıldı)

Projede jsdom ya da React test çizicisi yok. Küçük bir **kanca koşum düzeneği** (`__tests__/kancaKosumu.ts`) `react`
kancalarını taklit eder. **Gerçek** `WorkspaceProvider`, `Canvas` ve pencereler DOM'suz çizilir; işleyiciler kullanıcı gibi
çağrılır. Nesneler JSON olarak karşılaştırılır. Kimlikler `pt#1` gibi sıralı adlara, zamanlar `T+n` biçimine çevrilir.

| Dosya | Ne kayıtlı |
|---|---|
| `kademeAracMatrisi.test.ts` | Kademe × araç matrisi |
| `aracTanimlari.test.ts` | İki 2B araç listesinin tamamı |
| `cizimAraclariSenaryolari.test.ts` | Bütün 2B araçlar × (tüm araçlar, ilkokul, ortaokul), aynı hazır sahnede |
| `temelCizimTiklama` / `Surukleme` / `Tanimlari.test.ts` | Temel araçların ayrıntılı akışları |
| `ekCizimAkislari.test.ts` | Alan modeli, kapalı bölge, Pergel, Yarıçapla Çember, etkileşim araçları, Kesir, "Açısını ölç" |
| `donusumAraclari.test.ts` | Şekli Döndür ve Yansıt (tüm araçlar ve ilkokul) |
| `src/math/__tests__/eksenBirimVektoru.test.ts` | 3B eksen yardımcısı |

**Kayıtların güvenilirliği:** Anlık görüntüler git HEAD'deki kodla (düzenlenen dosyalar geçici olarak geri konarak)
kaydedildi. Düzenlenmiş kod bu kayıtları geçti. Hata düzeltmelerinin değiştirdiği her kayıt farkı tek tek sınıflandırıldı.
Hepsi amaçlanan değişiklikti (bölüm 5).

---

## 4. Yeniden düzenleme (1. ve 3. tur)

1. **Ortak kurucular:** `cizimNesneleri.ts` (780 satır) 2B nesnelerin tek kaynağıdır. Kapsadığı nesneler:
   - nokta, parça, doğru, ışın, çember, ölçülü parça, çokgen, düzgün çokgen;
   - kare / dikdörtgen, ölçüm çokgenleri;
   - orta dikme, açıortay, dik / paralel doğru;
   - 3 noktalı çember, yay, dilim, açı, açıölçer, elips;
   - etkileşim araçları, kesir;
   - döndürme, yansıma, sürükleme yuvarlaması.
2. **Araç kaydı:** `toolDefinitions.ARAC_GRUPLARI` tek kaynak oldu. `treeToolDefinitions.tsx` 175 satırdan 33 satıra indi.
3. **`handlePointClick`:** Araçların tekrar eden "N nokta topla" bloğu tek yardımcıya indi (`noktaTopla`); 9 araç
   kullanıyor. Hangi geçersiz girdide nokta kaydedildiği artık bütün araçlarda aynı.
4. **Tutarsızlıklar giderildi:**
   - 3B hazır ölçü birleştirme 3 kopyaydı; artık tek: `cisimOlculeriniBirlestir`.
   - Türkçe sayı okuyucu artık eksi işaretini (−) ve "1.000,5" yazımını tanıyor.
   - Hacim yazısı Bağlamlar sekmesiyle aynı basamakta (2 ondalık).
   - Cisim adları tek tablodan geliyor (`CISIM_ADLARI`). Toolbar3D'deki "Sıfırla", Canvas3D ile aynı işlevi
     (`donmeyiSifirla`) kullanıyor.
   - Gizmo uzunluğu tek değer. Ölü kod ve yanlış belge yorumları temizlendi.
5. **Korunanlar:**
   - kamuya açık API'ler;
   - `data-*` öznitelikleri ve test seçicileri;
   - kaynak metnini okuyan testlerin aradığı dizgiler;
   - nesnelerin anahtar sırası.

---

## 5. Okurken bulunan 21 hata (2. tur): hepsi düzeltildi

Her düzeltmenin açık beklentili regresyon testi var: `hataDuzeltmeleri.test.ts` (2B) ve `donusum3dAltYapi.test.ts`
(3B).

### 2B

| # | Hata | Düzeltme |
|---|---|---|
| 1 | Doğru Parçası / Çember kısa tıklamada kenara yapışmıyordu | Kısa basış ham konumu kullanır: önce kenara, sonra ızgaraya oturur |
| 2 | Değişiklik yokken geçmişe boş adım yazılıyordu (açı, orta nokta, alan) | Geçmiş, içerik aynıysa adım yazmaz (`ayniIcerik`) |
| 3 | 3 Noktalı Çember / Yay / Dilim kurulamazsa yeni nokta kayboluyordu | Hata dallarında nokta kaydedilir |
| 4 | Eğim Ölç: AB'den sonra BA ikinci etiket ekliyordu | "Zaten ölçülmüş" denetimi iki sırada da çalışır |
| 5 | Şekli Döndür: parça seçiliyken "Önce bir şekil seçin" | Döndürülebilir bütün türler tanınır (`DONDURULEBILIR_TURLER`) |
| 6 | Kesiştir'in ilk seçimi araç değişince unutulmuyordu | Araç değişince Kesiştir ve Pergel sıfırlanır |
| 7 | Elips aracında kısa basış hiçbir şey yapmıyordu | Tıklamayla 3 × 2 br elips çizilir |
| 8 | Adsız noktada `" Merkezli Çember"`, `[B]` gibi yarım adlar | Araç adı yedek olarak kullanılır |
| 9 | Lastik bant önizlemesi tam sayı ayarına uymuyordu | Önizleme tuvaldeki ölçülerle aynı kural |
| 10 | Çokgende sessizce yok sayılan tıklamalar | Bekleyen köşe ve erken kapatma ipucu verir |
| 11 | Kenara oturan nokta yalnız Nokta aracında şekle bağlanıyordu | Bütün araçlarda bağlanır (`onObjectId`) |
| 12 | Elips önizlemesi ile sonucu farklı merkezde | Tek merkez hesabı (`elipsMerkezi`) |
| 13 | Sürükleyerek çizimde parça 0,1'e, çember tam sayıya yuvarlanıyordu | İkisi de aynı kural (`surukleUzunlugu`) |
| 14 | Ölçülü Doğru Parçası'nda üst sınır yoktu | En çok 100 br (Kare ile aynı) |
| 15 | Çokgen doğrudaş köşeleri kabul ediyordu | Uyarı verir; doğru dışına köşe eklenince kapanır |

### 3B

| # | Hata | Düzeltme |
|---|---|---|
| 16 | Yüz etiketi / alanı silinen yüzden sonra yanlıştı | Kalıcı yüz kimliğiyle aranır (`kaliciYuzBul`) |
| 17 | Zeminde Çiz'de Kare Prizma 4:3:2 çıkıyordu | Hazır oranla büyür, kare taban korunur (`hazirOlculuCizimOlculeri`) |
| 18 | Eksen etiketleri ok uçlarının ötesindeydi | Etiket ve sürükleme aynı gizmo uzunluğunu kullanır |
| 19 | Kademe değişince etkin 3B araç denetlenmiyordu | Görünmeyen araç seçiliyse Seç ve Taşı'ya dönülür |
| 20 | Köşe kaydırmaları döndür / ölçekle / yansıt sonrası cismi izlemiyordu | Kaydırmalar dönüşümle birlikte taşınır; yansımada yüz renkleri ve silinen yüzler aynadaki yüze geçer |
| 21 | Yüz / köşe kipinde ölçekleme notu "1 katına" yazıyordu | Not gerçek (sınırlanmış) çarpanı yazar |

---

## 6. Tarayıcıda bulunan tutarsızlıklar (4. tur, 25 Ekim)

Kullanıcı yay, dilim ve çemberde bulduğu tutarsızlıkları bildirdi. Doğru tespit: bu tür tutarsızlıklar okuma sırasında
yakalanmalıydı.

**Ortak kural** (doğru parçası ve açı etiketleri bu kuralı zaten izliyordu): uzunluk, açı, yay uzunluğu, yarıçap, kiriş
ve eğim etiketi **ölçtüğü şeyin yanındayken kısa**, oradan ayrılınca **tam** yazılır.

**Alan ve çevrenin kısa / tam biçimi yoktur** (kullanıcı: "kısa yazım alan ve çevrede yok zaten"). Tek biçimde
yazılırlar ve uzaklaştırınca değişmezler:

- adı olan şekil adıyla: `A(ABC) = 6 birimkare`, `A(BAC dilimi) = …`;
- çember ve elips formülsüz: `Alan = 28 birimkare`, `Çevre = 19 br`.

- Ölçüt, etiketin varsayılan yeri değil, **ölçtüğü şeye yakınlıktır**.
  - Yay uzunluğu için yay, yarıçap ve kiriş için kendi doğruları, merkez açı için merkez.
  - Elle o şeyin yanına taşınan etiket de kısalır.
- Neden bozuktu: 25 Eylül'deki bir tasarım düzeltmesi ("hepsi tam", 835c051) yay / dilim listesini her zaman tam yazıma
  çevirmişti. Amaç listede iki ayrı yazım olmamasıydı. Şimdi liste yanındayken bütünüyle kısa, uzaklaştırılan etiket tam.
  Böylece iki yazım yine yan yana gelmiyor.

| Bulgu | Düzeltme |
|---|---|
| Dilimin açısı ilk ölçümde dilimin dışında ve uzun yazılıyordu (`m(∠BAC) = 90°`) | Çokgen açıları gibi **merkezde**, açı yayıyla (90°'de kare) ve kısa (`90°`). Merkezden uzaklaşınca tam. |
| Yay uzunluğu yay üzerindeyken kısalmıyordu | Yayın yanında kısa (`≈ 4,71 br`, yaya paralel), ayrılınca `\|B͡C\| ≈ 4,71 br` |
| Yarıçap, çizgisi varken çizginin üzerine konmuyordu | Dilimin kenarında (ya da yayın / çemberin çizili `[merkez, uç]` parçasında) parça uzunluğu gibi: kısa `r = 3 br`, uzakta `r = \|AB\| = 3 br` |
| Çember alan / çevresi formülle yazılıyordu (`Çevre = 2πr = 19 br`) | Formülsüz tek biçim: `Çevre = 19 br`, `Alan = 28 birimkare`. Elips de öyle. Çemberin yarıçap satırı yanındayken `r = 3 br`, uzakta `r = \|MT\| = 3 br`. |
| Yay / dilimde B ya da merkez kayınca üçüncü nokta (C) yaydan kopuyordu | C yayın üstündeyse ve başka şeklin noktası değilse yeni yarıçapa taşınır; kendisi sürüklenince yay boyunca kayar (`yayYonNoktalariniOturt`). Bir üçgenin köşesi gibi başka şekle ait nokta ya da baştan yay dışında duran nokta yerinde kalır. |
| İç açı / dış açı seçeneği yay ve dilimde yoktu | Sağ tık > **İç açı / dış açı**: merkezde 360° − iç açı, dilimin dışında büyük açı yayıyla. Madde hem dilimin / yayın kendi menüsünde hem de çokgenlerdeki gibi **köşe noktasının (merkezin) menüsünde** var. Köşede ölçülmüş başka açı da varsa alt menüde ikisi birlikte listelenir. Geçmişe "Dış açı gösterildi" / "İç açı gösterildi" yazılır. |
| Eğim etiketi her zaman `AB eğimi = 2` yazıyordu | Doğrunun yanında `Eğim = 2`, doğrudan uzaklaştırılınca `AB eğimi = 2`. Yazı yatay kalır. |
| "(büyük yay)", "(yarım çember)", "(dış açı)" ekleri | Tuval etiketlerinden kaldırıldı: çizilen yay ve açı yayı bunu zaten gösterir. Komut yanıtı ve nesne listesi gibi yalnız yazıdan oluşan yerlerde ve seslendirmede kaldı. Bu eklerin bir uzman ya da revizyon isteğiyle geldiğine dair kayıt yok; 23 Eylül'deki genel yazım işiyle (fc39fed) eklenmişler. |
| **Testlerin yakaladığı yeni hata:** Yay / dilimde üçüncü nokta merkezle çakışınca görünmeyen, bozuk bir yay oluşuyordu | "Üç FARKLI nokta seçmelisiniz." uyarısı verilir; nokta kaydedilir, şekil kurulmaz. |
| Kaydırıcı (sürgü) ayarları açılınca bağlı olduğu şekil formda görünmüyordu | Pencere her açılışta seçimi boşaltıyordu. Artık bağlı olduğu şekil ve özellik seçili gelir (`sliderCurrentBinding`); kayıt yoksa ya da eskimişse şekillerden bulunur. Aynısı kaydedilince bağ değişmez. |
| Kaydırıcının bağlı olup olmadığı tuvalde belli değildi | Çubuğun altında, bağlı olduğu ölçünün yanında zincir simgesi. Bağlıysa renkli zincir, geçici kapalıysa turuncu kırık zincir, bağsızsa soluk kırık zincir. Üzerine gelince açıklama çıkar. Nokta kilidiyle karışmasın diye kilit değil zincir seçildi. |
| Bağ geçici olarak kapatılamıyordu | Zincire tıklamak bağı geçici kapatır: şekil **bağlanmadan önceki konumuna döner** ve serbest kalır; kaydırıcı bağı hatırlar (`suspendedBinding`). Yeniden tıklamak bağı kaydırıcının değeriyle kurar. Bağsız sürgüde zincir ayarları açar. Proje dosyası, kopyala-yapıştır ve nokta birleştirme yeni alanı tanır. |
| Bağlı sürgüde değişken adı kayboluyordu (başlık `\|AB\| = 3 br`) | Başlık sürgünün kendi adıyla: `a = 3 br`. Bağlı ölçü (`\|AB\|`, `m(∠BAC)` …) çubuğun altında, zincirin yanında. |
| Ayar ve oynat düğmeleri her zaman görünüyordu | Yalnız sürgünün üzerine gelince, sürgü seçiliyken ya da klavye odağındayken görünürler. Canlandırma sürerken Durdur düğmesi görünür kalır. |
| Varsayılan ayarlar ondalıklıydı (adım 0,5 / 0,1) | Sürgü penceresi, fonksiyon parametresi sürgüleri ve yazılı komut varsayılan olarak adım 1. "a = 2,5" gibi ondalık değer atanırsa adım 0,1 kalır, yoksa o değere geri dönülemez. |
| Çokgenin kenar sayısı sürgüye bağlanamıyordu (26 Ekim) | Ayarlarda düzgün çokgenin özelliklerine **Kenar sayısı** eklendi; düzgün olmayan çokgende "düzenlenemiyor" görünür. İlk iki köşe serbest kalır, ötekiler bu iki köşeden ve sürgüden hesaplanır (`regularVertex`, `math/duzgunCokgen.ts`). Sürgü değişince köşe noktaları eklenir (sıradaki harflerle) ya da silinir; silinen köşeye bağlı ölçümler de gider. Çokgenin adı (Düzgün Beşgen → Düzgün Yedigen) ve kenar etiketleri uyarlanır. Taban köşesi sürüklenince çokgen düzgün kalır. "Kenar sayısı" seçilince aralık kendiliğinden 3–12, adım 1 olur. Bağ geçici kapatılınca çokgen bağlanmadan önceki kenar sayısına döner. Canlandırma, kaydetme ve kaydırıcının silinmesi bu bağı tanır. |
| Canlandırma adımı yok sayıyordu (değerler 3,4712 gibi) | Tutamak akıcı kayar. Değer, dolayısıyla şekil ve başlık, adımın katlarında ilerler. Sürekli konum ayrıca tutulduğu için küçük kare artışları adıma geri yuvarlanıp canlandırmayı takmaz. |

**Bilerek değiştirilmeyen:** Trigonometrik oran yazıları her zaman tam kalır. Kısa biçim (`sin = 0,6`) hangi açının
olduğunu kaybeder.

---

## 7. Bilinçli davranış değişiklikleri (özet)

- Kenara yapışan noktalar şekle bağlanır; şekil taşınınca onunla gider.
- Elips tıklamayla da çizilir.
- Tam sayı ölçüde sürüklenen parça tam birime oturur.
- Ölçülü Doğru Parçası en çok 100 br.
- Doğrudaş köşeli çokgen kurulmaz.
- 3B cisim adları `Dikdörtgen Prizma 1` biçiminde (eskiden `Prizma 1`).
- Hacim / alan yazısı 2 ondalık.
- Yay / dilim uzunluk ve açı etiketleri ile eğim etiketi: yanındayken kısa, uzakta tam. Alan ve çevre tek biçimde,
  formülsüz (bölüm 6).
- Dilimin merkez açısı merkezde ve açı yayıyla çizilir. Yarıçap, çizgisi varsa çizginin yanında durur.
- Yay / dilimin yön noktası yayda kalır.
- Tuval etiketlerinde niteleyici ekleri yok.

Hiçbir araç ve işlev kaldırılmadı. Uzunluk ve açılarda uzun yazım, etiket uzaklaştırılınca görünür. Çember ve elipsin
alan / çevre formülleri tuval etiketinden kalktı; bu kullanıcı isteğidir. Komut yanıtları formülleri yazmayı sürdürür.
Global "kısa / tam yazım" ayarı aynen çalışır.

---

## 8. Doğrulama

### Testler

Son çıktı (`CI=true`, yeni anlık görüntü yazılmaz):

```
tsc çıkış kodu: 0
Test Files  251 passed (251)
     Tests  9668 passed (9668)
```

### Tarayıcı

Kullanıcının dev sunucusu kullanıldı (`http://localhost:3000/#/studyo`); ikinci `next dev` başlatılmadı.

- **3. tura kadar:** İlkokul, Ortaokul ve Lise oturumlarında paneller beklenen listeyle aynıydı.
  - 8 temel araçla çizim yapıldı.
  - Komut `A merkezli B den geçen çember çiz` çalıştı.
  - İlkokulda sekizgen sınırı ve çeyrek dönüş denendi.
  - 3B Ara sekmesi ve küp ekleme denendi.
- **4. tur (Ortaokul):**
  - Dilimde merkez açı merkezde `90°` ve dik açı karesiyle göründü. Sürüklenip uzaklaştırılınca `m(B̂AC) = 90°` oldu,
    merkeze geri getirilince yine `90°`.
  - Yarıçap kenarın dışında `r = 3 br`, yay uzunluğu yaya paralel `≈ 4,71 br`, liste `Kiriş / Çevre / Alan ≈ …` kısa.
  - İç / dış açı: `270°` ve büyük açı yayı; geri çevrilince `90°`.
  - Yeni dilimde B merkeze doğru çekildi, C yeni yarıçapa geldi. C sürüklendi, yay üstünde kaldı (merkeze uzaklık =
    yarıçap).
  - Çember kartı `r ≈ 3,61 br`, `Alan ≈ 40,84 birimkare`, `Çevre ≈ 22,65 br`.
  - Konsol hatası yok. Deneme çizimleri silindi.
- **Kenar sayısı (26 Ekim, Ortaokul):** "düzgün beşgen çiz" komutuyla beşgen çizildi ve sürgü ayarlardan "Kenar sayısı"na
  bağlandı. Aralık kendiliğinden 3–12 / adım 1 / değer 5 geldi. Değer 8 yapılınca köşeler A–H oldu (düzgün sekizgen).
  Sürgüde "a = 8", altında zincir ve "Kenar sayısı" görünüyor. Konsol hatası yok; deneme çizimi silindi.

---

## 9. Dosyalar

**Değişen üretim dosyaları** (diğer oturumun mobil değişikliklerine dokunulmadı):

| Dosya | Fark |
|---|---|
| `src/state/WorkspaceContext.tsx` | +232 / −579 |
| `src/components/workspace/Canvas.tsx` | +401 / −382 |
| `src/components/workspace/toolDefinitions.tsx` | +138 / −123 |
| `src/components/workspace/treeToolDefinitions.tsx` | +14 / −175 |
| `src/math/donusum3d.ts` | +116 / −17 |
| `src/components/workspace/Canvas3D.tsx` | +27 / −76 |
| `src/components/workspace/cisimYerlesimi.ts` | +43 |
| `src/math/olcuYazimlari.ts` | +30 / −5 |
| `src/components/workspace/WorkspaceView.tsx` | +17 / −27 |
| `src/components/workspace/Toolbar3D.tsx` | +17 / −23 |
| `src/math/matematikYazimi.ts` | +11 / −4 |
| `src/components/workspace/canvas3dDonusum.ts` | +11 / −6 |
| `src/components/workspace/RegularPolygonDialog.tsx` | +8 / −43 |
| `src/components/workspace/CircleRadiusDialog.tsx` | +4 / −26 |
| `src/components/workspace/ilkokulKipi.ts` | +12 |
| `src/types/math.ts` | +18 (`centralAngleReflex`, `suspendedBinding`, `preBinding…`) |
| `src/math/sliderBindings.ts` | +87 / −9 (`sliderCurrentBinding`, bağı geçici kapat / aç) |
| `src/math/sliderDisplay.ts` | +36 / −10 (değişken adlı başlık, bağlı ölçü adı) |
| `src/hooks/useSliderPlayback.ts` | +34 / −5 (adıma oturan canlandırma) |
| `src/components/workspace/SliderSettingsDialog.tsx` | +6 / −3 |
| `src/components/workspace/SliderDialog.tsx` | +2 / −1 (varsayılan adım 1) |
| `src/math/{projectFile, objectClipboard, noktaBirlestir}.ts` | `suspendedBinding` alanı; `regularVertex` kurulumu |
| `src/math/duzgunCokgen.ts` (yeni) | düzgün çokgen adı, düzgünlük denetimi, köşe hesabı, kenar sayısı eşlemesi |
| `src/math/{commandBindings, zEkseni}.ts`, `commands/handlers/edit/geometry.ts` | `regularVertex` kurulumu |
| `src/components/workspace/RegularPolygonDialog.tsx` | adı `duzgunCokgenAdi`'ndan alır (tek kaynak) |
| `src/math/commands/{scene, handlers/algebra/shared, handlers/algebra/sliders}.ts` | varsayılan adım 1 |
| `src/components/workspace/treeToolDefinitions3D.tsx` | +1 / −1 |

**Yeni dosyalar:**

- `src/components/workspace/cizimNesneleri.ts`
- `src/components/workspace/__tests__/`:
  - `kancaKosumu.ts`, `temelCizimKosumu.ts`;
  - 9 test dosyası (`hataDuzeltmeleri.test.ts` dahil);
  - `__snapshots__/`.
- `src/math/__tests__/eksenBirimVektoru.test.ts`, `src/math/__tests__/donusum3dAltYapi.test.ts`
- Güncellenen test: `src/math/__tests__/olcuYazimlari.test.ts`. Çember / elips kartının yeni kuralı ve yarıçap çizgisi.

**Test notu:** Davranışı bilerek değiştiren bir düzeltmede ilgili anlık görüntüyü `npx vitest run -u <dosya>` ile
yenileyin. `-t` süzgeciyle birlikte `-u` kullanmayın: süzgeç dışında kalan testlerin kayıtlarını siler.

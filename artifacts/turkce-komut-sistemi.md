# Çevrimdışı Türkçe çizim komutları

Öğretmen, 2D tuvalin sağ alt köşesindeki **klavye + mikrofon** düğmesiyle ne istediğini kendi cümlesiyle yazar ya da söyler; uygulama araç kutusundaki her işi yazıyla ve sesle de yapar. Komutların yorumlanması tarayıcıda, internet ve dil modeli olmadan çalışır.

## Düğme: klavye ve mikrofon

- **Klavye** simgesi (ya da **Ctrl+K**) komut kutusunu düğmenin yanında açar/kapatır. **Esc** (öneri listesi açık değilken) ya da kutudaki **×** kapatır. Tuval dar olduğunda (küçük ekran, açık yan paneller) kutu ekran genişliğinde, düğmenin üstünde açılır.
- **Mikrofon** simgesine tıklanınca dinleme başlar ve **tekrar tıklanana kadar açık kalır**. Her söylenen cümle bittiğinde yazıya çevrilir, `normalizeSpokenCommand` ile düzenlenir ve sırayla uygulanır. Arka arkaya söylenen komutlar kuyruğa girer; her biri bir öncekinin sonucundaki çizim üzerinde çalışır.
- Konuşma düzenleyicisinin anladıkları (örnekler):
  - harf adları: `a be ce üçgeni` → `ABC üçgeni`, `de e fe ge yamuğu` → `DEFG yamuğu`, `a be çaplı çember` → `AB çaplı çember`
  - sayılar: `iki virgül beş` → `2,5`, `te eşittir sıfır virgül beş` → `t = 0,5`, `ikiye bir oranında` → `2:1`
  - fonksiyonlar: `f x eşittir x kare` / `ef x eşittir x kare` → `f(x) = x kare`, `ge x eşittir ef x artı bir` → `g(x) = f(x) + 1`, `f parantez beş kaç` → `f(5) kaç`, `ef in üçteki değeri nedir` → f(3)
- Tarayıcı birden çok olası metin verdiğinde motorun gerçekten anladığı seçilir; yarım kalmış görünen cümle (ör. `üçgen`) kısa bir süre beklenir ve sonraki parçayla birleştirilir.
- Mikrofon açıkken düğmenin üstündeki balon dalga göstergesini, o an söyleneni ve son anlaşılan komutları gösterir.
- **Ses ayarları** (kutunun başlığındaki simge):
  - Yalnızca tarayıcının ses tanıması (Chrome/Edge) kullanılır; tarayıcı cihaz üstü Türkçe tanıma sunuyorsa önce o. Tarayıcı desteklemiyorsa ya da internet yoksa mikrofon açıklamayla kapalı kalır; sayfaya model yüklenmez. Tarayıcının çevrimiçi hizmeti sesi Google/Microsoft sunucusuna gönderir.
  - Çevrimdışı Whisper modeli (eski "Yalnızca çevrimdışı" seçeneği, `public/speech/`) 7 Ekim 2026'da kaldırıldı: ~80 MB model ve ayrı iş parçacığı gerektiriyordu, gerekli görülmedi.
  - *Söyleyince hemen uygula*: kapatılırsa anlaşılan metin yalnızca kutuya yazılır, Enter ile uygulanır.

## Kullanım

- **Enter** komutu uygular, **Shift+Enter** yeni satır açar. Kutu yazdıkça büyür; birden çok satır, birden çok işlem demektir.
- Bir cümlede birden fazla işlem yazılabilir: `kenarları 3, 4 ve 5 olan üçgen çiz ve alanını göster`, `A(0; 0), B(4; 0) noktalarını oluştur, AB doğru parçası çiz`, bağlaçsız da: `ızgarayı gizle yakınlaştır`, `a = 1 b = 2`.
- Nesnelere adıyla (`ABC`, `abc`, `ABC'nin`, `[AB]`, `A_1`, `A'`, fonksiyonlar için `f`, `g`) ya da seçerek (`seçili`, `seçtiğim`) başvurulur. Zamirler (`onu`, `bunun`, `son çizilen`) önceki işlemin nesnesini gösterir.
- Sayılar rakamla ya da sözle yazılabilir (`iki buçuk`, `2 buçuk`, `kırk beş`, `eksi 3`); ondalık virgül, `br`, `birim`, `cm`, `derece`, `°` anlaşılır.
- Kibar ve soru biçimleri çalışır: `çizer misin`, `çizebilir misin`, `lütfen`, `istiyorum`, `olsun`, `kaç?`, `nedir`.
- Ayarlar olumsuz fiille de söylenebilir: `ızgara olmasın`, `eksenleri görmek istemiyorum`, `hiçbir şey seçili olmasın`.
- Hedef belirsizse komut uygulanmaz; mesaj nasıl düzeltileceğini örnekle söyler. Varsayılan bir değer kullanıldıysa mesajda yazar.
- Boş kutuda **↑** son komutu geri getirir. Öneri listesinde **↑/↓** gezinir, **Enter/Tab** öneriyi kutuya alır (çalıştırmaz), ikinci **Enter** uygular, **Esc** kapatır.
- **Komut örnekleri** paneli komut ailelerine göre gruplanmış örnekleri gösterir; üstteki arama kutusu örnekleri süzer, bir örneğe tıklamak onu kutuya yazar.

## Fonksiyonlar: adlar ve birbirini çağırma

- Her yeni fonksiyon boştaki sıradaki adı alır: **f, g, h, p, q, r, s, u, v, w**, sonra f1, g1 … Kaydırıcı adlarıyla da çakışmaz. Kural her yerde aynıdır: yazılı/sesli komut, cebir girişi, Fonksiyon penceresi, Nesne Ekle penceresi, polinom uydurma, kopyala-yapıştır.
- Aynı adı yeniden yazmak (`f(x) = x^2 - 4`) yeni fonksiyon eklemez, var olanı yeniden tanımlar. Adı verilmeyen ifade (`x^3`, `y = 2x + 1` cebir girişinde) sıradaki adı alır.
- Bir fonksiyon başka bir fonksiyonu çağırabilir: `g(x) = f(x) + 1`, `h(x) = f(5) * x`, `q(x) = h(x) - 3`. f değişince g'nin grafiği de değişir; çağrılan ad kaydırıcıya dönüşmez.
- Değer sorma: `f(5) kaç`, `f(5) = ?`, `f(5)'in değeri nedir`, `f'nin 3'teki değeri nedir`, `x = 2 iken f kaç`, `f(2) + g(0) hesapla`. Değer bir kaydırıcıya bağlıysa o anki değer de söylenir: `f(3) = 6 (a = 2 iken)`. Sahne değişmez.
- Başka yerlerde kullanım: `a = f(2)` (kaydırıcıya değer), `(2, f(2)) noktasını çiz`, `A = (3, f(3))`. Noktada değer yazıldığı andaki değerdir.
- Hesap makinesi: `2^10 kaç`, `3 + 4 * 2 hesapla`, `sqrt(2) nedir`; kendi başına `sin(30) kaç` derece sayılır.
- Yeniden adlandırma (`f fonksiyonunun adını k yap`) başka ifadelerdeki `f(…)` çağrılarını da `k(…)` yapar. `f yi sil`, `g nin grafiğini gizle`, `f yi 2 birim sağa ötele` fonksiyonu adıyla bulur.
- Reddedilenler, açıklamayla: kendine dönen tanım (`f(x) = f(x) + 1`, f → g → f), tanımlı olmayan fonksiyonu çağırma (`h(x) tanımlı değil`), fonksiyonu yansıtma/döndürme.
- Uygulama: fonksiyonun adı etiketinden okunur (`g(x) = …`); `src/math/functionNames.ts` adları seçer ve `parser.ts` içindeki kullanıcı fonksiyonu tablosunu (`setUserFunctions`) ekrandaki nesnelerle eşitler. Tablo `WorkspaceView` çiziminde ve komut motorunun sahnesinde güncellenir; `runCommand` bitince eski tabloyu geri yükler.

## Denklem, eşitsizlik ve parametrik şekiller

- Genel ikinci derece denklem çember ya da elipse çevrilir: `x^2 + y^2 - 2x + 4y - 4 = 0`, `x² + y² = 16`, `(x-1)^2 + (y-2)^2 = 9`.
- Eşitsizlik bölgesi iç bölge olarak yarı saydam çizilir: `x^2 + y^2 <= 9` (daire), `x^2/9 + y^2/4 <= 1` (elips bölgesi), `x kare artı y kare küçük eşittir 25`. `<` kullanıldığında sınırın dahil olmadığı mesajda yazar; dış bölge (`>=`) istenirse nedeni açıklanarak reddedilir.
- Yarı-düzlem: `y >= 2x + 1` sınır doğrusunu çizer, mesaj hangi (üst/alt) bölgenin istendiğini söyler.
- Parametrik eğri: `x = 3cos(t), y = 3sin(t)` → çember, `x = 4cos(t); y = 2sin(θ)` → elips. Çember ya da eksenlere paralel elips olmayan eğriler açıklamayla reddedilir.

## Mimari

```
CommandPanel.tsx ──► executeTurkishCommand (turkishCommands.ts)
                        └─► runCommand (commands/engine.ts)
                              0. kullanıcı fonksiyonu tablosu sahneden kurulur (bitince geri yüklenir)
                              1. splitClauses(raw)           → işlemler
                              2. koordinattaki f(2) gibi değerler hesaplanır
                              3. parseClause(işlem, adlar)   → Clause (yer tutuculu metin)
                              4. rankHandlers(clause, sahne) → puana göre işleyiciler
                              5. handler.run(clause, CommandScene)   (skip() → sıradaki işleyici)
                              6. scene.resolve()             → canlı inşalar yeniden hesaplanır
                        ◄── { objects, selectedIds, message, actions, sceneChanged }
CommandPanel: sahne değiştiyse commit → AppAction'ları sırayla uygular → seçim, mesaj
```

### Çekirdek (değiştirilmeden kullanılır)

| Dosya | Görev |
| --- | --- |
| `src/math/commands/types.ts` | `CommandHandler { id, examples, match, run }`, `AppAction` birleşimi, `CommandResult`, puan bantları. |
| `src/math/commands/text.ts` | `fold()` (küçük harf, ı→i, aksanlar atılır), `parseClause()`: sayılar `#0`, koordinatlar `@0`, etiketler `$0` (ek bitişik: `$0nin`), tırnaklar `"0"`; fiil/ad sözlükleri (`VERB_PATTERNS`, `NOUNS`, `NEGATION`); `splitClauses()`. |
| `src/math/commands/scene.ts` | `CommandScene`: arama (`findPoint`, `pointsFromLabel`, `resolveLabel`, `targets()` Türkçe belirsizlik hatalarıyla), geometri (`lineOf`, `circleOf`, `bbox`), yerleşim (`placeShape`, `freeSpot`, `widgetSpot`), değişiklik (`add`, `update`, `remove` bağımlılarıyla), araçlarla birebir aynı nesne üreten fabrikalar (`addPoint` … `addMeasurement`), çıktı (`say`, `act`, `setFocus`), `fail()` / `skip()`. `objects` her değiştiğinde fonksiyon tablosu güncellenir. |
| `src/math/commands/engine.ts` | İşlemleri böler, her birini güncel sahneye göre ayrıştırır, en yüksek puanlı işleyiciyi çalıştırır, hepsi başarılıysa sonucu döndürür (ya hep ya hiç). |
| `src/math/commands/speechText.ts` | Konuşma metnini yazılı komut biçimine çevirir (harf adları, ekler, sayı sözcükleri, eşittir, koordinatlar, fonksiyon soruları). |
| `src/math/commands/speechChoice.ts` | Tarayıcının alternatif metinlerinden motorun anladığını seçer; yarım cümleyi tanır. |
| `src/math/commands/handlers/index.ts` | Aile kaydı (`HANDLERS`) ve yardım paneli için `COMMAND_CATALOG`. |
| `src/math/commands/catalog.ts` | Araç çubuğundaki 49 aracın ve 9 ek işlemin yazıyla karşılığı; `catalog.test.ts` her aracın listede olduğunu ve her örneğin çalıştığını denetler. |
| `src/math/functionNames.ts` | Fonksiyon adları (`functionNameOf`, `nextFunctionName`, `relabelFunction`), fonksiyon tablosu eşitleme, döngü ve tanımsız çağrı denetimi. |
| `src/math/parser.ts` | Güvenli ifade ayrıştırıcı; kullanıcı fonksiyonu çağrıları (`UserCall`, derinlik sınırı, ad kümesi değişince yeniden ayrıştırma). |
| `src/math/commandBindings.ts` | Canlı nokta inşalarını her commit ve sürüklemede çözer. |

### Puan bantları

| Bant | İşlem türü |
| --- | --- |
| 95–100 | Biçimsel sözdizimi: `f(x)=…`, `a = 2`, `A=(1;2)`, denklem/eşitsizlik/parametrik şekil |
| 85–94 | Uygulama/görünüm ve açık düzenleme fiilleri (sil, gizle, renk, taşı, adlandır, kopyala, `uzunluğunu … yap`) |
| 75–84 | Dönüşümler (yansıt, döndür, ötele, büyüt) |
| 65–74 | İnşalar (paralel, dik, orta dikme, açıortay, kesişim, teğet, yükseklik, kenarortay, merkezler, çevrel/iç teğet çember, orta nokta, oranda böl) |
| 55–64 | Ölçüm ve sorular (ölç, hesapla, kaç, göster, `f(5) kaç`, hesap makinesi) |
| 45–54 | Parametreli oluşturma (üçgen, kare, düzgün çokgen, çember, elips, yay, dilim, açı, kesir, yazı, kaydırıcı, düğme) |
| 35–44 | Genel oluşturma (nokta, doğru parçası, doğru, ışın, etiketlerden çokgen) |
| 5–15 | Araç açma yedeği (kalem, cetvel, görsel…) |

Bir işleyici başka ailenin cümlesine 0 döndürür; eşleşip derin incelemede cümlenin kendisine ait olmadığını anlarsa `skip()` ile motoru sıradaki işleyiciye yönlendirir. Kullanıcıya gösterilecek hata `fail('…')` ile verilir ve komutun tamamı geri alınır.

### Komut aileleri

| Aile (`handlers/<aile>.ts`) | Kapsam |
| --- | --- |
| `app` — Uygulama ve görünüm | Geri al / yinele (adım sayısıyla), tuvali temizle (onay penceresi), tümünü seç, araç açma (`kalemi aç`, `elips aracına geç`), pencereler, ızgara/eksen/koordinat/çeyrek bölge/ızgaraya yapıştır/siyah-beyaz (`ızgara olmasın` dahil), yakınlaştır/uzaklaştır, sığdır, görünümü sıfırla, sade/ayrıntılı görünüm, kareli/boş/dik koordinat düzlemi, genel stil, yardım; yalnızca görünüm işlerinden oluşan birleşik cümleler. |
| `basic` — Nokta ve doğrular | Koordinatlı/adlı/nesne üzerinde noktalar, birden çok nokta, `A = (1;2)` tanımla-ya-da-taşı, `x = 2, y = 3 olan nokta`; doğru parçası (uzunlukla), doğru (iki noktadan, yatay/dikey, eğimle, `x = 3`), ışın, sırayla birleştirme (`seçtiğim noktaları birleştir`), açı oluşturma. |
| `circles` — Çember ve eğriler | Çember (yarıçap/çap, merkez, geçtiği nokta, `AB çaplı`, üç noktadan), daire, elips, yay, daire dilimi, yarım/çeyrek daire, pergel ifadeleri (`pergelin ucunu A noktasına batır`). |
| `conics` — Denklem, eşitsizlik ve parametrik şekiller | Genel denklemden çember/elips, eşitsizlik bölgeleri (daire, elips bölgesi, yarı-düzlem sınırı), parametrik çember/elips. |
| `polygons` — Çokgenler | Üçgen (SSS, eşkenar, ikizkenar, dik, SAS, ASA, taban+yükseklik, koordinat, etiketlerden, `olsun` ile mevcut üçgeni değiştirme, `2 buçuk` kenarlar), kare, dikdörtgen, düzgün çokgen, paralelkenar, eşkenar dörtgen, yamuk, deltoid, genel çokgen, alan modeli. |
| `constructions` — İnşalar | Orta nokta, oranda bölme / eşit parçalar, dik doğru / dikme, paralel, orta dikme, açıortay, yükseklik (`dik indir`), kenarortay, ağırlık/diklik/çevrel/iç teğet merkezi, çevrel ve iç teğet çember, kesişim noktaları, teğet, üçgen kenarlarını kaydırıcıya bağlama/çözme. |
| `transforms` — Dönüşümler | Yansıma (doğru, eksenler, `y = x`, nokta), döndürme (nokta/koordinat/orijin etrafında, saat yönü), öteleme (vektör, koordinat, `eksi 3 2 vektörüyle`, `3 birim sağa`, fonksiyonlarla birlikte), homotete (merkez ve kat). Görüntüler canlıdır ve üslü adlanır (A → A′). |
| `measure` — Ölçüm ve sorular | Uzunluk, alan, çevre, kenar uzunlukları, köşe açıları, yay uzunluğu, yarıçap, kiriş, merkez açı, doğru denklemi, eğim, trigonometrik oranlar, iki nokta arası uzaklık, koordinat; `ABC'nin alanı kaç?` gibi soruların yanıtı mesajda; belirli ölçümü gizleme. |
| `edit` — Düzenleme | Silme (ad, tür, seçili, son çizilen), renk/dolgu/saydamlık/kalınlık (`içini doldur`), gizle/göster, ad göster/gizle, yeniden adlandırma (fonksiyon çağrılarıyla), yerinde taşıma, boyut değiştirme, kopyalama, seçme, noktayı nesneye kilitleme/çözme, iç/dış açı, yazı ve kesir içeriği. |
| `algebra` — Cebir ve etkileşim | Kaydırıcı (aralık, adım, değer, `a = 2`, `a = f(2)`, oynat/durdur), fonksiyonlar (`f(x)=…`, `y = 2x+1`, `x kare fonksiyonu`, birbirini çağıran fonksiyonlar), fonksiyon değeri ve hesap makinesi (`f(5) kaç`, `2^10 kaç`), yazı notları, kesir modelleri (daire/şerit), onay kutusu, düğme, girdi kutusu, görsel/kalem için araç açma, noktalara polinom uydurma. |

Aileler `handlers/index.ts` içindeki sırayla kaydedilir: `app, edit, transforms, constructions, measure, polygons, conics, circles, basic, algebra`. Eşit puanda bu sıra geçerlidir.

### Canlı inşalar

Orta nokta, dikme ayağı, teğet değme noktası, üçgen köşesi (kaydırıcı bağı), oran noktası, paralel/dik doğrultu, açıortay, kesişim, yansıma, döndürme, öteleme, homotete ve üçgen merkezleri **nokta inşası** olarak saklanır (`PointObject.construction`). Bu noktalar:

- kaynak noktalar sürüklendiğinde ya da kaydırıcı değiştiğinde `resolveCommandBindings` ile her commit/sürüklemede yeniden hesaplanır;
- elle sürüklenemez;
- kaynakları silinince silme zincirine katılır (`collectDependentIds`);
- sahneyle birlikte kaydedilir, yeniden açılışta korunur.

Geometrisi geçersiz hâle gelen değişiklik (ör. üçgen eşitsizliğini bozan kaydırıcı değeri) reddedilir; son geçerli çizim korunur.

### Çok işlemli cümleler

`splitClauses` şu kurallarla böler:

- Kesin ayraçlar: satır sonu, `;`, cümle sonu (`.`, `!`, `?`), `sonra`, `ardından`, `-ip` ulacı (`çizip`), `-dikten sonra`.
- `,` ve `ve`: iki taraf da fiil içeriyorsa ayrılır. Soldaki parça fiilsiz bir ad öbeğiyse fiil dağıtılır: `bir üçgen ve bir kare çiz` → iki işlem; iki sözcüklü adlar bütün kalır (`AB doğrusunu ve CD doğru parçasını çiz` → `AB doğrusunu çiz` + `CD doğru parçasını çiz`).
- Bağlaçsız art arda emirler (konuşma): `çember çiz kare çiz`, `ızgarayı gizle yakınlaştır`, `yakınlaştır lütfen ızgarayı gizle`, art arda atamalar `a = 1 b = 2`. Olumsuz fiille söylenmiş ayar da tam işlemdir: `ızgara olmasın ve üçgen çiz`.
- Fiil sayılanlar arasında `geç` (`kareli düzleme geç ve A noktası çiz`), `doldur` (`kare çiz ve içini doldur`), `batır` (pergel) vardır; `B noktasından geçsin`, `içi doldurulmuş kare` fiil değildir.
- Bölünmeyenler: `A ve B noktalarını birleştir`, `kenarları 3, 4 ve 5 olan üçgen`, `A'dan geçen ve BC'ye paralel doğru`, `A noktasından geçip BC doğrusuna paralel olan doğru`, `merkezi A noktası, yarıçapı 3 olan çember çiz`, `merkezi A olan çember çiz ve B noktasından da geçsin`, `x = 2, y = 3 olan nokta`, `AB = 3 BC = 4 AC = 5 üçgen çiz`, `üçgenin alanını hesaplayıp göster`, büyük harfli etiketler (`AC köşegenini çiz` — `AC` "aç" değildir). Parantez, köşeli parantez, `|…|` ve tırnak içindeki ayraçlar dikkate alınmaz.

Her işlem bir öncekinin sonucuna göre ayrıştırılır; yeni oluşan adlar sonraki işlemde kullanılabilir. Bir işlem başarısız olursa hiçbiri uygulanmaz ve mesaj kaçıncı işlemin neden başarısız olduğunu söyler. İşlem sonunda odak, oluşturulan şekillerdir (işleyici `setFocus` ile düzenlediği nesneleri bildirebilir); `alanını göster` gibi zamirli devam cümleleri bu odağı hedefler ve komut bitince seçim olur.

## Arayüz eylemleri (`AppAction`)

Motor sahneyi değiştirmeyen işleri eylem olarak döndürür; `CommandPanel` bunları sırayla uygular.

| Eylem | Panelde yapılan |
| --- | --- |
| `undo` / `redo` (`count`) | `undo()` / `redo()` en fazla geçmişte bulunan adım kadar çağrılır; adım yoksa ya da eksikse mesaj bunu söyler. |
| `clearAll` | `requestClearAll('2D')` — onay penceresi açılır. |
| `selectTool` | `onSelectTool(tool)` (araç çubuğundaki seçimle aynı). |
| `openDialog` | `function` / `slider` → ilgili pencere; `regularPolygon` / `circleRadius` → pencere görünüm merkezinde açılır. |
| `viewport` | `setViewport(p => ({...p, ...yama}))`; genişlik/yükseklik yok sayılır, zoom [5, 300] aralığına sınırlanır. |
| `zoom` | Görünüm merkezini koruyarak yakınlaştırma (`zoomViewport`). |
| `fitView` | Tuvaldeki “sığdır” düğmesiyle aynı hesap (`fitViewport`), komuttan sonraki sahneyle. |
| `resetView` | `resetViewport()` |
| `styleMode` | `geoeba:style-mode` olayı → Canvas açılır menüdeki seçimle aynı (`Sade`: koordinat ve ölçümler kapalı). |
| `planeType` | `geoeba:plane-type` olayı → Canvas düzlem menüsündeki seçimle aynı. |
| `styleSettings` | `setStyleSettings(p => ({...p, ...yama}))` |
| `playback` | `geoeba:slider-playback` olayı → Canvas oynatma döngüsü (`play`, `stop`, `toggle`). |
| `help` | Komut örnekleri paneli açılır; konu verilmişse arama kutusuna yazılır. |

Panel kuralları:

- Geçmişe yalnızca `sceneChanged` ise `Komut: <metin>` açıklamasıyla adım eklenir.
- Seçim `selectedIds` olur (geri al/yinele seçimi zaten temizler). Seçim aracına yalnızca sahne değiştiyse ya da komut yeni bir seçim yaptıysa ve araç açılmadıysa geçilir.
- Ölçümler (`showMeasurements` + `geoeba:show-measurements`) yalnızca sahne değiştiyse ve aynı komutta sade görünüm ya da ölçümleri gizleme istenmediyse zorla açılır.
- `Geri al` / `Yinele` sahneyi değiştiren bir işlemle aynı komutta yazılırsa hiçbir şey uygulanmaz ve ayrı yazılması istenir; motorun yeni sahnesi geri almadan önceki çizime göre hesaplandığından sonuç yanlış olurdu.
- Erişilebilirlik sözleşmesi korunur: giriş `role="combobox"`, `aria-label="Çizim komutu"`, başarıda kutu temizlenir, sonuç `role="status"`, öneriler `role="listbox"`/`role="option"`.

Saf yardımcılar `src/math/commands/viewActions.ts` içindedir: `zoomViewport`, `fitViewport`, `resetViewportTransform`, `viewportCenter`, `sanitizeViewportPatch`, `viewportAfterAction`, `shouldForceMeasurements`, `historyConflict`, `historySteps`. Canvas'taki üç olay dinleyicisi (`geoeba:style-mode`, `geoeba:plane-type`, `geoeba:slider-playback`) açılır menülerin ve oynat düğmesinin yaptığını aynen yapar.

## Öneriler ve anlam katmanı

### Sözcük araması (`src/math/commandSearch.ts`)

- Örnekler: `COMMAND_EXAMPLES`, ek temel örnekler ve `COMMAND_CATALOG` (ilk aramada, döngüsel içe aktarmaya karşı tembel kurulur), araç komutları ve geçmiş.
- Yazım düzeltme yalnızca güçlü kanıtla yapılır: 4–7 harfli sözcükte bir, 8+ harfte iki harf farkı (iki farkta ilk harf aynı olmalı), en yakın aday tek olmalı. 3 harf ve altı hiç düzeltilmez.
- Geçerli sözcükler düzeltilmez: sözlükteki sözcükler, sık geometri sözcükleri (`alan`, `olan`, `yay`, `yaz`, `araç`…), bunların çekimli (en çok 4 harf ek) ve yarım yazımları, bilinen fiil/ad kökleri, sahnedeki adlar, büyük harfli etiketler ve kesme işaretinden sonraki ekler.
- `yap` yalnızca şekil adından sonra `çiz` olarak önerilir (`kare yap` → `kare çiz`; `kırmızı yap` değişmez). `bir`, sayı bağlamında (`yarıçapı bir`, `bir birim`) atılmaz.
- Kullanıcının yazdığı sayıyı içermeyen örnek önerilmez; formül, çok satırlı ve olumsuz girişte öneri yoktur.

### Anlam modeli (`public/semantic/*`, `src/math/semanticCommands.ts`)

- `worker.js` yerel çok dilli cümle modelini (paraphrase-multilingual-MiniLM-L12-v2, q8) yükler. `intents.json` içindeki örnek cümlelerin gömmeleri DERLEME zamanında hesaplanır (`scripts/prepare-semantic.mjs` → `intents-embeddings.json`, parmak izi `niyet-ozeti.mjs`); worker açılışta yalnızca bu dosyayı okur, kullanıcı cümlesini gömer. Dosya eskiyse (intents.json değişmiş, betik çalışmamış) worker gömmeleri kendisi hesaplar; `semanticEmbeddings.test.ts` eskimeyi yakalar. Ölçüm (7 Ekim 2026, model önbellekte): hazır dosyayla ısınma 1,2 s, dosyasız 4,4 s. Model dosyaları tarayıcının Cache API'sinde saklanır, bir kez iner. İş parçacığı sayısı sayfa cross-origin isolated ise (COOP/COEP) otomatik artar; GitHub Pages'te 1'dir. Ağ bağlantısı gerekmez.
- `intents.json`: 45 niyet, her birinde 3–4 farklı Türkçe ifade.
- `SEMANTIC_ANCHORS`: ayırt edici terimler özelden genele sıralıdır (ör. `çevrel` → çevrel çember, `çevre`'den önce). İlk eşleşen niyet +0,25, diğerleri −0,15 alır. Her niyetin bir deseni vardır ve hiçbir eğitim cümlesi başka bir niyete bağlanmaz (testle denetlenir).
- `interpretSemanticMatch` yalnızca motorun anladığı kanonik bir cümle üretir. Parametreler modelden tahmin edilmez: ad, sayı, koordinat, renk ve tırnak içi yazı cümleden, eksik hedef seçimden ya da sahnedeki tek adaydan alınır; eksik bilgi için açıklama istenir.
- Öneriler kullanıcı seçip tekrar Enter'a basmadan çalıştırılmaz.

## Güvenilirlik davranışı

- Dış servis, dil modeli, API anahtarı veya ağ bağlantısı gerekmez (tarayıcının çevrimiçi ses tanıması isteğe bağlıdır).
- Komut önce sahnenin kopyası üzerinde çalışır; herhangi bir işlem başarısız olursa çizim değişmez.
- Belirsiz hedefte (`Birden fazla üçgen var…`) nasıl düzeltileceği örnekle söylenir; sessiz tahmin yapılmaz.
- Olumsuz cümleler (`üçgen çizme`, `üçgen istemiyorum`, `içini doldurma`, `kareli düzleme geçme`) işlem olarak uygulanmaz; yalnızca görünüm/seçim ayarları (`ızgara olmasın`) istek sayılır, etiketli ya da seçime bağlı olanlar (`A noktasının koordinatları olmasın`) yine olumsuzdur.
- Başarılı komut tek geçmiş adımıdır; Ctrl+Z tüm komutu (çok işlemli olsa bile) geri alır.
- Yazıyla oluşturulan nesneler araçla çizilenlerle aynı alanlara, renklere ve etiketlere sahiptir.
- Deneme çalıştırmaları (ses seçimi) ekrandaki fonksiyon tablosunu değiştirmez.

## Yeni komut ekleme

1. İşi hangi ailenin yapacağına puan bantlarına göre karar verin; başka ailenin cümlesinde `match()` 0 döndürmeli.
2. `clause.text` üzerindeki yer tutucularla (`$0`, `#0`, `@0`) ve katlanmış sözcüklerle eşleyin; hedefi `scene.targets()` ile bulun.
3. Nesneyi `CommandScene` fabrikalarıyla oluşturun, düzenlemede `scene.update/remove` kullanın ve `setFocus` çağırın. Fonksiyon oluşturan ya da etiketini değiştiren her yer `nextFunctionName` / `relabelFunction` kullanmalıdır, düz `f(x) = …` etiketi yazılmaz.
4. Mesajı `scene.say()` ile kısa Türkçe cümleyle, hatayı `fail()` ile örnekli yazın.
5. `examples` listesine 6–20 gerçekçi örnek ekleyin ve her birini test edin; araç çubuğunda karşılığı varsa `catalog.ts`'e ekleyin.
6. Anlam katmanında karşılığı olmalıysa `intents.json`'a ifadeler, `SEMANTIC_ANCHORS`'a desen ve `interpretSemanticMatch`'e kanonik cümle ekleyin.

## Komut örnekleri

Aşağıdaki örnekler `handlers/*.ts` dosyalarındaki gerçek `examples` listelerinden seçildi (yardım panelindeki `COMMAND_CATALOG`). Toplam: 10 aile, 98 işleyici, 655 örnek komut; her örnek kendi aile testinde çalıştırılır.

| Aile (örnek sayısı) | Örnek komutlar |
| --- | --- |
| Uygulama ve görünüm (100) | `geri al`, `2 adım geri al`, `yinele`, `tuvali temizle`, `tümünü seç`, `kalemi aç`, `Fonksiyon penceresini aç`, `ızgarayı gizle`, `ızgara olmasın`, `2 kat yakınlaştır`, `hepsini ekrana sığdır`, `görünümü sıfırla`, `sade görünüme geç`, `kareli düzleme geç`, `yazıları büyüt`, `neler yapabilirsin?` |
| Düzenleme (83) | `AB'nin uzunluğunu 5 yap`, `çemberin yarıçapını 4 yap`, `A noktasının adını P yap`, `A, B ve C noktalarını sil`, `son çizileni sil`, `C noktasını AB doğrusuna kilitle`, `ABC'yi kırmızı yap`, `ABC'nin içini sarıya boya`, `A'yı (3;4)'e taşı`, `ABC üçgenini 5 birim sağa kopyala`, `yarı saydam yap` |
| Dönüşümler (42) | `ABC üçgenini x eksenine göre yansıt`, `ABC üçgenini y = x doğrusuna göre yansıt`, `ABC üçgenini A etrafında 90 derece döndür`, `[AB]'yi saat yönünde 45° döndür`, `ABC'yi (3, 2) vektörüyle ötele`, `ABC'yi 3 birim sağa 2 birim yukarı ötele`, `ABC'yi A merkezli 2 kat büyüt` |
| İnşalar (75) | `AB orta noktasını oluştur`, `AB'yi 2:1 oranında böl`, `AB'nin orta dikmesini çiz`, `ABC açısının açıortayını çiz`, `C noktasından dik indir`, `A noktasından geçen ve BC doğrusuna paralel doğru çiz`, `AB ve CD doğrularının kesişim noktasını bul`, `ABC'nin çevrel çemberini çiz`, `P noktasından çembere teğet doğru çiz`, `Üçgen uzunluklarını kaydırıcıya bağla` |
| Ölçme (50) | `ABC'nin alanı kaç?`, `ABC üçgeninin alanını ve çevresini hesapla`, `Üçgenin tüm açılarını göster`, `A ile B arasındaki mesafeyi ölç`, `AB doğrusunun denklemini göster`, `B açısının sinüsünü hesapla`, `A'nın koordinatları nedir` |
| Çokgenler (58) | `Kenarları 3, 4 ve 5 olan üçgen çiz`, `3 4 5 üçgeni olsun`, `Kenarı 6 olan eşkenar üçgen çiz`, `İki kenarı 5 ve 7, arasındaki açı 60 derece olan üçgen çiz`, `Alanı 16 olan kare çiz`, `Düzgün altıgen çiz`, `Tabanları 6 ve 4, yüksekliği 3 olan yamuk çiz`, `A, B, C ve D noktalarından dörtgen oluştur` |
| Denklem, eşitsizlik ve parametrik şekiller (11) | `x^2 + y^2 - 2x + 4y - 4 = 0`, `x^2 + y^2 <= 9`, `x² + y² < 16 bölgesini çiz`, `x^2/9 + y^2/4 <= 1`, `y >= 2x + 1`, `x = 3cos(t), y = 3sin(t)` |
| Çember, elips ve yaylar (47) | `Yarıçapı 3 olan çember çiz`, `AB çaplı çember çiz`, `A, B ve C noktalarından geçen çember çiz`, `(x-1)^2 + (y-2)^2 = 9`, `Pergelle A merkezli 3 birim açıklıkla çember çiz`, `Yarıçapları 4 ve 2 olan elips çiz`, `60 derecelik daire dilimi çiz`, `Yarım daire çiz` |
| Nokta ve doğrular (71) | `A = (1; 2)`, `A(0,0), B(4,0) ve C(2,3) noktalarını oluştur`, `x = 2, y = 3 olan nokta`, `AB doğru parçası üzerinde bir nokta al`, `uzunluğu 7 cm olan doğru parçası çiz`, `A'dan geçen yatay doğru`, `eğimi 2 olan ve A'dan geçen doğru`, `60 derecelik açı çiz` |
| Cebir ve etkileşim (118) | `f(x) = 2x + 1`, `x kare fonksiyonunu çiz`, `y eşittir 2x artı 1`, `f(5) kaç`, `f'nin 4'teki değeri nedir`, `2^10 kaç`, `a = 2`, `a'yı 3 yap`, `a kaydırıcısının aralığını -10 ile 10 yap`, `a'yı oynat`, `"Merhaba" yazısı ekle`, `3/4 kesir modeli`, `ABC için onay kutusu ekle`, `a için girdi kutusu ekle`, `A, B ve C noktalarına ikinci dereceden polinom uydur` |

Çok işlemli örnekler: `kenarları 3, 4 ve 5 olan üçgen çiz ve alanını göster`, `A(0; 0), B(4; 0) noktalarını oluştur, AB doğru parçası çiz`, `üçgen çizip çevrel çemberini çiz`, `bir üçgen ve bir kare çiz`, `f(x) = x^2 + 1 ve g(x) = f(x) - 2`, `ızgarayı gizle yakınlaştır`.

## Doğrulama

Durum: 2026-09-14.

- **Birim ve motor testleri:** `npx vitest run` → 54 dosya, **4399/4399 başarılı**. Bunlar arasında: her aile için örnek ve ifade testleri (`<aile>.test.ts`, `<aile>.phrases.test.ts`), `catalog.test.ts` (araç çubuğundaki her aracın örnekleri gerçek motorda), `splitter.test.ts` ve `core.sweep2.test.ts` / `core.parse2.test.ts` (bölme ve ayrıştırma kuralları), `speechText.test.ts` ve `speechChoice.test.ts` (konuşma), `conics.test.ts`, `functionRefs.test.ts` ve `src/math/__tests__/userFunctions.test.ts` (fonksiyon adları ve çağrılar).
- **TypeScript:** `npx tsc --noEmit --incremental false` hatasız.
- **Tarayıcı (Edge, http://localhost:3005):**
  - `artifacts/verify-commands.cjs` — kullanıcı örnekleri, hatalı işlemin geri alınması, geri al, teğet açıklaması, yeniden yükleme, canlı kaydırıcı bağı: başarılı.
  - `artifacts/verify-function-names.cjs` — f, g, h, p, q adları; `f(3) kaç`; `a = h(2)`; cebir girişinde `k = f(4)`, `q(x) = h(x) - 3`; döngü ve tanımsız çağrı uyarıları; f'yi yeniden tanımlama: başarılı (`artifacts/function-names.png`).
  - `artifacts/verify-command-search.cjs` — öneriler, klavye seçimi, olumsuz cümle: başarılı.
  - `artifacts/verify-semantic-ui.cjs` — anlam modeli dış bağlantılar kapalıyken: başarılı.
- **Gerçekçi ifade taramaları:** aile başına 230–352 ifade (yazılı ve sesli, toplam yaklaşık 2550) denendi; ardından çekirdek düzeltmeleri (bölme, ayrıştırma, konuşma) üç bağımsız doğrulayıcı tarafından yaklaşık 1030 yeni ifadeyle zorlandı. Bulunan 59 sorunun büyük bölümü onarıldı ve kalıcı testlere eklendi; 3'ü yanlış beklenti olarak reddedildi, kalanlar aşağıda.

## Sınırlar

- 3D stüdyoda yazılı komut yoktur.
- Görsel yükleme ve serbest kalem çizimi yazıyla yapılamaz; komut ilgili aracı açar.
- Anlam modeli yalnızca işlem türünü önerir; asıl yorum her zaman kural tabanlı motordadır.
- Etiket yerleşimi otomatik çakışma çözmez; kalabalık sahnelerde görünüm ayarlanabilir.
- Fonksiyonlar: f silinince ona bağlı g silinmez, grafiği çizilmez. Eski projelerde aynı adlı birden çok fonksiyon varsa çağrı ilkini kullanır. `(2, f(2))` noktası o anki değerle oluşur, f değişince güncellenmez. `f yi 2 birim ötele` yön ister.
- Denklem/eşitsizlik: dış bölge (`x^2 + y^2 >= 9`) ve yarı-düzlemin kendisi boyanmaz; parametrik eğrilerden yalnızca çember ve eksenlere paralel elips çizilir.
- Henüz anlaşılmayan ifadeler:
  - `(2;3) e yansıt` (`göre` olmadan yansıtma), `ABC'yi DE boyunca ötele` (`vektör` sözcüğü olmadan), `(-3, 2) vektörüyle ABC yi ötele` (vektör şekilden önce), küçük harfli `ABC'yi de vektörü boyunca ötele`;
  - `ABC yi eksi üç iki vektörüyle ötele` (parantezsiz çiftte yazıyla sayı), `B noktasını (2,3)'e ve C noktasını (4,5)'e taşı` (`taşı` iki kez yazılmalı);
  - `seçili/seçtiğim noktalardan geçen doğru çiz`, `hangi nokta A noktasına en yakın`;
  - sesli `a yı sıfır sıfır ı merkez alarak döndür`, `ef parantez beşi hesapla`, `ef in onbeşteki değeri`;
  - sahnedeki noktaların harflerinden oluşan kısa sözcükler (`ben`, `bak`) etiket sanılabilir.

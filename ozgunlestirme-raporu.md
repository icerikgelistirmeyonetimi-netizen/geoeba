# Kodun özgünleştirilmesi: kapsam, yöntem ve ilerleme

Tarih: 25 Ekim 2026. Durum: ilk adımlar çalışma ağacında, **commit edilmedi**. Önceki iş `732ed31` ile commit edildi.

## Amaç

Sistemin ilk kodlarının bir yerden alınmış olabileceği kuşkusu var. Bu yüzden ilk sürümden kalan kod yeniden
yazılıyor.

Şartlar:

- **Hiçbir işlev eksilmeyecek.**
- **Tasarım değişmeyecek.** Yalnız JS/TS mantığı yeniden yazılır; CSS, sınıf adları, yerleşim ve görünüş aynı kalır.

## 1. Kaynak taraması

- **Lisans ya da telif satırı yok.**
- **Dış bağlantılar meşru veri kaynakları:** MGM, WHO, MEB ve Wikimedia. Bir kod deposuna, forum yanıtına ya da
  kütüphaneye işaret eden bağlantı yok.
- **Kod içinde "GeoGebra" geçen yerler** özellik adları (örneğin "GeoGebra Show Trace"). Bunlar kopyalama kanıtı değil.

## 2. İlk sürümden kalan kodun ölçüsü (`git blame`, 25 Ekim)

İlk dört commit dahil 73 commit Berru'ya ait. Bugünkü kodun yalnızca **%11,2'si** (167.828 satırın 18.734'ü) hâlâ
Berru'nun yazdığı hâliyle duruyor; geri kalanı sonradan yeniden yazılmış ya da eklenmiş.

Bu 18.734 satırın yaklaşık 7.100'ü **müfredat verisi**: MEB kazanım metinleri (`curriculum/ilkokulData.ts`,
`ortaokulData.ts`, `liseData.ts`). Bunlar kod değil, kamuya açık program içeriği. Özgünleştirilecek gerçek kod yaklaşık
**11.600 satır** ve belirli dosyalarda toplanıyor:

| Dosya | Berru'dan kalan satır | Dosyadaki payı |
|---|---|---|
| `components/workspace/Canvas.tsx` | 1.822 → **527** (sürüyor) | %21 → %8 |
| `components/workspace/WorkspaceMenuBar.tsx` | 1.193 | %60 (diğer oturum bu dosyada çalışıyor) |
| `components/workspace/PropertiesPanel.tsx` | 1.145 | %78 |
| `components/workspace/Toolbar.tsx` | 979 | %53 |
| `math/geometry3d.ts` | 643 | %48 |
| `math/solidProjection2D.ts` | 556 | %93 |
| `components/workspace/AlgebraView.tsx` | 528 | %82 |
| `components/workspace/WorkspaceView.tsx` | 483 | %46 |
| `state/WorkspaceContext.tsx` | 460 | %10 |
| `state/CurriculumContext.tsx` | 382 | %52 |
| `math/commands/handlers/algebra/scripting.ts` | 291 | %100 |
| `components/workspace/Canvas3D.tsx` | 279 | %6 |
| `math/pathAnimation.ts` | 278 | %100 |
| `components/workspace/ViewCube3D.tsx` | 248 | %92 |
| `math/geometry.ts` | 248 | %30 |
| diğerleri (Toolbar3D, Header, StylePanel, SliderDialog, AddObjectModal, coordinates…) | ~1.000 | |

## 3. Yöntem

1. **Davranış önce kilitlenir.**
   - Etkileşim akışları önceki işteki anlık görüntü testleriyle kilitli.
   - Çizim çıktısı yeni **altın kayıtla** kilitli: `tuvalCizimKaydi.test.ts`, 23 sahne.
     - Kademeler, ızgara biçimleri, görünüm ve stil seçenekleri, araçlar.
     - Her sahnenin SVG öğe ağacı birebir kaydedilir: etiketler, sınıflar, koordinatlar, yazılar, alt bileşenlerin
       özellikleri ve olay işleyicilerinin varlığı.
     - Kayıt, değişiklikten önceki koda göre alındı.
2. **Bölge bölge yeniden yazılır.** Ayıklanan katmanlar JSX döndüren çizim işlevleri olur; ayrı bileşen olsalardı öğe
   ağacına yeni bir tür girerdi. Böylece çıktı birebir aynı kalır ve kayıt bunu kanıtlar.
3. **Efektler ve olay işleyicileri** altın kayıtla görülemez. Bunlar test edilebilir saf işlevlere ayrılır, davranışları
   yeni birim testleriyle sabitlenir. Etkileşim akışları da yeni karakterizasyon testleriyle (fare bırakma, sağ tık
   menüsü, düğmeler) değişiklikten önce kaydedilir.
4. **Gerektiğinde fark testi.** Eski işlevin kopyası geçici bir testte yenisiyle rastgele girdilerde karşılaştırılır
   (kutuyla seçim: 20.000 durum, hepsi aynı); test sonra silinir.
5. **Her adımdan sonra** `tsc` ve tam test takımı temiz olmalı.

## 4. İlerleme

### Altın kayıt ve yeni karakterizasyon testleri

| Test | Kilitlediği şey |
|---|---|
| `tuvalCizimKaydi.test.ts` (50 sahne) | Tuvalin SVG öğe ağacı; React `key` değerleri de kaydedilir. Sahneler: kademeler, ızgaralar, stil ve görünüm seçenekleri, kalem / kesir / not / görsel, doğrusal nesneler, 3B cisim üstten görünümü ve 22 etkileşim önizlemesi (kalem, kutuyla seçim, sürükleyerek oluşturma, pergelin üç aşaması, tıkla-tıkla araçları, ölçme). |
| `fareBirakma.test.ts` | Kalemle çizip bırakma, kutuyla seçimin sonucu, not penceresinin kaydet / vazgeç / düzenle / sil yolları, 3B cisim sürükleme |
| `sagTikMenusu.test.ts` | 18 hedefte sağ tık menüsünün maddeleri (sıra, ayırıcı, işaret, alt menü), canlandırma maddeleri |
| `tuvalDugmeleri.test.ts` | Tuval düğmelerinin eylemleri (canlandır, değer ver, göster / gizle, izleri temizle) ve oynatma durumu |
| Birim testleri | `izKaydi`, `pergelVeKapsam`, `kutuSecimi`, `serbestDondurme`, `tiklamaSecimi` |

### Yeniden yazılan bölgeler (Canvas.tsx)

| Bölge | Yeni yeri |
|---|---|
| Zemin: ızgaralar, bölge rozetleri, eksenler | `katmanlar/izgaraVeEksenler.tsx` |
| İz ve nokta katmanları | `katmanlar/noktalarVeIzler.tsx` |
| Kalem, kesir modelleri (pasta, çubuk, sayı doğrusu), notlar, görseller | `katmanlar/serbestNesneler.tsx` |
| Canlı önizlemeler: pergel, sürükleyerek oluşturma, tıkla-tıkla, ölçme, kutuyla seçim | `katmanlar/onizlemeler.tsx` |
| Doğru parçası / doğru / ışın katmanı (üç ayrı kopya tek yola indi) | `katmanlar/dogrusalNesneler.ts`, `katmanlar/ekranGeometrisi.ts` ve Canvas içi etiket işlevleri |
| Çokgen katmanı (kenar yazıları, alan / çevre kartları) | Canvas içi `kenarUzunluguEtiketi`, `cokgenKarti` |
| 3B cisim üstten görünümü | `katmanlar/cisimUstGorunumu.tsx` |
| Fonksiyon katmanı, zemin | Canvas içinde yeniden yazıldı |
| İz kaydı efekti, oynatma olayları | `izKaydi.ts` (`useIzKaydi`, saf işlevler) |
| Fare hareketi / basma / bırakma (tek büyük işleyici adlandırılmış adımlara bölündü) | Canvas içi `kutuSeciminiIlerlet`, `cismiSurukle`, `nesneleriSurukle`, `gorunumuKaydir`, `kalemiBitir`, `surukleyerekOlusturmayiBitir`, `nesneSuruklemesiniBitir`… |
| Pergelin imleçle ilerlemesi | `pergel.ts` (`pergelIlerlet`, `PergelDurumu`) |
| Kutuyla seçimde kutuya düşme | `kutuSecimi.ts` |
| Serbest döndürme kolu | `serbestDondurme.ts` ve Canvas `handleStartRotateShape` |
| Yansıtma ekseni, Seç-Taşı basışı, cisim basışı | Canvas içi `yansit`, `nesneSuruklemesineBasla`, `clickSelection` |
| Not penceresi (kaydet / vazgeç / sil), düğme eylemleri, sağ tık menüsünün canlandırma / iz maddeleri | Canvas içi `notuKaydet`, `dugmeyiCalistir`… |
| Pencere boyu, tekerlekle yakınlaştırma, Delete tuşu, sürgü kapsamı, etkileşim durum türleri | Canvas içinde; `surguKapsami.ts`, `tuvalEtkilesimi.ts` |
| Kullanılmayan 20+ içe aktarma ve ölü yerel değer | Silindi |

### Sonuç

- Canvas.tsx: 8.687 → **6.703** satır. Berru'dan kalan satır: 1.822 → **527**; kalanlar dağınık tek satırlar
  (kapanış ayraçları, içe aktarma adları, prop listeleri).
- Çizim kaydı her adımda birebir aynı kaldı.
- `tsc` temiz; vitest **260 dosya / 9.770 test** yeşil.
- Tarayıcıda doğrulandı (lise oturumu):
  - çokgen ve alan kartı, fonksiyon ve etiketi, not;
  - İzi Göster ile iz kaydı ve iz temizleme;
  - tekerlekle yakınlaştırma, kutuyla seçim, nokta sürükleme;
  - not düzenleme penceresi.
  - Konsolda hata yok.
- Tasarım değişmedi: CSS ve sınıf adlarına dokunulmadı. Kaynak metni arayan üç test, yeni adlara göre güncellendi;
  davranışları artık gerçek testlerle de sınanıyor.

## 5. Sıradaki adımlar

1. **Tamamı ilk sürümden kalan `math/` dosyaları:** `pathAnimation.ts`, `scripting.ts`, `solidProjection2D.ts`. Bunlar
   saf işlev oldukları için birim testleriyle kilitlenip yeniden yazılabilir.
2. **İlk sürümün ağırlıklı olduğu bileşenler:** PropertiesPanel, Toolbar, AlgebraView, WorkspaceView, CurriculumContext,
   ViewCube3D.
3. **Kalan dosyalar:** `geometry3d`, `geometry`, `coordinates`, Canvas'ta kalan tek satırlar.
4. **WorkspaceMenuBar:** diğer oturumun değişiklikleri commit edildikten sonra.

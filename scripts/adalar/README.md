# Matematik Takımadaları — 3B giriş ekranı varlıkları

`public/adalar/` altındaki modeller, deniz dokuları ve sahne verisi bu klasördeki
`web_aktar.py` betiğiyle Blender sahnelerinden üretilir. Uygulamadaki bileşenler:

- `src/components/adalar/AdaEkrani.tsx` — giriş ekranı (ana sayfa ve kademe adaları)
- `src/components/adalar/adaSahnesi.ts` — Three.js sahne motoru
- `src/components/adalar/adaEslemeleri.ts` — kademe/sınıf eşlemeleri (Hazırlık = `hazirlik` ↔ 0)

Akış: ana sayfa → adaya tıkla (`selectLevel`) → kademe adası → sınıf binası (`selectGrade`)
→ ünite listesi (TeachingPortal). Matematik Atölyesi → Serbest Çizim Stüdyosu (`startFreeSandbox`).

Ana sayfanın kaynağı `matematik-atolye-adasi/takimadalar-atolye.blend`: ilkokul adası matematik
parkı (`matematik-cocuk-parki/`), eski deniz fenerinin yerinde ise ATOLYE_ADASI kökündeki
Matematik Atölyesi durur. Atölye sahnenin içinde hazır gelir (dışa aktarımda başka .blend
eklenmez), `landmark:atolye` grubuna girer ve tabelası "ATÖLYE"dir; fener ışığı/huzmesi yoktur.
Tabela yazıları `data/ana-sayfa.json` içinde her grubun `tabela` alanına yazılır.

Atölyenin dönen aletleri (pergel ve iletki ibresi) ayrı gruplara çıkar: `arac:pergel`,
`arac:ibre`. Her biri `pivot` (dünya, three uzayı), `axis` (birim dönme ekseni),
`owner` (`"landmark:atolye"`) ve `motion` (`"tur"` | `"salinim"`) taşır; salınanlarda
ayrıca `restAngle` (modeldeki duruş açısı) bulunur ve motor salınım genliğini bu açıya
göre kısar, böylece ibre iletkinin 0–180 bandı dışına taşmaz. `owner`
kutusu bu parçaların kutusuyla birleştirilir. Hareketin zamanlaması/genliği JSON'da
DEĞİL, `src/components/adalar/adaSahnesi.ts` sabitlerindedir. Model/JSON elle düzenlenmez.

Adaların hareketli parçaları da (`PARCA_TANIMLARI`, her sayfada; sahibi nesnenin adası ya da
sınıf binası) aynı yolla ayrılır ve **yalnız sahibinin üzerine gelince** oynar, sürekli döngü yoktur
(kullanıcı isteği, 2026-09-24):

- `arac:saat-akrep`, `arac:saat-yelkovan`, `arac:saat-saniye` (`motion: "saat"`, `hand`,
  `restAngle` = 12'den saat yönünde duruş açısı): ilkokul parkının saati dururken modeldeki 10:00'ı,
  üzerindeyken cihazın saatini gösterir; saniye ibresi tikler. Saniye ibresi kaynakta yoktur,
  dışa aktarımda yelkovandan türetilir (`saniye_ibresi_ekle`); yelkovan ve saniye kadrandan öne
  alınır (`one`) ki dönerken ibreler iç içe geçmesin.
- `arac:kubbe` (`shadow: true`, kabuk + teleskop) ve `arac:kubbe-kaburga` (kaburgalar, yarık
  kenarları; gölge vermez): lise gözlemevinin kubbesi düşey eksende bir kez iki yana tarar.
- `arac:piramit` (cam yüzler, kaburgalar, çıtalar, tepe; menteşe arka taban kenarı, eksen −X) ve
  `arac:roket` (`rise`): ortaokul piramidi geriye yatar, zeminin altındaki roket yükselir, fırlar,
  piramit kapanır. Roket kaynakta yoktur; `roket.py` dışa aktarımda adanın kendi malzemeleriyle kurar
  (girişin solunda, kapak 45° açıkken yolu serbest kalan şerit). Alev ve duman `roketFirlatma.ts`
  içinde sprite'tır.

## Modelleri yeniden üretme (Blender 4.4)

Kaynak sahneler depoda tutulmaz; `matematik-atolye-adasi/takimadalar-atolye.blend`,
`matematik-cocuk-parki/ilkokul-matematik-parki.blend` ve `matematik-kademe-sayfalari/*.blend`
dosyaları proje kökünde bulunmalıdır. İlkokul adası sayfası da matematik parkı sürümünü
kullanır (dört sınıf erişim kökü — ERISIM_01…04 — korunur). Ana sayfa sahnesi
`matematik-atolye-adasi/takimadalar_birlestir.py` ile (park + atölye birleştirmesi) üretilir;
web'e aktarım aşağıdaki komutla yapılır. Bağımsız atölye modelini (`atolye` sayfası) üreten
`matematik-atolye-adasi/atolye_web_aktar.py` ayrı bir kopyadır, `public/adalar` için kullanılmaz.

```bash
blender -b matematik-atolye-adasi/takimadalar-atolye.blend --python scripts/adalar/web_aktar.py -- public/adalar ana-sayfa
blender -b matematik-cocuk-parki/ilkokul-matematik-parki.blend --python scripts/adalar/web_aktar.py -- public/adalar ilkokul
blender -b matematik-kademe-sayfalari/ortaokul-ada.blend --python scripts/adalar/web_aktar.py -- public/adalar ortaokul
blender -b matematik-kademe-sayfalari/lise-ada.blend --python scripts/adalar/web_aktar.py -- public/adalar lise
```

Draco çözücüsü `public/adalar/draco/` altındadır (`node_modules/three/examples/jsm/libs/draco/gltf/`
kopyası, three 0.170). three sürümü yükseltilirse bu dosyalar da yenilenmelidir.

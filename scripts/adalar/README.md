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

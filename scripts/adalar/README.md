# Matematik Takımadaları — 3B giriş ekranı varlıkları

`public/adalar/` altındaki modeller, deniz dokuları ve sahne verisi bu klasördeki
`web_aktar.py` betiğiyle Blender sahnelerinden üretilir. Uygulamadaki bileşenler:

- `src/components/adalar/AdaEkrani.tsx` — giriş ekranı (ana sayfa ve kademe adaları)
- `src/components/adalar/adaSahnesi.ts` — Three.js sahne motoru
- `src/components/adalar/adaEslemeleri.ts` — kademe/sınıf eşlemeleri (Hazırlık = `hazirlik` ↔ 0)

Akış: ana sayfa → adaya tıkla (`selectLevel`) → kademe adası → sınıf binası (`selectGrade`)
→ ünite listesi (TeachingPortal). Matematik Feneri → Serbest Çizim Stüdyosu (`startFreeSandbox`).

## Modelleri yeniden üretme (Blender 4.4)

Kaynak sahneler depoda tutulmaz; `matematik-kademe-sayfalari/*.blend` ve
`deniz-feneri/deniz-feneri.blend` dosyaları proje kökünde bulunmalıdır.

```bash
blender -b matematik-kademe-sayfalari/ana-sayfa.blend --python scripts/adalar/web_aktar.py -- public/adalar ana-sayfa
blender -b matematik-kademe-sayfalari/ilkokul-ada.blend --python scripts/adalar/web_aktar.py -- public/adalar ilkokul
blender -b matematik-kademe-sayfalari/ortaokul-ada.blend --python scripts/adalar/web_aktar.py -- public/adalar ortaokul
blender -b matematik-kademe-sayfalari/lise-ada.blend --python scripts/adalar/web_aktar.py -- public/adalar lise
```

Draco çözücüsü `public/adalar/draco/` altındadır (`node_modules/three/examples/jsm/libs/draco/gltf/`
kopyası, three 0.170). three sürümü yükseltilirse bu dosyalar da yenilenmelidir.

/**
 * Yardım > Kullanım Kılavuzu metinleri (alan uzmanı, atölye inceleme 4. tur, ortaokul: "Kılavuz yalnızca 3 kısa madde
 * içeriyor; araç gruplarını, dosya kaydetme / dışa aktarmayı, kademe seçimini ve Yazarak Oluştur'u anlatmıyor;
 * 'Sol menü' maddesi Görünümler sekmesini saymıyor").
 *
 * Araç grupları seçili kademenin PANELİNDEN üretilir (gruplariSuz): kılavuz yalnız panelde gerçekten bulunan grupları ve
 * araç adlarını sayar, örnekler de o kademede bulunan bir araçla verilir. İlkokulda kılavuz eski üç maddedir (ilkokul
 * kipinde kısayol harfi ve koordinat gösterilmez; ilkokulKipi.ts) — yalnız "Sol menü" maddesi düzeltildi.
 */
import type { KademeDuzeyi } from './kademeDuzeyleri';
import { ARAC_SECIMI_SUZULEN_KADEMELER, aracGorunurMu, gruplariSuz, kademeEtiketi } from './kademeDuzeyleri';
import { TREE_TOOL_GROUPS } from './treeToolDefinitions';
import { GORUNUM_DUZENLERI } from './gorunumDuzenleri';
import { TOOL_SHORTCUTS } from './toolShortcuts';

export interface KilavuzBolumu {
  baslik: string;
  /** Paragraflar */
  metin: string[];
  /** Madde listesi (varsa) */
  maddeler?: string[];
}

/** Grup başına örnek: ilk bulunan aracın örneği kullanılır (kademede olmayan araçla örnek verilmez). */
const GRUP_ORNEKLERI: Record<string, readonly (readonly [string, string])[]> = {
  temel_cizim: [
    ['segment', 'Doğru Parçası aracıyla iki noktaya dokunun; aralarına doğru parçası çizilir.'],
    ['point', 'Nokta aracıyla tuvale dokunun; A noktası oluşur.'],
  ],
  duzenleme: [['select', 'Seç ve Taşı ile bir köşeyi sürükleyin; şekil de birlikte değişir.']],
  olcme: [
    ['measure_angle', 'Açıölçeri açının köşesine yerleştirin, kolunu çevirerek açıyı okuyun.'],
    ['measure_distance', 'Uzunluk Ölç ile iki noktaya dokunun; aradaki uzunluk yazılır.'],
  ],
  cember: [
    ['circle_radius', 'Yarıçapla Çember ile merkeze dokunun, yarıçapa 3 yazın.'],
    ['arc', 'Yay aracıyla merkeze, sonra yayın başına ve sonuna dokunun.'],
  ],
  cokgen: [
    ['regular_polygon', 'Düzgün Çokgen ile kenar sayısına 6 yazın; düzgün altıgen çizilir.'],
    ['polygon', 'Çokgen ile köşelere sırayla dokunun, ilk köşeye dönünce şekil kapanır.'],
  ],
  cebir_fonksiyon: [['function', 'Fonksiyon penceresine 2x + 1 yazın; doğrusal fonksiyonun grafiği çizilir.']],
  insa: [
    ['perp_bisector', 'Orta Dikme ile bir doğru parçasının iki ucuna dokunun; orta dikme çizilir.'],
    ['midpoint', 'Orta Nokta ile iki noktaya dokunun; aralarındaki orta nokta oluşur.'],
  ],
  donusum: [
    ['reflect', 'Yansıt ile şekli seçin, sonra x eksenine dokunun; şeklin yansıması çizilir.'],
    ['translate', 'Öteleme ile şekli seçin, sonra vektörün başına ve sonuna dokunun.'],
    ['rotate', 'Şekli Döndür ile şekli seçin, merkeze dokunup açıyı yazın.'],
  ],
  etkilesim: [['input_box', 'Girdi Kutusu ile tuvale bir değer kutusu ekleyin; yazılan sayı çizime bağlanır.']],
  kesir_medya: [
    ['fraction', 'Kesir Göster ile payı 3, paydayı 4 yapın; kesir modeli çizilir.'],
    ['text', 'Yazı Ekle ile tuvale dokunup soruyu yazın.'],
  ],
};

/** Yazarak Oluştur (komut kutusu) örnekleri: hepsi komut motorunda çalışır (kullanimKilavuzu.test.ts denetler). */
export const YAZARAK_OLUSTUR_ORNEKLERI: readonly string[] = [
  'A (2; 3) noktası oluştur',
  'AB doğru parçası çiz',
  'Yarıçapı 2 olan çember çiz',
  'Kenar uzunluğu 4 olan kare çiz',
  'f(x) = 2x + 1',
];

const kisayol = (arac: keyof typeof TOOL_SHORTCUTS) => TOOL_SHORTCUTS[arac];

function solPanelBolumu(): KilavuzBolumu {
  return {
    baslik: 'Sol panel',
    metin: ['Sol şeritte beş sekme vardır:'],
    maddeler: [
      'Araçlar: çizim, ölçme, inşa ve dönüşüm araçları gruplar hâlinde.',
      'Nesneler: tuvaldeki bütün şekiller, adları ve konumları.',
      'Bağlamlar: seçili nesneye özel işlemler ve ayarlar.',
      'Görünümler: 2D, 3D, Cebir ve çoklu yerleşimler.',
      'Ara: araç ve komut arama.',
    ],
  };
}

/** Kılavuzun bölümleri, seçili kademeye göre. */
export function kilavuzBolumleri(kademe: KademeDuzeyi): KilavuzBolumu[] {
  if (kademe === 'ilkokul') {
    return [
      {
        baslik: '1. Sol Menü (Araçlar, Nesneler, Bağlamlar, Görünümler)',
        metin: [
          'Sol taraftaki ağaç menüden dilediğiniz çizim aracını seçebilir, nesneler sekmesinden koordinatları inceleyebilirsiniz. Görünümler sekmesinden çalışma alanının yerleşimini değiştirebilirsiniz.',
        ],
      },
      {
        baslik: '2. 2D ve 3D Görünümler',
        metin: ['Üstteki Görünüm menüsünden veya sol taraftaki Görünümler sekmesinden 2D, 3D veya yan yana çoklu görünümleri seçebilirsiniz.'],
      },
      {
        baslik: '3. Çalışma Alanı ve Düzlem Ayarları',
        metin: ['Üst menüdeki Ayarlar seçeneğinden ızgara, koordinat eksenleri, bölge isimleri, dik açı stili, çizim kalınlıkları ve arkaplan ayarlarını kontrol edebilirsiniz.'],
      },
    ];
  }

  const gruplar = gruplariSuz(TREE_TOOL_GROUPS, kademe);
  const grupMaddeleri = gruplar.map((grup) => {
    const adlar = grup.tools.map((t) => t.name).join(', ');
    const ornek = (GRUP_ORNEKLERI[grup.id] ?? []).find(([arac]) => aracGorunurMu(kademe, arac));
    return `${grup.name}: ${adlar}.${ornek ? ` Örnek: ${ornek[1]}` : ''}`;
  });
  const kademeAdi = kademeEtiketi(kademe);

  return [
    solPanelBolumu(),
    {
      baslik: 'Kademe seçimi',
      metin: [
        `Üst menüdeki Kademe menüsünden İlkokul, Ortaokul ya da Lise seçin; araç paneli ve Araçlar menüsü o kademenin araçlarını gösterir. Şu an: ${kademeAdi}. Bütün araçlar için «Tüm araçlar»ı seçin.`,
        ...(kademe !== 'tum' && ARAC_SECIMI_SUZULEN_KADEMELER.includes(kademe)
          ? [`${kademeAdi} kademesinde panelde olmayan araçlar klavye kısayoluyla ve yazılı komutla da seçilmez.`]
          : []),
      ],
    },
    {
      baslik: 'Araç grupları',
      metin: ['Araçlar sekmesindeki her grup bir iş içindir:'],
      maddeler: grupMaddeleri,
    },
    {
      baslik: 'Görünümler',
      metin: [
        `Görünüm menüsünden ya da sol paneldeki Görünümler sekmesinden ${GORUNUM_DUZENLERI.length} yerleşimden birini seçin: ${GORUNUM_DUZENLERI.map((d) => d.ad).join(', ')}. «Görünümü Sıfırla» çizimi orijin merkezde gösterir.`,
      ],
    },
    {
      baslik: 'Kaydetme ve dışa aktarma',
      metin: [],
      maddeler: [
        'Dosya > Kaydet (Ctrl+S): Çalışma .geoeba dosyası olarak indirilir; Dosya > Aç (Ctrl+O) ile yeniden açılır.',
        'Dosya > Dışa Aktar: Görsel (PNG), Vektör (SVG) ya da Belge (PDF). Dosya > Yazdır (Ctrl+P).',
        'Dosya > Yeni (Ctrl+N): Kaydedilmemiş değişiklik varsa önce kaydetmek isteyip istemediğiniz sorulur.',
      ],
    },
    {
      baslik: 'Yazarak Oluştur',
      metin: [
        'Tuvalin sağ altındaki klavye düğmesi (Ctrl+K) komut kutusunu açar. Ne çizmek istediğinizi Türkçe yazıp Enter\'a basın. Örnekler:',
      ],
      maddeler: YAZARAK_OLUSTUR_ORNEKLERI.map((o) => `«${o}»`),
    },
    {
      baslik: 'Kısayollar',
      metin: [
        `Araç adlarının yanındaki harf, o aracın kısayoludur (ör. ${kisayol('point')}: Nokta, ${kisayol('segment')}: Doğru Parçası, ${kisayol('select')}: Seç ve Taşı). Ctrl+Z geri alır, Ctrl+Y yineler, Del seçiliyi siler. Tam liste: Yardım > Klavye Kısayolları.`,
      ],
    },
    {
      baslik: 'Ayarlar',
      metin: [
        'Ayarlar > Çalışma Alanı Ayarları: arka plan, ızgara, eksenler, dik açı stili, nokta ve yazı boyutları. «Varsayılana Sıfırla» hepsini ilk hâline döndürür.',
      ],
    },
  ];
}

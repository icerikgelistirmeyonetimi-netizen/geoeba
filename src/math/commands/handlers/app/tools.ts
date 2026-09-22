import type { ToolMode } from '@/types/workspace';

/**
 * Araç çubuğundaki 2D araçlar (toolDefinitions.tsx → TOOL_GROUPS ile aynı kimlik/ad/açıklama).
 * .tsx dosyası React simgeleri içerdiği için komut motoruna doğrudan alınmaz; eşleşme app.test.ts'de denetlenir.
 *
 * aliases: katlanmış ("fold" + noktalama yerine boşluk) metin üzerinde aranan kalıplar. En uzun eşleşme kazanır.
 * bare: "araç" sözcüğü olmadan da yalnızca araç anlamına gelen adlar (kalem, cetvel, pergel…).
 */
export interface ToolInfo {
  id: ToolMode;
  name: string;
  description: string;
  aliases: RegExp[];
  bare?: RegExp;
}

export const TOOLS: ToolInfo[] = [
  { id: 'point', name: 'Nokta', description: 'Tuvale tıklayarak yeni nokta oluşturun.', aliases: [/\bnokta(?:lar)?\b/] },
  { id: 'segment', name: 'Doğru Parçası', description: 'İki nokta arasına doğru parçası çizin.', aliases: [/\bdogru parca(?:si)?\b/, /\bparca\b/] },
  { id: 'line', name: 'Doğru', description: 'İki noktadan geçen sonsuz doğru çizin.', aliases: [/\bdogru\b/] },
  { id: 'ray', name: 'Işın', description: 'Başlangıç noktası ve üzerinden geçen ikinci nokta ile ışın çizin.', aliases: [/\bisin\b/] },
  { id: 'segment_length', name: 'Ölçülü Parça', description: 'Bir başlangıç noktasına tıklayın, uzunluğu sayı olarak girin.', aliases: [/\bolculu (?:dogru )?parca(?:si)?\b/, /\buzunlugu verilen parca\b/] },
  { id: 'circle', name: 'Çember', description: 'Merkez ve yarıçap noktasıyla çember çizin.', aliases: [/\bcember\b/, /\bdaire\b/] },
  { id: 'pen', name: 'Kalem', description: 'Serbest çizim kalemi.', aliases: [/\bkalem\b/, /\bserbest cizim\b/], bare: /\bkalem(?:i|e|le|im)?\b|\bserbest cizim(?:e|i)?\b/ },
  { id: 'select', name: 'Seç ve Taşı', description: 'Noktaları veya nesneleri seçip sürükleyin.', aliases: [/\bsec ve tasi\b/, /\bsecme\b/, /\bsecim\b/, /\btasi(?:ma)?\b/, /\bimlec\b/, /\bfare\b/, /\bok\b/], bare: /\bimlec(?:i|e)?\b|\bsecim moduna\b/ },
  { id: 'delete', name: 'Sil', description: 'Silmek istediğiniz nesneye dokunun.', aliases: [/\bsil(?:me)?\b/, /\bsilgi\b/], bare: /\bsilgi(?:yi|ye)?\b/ },
  { id: 'measure_distance', name: 'Uzunluk Ölç (cm)', description: 'Mesafe ve uzunluk ölçün.', aliases: [/\buzunlu[gk]\w* olc(?:me|er)?\w*/, /\bmesafe\w* olc(?:me|er)?\w*/, /\buzunluk\b/, /\bmesafe\b/] },
  { id: 'unit_measure', name: 'Birimle Ölç (br)', description: 'Birim karelerle ölçüm yapın.', aliases: [/\bbirim(?:le)? olc(?:me)?\b/, /\bbirim kare\b/] },
  { id: 'measure_angle', name: 'Açıölçer', description: 'Açı ölçümü yapın.', aliases: [/\baci ?olcer\b/, /\baci(?:yi|lari|larini)? olc(?:me|mek)?\b/, /\biletki\b/, /\bminkale\b/], bare: /\baci ?olcer(?:i|e|le)?\b|\biletki(?:yi|ye|yle)?\b|\bminkale(?:yi|ye)?\b/ },
  { id: 'angle', name: 'Açı Oluştur', description: '3 nokta ile açı oluşturun.', aliases: [/\baci olustur(?:ma)?\b/, /\baci\b/] },
  { id: 'measure_area', name: 'Alanı Bul', description: 'Kapalı şeklin alanını hesaplayın.', aliases: [/\balani bul(?:ma)?\b/, /\balan\w* (?:olc|hesapla|bul)\w*/, /\balan\b/] },
  { id: 'measure_perimeter', name: 'Çevre Hesapla', description: 'Şeklin çevre uzunluğunu hesaplayın.', aliases: [/\bcevre\w* (?:hesapla|olc|bul)\w*/, /\bcevre\b/] },
  { id: 'measure_slope', name: 'Eğim Ölç', description: 'İki noktaya tıklayın; aradaki doğrunun eğimini gösterir.', aliases: [/\begim\w* (?:olc|hesapla|bul)\w*/, /\begim\b/] },
  { id: 'trig_ratios', name: 'Trig. Oranlar', description: 'Bir kola, AÇININ KÖŞESİNE ve diğer kola tıklayın; sin, cos, tan değerlerini gösterir. Üçgen dikse kenar oranları da yazılır.', aliases: [/\btrig(?:onometri(?:k)?)?(?: oran(?:lar|lari)?)?\b/, /\bsin cos tan\b/, /\boranlar\b/] },
  { id: 'measure_arc', name: 'Yay Ölç', description: 'Aynı çemberin üzerindeki iki noktaya tıklayın; aralarındaki yayın uzunluğunu ve ölçüsünü gösterir.', aliases: [/\byay\w* olc\w*/, /\byay olcme\b/] },
  { id: 'area_model', name: 'Alanı Modelle', description: 'Alan modelleme ızgarası.', aliases: [/\balani modelle\b/, /\balan model(?:i|leme)?\b/] },
  { id: 'ruler', name: 'Cetvel', description: 'İnteraktif cetvel aracı.', aliases: [/\bcetvel\b/], bare: /\bcetvel(?:i|e|le|imi)?\b/ },
  { id: 'setsquare', name: 'Gönye', description: 'Dik açı ve gönye aracı.', aliases: [/\bgonye\b/], bare: /\bgonye(?:yi|ye|yle)?\b/ },
  { id: 'circle_radius', name: 'Yarıçapla Çember', description: 'Merkeze tıklayın, yarıçapı sayı olarak girin.', aliases: [/\byaricap(?:la|li)? cember\b/, /\byaricap\b/] },
  { id: 'circle_3points', name: '3 Noktalı Çember', description: 'Üç noktaya tıklayın; bu üç noktadan geçen çember (çevrel çember) çizilir.', aliases: [/\b(?:3|uc) noktali cember\b/, /\b(?:3|uc) noktadan (?:gecen )?cember\b/] },
  { id: 'arc', name: 'Yay', description: 'Merkez, başlangıç ve bitiş noktasına tıklayın; saat yönünün tersine yay çizilir.', aliases: [/\byay\b/] },
  { id: 'sector', name: 'Daire Dilimi', description: 'Yay ile aynı üç tıklama, ama içi dolu pasta dilimi çizilir.', aliases: [/\bdaire dilimi?\b/, /\bdilim\b/, /\bpasta dilimi?\b/] },
  { id: 'ellipse', name: 'Elips', description: 'Tuvalde sürükleyin; sürüklediğiniz kutuya içten teğet elips çizilir.', aliases: [/\belips\b/] },
  { id: 'polygon', name: 'Çokgen', description: 'Köşeleri belirleyerek çokgen çizin.', aliases: [/\bcokgen\b/] },
  { id: 'rectangle', name: 'Dikdörtgen', description: 'Dikdörtgen şekli ekleyin.', aliases: [/\bdikdortgen\b/] },
  { id: 'square', name: 'Kare', description: 'Sürükleyerek kare çizin.', aliases: [/\bkare\b/] },
  { id: 'regular_polygon', name: 'Düzgün Çokgen', description: 'Kenar sayısını girerek düzgün çokgen oluşturun.', aliases: [/\bduzgun cokgen\b/] },
  { id: 'function', name: 'Fonksiyon', description: 'f(x) ifadesi girerek grafik çizin.', aliases: [/\bfonksiyon\b/, /\bgrafik\b/] },
  { id: 'slider', name: 'Sürgü', description: 'a, b gibi parametreler için sürgü ekleyin.', aliases: [/\bkaydirici\b/, /\bsurgu\b/, /\bparametre\b/] },
  { id: 'midpoint', name: 'Orta Nokta', description: 'İki noktaya tıklayın; aralarındaki orta nokta oluşur.', aliases: [/\borta nokta\b/] },
  { id: 'divide_ratio', name: 'Oranda Böl', description: 'İki noktaya tıklayın, sonra m:n oranını girin (örn. 2:1).', aliases: [/\boranda bol(?:me)?\b/, /\boran(?:la)? bol(?:me)?\b/] },
  { id: 'perp_bisector', name: 'Orta Dikme', description: 'İki noktaya tıklayın; orta noktadan geçen dik doğru çizilir.', aliases: [/\borta dikme\b/] },
  { id: 'angle_bisector', name: 'Açıortay', description: 'Açının bir kolu, köşesi ve diğer kolu: üç noktaya sırayla tıklayın.', aliases: [/\baci ?ortay\b/] },
  { id: 'perpendicular', name: 'Dik Doğru', description: 'İki nokta doğrultuyu, üçüncü nokta doğrunun geçtiği yeri belirler.', aliases: [/\bdik dogru\b/, /\bdikme\b/] },
  { id: 'parallel', name: 'Paralel Doğru', description: 'İki nokta doğrultuyu, üçüncü nokta doğrunun geçtiği yeri belirler.', aliases: [/\bparalel dogru\b/, /\bparalel\b/] },
  { id: 'compass', name: 'Pergel', description: 'İğneyi saplayın, açıklığı ayarlayın, yayın başlangıcını istediğiniz yere bırakın ve iki yöne de çizin.', aliases: [/\bpergel\b/], bare: /\bpergel(?:i|e|le|imi)?\b/ },
  { id: 'intersect', name: 'Kesiştir', description: 'İki şekle tıklayın; ortak noktalarını oluşturur. Doğru, ışın, doğru parçası, çember ve yay desteklenir; elips yalnızca doğrularla kesiştirilebilir.', aliases: [/\bkesistir(?:me)?\b/, /\bkesisim\b/] },
  { id: 'rotate', name: 'Şekli Döndür', description: 'Şekli bir merkez etrafında döndürün.', aliases: [/\bsekli dondur\b/, /\bdondur(?:me)?\b/, /\bdonme\b/] },
  { id: 'translate', name: 'Öteleme', description: 'Önce şekli seçin; sonra öteleme vektörünün başlangıç ve bitiş noktasına tıklayın.', aliases: [/\botele(?:me)?\b/] },
  { id: 'reflect', name: 'Yansıt', description: 'Doğruya göre simetri / yansıma.', aliases: [/\byansit(?:ma)?\b/, /\byansima\b/] },
  { id: 'symmetry', name: 'Simetri Keşfet', description: 'Simetri eksenlerini keşfedin.', aliases: [/\bsimetri kesfet\b/, /\bsimetri\b/] },
  { id: 'checkbox', name: 'İşaret Kutusu', description: 'Önce göster/gizle edilecek nesneleri seçin, sonra kutunun yerine tıklayın.', aliases: [/\b(?:isaret|onay) kutu(?:su)?\b/] },
  { id: 'button', name: 'Düğme', description: 'Seçili nesneleri gösterip gizleyen ya da kaydırıcıyı oynatan düğme ekler.', aliases: [/\bdugme\b/, /\bbuton\b/] },
  { id: 'input_box', name: 'Girdi Kutusu', description: 'Önce bir kaydırıcı veya fonksiyon seçin, sonra kutunun yerine tıklayın.', aliases: [/\b(?:girdi|giris) kutu(?:su)?\b/] },
  { id: 'fraction', name: 'Kesir Göster', description: 'Kesir modeli oluşturun.', aliases: [/\bkesir goster(?:me)?\b/, /\bkesir(?: modeli)?\b/] },
  { id: 'image', name: 'Görsel Ekle', description: 'Tuvale görsel ekleyin.', aliases: [/\bgorsel ekle(?:me)?\b/, /\bgorsel\b/, /\bresim\b/, /\bfotograf\b/] },
  { id: 'text', name: 'Yazı Ekle', description: 'Tuvale metin kutusu ekleyin.', aliases: [/\byazi ekle(?:me)?\b/, /\byazi\b/, /\bmetin\b/] },
];

/** Araç çubuğunda olmayan ama ToolMode'da bulunan kaydırma (el) aracı. */
export const PAN_TOOL: ToolInfo = { id: 'pan', name: 'El (Kaydır)', description: 'Tuvali sürükleyerek görünümü kaydırın.', aliases: [/\bel\b/, /\bkaydirma\b/, /\bgorunum kaydir(?:ma)?\b/] };

const ALL_TOOLS = [...TOOLS, PAN_TOOL];

/** Araç adlarını karşılaştırmak için sade metin: katlanmış, kesme işaretsiz, harf/rakam dışı karakterler boşluk. */
export function plain(folded: string): string {
  return folded.replace(/[’'′]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Metindeki araç adı: en uzun eşleşen kalıp (ör. "doğru parçası" > "doğru"). */
export function findTool(text: string, useBare = false): ToolInfo | undefined {
  let best: { tool: ToolInfo; length: number } | undefined;
  for (const tool of ALL_TOOLS) {
    const patterns = useBare ? (tool.bare ? [tool.bare] : []) : tool.aliases;
    for (const re of patterns) {
      const m = text.match(re);
      if (m && (!best || m[0].length > best.length)) best = { tool, length: m[0].length };
    }
  }
  return best?.tool;
}

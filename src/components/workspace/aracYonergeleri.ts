/**
 * Etkin araç için tuvalin altındaki yönerge çubuğunda gösterilen kısa başlık ve açıklama.
 * Emoji kullanılmaz (kullanıcı isteği); simge çubuğun kendi rozetinde çizilir.
 *
 * `secilen`: araç için şimdiye kadar tıklanan nokta sayısı (ör. "2/3 seçildi").
 */
export interface AracYonergesi {
  baslik: string;
  aciklama: string;
}

const sayac = (secilen: number, toplam: number) => (secilen > 0 ? ` (${secilen}/${toplam} seçildi)` : '');

export function aracYonergesi(arac: string, secilen: number): AracYonergesi | null {
  switch (arac) {
    case 'measure_angle':
      return {
        baslik: 'Açıölçer',
        aciklama:
          'Gövdeyi sürükleyerek taşıyın; koldaki tutamaçla açıyı ölçün, alttaki oklu tutamaçla tabanı döndürün. Üç noktaya sırayla dokunarak da ölçebilirsiniz. Seçenekler ve Sil için sağ tıklayın ya da basılı tutun.',
      };
    case 'angle':
      return { baslik: 'Açı Oluştur', aciklama: `3 nokta seçin${sayac(secilen, 3)}.` };
    case 'measure_distance':
      return { baslik: 'Uzunluk Ölç (cm)', aciklama: `2 köşe/nokta ya da bir doğru parçası seçin${sayac(secilen, 2)}.` };
    case 'measure_area':
      return { baslik: 'Alanı Bul', aciklama: 'Alanını görmek istediğiniz çokgene ya da şekle dokunun.' };
    case 'measure_perimeter':
      return { baslik: 'Çevre Hesapla', aciklama: 'Çevresini görmek istediğiniz çokgene dokunun.' };
    case 'unit_measure':
      return { baslik: 'Birimle Ölç (br)', aciklama: `2 köşe/nokta ya da bir doğru parçası seçin${sayac(secilen, 2)}.` };
    case 'area_model':
      return {
        baslik: 'Alanı Modelle',
        aciklama: 'Gövdeyi sürükleyerek taşıyın; sağ üst köşedeki tutamaçla sütun ve satır sayısını değiştirin. Seçenekler ve Sil için sağ tıklayın ya da basılı tutun.',
      };
    case 'ruler':
      return {
        baslik: 'Cetvel',
        aciklama: 'Gövdeyi sürükleyerek taşıyın; sağ uçtaki tutamaçla boyunu, alttaki oklu tutamaçla yönünü değiştirin. Seçenekler ve Sil için sağ tıklayın ya da basılı tutun.',
      };
    case 'setsquare':
      return {
        baslik: 'Gönye',
        aciklama: 'Gövdeyi sürükleyerek taşıyın; oklu tutamaçla dik köşesi etrafında döndürün. Seçenekler ve Sil için sağ tıklayın ya da basılı tutun.',
      };
    case 'circle_radius':
      return { baslik: 'Yarıçapla Çember', aciklama: 'Merkez olacak yere tıklayın; açılan pencereye yarıçapı yazın.' };
    case 'circle_3points':
      return { baslik: 'Üç Noktadan Çember', aciklama: `Üç noktaya tıklayın; bu üç noktadan geçen çember çizilir (${secilen}/3 seçildi).` };
    case 'arc':
      return {
        baslik: 'Yay',
        aciklama: `Önce merkez, sonra başlangıç, sonra bitiş noktasına tıklayın; yay saat yönünün tersine çizilir (${secilen}/3 seçildi).`,
      };
    case 'sector':
      return {
        baslik: 'Daire Dilimi',
        aciklama: `Önce merkez, sonra başlangıç, sonra bitiş noktasına tıklayın; içi dolu dilim çizilir (${secilen}/3 seçildi).`,
      };
    case 'checkbox':
      return {
        baslik: 'İşaret Kutusu',
        aciklama: 'Önce gösterip gizleyeceğiniz nesneleri seçin (Seç ve Taşı + Shift), sonra kutunun duracağı yere tıklayın. Kutuyu kapatmak nesneleri silmez, yalnızca gizler.',
      };
    case 'button':
      return {
        baslik: 'Düğme',
        aciklama: 'Önce etkileyeceği nesneleri ya da kaydırıcıları seçin, sonra düğmenin yerine tıklayın. Kaydırıcı seçtiyseniz düğme canlandırmayı başlatıp durdurur.',
      };
    case 'input_box':
      return { baslik: 'Girdi Kutusu', aciklama: 'Önce bir kaydırıcı ya da fonksiyon seçin, sonra kutunun yerine tıklayın. Değeri yazıp Enter’a basın.' };
    case 'midpoint':
      return { baslik: 'Orta Nokta', aciklama: 'İki noktaya tıklayın; aralarındaki orta nokta oluşur.' };
    case 'divide_ratio':
      return { baslik: 'Oranda Böl', aciklama: 'İki noktaya tıklayın, sonra m:n oranını girin (örn. 2:1). İlk tıkladığınız uç “m” tarafıdır.' };
    case 'perp_bisector':
      return {
        baslik: 'Orta Dikme',
        aciklama: 'İki noktaya tıklayın; orta noktalarından geçen dik doğru çizilir. Üzerindeki her nokta iki uca eşit uzaklıktadır.',
      };
    case 'angle_bisector':
      return {
        baslik: 'Açıortay',
        aciklama: 'Sırayla bir kola, açının köşesine ve diğer kola tıklayın; açıyı iki eş parçaya bölen ışın çizilir.',
      };
    case 'perpendicular':
      return { baslik: 'Dik Doğru', aciklama: 'İlk iki nokta doğrultuyu belirler, üçüncü nokta doğrunun geçtiği yerdir.' };
    case 'parallel':
      return { baslik: 'Paralel Doğru', aciklama: 'İlk iki nokta doğrultuyu belirler, üçüncü nokta doğrunun geçtiği yerdir.' };
    case 'segment_length':
      return { baslik: 'Uzunluğu Verilen Doğru Parçası', aciklama: 'Başlangıç noktasına tıklayın, sonra uzunluğu girin.' };
    case 'compass':
      return {
        baslik: 'Pergel',
        aciklama:
          '1) İğneyi saplayın. 2) İmleci iğneden uzaklaştırıp açıklığı ayarlayın, tıklayın. 3) Yayın başlangıcını istediğiniz yere bırakın. 4) İstediğiniz yöne dönerek yayı çizin; tam tura getirirseniz çember olur. Esc ile vazgeçin.',
      };
    case 'intersect':
      return { baslik: 'Kesiştir', aciklama: 'İki şekle sırayla tıklayın; ortak noktaları oluşturulur (doğru–çember, çember–çember…).' };
    case 'translate':
      return {
        baslik: 'Öteleme',
        aciklama: 'Önce şekli “Seç ve Taşı” ile seçin; sonra öteleme vektörünün başlangıç ve bitiş noktasına tıklayın.',
      };
    case 'measure_slope':
      return { baslik: 'Eğim', aciklama: 'İki noktaya tıklayın; aradaki doğrunun eğimi m = Δy/Δx olarak gösterilir.' };
    case 'trig_ratios':
      return {
        baslik: 'Trigonometrik Oranlar',
        aciklama: 'Sırayla bir kola, açının köşesine ve diğer kola tıklayın. Üçgenin dik olması gerekmez; dikse kenar oranları da yazılır.',
      };
    case 'measure_arc':
      return {
        baslik: 'Yay Ölç',
        aciklama: `Aynı çemberin üzerindeki iki noktaya tıklayın${sayac(secilen, 2)}. Aralarındaki küçük yayın uzunluğu ve derecesi yazılır; çember bölünmez. Büyük yay için rozete sağ tıklayın.`,
      };
    case 'ellipse':
      return {
        baslik: 'Elips',
        aciklama: 'Bir köşeden diğerine sürükleyin; kutuya içten teğet elips çizilir. Yarıçapları sonra sağ tık menüsünden değiştirebilirsiniz.',
      };
    case 'rotate':
      return {
        baslik: 'Şekli Döndür',
        aciklama: 'Önce bir şekil seçin; üzerindeki döndürme tutamacını basılı tutarak sürükleyin ya da hazır derecelere (30°, 45°, 60°, 90°…) tıklayın.',
      };
    case 'reflect':
    case 'symmetry':
      return {
        baslik: 'Yansıtma',
        aciklama: 'Yansıtılacak şekli seçin, ardından tuvaldeki bir doğruya ya da yukarıdaki eksen düğmelerine tıklayın.',
      };
    default:
      return null;
  }
}

/** Yönerge çubuğunun gösterildiği araçlar */
export const YONERGELI_ARACLAR = [
  'measure_angle', 'angle', 'measure_distance', 'measure_area', 'measure_perimeter', 'unit_measure', 'area_model', 'ruler',
  'setsquare', 'rotate', 'reflect', 'symmetry', 'circle_radius', 'circle_3points', 'arc', 'sector', 'ellipse', 'midpoint',
  'divide_ratio', 'perp_bisector', 'angle_bisector', 'perpendicular', 'parallel', 'segment_length', 'compass', 'intersect',
  'translate', 'measure_slope', 'trig_ratios', 'measure_arc', 'checkbox', 'button', 'input_box',
] as const;

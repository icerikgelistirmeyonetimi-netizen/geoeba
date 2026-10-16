export type FenKimligi = 'grade_3' | 'grade_4' | 'grade_5' | 'grade_6' | 'grade_7' | 'grade_8' | 'lab';

export interface FenYapisi {
  id: FenKimligi;
  sinif: number | null;
  kademe: string;
  ad: string;
  kisaAd: string;
  aciklama: string;
  renk: string;
  konum: [number, number, number];
  temalar: string[];
  bag: string;
  mimari: string[];
  program: string;
  kaynak: string;
}

const oncekiProgram = 'https://mufredat.meb.gov.tr/Dosyalar/201812312311937-FEN%20B%C4%B0L%C4%B0MLER%C4%B0%20%C3%96%C4%9ERET%C4%B0M%20PROGRAMI2018.pdf';

export const FEN_YAPILARI: readonly FenYapisi[] = [
  {
    id: 'grade_3', sinif: 3, kademe: 'İlkokul',
    ad: 'Doğa Kaşifleri Evi', kisaAd: 'Doğa', renk: '#87b64f', konum: [-24, .85, 5],
    aciklama: 'Bir yaprağın damarından toprağın katmanlarına… Bilim yolculuğu, yakınımızdaki dünyayı dikkatle gözlemleyerek başlıyor.',
    temalar: ['Canlılar ve yaşam alanları', 'Toprak ve bitkiler', 'Yer bilimleri', 'Madde ve hareket', 'Elektrik'],
    bag: 'Toprağın yapısını gözlemlemek, bitki yetiştirme koşullarını keşfetmek ve canlıları yaşam alanlarıyla ilişkilendirmek bu yapının çıkış noktası.',
    mimari: ['Yaprak biçimli sera çatısı', 'Filizler ve küçük ekim bahçeleri', 'Doğayı gözlemleyen açık avlu'],
    program: 'TYMM · 3. sınıf', kaynak: 'https://tymm.meb.gov.tr/ogretim-programlari/fen-bilimleri-dersi/4',
  },
  {
    id: 'grade_4', sinif: 4, kademe: 'İlkokul',
    ad: 'Kuvvet ve Işık Pavyonu', kisaAd: 'Kuvvet', renk: '#df8266', konum: [-24, .85, -12],
    aciklama: 'Görünmeyen kuvvetleri görünür kılan bir keşif evi. Mıknatıslar, ışık ve küçük devreler günlük hayatın sırlarına kapı açıyor.',
    temalar: ['Mıknatıs ve kuvvet', 'Işık ve ses', 'Basit elektrik devreleri', 'Dünya ve kayaçlar', 'Madde ve çevre'],
    bag: 'Mıknatısın iki kutbunu ve çektiği maddeleri tanıma, basit elektrik devresi kurma, Dünya’nın hareketlerini ve fosil oluşumunu anlama temalarıyla bağlantılı.',
    mimari: ['İki renkli mıknatıs kemeri', 'Işığı içeri alan cam yüzeyler', 'Devre ve doğa sergileri'],
    program: '2018 programı · 4. sınıf', kaynak: oncekiProgram,
  },
  {
    id: 'grade_5', sinif: 5, kademe: 'Ortaokul',
    ad: 'Gök ve Yaşam Gözlemevi', kisaAd: 'Gökyüzü', renk: '#657fab', konum: [3, .85, -16],
    aciklama: 'Gökyüzüne uzanan merak, bir hücrenin içine kadar yol alıyor. Büyük ve küçük dünyalar aynı gözlemevinde buluşuyor.',
    temalar: ['Güneş, Dünya ve Ay', 'Ay’ın evreleri', 'Hücre ve canlı yapısı', 'Kuvvetin ölçülmesi', 'Işık, madde ve elektrik'],
    bag: 'Ay’ın evrelerini ve Güneş–Dünya–Ay hareketlerini modelleme; bitki ve hayvan hücrelerini karşılaştırma, yapının iki temel öğrenme bağlantısı.',
    mimari: ['Gözlemevi kubbesi ve teleskop', 'Güneş–Dünya–Ay düzeni', 'Yaşamı inceleyen cam galeri'],
    program: 'TYMM · 5. sınıf', kaynak: 'https://tymm.meb.gov.tr/ogretim-programlari/fen-bilimleri-dersi/6',
  },
  {
    id: 'grade_6', sinif: 6, kademe: 'Ortaokul',
    ad: 'Yörünge ve Hareket Merkezi', kisaAd: 'Hareket', renk: '#42aeb0', konum: [14.5, .85, -16],
    aciklama: 'Gezegenlerin düzeninden bir cismin hareketine… Yörüngeler ve yollar, evrendeki düzeni keşfetmeye davet ediyor.',
    temalar: ['Güneş sistemi ve tutulmalar', 'Kuvvet ve hareket', 'Sürat ve hız', 'Yansıma ve renk', 'Canlı sistemleri ve madde'],
    bag: 'Gezegenleri karşılaştırıp Güneş sistemi modeli kurma; dengelenmiş kuvvetleri inceleme ve sürat ile hız arasındaki farkı anlama temalarına dayanıyor.',
    mimari: ['Gezegenleri taşıyan yörünge halkaları', 'Hareketi izleten avlu', 'Renkli, açık gözlem terasları'],
    program: 'TYMM · 6. sınıf', kaynak: 'https://tymm.meb.gov.tr/ogretim-programlari/fen-bilimleri-dersi/7',
  },
  {
    id: 'grade_7', sinif: 7, kademe: 'Ortaokul',
    ad: 'Atom ve Enerji Enstitüsü', kisaAd: 'Atom', renk: '#a28dcc', konum: [3, .85, -2.5],
    aciklama: 'Maddenin görünmeyen yapısını, ışığın yolculuğunu ve enerjinin dönüşümünü düşünen bir bilim pavyonu.',
    temalar: ['Atom ve moleküller', 'Kuvvet ve enerji', 'Mercekler ve kırılma', 'Elektriklenme', 'Sürdürülebilir enerji'],
    bag: 'Atomun parçacıklarını ilişkilendirme ve molekül modelleri kurma; ışığın kırılmasını inceleme ve enerji kaynaklarını değerlendirme temalarını bir araya getiriyor.',
    mimari: ['Atom simgesinden esinlenen çatı', 'Bakır halkalar ve cam atrium', 'Enerjiye ayrılan açık teras'],
    program: 'TYMM · 7. sınıf', kaynak: 'https://tymm.meb.gov.tr/ogretim-programlari/fen-bilimleri-dersi/8',
  },
  {
    id: 'grade_8', sinif: 8, kademe: 'Ortaokul',
    ad: 'Yaşam ve İklim Biyosferi', kisaAd: 'Yaşam', renk: '#4caa81', konum: [14.5, .85, -2.5],
    aciklama: 'Yaşamın içindeki düzen ile gezegenimizin geleceği yan yana. Genetik, iklim ve enerji, yeşil bir araştırma yapısında buluşuyor.',
    temalar: ['DNA ve genetik', 'Mevsimler ve iklim', 'Enerji ve çevre', 'Madde ve endüstri', 'Basınç ve basit makineler'],
    bag: 'DNA’nın yapısını modelleme, iklim olaylarını yorumlama, enerji dönüşümlerini ve çevresel ilişkileri inceleme bu yapının bilimsel dayanağı.',
    mimari: ['DNA’dan esinlenen çift sarmal', 'Cam biyosfer ve yeşil teras', 'İklimi gözlemleyen araştırma bahçesi'],
    program: '2018 programı · 8. sınıf', kaynak: oncekiProgram,
  },
  {
    id: 'lab', sinif: null, kademe: 'Ortak keşif alanı',
    ad: 'Merak Laboratuvarı', kisaAd: 'Laboratuvar', renk: '#ceaa55', konum: [1, .85, 24],
    aciklama: 'Bir soru, küçük bir gözlem, yeni bir fikir. Bütün sınıfların merakını aynı çalışma masasında buluşturan köyün ortak laboratuvarı.',
    temalar: ['Mikroskop ve gözlem', 'Optik masası', 'Devre istasyonu', 'Madde ve ölçüm', 'Bitki araştırmaları'],
    bag: 'Gözlem yapma, bir model oluşturma, deney düzeneği tasarlama ve ölçümleri karşılaştırma becerileri için düşünülen ortak mekân.',
    mimari: ['İçi görünen geniş deney salonu', 'Mikroskobu simgeleyen giriş', 'Birlikte çalışmaya açık masalar'],
    program: 'Fen Bilimleri · ortak beceriler', kaynak: 'https://tymm.meb.gov.tr/ogretim-programlari/ders/fen-bilimleri-dersi',
  },
];

export const FEN_PROGRAM_NOTU = '2026–2027: 3, 5, 6 ve 7. sınıflar Türkiye Yüzyılı Maarif Modeli; 4 ve 8. sınıflar önceki programla eşleştirildi. Yapıların adları ve mimarisi bu köy için tasarlandı.';
export const FEN_PROGRAM_KAYNAGI = 'https://tegm.meb.gov.tr/www/2026-2027-egitim-ogretim-yili-taslak-cerceve-planlar-yayinlandi/icerik/1316';

export function fenYapisi(id: FenKimligi): FenYapisi {
  return FEN_YAPILARI.find((yapi) => yapi.id === id)!;
}

export function fenKimligi(value: unknown): value is FenKimligi {
  return typeof value === 'string' && FEN_YAPILARI.some((yapi) => yapi.id === value);
}

/** Dış dağ kütlesinin jeolojik katmanlarına gömülü, tıklanabilir fosil türleri (fosiller.py). */
export type FosilTuru = 'dinozor' | 'plesiosaur' | 'amonit' | 'balik' | 'trilobit';

export interface FenFosili {
  tur: FosilTuru;
  ad: string;
  /** Panelde diğer fosiller arasında geçiş düğmesinin adı */
  kisaAd: string;
  /** Panel üst etiketi: katman ailesi */
  etiket: string;
  donem: string;
  aciklama: string;
  /** "Neler görüyoruz?" maddeleri */
  ipuclari: string[];
  /** Fosili saran katmanın hikâyesi */
  katman: string;
  bag: string;
  program: string;
  kaynak: string;
}

export const FEN_FOSILLERI: readonly FenFosili[] = [
  {
    tur: 'dinozor', ad: 'Uzun boyunlu dinozor iskeleti', kisaAd: 'Dinozor', etiket: 'Kara katmanı · Turuncu kumtaşı',
    donem: 'Jura dönemi · yaklaşık 150 milyon yıl önce',
    aciklama: 'Uçurumun turuncu kumtaşı katmanında, uzun boynu ve kuyruğuyla dört ayaklı bir otçul dinozorun iskeleti duruyor. Kemiklerin içi zamanla minerallerle dolarak taşlaştı.',
    ipuclari: ['Omurga boyunca dizilen omurlar', 'Göğüs kafesini kuran kavisli kaburgalar', 'Ağır gövdeyi taşıyan sütun gibi bacak kemikleri', 'Küçük kafatası ve göz oyuğu'],
    katman: 'Turuncu kumtaşı: eski bir nehir yatağının kumları üst üste binen tabakalarla sıkışıp taşlaştı; dinozor bu kumlara gömülmüştü.',
    bag: 'Fosillerin nasıl oluştuğunu, kayaç katmanlarının geçmişte yaşamış canlılar hakkında neler anlattığını düşünmek için bir başlangıç noktası.',
    program: '2018 programı · 4. sınıf · Fosil oluşumu', kaynak: oncekiProgram,
  },
  {
    tur: 'plesiosaur', ad: 'Plesiosaur iskeleti', kisaAd: 'Plesiosaur', etiket: 'Deniz katmanı · Gri-mavi şeyl',
    donem: 'Kretase dönemi · yaklaşık 100 milyon yıl önce',
    aciklama: 'Uzun boyunlu, kürek yüzgeçli bir deniz sürüngeni. Gri-mavi şeyl katmanında bulunması, bu kayaların bir zamanlar derin bir denizin tabanı olduğunu gösteriyor.',
    ipuclari: ['Uzun boyun ve küçük baş', 'Kürek biçimli dört yüzgeç ve parmak kemikleri', 'Fıçı gibi geniş göğüs kafesi'],
    katman: 'Gri-mavi şeyl: durgun bir denizin dibine çöken ince çamur, milyonlarca yılda katman katman taşlaştı.',
    bag: 'Bir kara parçasının geçmişte deniz olabileceğini, kayaçların ve fosillerin bunun kanıtı olduğunu tartışmak için.',
    program: '2018 programı · 4. sınıf · Fosil oluşumu', kaynak: oncekiProgram,
  },
  {
    tur: 'amonit', ad: 'Amonit', kisaAd: 'Amonit', etiket: 'Deniz katmanı · Gri-mavi şeyl',
    donem: 'Jura–Kretase · 200–66 milyon yıl önce',
    aciklama: 'Sarmal kabuklu bir deniz canlısı; günümüzdeki mürekkep balığı ve nautilusun uzak akrabası. Kabuğun içi odalara bölünmüştü; canlı en dıştaki odada yaşardı.',
    ipuclari: ['Dıştan içe küçülen logaritmik sarmal', 'Kabuğu odalara bölen ince çizgiler', 'Katmanları tarihlendirmede kullanılan bir kılavuz fosil'],
    katman: 'Gri-mavi şeyl: deniz tabanına inen ince çamur tabakaları kabuğu hava almadan sarıp korudu.',
    bag: 'Aynı katmanda bulunan fosillerin aynı dönemde yaşadığını fark etmek; sarmal biçimi matematikle ilişkilendirmek.',
    program: '2018 programı · 4. sınıf · Fosil oluşumu', kaynak: oncekiProgram,
  },
  {
    tur: 'balik', ad: 'Kemikli balık iskeleti', kisaAd: 'Balık', etiket: 'Deniz katmanı · Gri-mavi şeyl',
    donem: 'Kretase dönemi · yaklaşık 90 milyon yıl önce',
    aciklama: 'İnce kemikleri ve kuyruk ışınlarıyla küçük bir kemikli balık. Yumuşak dokular çürüdü, iskelet çamurun içinde bir baskı gibi kaldı.',
    ipuclari: ['Kafatası ve göz oyuğu', 'Omurga ile ona bağlı kaburgalar', 'Sırt dikenleri ve yelpaze gibi kuyruk ışınları'],
    katman: 'Gri-mavi şeyl: oksijensiz deniz dibi, iskeletin dağılmadan taşlaşmasını sağladı.',
    bag: 'Canlıların yapılarını (omurga, yüzgeç) günümüzdeki balıklarla karşılaştırmak için.',
    program: '2018 programı · 4. sınıf · Fosil oluşumu', kaynak: oncekiProgram,
  },
  {
    tur: 'trilobit', ad: 'Trilobit', kisaAd: 'Trilobit', etiket: 'Deniz katmanı · Gri-mavi şeyl',
    donem: 'Paleozoik · 520–250 milyon yıl önce',
    aciklama: 'Üç loblu gövdesiyle eklem bacaklıların en eski akrabalarından biri. Deniz tabanında yürür, zırh gibi kabuğunu deri değiştirir gibi yenilerdi.',
    ipuclari: ['Baş kalkanı ve iki göz', 'Sekiz gövde halkası ile ortadaki eksen lobu', 'Küçük kuyruk kalkanı ve antenler'],
    katman: 'Bu köydeki katmanlar simgeseldir; gerçek jeolojik zaman ölçeğini birebir temsil etmez.',
    bag: 'Çok eski dönemlerde yaşamış canlıların bugün olmadığını, fosillerin bize onları tanıttığını fark etmek için.',
    program: '2018 programı · 4. sınıf · Fosil oluşumu', kaynak: oncekiProgram,
  },
];

export const FEN_FOSIL_NOTU = 'Katmanlar ve fosiller köy için tasarlanmış simgesel modellerdir; ölçekli bilimsel model değildir.';

export function fenFosili(tur: FosilTuru): FenFosili {
  return FEN_FOSILLERI.find((fosil) => fosil.tur === tur)!;
}

export function fosilTuru(value: unknown): value is FosilTuru {
  return typeof value === 'string' && FEN_FOSILLERI.some((fosil) => fosil.tur === value);
}

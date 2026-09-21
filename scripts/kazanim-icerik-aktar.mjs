/**
 * Üretim panelinin (localhost:8765) ürettiği matematik içeriklerini projeye aktarır.
 *
 * Kaynak: içerik üreticisinin `cikti` klasörü — dosya adı MEB kazanım kodlarından oluşur
 * (`MAT.5.1.1-a.html`, birden çok kazanımı kapsayan sayfalarda `MAT.5.3.1+MAT.5.3.2-a.html`).
 * Sayfalar tek parça HTML'dir (görsel/ses/script gömülü), bu yüzden kopyalamak yeterlidir.
 *
 * Hangi sayfalar: üretim panelinde bu uygulama için tutulan proje (`veri/projeler.json`,
 * varsayılan «geoeba»; çöp kutusundakiler hariç). Proje yoksa klasördeki bütün MAT sayfaları.
 *
 * Eşleştirme koda göre YAPILAMAZ: projedeki müfredat verisi üniteleri MEB'den farklı
 * sıralar (projede MAT.5.1 = Geometrik Şekiller, MEB'de MAT.5.1 = Sayılar ve Nicelikler).
 * Tema adları ise iki tarafta da aynıdır; bu yüzden her SAYFA kendi sınıfında, önce aynı
 * temadaki konular arasında, başlığı kazanım metnine en çok benzeyen konuya atanır.
 * Böylece üretilen her sayfa bir konunun altında listelenir; bir konu birden çok sayfa
 * taşıyabilir. Sayfa düşmeyen konular en yakın kazanımın sayfasını gösterir.
 *
 * Çıktılar (public/kazanim-icerikleri/):
 *   - projenin bütün içerik sayfaları; sayfalar arasında birebir tekrar eden büyük gömülü
 *     betik/stil blokları (three.js, MathJax, RAPIER, dönüt sesleri, şablon CSS'i…) bir kez
 *     `ortak/<özet>.js|css` olarak yazılır ve sayfa oraya bağlanır. Tek parça sayfalar
 *     kopyalandığında 283 sayfa 930 MB tutuyordu (GitHub Pages sınırı 1 GB); ortaklaştırınca
 *     ~110 MB. Kaynak sayfalar değişmez, dönüşüm yalnız bu kopyalardadır.
 *   - liste.json           → proje konu kodu → içerikler[] (+ ilk içerik eski alanlarla)
 *   - eslesme-raporu.json  → zayıf atamalar, çok içerikli ve boş konular (gözden geçirmek için)
 *
 * Yeni içerik üretildikçe yeniden çalıştırılır: `npm run kazanim:aktar`
 * Başka bir kaynak klasör için: `KAZANIM_KAYNAK=... npm run kazanim:aktar`
 * Başka bir proje için: `KAZANIM_PROJE=<ad> npm run kazanim:aktar`
 */

import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJE_KOKU = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VARSAYILAN_KAYNAK = 'C:\\Users\\HP\\Desktop\\icerik_gelistirme_yeni - Kopya\\cikti';
const KAYNAK = process.env.KAZANIM_KAYNAK || VARSAYILAN_KAYNAK;
/** Üretim panelinin proje listesi (kaynak klasörün kardeşi `veri/projeler.json`). */
const PROJE_LISTESI = process.env.KAZANIM_PROJE_LISTESI || path.join(KAYNAK, '..', 'veri', 'projeler.json');
const PROJE_ADI = process.env.KAZANIM_PROJE || 'geoeba';
const HEDEF = path.join(PROJE_KOKU, 'public', 'kazanim-icerikleri');
const LISTE = path.join(HEDEF, 'liste.json');
const RAPOR = path.join(HEDEF, 'eslesme-raporu.json');
/** MEB kazanım metinleri (üreticinin veri tabanından bir kez dışa aktarıldı). */
const KAZANIM_METINLERI = path.join(PROJE_KOKU, 'scripts', 'veri', 'kazanim-metinleri.json');
const MUFREDAT = ['ilkokulData.ts', 'ortaokulData.ts', 'liseData.ts'];
/**
 * Elle düzeltmeler: metin benzerliğinin yakalayamadığı anlam eşleşmeleri
 * (ör. «mesafe ve yön» ↔ «Uzamsal İlişkiler»). Biçim: { "<dosya>": "<proje konu kodu>" }.
 */
const ELLE_ESLEMELER = path.join(PROJE_KOKU, 'scripts', 'veri', 'icerik-konu-eslemeleri.json');

/** `MAT.<sınıf>.<ünite>.<kazanım>` kodlarından oluşan içerik sayfaları (`-a`, `-<proje>-a` sonekleri). */
const DOSYA_DESENI = /^(MAT\.[0-9]+\.[0-9]+\.[0-9]+(?:\+MAT\.[0-9]+\.[0-9]+\.[0-9]+)*)(?:-[^.]+)?\.html$/;
/** Müfredat verisindeki konu ve tema kayıtları: anahtar sırası üç dosyada da aynıdır. */
const KONU_DESENI = /"id":\s*"(topic-[^"]+)",\s*"title":\s*"([^"]+)",\s*"code":\s*"(MAT\.[^"]+)"/g;
const TEMA_DESENI = /"themeName":\s*"([^"]*)"/g;

/** Tema adları neredeyse birebir aynı olduğundan eşleşme sınırı yüksek tutulur. */
const TEMA_ESIGI = 0.75;
/** Başlık benzerliği sınırı: tema tutuyorsa aday havuzu küçük olduğu için düşük tutulur. */
const ESIK_TEMALI = 0.16;
const ESIK_TEMASIZ = 0.4;
/** Raporda gözden geçirilmek üzere işaretlenen zayıf eşleşme sınırı. */
const ZAYIF = 0.35;

// Başlıklarda sık geçen, ayırt etmeyen sözcükler
const DOLGU = new Set([
  'ile',
  'veya',
  'için',
  'gibi',
  'olan',
  'olarak',
  'arasındaki',
  'ilgili',
  'ilişkin',
  'yönelik',
  'içeren',
  'farklı',
  'temel',
  'gerçek',
  'yaşam',
  'durumlarda',
  'durumlarını',
  'problemleri',
  'problemlerini',
  'yapabilme',
  'edebilme',
  'ifade',
  'kullanarak',
  've',
  'bir',
]);

const trKucuk = (metin) => metin.replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase();

/** Türkçe ekler benzerliği bozmasın diye sözcükler ilk 5 harfine indirgenir. */
function govdeler(metin) {
  return new Set(
    trKucuk(metin)
      .replace(/[^a-zçğıöşü0-9]+/g, ' ')
      .split(' ')
      .filter((s) => s.length > 2 && !DOLGU.has(s))
      .map((s) => s.slice(0, 5)),
  );
}

function ucluler(metin) {
  const düz = trKucuk(metin).replace(/[^a-zçğıöşü0-9]+/g, ' ').trim();
  const küme = new Set();
  for (let i = 0; i + 3 <= düz.length; i++) küme.add(düz.slice(i, i + 3));
  return küme;
}

function dice(a, b) {
  if (a.size === 0 || b.size === 0) return 0;
  let ortak = 0;
  for (const x of a) if (b.has(x)) ortak++;
  return (2 * ortak) / (a.size + b.size);
}

/**
 * İki sözcük gövdesi aynı kökten mi: ortak önek kısa gövdenin tamamı ya da en az 4 harf.
 * Tam eşitlik yetmiyordu: «açı» ile «açıları» (açıla), «alanı» ile «alanları» (alanl)
 * eşleşmediği için açı kazanımları «Açı Çeşitleri» yerine alan konusuna gidiyordu.
 */
function ayniKok(x, y) {
  const kisa = Math.min(x.length, y.length);
  const gerekli = Math.min(kisa, 4);
  let i = 0;
  while (i < kisa && x[i] === y[i]) i++;
  return gerekli >= 3 && i >= gerekli;
}

function kokOrtak(a, b) {
  let ortak = 0;
  for (const x of a) {
    if (b.has(x)) {
      ortak++;
      continue;
    }
    for (const y of b) {
      if (ayniKok(x, y)) {
        ortak++;
        break;
      }
    }
  }
  return ortak;
}

/**
 * Konu başlığı ile kazanım metninin benzerliği: ortak kökler (Dice), başlığın metinde ne
 * kadar geçtiği (kısa başlıklar Dice'ta hep düşük kalır) ve üçlü harf benzerliği.
 */
function benzerlik(konu, kazanim) {
  const a = konu.govde;
  const b = kazanim.govde;
  const ortak = a.size && b.size ? kokOrtak(a, b) : 0;
  const govdeDice = a.size && b.size ? (2 * ortak) / (a.size + b.size) : 0;
  const govdeKapsam = a.size ? ortak / a.size : 0;
  return 0.4 * govdeDice + 0.4 * govdeKapsam + 0.2 * dice(konu.uclu, kazanim.uclu);
}

/** "3.TEMA: GEOMETRİK ŞEKİLLER" → "geometrik şekiller"; iki tarafta da aynı adlar kullanılır. */
function temaAdi(ham) {
  return trKucuk(String(ham ?? ''))
    .replace(/^\s*[0-9]+\s*\.?\s*tema\s*:?\s*/, '')
    .replace(/[^a-zçğıöşü0-9()]+/g, ' ')
    .trim();
}

/** Kod içindeki sınıf: `MAT.5.1.1` → '5'; projede hazırlık 0, MEB verisinde 'H'. */
function sinifKodu(kod) {
  const parca = kod.split('.')[1];
  return parca === '0' ? 'H' : parca;
}

async function projeKonulari() {
  const konular = [];
  for (const dosya of MUFREDAT) {
    const metin = await readFile(path.join(PROJE_KOKU, 'src', 'curriculum', dosya), 'utf8');
    // Konular temaların içinde sıralanır: her konuya kendinden önceki son tema adı verilir
    const temalar = [...metin.matchAll(TEMA_DESENI)];
    for (const eslesme of metin.matchAll(KONU_DESENI)) {
      const [, id, baslik, kod] = eslesme;
      const oncekiTema = temalar.filter((t) => t.index < eslesme.index).pop();
      konular.push({
        id,
        baslik,
        kod,
        sinif: sinifKodu(kod),
        tema: oncekiTema ? temaAdi(oncekiTema[1]) : '',
        temaGovde: govdeler(oncekiTema ? temaAdi(oncekiTema[1]) : ''),
        govde: govdeler(baslik),
        uclu: ucluler(baslik),
      });
    }
  }
  return konular;
}

async function mebKazanimlari() {
  const ham = JSON.parse(await readFile(KAZANIM_METINLERI, 'utf8'));
  const kazanimlar = new Map();
  for (const [kod, veri] of Object.entries(ham)) {
    kazanimlar.set(kod, {
      kod,
      metin: veri.metin,
      sinif: String(veri.sinif).startsWith('Haz') ? 'H' : String(veri.sinif),
      unite: veri.unite,
      tema: temaAdi(veri.unite),
      temaGovde: govdeler(temaAdi(veri.unite)),
      govde: govdeler(veri.metin),
      uclu: ucluler(veri.metin),
    });
  }
  return kazanimlar;
}

/** Dosya adı → kapsadığı kazanım kodları (`MAT.5.3.1+MAT.5.3.2-a.html` → iki kod). */
function dosyaKodlari(ad) {
  const eslesme = DOSYA_DESENI.exec(ad);
  return eslesme ? eslesme[1].split('+') : null;
}

/**
 * Aktarılacak sayfalar. Üretim panelinde bu uygulama için bir proje tutuluyorsa
 * (`veri/projeler.json`, varsayılan «geoeba») YALNIZ o projenin içerikleri alınır; çöp
 * kutusuna atılanlar alınmaz. Proje dosyası ya da proje yoksa klasördeki bütün
 * matematik sayfaları alınır.
 */
async function icerikSayfalari() {
  let adlar = null;
  let kaynakAciklama = `${KAYNAK} (bütün MAT sayfaları)`;
  try {
    const projeler = JSON.parse(await readFile(PROJE_LISTESI, 'utf8'));
    const proje = (projeler.projeler || []).find((p) => p.ad === PROJE_ADI || p.id === PROJE_ADI);
    if (proje) {
      const cop = new Set(Object.keys(projeler.cop || {}));
      adlar = (proje.icerikler || []).filter((ad) => !cop.has(ad));
      kaynakAciklama = `«${proje.ad}» projesi (${adlar.length} içerik, çöptekiler hariç)`;
    } else {
      console.warn(`Uyarı: «${PROJE_ADI}» projesi bulunamadı, klasördeki bütün MAT sayfaları alınıyor.`);
    }
  } catch {
    // proje dosyası yok: klasörün tamamı
  }
  if (!adlar) {
    adlar = (await readdir(KAYNAK, { withFileTypes: true })).filter((g) => g.isFile()).map((g) => g.name);
  }

  const sayfalar = [];
  const eksik = [];
  for (const ad of [...new Set(adlar)]) {
    const kodlar = dosyaKodlari(ad);
    if (!kodlar) continue;
    const kaynakYolu = path.join(KAYNAK, ad);
    let bilgi;
    try {
      bilgi = await stat(kaynakYolu);
    } catch {
      eksik.push(ad);
      continue;
    }
    sayfalar.push({ ad, kodlar, kaynakYolu, boyut: bilgi.size, degisim: bilgi.mtimeMs });
  }
  return { sayfalar, eksik, kaynakAciklama };
}

/** Sayfanın `<title>`ı: «MAT.5.3.2 — Temel geometrik…» → kazanım metni (kazanım listesinde olmayan kodlar için). */
async function sayfaBasligi(kaynakYolu) {
  try {
    const bas = (await readFile(kaynakYolu, 'utf8')).slice(0, 4000);
    const baslik = /<title>([^<]*)<\/title>/i.exec(bas)?.[1] ?? '';
    return baslik.replace(/^[^—-]*[—-]\s*/, '').trim();
  } catch {
    return '';
  }
}

/**
 * Ortaklaştırılacak blok: yalnız ÖZNİTELİKSİZ `<script>` ve `<style>` (tür belirten, veri ya da
 * importmap taşıyan bloklara dokunulmaz) ve ORTAK_ESIK karakterden büyük olanlar. Dış betik
 * satır içi betikle aynı sırada ve aynı biçimde (ayrıştırıcıyı durdurarak) çalışır.
 */
const ORTAK_KLASORU = 'ortak';
const ORTAK_ESIK = 20000;
const BUYUK_BLOK = /<(script|style)>([\s\S]*?)<\/\1>/gi;
const ozet = (metin) => createHash('sha1').update(metin, 'utf8').digest('hex').slice(0, 16);

/** Dosya içeriği aynıysa yazılmaz (git ve yayın gereksiz değişiklik görmesin). */
async function degistiyseYaz(yol, icerik) {
  try {
    if ((await readFile(yol, 'utf8')) === icerik) return false;
  } catch {
    // dosya yok
  }
  await writeFile(yol, icerik, 'utf8');
  return true;
}

/** Konunun tema süzgeci: kazanımın temasıyla aynı (ya da çok benzer) temadaki konular. */
function temadaMi(konu, kazanim) {
  return kazanim.tema !== '' && (konu.tema === kazanim.tema || dice(konu.temaGovde, kazanim.temaGovde) >= TEMA_ESIGI);
}

const kodSirasi = (a, b) => a.localeCompare(b, 'tr', { numeric: true });

async function main() {
  let toplanan;
  try {
    toplanan = await icerikSayfalari();
  } catch {
    console.error(`Kaynak klasör okunamadı: ${KAYNAK}`);
    console.error('İçerik üreticisi başka bir yerdeyse KAZANIM_KAYNAK ile yolu verin.');
    process.exit(1);
  }
  const { sayfalar, eksik, kaynakAciklama } = toplanan;
  if (sayfalar.length === 0) {
    console.error(`${kaynakAciklama} içinde matematik içeriği (MAT.*.html) bulunamadı.`);
    process.exit(1);
  }

  const konular = await projeKonulari();
  const kazanimlar = await mebKazanimlari();
  let elle = {};
  try {
    elle = JSON.parse(await readFile(ELLE_ESLEMELER, 'utf8'));
  } catch {
    // düzeltme dosyası yok
  }
  const konuKodla = new Map(konular.map((k) => [k.kod, k]));

  // Kazanım listesinde olmayan kodlar sayfanın kendi başlığıyla tanımlanır
  const sayfaKazanimi = async (sayfa, kod) => {
    const hazir = kazanimlar.get(kod);
    if (hazir) return hazir;
    const metin = await sayfaBasligi(sayfa.kaynakYolu);
    return {
      kod,
      metin,
      sinif: sinifKodu(kod),
      unite: '',
      tema: '',
      temaGovde: new Set(),
      govde: govdeler(metin),
      uclu: ucluler(metin),
    };
  };

  // 1) HER SAYFA bir konuya atanır (sayfa → konu). Eskiden yön tersti (her konu için tek
  //    sayfa seçiliyordu): konular sayfalardan az olduğundan ve bazı konular aynı sayfayı
  //    seçtiğinden üretilen içeriklerin bir kısmı uygulamada hiç görünmüyordu.
  //    Sayfa, kendi sınıfındaki konular arasında (önce aynı temadakiler) başlığı kazanım
  //    metnine en çok benzeyen konuya gider; birden çok kazanımlı sayfada en iyi kod sayılır.
  const konuIcerikleri = new Map(); // konu.kod → [{ sayfa, kazanim, skor, temali, atama }]
  const atamalar = [];
  const atanamayan = [];
  const elleUygulanan = [];
  for (const sayfa of sayfalar) {
    let enIyi = null;
    const elleKonu = konuKodla.get(elle[sayfa.ad]);
    if (elleKonu) {
      const kazanim = await sayfaKazanimi(sayfa, sayfa.kodlar[0]);
      const kayit = { sayfa, kazanim, skor: benzerlik(elleKonu, kazanim), temali: temadaMi(elleKonu, kazanim), atama: 'elle' };
      if (!konuIcerikleri.has(elleKonu.kod)) konuIcerikleri.set(elleKonu.kod, []);
      konuIcerikleri.get(elleKonu.kod).push(kayit);
      elleUygulanan.push(sayfa.ad);
      continue;
    }
    for (const kod of sayfa.kodlar) {
      const kazanim = await sayfaKazanimi(sayfa, kod);
      const sinifKonulari = konular.filter((k) => k.sinif === kazanim.sinif);
      const temadakiler = sinifKonulari.filter((k) => temadaMi(k, kazanim));
      const temali = temadakiler.length > 0;
      for (const konu of temali ? temadakiler : sinifKonulari) {
        const skor = benzerlik(konu, kazanim);
        if (!enIyi || skor > enIyi.skor) enIyi = { konu, kazanim, skor, temali };
      }
    }
    if (!enIyi) {
      atanamayan.push(sayfa.ad);
      continue;
    }
    const kayit = { sayfa, kazanim: enIyi.kazanim, skor: enIyi.skor, temali: enIyi.temali, atama: 'ana' };
    if (!konuIcerikleri.has(enIyi.konu.kod)) konuIcerikleri.set(enIyi.konu.kod, []);
    konuIcerikleri.get(enIyi.konu.kod).push(kayit);
    atamalar.push({ konu: enIyi.konu, ...kayit });
  }

  // 2) Kendisine sayfa düşmeyen konular, eskisi gibi kendi temasındaki en benzer kazanımın
  //    sayfasını «yakın içerik» olarak gösterir (sınır altındaysa boş kalır).
  const kodaSayfa = new Map();
  for (const sayfa of sayfalar) {
    for (const kod of sayfa.kodlar) {
      const onceki = kodaSayfa.get(kod);
      if (!onceki || sayfa.kodlar.length < onceki.kodlar.length || (sayfa.kodlar.length === onceki.kodlar.length && sayfa.degisim > onceki.degisim)) {
        kodaSayfa.set(kod, sayfa);
      }
    }
  }
  const icerigiOlmayanKonular = [];
  for (const konu of konular) {
    if (konuIcerikleri.has(konu.kod)) continue;
    const sinifKazanimlari = [...kazanimlar.values()].filter((k) => k.sinif === konu.sinif && kodaSayfa.has(k.kod));
    const temadakiler = sinifKazanimlari.filter((k) => temadaMi(konu, k));
    const temali = temadakiler.length > 0;
    let enIyi = null;
    for (const kazanim of temali ? temadakiler : sinifKazanimlari) {
      const skor = benzerlik(konu, kazanim);
      if (!enIyi || skor > enIyi.skor) enIyi = { kazanim, skor };
    }
    if (enIyi && enIyi.skor >= (temali ? ESIK_TEMALI : ESIK_TEMASIZ)) {
      konuIcerikleri.set(konu.kod, [
        { sayfa: kodaSayfa.get(enIyi.kazanim.kod), kazanim: enIyi.kazanim, skor: enIyi.skor, temali, atama: 'yakin' },
      ]);
    } else {
      icerigiOlmayanKonular.push(konu);
    }
  }

  await mkdir(path.join(HEDEF, ORTAK_KLASORU), { recursive: true });
  const aktarilacak = sayfalar.filter((sayfa) => !atanamayan.includes(sayfa.ad));

  // 1. geçiş: hangi büyük blok kaç sayfada geçiyor
  const blokSayfaSayisi = new Map();
  for (const sayfa of aktarilacak) {
    const gorulen = new Set();
    for (const [, , govde] of (await readFile(sayfa.kaynakYolu, 'utf8')).matchAll(BUYUK_BLOK)) {
      if (govde.length >= ORTAK_ESIK) gorulen.add(ozet(govde));
    }
    for (const o of gorulen) blokSayfaSayisi.set(o, (blokSayfaSayisi.get(o) || 0) + 1);
  }

  // 2. geçiş: en az iki sayfada geçen bloklar ortak dosyaya, sayfa bağlantıya döner
  let yazilan = 0;
  let ayni = 0;
  let kaynakBayt = 0;
  let hedefBayt = 0;
  const aktarilan = new Set();
  const kullanilanOrtak = new Set();
  for (const sayfa of aktarilacak) {
    aktarilan.add(sayfa.ad);
    const metin = await readFile(sayfa.kaynakYolu, 'utf8');
    const ortaklar = [];
    const donusmus = metin.replace(BUYUK_BLOK, (tum, etiket, govde) => {
      if (govde.length < ORTAK_ESIK) return tum;
      const o = ozet(govde);
      if ((blokSayfaSayisi.get(o) || 0) < 2) return tum;
      const stil = etiket.toLowerCase() === 'style';
      const ad = `${o}.${stil ? 'css' : 'js'}`;
      ortaklar.push({ ad, govde });
      const adres = `${ORTAK_KLASORU}/${ad}`;
      return stil ? `<link rel="stylesheet" href="${adres}">` : `<script src="${adres}"></script>`;
    });
    for (const { ad, govde } of ortaklar) {
      if (kullanilanOrtak.has(ad)) continue;
      kullanilanOrtak.add(ad);
      await degistiyseYaz(path.join(HEDEF, ORTAK_KLASORU, ad), govde);
    }
    if (await degistiyseYaz(path.join(HEDEF, sayfa.ad), donusmus)) yazilan++;
    else ayni++;
    kaynakBayt += Buffer.byteLength(metin, 'utf8');
    hedefBayt += Buffer.byteLength(donusmus, 'utf8');
  }
  for (const ad of kullanilanOrtak) {
    hedefBayt += (await stat(path.join(HEDEF, ORTAK_KLASORU, ad))).size;
  }

  // Artık projede olmayan (ya da çöpe atılan) eski sayfalar ve kullanılmayan ortak dosyalar
  // silinir (klasörü bu betik yönetir)
  let silinen = 0;
  for (const girdi of await readdir(HEDEF, { withFileTypes: true })) {
    if (!girdi.isFile() || !girdi.name.endsWith('.html') || aktarilan.has(girdi.name)) continue;
    await rm(path.join(HEDEF, girdi.name));
    silinen++;
  }
  for (const girdi of await readdir(path.join(HEDEF, ORTAK_KLASORU), { withFileTypes: true })) {
    if (!girdi.isFile() || kullanilanOrtak.has(girdi.name)) continue;
    await rm(path.join(HEDEF, ORTAK_KLASORU, girdi.name));
    silinen++;
  }

  const icerikKaydi = ({ sayfa, kazanim, skor, temali, atama }) => ({
    dosya: sayfa.ad,
    kazanimKodu: sayfa.kodlar.length > 1 ? sayfa.kodlar.join(' + ') : kazanim.kod,
    kazanimMetni: kazanim.metin,
    unite: kazanim.unite,
    temaEslesti: temali,
    skor: Number(skor.toFixed(3)),
    atama,
    boyut: sayfa.boyut,
    uretim: new Date(sayfa.degisim).toISOString(),
  });

  // Konu kodu → içerikler (ilk içeriğin alanları eski tek içerikli biçimle uyum için tepede de durur)
  const liste = {};
  const konuKaydi = konuKodla;
  for (const kod of [...konuIcerikleri.keys()].sort(kodSirasi)) {
    const konu = konuKaydi.get(kod);
    const icerikler = konuIcerikleri
      .get(kod)
      .sort((a, b) => kodSirasi(a.sayfa.ad, b.sayfa.ad))
      .map(icerikKaydi);
    liste[kod] = { konuId: konu.id, konuBasligi: konu.baslik, ...icerikler[0], icerikler };
  }

  await writeFile(
    LISTE,
    `${JSON.stringify({ guncellendi: new Date().toISOString(), kaynak: kaynakAciklama, kazanimlar: liste }, null, 2)}\n`,
    'utf8',
  );

  const zayiflar = atamalar
    .filter((a) => a.skor < ZAYIF)
    .map((a) => ({
      dosya: a.sayfa.ad,
      konuKodu: a.konu.kod,
      konuBasligi: a.konu.baslik,
      kazanimMetni: a.kazanim.metin,
      temaEslesti: a.temali,
      skor: Number(a.skor.toFixed(3)),
    }))
    .sort((a, b) => a.skor - b.skor);
  const cokIcerikli = [...konuIcerikleri.entries()]
    .filter(([, l]) => l.length > 1)
    .map(([kod, l]) => ({ konuKodu: kod, konuBasligi: konuKaydi.get(kod).baslik, dosyalar: l.map((x) => x.sayfa.ad) }));

  await writeFile(
    RAPOR,
    `${JSON.stringify(
      {
        guncellendi: new Date().toISOString(),
        kaynak: kaynakAciklama,
        sayfaSayisi: sayfalar.length,
        konuSayisi: konular.length,
        icerikliKonu: konuIcerikleri.size,
        zayifAtamalar: zayiflar,
        cokIcerikliKonular: cokIcerikli,
        icerigiOlmayanKonular: icerigiOlmayanKonular.map((k) => ({ kod: k.kod, baslik: k.baslik, tema: k.tema })),
        elleAtanan: elleUygulanan.map((ad) => ({ dosya: ad, konuKodu: elle[ad] })),
        gecersizElleEslemeler: Object.entries(elle).filter(([ad, kod]) => !konuKodla.has(kod) || !sayfalar.some((x) => x.ad === ad)),
        atanamayanSayfalar: atanamayan,
        kaynaktaBulunamayan: eksik,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );

  const mb = (b) => (b / 1024 / 1024).toFixed(1);
  const yakin = [...konuIcerikleri.values()].filter((l) => l[0].atama === 'yakin').length;
  console.log(`Kaynak: ${kaynakAciklama}`);
  console.log(
    `Sayfa: ${aktarilan.size}/${sayfalar.length} konuya atandı · ${yazilan} yazıldı · ${ayni} güncel · ${silinen} silindi` +
      (elleUygulanan.length ? ` · ${elleUygulanan.length} elle` : '') +
      (atanamayan.length ? ` · ${atanamayan.length} ATANAMADI` : '') +
      (eksik.length ? ` · ${eksik.length} kaynakta yok` : ''),
  );
  console.log(
    `Konu: ${konuIcerikleri.size}/${konular.length} içerikli (${yakin} yakın içerikle) · ${cokIcerikli.length} konuda birden çok içerik · ${icerigiOlmayanKonular.length} boş · ${zayiflar.length} zayıf atama`,
  );
  console.log(
    `Boyut: ${mb(kaynakBayt)} MB tek parça → ${mb(hedefBayt)} MB (${kullanilanOrtak.size} ortak dosya ${ORTAK_KLASORU}/ altında)`,
  );
  console.log(`Liste: ${path.relative(PROJE_KOKU, LISTE)} · Rapor: ${path.relative(PROJE_KOKU, RAPOR)}`);
}

await main();

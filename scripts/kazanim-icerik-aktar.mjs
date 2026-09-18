/**
 * Üretim panelinin (localhost:8765) ürettiği matematik içeriklerini projeye aktarır.
 *
 * Kaynak: içerik üreticisinin `cikti` klasörü — dosya adı MEB kazanım kodlarından oluşur
 * (`MAT.5.1.1-a.html`, birden çok kazanımı kapsayan sayfalarda `MAT.5.3.1+MAT.5.3.2-a.html`).
 * Sayfalar tek parça HTML'dir (görsel/ses/script gömülü), bu yüzden kopyalamak yeterlidir.
 *
 * Eşleştirme koda göre YAPILAMAZ: projedeki müfredat verisi üniteleri MEB'den farklı
 * sıralar (projede MAT.5.1 = Geometrik Şekiller, MEB'de MAT.5.1 = Sayılar ve Nicelikler).
 * Tema adları ise iki tarafta da aynıdır; bu yüzden önce sınıf + tema eşleştirilir, sonra
 * o temanın kazanımları içinde konu başlığına en çok benzeyen kazanım seçilir.
 *
 * Çıktılar (public/kazanim-icerikleri/, git dışında):
 *   - eşleşen içerik sayfaları
 *   - liste.json           → proje konu kodu → sayfa + eşleştiği MEB kazanımı
 *   - eslesme-raporu.json  → zayıf eşleşmeler ve eşleşmeyenler (gözden geçirmek için)
 *
 * Yeni içerik üretildikçe yeniden çalıştırılır: `npm run kazanim:aktar`
 * Başka bir kaynak klasör için: `KAZANIM_KAYNAK=... npm run kazanim:aktar`
 */

import { copyFile, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJE_KOKU = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VARSAYILAN_KAYNAK = 'C:\\Users\\HP\\Desktop\\icerik_gelistirme_yeni - Kopya\\cikti';
const KAYNAK = process.env.KAZANIM_KAYNAK || VARSAYILAN_KAYNAK;
const HEDEF = path.join(PROJE_KOKU, 'public', 'kazanim-icerikleri');
const LISTE = path.join(HEDEF, 'liste.json');
const RAPOR = path.join(HEDEF, 'eslesme-raporu.json');
/** MEB kazanım metinleri (üreticinin veri tabanından bir kez dışa aktarıldı). */
const KAZANIM_METINLERI = path.join(PROJE_KOKU, 'scripts', 'veri', 'kazanim-metinleri.json');
const MUFREDAT = ['ilkokulData.ts', 'ortaokulData.ts', 'liseData.ts'];

/** `MAT.<sınıf>.<ünite>.<kazanım>` kodlarından oluşan içerik sayfaları. */
const DOSYA_DESENI = /^(MAT\.[0-9]+\.[0-9]+\.[0-9]+(?:\+MAT\.[0-9]+\.[0-9]+\.[0-9]+)*)-a\.html$/;
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

/** Konu başlığının kazanım metninde ne kadar geçtiği; kısa başlıklar Dice'ta hep düşük kalır. */
function kapsam(a, b) {
  if (a.size === 0) return 0;
  let ortak = 0;
  for (const x of a) if (b.has(x)) ortak++;
  return ortak / a.size;
}

/** Konu başlığı ile kazanım metninin benzerliği: ortak sözcükler ve başlığın kapsanması. */
function benzerlik(konu, kazanim) {
  return (
    0.4 * dice(konu.govde, kazanim.govde) +
    0.4 * kapsam(konu.govde, kazanim.govde) +
    0.2 * dice(konu.uclu, kazanim.uclu)
  );
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

/** Kazanım kodu → o kazanımı anlatan sayfa (tek kazanımlık sayfa yeğlenir, eşitlikte en yeni). */
async function icerikSayfalari() {
  const girdiler = await readdir(KAYNAK, { withFileTypes: true });
  const sayfalar = new Map();

  for (const girdi of girdiler) {
    if (!girdi.isFile()) continue;
    const eslesme = DOSYA_DESENI.exec(girdi.name);
    if (!eslesme) continue;

    const kodlar = eslesme[1].split('+');
    const kaynakYolu = path.join(KAYNAK, girdi.name);
    const bilgi = await stat(kaynakYolu);
    const kayit = { ad: girdi.name, kodlar, kaynakYolu, boyut: bilgi.size, degisim: bilgi.mtimeMs };

    for (const kod of kodlar) {
      const onceki = sayfalar.get(kod);
      const dahaDar = !onceki || kayit.kodlar.length < onceki.kodlar.length;
      const esitVeYeni =
        onceki && kayit.kodlar.length === onceki.kodlar.length && kayit.degisim > onceki.degisim;
      if (dahaDar || esitVeYeni) sayfalar.set(kod, kayit);
    }
  }
  return sayfalar;
}

/** Hedefte aynı boyutta ve kaynaktan yeni bir dosya varsa kopyalama atlanır. */
async function kopyalamaGerekli(kayit, hedefYolu) {
  try {
    const hedefBilgi = await stat(hedefYolu);
    return hedefBilgi.size !== kayit.boyut || hedefBilgi.mtimeMs < kayit.degisim;
  } catch {
    return true;
  }
}

async function main() {
  let sayfalar;
  try {
    sayfalar = await icerikSayfalari();
  } catch {
    console.error(`Kaynak klasör okunamadı: ${KAYNAK}`);
    console.error('İçerik üreticisi başka bir yerdeyse KAZANIM_KAYNAK ile yolu verin.');
    process.exit(1);
  }
  if (sayfalar.size === 0) {
    console.error(`${KAYNAK} içinde matematik içeriği (MAT.*-a.html) bulunamadı.`);
    process.exit(1);
  }

  const konular = await projeKonulari();
  const kazanimlar = await mebKazanimlari();

  // Her proje konusu, önce kendi temasındaki kazanımlar arasında aranır; tema tutmuyorsa
  // sınıfın tamamına bakılır ama sınır yükselir. Bir kazanım sayfası birden çok konuya
  // karşılık gelebilir (proje konuları kazanımlardan daha ince bölünmüş).
  const eslesmeler = [];
  const eslesmeyen = [];
  for (const konu of konular) {
    const sinifKazanimlari = [...kazanimlar.values()].filter(
      (k) => k.sinif === konu.sinif && sayfalar.has(k.kod),
    );
    const temadakiler = sinifKazanimlari.filter(
      (k) => k.tema === konu.tema || dice(k.temaGovde, konu.temaGovde) >= TEMA_ESIGI,
    );
    const temali = temadakiler.length > 0;
    const adaylar = temali ? temadakiler : sinifKazanimlari;

    let enIyi = null;
    for (const kazanim of adaylar) {
      const skor = benzerlik(konu, kazanim);
      if (!enIyi || skor > enIyi.skor) enIyi = { kazanim, skor, temali };
    }

    const esik = temali ? ESIK_TEMALI : ESIK_TEMASIZ;
    if (enIyi && enIyi.skor >= esik) eslesmeler.push({ konu, ...enIyi });
    else eslesmeyen.push({ konu, temali, enIyiSkor: enIyi ? Number(enIyi.skor.toFixed(3)) : 0 });
  }

  await mkdir(HEDEF, { recursive: true });

  const gerekli = new Map();
  for (const { kazanim } of eslesmeler) {
    const sayfa = sayfalar.get(kazanim.kod);
    gerekli.set(sayfa.ad, sayfa);
  }

  let kopyalanan = 0;
  let atlanan = 0;
  let aktarilanBayt = 0;
  for (const sayfa of gerekli.values()) {
    const hedefYolu = path.join(HEDEF, sayfa.ad);
    if (await kopyalamaGerekli(sayfa, hedefYolu)) {
      await copyFile(sayfa.kaynakYolu, hedefYolu);
      kopyalanan++;
      aktarilanBayt += sayfa.boyut;
    } else {
      atlanan++;
    }
  }

  // Artık hiçbir konuya karşılık gelmeyen eski sayfalar silinir (klasörü bu betik yönetir)
  let silinen = 0;
  for (const girdi of await readdir(HEDEF, { withFileTypes: true })) {
    if (!girdi.isFile() || !girdi.name.endsWith('.html') || gerekli.has(girdi.name)) continue;
    await rm(path.join(HEDEF, girdi.name));
    silinen++;
  }

  const liste = {};
  for (const { konu, kazanim, skor, temali } of eslesmeler.sort((a, b) => a.konu.kod.localeCompare(b.konu.kod))) {
    const sayfa = sayfalar.get(kazanim.kod);
    liste[konu.kod] = {
      konuId: konu.id,
      konuBasligi: konu.baslik,
      dosya: sayfa.ad,
      kazanimKodu: kazanim.kod,
      kazanimMetni: kazanim.metin,
      unite: kazanim.unite,
      temaEslesti: temali,
      skor: Number(skor.toFixed(3)),
      boyut: sayfa.boyut,
      uretim: new Date(sayfa.degisim).toISOString(),
    };
  }

  await writeFile(
    LISTE,
    `${JSON.stringify({ guncellendi: new Date().toISOString(), kaynak: KAYNAK, kazanimlar: liste }, null, 2)}\n`,
    'utf8',
  );

  const zayiflar = Object.entries(liste)
    .filter(([, k]) => k.skor < ZAYIF)
    .map(([kod, k]) => ({
      konuKodu: kod,
      konuBasligi: k.konuBasligi,
      kazanimKodu: k.kazanimKodu,
      kazanimMetni: k.kazanimMetni,
      temaEslesti: k.temaEslesti,
      skor: k.skor,
    }))
    .sort((a, b) => a.skor - b.skor);
  const icerigiOlmayan = [...kazanimlar.values()]
    .filter((k) => !sayfalar.has(k.kod))
    .map((k) => k.kod);

  await writeFile(
    RAPOR,
    `${JSON.stringify(
      {
        guncellendi: new Date().toISOString(),
        konuSayisi: konular.length,
        eslesen: eslesmeler.length,
        zayifEslesmeler: zayiflar,
        eslesmeyenKonular: eslesmeyen.map((e) => ({
          kod: e.konu.kod,
          baslik: e.konu.baslik,
          tema: e.konu.tema,
          temaEslesti: e.temali,
          enIyiSkor: e.enIyiSkor,
        })),
        icerigiUretilmemisKazanimlar: icerigiOlmayan,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );

  const mb = (aktarilanBayt / 1024 / 1024).toFixed(1);
  console.log(`Kaynak: ${KAYNAK}`);
  console.log(`Eşleşme: ${eslesmeler.length}/${konular.length} konu · ${zayiflar.length} zayıf · ${eslesmeyen.length} eşleşmedi`);
  console.log(`Sayfa: ${gerekli.size} dosya · ${kopyalanan} kopyalandı (${mb} MB) · ${atlanan} güncel · ${silinen} silindi`);
  console.log(`Liste: ${path.relative(PROJE_KOKU, LISTE)} · Rapor: ${path.relative(PROJE_KOKU, RAPOR)}`);
}

await main();

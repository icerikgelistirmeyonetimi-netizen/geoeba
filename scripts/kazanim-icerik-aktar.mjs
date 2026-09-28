/**
 * Üretim panelinin (localhost:8765) ürettiği matematik içeriklerini projeye aktarır.
 *
 * Kaynak: içerik üreticisinin `cikti` klasörü — dosya adı kazanım kodlarından oluşur
 * (`MAT.5.1.1-a.html`, birden çok kazanımı kapsayan sayfalarda `MAT.5.3.1+MAT.5.3.2-a.html`).
 * Sayfalar tek parça HTML'dir (görsel/ses/script gömülü), bu yüzden kopyalamak yeterlidir.
 *
 * Hangi sayfalar: üretim panelinde bu uygulama için tutulan proje (`veri/projeler.json`,
 * varsayılan «geoeba»; çöp kutusundakiler hariç). Proje yoksa klasördeki bütün MAT sayfaları.
 *
 * Eşleştirme: uygulamadaki her konu, öğretim programının bir İÇERİK ÇERÇEVESİdir (İlkokul,
 * Ortaokul ve Lise «tema ve içerik çerçevesi» belgeleriyle birebir aynı liste). Hangi çerçevenin
 * hangi MEB öğrenme çıktısına düştüğü `scripts/veri/cerceve-kazanim-eslemesi.json` tablosunda
 * tutulur (MEB'in güncel ünite verisinden: içerik çerçevesi sırası, süreç bileşenleri,
 * öğrenme-öğretme uygulamaları). Sayfanın güncel kodu sayfanın `<title>` etiketinden okunur;
 * dosya adları üretimdeki ESKİ koddur (ör. `MAT.10.4.1-a.html` = güncel MAT.10.1.1). Bir çerçeve
 * birden çok sayfa, bir sayfa birden çok çerçeve taşıyabilir. Kazanımının sayfası olmayan
 * çerçeve BOŞ kalır (başka sınıfın ya da başka kazanımın sayfası tahminle gösterilmez) ve
 * raporda, varsa çöpteki sayfasıyla birlikte listelenir.
 *
 * Çıktılar (public/kazanim-icerikleri/):
 *   - projenin bütün içerik sayfaları; sayfalar arasında birebir tekrar eden büyük gömülü
 *     betik/stil blokları (three.js, MathJax, RAPIER, dönüt sesleri, şablon CSS'i…) bir kez
 *     `ortak/<özet>.js|css` olarak yazılır ve sayfa oraya bağlanır. Tek parça sayfalar
 *     kopyalandığında 283 sayfa 930 MB tutuyordu (GitHub Pages sınırı 1 GB); ortaklaştırınca
 *     ~110 MB. Kaynak sayfalar değişmez, dönüşüm yalnız bu kopyalardadır.
 *   - liste.json           → proje konu kodu → içerikler[] (+ ilk içerik eski alanlarla)
 *   - eslesme-raporu.json  → boş çerçeveler, çerçevesiz sayfalar, tabloda olmayan konular
 *
 * Yeni içerik üretildikçe yeniden çalıştırılır: `npm run kazanim:aktar`
 * Müfredata konu eklenirse tabloya da satırı eklenir (rapor: `tablodaOlmayanKonular`).
 * Başka bir kaynak klasör için: `KAZANIM_KAYNAK=... npm run kazanim:aktar`
 * Başka bir proje için: `KAZANIM_PROJE=<ad> npm run kazanim:aktar`
 */

import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJE_KOKU = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VARSAYILAN_KAYNAK = 'C:\\Semih TiRYAKi\\icerik_gelistirme_yeni - Kopya\\cikti';
const KAYNAK = process.env.KAZANIM_KAYNAK || VARSAYILAN_KAYNAK;
/** Üretim panelinin proje listesi (kaynak klasörün kardeşi `veri/projeler.json`). */
const PROJE_LISTESI = process.env.KAZANIM_PROJE_LISTESI || path.join(KAYNAK, '..', 'veri', 'projeler.json');
const PROJE_ADI = process.env.KAZANIM_PROJE || 'geoeba';
const HEDEF = path.join(PROJE_KOKU, 'public', 'kazanim-icerikleri');
const LISTE = path.join(HEDEF, 'liste.json');
const RAPOR = path.join(HEDEF, 'eslesme-raporu.json');
const MUFREDAT = ['ilkokulData.ts', 'ortaokulData.ts', 'liseData.ts'];
/**
 * Çerçeve tablosu: { cerceveler: { "<proje konu kodu>": { cerceve, kazanimlar: ["<MEB güncel kodu>"…] } },
 * kazanimlar: { "<MEB güncel kodu>": { metin, tema } } }. Bir çerçevede birden çok kod varsa
 * ilk kodun sayfası ilk açılır.
 */
const CERCEVE_TABLOSU = path.join(PROJE_KOKU, 'scripts', 'veri', 'cerceve-kazanim-eslemesi.json');

/**
 * `MAT.<sınıf>.<ünite>.<kazanım>` kodlarından oluşan içerik sayfaları (`-a`, `-b`, `-<proje>-a`
 * sonekleri). Hazırlık sınıfının sınıf yeri `H`dir: `MAT.H.1.1-geoeba-a.html`.
 */
const DOSYA_DESENI = /^(MAT\.(?:[0-9]+|H)\.[0-9]+\.[0-9]+(?:\+MAT\.(?:[0-9]+|H)\.[0-9]+\.[0-9]+)*)(?:-[^.]+)?\.html$/;
/** Müfredat verisindeki konu kayıtları: anahtar sırası üç dosyada da aynıdır. */
const KONU_DESENI = /"id":\s*"(topic-[^"]+)",\s*"title":\s*"([^"]+)",\s*"code":\s*"(MAT\.[^"]+)"/g;
/** MEB kazanım kodu (hazırlık sınıfında `MAT.H.1.1`). */
const KOD_DESENI = /MAT\.[0-9A-Z]+\.[0-9]+\.[0-9]+/g;

async function projeKonulari() {
  const konular = [];
  for (const dosya of MUFREDAT) {
    const metin = await readFile(path.join(PROJE_KOKU, 'src', 'curriculum', dosya), 'utf8');
    for (const [, id, baslik, kod] of metin.matchAll(KONU_DESENI)) konular.push({ id, baslik, kod });
  }
  return konular;
}

/** Dosya adı → kapsadığı (eski) kazanım kodları (`MAT.5.3.1+MAT.5.3.2-a.html` → iki kod). */
function dosyaKodlari(ad) {
  const eslesme = DOSYA_DESENI.exec(ad);
  return eslesme ? eslesme[1].split('+') : null;
}

/**
 * Sayfanın `<title>`ı: «MAT.10.1.1 — Dik üçgende…» → güncel kod(lar) ve kazanım metni. Kapak ve
 * başlık güncel müfredattan kurulduğu için asıl kod budur; başlıkta kod yoksa boş döner.
 */
async function sayfaBasligi(kaynakYolu) {
  try {
    const bas = (await readFile(kaynakYolu, 'utf8')).slice(0, 8000);
    const baslik = /<title>([^<]*)<\/title>/i.exec(bas)?.[1] ?? '';
    const [on, ...geri] = baslik.split('—');
    return { kodlar: on.replace(/\s+/g, '').match(KOD_DESENI) ?? [], metin: geri.join('—').trim() };
  } catch {
    return { kodlar: [], metin: '' };
  }
}

/**
 * Aktarılacak sayfalar. Üretim panelinde bu uygulama için bir proje tutuluyorsa
 * (`veri/projeler.json`, varsayılan «geoeba») YALNIZ o projenin içerikleri alınır; çöp
 * kutusuna atılanlar alınmaz (yalnız raporda, boş çerçeveyi doldurabilecek sayfa olarak
 * anılır). Proje dosyası ya da proje yoksa klasördeki bütün matematik sayfaları alınır.
 */
async function icerikSayfalari() {
  let adlar = null;
  let copAdlari = [];
  let kaynakAciklama = `${KAYNAK} (bütün MAT sayfaları)`;
  try {
    const projeler = JSON.parse(await readFile(PROJE_LISTESI, 'utf8'));
    const proje = (projeler.projeler || []).find((p) => p.ad === PROJE_ADI || p.id === PROJE_ADI);
    if (proje) {
      const cop = new Set(Object.keys(projeler.cop || {}));
      adlar = (proje.icerikler || []).filter((ad) => !cop.has(ad));
      copAdlari = (proje.icerikler || []).filter((ad) => cop.has(ad));
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
  const adiTaninmayan = [];
  for (const ad of [...new Set(adlar)]) {
    const kodlar = dosyaKodlari(ad);
    if (!kodlar) {
      // Matematik sayfası gibi görünüp adı kalıba uymayan dosya sessizce düşmesin
      if (ad.startsWith('MAT.') && ad.endsWith('.html')) adiTaninmayan.push(ad);
      continue;
    }
    const kaynakYolu = path.join(KAYNAK, ad);
    let bilgi;
    try {
      bilgi = await stat(kaynakYolu);
    } catch {
      eksik.push(ad);
      continue;
    }
    const baslik = await sayfaBasligi(kaynakYolu);
    sayfalar.push({
      ad,
      kodlar,
      guncelKodlar: baslik.kodlar.length ? baslik.kodlar : kodlar,
      baslikKodlu: baslik.kodlar.length > 0,
      baslikMetni: baslik.metin,
      kaynakYolu,
      boyut: bilgi.size,
      degisim: bilgi.mtimeMs,
    });
  }

  const copSayfalari = [];
  for (const ad of copAdlari) {
    const kodlar = dosyaKodlari(ad);
    if (!kodlar) continue;
    const baslik = await sayfaBasligi(path.join(KAYNAK, ad));
    copSayfalari.push({ ad, guncelKodlar: baslik.kodlar.length ? baslik.kodlar : kodlar });
  }
  return { sayfalar, eksik, adiTaninmayan, kaynakAciklama, copSayfalari };
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
  const { sayfalar, eksik, adiTaninmayan, kaynakAciklama, copSayfalari } = toplanan;
  if (sayfalar.length === 0) {
    console.error(`${kaynakAciklama} içinde matematik içeriği (MAT.*.html) bulunamadı.`);
    process.exit(1);
  }

  let tablo;
  try {
    tablo = JSON.parse(await readFile(CERCEVE_TABLOSU, 'utf8'));
  } catch {
    console.error(`Çerçeve tablosu okunamadı: ${path.relative(PROJE_KOKU, CERCEVE_TABLOSU)}`);
    process.exit(1);
  }
  const cerceveler = tablo.cerceveler ?? {};
  const kazanimBilgisi = tablo.kazanimlar ?? {};
  const konular = await projeKonulari();
  const konuKaydi = new Map(konular.map((k) => [k.kod, k]));

  // Güncel kod → sayfalar (aynı kazanımın sürümleri dosya adına göre: `-a`, `-v2-a` …)
  const kodSayfalari = new Map();
  for (const sayfa of [...sayfalar].sort((a, b) => kodSirasi(a.ad, b.ad))) {
    for (const kod of sayfa.guncelKodlar) {
      if (!kodSayfalari.has(kod)) kodSayfalari.set(kod, []);
      kodSayfalari.get(kod).push(sayfa);
    }
  }
  const copKodlari = new Map();
  for (const sayfa of copSayfalari) {
    for (const kod of sayfa.guncelKodlar) {
      if (!copKodlari.has(kod)) copKodlari.set(kod, []);
      copKodlari.get(kod).push(sayfa.ad);
    }
  }

  // Her çerçeve, tablodaki kazanımlarının sayfalarını tablodaki sırayla taşır
  const konuIcerikleri = new Map(); // konu.kod → sayfa[]
  const bosCerceveler = [];
  const tablodaOlmayanKonular = [];
  const yerlesen = new Set();
  for (const konu of konular) {
    const satir = cerceveler[konu.kod];
    if (!satir) {
      tablodaOlmayanKonular.push({ kod: konu.kod, baslik: konu.baslik });
      continue;
    }
    const kazanimlar = satir.kazanimlar ?? [];
    const secilen = [];
    for (const kod of kazanimlar) {
      for (const sayfa of kodSayfalari.get(kod) ?? []) {
        if (!secilen.includes(sayfa)) secilen.push(sayfa);
      }
    }
    if (secilen.length === 0) {
      bosCerceveler.push({
        kod: konu.kod,
        baslik: konu.baslik,
        kazanimlar,
        copteki: [...new Set(kazanimlar.flatMap((k) => copKodlari.get(k) ?? []))],
      });
      continue;
    }
    for (const sayfa of secilen) yerlesen.add(sayfa.ad);
    konuIcerikleri.set(konu.kod, secilen);
  }
  const tabloFazlasi = Object.keys(cerceveler).filter((kod) => !konuKaydi.has(kod));
  const cercevesizSayfalar = sayfalar
    .filter((sayfa) => !yerlesen.has(sayfa.ad))
    .map((sayfa) => ({ dosya: sayfa.ad, kodlar: sayfa.guncelKodlar }));
  const baslikKodsuzSayfalar = sayfalar.filter((sayfa) => !sayfa.baslikKodlu).map((sayfa) => sayfa.ad);

  await mkdir(path.join(HEDEF, ORTAK_KLASORU), { recursive: true });

  // 1. geçiş: hangi büyük blok kaç sayfada geçiyor
  const blokSayfaSayisi = new Map();
  for (const sayfa of sayfalar) {
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
  for (const sayfa of sayfalar) {
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

  // Sayfa kaydı: kod, sayfanın kapağında görünen güncel koddur
  const icerikKaydi = (sayfa) => {
    const bilgi = kazanimBilgisi[sayfa.guncelKodlar[0]];
    return {
      dosya: sayfa.ad,
      kazanimKodu: sayfa.guncelKodlar.join(' + '),
      kazanimMetni: bilgi?.metin ?? sayfa.baslikMetni,
      unite: bilgi?.tema ?? '',
      boyut: sayfa.boyut,
      uretim: new Date(sayfa.degisim).toISOString(),
    };
  };

  // Konu kodu → içerikler (ilk içeriğin alanları eski tek içerikli biçimle uyum için tepede de durur)
  const liste = {};
  for (const kod of [...konuIcerikleri.keys()].sort(kodSirasi)) {
    const konu = konuKaydi.get(kod);
    const icerikler = konuIcerikleri.get(kod).map(icerikKaydi);
    liste[kod] = { konuId: konu.id, konuBasligi: konu.baslik, ...icerikler[0], icerikler };
  }

  await writeFile(
    LISTE,
    `${JSON.stringify({ guncellendi: new Date().toISOString(), kaynak: kaynakAciklama, kazanimlar: liste }, null, 2)}\n`,
    'utf8',
  );

  const cokIcerikli = [...konuIcerikleri.entries()]
    .filter(([, l]) => l.length > 1)
    .map(([kod, l]) => ({ konuKodu: kod, konuBasligi: konuKaydi.get(kod).baslik, dosyalar: l.map((s) => s.ad) }));

  await writeFile(
    RAPOR,
    `${JSON.stringify(
      {
        guncellendi: new Date().toISOString(),
        kaynak: kaynakAciklama,
        tablo: path.relative(PROJE_KOKU, CERCEVE_TABLOSU).replaceAll('\\', '/'),
        sayfaSayisi: sayfalar.length,
        konuSayisi: konular.length,
        icerikliKonu: konuIcerikleri.size,
        // Kazanımının sayfası yok (üretilmemiş ya da çöpte): çerçeve uygulamada boş görünür
        bosCerceveler,
        // Güncel kodu hiçbir çerçevede geçmeyen sayfa: kopyalanır ama uygulamada listelenmez
        cercevesizSayfalar,
        tablodaOlmayanKonular,
        tabloFazlasi,
        baslikKodsuzSayfalar,
        cokIcerikliKonular: cokIcerikli,
        kaynaktaBulunamayan: eksik,
        // Projede kayıtlı ama adı `MAT.<kod>[-…]-<harf>.html` kalıbına uymadığı için alınmayan
        adiTaninmayanSayfalar: adiTaninmayan,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );

  const mb = (b) => (b / 1024 / 1024).toFixed(1);
  console.log(`Kaynak: ${kaynakAciklama}`);
  console.log(
    `Sayfa: ${yerlesen.size}/${sayfalar.length} çerçeveye bağlandı · ${yazilan} yazıldı · ${ayni} güncel · ${silinen} silindi` +
      (cercevesizSayfalar.length ? ` · ${cercevesizSayfalar.length} ÇERÇEVESİZ` : '') +
      (baslikKodsuzSayfalar.length ? ` · ${baslikKodsuzSayfalar.length} başlığında kod yok` : '') +
      (eksik.length ? ` · ${eksik.length} kaynakta yok` : ''),
  );
  if (adiTaninmayan.length) {
    console.warn(`UYARI: adı tanınmayan ${adiTaninmayan.length} sayfa aktarılmadı: ${adiTaninmayan.join(', ')}`);
  }
  console.log(
    `Çerçeve: ${konuIcerikleri.size}/${konular.length} içerikli · ${cokIcerikli.length} çerçevede birden çok içerik · ${bosCerceveler.length} boş (kazanımının sayfası yok)` +
      (tablodaOlmayanKonular.length ? ` · ${tablodaOlmayanKonular.length} konu TABLODA YOK` : ''),
  );
  for (const bos of bosCerceveler) {
    console.log(
      `  boş: ${bos.kod} ${bos.baslik} ← ${bos.kazanimlar.join(', ')}` + (bos.copteki.length ? ` (çöpte: ${bos.copteki.join(', ')})` : ''),
    );
  }
  console.log(
    `Boyut: ${mb(kaynakBayt)} MB tek parça → ${mb(hedefBayt)} MB (${kullanilanOrtak.size} ortak dosya ${ORTAK_KLASORU}/ altında)`,
  );
  console.log(`Liste: ${path.relative(PROJE_KOKU, LISTE)} · Rapor: ${path.relative(PROJE_KOKU, RAPOR)}`);
}

await main();

import type { MathObject } from '@/types/math';
import { type Clause, type LabelRef, labelKey } from '../text';
import { type CommandScene, fail, trNum } from '../scene';
import type { CommandHandler } from '../types';
import {
  CIZGI_ADLARI, ESITLIK_EN_COK, esitlikHedefleri, esitlikIsaretleri, esitlikOgesiAdi, esitlikYamalari, kenarAnahtari, parcaAnahtari,
  sonrakiEsitlikSayisi, tumElleIsaretleriniTemizle, uzunlukEsit, yayAnahtari,
  type EsitlikGrubu, type EsitlikSonucu, type EsitlikTuru, type EsitlikYamasi,
} from '../../esitlikIsaretleri';

/**
 * EŞİTLİK İŞARETLERİ ailesi (ders kitabı çentikleri |, ||, |||):
 *   - "eşit kenarları işaretle", "eşit yayları işaretle", "eşitlik işaretlerini gizle" → otomatik işaretleri aç/kapa
 *   - "AB ile CD'yi eşit işaretle" → ayrı ayrı öğelere ortak elle işaret
 *   - "AB kenarına iki çizgi koy", "AB'nin eşitlik işaretini kaldır" → tek öğenin elle işareti
 *
 * Kurallar: bu cümleler bugün başka ailelere düşüyordu ("…eşitlik işaretini kaldır" AB'yi SİLİYORDU, "iki çizgi koy" iki
 * parça çiziyordu). Bu yüzden puanlar 93/94'tür ve cümle bir kez sahiplenildiyse skip() değil fail() ile biter.
 * Böl/çiz/eşitle/=/açı cümleleri ve yapım sözcükleri (dik, paralel, …) hiç sahiplenilmez.
 */
export const family = { id: 'marks', title: 'Eşitlik işaretleri' };

// ------------------------------------------------------------------ kalıplar (katlanmış metin)
const ESITLIK_ADI = /\besitlik (?:isaret|centik)\w*/;
const ESIT_ISARET_AD = /\besit (?:isaret|centik)(?:i|ini|leri|lerini|ler)\b/;
const ESIT_OGELER = /\besit(?: olan| uzunlukta(?:ki)?| boyda(?:ki)?)? (?:kenar(?!li\b)|uzunlu[kg]|yay|parca|dogru parca)\w*/;
const ESIT_ISARETLE = /\besit (?:olarak |diye )?isaretle\w*/;
const KOY = /\b(?:koy\w*|at|atin\w*|ekle\w*|isaretle\w*|olsun|yap\w*)\b/;
const AC_GOSTER = /\b(?:isaretle(?!me\b|meyin|meyiniz|nmesin)\w*|goster\w*|belirt\w*|ac|acin\w*|acik|gorunsun)\b/;
const KAPAT = /\b(?:gizle\w*|kapat\w*|kaldir\w*|sil|silin\w*|temizle\w*|yok et\w*|olmasin|istemiyorum|istemem|kalksin|gorunmesin|isaretleme(?:yin|yiniz)?|isaretlenmesin)\b/;
/** "kaldırma", "gizleme" gibi olumsuz emir: ne açılır ne kapanır. */
const OLUMSUZ_KAPAT = /\b(?:kaldirma|gizleme|silme|kapatma|temizleme)(?:yin|yiniz)?\b/;
const SILME = /\b(?:sil|silin\w*|temizle\w*|kaldir\w*)\b/;
const OTOMATIK = /\botomati\w*/;
const ISARETSIZ = /\bisaretsiz\b/;
const TUMU = /\b(?:tum|butun|hepsi\w*)\b/;
const SEKIL_ADI = /\b(?:ucgen|kare(?!li)|dortgen|cokgen|besgen|altigen|daire|cember)\w*/;
const SAYI_ONCE_PARCA = /(?:#\d+|\biki|\buc|\bbir) (?:dogru parca|parca|kenar)/;
/** Başka ailelerin cümleleri: bölme, çizme, eşitleme, ölçü ataması, açı. */
const YABANCI = /=|\b(?:bol(?!ge)\w*|ayir\w*|parcala(?!r)\w*|ciz(?!gi)\w*|olustur\w*|esitle\w*)|\baci(?:\b|lar\w*|si\w*|nin\b|yi\b|ya\b)|\b(?:uzunlug|yaricap)\w* #\d/;
/** "AC'ye dik bir çizgi koy", "bir çizgi daha ekle": yapım/çizim istekleri, çentik değil. */
const YAPIM = /\b(?:dik|paralel|teget\w*|aciortay\w*|kenarortay\w*|yukseklik\w*|orta ?dikme\w*|dogru(?! parca)\w*|isin\w*|daha|nokta\w*|aras[i]n\w*)\b/;
/** "$0 kenarına iki çizgi", "$0ye tek çizgi", "$0 yayına çentik" */
const ETIKETLI_SAYI = /\$(\d+)([a-z]*)((?: (?:dogru )?(?:kenar|parca|yay)[a-z]*)?) (?:(tek|bir|cift|#\d+) )?(cizgi|centik)[a-z]*/;
/** "seçili parçaya iki çizgi" */
const SECILI_SAYI = /\bsecil\w* ((?:dogru )?(?:kenar|parca|yay)[a-z]*) (?:(tek|bir|cift|#\d+) )?(cizgi|centik)[a-z]*/;
const YONELME = new Set(['e', 'a', 'ye', 'ya', 'ne', 'na']);

// ------------------------------------------------------------------ yardımcılar
const benzersiz = <T,>(l: T[]) => [...new Set(l)];
function birlestir(adlar: string[]): string {
  if (adlar.length <= 1) return adlar.join('');
  return `${adlar.slice(0, -1).join(', ')} ve ${adlar[adlar.length - 1]}`;
}
function yamalariUygula(scene: CommandScene, yamalar: EsitlikYamasi[]) {
  for (const y of yamalar) {
    const entries = Object.entries(y.patch);
    const yaz = Object.fromEntries(entries.filter(([, v]) => v !== undefined));
    const sil = entries.filter(([, v]) => v === undefined).map(([k]) => k);
    if (Object.keys(yaz).length) scene.update(y.id, yaz);
    if (sil.length) scene.unset(y.id, sil);
  }
}
const yayOlcumuMu = (o: MathObject) => o.type === 'measurement' && (o as { kind?: string }).kind === 'arc';
const turOf = (anahtar: string): EsitlikTuru => (anahtar.startsWith('arc:') ? 'yay' : 'duz');

/** Etiketten hemen sonraki ad ("$0 yayına", "$0 kenarı") ya da cümlenin geneli: düz mü yay mı isteniyor? */
function tercihOf(c: Clause, index: number, ref: LabelRef): EsitlikTuru | null {
  const m = c.text.match(new RegExp(`\\$${index}[a-z]* ((?:dogru )?(?:yay|kenar|parca)[a-z]*)`));
  if (m) return /^yay/.test(m[1]) ? 'yay' : 'duz';
  if (ref.bracket) return 'duz';
  // Birden çok ad varsa ("AB yayı ile EF'yi …") cümledeki ad yalnız kendi etiketini niteler.
  if (c.labels.length > 1) return null;
  if (/\byay/.test(c.text) && !/\b(?:kenar|parca)/.test(c.text)) return 'yay';
  if (/\b(?:kenar|parca)/.test(c.text)) return 'duz';
  return null;
}

/** Etiketin gösterdiği eşitlik öğeleri (temsilci anahtarlar), türe göre. Hata atmaz. */
function adaylar(scene: CommandScene, sonuc: EsitlikSonucu, ref: LabelRef): { duz: string[]; yay: string[]; cokgen: string[] } {
  const duz: string[] = [], yay: string[] = [], cokgen: string[] = [];
  const key = labelKey(ref.text);
  for (const o of scene.objects) {
    if (o.visible === false) continue;
    const ad = labelKey(o.label || '');
    if (o.type === 'segment' && ad === key) duz.push(parcaAnahtari(o.id));
    else if ((o.type === 'arc' || o.type === 'sector' || yayOlcumuMu(o)) && (ad === key || ad === `${key}yayi`)) yay.push(yayAnahtari(o.id));
  }
  const pts = scene.pointsFromLabel(ref.text);
  if (pts?.length === 2) {
    const h = esitlikHedefleri(scene.objects, pts[0].id, pts[1].id);
    duz.push(...h.duz);
    yay.push(...h.yay);
  } else if (pts && pts.length >= 3 && !ref.bracket) {
    // "ABC'nin eşitlik işaretlerini kaldır": çokgenin tüm kenarları
    for (const o of scene.shapesWithPoints(pts.map((p) => p.id), ['polygon'])) {
      if (o.type !== 'polygon' || o.visible === false) continue;
      o.pointIds.forEach((_, i) => cokgen.push(kenarAnahtari(o.id, i)));
    }
  }
  if (!duz.length && !yay.length && !cokgen.length) {
    for (const o of scene.resolveLabel(ref, ['polygon'])) {
      if (o.type !== 'polygon' || o.visible === false) continue;
      o.pointIds.forEach((_, i) => cokgen.push(kenarAnahtari(o.id, i)));
    }
  }
  const temsil = (l: string[]) => benzersiz(l.filter((a) => sonuc.temsilci.has(a)).map((a) => sonuc.temsilci.get(a)!));
  return { duz: temsil(duz), yay: temsil(yay), cokgen: temsil(cokgen) };
}

/** Etiketin hedef anahtarları; bulunamazsa ya da belirsizse açıklamayla durur. */
function hedefBul(scene: CommandScene, sonuc: EsitlikSonucu, c: Clause, index: number): string[] {
  const ref = c.labels[index];
  const a = adaylar(scene, sonuc, ref);
  const tercih = tercihOf(c, index, ref);
  if (!a.duz.length && !a.yay.length) {
    if (a.cokgen.length && tercih !== 'yay') return a.cokgen;
    fail(`${ref.text} adlı doğru parçası, kenar ya da yay bulunamadı.`);
  }
  let tur: EsitlikTuru;
  if (tercih) tur = tercih;
  else if (a.duz.length && a.yay.length) fail(`Hem [${ref.text}] parçası hem ${ref.text} yayı var. “${ref.text} kenarına …” ya da “${ref.text} yayına …” diye yazın.`);
  else tur = a.duz.length ? 'duz' : 'yay';
  const liste = tur === 'duz' ? a.duz : a.yay;
  if (!liste.length) fail(tur === 'yay' ? `${ref.text} yayı bulunamadı.` : `${ref.text} adlı doğru parçası ya da kenar bulunamadı.`);
  if (tur === 'yay' && liste.length > 1) fail(`${ref.text} uçlu birden çok yay var; yayı adıyla yazın (ör. “${ref.text} Yayı”).`);
  return [liste[0]];
}

/** Seçimdeki (ya da son oluşturulan) işaretlenebilir nesneler. */
function secimHedefleri(scene: CommandScene, sonuc: EsitlikSonucu): string[] {
  const kaynak = scene.selection.length ? scene.selection : scene.focus;
  const anahtarlar: string[] = [];
  for (const id of kaynak) {
    const o = scene.get(id);
    if (!o || o.visible === false) continue;
    if (o.type === 'segment') anahtarlar.push(parcaAnahtari(o.id));
    else if (o.type === 'arc' || o.type === 'sector' || yayOlcumuMu(o)) anahtarlar.push(yayAnahtari(o.id));
    else if (o.type === 'polygon') fail('Çokgenin hangi kenarı? Kenarı adıyla yazın (ör. “AB kenarına iki çizgi koy”).');
  }
  const temsil = benzersiz(anahtarlar.filter((a) => sonuc.temsilci.has(a)).map((a) => sonuc.temsilci.get(a)!));
  if (!temsil.length) fail('Önce işaretlenecek doğru parçasını ya da yayı seçin veya adıyla yazın (ör. “AB kenarına iki çizgi koy”).');
  return temsil;
}

const adlar = (scene: CommandScene, anahtarlar: string[]) => anahtarlar.map((a) => esitlikOgesiAdi(scene.objects, a));

function sayiDegeri(c: Clause, soz: string | undefined, tip: string): number | undefined {
  if (!soz) return tip === 'centik' ? 1 : undefined;
  if (soz === 'tek' || soz === 'bir') return 1;
  if (soz === 'cift') return 2;
  return c.num(soz);
}

/** Etiketli ya da "seçili parçaya" biçiminde sayılı çentik isteği. */
function sayiliIstek(c: Clause): { deger: number; etiketli: boolean; sonrasi: string } | null {
  const m = c.text.match(ETIKETLI_SAYI);
  if (m) {
    const [tum, sira, ek, ad, soz, tip] = m;
    if (!soz && tip === 'cizgi') return null;
    const ref = c.labels[Number(sira)];
    if (!ref) return null;
    const yonelme = ad ? /(?:a|e)$/.test(ad.trim()) : YONELME.has(ek || ref.suffix);
    if (!yonelme) return null;
    const deger = sayiDegeri(c, soz, tip);
    return deger === undefined ? null : { deger, etiketli: true, sonrasi: c.text.slice((m.index ?? 0) + tum.length) };
  }
  const s = c.text.match(SECILI_SAYI);
  if (s && (s[2] || s[3] === 'centik') && /(?:a|e)$/.test(s[1])) {
    const deger = sayiDegeri(c, s[2], s[3]);
    return deger === undefined ? null : { deger, etiketli: false, sonrasi: c.text.slice((s.index ?? 0) + s[0].length) };
  }
  return null;
}

function grupMetni(scene: CommandScene, g: EsitlikGrubu): string {
  const ad = adlar(scene, g.anahtarlar);
  const liste = ad.length > 6 ? `${ad.slice(0, 6).join(' = ')} …` : ad.join(' = ');
  return `${liste}, ${CIZGI_ADLARI[g.sayi]}`;
}

// ------------------------------------------------------------------ 1) aç / kapat
const toggle: CommandHandler = {
  id: 'marks.toggle',
  examples: ['eşit kenarları işaretle', 'eşit uzunlukları işaretle', 'eşit yayları işaretle', 'eşitlik işaretlerini göster',
    'eşitlik işaretlerini gizle', 'eşitlik işaretlerini kaldır', 'tüm eşitlik işaretlerini sil'],
  match(c) {
    const t = c.text;
    if (YABANCI.test(t)) return 0;
    const ad = ESITLIK_ADI.test(t) || ESIT_ISARET_AD.test(t);
    const ogeler = ESIT_OGELER.test(t) && !ESIT_ISARETLE.test(t);
    if (!ad && !ogeler) return 0;
    if (ad && (c.labels.length || c.refersToSelection || c.refersToLast)) return 0; // belirli öğe: marks.set
    if (SAYI_ONCE_PARCA.test(t)) return 0; // "eşit uzunlukta iki doğru parçası göster" ölçmedir
    if (OLUMSUZ_KAPAT.test(t)) return 93; // güvenle reddedilir
    const kapat = KAPAT.test(t);
    if (!kapat && !AC_GOSTER.test(t)) return 0;
    // "eşit kenarlı üçgeni sil", "eşit parçaları sil": nesne silme (düzenleme ailesi)
    if (!ad && kapat && (SEKIL_ADI.test(t) || /\b(?:sil|silin\w*|temizle\w*)\b/.test(t))) return 0;
    return 93;
  },
  run(c, scene) {
    const t = c.text;
    if (OLUMSUZ_KAPAT.test(t)) fail('Olumsuz ifadeyi işlem olarak uygulamadım. Eşitlik işaretlerini kapatmak için “eşitlik işaretlerini gizle”, açmak için “eşit kenarları işaretle” yazın.');
    const kapat = KAPAT.test(t);
    const elle = esitlikIsaretleri(scene.objects, { otomatik: false }).isaretler.length;
    if (kapat) {
      if (TUMU.test(t) && SILME.test(t)) {
        const yamalar = tumElleIsaretleriniTemizle(scene.objects);
        yamalariUygula(scene, yamalar);
        scene.act({ kind: 'viewport', patch: { showEqualityMarks: false } });
        scene.say(elle ? `Eşitlik işaretleri kapatıldı ve elle konan ${elle} işaret kaldırıldı.` : 'Eşitlik işaretleri kapatıldı.');
        return;
      }
      scene.act({ kind: 'viewport', patch: { showEqualityMarks: false } });
      scene.say(`Eşitlik işaretleri kapatıldı.${elle ? ` Elle konan ${elle} işaret duruyor; onları da kaldırmak için “tüm eşitlik işaretlerini sil” yazın.` : ''}`);
      return;
    }
    scene.act({ kind: 'viewport', patch: { showEqualityMarks: true } });
    const yay = /\byay/.test(t) && !/\b(?:kenar|uzunlu|parca)/.test(t);
    const sonuc = esitlikIsaretleri(scene.objects, { otomatik: true });
    let gruplar = sonuc.gruplar.filter((g) => g.tur === (yay ? 'yay' : 'duz'));
    // "ABC'nin eşit kenarlarını işaretle": yalnız o şeklin birleşik grubu
    if (c.labels.length) {
      const bilesenler = new Set<string>();
      for (const ref of c.labels) {
        for (const o of scene.resolveLabel(ref)) {
          for (const og of sonuc.ogeler.values()) if (og.sahipId === o.id) bilesenler.add(og.bilesen);
        }
        const a = adaylar(scene, sonuc, ref);
        for (const k of [...a.duz, ...a.yay, ...a.cokgen]) { const og = sonuc.ogeler.get(k); if (og) bilesenler.add(og.bilesen); }
      }
      if (bilesenler.size) gruplar = gruplar.filter((g) => bilesenler.has(g.bilesen));
    }
    if (!gruplar.length) {
      scene.say(yay
        ? 'Eşitlik işaretleri açık. Birbirine değen şekillerde eşit yay bulunamadı. Çember üzerindeki yaylar için çembere sağ tıklayıp noktalarından yaylara ayırın ya da iki nokta arasındaki yayı ölçün; ayrı yaylar için “AB yayı ile CD yayını eşit işaretle” yazın.'
        : 'Eşitlik işaretleri açık. Birbirine değen şekillerde eşit uzunluk bulunamadı. Ayrı şekiller için “AB ile CD\'yi eşit işaretle” yazın.');
      return;
    }
    const ilk = gruplar.slice(0, 4).map((g) => grupMetni(scene, g)).join('; ');
    const fazla = gruplar.length > 4 ? '; …' : '';
    // Kalabalık gruplar ve dolmuş numaralama alanları sessizce atlanmasın.
    const atlanan = sonuc.atlananGruplar
      ? ` ${sonuc.atlananGruplar} grup işaretlenmedi (çok kalabalık ya da tüm ${ESITLIK_EN_COK} işaret türü kullanılıyor); elle işaretleyebilirsiniz.`
      : '';
    scene.say((yay ? `Eşit yaylar işaretlendi: ${gruplar.length} grup (${ilk}${fazla}).` : `Eşitlik işaretleri açık: ${gruplar.length} grup (${ilk}${fazla}).`) + atlanan);
  },
};

// ------------------------------------------------------------------ 2) ayrı öğeleri eşit işaretle
const equal: CommandHandler = {
  id: 'marks.equal',
  examples: ['AB ile CD\'yi eşit işaretle', 'AB, CD ve EF\'yi eşit işaretle', 'seçili parçaları eşit işaretle', 'AB yayı ile CD yayını eşit işaretle'],
  match(c) {
    const t = c.text;
    if (YABANCI.test(t) || KAPAT.test(t) || !ESIT_ISARETLE.test(t)) return 0;
    if (c.labels.length >= 1 || c.refersToSelection) return 94;
    return 0;
  },
  run(c, scene) {
    const sonuc = esitlikIsaretleri(scene.objects);
    const anahtarlar = benzersiz(c.labels.length ? c.labels.flatMap((_, i) => hedefBul(scene, sonuc, c, i)) : secimHedefleri(scene, sonuc));
    if (anahtarlar.length < 2) fail('Eşit işaretlemek için en az iki farklı doğru parçası, kenar ya da yay yazın (ör. “AB ile CD\'yi eşit işaretle”).');
    const turler = new Set(anahtarlar.map(turOf));
    if (turler.size > 1) fail('Doğru parçaları ile yaylar birbirine eşit işaretlenemez.');
    const tur = turOf(anahtarlar[0]);
    const k = sonrakiEsitlikSayisi(sonuc, tur, anahtarlar) ?? fail(`${ESITLIK_EN_COK} farklı eşitlik işaretinin hepsi kullanılıyor. Önce birinin işaretini kaldırın.`);
    yamalariUygula(scene, esitlikYamalari(scene.objects, sonuc, anahtarlar.map((anahtar) => ({ anahtar, deger: k }))));
    const uzunluklar = anahtarlar.map((a) => sonuc.ogeler.get(a)?.uzunluk ?? 0);
    const enBuyuk = Math.max(...uzunluklar), enKucuk = Math.min(...uzunluklar);
    const esit = uzunlukEsit(enKucuk, enBuyuk);
    const not = esit ? '' : ` Not: ${tur === 'yay' ? 'yay uzunlukları' : 'uzunlukları'} şu an eşit değil (${uzunluklar.map((u) => `${trNum(u)} br`).join('; ')}).`;
    scene.say(`${birlestir(adlar(scene, anahtarlar))} ${CIZGI_ADLARI[k]}yle eşit işaretlendi.${not}`);
  },
};

// ------------------------------------------------------------------ 3) tek öğenin elle işareti
const set: CommandHandler = {
  id: 'marks.set',
  examples: ['AB kenarına iki çizgi koy', 'AB\'ye tek çizgi koy', 'AB yayına üç çizgi koy', 'AB\'nin eşitlik işaretini kaldır', 'AB\'nin eşitlik işaretini otomatik yap'],
  match(c, scene) {
    const t = c.text;
    if (YABANCI.test(t) || ESIT_ISARETLE.test(t)) return 0;
    const ad = ESITLIK_ADI.test(t) || ESIT_ISARET_AD.test(t);
    if (!(c.labels.length || c.refersToSelection || c.refersToLast || (!ad && SECILI_SAYI.test(t)))) return 0;
    if (ad || (ISARETSIZ.test(t) && (c.labels.length || c.refersToSelection))) return 94;
    if (YAPIM.test(t)) return 0;
    const istek = sayiliIstek(c);
    if (!istek || !KOY.test(istek.sonrasi)) return 0;
    if (istek.deger === 1 && /\bekle\w*/.test(istek.sonrasi)) return 0; // "AC kenarına bir çizgi ekle": parça ekleme
    if (c.labels.some((l) => /^(?:dan|den|tan|ten)$/.test(l.suffix))) return 0;
    if (istek.etiketli) {
      const sonuc = esitlikIsaretleri(scene.objects);
      if (!c.labels.every((ref) => { const a = adaylar(scene, sonuc, ref); return a.duz.length + a.yay.length + a.cokgen.length > 0; })) return 0;
    }
    return 94;
  },
  run(c, scene) {
    const t = c.text;
    const ad = ESITLIK_ADI.test(t) || ESIT_ISARET_AD.test(t);
    const istek = sayiliIstek(c);
    let deger: number | undefined;
    let ac = false;
    if (ISARETSIZ.test(t)) deger = 0;
    else if (ad && OTOMATIK.test(t)) deger = undefined;
    else if (istek) {
      deger = istek.deger;
      if (!Number.isInteger(deger) || deger < 0 || deger > ESITLIK_EN_COK) fail(`Çizgi sayısı 1 ile ${ESITLIK_EN_COK} arasında olmalı.`);
    } else if (ad && KAPAT.test(t)) deger = 0;
    else if (ad && AC_GOSTER.test(t)) { deger = undefined; ac = true; }
    else fail('Kaç çizgi olsun? Örneğin “AB kenarına iki çizgi koy” yazın.');
    const sonuc = esitlikIsaretleri(scene.objects);
    const anahtarlar = benzersiz(c.labels.length ? c.labels.flatMap((_, i) => hedefBul(scene, sonuc, c, i)) : secimHedefleri(scene, sonuc));
    yamalariUygula(scene, esitlikYamalari(scene.objects, sonuc, anahtarlar.map((anahtar) => ({ anahtar, deger }))));
    const otomatikKapali = scene.options.viewport?.showEqualityMarks === false;
    if (ac) scene.act({ kind: 'viewport', patch: { showEqualityMarks: true } });
    const kim = birlestir(adlar(scene, anahtarlar));
    if (deger === undefined) {
      scene.say(`${kim}: eşitlik işareti otomatiğe alındı.${otomatikKapali && !ac ? ' Otomatik işaretler şu an kapalı; açmak için “eşit kenarları işaretle” yazın.' : ''}`);
    } else if (deger === 0) scene.say(`${kim}: eşitlik işareti kaldırıldı.`);
    else scene.say(`${kim}: eşitlik işareti ${CIZGI_ADLARI[deger]} oldu.`);
  },
};

export const handlers: CommandHandler[] = [toggle, equal, set];

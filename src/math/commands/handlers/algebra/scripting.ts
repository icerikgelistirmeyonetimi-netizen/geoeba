import type { CommandHandler } from '../../types';
import { fold } from '../../text';
import { fail, type CommandScene, trNum } from '../../scene';
import type { MathObject, PointObject } from '@/types/math';
import { evaluateValue, findSlider } from './shared';

/*
 * BETİK KOMUTLARI (GeoGebra karşılıkları): CanlandırmayıBaşlat / StartAnimation, DeğerAta / SetValue, İzBırak /
 * ShowTrace / İzleriTemizle ve doğal dildeki karşılıkları. Komut adı katlanmış (aksansız, küçük harf) metinde aranır;
 * bağımsız değişkenler köşeli ya da yuvarlak ayraç içinde virgülle yazılır.
 */

const CANLANDIR_KOMUTU = /^(?:canlandirmayibaslat|startanimation)\s*(?:\[|\()/;
const DEGER_KOMUTU = /^(?:degerata|setvalue)\s*(?:\[|\()/;
const IZ_KOMUTU = /^(?:izbirak|izigoster|showtrace|izleritemizle|cleartrace|cleartraces)\s*(?:\[|\()/;
const IZ_TEMIZLE_KOMUTU = /^(?:izleritemizle|cleartrace|cleartraces)/;
/** "izleri temizle", "izi sil" */
const IZ_TEMIZLE_CUMLESI = /\biz(?:ler)?i?\s*(?:temizle|sil)\b/;

/**
 * Komutun hedefi. Önce tam ad (büyük/küçük harf duyarlı: "a" sürgü, "A" nokta; kimlik, ad ya da sürgü değişkeni);
 * sonra küçük harfli adda sürgü, ardından nokta; en son katlanmış adla gevşek eşleşme.
 */
function hedefiBul(sahne: CommandScene, ad: string): MathObject | undefined {
  const temiz = ad.trim();
  const tam = sahne.objects.find((n) => n.id === temiz || n.label === temiz || (n.type === 'slider' && n.variableName === temiz));
  if (tam) return tam;
  const surgu = temiz === temiz.toLowerCase() ? findSlider(sahne, temiz) : undefined;
  if (surgu) return surgu;
  const nokta = sahne.findPoint(temiz);
  if (nokta) return nokta;
  const katli = fold(temiz);
  return (
    findSlider(sahne, temiz) ??
    sahne.objects.find((n) => fold(n.id) === katli || fold(n.label) === katli || (n.type === 'slider' && fold(n.variableName) === katli))
  );
}

/** Ayraç içindeki bağımsız değişkenler: önce köşeli, yoksa yuvarlak ayraç (ilk açılıştan son kapanışa); ayraç yoksa null */
function ayracIcindekiler(metin: string): string[] | null {
  for (const [ac, kapa] of [['[', ']'], ['(', ')']]) {
    const bas = metin.indexOf(ac);
    const son = metin.lastIndexOf(kapa);
    if (bas === -1 || son <= bas) continue;
    const ic = metin.slice(bas + 1, son).trim();
    return ic ? ic.split(',').map((p) => p.trim()) : [];
  }
  return null;
}

/** "true", "1" ya da "doğru" */
const dogruMu = (deger: string) => deger.toLowerCase() === 'true' || deger === '1' || fold(deger) === 'dogru';
/** "false", "0" ya da "yanlış" */
const yanlisMi = (deger: string) => deger.toLowerCase() === 'false' || deger === '0' || fold(deger) === 'yanlis';
const durumu = (acik: boolean, evet: string, hayir: string) => (acik ? evet : hayir);

/**
 * CanlandırmayıBaşlat[…] / StartAnimation[…]: bağımsız değişken yoksa ya da yalnız doğruysa bütün canlandırma başlar,
 * yalnız yanlışsa durur. [nesne, doğru/yanlış] nokta, sürgü ya da sürgüye bağlı (döndürmeyle kurulmuş) açıyı
 * canlandırır; ikinci değer yoksa doğru sayılır.
 */
function komutlaCanlandir(metin: string, sahne: CommandScene): void {
  const parcalar = ayracIcindekiler(metin) ?? [];
  if (parcalar.length === 0 || (parcalar.length === 1 && dogruMu(parcalar[0]))) {
    sahne.act({ kind: 'playback', mode: 'play' });
    sahne.say('Canlandırma başlatıldı.');
    return;
  }
  if (parcalar.length === 1 && yanlisMi(parcalar[0])) {
    sahne.act({ kind: 'playback', mode: 'stop' });
    sahne.say('Canlandırma durduruldu.');
    return;
  }
  const [ad, deger] = parcalar;
  const oynat = deger ? dogruMu(deger) : true;
  const kip = oynat ? 'play' : 'stop';
  const sonuc = durumu(oynat, 'başlatıldı', 'durduruldu');
  const hedef = hedefiBul(sahne, ad);
  if (!hedef) fail(`“${ad}” adlı nesne ya da kaydırıcı bulunamadı.`);

  if (hedef.type === 'point') {
    sahne.update(hedef.id, { animating: oynat });
    sahne.act({ kind: 'playback', mode: kip, targetId: hedef.id });
    sahne.say(`${hedef.label} noktası için canlandırma ${sonuc}.`);
    return;
  }
  if (hedef.type === 'slider') {
    sahne.act({ kind: 'playback', mode: kip, targetId: hedef.id });
    sahne.say(`${hedef.variableName} kaydırıcısı için canlandırma ${sonuc}.`);
    return;
  }
  if (hedef.type === 'angle') {
    const kurulum = (sahne.objects.find((n) => n.id === hedef.point3Id) as PointObject | undefined)?.construction;
    if (kurulum?.kind === 'rotate' && kurulum.sliderId) {
      sahne.act({ kind: 'playback', mode: kip, targetId: kurulum.sliderId });
      sahne.say(`${hedef.label || 'Açı'} için canlandırma ${sonuc}.`);
      return;
    }
  }
  fail(`${ad} canlandırılabilir bir nesne (nokta, açı veya sürgü) değil.`);
}

/** "A noktasının animasyonunu başlat / durdur": nokta ya da sürgü; durdur, kapat, bitir geçerse durur */
function cumleyleCanlandir(cumle: string, ad: string | undefined, sahne: CommandScene): void {
  const durdur = /\b(?:durdur|kapat|bitir)\b/.test(fold(cumle));
  if (!ad) fail('Canlandırılacak nesneyi belirtin.');
  const hedef = hedefiBul(sahne, ad);
  if (!hedef) fail(`“${ad}” bulunamadı.`);
  const kip = durdur ? 'stop' : 'play';
  const sonuc = durumu(durdur, 'durduruldu', 'başlatıldı');
  if (hedef.type === 'point') {
    sahne.update(hedef.id, { animating: !durdur });
    sahne.act({ kind: 'playback', mode: kip, targetId: hedef.id });
    sahne.say(`${hedef.label} noktasının animasyonu ${sonuc}.`);
  } else if (hedef.type === 'slider') {
    sahne.act({ kind: 'playback', mode: kip, targetId: hedef.id });
    sahne.say(`${hedef.variableName} kaydırıcısının animasyonu ${sonuc}.`);
  }
}

/**
 * GeoGebra komutu: CanlandırmayıBaşlat[...] / StartAnimation[...]
 * Örnekler:
 * - CanlandırmayıBaşlat[true]
 * - StartAnimation[false]
 * - CanlandırmayıBaşlat[A, true]
 * - StartAnimation[a, false]
 */
export const scriptAnimationHandler: CommandHandler = {
  id: 'algebra.script.animation',
  examples: [
    'CanlandırmayıBaşlat[true]',
    'StartAnimation[false]',
    'CanlandırmayıBaşlat[A, true]',
    'StartAnimation[a, false]',
    'A noktasının animasyonunu başlat',
    'A noktasını canlandır',
  ],
  match(c, scene) {
    if (CANLANDIR_KOMUTU.test(fold(c.raw.trim()))) return 100;
    // Doğal dil: canlandır / animasyon sözcüğü ve bir ad (ya da "nokta"); ad nokta değilse ancak "nokta" geçerse
    const f = fold(c.text);
    if (!/\b(?:canlandir\w*|animasyon\w*)/.test(f)) return 0;
    const nokta = /\bnokta/.test(f);
    if (c.labels.length === 0 && !nokta) return 0;
    const hedef = c.labels[0] ? scene.resolveLabel(c.labels[0].text)[0] : undefined;
    return !hedef || hedef.type === 'point' || nokta ? 95 : 0;
  },
  run(c, scene) {
    const metin = c.raw.trim();
    if (CANLANDIR_KOMUTU.test(fold(metin))) komutlaCanlandir(metin, scene);
    else cumleyleCanlandir(c.text, c.labels[0]?.text, scene);
  },
};

/**
 * GeoGebra komutu: DeğerAta[nesne, değer] / SetValue[object, value]
 */
export const scriptSetValueHandler: CommandHandler = {
  id: 'algebra.script.setValue',
  examples: [
    'DeğerAta[a, 5]',
    'SetValue[a, 2]',
    'DeğerAta[b, -1.5]',
    'SetValue[k, 0]',
    'DeğerAta[a, 10]',
    'SetValue[b, 4]',
  ],
  match(c) {
    return DEGER_KOMUTU.test(fold(c.raw.trim())) ? 100 : 0;
  },
  run(c, scene) {
    const parcalar = ayracIcindekiler(c.raw.trim());
    if (!parcalar || parcalar.length < 2) fail('DeğerAta komutunu “DeğerAta[nesne, değer]” biçiminde yazın (ör. “DeğerAta[a, 5]”).');
    // Değerdeki virgüller (ondalık virgül) bölünmüş parçalardan geri birleştirilir
    const [ad, ...degerParcalari] = parcalar;
    const ifade = degerParcalari.join(',');
    const hedef = hedefiBul(scene, ad);
    if (hedef?.type !== 'slider') fail(`“${ad}” adlı kaydırıcı bulunamadı.`);
    const sonuc = evaluateValue(ifade, scene);
    if (!sonuc.ok) fail(`“${ifade}” geçerli bir sayısal değer değil.`);
    scene.update(hedef.id, { value: sonuc.value });
    scene.say(`${hedef.variableName} = ${trNum(sonuc.value)} olarak ayarlandı.`);
  },
};

/** Nesnenin izini açar ya da kapatır */
function iziAyarla(sahne: CommandScene, ad: string, acik: boolean): void {
  const hedef = hedefiBul(sahne, ad);
  if (!hedef) fail(`“${ad}” adlı nesne bulunamadı.`);
  sahne.update(hedef.id, { showTrace: acik });
  sahne.say(`${hedef.label} için iz bırakma ${durumu(acik, 'açıldı', 'kapatıldı')}.`);
}

/**
 * GeoGebra komutu: İzBırak[nesne, true/false] / ShowTrace[object, true/false] / İzleriTemizle[]
 */
export const scriptTraceHandler: CommandHandler = {
  id: 'algebra.script.trace',
  examples: [
    'İzBırak[A, true]',
    'ShowTrace[A, true]',
    'İzBırak[A, false]',
    'İziGöster[A]',
    'İzleriTemizle[]',
    'ClearTrace[]',
    'izleri temizle',
    'A noktasının izini aç',
  ],
  match(c) {
    const komut = fold(c.raw.trim());
    if (IZ_KOMUTU.test(komut) || /^(?:izleritemizle|cleartrace|cleartraces)$/.test(komut)) return 100;
    const f = fold(c.text);
    if (IZ_TEMIZLE_CUMLESI.test(f)) return 95;
    return /\biz\w*\s*(?:birak|goster|ac|kapat|gizle)\b/.test(f) && c.labels.length > 0 ? 92 : 0;
  },
  run(c, scene) {
    const metin = c.raw.trim();
    if (IZ_TEMIZLE_KOMUTU.test(fold(metin)) || IZ_TEMIZLE_CUMLESI.test(fold(c.text))) {
      scene.act({ kind: 'clearTraces' });
      scene.say('Tüm izler temizlendi.');
      return;
    }
    const parcalar = ayracIcindekiler(metin);
    if (parcalar) {
      // İzBırak[nesne, doğru/yanlış]: ikinci değer yoksa iz açılır
      if (parcalar.length === 0) fail('İz bırakılacak nesneyi belirtin (ör. “İzBırak[A, true]”).');
      iziAyarla(scene, parcalar[0], parcalar[1] ? dogruMu(parcalar[1]) : true);
      return;
    }
    // Doğal dil: "A noktasının izini aç / kapat"
    const ad = c.labels[0]?.text;
    if (!ad) fail('İzi açılacak nesneyi belirtin.');
    iziAyarla(scene, ad, !/\b(?:kapat|gizle|sil)\b/.test(fold(c.text)));
  },
};

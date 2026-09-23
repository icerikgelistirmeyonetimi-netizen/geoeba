/**
 * NOKTA BİRLEŞTİRME KOMUTLARI.
 *
 * "A ve C noktalarını birleştir" cümlesi GeoEBA'da iki anlama gelebilir: iki noktayı doğru parçasıyla
 * bağlamak (basic.segment) ya da ÜST ÜSTE gelmiş iki noktayı tek noktaya indirmek. Bu aile yalnızca
 * ikincisinin kesin olduğu durumları üstlenir:
 *   - noktalar zaten üst üsteyse (aralarına çizilecek parça sıfır uzunlukta olurdu), ya da
 *   - cümle "üst üste gelen", "çakışan", "tek nokta yap" gibi açıkça birleştirmeyi söylüyorsa.
 * Başka her durumda puan verilmez; doğru parçası çizen eski komut olduğu gibi çalışır.
 *
 * Kural tek yerdedir: src/math/noktaBirlestir.ts (sağ tık menüsü de aynı modülü kullanır).
 */
import type { PointObject } from '@/types/math';
import {
  birlestirmeIpucu, birlestirmeToleransi, noktalariBirlestir, ustUsteCiftler, ustUsteMi, ustUsteleriBirlestir,
} from '@/math/noktaBirlestir';
import type { CommandHandler } from '../types';
import type { Clause } from '../text';
import { type CommandScene, fail } from '../scene';

export const family = { id: 'nokta-birlestir', title: 'Üst Üste Gelen Noktalar' };

/** Birleştirme fiili. "birleştiren/birleştirerek" sıfat-fiilleri şekil çizdirir, bu aileye girmez. */
const BIRLESTIR = /\bbirlestir(?!en|erek|ilmis)/;
/** Cümle açıkça ÜST ÜSTE gelmeyi anlatıyor mu? */
const UST_USTE = /\bust uste\b|\bustuste\b|\bcakis\w*|\bayni (?:yer|nokta|konum)\w*|\btek nokta\w*|\bkaynastir\w*|\bic ice gec\w*/;
/** Başka bir şekil isteniyorsa bu aile karışmaz ("A ile C'yi birleştiren doğru parçası"). */
const BASKA_SEKIL = /\bdogru|\bparca|\bisin\b|\bcember|\bdaire|\belips|\byay\b|\baci\b|\bacisi|\bcokgen|\bucgen|\bkare\b|\bdikdortgen|\bkirik cizgi|\bfonksiyon|\bvektor|\bkiris/;
/** Birleştirme dışındaki fiiller ("sil", "taşı", "seç"): cümle başka aileye aittir. */
const BASKA_FIIL = /\bsil(?!indir)\b|\bkaldir|\btasi(?!yici)|\bdondur|\byansit|\botele|\bboya|\bgizle|\bkopyala|\badlandir|\bkilitle|\bolc(?!ek|u)\b/;

const toleransOf = (s: CommandScene) => birlestirmeToleransi(s.options.viewport?.zoom ?? 44);

/** Cümlede adı geçen noktalar (sırayla, yinelenmeden). "AC" gibi bitişik yazımlar da açılır. */
function cumledekiNoktalar(c: Clause, s: CommandScene): PointObject[] {
  const bulunan: PointObject[] = [];
  for (const ref of c.labels) {
    const tek = s.findPoint(ref.text);
    const liste = tek ? [tek] : s.pointsFromLabel(ref.text) ?? [];
    for (const p of liste) if (!bulunan.some(q => q.id === p.id)) bulunan.push(p);
  }
  return bulunan;
}

/** Birleştirmeyi sahneye uygular ve sonucu anlatır. */
function uygula(s: CommandScene, idA: string, idB: string) {
  const sonuc = noktalariBirlestir(s.objects, idA, idB);
  if (!sonuc.changed) fail(sonuc.hata ?? 'Bu iki nokta birleştirilemedi.');
  const kalanlar = new Set(sonuc.objects.map(o => o.id));
  s.objects = sonuc.objects;
  s.dirty = true;
  s.selection = s.selection.filter(id => kalanlar.has(id));
  s.created = s.created.filter(id => kalanlar.has(id));
  s.clauseCreated = s.clauseCreated.filter(id => kalanlar.has(id));
  s.resolve();
  s.setFocus([sonuc.keepId]);
  s.say(birlestirmeIpucu(sonuc, { geriAlNotu: false }));
}

// ============================================================================ iki nokta

const ciftHandler: CommandHandler = {
  id: 'nokta.birlestir',
  examples: ['A ve C noktalarını birleştir', "C'yi A ile birleştir", 'A ile C noktalarını tek nokta yap'],
  match(c, s) {
    const t = c.text;
    if (c.negated || BASKA_SEKIL.test(t) || BASKA_FIIL.test(t)) return 0;
    const acikca = UST_USTE.test(t);
    if (!BIRLESTIR.test(t) && !(acikca && /\byap\b|\bgetir|\bindir/.test(t))) return 0;
    const noktalar = cumledekiNoktalar(c, s);
    if (noktalar.length !== 2) return 0;
    // Üst üste DEĞİLLERSE karışmayız: "A ve B noktalarını birleştir" eskisi gibi doğru parçası çizer.
    if (!acikca && !ustUsteMi(s.objects, noktalar[0].id, noktalar[1].id, toleransOf(s))) return 0;
    return 88;
  },
  run(c, s) {
    const [a, b] = cumledekiNoktalar(c, s);
    if (!a || !b) fail('Birleştirilecek iki noktayı adıyla yazın (ör. “A ve C noktalarını birleştir”).');
    uygula(s, a.id, b.id);
  },
};

// ============================================================================ sahnedeki bütün yığınlar

const hepsiHandler: CommandHandler = {
  id: 'nokta.birlestirHepsi',
  examples: ['üst üste gelen noktaları birleştir', 'çakışan noktaları birleştir'],
  match(c, s) {
    const t = c.text;
    if (c.negated || BASKA_SEKIL.test(t) || BASKA_FIIL.test(t)) return 0;
    if (!UST_USTE.test(t) || !c.hasNoun('point')) return 0;
    if (!BIRLESTIR.test(t) && !/\btek nokta\w* (?:yap|getir|indir)|\bbirlestirilsin/.test(t)) return 0;
    if (cumledekiNoktalar(c, s).length >= 2) return 0; // iki ad yazıldıysa çift işleyicisi bakar
    return 88;
  },
  run(_c, s) {
    const tolerans = toleransOf(s);
    if (!ustUsteCiftler(s.objects, tolerans).length) fail('Üst üste gelen nokta yok; bütün noktalar ayrı yerlerde.');
    const sonuc = ustUsteleriBirlestir(s.objects, tolerans);
    // Bütün çiftler atlandıysa (ör. birleşmeyle kurulumları çöküyor) sahneye dokunmadan söyle
    if (sonuc.birlesme === 0) fail('Üst üste gelen noktalar birleştirilemedi: kurulumları bozulurdu.');
    const kalanlar = new Set(sonuc.objects.map(o => o.id));
    s.objects = sonuc.objects;
    s.dirty = true;
    s.selection = s.selection.filter(id => kalanlar.has(id));
    s.created = s.created.filter(id => kalanlar.has(id));
    s.clauseCreated = s.clauseCreated.filter(id => kalanlar.has(id));
    s.resolve();
    s.setFocus([]);
    s.say(
      `Üst üste gelen ${sonuc.birlesme} nokta çifti birleştirildi.` +
        (sonuc.kaldirilan ? ` Çizilemez duruma gelen ${sonuc.kaldirilan} nesne kaldırıldı.` : '') +
        (sonuc.atlanan ? ` ${sonuc.atlanan} çift birleştirilemedi (kurulumları bozulurdu).` : '')
    );
  },
};

export const handlers: CommandHandler[] = [ciftHandler, hepsiHandler];

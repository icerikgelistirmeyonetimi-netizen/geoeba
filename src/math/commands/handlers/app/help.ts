import { fail } from '../../scene';
import type { Clause } from '../../text';
import type { CommandHandler } from '../../types';
import { plainOf } from './shared';

const HELP = /\byardim\w*|\bneler yapabil\w*|\bne(?:ler)? yapabil\w*|\bhangi komut\w*|\bkomut(?:lar|lari|larin|larini)?\b|\bornek(?:ler|leri)?\b.*\bkomut\w*|\bnasil kullan\w*|\b(?:ne|neler|nasil) (?:yazabil|soyleyebil|diyebil|sorabil)\w*|\bhelp\b|\bkullanim kilavuz\w*/;
const CREATE = /\b(?:ciz|olustur|yap|ekle|koy)\w*/;

/** Konu başlıkları: komut ailesi kimlikleri (handlers/index.ts) ve örnekleri. */
const TOPICS: { id: string; title: string; re: RegExp; examples: string[] }[] = [
  { id: 'basic', title: 'Nokta, doğru ve açı', re: /\bnokta\w*|\bdogru\w*|\bisin\w*|\baci(?!ortay)\w*/, examples: ['A(2;3) noktası oluştur', 'A ve B noktalarını birleştir', 'A noktasından geçen yatay doğru çiz', 'ABC açısını çiz'] },
  { id: 'circles', title: 'Çember, daire ve elips', re: /\bcember\w*|\bdaire\w*|\belips\w*|\byay\w*|\bdilim\w*/, examples: ['yarıçapı 3 olan çember çiz', 'A merkezli B’den geçen çember çiz', '(x-1)^2+(y-2)^2=9 çemberini çiz', 'yarıçapları 4 ve 2 olan elips çiz'] },
  { id: 'polygons', title: 'Üçgen ve çokgenler', re: /\bucgen\w*|\bkare\b|\bkareler\w*|\bdikdortgen\w*|\bcokgen\w*|\byamuk\w*|\bparalelkenar\w*|\bdeltoid\w*/, examples: ['kenarları 3, 4 ve 5 olan üçgen çiz', 'kenarı 4 olan kare çiz', 'düzgün altıgen çiz', 'tabanı 6 yüksekliği 4 olan üçgen çiz'] },
  // Teorem ve şekil adları (Öklid, Tales, kiriş…) başka konuların genel sözcüklerinden daha belirgindir; topicOf önce buna bakar.
  { id: 'teoremler', title: 'Teoremler ve klasik şekiller', re: /\b(?:oklid|oklit|euclid|pisagor|pitagor|tales|thales|teorem|baginti|euler|oyler|dokuz nokta|feuerbach|orta ?taban|kiris|kesen|kuvvet|cevre aci|dis ?teget|ortak teget|heron|stewart|ceva|menela|sinus (?:teorem|kural)|kosinus (?:teorem|kural)|ucgen esitsizli)\w*/, examples: ['Öklid üçgeni çiz', 'Pisagor şekli çiz', 'Tales teoremi şekli çiz', 'ABC üçgeninde Öklid teoremini uygula', 'kesenler teoremini göster'] },
  { id: 'constructions', title: 'İnşalar', re: /\borta (?:nokta|dikme)\w*|\baciortay\w*|\bparalel\w*|\bdikme\w*|\bkesisim\w*|\bteget\w*|\byukseklik\w*|\bkenarortay\w*|\bmerkez\w*|\binsa\w*/, examples: ['AB’nin orta noktasını bul', 'A’dan BC’ye dikme indir', 'ABC üçgeninin çevrel çemberini çiz', 'AB ile CD’nin kesişim noktasını bul'] },
  { id: 'transforms', title: 'Dönüşümler', re: /\byansi\w*|\bsimetri\w*|\bdondur\w*|\bdonme\w*|\botele\w*|\bhomotete\w*|\bdonusum\w*/, examples: ['ABC’yi y eksenine göre yansıt', 'ABC’yi A etrafında 90 derece döndür', 'ABC’yi 3 birim sağa ötele', 'ABC’yi O merkezli 2 kat büyüt'] },
  { id: 'measure', title: 'Ölçme ve sorular', re: /\bolc\w*|\balan\w*|\bcevre\w*|\buzunluk\w*|\begim\w*|\btrig\w*|\bmesafe\w*/, examples: ['ABC’nin alanı kaç?', 'AB uzunluğunu göster', 'ABC üçgeninin açılarını ölç', 'A ile B arasındaki mesafe nedir'] },
  { id: 'edit', title: 'Düzenleme', re: /\bsil\w*|\brenk\w*|\bboya\w*|\bgizle\w*|\btasi\w*|\bkopyala\w*|\badlandir\w*|\bduzenle\w*/, examples: ['A noktasını sil', 'ABC’yi kırmızı yap', 'A’yı (3;4)’e taşı', 'AB’nin uzunluğunu 5 yap'] },
  { id: 'algebra', title: 'Cebir, kaydırıcı ve etkileşim', re: /\bkaydirici\w*|\bfonksiyon\w*|\bgrafik\w*|\byazi\w*|\bkesir\w*|\bdugme\w*|\bkutu\w*|\bcebir\w*/, examples: ['f(x) = x^2 - 2x', 'a kaydırıcısı oluştur', '"Merhaba" yazısı ekle', '3/4 kesrini göster'] },
  { id: 'app', title: 'Görünüm, araçlar ve geçmiş', re: /\bgorunum\w*|\bizgara\w*|\beksen\w*|\byakinlas\w*|\barac\w*|\bgeri al\w*|\bstil\w*/, examples: ['geri al', 'ızgarayı gizle', '2 kat yakınlaştır', 'Elips aracını seç', 'yazıları büyüt'] },
];

const UNSUPPORTED: { re: RegExp; message: string }[] = [
  { re: /\bdisa aktar\w*|\b(?:png|pdf|svg|jpg|jpeg|docx)\b|\b(?:cizimi|tuvali|calismayi|sayfayi|dosyayi) (?:kaydet|indir|yazdir|disa aktar|paylas)\w*|^yazdir\w*$/,
    message: 'Dışa aktarma, kaydetme ve yazdırma yazılı komutla yapılamıyor. Tuvalin üst çubuğundaki dışa aktarma menüsünü kullanın; çizim bu tarayıcıda kendiliğinden saklanır.' },
  { re: /\b3 ?d(?:ye|e|ya)?\b.*\b(?:gec|ac|don)\w*|\b(?:uc|3) ?boyut\w*.*\b(?:gec|ac|don)\w*/,
    message: '3D stüdyoya yazılı komutla geçilemiyor. Tuvaldeki 3D geçiş düğmesini kullanın; yazılı komutlar 2D çizimde çalışır.' },
  { re: /\barac cubug\w*|\bmenuyu (?:gizle|kapat|ac)\w*/,
    message: 'Araç çubuğunu tuvalin solundaki aç/kapa düğmesiyle gizleyip gösterebilirsiniz. Araç açmak için örneğin “Elips aracını seç” yazın.' },
];

function topicOf(c: Clause, text: string) {
  const stripped = text.replace(HELP, ' ');
  // "çember teoremleri", "üçgen teoremleri": teorem adı geçiyorsa konu şekil adına değil teoremlere gider.
  return TOPICS.find(t => t.id === 'teoremler' && t.re.test(stripped))
    ?? TOPICS.find(t => t.id !== 'app' && t.re.test(stripped)) ?? (TOPICS[TOPICS.length - 1].re.test(stripped) ? TOPICS[TOPICS.length - 1] : undefined);
}

export const help: CommandHandler = {
  id: 'app.help',
  examples: ['yardım', 'neler yapabilirsin?', 'komut örnekleri', 'hangi komutları yazabilirim', 'üçgen komutları neler', 'çember için yardım'],
  match(c) {
    const text = plainOf(c);
    // "PDF", "PNG", "3D" ayrıştırıcıda etiket gibi okunur; bu kalıplar yine de nesneye değil uygulamaya yöneliktir.
    if (UNSUPPORTED.some(u => u.re.test(text))) return 86;
    if (!HELP.test(text)) return 0;
    // "üçgen çizmeme yardım et": asıl istek çizimdir, oluşturma aileleri önce gelsin.
    if (CREATE.test(text.replace(/\bne(?:ler)? yapabil\w*/, ' ')) && topicOf(c, text)) return 10;
    return 86;
  },
  run(c, scene) {
    const text = plainOf(c);
    const unsupported = UNSUPPORTED.find(u => u.re.test(text));
    if (unsupported && !HELP.test(text)) fail(unsupported.message);
    const topic = topicOf(c, text);
    if (topic) {
      scene.act({ kind: 'help', topic: topic.id });
      scene.say(`${topic.title} için örnek komutlar: ${topic.examples.map(e => `“${e}”`).join(', ')}.`);
      return;
    }
    scene.act({ kind: 'help' });
    const parts = TOPICS.map(t => `${t.title.toLocaleLowerCase('tr')} (“${t.examples[0]}”)`);
    scene.say(`Yazarak şunları yapabilirsiniz: ${parts.join('; ')}. Birden fazla işlemi “ve”, virgül ya da “sonra” ile birleştirebilirsiniz; örnek listesi için “Komut örnekleri” düğmesine bakın.`);
  },
};

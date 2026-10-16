'use client';

import React, { useState } from 'react';
import type { Gorev } from './gorev';
import { izgara, olcumDegeri, type DunyaDurumu } from './dunya';
import { bloklar, ifadeMetni, sayiMetni, type Program, type Ifade } from './program';
import type { Iz } from './yorumlayici';

/** Aritmetik soru, öğrencinin değiştirebildiği sayaçtan değil görev verisinden üretilir. */
export function aritmetikSorusu(gorev: Gorev) {
  const g = izgara(gorev.dunya);
  if (gorev.id.startsWith('s5-sayac')) {
    const toplam = gorev.dunya.bitkiler.length;
    const olgun = gorev.dunya.bitkiler.filter((b) => b.domates === 'kirmizi').length;
    return { soru: `Sırada ${toplam} domates, bunların ${olgun} tanesi olgun. Ham domates sayısını hesapla.`, cevap: toplam - olgun, islem: `${toplam} − ${olgun}`, secenekler: ['Bütün domateslerden olgunları çıkarırım.', 'Bütün domateslerle olgunları toplarım.', 'Yalnız olgunları sayarım.'], dogru: 0, gerekce: 'Bütünün bir parçası biliniyorsa diğer parça çıkarma ile bulunur.' };
  }
  if (gorev.id.startsWith('s5-toplam')) {
    const kutleler = gorev.dunya.bitkiler.filter((b) => b.domates === 'kirmizi').map((b) => b.gram ?? 0);
    const toplam = kutleler.reduce((a, b) => a + b, 0);
    if (gorev.id === 's5-toplam-2') return { soru: `Toplanan domatesler ${toplam} gram. 1 kilogram 1000 gram olduğuna göre toplam kaç kilogramdır?`, cevap: toplam / 1000, islem: `${toplam} ÷ 1000`, secenekler: ['Gram sayısını 1000 ile çarparım.', 'Her 1000 gram bir kilogram olduğundan toplamı 1000’e bölerim.', 'Toplamdan 1000 çıkarırım.'], dogru: 1, gerekce: '2000 gramın içinde iki tane 1000 gram vardır; sonuç 2 kilogramdır.' };
    return { soru: 'Toplanan olgun domateslerin toplam kütlesini gram olarak hesapla.', cevap: toplam, islem: kutleler.join(' + '), secenekler: ['Yalnız son domatesin kütlesini alırım.', 'Her olgun domatesin kütlesini önceki toplama eklerim.', 'Ham domateslerin kütlelerini de eklerim.'], dogru: 1, gerekce: 'Her yeni toplama önceki toplam da katılır. Kilograma çevirmek için gram cinsinden toplam 1000’e bölünür.' };
  }
  if (gorev.id.startsWith('s5-tarla')) {
    const xs = new Set<number>(), ys = new Set<number>();
    g.boyaHedef.forEach((v, i) => { if (v) { xs.add(i % g.en); ys.add(Math.floor(i / g.en)); } });
    return { soru: `${ys.size} sıranın her birinde ${xs.size} kare var. Ekilecek kare sayısını hesapla.`, cevap: g.boyaHedef.filter(Boolean).length, islem: `${ys.size} × ${xs.size}`, secenekler: ['Sıra sayısı ile bir sıradaki kare sayısını toplarım.', 'Yalnız sıra sayısını kullanırım.', 'Eşit kare sayılarını tekrar tekrar toplamak yerine çarparım.'], dogru: 2, gerekce: 'Eşit sayıda kare içeren sıraların toplamı, sıra sayısı ile bir sıradaki kare sayısının çarpımıdır.' };
  }
  const kuleler = g.yapiHedef.filter((n) => n > 0);
  return { soru: 'Kulelerde kullanılacak toplam küp sayısını hesapla.', cevap: kuleler.reduce((a, b) => a + b, 0), islem: kuleler.join(' + '), secenekler: ['Kulelerin küp sayılarını sırayla toplarım.', 'Yalnız en yüksek kulenin küplerini sayarım.', 'Kule sayısını her zaman ikiyle çarparım.'], dogru: 0, gerekce: 'Örüntüdeki her kule bir terimdir; bütün yapının küp sayısı bu terimlerin toplamıdır.' };
}

export function aritmetikYorumDogru(gorev: Gorev, sayi: string, secim: number | null): boolean {
  const soru = aritmetikSorusu(gorev);
  return sayi.trim() !== '' && Number(sayi) === soru.cevap && secim === soru.dogru;
}

function sayilariYerlestir(ifade: Ifade, onceki: DunyaDurumu): Ifade {
  if (ifade.tur === 'degisken') return onceki.degiskenler[ifade.ad] === undefined ? ifade : { tur: 'sayi', deger: onceki.degiskenler[ifade.ad] };
  if (ifade.tur === 'olcum') return { tur: 'sayi', deger: olcumDegeri(onceki, ifade.olcum) };
  if (ifade.tur === 'islem') return { ...ifade, sol: sayilariYerlestir(ifade.sol, onceki), sag: sayilariYerlestir(ifade.sag, onceki) };
  return ifade;
}

export function temelDuzeyMetni(metin: string) {
  return metin.replace(/değişkeninin/g, 'göstergesinin').replace(/değişkenine/g, 'göstergesine').replace(/değişkeni/g, 'göstergesi');
}

/** Çalışan programın gerçek ara sonuçları; çözüm kodunun sonuçlarını öğrenci kodu gibi göstermez. */
export function islemSatirlari(program: Program, iz: Iz, konum: number) {
  const atamalar = new Map([...bloklar(program)].filter((b) => b.tur === 'ata').map((b) => [b.id, b]));
  return iz.adimlar.slice(0, konum + 1).flatMap((a, i) => {
    const blok = atamalar.get(a.blokId);
    if (a.tur === 'atama' && blok && a.deger !== undefined) {
      const onceki = i === 0 ? iz.baslangic : iz.adimlar[i - 1].durum;
      return [{ adim: i + 1, islem: ifadeMetni(sayilariYerlestir(blok.ifade, onceki)), sonuc: `${blok.degisken}: ${sayiMetni(a.deger)}` }];
    }
    if (a.tur === 'eylem' && (a.eylem === 'ek' || a.eylem === 'koy')) {
      const n = a.eylem === 'ek' ? a.durum.boyali.length : a.durum.kupler.reduce((x, y) => x + y, 0);
      return [{ adim: i + 1, islem: `${n - 1} + 1`, sonuc: String(n) }];
    }
    return [];
  });
}

export function AritmetikInceleme({ gorev, program, iz, konum, kodBasarili, onDogrula }: { gorev: Gorev; program: Program; iz: Iz; konum: number; kodBasarili: boolean; onDogrula: (dogru: boolean) => void }) {
  const [sayi, setSayi] = useState('');
  const [secim, setSecim] = useState<number | null>(null);
  const [kontrol, setKontrol] = useState(false);
  const soru = aritmetikSorusu(gorev);
  const dogru = aritmetikYorumDogru(gorev, sayi, secim);
  const satirlar = islemSatirlari(program, iz, konum);
  return <section className="space-y-4 text-[15px]" aria-label="İşlemleri incele">
    <h3 className="font-bold">Adımları tabloya dönüştür</h3>
    <p>Adım adım çalıştır. Her satırda yapılan işlemi ve sonucu karşılaştır; işlemin neyi hesapladığını kendi sözlerinle anlat.</p>
    <table className="w-full border-collapse text-left text-[14px]">
      <thead><tr><th className="border p-2">Adım</th><th className="border p-2">İşlem</th><th className="border p-2">Sonuç</th></tr></thead>
      <tbody>{satirlar.map((s) => <tr key={s.adim}><td className="border p-2">{s.adim}</td><td className="border p-2">{s.islem}</td><td className="border p-2">{s.sonuc}</td></tr>)}</tbody>
    </table>
    {!satirlar.length && <p className="text-muted-foreground">İlk işlem gerçekleşince tablo dolmaya başlayacak.</p>}
    <p className="font-bold">{soru.soru}</p>
    <label className="flex items-center gap-2">Sonuç <input className="w-28 rounded-lg border p-2" inputMode="numeric" value={sayi} onChange={(e) => { setSayi(e.target.value.replace(/[^0-9]/g, '')); setKontrol(false); onDogrula(false); }} /></label>
    <fieldset className="space-y-2"><legend className="mb-2 font-bold">İşlemi neden böyle yaptın?</legend>{soru.secenekler.map((s, i) => <label key={s} className="flex items-start gap-2 rounded-lg border p-2"><input type="radio" name={`yorum-${gorev.id}`} checked={secim === i} onChange={() => { setSecim(i); setKontrol(false); onDogrula(false); }} /><span>{s}</span></label>)}</fieldset>
    <button type="button" className="rounded-full bg-primary px-4 py-2 font-bold text-primary-foreground" onClick={() => { setKontrol(true); onDogrula(dogru); }}>İşlemi ve açıklamayı kontrol et</button>
    {kontrol && <p role="status">{dogru ? `${soru.islem} = ${soru.cevap}. ${soru.gerekce} ${kodBasarili ? 'Kodun ve matematiksel açıklaman doğru.' : 'Şimdi kodunu çalıştırıp görevi tamamla.'}` : 'Sonucunu ve seçtiğin açıklamayı yeniden incele. Adım tablosundan yararlan.'}</p>}
    <p className="rounded-lg bg-muted p-3">Sözlü açıkla: Başlangıçta ne biliniyor? Her adımda hangi işlem yapılıyor? Sonuç neden doğru?</p>
    <details className="rounded-lg border p-3"><summary className="cursor-pointer font-bold">Aynı hesabı üç gösterimle incele</summary>
      <p className="mt-3"><strong>Doğal dil:</strong> Verilen sayıları al, {soru.islem} işlemini hesapla ve sonucu göster.</p>
      <pre className="my-3 whitespace-pre-wrap rounded-lg bg-muted p-3 text-[14px]">{`BAŞLA\nGİR verilen sayılar\nHESAPLA ${soru.islem}\nYAZDIR hesaplanan sonuç\nBİTİR`}</pre>
      <div className="flex flex-col items-center gap-1 text-center" aria-label="Aritmetik işlemin akış şeması">
        <span className="rounded-full border-2 px-5 py-2">Başla</span><span aria-hidden="true">↓</span>
        <span className="skew-x-[-10deg] border-2 px-5 py-2"><span className="inline-block skew-x-[10deg]">Verilen sayıları gir</span></span><span aria-hidden="true">↓</span>
        <span className="border-2 px-5 py-2">Hesapla: {soru.islem}</span><span aria-hidden="true">↓</span>
        <span className="skew-x-[-10deg] border-2 px-5 py-2"><span className="inline-block skew-x-[10deg]">Sonucu yazdır</span></span><span aria-hidden="true">↓</span>
        <span className="rounded-full border-2 px-5 py-2">Bitir</span>
      </div>
      <p className="mt-3 text-[13px]">Oval başlangıç ve bitişi, paralelkenar girdi ve çıktıyı, dikdörtgen hesabı, oklar işlem sırasını gösterir.</p>
    </details>
  </section>;
}

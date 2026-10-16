'use client';
import React from 'react';
import { blokBasligi, ifadeMetni, type Blok, type Program } from './program';

export function dogalDilSatirlari(program: Program, girinti = 0): { metin: string; girinti: number; id: string }[] {
  return program.flatMap((b: Blok) => {
    const metin = b.tur === 'ata' ? `${ifadeMetni(b.ifade)} işlemini hesapla; sonucu ${b.degisken} göstergesine yaz.` : `${blokBasligi(b)}.`;
    const satir = [{ metin: metin.charAt(0).toLocaleUpperCase('tr-TR') + metin.slice(1), girinti, id: b.id }];
    if ('govde' in b) satir.push(...dogalDilSatirlari(b.govde, girinti + 1));
    if (b.tur === 'eger' && b.degilse) satir.push({ metin: 'Bu koşul sağlanmıyorsa:', girinti, id: `${b.id}-degilse` }, ...dogalDilSatirlari(b.degilse, girinti + 1));
    return satir;
  });
}

export function DogalDilGorunumu({ program }: { program: Program }) {
  return <div className="text-[15px] leading-relaxed" data-dogal-dil><p className="mb-3 font-bold">Başla. Aşağıdaki adımları sırayla uygula.</p><ol className="list-inside list-decimal space-y-2">{dogalDilSatirlari(program).map((s) => <li key={s.id} style={{ marginLeft: `${s.girinti * 16}px` }}>{s.metin}</li>)}</ol><p className="mt-3 font-bold">Sonucu kontrol et ve bitir.</p></div>;
}

export function GosterimAnahtari({ akis = false }: { akis?: boolean }) {
  return <details className="mb-3 rounded-xl border p-3 text-[13px]" open><summary className="cursor-pointer font-bold">{akis ? 'Şekillerin anlamı' : 'Sözde kodu oku'}</summary>{akis ? <p className="mt-2">Oval: başla/bitir. Dikdörtgen: işlem yap. Eşkenar dörtgen: koşula göre karar ver. Ok: sıradaki adımı izle. Girdi ve çıktı, paralelkenarla gösterilir.</p> : <p className="mt-2">BAŞLA ilk adımdır; GİR verilen sayıyı alır; HESAPLA aritmetik işlemi yapar; YAZDIR sonucu gösterir; BİTİR işlemleri sonlandırır. Örneğin: BAŞLA → GİR 3 ve 2 → HESAPLA 3 + 2 → YAZDIR 5 → BİTİR.</p>}</details>;
}

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { UNITELER } from '../mufredat';
import { calistir } from '../yorumlayici';
import { AkisSemasi } from '../AkisSemasi';
import { SozdeKodGorunumu } from '../SozdeKodGorunumu';
import type { Program } from '../program';

describe('Uzman 6. tur: görünür hata ve algoritma gösterimleri', () => {
  it('yansıma 4/4: tek yanlış dönüş görünür hedefle karşılaştırılır; düzeltildiğinde çalışır', () => {
    const g=UNITELER.flatMap(u=>u.gorevler).find(g=>g.id==='s7-yansima-4')!;
    const b=g.baslangic as Program;
    expect(g.dunya.hedefGizli).toBe(false);
    const sade=(p:Program)=>JSON.parse(JSON.stringify(p,(k,v)=>k==='id'?undefined:v));
    const a=sade(b),c=sade(g.cozum);
    const fark=a.map((x:unknown,i:number)=>JSON.stringify(x)!==JSON.stringify(c[i])).filter(Boolean);
    expect(fark).toHaveLength(1);
    const iz=calistir(b,g.dunya,g.hedef);
    expect(iz.sonuc.basarili).toBe(false);
    expect(iz.sonuc.hata?.tur).toBe('yanlisCizgi');
    expect(calistir(g.cozum,g.dunya,g.hedef).sonuc.basarili).toBe(true);
  });
  it('bütün 7–8. sınıf görevlerinin sözde kodu ve akış şeması çizilir; şema yazısı dar panelde küçültülmez', () => {
    for(const u of UNITELER.filter(u=>u.sinif===7||u.sinif===8)) for(const g of u.gorevler) {
      const akis=renderToStaticMarkup(<AkisSemasi program={g.cozum}/>);
      const sozde=renderToStaticMarkup(<SozdeKodGorunumu program={g.cozum}/>);
      expect(akis,g.id).toContain('BAŞLA'); expect(akis,g.id).toContain('BİTİR');
      expect(akis,g.id).toContain('max-width:none'); expect(akis,g.id).not.toContain('NaN');
      expect(sozde,g.id).toContain('BAŞLA'); expect(sozde,g.id).toContain('BİTİR');
    }
  });
});

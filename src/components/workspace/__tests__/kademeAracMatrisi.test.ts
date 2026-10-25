import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { ToolMode } from '@/types/workspace';
import { TOOL_GROUPS, aracAdi } from '../toolDefinitions';
import { TREE_TOOL_GROUPS } from '../treeToolDefinitions';
import { TREE_TOOL_GROUPS_3D } from '../treeToolDefinitions3D';
import { TOOL_SHORTCUTS } from '../toolShortcuts';
import {
  ARAC_SECIMI_SUZULEN_KADEMELER, KADEME_KIMLIKLERI, aracGorunurMu, aracSecilebilirMi, gorunenAracSayisi, grupAcikliklari,
  gruplariSuz, kapaliAracBildirimi, kademeEtiketi, type KademeDuzeyi,
} from '../kademeDuzeyleri';
import {
  arac3BGorunurMu, cisimIzdusumuAnahtariVar, cisimIzdusumuVarsayilanAcik, cisimIzdusumuYalnizAd, gorunen3BAracSayisi,
  grupAcikliklari3B, gruplari3BSuz, kademe2BNesneleri3BdeGosterir, kademe3BEksenleriGosterir, kademe3BYapismaProfili,
  kademe3BYapismaVarsayilanAcik,
} from '../kademeDuzeyleri3B';
import { gorunenKisayol, ilkokulKipindeMi } from '../ilkokulKipi';
import { kilavuzBolumleri } from '../kullanimKilavuzu';
import { kademeDuzeyiniAyarla, kademeDuzeyiniOku, oturumKademesiniAyarla } from '@/hooks/useKademeDuzeyi';
import { TOOLBAR_OPERATIONS } from '@/math/commands/catalog';

/*
 * Karakterizasyon: kademe × araç matrisi. Çizim araçlarının yeniden düzenlenmesi sırasında kademe yapısı (ilkokul,
 * ortaokul, lise, "Tüm araçlar") birebir korunmalı. Her kademede panelde görünen araçlar ve SIRASI, grupların açıklığı,
 * kısayol / komutla seçilebilirlik, kısayol harfinin görünürlüğü, Araçlar menüsünün alt grupları ve sabit maddeleri,
 * kullanım kılavuzu, komut önerilerinin süzgeci ve 3B paneli burada kayıt altındadır. Beklenen değerler yeniden
 * düzenlemeden ÖNCEKİ koddan kaydedildi (__snapshots__).
 */

const DUZEYLER: KademeDuzeyi[] = ['tum', ...KADEME_KIMLIKLERI];
const TUM_2B_ARACLAR = Object.keys(TOOL_SHORTCUTS) as ToolMode[];
const KOK = path.resolve(__dirname, '..');

afterEach(() => {
  oturumKademesiniAyarla(null);
  kademeDuzeyiniAyarla('tum');
});

describe('2B araç paneli (ağaç liste, Ara sekmesi, kılavuz, Kademe menüsündeki sayı)', () => {
  it.each(DUZEYLER)('%s: gruplar, sıra, adlar, açıklık ve sayı', (duzey) => {
    const gruplar = gruplariSuz(TREE_TOOL_GROUPS, duzey).map((g) => ({
      id: g.id,
      ad: g.name,
      araclar: g.tools.map((t) => `${t.id}: ${t.name}`),
    }));
    expect({ gruplar, aciklik: grupAcikliklari(TREE_TOOL_GROUPS, duzey), sayi: gorunenAracSayisi(TREE_TOOL_GROUPS, duzey) }).toMatchSnapshot();
  });

  it('süzülmüş araç kayıtları süzülmemiş kayıtla aynı (yalnız kademeye özel ad değişir)', () => {
    const tumu = new Map(TREE_TOOL_GROUPS.flatMap((g) => g.tools.map((t) => [t.id, t] as const)));
    for (const duzey of DUZEYLER) {
      for (const grup of gruplariSuz(TREE_TOOL_GROUPS, duzey)) {
        for (const arac of grup.tools) {
          const asil = tumu.get(arac.id)!;
          expect({ ...arac, name: asil.name }, `${duzey} ${arac.id}`).toEqual(asil);
        }
      }
    }
  });
});

describe('2B araç listesi (TOOL_GROUPS: imleç rozeti, komut önerileri, menü kısayolları)', () => {
  it.each(DUZEYLER)('%s: gruplar, sıra ve adlar', (duzey) => {
    expect(gruplariSuz(TOOL_GROUPS, duzey).map((g) => `${g.groupName}: ${g.tools.map((t) => `${t.id} (${t.name})`).join(', ')}`)).toMatchSnapshot();
  });
});

describe('araç × kademe', () => {
  it('panelde görünürlük / kısayol ve komutla seçilebilirlik / kısayol harfi', () => {
    const tablo = Object.fromEntries(
      TUM_2B_ARACLAR.map((arac) => [
        arac,
        DUZEYLER.map((d) => `${d}=${aracGorunurMu(d, arac) ? 'G' : '-'}${aracSecilebilirMi(d, arac) ? 'S' : '-'}${gorunenKisayol(arac, d) ?? '·'}`).join(' '),
      ])
    );
    expect(tablo).toMatchSnapshot();
  });

  it('araç adları (aracAdi) ve kapalı araç bildirimi', () => {
    expect(Object.fromEntries(TUM_2B_ARACLAR.map((a) => [a, aracAdi(a)]))).toMatchSnapshot('adlar');
    expect(KADEME_KIMLIKLERI.map((k) => kapaliAracBildirimi(k, 'Elips'))).toMatchSnapshot('bildirimler');
    expect(DUZEYLER.map(kademeEtiketi)).toEqual(['Tüm araçlar', 'İlkokul', 'Ortaokul', 'Lise']);
    expect(ARAC_SECIMI_SUZULEN_KADEMELER).toEqual(['ilkokul', 'ortaokul']);
  });

  it('komut kataloğundaki araç seçme işlemleri kademede seçilebilir mi', () => {
    const araclar = [...new Set(TOOLBAR_OPERATIONS.map((o) => o.tool))].filter((a): a is NonNullable<typeof a> => a !== null);
    expect(Object.fromEntries(araclar.map((a) => [a, DUZEYLER.filter((d) => aracSecilebilirMi(d, a)).join(',')]))).toMatchSnapshot();
  });
});

describe('Araçlar menüsü (menü çubuğu)', () => {
  const menu = readFileSync(path.join(KOK, 'WorkspaceMenuBar.tsx'), 'utf8');
  const altGruplarMetni = menu.match(/export const ARACLAR_MENUSU_ALT_GRUPLARI: readonly string\[\] = \[([^\]]*)\]/)?.[1] ?? '';
  const ALT_GRUPLAR = [...altGruplarMetni.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);

  it.each(DUZEYLER)('%s: alt menüler (Ölçme, İnşa, Dönüşüm) ve sabit araç maddeleri', (duzey) => {
    expect(ALT_GRUPLAR).toEqual(['olcme', 'insa', 'donusum']);
    const altMenuler = gruplariSuz(TREE_TOOL_GROUPS, duzey)
      .filter((g) => ALT_GRUPLAR.includes(g.id))
      .map((g) => `${g.name}: ${g.tools.map((t) => t.name).join(', ')}`);
    const blok = menu.slice(menu.indexOf('4. ARAÇLAR MENÜSÜ'), menu.indexOf('5. EKLE MENÜSÜ'));
    const sabitler = [...new Set([...blok.matchAll(/onSelectTool\('([a-z_0-9]+)'\)/g)].map((m) => m[1]))];
    const sabitGorunen = sabitler.filter((a) => a === 'select' || aracGorunurMu(duzey, a));
    const kisayolAraclari = TOOL_GROUPS.flatMap((g) => g.tools).filter((t) => aracSecilebilirMi(duzey, t.id)).map((t) => t.id);
    expect({ altMenuler, sabitGorunen, kisayolAraclari }).toMatchSnapshot();
  });
});

describe('kullanım kılavuzu', () => {
  it.each(DUZEYLER)('%s', (duzey) => {
    expect(kilavuzBolumleri(duzey)).toMatchSnapshot();
  });
});

describe('3B araç paneli', () => {
  it.each(DUZEYLER)('%s: gruplar, sıra, tür, açıklık ve sayı', (duzey) => {
    const gruplar = gruplari3BSuz(TREE_TOOL_GROUPS_3D, duzey).map((g) => ({
      id: g.id,
      ad: g.name,
      araclar: g.tools.map((t) => `${t.id}: ${t.name} [${t.kind}${t.solidType ? ` ${t.solidType}` : ''}${t.cameraPreset ? ` ${t.cameraPreset}` : ''}${t.preset ? ` ${JSON.stringify(t.preset)}` : ''}]`),
    }));
    expect({ gruplar, aciklik: grupAcikliklari3B(TREE_TOOL_GROUPS_3D, duzey), sayi: gorunen3BAracSayisi(TREE_TOOL_GROUPS_3D, duzey) }).toMatchSnapshot();
  });

  it('3B araç × kademe ve kademeye bağlı 3B kuralları', () => {
    const araclar = TREE_TOOL_GROUPS_3D.flatMap((g) => g.tools.map((t) => t.id));
    expect(Object.fromEntries(araclar.map((a) => [a, DUZEYLER.filter((d) => arac3BGorunurMu(d, a)).join(',')]))).toMatchSnapshot('görünürlük');
    const kurallar = Object.fromEntries(
      DUZEYLER.map((d) => [
        d,
        {
          ikiBNesneleri: kademe2BNesneleri3BdeGosterir(d),
          izdusumAcik: cisimIzdusumuVarsayilanAcik(d),
          izdusumAnahtari: cisimIzdusumuAnahtariVar(d),
          izdusumYalnizAd: cisimIzdusumuYalnizAd(d),
          eksenler: kademe3BEksenleriGosterir(d),
          yapismaAcik: kademe3BYapismaVarsayilanAcik(d),
          yapismaProfili: kademe3BYapismaProfili(d),
        },
      ])
    );
    expect(kurallar).toMatchSnapshot('kurallar');
  });
});

describe('oturum kademesi', () => {
  it('oturum açıkken kademe oturumunkidir ve menüden değişmez; ilkokul kipi oturumdan gelir', () => {
    kademeDuzeyiniAyarla('lise');
    expect(kademeDuzeyiniOku()).toBe('lise');
    expect(ilkokulKipindeMi()).toBe(false);
    oturumKademesiniAyarla('ilkokul');
    expect(kademeDuzeyiniOku()).toBe('ilkokul');
    expect(ilkokulKipindeMi()).toBe(true);
    kademeDuzeyiniAyarla('tum');
    expect(kademeDuzeyiniOku()).toBe('ilkokul');
    oturumKademesiniAyarla('ortaokul');
    expect(kademeDuzeyiniOku()).toBe('ortaokul');
    expect(ilkokulKipindeMi()).toBe(false);
    oturumKademesiniAyarla(null);
    expect(kademeDuzeyiniOku()).toBe('ortaokul');
    kademeDuzeyiniAyarla('tum');
    expect(kademeDuzeyiniOku()).toBe('tum');
  });
});

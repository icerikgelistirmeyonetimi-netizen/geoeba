import { describe, expect, it } from 'vitest';
import type { MathObject, PointObject } from '@/types/math';
import { runCommand, rankHandlers } from '../engine';
import { CommandScene } from '../scene';
import { parseClause, splitClauses } from '../text';
import { normalizeSpokenCommand } from '../speechText';
import type { CommandResult, CommandSuccess } from '../types';

/**
 * ŞEKLİN KENDİ NOKTALARI (D1): yazılı/sesli "sil" ile ekrandan silme AYNI kuralı uygular.
 * Kullanıcı: "bazen çokgenleri şekilleri sildiğimde noktaları kalıyor neden".
 */

type State = { objects: MathObject[]; selection: string[] };
const st = (objects: MathObject[], selection: string[] = []): State => ({ objects, selection });
const unfocus = (s: State): State => st(s.objects);

function play(state: State, steps: string[]): State {
  for (const step of steps) {
    const r = runCommand(step, state.objects, state.selection);
    if (!r.ok) throw new Error(`“${step}” başarısız: ${r.message}`);
    state = st(r.objects, r.selectedIds);
  }
  return state;
}
function run(text: string, state: State, spoken = false): CommandSuccess {
  const r = runCommand(spoken ? normalizeSpokenCommand(text) : text, state.objects, state.selection);
  if (!r.ok) throw new Error(`“${text}” başarısız: ${r.message}`);
  return r;
}
function failWith(text: string, state: State): string {
  const r: CommandResult = runCommand(text, state.objects, state.selection);
  if (r.ok) throw new Error(`“${text}” başarısız olmalıydı: ${r.message}`);
  return r.message;
}
const of = <T extends MathObject['type']>(o: MathObject[], t: T) => o.filter(x => x.type === t) as Extract<MathObject, { type: T }>[];
const pt = (o: MathObject[], label: string) => o.find((x): x is PointObject => x.type === 'point' && x.label === label);
const labels = (o: MathObject[]) => of(o, 'point').map(p => p.label);

const tri = () => unfocus(play(st([]), ['ABC üçgeni çiz']));

describe('komutla silme: şekil kendi noktalarıyla gider', () => {
  it('adıyla silinen üçgen köşelerini de götürür', () => {
    const r = run('ABC üçgenini sil', tri());
    expect(r.objects).toEqual([]);
    expect(r.message).toBe('ABC üçgeni (A, B ve C noktalarıyla birlikte) silindi.');
  });

  it('her söyleyiş aynı sonucu verir (yalın, işaret, tür adı, sonradan, seçimden)', () => {
    expect(run('sil', play(st([]), ['ABC üçgeni çiz'])).objects).toEqual([]);
    expect(run('onu sil', play(st([]), ['ABC üçgeni çiz'])).objects).toEqual([]);
    expect(run('üçgeni sil', play(st([]), ['ABC üçgeni çiz'])).objects).toEqual([]);
    // Araya başka bir komut girse de (odak değişse de) sonuç aynıdır: eskiden köşeler kalıyordu
    const sonra = play(st([]), ['ABC üçgeni çiz', 'D (6; 4) noktası oluştur']);
    const r = run('üçgeni sil', unfocus(sonra));
    expect(labels(r.objects)).toEqual(['D']);
    // seçimden
    const secili = play(st([]), ['ABC üçgeni çiz', 'ABC üçgenini seç']);
    expect(run('seçilileri sil', secili).objects).toEqual([]);
  });

  it('yay, dilim, çap çemberi ve eğimli doğru: yardımcı noktalar dâhil hepsi gider', () => {
    for (const ciz of ['yarıçapı 3 olan 90 derecelik yay çiz', '60 derecelik daire dilimi çiz', 'eğimi 2 olan doğru çiz']) {
      const r = run('sil', play(st([]), [ciz]));
      expect(r.objects, ciz).toEqual([]);
    }
    const cap = play(st([]), ['A (0; 0) noktası oluştur', 'B (4; 0) noktası oluştur', 'AB çaplı çember çiz']);
    expect(run('sil', cap).objects).toEqual([]);
  });

  it('üçgenin açıları gösterilmişse açılarla birlikte köşeler de gider', () => {
    const r = run('ABC üçgenini sil', unfocus(play(tri(), ['ABC üçgeninin açılarını göster'])));
    expect(r.objects).toEqual([]);
  });

  it('AÇI ARACIYLA çizilen kollar üçgenle birlikte gider (yoksa noktalar kollarda asılı kalıyordu)', () => {
    const sahne = unfocus(play(tri(), ['BAC açısını çiz']));
    expect(of(sahne.objects, 'segment').length).toBeGreaterThan(0);
    const r = run('ABC üçgenini sil', sahne);
    expect(r.objects).toEqual([]);
  });

  it('ortak kenarlı iki üçgende yalnızca paylaşılmayan köşe gider', () => {
    const iki = unfocus(play(st([]), ['ABC üçgeni çiz', 'BCD üçgeni çiz']));
    const r = run('ABC üçgenini sil', iki);
    expect(labels(r.objects).sort()).toEqual(['B', 'C', 'D']);
    expect(r.message).toBe('ABC üçgeni (A noktasıyla birlikte) silindi.');
  });

  it('yarım kalmış çizimin noktası (pendingPointIds) korunur', () => {
    const state = tri();
    const a = pt(state.objects, 'A')!;
    const r = runCommand('ABC üçgenini sil', state.objects, state.selection, { pendingPointIds: [a.id] });
    if (!r.ok) throw new Error(r.message);
    expect(labels(r.objects)).toEqual(['A']);
  });

  it('“Bağlı N nesne” yalnızca bağımlıları sayar, kendi noktalarını değil', () => {
    const world = unfocus(play(st([]), ['ABC üçgeni çiz']));
    expect(run('A noktasını sil', world).message).toContain('Bağlı 1 nesne');
    expect(run('ABC üçgenini sil', world).message).not.toContain('Bağlı');
  });
});

describe('komutla silme: “yalnızca şekli sil” kaçış kapısı', () => {
  const sozler = [
    'yalnızca ABC üçgenini sil',
    'sadece ABC üçgenini sil',
    'ABC üçgenini sil, noktalar kalsın',
    'ABC üçgenini sil, noktaları yerinde kalsın',
    'ABC üçgenini sil, köşeleri dursun',
    'ABC üçgenini sil, noktalara dokunma',
    'ABC üçgenini sil, köşelerine dokunma',
  ];
  it.each(sozler)('“%s” üçgeni siler, noktaları bırakır', text => {
    const r = run(text, tri());
    expect(of(r.objects, 'polygon')).toHaveLength(0);
    expect(labels(r.objects)).toEqual(['A', 'B', 'C']);
    expect(r.message).toBe('ABC üçgeni silindi (A, B ve C noktaları yerinde kaldı).');
  });

  it('sesli söyleyiş de çalışır', () => {
    const r = run('evet ABC üçgenini sil noktalar kalsın', tri(), true);
    expect(labels(r.objects)).toEqual(['A', 'B', 'C']);
  });

  it('“noktaları kalsın” şekli köşelerine çevirmez (expandVertices tuzağı)', () => {
    const yay = play(st([]), ['yarıçapı 3 olan 90 derecelik yay çiz']);
    const oncekiNokta = labels(yay.objects).length;
    const r = run('yayı sil, noktalar kalsın', unfocus(yay));
    expect(of(r.objects, 'arc')).toHaveLength(0);
    expect(labels(r.objects)).toHaveLength(oncekiNokta);
  });

  it('“yalnızca noktaları sil” yine noktaları siler', () => {
    const r = run('yalnızca noktaları sil', tri());
    expect(of(r.objects, 'point')).toHaveLength(0);
    expect(of(r.objects, 'polygon')).toHaveLength(0);
  });

  it('“noktalarıyla birlikte sil” eskisi gibi tüm tanım noktalarını siler ve paylaşan şekli de götürür', () => {
    expect(run('ABC üçgenini noktalarıyla birlikte sil', tri()).objects).toEqual([]);
    const iki = unfocus(play(st([]), ['ABC üçgeni çiz', 'BCD üçgeni çiz']));
    const r = run('ABC üçgenini noktalarıyla birlikte sil', iki);
    expect(r.message).toContain('Bağlı 1 nesne');
    expect(of(r.objects, 'polygon')).toHaveLength(0);
  });
});

describe('komutla silme: dönüşüm parametreleri ve yönlendirme', () => {
  it('döndürme merkezi görüntüyle birlikte silinmez', () => {
    const sahne = play(st([]), ['ABC üçgeni çiz', 'O (-6; -4) noktası oluştur', "ABC üçgenini O etrafında 90 derece döndür"]);
    const goruntu = of(sahne.objects, 'polygon')[1];
    expect(goruntu).toBeTruthy();
    const r = runCommand(`${goruntu.label} üçgenini sil`, sahne.objects, []);
    if (!r.ok) throw new Error(r.message);
    expect(pt(r.objects, 'O')).toBeDefined();
    expect(labels(r.objects)).toContain('A');
  });

  it('cümle tek parçadır ve silme işleyicisine gider', () => {
    for (const text of ['yalnızca ABC üçgenini sil', 'ABC üçgenini sil, noktalar kalsın']) {
      expect(splitClauses(text)).toHaveLength(1);
      const s = new CommandScene(tri().objects, []);
      expect(rankHandlers(parseClause(splitClauses(text)[0], s.known()), s)[0]?.handler.id).toBe('edit.delete');
    }
  });

  it('BİLİNEN SINIR: "noktaları silme" olumsuz emir, "noktaları silinmesin" ayrı cümle sayılır', () => {
    // Bu iki söyleyiş cümle çözümleyicisinde takılıyor; öğretmene önerilen biçimler "yalnızca ... sil" ve "..., noktalar kalsın".
    expect(failWith('ABC üçgenini sil ama noktaları silme', tri())).toContain('Olumsuz');
    expect(failWith('ABC üçgenini sil, noktaları silinmesin', tri())).toContain('Hangi nesne');
  });
});

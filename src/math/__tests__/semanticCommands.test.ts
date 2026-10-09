import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { MathObject } from '@/types/math';
import { SEMANTIC_ANCHORS, anchorIntent, canSearchMeaning, inflectLabel, interpretSemanticMatch, rankSemanticMatches } from '../semanticCommands';
import { executeTurkishCommand } from '../turkishCommands';
import { build } from '../commands/__tests__/helpers';

const triangle = executeTurkishCommand('3 4 5 üçgen çiz', []);
if (!triangle.ok) throw new Error('fixture');
const scene = triangle.objects;
const interpret = (text: string, intent: string, selection: string[] = []) => interpretSemanticMatch(text, { intent, score: 0.8 }, scene, selection);

describe('semantic parameter extraction', () => {
  it('resolves measured model confusions using domain terms', () => {
    expect(rankSemanticMatches('şeklin etrafının toplamı ne kadar', [{ intent: 'area', score: 0.776 }, { intent: 'perimeter', score: 0.683 }])[0].intent).toBe('perimeter');
    expect(rankSemanticMatches('üçgenin kenarlarını sürgülerle kontrol edeyim', [{ intent: 'lengths', score: 0.847 }, { intent: 'bind', score: 0.799 }])[0].intent).toBe('bind');
    expect(rankSemanticMatches('bugün hava nasıl', [{ intent: 'angle', score: 0.488 }])).toEqual([]);
  });
  it('preserves vertex names including apostrophes and Turkish case suffixes', () => {
    expect(interpret("B'den tabana yükseklik çek", 'altitude').command).toBe('B noktasından dik indir');
    expect(interpret('A köşesi kaç derecedir', 'angle').command).toBe('A noktasının açısını yaz');
  });
  it('asks for a missing vertex and accepts a selected one', () => {
    expect(interpret('Tabana yükseklik çek', 'altitude').clarification).toBeTruthy();
    expect(interpret('Tabana yükseklik çek', 'altitude', [scene[1].id]).command).toBe('B noktasından dik indir');
  });
  it('retains dimensions and converts explicitly supplied diameter', () => {
    expect(interpret('Kenarları 7 8 9 olan üçgen istiyorum', 'triangle').command).toBe('7 8 9 üçgen çiz');
    expect(interpret('Çapı 8 olan çember', 'circle').command).toBe('Yarıçapı 4 olan çember çiz');
    expect(interpret('Yarıçapı 7 olan yuvarlak oluştur', 'circle').command).toBe('Yarıçapı 7 olan çember çiz');
  });
  it('uses the scene for measurements and point pairs', () => {
    expect(interpret('Şeklin etrafının toplamı ne kadar', 'perimeter').command).toBe('ABC çevresini ölç');
    expect(interpret('A ile B arasını birleştir', 'segment').command).toBe('AB doğru parçası çiz');
    expect(interpret('İki nokta arasına çizgi koy', 'segment').clarification).toBeTruthy();
  });
  it('keeps geometry validation in the execution path', () => {
    const command = interpret('Kenarları 1 2 9 olan üçgen istiyorum', 'triangle').command!;
    expect(executeTurkishCommand(command, scene).ok).toBe(false);
    const altitude = interpret("B'den tabana yükseklik çek", 'altitude').command!;
    expect(executeTurkishCommand(altitude, scene).ok).toBe(true);
  });
  it('rejects low similarity, negative commands and formulas', () => {
    expect(interpretSemanticMatch('hava durumu', { intent: 'circle', score: 0.2 }, scene, [])).toEqual({});
    for (const raw of ['üçgen çizme', 'üçgen istemiyorum', 'kaydırıcı bağını kaldır', 'f(x)=x^2']) expect(canSearchMeaning(raw)).toBe(false);
  });
});

// ------------------------------------------------------------------------------------------- yeni aileler

const intents: { id: string; phrases: string[] }[] = JSON.parse(readFileSync(path.resolve(__dirname, '../../../public/semantic/intents.json'), 'utf8'));

/** Üçgen ABC, DE doğrusu ve serbest P noktası (aile modüllerinden bağımsız, fabrikalarla kurulur). */
const rich = build(s => {
  const a = s.addPoint({ x: 0, y: 0 }, { label: 'A' });
  const b = s.addPoint({ x: 4, y: 0 }, { label: 'B' });
  const c = s.addPoint({ x: 0, y: 3 }, { label: 'C' });
  s.addPolygon([a.id, b.id, c.id], { kind: 'triangle' });
  const d = s.addPoint({ x: 5, y: 5 }, { label: 'D' });
  const e = s.addPoint({ x: 8, y: 5 }, { label: 'E' });
  s.addLine(d.id, e.id);
  s.addPoint({ x: 2, y: 6 }, { label: 'P' });
});
const lineId = rich.find(o => o.type === 'line')!.id;
const say = (text: string, intent: string, selection: string[] = [], objects: MathObject[] = rich) => interpretSemanticMatch(text, { intent, score: 0.8 }, objects, selection);

describe('semantic intents catalog', () => {
  it('has unique ids and at least three phrases per intent', () => {
    expect(new Set(intents.map(i => i.id)).size).toBe(intents.length);
    for (const intent of intents) expect(intent.phrases.length, intent.id).toBeGreaterThanOrEqual(3);
    expect(intents.length).toBeGreaterThanOrEqual(40);
  });

  it('covers the new command families', () => {
    const ids = intents.map(i => i.id);
    for (const id of ['parallel', 'perpendicular', 'perp_bisector', 'angle_bisector', 'median', 'intersection', 'circumcircle', 'incircle',
      'reflect', 'rotate', 'translate', 'dilate', 'delete', 'color', 'hide', 'move', 'rename', 'slider', 'function', 'text', 'fraction',
      'zoom', 'grid', 'undo', 'regular_polygon', 'ellipse', 'arc', 'sector', 'polygon']) expect(ids).toContain(id);
  });

  it('covers the theorem family', () => {
    const ids = intents.map(i => i.id);
    for (const id of ['oklid', 'pisagor', 'tales', 'orta_taban', 'euler', 'dokuz_nokta', 'dis_teget', 'kiris', 'kesen', 'kuvvet', 'cevre_aci',
      'teget_kiris', 'ucgen_teoremi', 'ortak_teget']) expect(ids).toContain(id);
  });

  it('gives every intent a keyword anchor so none is penalised by default', () => {
    const anchored = new Set(SEMANTIC_ANCHORS.map(([, id]) => id));
    for (const intent of intents) expect(anchored.has(intent.id), intent.id).toBe(true);
    for (const id of anchored) expect(intents.some(i => i.id === id), id).toBe(true);
  });

  it('never anchors a training phrase to a different intent', () => {
    const conflicts = intents.flatMap(intent => intent.phrases
      .map(phrase => ({ phrase, anchored: anchorIntent(phrase) }))
      .filter(({ anchored }) => anchored !== undefined && anchored !== intent.id)
      .map(({ phrase, anchored }) => `${intent.id}: “${phrase}” → ${anchored}`));
    expect(conflicts).toEqual([]);
  });

  it('anchors every phrase that can be searched at all', () => {
    const searchable = intents.flatMap(intent => intent.phrases.filter(canSearchMeaning).map(phrase => [intent.id, phrase]));
    expect(searchable.length).toBeGreaterThan(120);
  });
});

describe('semantic anchors for the new families', () => {
  it.each([
    ['ABC üçgeninin çevrel çemberini çiz', 'circumcircle'],
    ['AB doğru parçasının orta dikmesini çiz', 'perp_bisector'],
    ['ABC açısının açıortayını çiz', 'angle_bisector'],
    ['A köşesinden kenarortay çiz', 'median'],
    ['Üçgenin iç teğet çemberini çiz', 'incircle'],
    ['P noktasından AB doğrusuna paralel doğru çiz', 'parallel'],
    ['P noktasından AB doğrusuna dik doğru çiz', 'perpendicular'],
    ['B noktasından dik indir', 'altitude'],
    ['İki doğrunun kesişim noktasını bul', 'intersection'],
    ['B noktasından çembere teğet çiz', 'tangent'],
    ['Üçgeni x eksenine göre yansıt', 'reflect'],
    ['Şekli 90 derece döndür', 'rotate'],
    ['Üçgeni 3 birim sağa ötele', 'translate'],
    ['Üçgeni 2 kat büyüt', 'dilate'],
    ['A noktasını (1; 2) konumuna taşı', 'move'],
    ['Bu üçgeni yok et', 'delete'],
    ['Bu doğruyu gizle', 'hide'],
    ['Çemberin rengini mavi yap', 'color'],
    ['Üçgeni yeniden adlandır', 'rename'],
    ['a adında bir kaydırıcı oluştur', 'slider'],
    ['Üçgen uzunluklarını kaydırıcıya bağla', 'bind'],
    ['Bir parabol grafiği çiz', 'function'],
    ['3/4 kesir modelini göster', 'fraction'],
    ['Tuvale bir not yaz', 'text'],
    ['Yakınlaştır', 'zoom'],
    ['Izgarayı göster', 'grid'],
    ['Son yaptığımı geri al', 'undo'],
    ['Düzgün altıgen çiz', 'regular_polygon'],
    ['Elips çiz', 'ellipse'],
    ['Çember üzerinde bir yay oluştur', 'arc'],
    ['Daire dilimi çiz', 'sector'],
    ['ABCD çokgenini çiz', 'polygon'],
    ['Dikdörtgen çiz', 'rectangle'],
    ['Kare çiz', 'square'],
    ['Üçgen çiz', 'triangle'],
    ['Orijine bir nokta yerleştir', 'point'],
    ['Üçgenin kenarlarını ölç', 'lengths'],
    ['Kenar uzunluğu 4 olan kare istiyorum', 'square'],
    ['Şeklin alanını ölç', 'area'],
    ['A ile B noktalarını birleştir', 'segment'],
    ['Yarıçapı 2 olan çember oluştur', 'circle'],
  ])('“%s” → %s', (text, intent) => {
    expect(anchorIntent(text)).toBe(intent);
  });

  it('does not treat style or view wording as a dilation', () => {
    expect(anchorIntent('Yazıları büyüt')).not.toBe('dilate');
    expect(anchorIntent('Noktaları küçült')).not.toBe('dilate');
    expect(anchorIntent('Ekranı büyüt')).toBe('zoom');
  });

  it('re-ranks model confusions between related constructions', () => {
    expect(rankSemanticMatches('ABC üçgeninin çevrel çemberini çiz', [{ intent: 'perimeter', score: 0.8 }, { intent: 'circumcircle', score: 0.74 }])[0].intent).toBe('circumcircle');
    expect(rankSemanticMatches('AB kenarının orta dikmesini çiz', [{ intent: 'midpoint', score: 0.82 }, { intent: 'perp_bisector', score: 0.7 }])[0].intent).toBe('perp_bisector');
    expect(rankSemanticMatches('üçgeni A etrafında döndür', [{ intent: 'reflect', score: 0.78 }, { intent: 'rotate', score: 0.7 }])[0].intent).toBe('rotate');
    expect(rankSemanticMatches('üçgenin içine sığan çember', [{ intent: 'circle', score: 0.8 }, { intent: 'incircle', score: 0.7 }])[0].intent).toBe('incircle');
  });
});

describe('Turkish suffixes for generated commands', () => {
  it.each([
    ['A', 'acc', "A'yı"], ['B', 'acc', "B'yi"], ['ABC', 'acc', "ABC'yi"], ['O', 'acc', "O'yu"], ['Ü', 'acc', "Ü'yü"], ['X', 'acc', "X'i"],
    ['A', 'dat', "A'ya"], ['DE', 'dat', "DE'ye"], ['U', 'dat', "U'ya"], ['X', 'dat', "X'e"],
    ['A', 'gen', "A'nın"], ['O', 'gen', "O'nun"], ['C', 'gen', "C'nin"], ['Ö', 'gen', "Ö'nün"],
    ['C', 'abl', "C'den"], ['A', 'abl', "A'dan"], ['X', 'abl', "X'ten"],
  ] as const)('%s + %s → %s', (label, kind, expected) => {
    expect(inflectLabel(label, kind, 'noktasını')).toBe(expected);
  });

  it('falls back to a noun phrase for labels that do not end with a letter', () => {
    expect(inflectLabel("A'", 'acc', 'noktasını')).toBe("A' noktasını");
    expect(inflectLabel('A_1', 'gen', 'noktasının')).toBe('A_1 noktasının');
  });
});

describe('semantic parameter extraction for the new families', () => {
  it.each([
    ['P noktasından DE doğrusuna paralel çiz', 'parallel', 'P noktasından DE doğrusuna paralel doğru çiz'],
    ["P'den DE'ye dik doğru çiz", 'perpendicular', 'P noktasından DE doğrusuna dik doğru çiz'],
    ['AB kenarının orta dikmesini çiz', 'perp_bisector', 'AB doğru parçasının orta dikmesini çiz'],
    ['A ile B noktalarına eşit uzaklıktaki doğruyu oluştur', 'perp_bisector', 'AB doğru parçasının orta dikmesini çiz'],
    ['ABC açısının açıortayını çiz', 'angle_bisector', 'ABC açısının açıortayını çiz'],
    ['B köşesindeki açıyı ikiye bölen doğru', 'angle_bisector', 'ABC açısının açıortayını çiz'],
    ['C köşesinden kenarortay çiz', 'median', 'C köşesinden kenarortay çiz'],
    ['Üçgenin kenarortaylarını oluştur', 'median', "ABC'nin kenarortaylarını çiz"],
    ['Üçgenin çevrel çemberini çiz', 'circumcircle', 'ABC üçgeninin çevrel çemberini çiz'],
    ['Üçgenin içine sığan en büyük çemberi çiz', 'incircle', 'ABC üçgeninin iç teğet çemberini çiz'],
    ['ABC üçgenini x eksenine göre yansıt', 'reflect', "ABC'yi x eksenine göre yansıt"],
    ['ABC üçgenini DE doğrusuna göre yansıt', 'reflect', "ABC'yi DE doğrusuna göre yansıt"],
    ['P noktasını A noktasına göre simetrik al', 'reflect', "P'yi A noktasına göre yansıt"],
    ['Üçgeni DE doğrusuna göre yansıt', 'reflect', "ABC'yi DE doğrusuna göre yansıt"],
    ['Üçgeni A noktası etrafında 90 derece döndür', 'rotate', "ABC'yi A noktası etrafında 90 derece döndür"],
    ['Üçgeni orijin etrafında saat yönünde 45 derece çevir', 'rotate', "ABC'yi orijin etrafında saat yönünde 45 derece döndür"],
    ['ABC üçgenini 3 birim sağa ötele', 'translate', "ABC'yi 3 birim sağa ötele"],
    ['Üçgeni DE vektörü boyunca ötele', 'translate', "ABC'yi DE vektörü boyunca ötele"],
    ['Üçgeni (2; -1) vektörü kadar ötele', 'translate', "ABC'yi (2; -1) vektörü kadar ötele"],
    ['Üçgeni A merkezli 2 kat büyüt', 'dilate', "ABC'yi A merkezli 2 kat büyüt"],
    ['Üçgeni A merkezli yarı boyutuna küçült', 'dilate', "ABC'yi A merkezli 0,5 kat büyüt"],
    ['ABC üçgenini yok et', 'delete', "ABC'yi sil"],
    ['Her şeyi yok et', 'delete', 'tümünü sil'],
    ['A ve P noktalarını silelim', 'delete', 'A, P sil'],
    ['DE doğrusunu kırmızıya boya', 'color', "DE'yi kırmızı yap"],
    ['Üçgenin rengini yeşil yap', 'color', "ABC'yi yeşil yap"],
    ['P noktası görünmesin', 'hide', "P'yi gizle"],
    ['P noktasını (3; 4) konumuna taşı', 'move', "P'yi (3; 4) konumuna taşı"],
    ['Üçgeni 2 birim yukarı kaydır', 'move', "ABC'yi 2 birim yukarı kaydır"],
    ['A noktasının adını K yap', 'rename', "A'nın adını K yap"],
    ['0 ile 10 arasında değişen k parametresi ekle', 'slider', '0 ile 10 arasında k kaydırıcısı oluştur'],
    ['Bir sürgü ekle', 'slider', 'kaydırıcı oluştur'],
    ['Bir parabol grafiği çiz', 'function', 'f(x) = x^2'],
    ['Sinüs fonksiyonunun grafiğini göster', 'function', 'f(x) = sin(x)'],
    ['"Merhaba dünya" yazısını ekle', 'text', '"Merhaba dünya" yazısını ekle'],
    ['üç bölü dört kesrini göster', 'fraction', '3/4 kesir modeli oluştur'],
    ['2/5 kesrini şerit olarak göster', 'fraction', '2/5 şerit kesir modeli oluştur'],
    ['Çizimi ekrana sığdır', 'zoom', 'ekrana sığdır'],
    ['Görünümü biraz uzaklaştır', 'zoom', 'uzaklaştır'],
    ['Yakınlaştır', 'zoom', 'yakınlaştır'],
    ['Kareli arka planı kapat', 'grid', 'ızgarayı gizle'],
    ['Izgarayı aç', 'grid', 'ızgarayı göster'],
    ['Son iki işlemi geri al', 'undo', '2 adım geri al'],
    ['Az önceki işlemi yinele', 'undo', 'yinele'],
    ['Düzgün altıgen çiz', 'regular_polygon', '6 kenarlı düzgün çokgen çiz'],
    ['Kenar uzunluğu 2 olan 8 kenarlı düzgün çokgen çiz', 'regular_polygon', 'kenar uzunluğu 2 olan 8 kenarlı düzgün çokgen çiz'],
    ['Yarıçapları 4 ve 2 olan elips oluştur', 'ellipse', 'yarıçapları 4 ve 2 olan elips çiz'],
    ['Oval bir şekil çiz', 'ellipse', 'elips çiz'],
    ['Yarıçapı 3 olan 90 derecelik yay çiz', 'arc', 'yarıçapı 3 olan 90 derecelik yay çiz'],
    ['Yarıçapı 2,5 olan 60 derecelik daire dilimi', 'sector', 'yarıçapı 2,5 olan 60 derecelik daire dilimi çiz'],
    ['A, B ve P noktalarını köşe yapan çokgen', 'polygon', 'ABP çokgenini çiz'],
    ['Koordinatları 2 ve 3 olan bir nokta koy', 'point', '(2; 3) noktası oluştur'],
    ['Q noktasını (1,5; -2) konumunda oluştur', 'point', 'Q (1,5; -2) noktası oluştur'],
  ])('“%s” (%s) → %s', (text, intent, expected) => {
    expect(say(text, intent)).toEqual({ command: expected });
  });

  it('reads uppercase labels that look like Turkish conjunctions (DE, O, NE)', () => {
    const withO = build(s => {
      const o = s.addPoint({ x: 0, y: 0 }, { label: 'O' });
      const n = s.addPoint({ x: 3, y: 0 }, { label: 'N' });
      const e = s.addPoint({ x: 0, y: 4 }, { label: 'E' });
      s.addPolygon([o.id, n.id, e.id]);
      s.addPoint({ x: 6, y: 6 }, { label: 'K' });
    });
    expect(say('K noktasını O merkezli 3 kat büyüt', 'dilate', [], withO)).toEqual({ command: "K'yi O merkezli 3 kat büyüt" });
    expect(say('K noktasını NE doğrusuna göre yansıt', 'reflect', [], withO)).toEqual({ command: "K'yi NE doğrusuna göre yansıt" });
    expect(say("P'den DE'ye paralel çiz", 'parallel')).toEqual({ command: 'P noktasından DE doğrusuna paralel doğru çiz' });
    expect(say('Üçgeni DE doğrusuna göre yansıt', 'reflect', [], [...rich, ...build(s => { s.addPoint({ x: 9, y: 9 }, { label: 'Z' }); })]))
      .toEqual({ command: "ABC'yi DE doğrusuna göre yansıt" });
  });

  it('names both objects for intersections (lines by endpoints, circles by centre)', () => {
    const scene2 = build(s => {
      const [a, b, c, d] = [[0, 0], [4, 4], [0, 4], [4, 0]].map(([x, y], i) => s.addPoint({ x, y }, { label: 'ABCD'[i] }));
      s.addLine(a.id, b.id); s.addLine(c.id, d.id);
    });
    expect(say('İki doğrunun kesişim noktasını bul', 'intersection', [], scene2)).toEqual({ command: 'AB ile CD kesişim noktalarını bul' });
    expect(say('AB ve CD doğrularının kesiştiği yeri bul', 'intersection', [], scene2)).toEqual({ command: 'AB ile CD kesişim noktalarını bul' });
    const withCircle = build(s => {
      const [a, b] = [[0, 0], [4, 0]].map(([x, y], i) => s.addPoint({ x, y }, { label: 'AB'[i] }));
      s.addLine(a.id, b.id);
      const k = s.addPoint({ x: 2, y: 0 }, { label: 'K' });
      s.addCircle({ centerId: k.id, radius: 1 });
    });
    expect(say('Doğru ile çemberin kesiştiği noktaları işaretle', 'intersection', [], withCircle)).toEqual({ command: 'AB ile K merkezli çember kesişim noktalarını bul' });
    // Üçgen ve doğru: motor çokgen kesişimini adla istemediği için açıklama istenir.
    expect(say('Şekillerin kesişim noktalarını bul', 'intersection').clarification).toMatch(/Hangi iki nesne/);
  });

  it('uses the selection when no name is written', () => {
    expect(say('Bunu kırmızıya boya', 'color', [lineId])).toEqual({ command: 'seçilileri kırmızı yap' });
    expect(say('Seçtiğimi gizle', 'hide', [lineId])).toEqual({ command: 'seçilileri gizle' });
    expect(say('P noktasından buna paralel çiz', 'parallel', [lineId])).toEqual({ command: 'P noktasından DE doğrusuna paralel doğru çiz' });
  });

  it.each([
    ['Bir doğruya paralel çiz', 'parallel', /Hangi doğruya/],
    ['DE doğrusuna paralel çiz', 'parallel', /hangi noktadan/i],
    ['Üçgeni A etrafında döndür', 'rotate', /Kaç derece/],
    ['Üçgeni 90 derece döndür', 'rotate', /Hangi nokta etrafında/],
    ['Üçgeni sağa ötele', 'translate', /Ne kadar/],
    ['Üçgeni büyüt', 'dilate', /merkez/],
    ['Üçgeni A merkezli büyüt', 'dilate', /Kaç kat/],
    ['Üçgeni biraz sağa kaydır', 'move', /Nereye/],
    ['Üçgenin rengini değiştir', 'color', /Hangi renk/],
    ['Tuvale bir yazı ekle', 'text', /tırnak/],
    ['Bir fonksiyon çiz', 'function', /f\(x\)/],
    ['Düzgün çokgen çiz', 'regular_polygon', /Kaç kenarlı/],
    ['Tek yarıçaplı elips 3', 'ellipse', /iki yarıçap/],
    ['Bir çokgen oluştur', 'polygon', /Köşe noktalarını/],
    ['A noktasının adını değiştir', 'rename', /Yeni adı/],
    ['Bir şeyi yok et', 'delete', /Neyi silelim/],
    ['Kesişimleri bul', 'intersection', /Hangi iki nesne/],
  ])('asks instead of guessing: “%s” (%s)', (text, intent, pattern) => {
    const threeLines = build(s => {
      const pts = [[0, 0], [2, 0], [0, 2], [2, 2], [4, 4], [5, 1]].map(([x, y]) => s.addPoint({ x, y }));
      s.addLine(pts[0].id, pts[1].id); s.addLine(pts[2].id, pts[3].id); s.addLine(pts[4].id, pts[5].id);
    });
    const objects = intent === 'intersection' || text === 'Bir doğruya paralel çiz' ? threeLines : rich;
    const result = say(text, intent, [], objects);
    expect(result.command).toBeUndefined();
    expect(result.clarification).toMatch(pattern);
  });

  it('needs a triangle for circumcircle when several are present', () => {
    const two = build(s => {
      const p = [[0, 0], [3, 0], [0, 3], [5, 5], [8, 5], [5, 8]].map(([x, y]) => s.addPoint({ x, y }));
      s.addPolygon([p[0].id, p[1].id, p[2].id]); s.addPolygon([p[3].id, p[4].id, p[5].id]);
    });
    expect(say('Üçgenin çevrel çemberini çiz', 'circumcircle', [], two).clarification).toMatch(/Hangi üçgenin/);
    expect(say('DEF üçgeninin çevrel çemberini çiz', 'circumcircle', [], two)).toEqual({ command: 'DEF üçgeninin çevrel çemberini çiz' });
  });
});

describe('semantic canonical commands run on the real engine', () => {
  const twoLines = build(s => {
    const [a, b, c, d] = [[0, 0], [4, 4], [0, 4], [4, 0]].map(([x, y], i) => s.addPoint({ x, y }, { label: 'ABCD'[i] }));
    s.addLine(a.id, b.id); s.addLine(c.id, d.id);
  });

  it.each([
    ['P noktasından DE doğrusuna paralel çiz', 'parallel'],
    ["P'den DE'ye dik doğru çiz", 'perpendicular'],
    ['AB kenarının orta dikmesini çiz', 'perp_bisector'],
    ['ABC açısının açıortayını çiz', 'angle_bisector'],
    ['C köşesinden kenarortay çiz', 'median'],
    ['Üçgenin kenarortaylarını oluştur', 'median'],
    ['Üçgenin çevrel çemberini çiz', 'circumcircle'],
    ['Üçgenin içine sığan en büyük çemberi çiz', 'incircle'],
    ['ABC üçgenini x eksenine göre yansıt', 'reflect'],
    ['ABC üçgenini DE doğrusuna göre yansıt', 'reflect'],
    ['P noktasını A noktasına göre simetrik al', 'reflect'],
    ['Üçgeni A noktası etrafında 90 derece döndür', 'rotate'],
    ['Üçgeni orijin etrafında saat yönünde 45 derece çevir', 'rotate'],
    ['ABC üçgenini 3 birim sağa ötele', 'translate'],
    ['Üçgeni DE vektörü boyunca ötele', 'translate'],
    ['Üçgeni (2; -1) vektörü kadar ötele', 'translate'],
    ['Üçgeni A merkezli 2 kat büyüt', 'dilate'],
    ['ABC üçgenini yok et', 'delete'],
    ['Her şeyi yok et', 'delete'],
    ['A ve P noktalarını silelim', 'delete'],
    ['DE doğrusunu kırmızıya boya', 'color'],
    ['P noktası görünmesin', 'hide'],
    ['P noktasını (3; 4) konumuna taşı', 'move'],
    ['Üçgeni 2 birim yukarı kaydır', 'move'],
    ['A noktasının adını K yap', 'rename'],
    ['0 ile 10 arasında değişen k parametresi ekle', 'slider'],
    ['Bir sürgü ekle', 'slider'],
    ['Bir parabol grafiği çiz', 'function'],
    ['"Merhaba dünya" yazısını ekle', 'text'],
    ['üç bölü dört kesrini göster', 'fraction'],
    ['2/5 kesrini şerit olarak göster', 'fraction'],
    ['Çizimi ekrana sığdır', 'zoom'],
    ['Görünümü biraz uzaklaştır', 'zoom'],
    ['Kareli arka planı kapat', 'grid'],
    ['Son iki işlemi geri al', 'undo'],
    ['Az önceki işlemi yinele', 'undo'],
    ['Düzgün altıgen çiz', 'regular_polygon'],
    ['Kenar uzunluğu 2 olan 8 kenarlı düzgün çokgen çiz', 'regular_polygon'],
    ['Yarıçapları 4 ve 2 olan elips oluştur', 'ellipse'],
    ['Yarıçapı 3 olan 90 derecelik yay çiz', 'arc'],
    ['Yarıçapı 2,5 olan 60 derecelik daire dilimi', 'sector'],
    ['A, B ve P noktalarını köşe yapan çokgen', 'polygon'],
    ['Koordinatları 2 ve 3 olan bir nokta koy', 'point'],
    ['Q noktasını (1,5; -2) konumunda oluştur', 'point'],
  ])('“%s” (%s)', (text, intent) => {
    const { command } = say(text, intent);
    expect(command, 'komut üretilmedi').toBeTruthy();
    const result = executeTurkishCommand(command!, rich);
    if (!result.ok) throw new Error(`“${command}” motorda başarısız: ${result.message}`);
  });

  it('intersection command runs on a two-line scene', () => {
    const { command } = say('İki doğrunun kesişim noktasını bul', 'intersection', [], twoLines);
    const result = executeTurkishCommand(command!, twoLines);
    if (!result.ok) throw new Error(`“${command}” motorda başarısız: ${result.message}`);
    expect(result.objects.length).toBeGreaterThan(twoLines.length);
  });
});

// ------------------------------------------------------------------------------------------- teoremler ve klasik şekiller

/** M merkezli r = 3 çember, üzerinde A(3; 0) ve B(0; 3), dışında P(6; 0); `ikiCember` ayrıca N merkezli r = 2 çemberi içerir. */
const cemberKur = (ikinci: boolean) => build(s => {
  const m = s.addPoint({ x: 0, y: 0 }, { label: 'M' });
  s.addCircle({ centerId: m.id, radius: 3 });
  s.addPoint({ x: 3, y: 0 }, { label: 'A' });
  s.addPoint({ x: 0, y: 3 }, { label: 'B' });
  s.addPoint({ x: 6, y: 0 }, { label: 'P' });
  if (!ikinci) return;
  const n = s.addPoint({ x: 8, y: 0 }, { label: 'N' });
  s.addCircle({ centerId: n.id, radius: 2 });
});
const cemberli = cemberKur(false);
const ikiCember = cemberKur(true);

describe('semantic anchors for theorems and classical figures', () => {
  it.each([
    ['Öklid üçgeni çiz', 'oklid'],
    ['ABC üçgeninde Öklid bağıntılarını uygula', 'oklid'],
    ['Pisagor şekli çiz', 'pisagor'],
    ['Dik üçgenin kenarları üzerine kareler çiz', 'pisagor'],
    ['Tales teoremi şekli çiz', 'tales'],
    ['Temel orantı teoremini göster', 'tales'],
    ['Üçgenin orta tabanını çiz', 'orta_taban'],
    ['Üçgenin Euler doğrusunu çiz', 'euler'],
    ['Euler çemberi çiz', 'dokuz_nokta'],
    ['Feuerbach çemberini çiz', 'dokuz_nokta'],
    ['Üçgenin dış teğet çemberini çiz', 'dis_teget'],
    ['AB kirişini çiz', 'kiris'],
    ['Merkezden kirişe dikme indir', 'kiris'],
    ['P noktasından çembere kesen çiz', 'kesen'],
    ['Kirişler teoremini göster', 'kesen'],
    ['Teğet-kesen teoremini göster', 'kesen'],
    ['P noktasının çembere göre kuvvetini hesapla', 'kuvvet'],
    ['Çevre açı merkez açının yarısıdır', 'cevre_aci'],
    ['Teğet-kiriş açısını çiz', 'teget_kiris'],
    ['Açıortay teoremini göster', 'ucgen_teoremi'],
    ['Kosinüs teoremiyle kenarı hesapla', 'ucgen_teoremi'],
    ['Kenarları 2, 3 ve 7 olan üçgen çizilebilir mi', 'ucgen_teoremi'],
    ['İki çemberin ortak teğetlerini çiz', 'ortak_teget'],
  ])('“%s” → %s', (text, intent) => {
    expect(anchorIntent(text)).toBe(intent);
  });

  it('keeps the older constructions and functions apart from the theorem family', () => {
    expect(anchorIntent('ABC açısının açıortayını çiz')).toBe('angle_bisector');
    expect(anchorIntent('A köşesinden kenarortay çiz')).toBe('median');
    expect(anchorIntent('Sinüs fonksiyonunun grafiğini göster')).toBe('function');
    expect(anchorIntent('B noktasından çembere teğet çiz')).toBe('tangent');
    expect(anchorIntent('Doğruya doksan derece açıyla kesen bir doğru oluştur')).toBe('perpendicular');
    expect(anchorIntent('Şeklin çevresini ölç')).toBe('perimeter');
  });
});

describe('semantic parameter extraction for theorems', () => {
  it.each([
    ['Öklid üçgeni istiyorum', 'oklid', 'Öklid üçgeni çiz'],
    ['dik kenarları 6 ve 8 olan Öklid üçgeni', 'oklid', 'dik kenarları 6 ve 8 olan Öklid üçgeni çiz'],
    ['hipotenüsü 10 olan Öklid üçgeni', 'oklid', 'hipotenüsü 10 olan Öklid üçgeni çiz'],
    ['üçgende Öklid bağıntılarını göster', 'oklid', 'ABC üçgeninde Öklid teoremini uygula'],
    ['ABC üçgeninde Öklid şeklini kur', 'oklid', 'ABC üçgeninde Öklid şeklini kur'],
    ['Pisagor şekli yap', 'pisagor', 'Pisagor şekli çiz'],
    ['dik kenarları 5 ve 12 olan Pisagor şekli', 'pisagor', 'dik kenarları 5 ve 12 olan Pisagor şekli çiz'],
    ['Pisagor bağıntısını doğrula', 'pisagor', 'ABC üçgeninde Pisagor bağıntısını yaz'],
    ["Pisagor'a göre üçgen dik mi", 'pisagor', "Pisagor'a göre ABC dik mi"],
    ['Tales şekli çiz', 'tales', 'Tales teoremi şekli çiz'],
    ['kelebek Tales şekli', 'tales', 'kelebek Tales şekli çiz'],
    ['Tales çemberi çiz', 'tales', 'Tales çemberi çiz'],
    ['AB çaplı Tales çemberi', 'tales', 'AB çaplı Tales çemberi çiz'],
    ['ABC üçgeninde 2:1 oranında Tales şekli', 'tales', 'ABC üçgeninde 2:1 oranında Tales şekli kur'],
    ['üçgende Tales oranlarını göster', 'tales', 'ABC üçgeninde Tales şekli kur'],
    ['üçgenin orta tabanını çiz', 'orta_taban', 'ABC üçgeninin orta tabanını çiz'],
    ['üçgenin orta tabanlarını çiz', 'orta_taban', 'ABC üçgeninin orta tabanlarını çiz'],
    ['Euler doğrusu', 'euler', 'ABC üçgeninin Euler doğrusunu çiz'],
    ['dokuz nokta çemberini çiz', 'dokuz_nokta', 'ABC üçgeninin dokuz nokta çemberini çiz'],
    ['dokuz nokta çemberini merkeziyle çiz', 'dokuz_nokta', 'ABC üçgeninin dokuz nokta çemberini merkeziyle çiz'],
    ['dış teğet çemberi çiz', 'dis_teget', 'ABC üçgeninin dış teğet çemberini çiz'],
    ['A köşesine ait dış teğet çemberi', 'dis_teget', 'ABC üçgeninin A köşesine ait dış teğet çemberini çiz'],
    ['üç dış teğet çemberi çiz', 'dis_teget', 'ABC üçgeninin üç dış teğet çemberini çiz'],
    ['açıortay teoremini göster', 'ucgen_teoremi', 'ABC üçgeninde açıortay teoremini uygula'],
    ['B köşesi için açıortay teoremi', 'ucgen_teoremi', 'B köşesi için açıortay teoremini uygula'],
    ['kenarortay teoremini uygula', 'ucgen_teoremi', 'ABC üçgeninde kenarortay teoremini uygula'],
    ['Stewart teoremini doğrula', 'ucgen_teoremi', 'ABC üçgeninde Stewart teoremini uygula'],
    ['Ceva teoremini göster', 'ucgen_teoremi', 'ABC üçgeninde Ceva teoremini uygula'],
    ['Menelaus teoremini uygula', 'ucgen_teoremi', 'ABC üçgeninde Menelaus teoremini uygula'],
    ['sinüs teoremini yaz', 'ucgen_teoremi', 'ABC üçgeninde sinüs teoremini uygula'],
    ['A açısı için kosinüs teoremi', 'ucgen_teoremi', 'A açısı için kosinüs teoremini uygula'],
    ['Heron formülüyle alanı bul', 'ucgen_teoremi', 'ABC üçgeninde Heron formülünü uygula'],
    ['üçgen eşitsizliğini doğrula', 'ucgen_teoremi', 'ABC üçgeninde üçgen eşitsizliğini uygula'],
    ['kenarları 2, 3 ve 7 olan üçgen çizilebilir mi', 'ucgen_teoremi', 'kenarları 2, 3 ve 7 olan üçgen çizilebilir mi'],
    ['büyük açı karşısında büyük kenar', 'ucgen_teoremi', 'ABC üçgeninde açı kenar ilişkisini uygula'],
  ])('“%s” (%s) → %s', (text, intent, expected) => {
    expect(say(text, intent)).toEqual({ command: expected });
  });

  it.each([
    ['AB kirişini çiz', 'kiris', 'AB kirişini çiz'],
    ['çembere bir kiriş çiz', 'kiris', 'çembere bir kiriş çiz'],
    ['çemberin çapını çiz', 'kiris', 'çemberin çapını çiz'],
    ['merkezden kirişe dikme indir', 'kiris', 'merkezden kirişe dikme indir'],
    ['P noktasından çembere kesen çiz', 'kesen', 'P noktasından çembere kesen çiz'],
    ["P'den iki kesen çiz", 'kesen', 'P noktasından çembere iki kesen çiz'],
    ['kesenler teoremini göster', 'kesen', 'kesenler teoremini göster'],
    ['kirişler teoremini göster', 'kesen', 'kirişler teoremini göster'],
    ['teğet-kesen teoremini göster', 'kesen', 'teğet-kesen teoremini göster'],
    ['P noktasının çembere göre kuvveti kaçtır', 'kuvvet', 'P noktasının çembere göre kuvvetini hesapla'],
    ['kuvvet teoremini göster', 'kuvvet', 'kuvvet teoremini göster'],
    ['çevre açı çiz', 'cevre_aci', 'çevre açı çiz'],
    ['AB yayını gören çevre açıyı çiz', 'cevre_aci', 'AB yayını gören çevre açıyı çiz'],
    ['çevre açı merkez açının yarısıdır', 'cevre_aci', 'çevre açı teoremini göster'],
    ['teğet-kiriş açısını çiz', 'teget_kiris', 'teğet-kiriş açısını çiz'],
    ['A noktasındaki teğet-kiriş açısı', 'teget_kiris', 'A noktasındaki teğet-kiriş açısını çiz'],
    ['teğet kiriş açısı teoremini göster', 'teget_kiris', 'teğet kiriş açısı teoremini göster'],
  ])('circle scene: “%s” (%s) → %s', (text, intent, expected) => {
    expect(say(text, intent, [], cemberli)).toEqual({ command: expected });
  });

  it.each([
    ['iki çemberin ortak teğetlerini çiz', 'ortak_teget', 'iki çemberin ortak teğetlerini çiz'],
    ['iç ortak teğetleri çiz', 'ortak_teget', 'iç ortak teğetleri çiz'],
    ['dış ortak teğetleri çiz', 'ortak_teget', 'dış ortak teğetleri çiz'],
    ['M merkezli çembere bir kiriş çiz', 'kiris', 'M merkezli çembere bir kiriş çiz'],
    ['M merkezli çembere AB kirişini çiz', 'kiris', 'M merkezli çembere AB kirişini çiz'],
    ['M merkezli çemberin çapını çiz', 'kiris', 'M merkezli çemberin çapını çiz'],
    ['P noktasından M merkezli çembere kesen çiz', 'kesen', 'P noktasından M merkezli çembere kesen çiz'],
    ['P noktasının M merkezli çembere göre kuvveti', 'kuvvet', 'P noktasının M merkezli çembere göre kuvvetini hesapla'],
    ['M merkezli çemberde çevre açı çiz', 'cevre_aci', 'M merkezli çemberde çevre açı çiz'],
    ['M merkezli çemberde teğet-kiriş açısını çiz', 'teget_kiris', 'M merkezli çemberde teğet-kiriş açısını çiz'],
  ])('two circles: “%s” (%s) → %s', (text, intent, expected) => {
    expect(say(text, intent, [], ikiCember)).toEqual({ command: expected });
  });

  it('asks which circle when several exist and none is named', () => {
    expect(say('çembere bir kiriş çiz', 'kiris', [], ikiCember).clarification).toMatch(/Birden fazla çember/);
    expect(say('kesenler teoremini göster', 'kesen', [], ikiCember).clarification).toMatch(/Birden fazla çember/);
    const [circle] = ikiCember.filter(o => o.type === 'circle');
    expect(say('çembere bir kiriş çiz', 'kiris', [circle.id], ikiCember)).toEqual({ command: 'M merkezli çembere bir kiriş çiz' });
  });

  it.each([
    ['Öklid bağıntılarını göster', 'oklid', /Hangi üçgen/],
    ['Euler doğrusunu çiz', 'euler', /Hangi üçgen/],
    ['dokuz nokta çemberi', 'dokuz_nokta', /Hangi üçgen/],
    ['dış teğet çemberi çiz', 'dis_teget', /Hangi üçgen/],
    ['Stewart teoremini göster', 'ucgen_teoremi', /Hangi üçgen/],
    ['orta tabanı çiz', 'orta_taban', /Hangi üçgen/],
    ['kiriş çiz', 'kiris', /çember/],
    ['kesen çiz', 'kesen', /çember/],
    ['noktanın kuvvetini bul', 'kuvvet', /çember/],
  ])('asks instead of guessing without a figure: “%s” (%s)', (text, intent, pattern) => {
    const result = say(text, intent, [], []);
    expect(result.command).toBeUndefined();
    expect(result.clarification).toMatch(pattern);
  });

  it('asks for the point of a power and for two circles', () => {
    expect(say('çembere göre kuvveti hesapla', 'kuvvet', [], cemberli).clarification).toMatch(/Hangi noktanın/);
    expect(say('ortak teğetleri çiz', 'ortak_teget', [], cemberli).clarification).toMatch(/iki çember/);
  });
});

describe('semantic theorem commands run on the real engine', () => {
  const triangleCases: [string, string][] = [
    ['Öklid üçgeni istiyorum', 'oklid'], ['dik kenarları 6 ve 8 olan Öklid üçgeni', 'oklid'], ['üçgende Öklid bağıntılarını göster', 'oklid'],
    ['ABC üçgeninde Öklid şeklini kur', 'oklid'], ['Pisagor şekli yap', 'pisagor'], ['Pisagor bağıntısını doğrula', 'pisagor'], ["Pisagor'a göre üçgen dik mi", 'pisagor'],
    ['Tales şekli çiz', 'tales'], ['kelebek Tales şekli', 'tales'], ['Tales çemberi çiz', 'tales'], ['ABC üçgeninde 2:1 oranında Tales şekli', 'tales'], ['üçgende Tales oranlarını göster', 'tales'],
    ['üçgenin orta tabanını çiz', 'orta_taban'], ['üçgenin orta tabanlarını çiz', 'orta_taban'], ['Euler doğrusu', 'euler'], ['dokuz nokta çemberini merkeziyle çiz', 'dokuz_nokta'],
    ['dış teğet çemberi çiz', 'dis_teget'], ['A köşesine ait dış teğet çemberi', 'dis_teget'], ['üç dış teğet çemberi çiz', 'dis_teget'],
    ['açıortay teoremini göster', 'ucgen_teoremi'], ['B köşesi için açıortay teoremi', 'ucgen_teoremi'], ['kenarortay teoremini uygula', 'ucgen_teoremi'],
    ['Stewart teoremini doğrula', 'ucgen_teoremi'], ['Ceva teoremini göster', 'ucgen_teoremi'],
    ['sinüs teoremini yaz', 'ucgen_teoremi'], ['A açısı için kosinüs teoremi', 'ucgen_teoremi'], ['Heron formülüyle alanı bul', 'ucgen_teoremi'],
    ['üçgen eşitsizliğini doğrula', 'ucgen_teoremi'], ['kenarları 2, 3 ve 7 olan üçgen çizilebilir mi', 'ucgen_teoremi'], ['büyük açı karşısında büyük kenar', 'ucgen_teoremi'],
  ];
  const circleCases: [string, string][] = [
    ['AB kirişini çiz', 'kiris'], ['çembere bir kiriş çiz', 'kiris'], ['çemberin çapını çiz', 'kiris'], ['merkezden kirişe dikme indir', 'kiris'],
    ['P noktasından çembere kesen çiz', 'kesen'], ["P'den iki kesen çiz", 'kesen'], ['kesenler teoremini göster', 'kesen'], ['kirişler teoremini göster', 'kesen'], ['teğet-kesen teoremini göster', 'kesen'],
    ['P noktasının çembere göre kuvveti kaçtır', 'kuvvet'], ['kuvvet teoremini göster', 'kuvvet'],
    ['çevre açı çiz', 'cevre_aci'], ['AB yayını gören çevre açıyı çiz', 'cevre_aci'], ['çevre açı merkez açının yarısıdır', 'cevre_aci'],
    ['teğet-kiriş açısını çiz', 'teget_kiris'], ['A noktasındaki teğet-kiriş açısı', 'teget_kiris'], ['teğet kiriş açısı teoremini göster', 'teget_kiris'],
  ];
  const twoCircleCases: [string, string][] = [
    ['iki çemberin ortak teğetlerini çiz', 'ortak_teget'], ['iç ortak teğetleri çiz', 'ortak_teget'],
    ['M merkezli çembere bir kiriş çiz', 'kiris'], ['M merkezli çembere AB kirişini çiz', 'kiris'], ['M merkezli çemberin çapını çiz', 'kiris'],
    ['P noktasından M merkezli çembere kesen çiz', 'kesen'], ['P noktasının M merkezli çembere göre kuvveti', 'kuvvet'],
    ['M merkezli çemberde çevre açı çiz', 'cevre_aci'], ['M merkezli çemberde teğet-kiriş açısını çiz', 'teget_kiris'],
  ];
  // Menelaus: kesen doğru üç kenar doğrusunu da kesmeli; `rich` sahnesindeki DE doğrusu AB'ye paralel olduğundan düz üçgen sahnesi kullanılır.
  it.each([...triangleCases.map(c => [...c, rich] as const), ['Menelaus teoremini uygula', 'ucgen_teoremi', scene] as const,
    ...circleCases.map(c => [...c, cemberli] as const), ...twoCircleCases.map(c => [...c, ikiCember] as const)])('“%s” (%s)', (text, intent, objects) => {
    const { command } = say(text, intent, [], objects);
    expect(command, 'komut üretilmedi').toBeTruthy();
    const result = executeTurkishCommand(command!, objects);
    if (!result.ok) throw new Error(`“${command}” motorda başarısız: ${result.message}`);
  });
});

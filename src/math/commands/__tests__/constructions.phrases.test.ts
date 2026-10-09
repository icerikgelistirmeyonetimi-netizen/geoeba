import { describe, expect, it } from 'vitest';
import type { MathObject, PointObject } from '@/types/math';
import { runCommand } from '../engine';
import { CommandScene } from '../scene';
import { normalizeSpokenCommand } from '../speechText';
import type { CommandSuccess } from '../types';

/**
 * İnşalar ailesi: öğretmenin yazdığı ya da söylediği (konuşma metni normalizeSpokenCommand'dan geçer) gerçekçi cümleler,
 * TÜM komut aileleriyle (varsayılan HANDLERS) sınanır. constructions.test.ts aileyi yalıtılmış sınar; burada aileler arası
 * çakışmalar, çok işlemli cümleler ve konuşma yazımı da yakalanır. Her satır: cümle, sahne, beklenen sonuç.
 */

type Objs = MathObject[];
const build = (fn: (s: CommandScene) => void, initial: Objs = []): Objs => { const s = new CommandScene(initial); fn(s); s.resolve(); return s.objects; };
const withPoints = (spec: Record<string, [number, number]>, extra?: (s: CommandScene, p: Record<string, PointObject>) => void) => build(s => {
  const p: Record<string, PointObject> = {};
  for (const [label, [x, y]] of Object.entries(spec)) p[label] = s.addPoint({ x, y }, { label });
  extra?.(s, p);
});
const cmd = (objs: Objs, text: string): Objs => { const r = runCommand(text, objs); if (!r.ok) throw new Error(`setup “${text}”: ${r.message}`); return r.objects; };
function cmdScene(base: () => Objs, text: string) { return () => cmd(base(), text); }

const S = {
  empty: (): Objs => [],
  tri: () => withPoints({ A: [0, 0], B: [6, 0], C: [2, 4] }, (s, p) => { s.addPolygon([p.A.id, p.B.id, p.C.id], { kind: 'triangle' }); }),
  tri345: () => withPoints({ A: [-1.5, -1], B: [1.5, -1], C: [1.5, 3] }, (s, p) => { s.addPolygon([p.A.id, p.B.id, p.C.id], { kind: 'triangle' }); }),
  twoTri: () => withPoints({ A: [0, 0], B: [6, 0], C: [2, 4], D: [10, 0], E: [14, 0], F: [11, 3] }, (s, p) => {
    s.addPolygon([p.A.id, p.B.id, p.C.id], { kind: 'triangle' }); s.addPolygon([p.D.id, p.E.id, p.F.id], { kind: 'triangle' });
  }),
  seg: () => withPoints({ A: [0, 0], B: [6, 0] }, (s, p) => { s.addSegment(p.A.id, p.B.id); }),
  pts2: () => withPoints({ A: [0, 0], B: [4, 0] }),
  points3: () => withPoints({ A: [0, 0], B: [6, 0], C: [0, 6] }),
  collinear: () => withPoints({ A: [0, 0], B: [6, 0], C: [3, 0] }),
  angle: () => withPoints({ A: [4, 0], B: [0, 0], C: [0, 4] }),
  lines: () => withPoints({ A: [0, 3], B: [-2, 0], C: [4, 0], D: [1, 5] }, (s, p) => { s.addLine(p.B.id, p.C.id, { label: 'd' }); s.addSegment(p.A.id, p.B.id); }),
  square: () => withPoints({ A: [0, 0], B: [4, 0], C: [4, 4], D: [0, 4] }, (s, p) => { s.addPolygon([p.A.id, p.B.id, p.C.id, p.D.id], { kind: 'square' }); }),
  circle: () => withPoints({ M: [0, 0], P: [4, 0], Q: [0, -5], T: [0, 2], B: [-3, 1], C: [3, 1] }, (s, p) => {
    s.addCircle({ centerId: p.M.id, radius: 2 }, { label: 'c1' }); s.addLine(p.B.id, p.C.id);
  }),
  twoCircles: () => withPoints({ M: [0, 0], N: [3, 0] }, (s, p) => { s.addCircle({ centerId: p.M.id, radius: 2 }); s.addCircle({ centerId: p.N.id, radius: 2 }); }),
  cross: () => withPoints({ A: [0, 0], B: [4, 4], C: [0, 4], D: [4, 0] }, (s, p) => { s.addLine(p.A.id, p.B.id); s.addLine(p.C.id, p.D.id); }),
  cross4: () => withPoints({ A: [0, 0], B: [4, 4], C: [0, 4], D: [4, 0] }),
  parallel: () => withPoints({ A: [0, 0], B: [4, 0], C: [0, 2], D: [4, 2] }, (s, p) => { s.addLine(p.A.id, p.B.id); s.addLine(p.C.id, p.D.id); }),
  tangentLine: () => withPoints({ K: [0, 3], A: [-2, 0], B: [4, 0] }),
  rich: () => withPoints({ A: [0, 0], B: [6, 0], C: [2, 4], D: [8, 5], P: [12, 0], M: [9, 0] }, (s, p) => {
    s.addPolygon([p.A.id, p.B.id, p.C.id], { kind: 'triangle' });
    s.addCircle({ centerId: p.M.id, radius: 2 }, { label: 'c1' });
    s.addLine(p.P.id, p.D.id, { label: 'd' });
    s.addLine(p.A.id, p.D.id, { label: 'e' });
  }),
  bisectors: () => cmd(cmd(S.tri(), "AB'nin orta dikmesini çiz"), 'C köşesinin açıortayını çiz'),
  bound: () => cmd(S.tri345(), 'Üçgen uzunluklarını kaydırıcıya bağla'),
  fnLinearA: () => cmd(withPoints({ A: [0, 3] }), 'y = 2x + 1'),
  fnLinearOnly: () => cmd([], 'y = 2x + 1'),
  fParab: () => cmd([], 'f(x) = x^2 - 4'),
  fg: () => cmd(cmd([], 'f(x) = x^2'), 'g(x) = x + 2'),
  fgApart: () => cmd(cmd([], 'f(x) = x^2 + 1'), 'g(x) = x - 5'),
  fLineAB: () => cmd(withPoints({ A: [-3, 0], B: [3, 0] }, (s, p) => { s.addLine(p.A.id, p.B.id); }), 'f(x) = x^2 - 4'),
  fLinA: () => cmd(withPoints({ A: [1, 5] }), 'f(x) = 2x + 1'),
};

type Check = (r: CommandSuccess, before: Objs) => string | void;
type Exp = { fail: RegExp | true } | { check: Check };
interface Case { text: string; scene: () => Objs; exp: Exp; spoken?: boolean; select?: (o: Objs) => string[] }

const fresh = (r: CommandSuccess, before: Objs) => r.objects.filter(o => !before.some(b => b.id === o.id));
const kinds = (objs: Objs) => {
  const out: Record<string, number> = {};
  for (const o of objs) {
    const k = o.type === 'point' ? (o.construction ? `pt:${o.construction.kind}` : 'pt') : o.type;
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
};
/** Yeni nesnelerin tür sayıları (belirtilenler tam eşleşmeli; pt* = tüm noktalar). */
const made = (spec: Record<string, number>, extra?: Check): Exp => ({
  check: (r, before) => {
    const k = kinds(fresh(r, before));
    const count = (key: string) => key === 'pt*' ? Object.entries(k).filter(([x]) => x.startsWith('pt')).reduce((s, [, v]) => s + v, 0) : (k[key] ?? 0);
    const bad = Object.entries(spec).filter(([key, n]) => count(key) !== n);
    if (bad.length) return `beklenen ${JSON.stringify(spec)}, oluşan ${JSON.stringify(k)}`;
    return extra?.(r, before);
  },
});
const at = (x: number, y: number, label?: string): Check => (r, before) => {
  const pts = fresh(r, before).filter((o): o is PointObject => o.type === 'point');
  const hit = pts.find(p => Math.abs(p.x - x) < 1e-6 && Math.abs(p.y - y) < 1e-6 && (!label || p.label === label));
  return hit ? undefined : `(${x}; ${y})${label ? ' ' + label : ''} noktası yok: ${pts.map(p => `${p.label}(${p.x};${p.y})`).join(' ')}`;
};
const all = (...checks: Check[]): Check => (r, b) => { for (const c of checks) { const m = c(r, b); if (m) return m; } };
const fail = (re: RegExp | true = true): Exp => ({ fail: re });
const changed: Exp = { check: (r) => r.sceneChanged ? undefined : 'sahne değişmedi' };
const any: Exp = { check: () => undefined };

const CASES: Case[] = [
  // ------------------------------------------------------------------ orta nokta
  { text: "AB'nin orta noktasını bul", scene: S.seg, exp: made({ 'pt:midpoint': 1 }, at(3, 0)) },
  { text: 'ab nin orta noktasını bul', scene: S.seg, exp: made({ 'pt:midpoint': 1 }, at(3, 0)) },
  { text: 'ABnin orta noktası', scene: S.seg, exp: made({ 'pt:midpoint': 1 }, at(3, 0)) },
  { text: 'A ile B nin orta noktasını işaretle', scene: S.pts2, exp: made({ 'pt:midpoint': 1 }, at(2, 0)) },
  { text: 'A ve B noktalarının orta noktasını bul', scene: S.pts2, exp: made({ 'pt:midpoint': 1 }, at(2, 0)) },
  { text: 'a ve b noktalarının orta noktasını bulur musun', scene: S.pts2, exp: made({ 'pt:midpoint': 1 }, at(2, 0)) },
  { text: 'AB doğru parçasının orta noktasını çizer misin', scene: S.seg, exp: made({ 'pt:midpoint': 1 }) },
  { text: '[AB] nin orta noktası M olsun', scene: S.seg, exp: made({ 'pt:midpoint': 1 }, at(3, 0, 'M')) },
  { text: "AB'nin orta noktasını K olarak işaretle", scene: S.seg, exp: made({ 'pt:midpoint': 1 }, at(3, 0, 'K')) },
  { text: 'orta noktayı bul', scene: S.seg, exp: made({ 'pt:midpoint': 1 }) },
  { text: 'AB yi ikiye böl', scene: S.seg, exp: made({ 'pt*': 1 }, at(3, 0)) },
  { text: "AB'yi iki eşit parçaya böl", scene: S.seg, exp: made({ 'pt*': 1 }, at(3, 0)) },
  { text: 'A(0;0) ve B(4;0) noktalarını oluştur ve orta noktasını bul', scene: S.empty, exp: made({ pt: 2, 'pt:midpoint': 1 }, at(2, 0)) },
  { text: 'A(1;1) ve B(5;3) noktalarını oluşturup orta noktasını bul', scene: S.empty, exp: made({ pt: 2, 'pt:midpoint': 1 }, at(3, 2)) },
  { text: '(0;0) ile (4;2) noktalarının orta noktasını bul', scene: S.empty, exp: made({ 'pt:midpoint': 1 }, at(2, 1)) },
  { text: 'üçgenin kenarlarının orta noktalarını bul', scene: S.tri, exp: made({ 'pt:midpoint': 3 }) },
  { text: 'ABC üçgeninin kenar orta noktalarını birleştir', scene: S.tri, exp: made({ 'pt:midpoint': 3, polygon: 1 }) },
  { text: 'bana AB nin orta noktası lazım', scene: S.seg, exp: made({ 'pt:midpoint': 1 }) },
  { text: 'AB nin orta noktasını bulmak istiyorum', scene: S.seg, exp: made({ 'pt:midpoint': 1 }) },
  { text: "şimdi AB'nin orta noktasını bulalım", scene: S.seg, exp: made({ 'pt:midpoint': 1 }) },
  { text: 'M noktası AB nin orta noktası olsun', scene: S.seg, exp: made({ 'pt:midpoint': 1 }, at(3, 0, 'M')) },
  { text: "AB'nin orta noktası", scene: S.seg, exp: made({ 'pt:midpoint': 1 }) },
  { text: 'seçili noktaların orta noktasını bul', scene: S.pts2, select: o => o.filter(x => x.type === 'point').map(x => x.id), exp: made({ 'pt:midpoint': 1 }, at(2, 0)) },
  { text: 'a be nin orta noktasını bul', scene: S.seg, spoken: true, exp: made({ 'pt:midpoint': 1 }) },
  { text: 'a be doğru parçasının orta noktasını bul', scene: S.seg, spoken: true, exp: made({ 'pt:midpoint': 1 }) },
  { text: 'tamam şimdi AB nin orta noktasını bul lütfen', scene: S.seg, exp: made({ 'pt:midpoint': 1 }) },
  { text: "AB'nin orta noktasını bul", scene: S.empty, exp: fail(/AB/) },
  { text: 'A noktasının orta noktasını bul', scene: S.pts2, exp: fail(/iki nokta/) },
  { text: 'AB ile CD nin orta noktasını bul', scene: S.cross, exp: made({ 'pt:midpoint': 2 }) },
  { text: 'AB doğru parçası çiz ve orta noktasını bul', scene: S.pts2, exp: made({ segment: 1, 'pt:midpoint': 1 }) },
  { text: 'orta noktasını bul', scene: S.pts2, exp: fail(/nokta/) },
  { text: 'AB nin orta noktasının koordinatlarını bul', scene: S.seg, exp: { check: (r) => /3/.test(r.message) ? undefined : `mesaj: ${r.message}` } },

  // ------------------------------------------------------------------ oranda bölme
  { text: "AB'yi 2:1 oranında böl", scene: S.seg, exp: made({ 'pt:ratio': 1 }, at(4, 0)) },
  { text: 'AB yi 1 e 2 oranında böl', scene: S.seg, exp: made({ 'pt:ratio': 1 }, at(2, 0)) },
  { text: 'AB doğru parçasını üç eşit parçaya böl', scene: S.seg, exp: made({ 'pt:ratio': 2 }) },
  { text: "AB'yi 3'e böl", scene: S.seg, exp: made({ 'pt:ratio': 2 }) },
  { text: "AB'yi dörde böl", scene: S.seg, exp: made({ 'pt*': 3 }) },
  { text: "AB'yi 2'ye 3 oranında bölen noktayı bul", scene: S.seg, exp: made({ 'pt:ratio': 1 }, at(2.4, 0)) },
  { text: "AB'yi 3:2 oranında içten bölen P noktasını oluştur", scene: S.seg, exp: made({ 'pt:ratio': 1 }, at(3.6, 0, 'P')) },
  { text: 'AB doğru parçasını dıştan 3:1 oranında böl', scene: S.seg, exp: made({ 'pt:ratio': 1 }, at(9, 0)) },
  { text: "AB'yi beş eşit parçaya ayır", scene: S.seg, exp: made({ 'pt:ratio': 4 }) },
  { text: "AB'yi 1/3 oranında böl", scene: S.seg, exp: made({ 'pt:ratio': 1 }, at(1.5, 0)) },
  { text: 'a be doğru parçasını iki bölü bir oranında böl', scene: S.seg, spoken: true, exp: made({ 'pt:ratio': 1 }, at(4, 0)) },
  { text: 'AB yi 0 eşit parçaya böl', scene: S.seg, exp: fail(/parça/) },
  { text: "AB'yi 2:2 oranında dıştan böl", scene: S.seg, exp: fail(/eşit/) },
  { text: 'AB yi 3 eşit parçaya bölelim', scene: S.seg, exp: made({ 'pt:ratio': 2 }) },
  { text: 'AB yi 2 ye 1 oranında bölen noktayı işaretler misin', scene: S.seg, exp: made({ 'pt:ratio': 1 }, at(4, 0)) },
  { text: 'doğru parçasını 3 eşit parçaya böl', scene: S.seg, exp: made({ 'pt:ratio': 2 }) },

  // ------------------------------------------------------------------ paralel / dik doğru
  { text: "A'dan BC'ye dik doğru çiz", scene: S.lines, exp: made({ line: 1, 'pt:direction': 1 }) },
  { text: 'A noktasından d doğrusuna paralel çiz', scene: S.lines, exp: made({ line: 1 }) },
  { text: 'd ye A dan paralel doğru çiz', scene: S.lines, exp: made({ line: 1 }) },
  { text: 'A dan BC ye dik çiz', scene: S.lines, exp: made({ line: 1 }) },
  { text: 'a noktasından bc doğrusuna dik doğru çizer misin', scene: S.lines, exp: made({ line: 1 }) },
  { text: 'D noktasından geçen ve AB ye paralel olan doğruyu çiz', scene: S.lines, exp: made({ line: 1 }) },
  { text: "AB'ye paralel D'den geçen doğru", scene: S.lines, exp: made({ line: 1 }) },
  { text: 'B noktasında BC doğrusuna dik doğru çiz', scene: S.lines, exp: made({ line: 1 }) },
  { text: "D'den d'ye paralel bir doğru çizelim", scene: S.lines, exp: made({ line: 1 }) },
  { text: 'D noktasından d doğrusuna bir paralel çizmek istiyorum', scene: S.lines, exp: made({ line: 1 }) },
  { text: 'D den geçen d ye paralel doğru lazım', scene: S.lines, exp: made({ line: 1 }) },
  { text: 'A noktasından AB ye dik çiz', scene: S.lines, exp: made({ line: 1 }) },
  { text: 'B noktasından d ye paralel çiz', scene: S.lines, exp: fail(/üzerinde/) },
  { text: 'Z noktasından d ye paralel çiz', scene: S.lines, exp: fail(/Z/) },
  { text: 'd doğrusuna paralel çiz', scene: S.lines, exp: fail(/hangi noktadan/i) },
  { text: '(1; 2) noktasından d ye dik doğru çiz', scene: S.lines, exp: made({ pt: 1, line: 1 }) },
  { text: 'E(2;3) noktasından geçen BC ye paralel doğru çiz', scene: S.lines, exp: made({ pt: 1, line: 1 }, at(2, 3, 'E')) },
  { text: 'iki paralel doğru çiz', scene: S.empty, exp: made({ line: 2 }) },
  { text: 'birbirine dik iki doğru çiz', scene: S.empty, exp: made({ line: 2 }) },
  { text: 'd doğrusuna dik olan ve D den geçen doğru', scene: S.lines, exp: made({ line: 1 }) },
  { text: 'C noktasından AB doğru parçasına dik doğru çiz', scene: S.lines, exp: made({ line: 1 }) },
  { text: "A'dan BC'ye dik doğru çiz ve kesişim noktasını bul", scene: S.lines, exp: made({ line: 1, 'pt:intersection': 1 }, at(0, 0)) },
  { text: 'A noktasından y = 2x + 1 doğrusuna dik çiz', scene: S.fnLinearA, exp: made({ line: 1 }) },
  { text: 'A noktasından bu doğruya dik çiz', scene: S.fnLinearA, select: o => o.filter(x => x.type === 'function').map(x => x.id), exp: made({ line: 1 }) },
  { text: 'bu doğruya dik çiz', scene: S.fnLinearOnly, select: o => o.filter(x => x.type === 'function').map(x => x.id), exp: fail(/nokta/) },
  { text: 'f fonksiyonuna A noktasından dik çiz', scene: S.fLinA, exp: made({ line: 1 }) },
  { text: 'A noktasından f ye paralel doğru çiz', scene: S.fLinA, exp: made({ line: 1 }) },
  { text: 'A noktasından f(x) = 2x+1 doğrusuna paralel çiz', scene: S.fLinA, exp: made({ line: 1 }) },
  { text: 'A dan f nin grafiğine dik doğru çiz', scene: () => cmd(withPoints({ A: [1, 5] }), 'f(x) = x^2 - 4'), exp: fail(/doğrusal|doğru değil|eğri/) },
  { text: "A noktasından f'nin grafiğine paralel çiz", scene: S.fLinA, exp: made({ line: 1 }) },
  { text: 'x = 3 doğrusuna A noktasından dik çiz', scene: S.fnLinearA, exp: made({ line: 2 }) },
  { text: 'A noktasından y = 2x + 1 doğrusuna paralel çiz', scene: () => withPoints({ A: [0, 3] }), exp: made({ line: 2 }) },
  { text: 'bu fonksiyona A dan dik çiz', scene: S.fLinA, select: o => o.filter(x => x.type === 'function').map(x => x.id), exp: made({ line: 1 }) },
  { text: 'f ve g nin kesişim noktalarını bul', scene: S.rich, exp: fail(/f ve g adlı fonksiyon bulunamadı/) },
  { text: 'f ile h nin kesişim noktalarını bul', scene: S.fg, exp: fail(/h adlı fonksiyon bulunamadı/) },
  { text: 'x eksenini kestiği noktaları bul', scene: S.fParab, select: o => o.filter(x => x.type === 'function').map(x => x.id), exp: made({ 'pt*': 2 }) },
  { text: 'f(x) = x^2 - 4 çiz ve köklerini bul', scene: S.empty, exp: made({ function: 1, 'pt*': 2 }) },
  { text: 'kenarortay ile yüksekliğin kesişimini bul', scene: cmdScene(cmdScene(S.tri, "A'dan kenarortay çiz"), "B'den AC'ye yükseklik çiz"), exp: made({ 'pt:intersection': 1 }) },
  { text: 'teğet ile c1 in kesişim noktasını bul', scene: cmdScene(S.circle, 'T noktasında çembere teğet çiz'), exp: { check: (r) => /T\(0; 2\)|zaten/.test(r.message) ? undefined : `mesaj: ${r.message}` } },
  { text: 'A dan çizilen kenarortay ile BC nin kesişim noktası', scene: cmdScene(S.tri, 'üçgenin kenarortaylarını çiz'), exp: { check: (r) => /4; 2/.test(r.message) ? undefined : `mesaj: ${r.message}` } },
  { text: 'kesişim noktasından AB ye dikme indir', scene: cmdScene(S.cross, 'AB ve CD doğrularının kesişim noktasını bul'), exp: fail(/üzerinde/) },
  { text: 'kesişim noktasından d ye dikme indir', scene: cmdScene(() => build(s => { s.addLine(s.addPoint({ x: 0, y: -2 }, { label: 'F' }).id, s.addPoint({ x: 4, y: -2 }, { label: 'G' }).id, { label: 'd' }); }, S.cross()), 'AB ve CD doğrularının kesişim noktasını bul'), exp: made({ segment: 1, 'pt:foot': 1 }, at(2, -2)) },
  { text: 'kesişim noktasından geçen ve d ye paralel doğru çiz', scene: cmdScene(() => build(s => { s.addLine(s.addPoint({ x: 0, y: -2 }, { label: 'F' }).id, s.addPoint({ x: 5, y: -1 }, { label: 'G' }).id, { label: 'd' }); }, S.cross()), 'AB ve CD doğrularının kesişim noktasını bul'), exp: made({ line: 1 }) },
  { text: 'f ve g fonksiyonlarının kesişimi', scene: S.rich, exp: fail(/Fonksiyon bulunamadı/) },
  { text: 'şey A dan BC ye paralel çiz', scene: S.lines, exp: made({ line: 1 }) },
  { text: 'AB ye paralel çiz', scene: S.lines, exp: fail(/nokta/) },
  { text: 'be noktasından a de doğrusuna paralel çiz', scene: S.lines, spoken: true, exp: made({ line: 1 }) },
  { text: 'D noktasından BC ye paralel ve AB ye dik doğrular çiz', scene: S.lines, exp: { check: (r, b) => (fresh(r, b).filter(o => o.type === 'line').length === 2 ? undefined : `oluşan ${JSON.stringify(kinds(fresh(r, b)))}`) } },

  // ------------------------------------------------------------------ dikme / yükseklik
  { text: "B'den AC'ye dikme indir", scene: S.tri, exp: made({ segment: 1, 'pt:foot': 1 }) },
  { text: 'C noktasından AB ye dikme indir', scene: S.tri, exp: made({ segment: 1, 'pt:foot': 1 }, at(2, 0)) },
  { text: 'C köşesinden yükseklik çiz', scene: S.tri, exp: made({ segment: 1, 'pt:foot': 1 }, at(2, 0)) },
  { text: 'C den AB kenarına yükseklik çiz', scene: S.tri, exp: made({ segment: 1, 'pt:foot': 1 }, at(2, 0)) },
  { text: 'üçgenin yüksekliklerini çiz', scene: S.tri, exp: made({ segment: 3, 'pt:foot': 3 }) },
  { text: 'ABC üçgeninin üç yüksekliğini de çiz', scene: S.tri, exp: made({ segment: 3, 'pt:foot': 3 }) },
  { text: 'h_c yüksekliğini çiz', scene: S.tri, exp: made({ segment: 1, 'pt:foot': 1 }, at(2, 0)) },
  { text: "A'nın BC üzerindeki izdüşümünü bul", scene: S.tri, exp: made({ 'pt:foot': 1, segment: 0 }) },
  { text: 'C noktasının AB doğrusu üzerindeki dik izdüşümü', scene: S.tri, exp: made({ 'pt:foot': 1, segment: 0 }, at(2, 0)) },
  { text: "C'den AB'ye inen dikmenin ayağını bul", scene: S.tri, exp: made({ 'pt:foot': 1 }, at(2, 0)) },
  { text: 'AB ye C den bir dikme çizer misiniz', scene: S.tri, exp: made({ segment: 1, 'pt:foot': 1 }) },
  { text: 'c den ab ye dikme indir', scene: S.tri, exp: made({ segment: 1, 'pt:foot': 1 }) },
  { text: "C'den AB'ye dik indir", scene: S.tri, exp: made({ segment: 1, 'pt:foot': 1 }) },
  { text: 'yükseklik çiz', scene: S.tri, exp: fail(/köşe/) },
  { text: 'B köşesinden yükseklik indir ve uzunluğunu ölç', scene: S.tri, exp: made({ segment: 1, 'pt:foot': 1 }) },
  { text: 'BC kenarına ait yüksekliği çiz', scene: S.tri, exp: made({ segment: 1, 'pt:foot': 1 }) },
  { text: 'AC ye ait yüksekliği çizer misin', scene: S.tri, exp: made({ segment: 1, 'pt:foot': 1 }) },
  { text: "B'den AC'ye yükseklik çiz", scene: S.tri, exp: made({ segment: 1, 'pt:foot': 1 }) },
  { text: 'A noktasından BC ye dikme indir', scene: S.tri, exp: made({ segment: 1, 'pt:foot': 1 }) },
  { text: 'be noktasından a ce ye dikme indir', scene: S.tri, spoken: true, exp: made({ segment: 1, 'pt:foot': 1 }) },
  { text: "C'den tabana yükseklik çek", scene: S.tri, exp: made({ segment: 1, 'pt:foot': 1 }, at(2, 0)) },
  { text: 'D noktasından d doğrusuna dikme indir', scene: S.lines, exp: made({ segment: 1, 'pt:foot': 1 }, at(1, 0)) },
  { text: 'dikme indir', scene: S.lines, exp: fail(/nokta/) },
  { text: 'evet C den AB ye dikme indir', scene: S.tri, exp: made({ segment: 1, 'pt:foot': 1 }) },
  { text: "C'den AB'ye dikme indir", scene: S.collinear, exp: fail(/üzerinde/) },
  { text: 'üçgenin yüksekliklerini çiz', scene: S.twoTri, exp: fail(/üçgen/) },
  { text: 'C den AB ye dikme indirelim', scene: S.tri, exp: made({ segment: 1, 'pt:foot': 1 }) },
  { text: 'B köşesinden karşı kenara yükseklik çiz', scene: S.tri, exp: made({ segment: 1, 'pt:foot': 1 }) },
  { text: 'C den dikme indir ve ayağına H de', scene: S.tri, exp: made({ segment: 1, 'pt:foot': 1 }, at(2, 0, 'H')) },

  // ------------------------------------------------------------------ orta dikme
  { text: "AB'nin orta dikmesini çiz", scene: S.seg, exp: made({ line: 1 }) },
  { text: 'ab nin orta dikmesini çiz', scene: S.seg, exp: made({ line: 1 }) },
  { text: 'A ile B arasındaki orta dikmeyi çiz', scene: S.pts2, exp: made({ line: 1 }) },
  { text: 'AB doğru parçasının orta dikmesini çizelim', scene: S.seg, exp: made({ line: 1 }) },
  { text: 'üçgenin orta dikmelerini çiz', scene: S.tri, exp: made({ line: 3 }) },
  { text: 'BC kenarının orta dikmesini çiz', scene: S.tri, exp: made({ line: 1 }) },
  { text: 'orta dikme çiz', scene: S.seg, exp: made({ line: 1 }) },
  { text: 'a be nin orta dikmesini çiz', scene: S.seg, spoken: true, exp: made({ line: 1 }) },
  { text: "AB'nin kenar orta dikmesini çiz", scene: S.seg, exp: made({ line: 1 }) },
  { text: 'orta dikme ile açıortayın kesişim noktasını bul', scene: S.bisectors, exp: made({ 'pt:intersection': 1 }) },
  { text: 'orta dikmesini çiz', scene: S.pts2, exp: fail(/doğru parçası|nokta/) },
  { text: 'AB nin orta dikmesini çiz ve orta noktasını bul', scene: S.seg, exp: made({ line: 1, 'pt:midpoint': 1 }) },

  // ------------------------------------------------------------------ açıortay
  { text: 'ABC açısının açıortayını çiz', scene: S.angle, exp: made({ ray: 1 }) },
  { text: 'B açısının açıortayını çiz', scene: S.tri, exp: made({ ray: 1 }) },
  { text: 'abc açısının açı ortayını çiz', scene: S.angle, exp: made({ ray: 1 }) },
  { text: 'C köşesinden açıortay çiz', scene: S.tri, exp: made({ ray: 1 }) },
  { text: 'üçgenin iç açıortaylarını çiz', scene: S.tri, exp: made({ ray: 3 }) },
  { text: 'A açısını ikiye bölen ışını çiz', scene: S.tri, exp: made({ ray: 1 }) },
  { text: 'ABC açısının dış açıortayı', scene: S.angle, exp: made({ line: 1 }) },
  { text: 'açıortay çiz', scene: S.tri, exp: fail(/açı/) },
  { text: 'BAC açısının açıortayını çiz', scene: S.tri, exp: made({ ray: 1 }) },
  { text: 'A köşesindeki açının açıortayını çizer misin', scene: S.tri, exp: made({ ray: 1 }) },
  { text: 'be köşesinden açı ortay çiz', scene: S.tri, spoken: true, exp: made({ ray: 1 }) },
  { text: 'açıortayları çiz', scene: S.tri, exp: made({ ray: 3 }) },
  { text: 'ABC açısını iki eşit parçaya bölen ışın', scene: S.angle, exp: made({ ray: 1 }) },
  { text: "ABC'nin B açısının açıortayını çiz", scene: S.tri, exp: made({ ray: 1 }) },
  { text: 'B açısının açıortayını çiz', scene: S.twoTri, exp: made({ ray: 1 }) },
  { text: 'açıortayını çiz', scene: S.twoTri, exp: fail(/açı/) },

  // ------------------------------------------------------------------ kenarortay
  { text: "A'dan kenarortay çiz", scene: S.tri, exp: made({ segment: 1, 'pt:midpoint': 1 }, at(4, 2)) },
  { text: 'A dan BC ye kenarortay çiz', scene: S.tri, exp: made({ segment: 1, 'pt:midpoint': 1 }, at(4, 2)) },
  { text: 'üçgenin kenarortaylarını çiz', scene: S.tri, exp: made({ segment: 3, 'pt:midpoint': 3 }) },
  { text: 'BC kenarına ait kenarortayı çiz', scene: S.tri, exp: made({ segment: 1 }) },
  { text: 'kenar ortayları çiz', scene: S.tri, exp: made({ segment: 3 }) },
  { text: 'C köşesinden AB kenarına kenarortay indir', scene: S.tri, exp: made({ segment: 1 }, at(3, 0)) },
  { text: 'V_a kenarortayını çiz', scene: S.tri, exp: made({ segment: 1 }, at(4, 2)) },
  { text: 'kenarortayları çiz ve kesişim noktalarını bul', scene: S.tri, exp: made({ segment: 3, 'pt:midpoint': 3, 'pt:triangleCenter': 1 }) },
  { text: 'kenarortay çiz', scene: S.tri, exp: fail(/köşe/) },
  { text: 'a dan kenar ortay çizer misin', scene: S.tri, spoken: true, exp: made({ segment: 1 }) },
  { text: 'B köşesinden kenarortay çizelim', scene: S.tri, exp: made({ segment: 1 }, at(1, 2)) },

  // ------------------------------------------------------------------ merkezler
  { text: 'ABC üçgeninin ağırlık merkezini bul', scene: S.tri, exp: made({ 'pt:triangleCenter': 1 }, at(8 / 3, 4 / 3, 'G')) },
  { text: 'üçgenin ağırlık merkezi', scene: S.tri, exp: made({ 'pt:triangleCenter': 1 }) },
  { text: 'diklik merkezini bul', scene: S.tri, exp: made({ 'pt:triangleCenter': 1 }) },
  { text: 'yüksekliklerin kesişim noktasını bul', scene: S.tri, exp: made({ 'pt:triangleCenter': 1 }) },
  { text: 'orta dikmelerin kesiştiği noktayı bul', scene: S.tri, exp: made({ 'pt:triangleCenter': 1 }) },
  { text: 'açıortayların kesişim noktası', scene: S.tri, exp: made({ 'pt:triangleCenter': 1 }) },
  { text: 'iç teğet çemberin merkezini bul', scene: S.tri, exp: made({ 'pt:triangleCenter': 1 }) },
  { text: 'üçgenin dört özel merkezini bul', scene: S.tri, exp: made({ 'pt:triangleCenter': 4 }) },
  { text: 'üçgenin merkezini bul', scene: S.tri, exp: fail(/ağırlık/) },
  { text: 'karenin merkezini bul', scene: S.square, exp: made({ 'pt*': 1 }, at(2, 2)) },
  { text: 'ağırlık merkezini K olarak işaretle', scene: S.tri, exp: made({ 'pt:triangleCenter': 1 }, at(8 / 3, 4 / 3, 'K')) },
  { text: 'A, B ve C noktalarının ağırlık merkezini bul', scene: S.points3, exp: made({ 'pt:triangleCenter': 1 }, at(2, 2)) },
  { text: 'a be ce üçgeninin ağırlık merkezini bul', scene: S.tri, spoken: true, exp: made({ 'pt:triangleCenter': 1 }) },
  { text: 'ağırlık merkezini bul', scene: S.pts2, exp: fail(/üçgen/) },
  { text: 'ABC üçgeni çiz ve ağırlık merkezini bul', scene: S.empty, exp: made({ polygon: 1, 'pt:triangleCenter': 1 }) },
  { text: 'üçgenin ağırlık merkezini bulalım', scene: S.tri, exp: made({ 'pt:triangleCenter': 1 }) },
  { text: 'çevrel çemberin merkezini O olarak işaretle', scene: S.tri, exp: made({ 'pt:triangleCenter': 1 }, at(3, 1, 'O')) },
  { text: 'kenarortayların kesiştiği nokta nerede', scene: S.tri, exp: made({ 'pt:triangleCenter': 1 }) },

  // ------------------------------------------------------------------ çevrel / iç teğet / teğet çember
  { text: "ABC'nin çevrel çemberini çiz", scene: S.tri, exp: made({ circle: 1 }) },
  { text: 'üçgenin çevrel çemberi', scene: S.tri, exp: made({ circle: 1 }) },
  { text: 'çevrel çemberi merkeziyle birlikte çiz', scene: S.tri, exp: made({ circle: 1, 'pt:triangleCenter': 1 }) },
  { text: 'iç teğet çemberini çiz', scene: S.tri, exp: made({ circle: 1 }) },
  { text: 'ABC üçgeninin içteğet çemberini çiz', scene: S.tri, exp: made({ circle: 1 }) },
  { text: 'üçgene iç teğet çember çizer misin', scene: S.tri, exp: made({ circle: 1 }) },
  { text: 'karenin çevrel çemberini çiz', scene: S.square, exp: made({ circle: 1 }) },
  { text: 'çevrel çember çiz', scene: S.pts2, exp: fail(/üçgen|çokgen/) },
  { text: 'K merkezli AB doğrusuna teğet çember çiz', scene: S.tangentLine, exp: made({ circle: 1 }) },
  { text: 'a be ce üçgeninin çevrel çemberini çiz', scene: S.tri, spoken: true, exp: made({ circle: 1 }) },
  { text: 'A(0;0), B(4;0) ve C(0;3) noktalarından üçgen çiz sonra iç teğet çemberini çiz', scene: S.empty, exp: made({ polygon: 1, circle: 1 }) },
  { text: 'üçgenin çevrel çemberini çizelim', scene: S.tri, exp: made({ circle: 1 }) },
  { text: 'çevrel çember çiz', scene: S.collinear, exp: fail() },
  { text: 'K merkezli ve AB ye teğet bir çember çiz', scene: S.tangentLine, exp: made({ circle: 1 }) },

  // ------------------------------------------------------------------ teğet
  { text: 'P noktasından çembere teğet çiz', scene: S.circle, exp: made({ line: 2, 'pt:tangent': 2 }) },
  { text: 'P den çembere teğet doğrular çiz', scene: S.circle, exp: made({ line: 2 }) },
  { text: "P'den c1'e teğetleri çiz", scene: S.circle, exp: made({ line: 2 }) },
  { text: 'T noktasında çembere teğet çiz', scene: S.circle, exp: made({ line: 1 }) },
  { text: 'M merkezli çembere P noktasından teğet çiz', scene: S.circle, exp: made({ line: 2 }) },
  { text: 'çembere P den teğet çizelim', scene: S.circle, exp: made({ line: 2 }) },
  { text: 'M noktasından çembere teğet çiz', scene: S.circle, exp: fail(/içinde/) },
  { text: 'çembere teğet çiz', scene: S.circle, exp: fail(/hangi noktadan/i) },
  { text: 'pe noktasından çembere teğet çiz', scene: S.circle, spoken: true, exp: made({ line: 2 }) },
  // Ortak teğetler artık teoremler ailesince çizilir (teoremler.ortakTeget): kesişen iki çemberin iki dış ortak teğeti vardır.
  { text: 'iki çemberin ortak teğetini çiz', scene: S.twoCircles, exp: made({ line: 2 }) },
  { text: 'P noktasından c1 çemberine teğet doğru çizer misin', scene: S.circle, exp: made({ line: 2 }) },
  { text: 'Q dan teğetleri çiz', scene: S.circle, exp: made({ line: 2 }) },
  { text: '(0; 4) noktasından çembere teğet çiz', scene: S.circle, exp: made({ line: 2, pt: 1 }) },

  // ------------------------------------------------------------------ kesişim
  { text: 'AB ve CD doğrularının kesişim noktasını bul', scene: S.cross, exp: made({ 'pt:intersection': 1 }, at(2, 2)) },
  { text: 'ab ile cd nin kesişimini bul', scene: S.cross, exp: made({ 'pt:intersection': 1 }, at(2, 2)) },
  { text: 'AB doğrusu ile CD doğrusunun kesiştiği noktayı bul', scene: S.cross, exp: made({ 'pt:intersection': 1 }, at(2, 2)) },
  { text: 'iki doğrunun kesişim noktasını bul', scene: S.cross, exp: made({ 'pt:intersection': 1 }) },
  { text: 'doğruların kesişim noktası', scene: S.cross, exp: made({ 'pt:intersection': 1 }) },
  { text: 'c1 ile BC doğrusunun kesişim noktalarını bul', scene: S.circle, exp: made({ 'pt:intersection': 2 }) },
  { text: 'çember ile doğrunun kesiştiği noktaları işaretle', scene: S.circle, exp: made({ 'pt:intersection': 2 }) },
  { text: 'iki çemberin kesişim noktalarını bul', scene: S.twoCircles, exp: made({ 'pt:intersection': 2 }) },
  { text: 'AB ve CD yi kesiştir', scene: S.cross, exp: made({ 'pt:intersection': 1 }) },
  { text: 'AB ile CD nin kesişim noktası K olsun', scene: S.cross, exp: made({ 'pt:intersection': 1 }, at(2, 2, 'K')) },
  { text: 'f ve g fonksiyonlarının kesişim noktalarını bul', scene: S.fg, exp: made({ 'pt*': 2 }, all(at(-1, 1), at(2, 4))) },
  { text: 'f nin x eksenini kestiği noktaları bul', scene: S.fParab, exp: made({ 'pt*': 2 }, all(at(-2, 0), at(2, 0))) },
  { text: 'f ile g nin kesiştiği noktaları bul', scene: S.fg, exp: made({ 'pt*': 2 }) },
  { text: 'f nin y eksenini kestiği noktayı bul', scene: S.fParab, exp: made({ 'pt*': 1 }, at(0, -4)) },
  { text: 'f ile x ekseninin kesişim noktaları', scene: S.fParab, exp: made({ 'pt*': 2 }) },
  { text: 'f fonksiyonu ile AB doğrusunun kesişim noktalarını bul', scene: S.fLineAB, exp: made({ 'pt*': 2 }, all(at(-2, 0), at(2, 0))) },
  { text: 'f ve g nin kesişimi', scene: S.fgApart, exp: fail(/kesişmiyor/) },
  { text: 'fonksiyonun x eksenini kestiği noktaları bul', scene: S.fParab, exp: made({ 'pt*': 2 }) },
  { text: 'f nin köklerini bul', scene: S.fParab, exp: made({ 'pt*': 2 }) },
  { text: 'AB ve CD doğrularını çiz ve kesişim noktasını bul', scene: S.cross4, exp: made({ line: 2, 'pt:intersection': 1 }) },
  { text: 'kesişim noktasını bul', scene: S.tri, exp: fail(/Hangi iki/) },
  { text: 'AB ve CD doğrularının kesişim noktasını bul', scene: S.parallel, exp: fail(/kesişmiyor/) },
  { text: 'd ile e doğrularının kesiştiği nokta', scene: S.rich, exp: { check: r => /D\(8; 5\) \(zaten vardı\)/.test(r.message) ? undefined : `mesaj: ${r.message}` } },
  { text: 'kesişim noktasından CD ye paralel çiz', scene: cmdScene(S.cross, 'AB ve CD doğrularının kesişim noktasını bul'), exp: fail(/üzerinde/) },
  { text: 'a be ve ce de doğrularının kesişim noktasını bul', scene: S.cross, spoken: true, exp: made({ 'pt:intersection': 1 }) },
  { text: 'çemberin x ekseniyle kesişim noktalarını bul', scene: S.circle, exp: made({ 'pt*': 2 }, all(at(-2, 0), at(2, 0))) },
  { text: 'AB doğrusunun y eksenini kestiği noktayı bul', scene: S.lines, exp: { check: r => /A\(0; 3\)/.test(r.message) ? undefined : `mesaj: ${r.message}` } },
  { text: 'AB ile CD kesişiyor mu', scene: S.parallel, exp: { check: r => /kesişmiyor/.test(r.message) && !r.sceneChanged ? undefined : `mesaj: ${r.message}` } },
  { text: 'x eksenini nerede keser', scene: S.fParab, select: o => o.filter(x => x.type === 'function').map(x => x.id), exp: made({ 'pt*': 2 }) },
  { text: 'f(x) = x^2 çiz ve x eksenini kestiği noktayı bul', scene: S.empty, exp: made({ function: 1, 'pt*': 1 }, at(0, 0)) },
  { text: 'f ile c1 çemberinin kesişim noktalarını bul', scene: () => cmd(withPoints({ M: [0, 0] }, (s, p) => { s.addCircle({ centerId: p.M.id, radius: 2 }, { label: 'c1' }); }), 'f(x) = x^2 - 2'), exp: made({ 'pt*': 3 }, all(at(0, -2), (r, b) => fresh(r, b).filter(o => o.type === 'point').every(p => Math.abs(Math.hypot((p as PointObject).x, (p as PointObject).y) - 2) < 1e-6) ? undefined : 'çember dışında nokta')) },
  { text: 'kenarortayla yüksekliğin kesişimini bul', scene: S.tri, exp: fail() },

  // ------------------------------------------------------------------ kaydırıcı bağı
  { text: 'üçgenin kenarlarını kaydırıcıya bağla', scene: S.tri345, exp: made({ slider: 3 }) },
  { text: 'ABC üçgeninin kenar uzunluklarını kaydırıcılara bağla', scene: S.tri345, exp: made({ slider: 3 }) },
  { text: 'kaydırıcı bağını kaldır', scene: S.bound, exp: changed },
  { text: 'üçgeni kaydırıcılara bağla', scene: S.tri345, exp: made({ slider: 3 }) },
  { text: 'kenar uzunluklarını sürgüye bağla', scene: S.tri345, exp: made({ slider: 3 }) },
  { text: 'kaydırıcıya bağla', scene: S.pts2, exp: fail(/üçgen/) },
  { text: 'üçgenin kenarlarını kaydırıcıya bağlar mısın', scene: S.tri345, exp: made({ slider: 3 }) },
  { text: 'kaydırıcı bağlantısını kopar', scene: S.bound, exp: changed },

  // ------------------------------------------------------------------ köşegen
  { text: 'karenin köşegenlerini çiz', scene: S.square, exp: made({ segment: 2 }) },
  { text: 'ABCD nin köşegenlerini çiz ve kesişim noktasını bul', scene: S.square, exp: made({ segment: 2, 'pt:intersection': 1 }) },
  { text: 'köşegenlerin kesiştiği noktayı bul', scene: S.square, exp: made({ 'pt:intersection': 1 }) },

  // ------------------------------------------------------------------ karışık
  { text: 'AB doğru parçası çiz ve orta dikmesini çiz', scene: S.pts2, exp: made({ segment: 1, line: 1 }) },
  { text: "ABC'nin ağırlık merkezini bul ve çevrel çemberini çiz", scene: S.tri, exp: made({ 'pt:triangleCenter': 1, circle: 1 }) },
  { text: 'C den AB ye dikme indir sonra ayağını H olarak adlandır', scene: S.tri, exp: made({ segment: 1, 'pt:foot': 1 }, at(2, 0, 'H')) },
  { text: 'üçgenin yüksekliklerini çiz ve kesişim noktasını bul', scene: S.tri, exp: made({ segment: 3, 'pt:triangleCenter': 1 }) },
  { text: 'açıortayları çizip kesişim noktasını bul', scene: S.tri, exp: made({ ray: 3, 'pt:triangleCenter': 1 }) },
  { text: 'AB nin orta noktasını kırmızı yap', scene: cmdScene(S.seg, "AB'nin orta noktasını bul"), exp: changed },
  { text: 'kırmızı renkte orta dikme çiz', scene: S.seg, exp: made({ line: 1 }, (r, b) => fresh(r, b).find(o => o.type === 'line')?.color === '#ef4444' ? undefined : 'renk yok') },
  { text: 'dik bir açı oluştur', scene: S.empty, exp: any },
];

describe('constructions phrases (full engine)', () => {
  it.each(CASES.map((c, i) => [`${i + 1}. ${c.text}${c.spoken ? ' (konuşma)' : ''}`, c] as const))('%s', (_, c) => {
    const scene = c.scene();
    const before = JSON.stringify(scene);
    const input = c.spoken ? normalizeSpokenCommand(c.text) : c.text;
    const result = runCommand(input, scene, c.select?.(scene) ?? []);
    expect(JSON.stringify(scene)).toBe(before);
    if ('fail' in c.exp) {
      expect(result.ok, result.message).toBe(false);
      if (c.exp.fail instanceof RegExp) expect(result.message).toMatch(c.exp.fail);
      expect(result.message).not.toMatch(/Komut uygulanamadı|anlayamadım/);
      return;
    }
    if (!result.ok) throw new Error(`“${input}” başarısız: ${result.message}`);
    expect(new Set(result.objects.map(o => o.id)).size).toBe(result.objects.length);
    expect(c.exp.check(result, scene) ?? '', result.message).toBe('');
  });
});

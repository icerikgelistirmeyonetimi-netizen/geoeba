import type {
  AngleObject, ArcObject, ButtonObject, CheckboxObject, CircleObject, EllipseObject, FractionObject, FunctionObject, InputBoxObject,
  LineObject, MathObject, MeasurementObject, ObjectType, Point2D, PointObject, PolygonObject, RayObject, SectorObject, SegmentObject,
  SliderObject, TextObject,
} from '@/types/math';
import { createId } from '@/state/ids';
import { applyDeletionPlan, collectDependentIds, planDeletion, type DeletionOptions, type DeletionPlan } from '@/state/WorkspaceContext';
import { commandCircleGeometry, resolveCommandBindings } from '../commandBindings';
import { generateNextPointLabel } from '../geometry';
import { formatTurkishNumber, getVisibleWorldBounds } from '../coordinates';
import { extractVariableNames, validateMathExpression } from '../parser';
import { functionLabel, functionNameOf, nextFunctionName, syncUserFunctions } from '../functionNames';
import type { AppAction, EngineOptions } from './types';
import { type Clause, type KnownNames, type LabelRef, labelKey } from './text';

/** Kullanıcıya gösterilecek, Türkçe açıklamalı hata. Komutun tamamı geri alınır. */
export class CommandError extends Error {}
/** İşleyici eşleşti ama bu cümleye uygulanamıyor: motor sıradaki işleyiciyi dener. */
export class NotApplicable extends Error {}

export function fail(message: string): never { throw new CommandError(message); }
export function skip(reason = ''): never { throw new NotApplicable(reason); }

/** Araçların kullandığı renkler (elle çizilenle yazıyla oluşturulan aynı görünsün). */
export const COLORS = {
  point: '#2563eb',
  segment: '#0284c7',
  line: '#0284c7',
  ray: '#0284c7',
  circle: '#8b5cf6',
  ellipse: '#0ea5e9',
  arc: '#0284c7',
  sector: '#10b981',
  angle: '#f59e0b',
  polygon: '#10b981',
  square: '#f43f5e',
  rectangle: '#f59e0b',
  regular: '#059669',
  regularFill: '#10b981',
  construction: '#7c3aed',
  perpBisector: '#0f766e',
  bisector: '#c2410c',
  parallel: '#1d4ed8',
  intersection: '#dc2626',
  image: '#9333ea',
  slider: '#8b5cf6',
  function: '#2563eb',
  text: '#0f172a',
  fraction: '#8b5cf6',
  checkbox: '#2563eb',
  button: '#4f46e5',
  inputBox: '#0d9488',
  slope: '#059669',
  trig: '#7c3aed',
} as const;

/** Özellikler panelindeki renkler ve Türkçe adları. */
export const NAMED_COLORS: Record<string, string> = {
  mavi: '#2563eb', 'acik mavi': '#0284c7', lacivert: '#1e3a8a', mor: '#8b5cf6', pembe: '#ec4899', kirmizi: '#ef4444',
  turuncu: '#f59e0b', sari: '#eab308', yesil: '#10b981', gri: '#6b7280', siyah: '#0f172a', kahverengi: '#92400e', beyaz: '#ffffff', turkuaz: '#14b8a6',
};

/**
 * Cümlede geçen renk: Türkçe renk adı ("kırmızı", "açık mavi", "yeşile", "mor renkte") ya da ham metindeki #rrggbb.
 * Bulunamazsa undefined.
 */
export function colorIn(c: Clause): string | undefined {
  const hex = c.raw.match(/#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/);
  if (hex) return hex[0].toLowerCase();
  const names = Object.keys(NAMED_COLORS).sort((a, b) => b.length - a.length);
  const found = names.find(name => new RegExp(`\\b${name}(?:ya|ye|yi|a|e|i|dan|den|da|de|ms[iu])?\\b`).test(c.text));
  return found ? NAMED_COLORS[found] : undefined;
}

/** Kayan nokta artıklarını temizler: 2.9999999999 → 3 */
export function tidy(n: number): number {
  const r = Math.round(n);
  return Math.abs(n - r) < 1e-9 ? r : Number(n.toFixed(9));
}
export const trNum = (n: number, digits = 2) => formatTurkishNumber(tidy(n), digits);

export function polygonName(n: number): string {
  const names: Record<number, string> = { 3: 'Eşkenar Üçgen', 4: 'Kare (Düzgün Dörtgen)', 5: 'Düzgün Beşgen', 6: 'Düzgün Altıgen (Petek)', 7: 'Düzgün Yedigen', 8: 'Düzgün Sekizgen', 9: 'Düzgün Dokuzgen', 10: 'Düzgün Ongen', 12: 'Düzgün Onikigen' };
  return names[n] ?? `Düzgün ${n}-gen`;
}

const cleanLabel = (text: string) => text.trim().replace(/[’′]/g, "'");
const unique = <T,>(items: T[]) => [...new Set(items)];

type Snapshot = Pick<CommandScene, 'objects' | 'selection' | 'created' | 'clauseCreated' | 'focus' | 'actions' | 'messages' | 'dirty' | 'focusSet'>;

/**
 * Bir komutun üzerinde çalıştığı sahne kopyası. İşleyiciler yalnızca bu sınıf üzerinden değişiklik yapar;
 * komut başarısız olursa hiçbir değişiklik gerçek çizime yansımaz.
 */
export class CommandScene {
  private sceneObjects: MathObject[] = [];
  /** Sahnedeki nesneler. Her değişiklikte adlı fonksiyonlar (f, g …) ayrıştırıcıya bildirilir; "g(x) = f(x) + 1" hemen çalışır. */
  get objects(): MathObject[] { return this.sceneObjects; }
  set objects(value: MathObject[]) { this.sceneObjects = value; syncUserFunctions(value); }
  selection: string[];
  readonly options: EngineOptions;
  /** Bu komutta oluşturulan tüm nesneler */
  created: string[] = [];
  /** İşlenen cümlede oluşturulanlar */
  clauseCreated: string[] = [];
  /** "onu/alanını göster" gibi zamirlerin gösterdiği nesneler; komut sonunda seçim olur. */
  focus: string[] = [];
  focusSet = false;
  actions: AppAction[] = [];
  messages: string[] = [];
  dirty = false;

  constructor(objects: MathObject[], selection: string[] = [], options: EngineOptions = {}) {
    this.objects = [...objects];
    this.selection = selection.filter(id => objects.some(o => o.id === id));
    this.options = options;
  }

  // ------------------------------------------------------------------ çıktı
  say(message: string) { if (message) this.messages.push(message); }
  act(action: AppAction) { this.actions.push(action); }
  setFocus(ids: string[]) { this.focus = unique(ids).filter(id => this.get(id)); this.focusSet = true; }
  beginClause() { this.clauseCreated = []; this.focusSet = false; }
  endClause() {
    if (this.focusSet) return;
    const alive = this.clauseCreated.filter(id => this.get(id));
    if (!alive.length) return;
    const shapes = alive.filter(id => this.get(id)!.type !== 'point');
    this.focus = shapes.length ? shapes : alive;
  }
  snapshot(): Snapshot {
    return { objects: this.objects, selection: [...this.selection], created: [...this.created], clauseCreated: [...this.clauseCreated], focus: [...this.focus],
      actions: [...this.actions], messages: [...this.messages], dirty: this.dirty, focusSet: this.focusSet };
  }
  restore(snapshot: Snapshot) { Object.assign(this, snapshot); }

  // ------------------------------------------------------------------ arama
  get(id: string): MathObject | undefined { return this.objects.find(o => o.id === id); }
  must(id: string): MathObject { return this.get(id) ?? fail('Nesne bulunamadı.'); }
  point(id: string): PointObject {
    const o = this.get(id);
    if (!o || o.type !== 'point') fail('Şeklin bir noktası bulunamadı.');
    return o;
  }
  ofType<T extends ObjectType>(...types: T[]): Extract<MathObject, { type: T }>[] {
    return this.objects.filter(o => (types as ObjectType[]).includes(o.type)) as Extract<MathObject, { type: T }>[];
  }
  points(): PointObject[] { return this.ofType('point'); }
  sliders(): SliderObject[] { return this.ofType('slider'); }
  known(): KnownNames {
    return {
      points: this.points().map(p => p.label),
      // Fonksiyonun etiketten okunan adı da bilinen addır: "g(x) = sin(x)" → "g" ("g nin grafiğini gizle", "f yi sil").
      names: this.objects.flatMap(o => {
        if (o.type === 'point') return [];
        if (o.type === 'slider') return [o.label, o.variableName];
        const name = o.type === 'function' ? functionNameOf(o) : undefined;
        return name ? [o.label, name] : [o.label];
      }),
    };
  }

  // ------------------------------------------------------------------ etiketler
  pointLabels(): string[] { return this.points().map(p => p.label); }
  nextPointLabel(reserved: string[] = []): string { return generateNextPointLabel([...this.pointLabels(), ...reserved]); }
  nextPointLabels(count: number): string[] {
    const used = this.pointLabels(), result: string[] = [];
    for (let i = 0; i < count; i++) { const l = generateNextPointLabel([...used, ...result]); result.push(l); }
    return result;
  }
  /** Tam adla, yoksa büyük/küçük harf duyarsız eşleşen tek nokta. */
  findPoint(label: string): PointObject | undefined {
    const clean = cleanLabel(label);
    const exact = this.points().filter(p => p.label === clean);
    if (exact.length === 1) return exact[0];
    const loose = exact.length ? exact : this.points().filter(p => labelKey(p.label) === labelKey(clean));
    if (loose.length > 1) fail(`${clean} adı birden fazla noktada kullanılıyor. Noktalardan birini yeniden adlandırın.`);
    return loose[0];
  }
  requirePoint(label: string): PointObject { return this.findPoint(label) ?? fail(`${cleanLabel(label)} noktası bulunamadı.`); }
  /** "ABC" → [A, B, C] (A_1, A' gibi adlar dahil). Sahnede karşılığı yoksa null. */
  pointsFromLabel(text: string): PointObject[] | null {
    const clean = cleanLabel(text);
    const direct = this.points().filter(p => p.label === clean);
    if (direct.length === 1) return direct;
    const pts = this.points();
    const walk = (rest: string, key: (s: string) => string): PointObject[] | null => {
      if (!rest) return [];
      const candidates = pts.filter(p => key(rest).startsWith(key(p.label)) && key(p.label).length > 0)
        .sort((a, b) => key(b.label).length - key(a.label).length);
      for (const p of candidates) {
        const tail = walk(rest.slice(p.label.length), key);
        if (tail) return [p, ...tail];
      }
      return null;
    };
    const found = walk(clean, s => s) ?? walk(clean, s => labelKey(s));
    return found && found.length ? found : null;
  }
  /** Yeni noktalar için etiketi harflere böler: "ABC" → ["A","B","C"], "A_1B'" → ["A_1","B'"]. */
  splitNewLabels(text: string): string[] | null {
    const clean = cleanLabel(text);
    const parts = clean.match(/[\p{L}](?:_?\d+)?'*/gu);
    if (!parts || parts.join('') !== clean) return null;
    return parts.map(p => p.charAt(0).toLocaleUpperCase('tr') + p.slice(1));
  }
  assertFreePointLabel(label: string) {
    if (!/^[\p{L}][\p{L}\p{N}_']{0,11}$/u.test(label)) fail(`“${label}” geçerli bir nokta adı değil.`);
    if (this.points().some(p => labelKey(p.label) === labelKey(label))) fail(`${label} adlı nokta zaten var. Başka bir ad kullanın.`);
  }

  /** Etiketin gösterdiği nesneler: önce nesne adı (ya da kaydırıcı değişkeni), sonra noktalar üzerinden şekiller. */
  resolveLabel(ref: LabelRef | string, types?: ObjectType[]): MathObject[] {
    const text = typeof ref === 'string' ? ref : ref.text;
    const wanted = typeof ref !== 'string' && ref.bracket ? (['segment'] as ObjectType[]) : types;
    const allow = (o: MathObject) => !wanted || wanted.includes(o.type);
    const key = labelKey(text);
    // Fonksiyonun etiketten okunan adı: küçük harfle yazılan "f" fonksiyonu gösterir; büyük "F" ise aynı adlı nokta varsa noktadır.
    const byFunctionName = (o: MathObject) => {
      if (o.type !== 'function' || (typeof ref !== 'string' && ref.bracket)) return false;
      const name = functionNameOf(o);
      if (!name || labelKey(name) !== key) return false;
      return (typeof ref !== 'string' && !!ref.lowercase) || text.trim() === name || !this.points().some(p => labelKey(p.label) === key);
    };
    const byName = this.objects.filter(o => allow(o) && o.type !== 'point'
      && (labelKey(o.label) === key || (o.type === 'slider' && labelKey(o.variableName) === key) || byFunctionName(o)));
    if (byName.length) return byName;
    const pts = this.pointsFromLabel(text);
    if (!pts) return [];
    const result: MathObject[] = [];
    if (pts.length === 1 && (!wanted || wanted.includes('point'))) result.push(pts[0]);
    const shapeTypes = wanted?.filter(t => t !== 'point');
    if (!shapeTypes || shapeTypes.length) result.push(...this.shapesWithPoints(pts.map(p => p.id), shapeTypes));
    return unique(result);
  }

  /** Tanım noktaları verilen noktalar olan şekiller (çokgende sıra gözetilmez). */
  shapesWithPoints(ids: string[], types?: ObjectType[]): MathObject[] {
    const set = new Set(ids);
    const same = (list: (string | undefined)[]) => list.length === set.size && new Set(list).size === list.length && list.every(id => id !== undefined && set.has(id));
    return this.objects.filter(o => {
      if (types && types.length && !types.includes(o.type)) return false;
      switch (o.type) {
        case 'polygon': return same(o.pointIds);
        case 'segment': return same([o.startPointId, o.endPointId]);
        case 'line': return same([o.point1Id, o.point2Id]);
        case 'ray': return same([o.startPointId, o.throughPointId]);
        case 'angle': return ids.length === 3 && o.vertexPointId === ids[1] && same([o.point1Id, o.vertexPointId, o.point3Id]);
        case 'circle':
          if (o.throughPointIds?.length) return same(o.throughPointIds);
          return ids.length === 1 ? o.centerPointId === ids[0] : ids.length === 2 && o.centerPointId === ids[0] && o.radiusPointId === ids[1];
        case 'ellipse': return ids.length === 1 && o.centerPointId === ids[0];
        case 'arc':
        case 'sector':
          return ids.length === 1 ? o.centerPointId === ids[0] : ids.length === 2 ? same([o.startPointId, o.directionPointId]) : same([o.centerPointId, o.startPointId, o.directionPointId]);
        // Yay ölçümü çembere aittir: "BD'yi ölç / sil" onu değil kirişi/parçayı bulsun. Yalnızca ölçüm türü açıkça istenirse.
        case 'measurement': return o.kind === 'arc' ? !!types?.includes('measurement') && same(o.pointIds) : same(o.pointIds);
        default: return false;
      }
    });
  }

  /**
   * Cümlenin hedef aldığı nesneler. Sıra: cümledeki adlar → (seçili denmişse seçim) → önceki cümlenin nesnesi / zamir
   * → seçim → sahnedeki tek aday. Birden fazla aday kalırsa (many değilse) açıklayıcı hata verir.
   */
  targets(c: Clause, o: { types: ObjectType[]; noun: string; filter?: (obj: MathObject) => boolean; many?: boolean; useLabels?: boolean; labels?: LabelRef[] }): MathObject[] {
    const ok = (obj: MathObject | undefined): obj is MathObject => !!obj && o.types.includes(obj.type) && (!o.filter || o.filter(obj));
    if (o.useLabels !== false) {
      const found: MathObject[] = [];
      const missing: string[] = [];
      for (const ref of o.labels ?? c.labels) {
        const matches = this.resolveLabel(ref, o.types).filter(ok);
        if (matches.length) found.push(...matches);
        else if (!this.resolveLabel(ref).length && !this.pointsFromLabel(ref.text)) missing.push(ref.text);
      }
      if (found.length) return this.pickOne(unique(found), o);
      if (missing.length) fail(`${missing.join(', ')} adlı ${o.noun} bulunamadı.`);
    }
    const sources: string[][] = c.refersToSelection ? [this.selection, this.focus] : [this.focus, this.selection];
    for (const ids of sources) {
      const list = ids.map(id => this.get(id)).filter(ok);
      if (list.length) return this.pickOne(list, o);
    }
    const all = this.objects.filter(ok);
    if (all.length === 1 || (o.many && all.length)) return all;
    if (!all.length) fail(`Önce bir ${o.noun} oluşturun.`);
    fail(`Birden fazla ${o.noun} var. Hangisi olduğunu adıyla yazın (ör. “ABC”) ya da önce seçin.`);
  }
  target(c: Clause, o: { types: ObjectType[]; noun: string; filter?: (obj: MathObject) => boolean; labels?: LabelRef[] }): MathObject {
    return this.targets(c, { ...o, many: false })[0];
  }
  private pickOne(list: MathObject[], o: { noun: string; many?: boolean }): MathObject[] {
    if (o.many || list.length === 1) return list;
    fail(`Birden fazla ${o.noun} eşleşti (${list.map(x => x.label).join(', ')}). Hangisi olduğunu belirtin.`);
  }

  // ------------------------------------------------------------------ geometri
  pos(id: string): Point2D { const p = this.point(id); return { x: p.x, y: p.y }; }
  /** Doğru parçası, doğru veya ışının iki tanım noktası. */
  lineOf(obj: MathObject): [PointObject, PointObject] | null {
    if (obj.type === 'segment') return [this.point(obj.startPointId), this.point(obj.endPointId)];
    if (obj.type === 'line') return [this.point(obj.point1Id), this.point(obj.point2Id)];
    if (obj.type === 'ray') return [this.point(obj.startPointId), this.point(obj.throughPointId)];
    return null;
  }
  /** Çember, yay veya daire diliminin merkezi ve yarıçapı. */
  circleOf(obj: MathObject): { center: Point2D; radius: number; centerId?: string } | null {
    if (obj.type === 'circle') {
      const g = commandCircleGeometry(obj, id => this.point(id));
      return { ...g, centerId: obj.throughPointIds?.length ? undefined : obj.centerPointId };
    }
    if (obj.type === 'arc' || obj.type === 'sector') {
      const c = this.point(obj.centerPointId), s = this.point(obj.startPointId);
      return { center: { x: c.x, y: c.y }, radius: Math.hypot(s.x - c.x, s.y - c.y), centerId: c.id };
    }
    return null;
  }
  vertices(polygon: PolygonObject): PointObject[] { return polygon.pointIds.map(id => this.point(id)); }
  /** Şekli taşımak/dönüştürmek için değişmesi gereken noktalar (moveObjects ile aynı). */
  definingPointIds(obj: MathObject): string[] {
    switch (obj.type) {
      case 'point': return [obj.id];
      case 'polygon': return obj.pointIds;
      case 'segment': return [obj.startPointId, obj.endPointId];
      case 'line': return [obj.point1Id, obj.point2Id];
      case 'ray': return [obj.startPointId, obj.throughPointId];
      case 'circle': return unique([...(obj.throughPointIds?.length ? obj.throughPointIds : [obj.centerPointId]), ...(obj.radiusPointId ? [obj.radiusPointId] : [])]).filter(Boolean);
      case 'ellipse': return [obj.centerPointId];
      case 'arc': case 'sector': return [obj.centerPointId, obj.startPointId, obj.directionPointId];
      case 'angle': return [obj.point1Id, obj.vertexPointId, obj.point3Id];
      case 'measurement': return obj.kind === 'arc' && obj.throughPointId ? [...obj.pointIds, obj.throughPointId] : obj.pointIds;
      default: return [];
    }
  }
  /** Görünür çizimin sınır kutusu. */
  bbox(objects: MathObject[] = this.objects): { minX: number; maxX: number; minY: number; maxY: number } | null {
    const xs: number[] = [], ys: number[] = [];
    const add = (x: number, y: number, r = 0) => { if (Number.isFinite(x) && Number.isFinite(y)) { xs.push(x - r, x + r); ys.push(y - r, y + r); } };
    for (const o of objects) {
      if (!o.visible) continue;
      try {
        if (o.type === 'point' || o.type === 'text') add(o.x, o.y);
        else if (o.type === 'fraction') add(o.x, o.y, o.radius);
        else if (o.type === 'image') add(o.x, o.y, Math.max(o.width, o.height) / 2);
        else if (o.type === 'pen') o.points.forEach(p => add(p.x, p.y));
        else if (o.type === 'circle' || o.type === 'arc' || o.type === 'sector') { const g = this.circleOf(o); if (g) add(g.center.x, g.center.y, g.radius); }
        else if (o.type === 'ellipse') { const c = this.point(o.centerPointId); add(c.x, c.y, Math.max(Math.abs(o.radiusX), Math.abs(o.radiusY))); }
      } catch { /* bozuk nesne yerleşimi etkilemesin */ }
    }
    if (!xs.length) return null;
    return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
  }

  // ------------------------------------------------------------------ yerleşim
  viewBounds() { return this.options.viewport ? getVisibleWorldBounds(this.options.viewport) : null; }
  viewCenter(): Point2D {
    const b = this.viewBounds();
    return b ? { x: Math.round((b.minX + b.maxX) / 2), y: Math.round((b.minY + b.maxY) / 2) } : { x: 0, y: 0 };
  }
  /** width × height boyutlu yeni bir şekil için mevcut çizimle çakışmayan merkez (boş sahnede görünüm merkezi). */
  placeShape(width: number, height: number): Point2D {
    const box = this.bbox();
    if (!box) return this.viewCenter();
    const gap = 1.5, cx = (box.minX + box.maxX) / 2, cy = (box.minY + box.maxY) / 2;
    const candidates = [
      { x: box.maxX + gap + width / 2, y: cy },
      { x: cx, y: box.minY - gap - height / 2 },
      { x: box.minX - gap - width / 2, y: cy },
      { x: cx, y: box.maxY + gap + height / 2 },
    ].map(p => ({ x: Math.round(p.x * 2) / 2, y: Math.round(p.y * 2) / 2 }));
    const view = this.viewBounds();
    if (view) {
      const inside = candidates.find(p => p.x - width / 2 >= view.minX && p.x + width / 2 <= view.maxX && p.y - height / 2 >= view.minY && p.y + height / 2 <= view.maxY);
      if (inside) return inside;
    }
    return candidates[0];
  }
  /** Tek bir nokta için görünüm merkezine yakın, boş bir tam sayı konumu. */
  freeSpot(): Point2D {
    const c = this.viewCenter();
    const taken = (x: number, y: number) => this.points().some(p => Math.hypot(p.x - x, p.y - y) < 0.75);
    for (let r = 0; r <= 15; r++) for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      if (!taken(c.x + dx, c.y + dy)) return { x: c.x + dx, y: c.y + dy };
    }
    return c;
  }
  /** Kaydırıcı, düğme, onay kutusu gibi araçlar için sol üst köşeden aşağı doğru sıralı konum. */
  widgetSpot(): Point2D {
    const count = this.objects.filter(o => ['slider', 'checkbox', 'button', 'input_box'].includes(o.type)).length;
    const b = this.viewBounds();
    if (!b) return { x: -8, y: 6 - count * 1.2 };
    const w = b.maxX - b.minX, h = b.maxY - b.minY;
    return { x: Number((b.minX + w * 0.06).toFixed(2)), y: Number((b.maxY - h * (0.1 + count * 0.07)).toFixed(2)) };
  }

  // ------------------------------------------------------------------ değişiklik
  add<T extends MathObject>(obj: T): T {
    this.objects = [...this.objects, obj];
    this.created.push(obj.id);
    this.clauseCreated.push(obj.id);
    this.dirty = true;
    return obj;
  }
  update(id: string, patch: Record<string, unknown>): MathObject {
    let updated: MathObject | undefined;
    this.objects = this.objects.map(o => o.id === id ? (updated = { ...o, ...patch } as MathObject) : o);
    if (!updated) fail('Değiştirilecek nesne bulunamadı.');
    this.dirty = true;
    return updated;
  }
  /** Bağımlı nesnelerle birlikte siler (araçtaki silme zinciriyle aynı). Silinen kimlikleri döndürür. */
  remove(ids: string[]): string[] {
    const removal = collectDependentIds(this.objects, ids);
    if (!removal.size) return [];
    this.objects = this.objects.filter(o => !removal.has(o.id));
    this.dropIds(removal);
    return [...removal];
  }
  /**
   * Şekli KENDİ kullanılmayan noktalarıyla siler: ekrandaki Delete tuşu, sağ tık "Sil" ve Sil aracıyla AYNI kural
   * (WorkspaceContext.planDeletion). `keepPoints` verilirse yalnızca şekil gider, noktalar kalır.
   */
  removeWithOwnPoints(ids: string[], options: DeletionOptions = {}): DeletionPlan {
    const plan = planDeletion(this.objects, ids, options);
    if (!plan.removal.size && !plan.unbindIds.length) return plan;
    this.objects = applyDeletionPlan(this.objects, plan);
    this.dropIds(plan.removal);
    return plan;
  }
  /** Silinen kimlikleri seçim, odak ve oluşturulanlar listelerinden düşürür. */
  private dropIds(removal: Set<string>) {
    const alive = (list: string[]) => list.filter(id => !removal.has(id));
    this.selection = alive(this.selection);
    this.focus = alive(this.focus);
    this.created = alive(this.created);
    this.clauseCreated = alive(this.clauseCreated);
    this.dirty = true;
  }
  /** Nesneden alanları tamamen kaldırır (değerini undefined yapmak yerine; ör. onObjectId, construction). */
  unset(id: string, keys: string[]): MathObject {
    let updated: MathObject | undefined;
    this.objects = this.objects.map(o => {
      if (o.id !== id) return o;
      const copy = { ...o } as Record<string, unknown>;
      for (const key of keys) delete copy[key];
      return (updated = copy as unknown as MathObject);
    });
    if (!updated) fail('Değiştirilecek nesne bulunamadı.');
    this.dirty = true;
    return updated;
  }
  /** Komut sonunda seçimin boş kalmasını sağlar ("seçimi kaldır"). */
  clearSelection() {
    this.selection = [];
    this.focus = [];
    this.focusSet = true;
  }
  /** Canlı inşaları yeniden hesaplar; geçersizse komut açıklamayla reddedilir. */
  resolve() {
    try { this.objects = resolveCommandBindings(this.objects); }
    catch (error) { fail(error instanceof Error ? error.message : 'Geometrik ilişki geçersiz.'); }
  }

  // ------------------------------------------------------------------ nesne üreticileri (araçlarla aynı alanlar)
  addPoint(position: Point2D, o: { label?: string; color?: string; construction?: PointObject['construction']; onObjectId?: string; visible?: boolean; showLabel?: boolean } = {}): PointObject {
    const label = o.label ? cleanLabel(o.label) : this.nextPointLabel();
    if (o.label) this.assertFreePointLabel(label);
    if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) fail('Nokta konumu hesaplanamadı.');
    if (Math.max(Math.abs(position.x), Math.abs(position.y)) > 100000) fail('Koordinatlar −100000 ile 100000 arasında olmalı.');
    const point: PointObject = {
      id: createId('pt'), type: 'point', label, showLabel: o.showLabel ?? true, x: tidy(position.x), y: tidy(position.y),
      color: o.color ?? COLORS.point, visible: o.visible ?? true, isIndependent: !o.construction, createdAt: Date.now(),
      ...(o.construction ? { construction: o.construction } : {}), ...(o.onObjectId ? { onObjectId: o.onObjectId } : {}),
    };
    this.add(point);
    if (o.construction) {
      this.resolve();
      return this.point(point.id);
    }
    return point;
  }
  /** Adı verilmişse var olan noktayı döndürür, yoksa verilen (ya da boş) konumda oluşturur. */
  ensurePoint(label: string, position?: Point2D, color?: string): PointObject {
    return this.findPoint(label) ?? this.addPoint(position ?? this.freeSpot(), { label, color });
  }

  addSegment(startId: string, endId: string, o: { label?: string; color?: string; showLength?: boolean; thickness?: number; unit?: 'cm' | 'br'; reuse?: boolean; showLabel?: boolean } = {}): SegmentObject {
    if (startId === endId) fail('Doğru parçası için iki farklı nokta gerekir.');
    const a = this.point(startId), b = this.point(endId);
    if (o.reuse !== false) {
      const existing = this.shapesWithPoints([startId, endId], ['segment'])[0] as SegmentObject | undefined;
      if (existing) return existing;
    }
    return this.add({
      id: createId('seg'), type: 'segment', label: o.label ?? `[${a.label}${b.label}]`, showLabel: o.showLabel ?? true, startPointId: startId, endPointId: endId,
      color: o.color ?? COLORS.segment, visible: true, showLength: o.showLength ?? true, thickness: o.thickness ?? 2.5, ...(o.unit ? { unit: o.unit } : {}), createdAt: Date.now(),
    } as SegmentObject);
  }
  addLine(point1Id: string, point2Id: string, o: { label?: string; color?: string; showEquation?: boolean; reuse?: boolean } = {}): LineObject {
    if (point1Id === point2Id) fail('Doğru için iki farklı nokta gerekir.');
    const a = this.point(point1Id), b = this.point(point2Id);
    if (Math.hypot(a.x - b.x, a.y - b.y) < 1e-9 && !a.construction && !b.construction) fail('Doğru için iki farklı konumda nokta gerekir.');
    if (o.reuse !== false) {
      const existing = this.shapesWithPoints([point1Id, point2Id], ['line'])[0] as LineObject | undefined;
      if (existing) return existing;
    }
    return this.add({
      id: createId('line'), type: 'line', label: o.label ?? `${a.label}${b.label} Doğrusu`, showLabel: true, point1Id, point2Id,
      color: o.color ?? COLORS.line, visible: true, showEquation: o.showEquation ?? true, thickness: 2, createdAt: Date.now(),
    } as LineObject);
  }
  addRay(startId: string, throughId: string, o: { label?: string; color?: string } = {}): RayObject {
    if (startId === throughId) fail('Işın için iki farklı nokta gerekir.');
    const a = this.point(startId), b = this.point(throughId);
    const existing = this.objects.find((r): r is RayObject => r.type === 'ray' && r.startPointId === startId && r.throughPointId === throughId);
    if (existing) return existing;
    return this.add({
      id: createId('ray'), type: 'ray', label: o.label ?? `${a.label}${b.label} Işını`, showLabel: true, startPointId: startId, throughPointId: throughId,
      color: o.color ?? COLORS.ray, visible: true, thickness: 2, createdAt: Date.now(),
    } as RayObject);
  }
  addCircle(spec: { centerId: string; radius: number } | { centerId: string; radiusPointId: string } | { throughIds: [string, string, string] }, o: { label?: string; color?: string; fillOpacity?: number; showArea?: boolean; showPerimeter?: boolean } = {}): CircleObject {
    const base = { id: createId('circ'), type: 'circle' as const, showLabel: true, color: o.color ?? COLORS.circle, visible: true, createdAt: Date.now(),
      ...(o.showArea !== undefined ? { showArea: o.showArea } : {}), ...(o.showPerimeter !== undefined ? { showPerimeter: o.showPerimeter } : {}) };
    if ('throughIds' in spec) {
      const labels = spec.throughIds.map(id => this.point(id).label).join('');
      return this.add({ ...base, label: o.label ?? `${labels} Çemberi`, centerPointId: '', throughPointIds: [...spec.throughIds], fillOpacity: o.fillOpacity ?? 0 } as CircleObject);
    }
    const center = this.point(spec.centerId);
    if ('radius' in spec) {
      if (!(spec.radius > 0 && spec.radius <= 10000 && Number.isFinite(spec.radius))) fail('Yarıçap 0’dan büyük ve 10000’den küçük olmalı.');
      return this.add({ ...base, label: o.label ?? `${center.label} Çemberi (r = ${trNum(spec.radius)})`, centerPointId: center.id, fixedRadius: tidy(spec.radius), fillOpacity: o.fillOpacity ?? 0 } as CircleObject);
    }
    if (spec.radiusPointId === spec.centerId) fail('Merkez ve çember üzerindeki nokta farklı olmalı.');
    return this.add({ ...base, label: o.label ?? `${center.label} Merkezli Çember`, centerPointId: center.id, radiusPointId: spec.radiusPointId, fillOpacity: o.fillOpacity ?? 0.1, showArea: o.showArea ?? true, showPerimeter: o.showPerimeter ?? true } as CircleObject);
  }
  addEllipse(centerId: string, radiusX: number, radiusY: number, o: { label?: string; color?: string; rotation?: number } = {}): EllipseObject {
    if (!(radiusX > 0 && radiusY > 0)) fail('Elipsin iki yarıçapı da 0’dan büyük olmalı.');
    const center = this.point(centerId), color = o.color ?? COLORS.ellipse;
    return this.add({
      id: createId('elp'), type: 'ellipse', label: o.label ?? `${center.label} Merkezli Elips`, showLabel: true, centerPointId: centerId, radiusX: tidy(radiusX), radiusY: tidy(radiusY),
      ...(o.rotation ? { rotation: tidy(o.rotation) } : {}), color, fillColor: color, fillOpacity: 0.12, visible: true, showArea: true, showPerimeter: true, createdAt: Date.now(),
    } as EllipseObject);
  }
  addArc(centerId: string, startId: string, directionId: string, o: { label?: string; color?: string } = {}): ArcObject {
    const s = this.point(startId), d = this.point(directionId);
    if (new Set([centerId, startId, directionId]).size !== 3) fail('Yay için merkez, başlangıç ve bitiş farklı noktalar olmalı.');
    return this.add({
      id: createId('arc'), type: 'arc', label: o.label ?? `${s.label}${d.label} Yayı`, showLabel: true, centerPointId: centerId, startPointId: startId, directionPointId: directionId,
      color: o.color ?? COLORS.arc, thickness: 3, showArcLength: true, visible: true, createdAt: Date.now(),
    } as ArcObject);
  }
  addSector(centerId: string, startId: string, directionId: string, o: { label?: string; color?: string } = {}): SectorObject {
    const c = this.point(centerId);
    if (new Set([centerId, startId, directionId]).size !== 3) fail('Daire dilimi için merkez, başlangıç ve bitiş farklı noktalar olmalı.');
    const color = o.color ?? COLORS.sector;
    return this.add({
      id: createId('sect'), type: 'sector', label: o.label ?? `${c.label} Daire Dilimi`, showLabel: true, centerPointId: centerId, startPointId: startId, directionPointId: directionId,
      color, fillColor: color, fillOpacity: 0.4, showArea: true, visible: true, createdAt: Date.now(),
    } as SectorObject);
  }
  /**
   * Açı: varsa gösterilir (kopya oluşmaz). Köşe bir yay/dilim merkeziyse ve kollar onun noktalarıysa açı nesnesi yerine
   * şeklin merkez açısı gösterilir (kayıtlı çizim yeniden açılınca açı nesnesi silinmesin).
   */
  addAngle(point1Id: string, vertexId: string, point3Id: string, o: { withArms?: boolean; color?: string; reflex?: boolean; label?: string } = {}): MathObject {
    if (new Set([point1Id, vertexId, point3Id]).size !== 3) fail('Açı için üç farklı nokta gerekir.');
    const p1 = this.point(point1Id), v = this.point(vertexId), p3 = this.point(point3Id);
    const central = this.objects.find(s => (s.type === 'arc' || s.type === 'sector') && s.centerPointId === vertexId
      && new Set([s.startPointId, s.directionPointId, point1Id, point3Id]).size === 2);
    if (central) { this.update(central.id, { showCentralAngle: true }); return this.must(central.id); }
    const existing = this.objects.find((a): a is AngleObject => a.type === 'angle' && a.vertexPointId === vertexId
      && ((a.point1Id === point1Id && a.point3Id === point3Id) || (a.point1Id === point3Id && a.point3Id === point1Id)));
    if (existing) return this.update(existing.id, { showValue: true, visible: true, ...(o.reflex !== undefined ? { reflex: o.reflex } : {}) });
    // Kollar açının kimliğini taşır: açı silinince (başka nesne kullanmıyorsa) kolları da gider (collectDependentIds 4. kural)
    const angleId = createId('ang');
    if (o.withArms) {
      for (const arm of [p1, p3]) if (!this.shapesWithPoints([vertexId, arm.id], ['segment', 'line', 'ray']).length) {
        this.add({ id: createId('seg'), type: 'segment', label: `[${v.label}${arm.label}]`, showLabel: false, startPointId: vertexId, endPointId: arm.id,
          color: o.color ?? COLORS.angle, visible: true, thickness: 2, armOfAngleId: angleId, createdAt: Date.now() } as SegmentObject);
      }
    }
    return this.add({
      id: angleId, type: 'angle', label: o.label ?? `∠${p1.label}${v.label}${p3.label}`, showLabel: true, point1Id, vertexPointId: vertexId, point3Id,
      color: o.color ?? COLORS.angle, visible: true, showValue: true, ...(o.reflex ? { reflex: true } : {}), createdAt: Date.now(),
    } as AngleObject);
  }
  addPolygon(pointIds: string[], o: { kind?: 'polygon' | 'triangle' | 'square' | 'rectangle' | 'regular' | 'image'; label?: string; color?: string; fillColor?: string; fillOpacity?: number; showArea?: boolean; showPerimeter?: boolean; edgeLabels?: number[]; reuse?: boolean } = {}): PolygonObject {
    if (pointIds.length < 3) fail('Çokgen için en az üç köşe gerekir.');
    if (new Set(pointIds).size !== pointIds.length) fail('Çokgenin köşeleri farklı noktalar olmalı.');
    const names = pointIds.map(id => this.point(id).label).join('');
    if (o.reuse !== false) {
      const existing = this.shapesWithPoints(pointIds, ['polygon'])[0] as PolygonObject | undefined;
      if (existing) return existing;
    }
    const kind = o.kind ?? 'polygon';
    const style = {
      polygon: { color: COLORS.polygon, fillColor: COLORS.polygon, fillOpacity: 0.15, showArea: true, showPerimeter: true },
      triangle: { color: COLORS.polygon, fillColor: COLORS.polygon, fillOpacity: 0.15, showArea: false, showPerimeter: false },
      square: { color: COLORS.square, fillColor: COLORS.square, fillOpacity: 0.18, showArea: true, showPerimeter: true },
      rectangle: { color: COLORS.rectangle, fillColor: COLORS.rectangle, fillOpacity: 0.18, showArea: true, showPerimeter: true },
      regular: { color: COLORS.regular, fillColor: COLORS.regularFill, fillOpacity: 0.2, showArea: true, showPerimeter: true },
      image: { color: COLORS.image, fillColor: COLORS.image, fillOpacity: 0.2, showArea: false, showPerimeter: false },
    }[kind];
    return this.add({
      id: createId('poly'), type: 'polygon', label: o.label ?? names, showLabel: true, pointIds: [...pointIds],
      color: o.color ?? style.color, fillColor: o.fillColor ?? o.color ?? style.fillColor, fillOpacity: o.fillOpacity ?? style.fillOpacity,
      showArea: o.showArea ?? style.showArea, showPerimeter: o.showPerimeter ?? style.showPerimeter, ...(o.edgeLabels ? { edgeLabels: o.edgeLabels } : {}),
      visible: true, createdAt: Date.now(),
    } as PolygonObject);
  }
  addSlider(name: string, o: { min?: number; max?: number; step?: number; value?: number; label?: string; color?: string; x?: number; y?: number; length?: number } = {}): SliderObject {
    if (this.sliders().some(s => s.variableName === name)) fail(`${name} adlı kaydırıcı zaten var.`);
    const min = o.min ?? -5, max = o.max ?? 5, step = o.step ?? 0.1, value = o.value ?? 1;
    if (!(min < max)) fail('Kaydırıcının en küçük değeri en büyük değerinden küçük olmalı.');
    if (!(step > 0)) fail('Kaydırıcı adımı 0’dan büyük olmalı.');
    const spot = this.widgetSpot(), b = this.viewBounds();
    return this.add({
      id: createId('slider'), type: 'slider', label: o.label ?? `${name} Parametresi`, showLabel: true, variableName: name, min, max, step,
      value: Math.min(max, Math.max(min, value)), x: o.x ?? spot.x, y: o.y ?? spot.y,
      length: o.length ?? (b ? Number(Math.max(2, Math.min(6, (b.maxX - b.minX) * 0.22)).toFixed(2)) : 4),
      color: o.color ?? COLORS.slider, visible: true, createdAt: Date.now(),
    } as SliderObject);
  }
  /** Fonksiyon; ifadede kaydırıcısı olmayan parametreler için kaydırıcı da oluşturur (Fonksiyon penceresiyle aynı). */
  addFunction(expression: string, o: { label?: string; color?: string } = {}): { fn: FunctionObject; sliders: SliderObject[] } {
    const check = validateMathExpression(expression);
    if (!check.ok) fail(check.error);
    const existing = new Set(this.sliders().map(s => s.variableName));
    const sliders = extractVariableNames(expression).filter(n => !existing.has(n)).map(n => this.addSlider(n, { min: -5, max: 5, step: 0.1, value: 1 }));
    const fn = this.add({
      id: createId('fn'), type: 'function', label: o.label ?? functionLabel(nextFunctionName(this.objects), expression), showLabel: true, expression,
      color: o.color ?? COLORS.function, thickness: 2.5, visible: true, createdAt: Date.now(),
    } as FunctionObject);
    return { fn, sliders };
  }
  addText(text: string, position: Point2D, o: { fontSize?: number; color?: string } = {}): TextObject {
    if (!text.trim()) fail('Eklenecek yazıyı tırnak içinde yazın. Örneğin: “Merhaba” yazısı ekle.');
    return this.add({ id: createId('txt'), type: 'text', label: text.slice(0, 20), showLabel: true, text, x: tidy(position.x), y: tidy(position.y),
      fontSize: o.fontSize ?? 14, color: o.color ?? COLORS.text, visible: true, createdAt: Date.now() } as TextObject);
  }
  addFraction(numerator: number, denominator: number, position: Point2D, o: { modelType?: 'pie' | 'bar'; radius?: number; color?: string } = {}): FractionObject {
    if (!Number.isInteger(numerator) || !Number.isInteger(denominator) || numerator < 0 || numerator > 30 || denominator < 1 || denominator > 30) fail('Kesir için 0–30 arası payda ve 1–30 arası payda yazın (ör. 3/4).');
    return this.add({ id: createId('frac'), type: 'fraction', label: `${numerator}/${denominator} Kesir Modeli`, showLabel: true, numerator, denominator,
      x: tidy(position.x), y: tidy(position.y), radius: o.radius ?? 2.5, modelType: o.modelType ?? 'pie', color: o.color ?? COLORS.fraction, visible: true, createdAt: Date.now() } as FractionObject);
  }
  addCheckbox(targetIds: string[], position: Point2D, o: { label?: string } = {}): CheckboxObject {
    if (!targetIds.length) fail('Onay kutusunun göstereceği nesneleri belirtin.');
    return this.add({ id: createId('chk'), type: 'checkbox', label: o.label ?? `${targetIds.length} nesneyi göster`, showLabel: true, x: tidy(position.x), y: tidy(position.y),
      targetIds: [...targetIds], checked: true, color: COLORS.checkbox, visible: true, createdAt: Date.now() } as CheckboxObject);
  }
  addButton(action: ButtonObject['action'], position: Point2D, o: { label?: string } = {}): ButtonObject {
    const label =
      o.label ??
      (action.kind === 'animate'
        ? 'Oynat / Durdur'
        : action.kind === 'toggle'
        ? 'Göster / Gizle'
        : action.kind === 'clearTraces'
        ? 'İzleri Temizle'
        : `${trNum(action.value)} yap`);
    return this.add({ id: createId('btn'), type: 'button', label, showLabel: true, x: tidy(position.x), y: tidy(position.y), action, color: COLORS.button, visible: true, createdAt: Date.now() } as ButtonObject);
  }
  addInputBox(target: SliderObject | FunctionObject, position: Point2D): InputBoxObject {
    return this.add({ id: createId('inp'), type: 'input_box', label: target.type === 'slider' ? `${target.variableName} =` : 'f(x) =', showLabel: true,
      x: tidy(position.x), y: tidy(position.y), targetId: target.id, field: target.type === 'slider' ? 'value' : 'expression', width: target.type === 'slider' ? 90 : 170,
      color: COLORS.inputBox, visible: true, createdAt: Date.now() } as InputBoxObject);
  }
  addMeasurement(kind: 'slope' | 'trig', pointIds: string[]): MeasurementObject {
    const names = pointIds.map(id => this.point(id).label).join('');
    const existing = this.objects.find((m): m is MeasurementObject => m.type === 'measurement' && m.kind === kind && m.pointIds.join() === pointIds.join());
    if (existing) return this.update(existing.id, { showValue: true, visible: true }) as MeasurementObject;
    return this.add({ id: createId('olc'), type: 'measurement', kind, label: kind === 'slope' ? `${names} eğimi` : `${names} açısının oranları`, showLabel: true,
      pointIds: [...pointIds], showValue: true, color: kind === 'slope' ? COLORS.slope : COLORS.trig, visible: true, createdAt: Date.now() } as MeasurementObject);
  }
}

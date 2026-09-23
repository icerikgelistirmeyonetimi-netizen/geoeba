import { describe, expect, it } from 'vitest';
import { parseProjectFile } from '../projectFile';
import { executeTurkishCommand } from '../turkishCommands';

const p = (id: string, x = 0, y = 0) => ({ id, type: 'point', x, y });
const base = { id: 'triangle', type: 'polygon', pointIds: ['A', 'B', 'C'] };

describe('slider point construction persistence', () => {
  const slider = { id: 's', type: 'slider', variableName: 'a', min: -10, max: 180, step: 1, value: 5 };
  const length = { kind: 'sliderPoint', sliderId: 's', mode: 'length', anchorId: 'A', direction: { x: 0.6, y: 0.8 } };
  const angle = { kind: 'sliderPoint', sliderId: 's', mode: 'angle', anchorId: 'A', referenceId: 'R', radius: 3, orientation: -1 };
  const file = (construction: unknown) => ({ objects: [p('A'), p('R', 4), slider, { ...p('B', 3, 4), construction }] });

  it.each([
    { kind: 'sliderPoint', sliderId: 's', mode: 'x' },
    { kind: 'sliderPoint', sliderId: 's', mode: 'y' },
    length,
    angle,
    { ...angle, maximumDegrees: 180 },
  ])('round trips %j without changing the binding or source document', construction => {
    const input = file(construction), snapshot = JSON.stringify(input);
    const loaded = parseProjectFile(input);
    expect(loaded.objects[3]).toMatchObject({ construction });
    expect(parseProjectFile(JSON.parse(JSON.stringify(loaded)))).toEqual(loaded);
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it.each([
    { ...length, mode: 'radius' },
    { ...length, sliderId: undefined },
    { ...length, anchorId: undefined },
    { ...length, direction: null },
    { ...length, direction: { x: 0, y: 0 } },
    { ...length, direction: { x: 1e-13, y: 0 } },
    { ...length, direction: { x: Number.MAX_VALUE, y: Number.MAX_VALUE } },
    { ...length, direction: { x: '1', y: 0 } },
    { ...length, direction: { x: Infinity, y: 0 } },
    { ...angle, referenceId: undefined },
    { ...angle, radius: 0 },
    { ...angle, radius: -1 },
    { ...angle, radius: NaN },
    { ...angle, orientation: 0 },
    { ...angle, maximumDegrees: 0 },
    { ...angle, maximumDegrees: 361 },
    { ...angle, maximumDegrees: Infinity },
    { ...angle, maximumDegrees: '180' },
  ])('rejects malformed slider point construction: %j', construction => {
    expect(() => parseProjectFile(file(construction))).toThrow();
  });

  it.each([
    { ...length, sliderId: 'missing' },
    { ...length, sliderId: 'A' },
    { ...length, anchorId: 's' },
    { ...angle, referenceId: 'missing' },
    { ...angle, referenceId: 's' },
  ])('rejects missing references and the wrong target type: %j', construction => {
    expect(() => parseProjectFile(file(construction))).toThrow();
  });

  it('rejects self references and indirect cycles through the angle reference point', () => {
    expect(() => parseProjectFile(file({ ...length, anchorId: 'B' }))).toThrow(/döngü/);
    const input = file(angle);
    input.objects[1] = { ...p('R', 4), construction: { kind: 'midpoint', pointIds: ['A', 'B'] } };
    expect(() => parseProjectFile(input)).toThrow(/döngü/);
  });

  it('round trips the owning angle reference without introducing a dependency cycle', () => {
    const input = { objects: [...file(angle).objects,
      { id: 'angle', type: 'angle', point1Id: 'R', vertexPointId: 'A', point3Id: 'B', valueSliderId: 's' }] };
    const loaded = parseProjectFile(input);
    expect(loaded.objects[4]).toMatchObject({ valueSliderId: 's' });
    expect(parseProjectFile(JSON.parse(JSON.stringify(loaded)))).toEqual(loaded);
  });

  it.each(['', 3, 'missing', 'A'])('rejects an invalid owning angle slider reference: %j', valueSliderId => {
    expect(() => parseProjectFile({ objects: [...file(angle).objects,
      { id: 'angle', type: 'angle', point1Id: 'R', vertexPointId: 'A', point3Id: 'B', valueSliderId }] })).toThrow();
  });
});

describe('ellipse slider binding persistence', () => {
  const ellipse = { id: 'ellipse', type: 'ellipse', centerPointId: 'O', radiusX: 4, radiusY: 2, rotation: 25 };
  const sliders = ['rx', 'ry', 'turn'].map(id => ({ id, type: 'slider', variableName: id, min: 1, max: 90, step: 1, value: 5 }));
  const file = (sliderBindings: unknown) => ({ objects: [p('O'), ...sliders, { ...ellipse, sliderBindings }] });

  it('round trips all three property bindings without changing their target identities', () => {
    const bindings = { radiusX: 'rx', radiusY: 'ry', rotation: 'turn' };
    const input = file(bindings), snapshot = JSON.stringify(input);
    const loaded = parseProjectFile(input);
    expect(loaded.objects[4]).toMatchObject({ ...ellipse, sliderBindings: bindings });
    expect(parseProjectFile(JSON.parse(JSON.stringify(loaded)))).toEqual(loaded);
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it.each([null, [], 'rx', { area: 'rx' }, { radiusX: '' }, { radiusX: 5 }, { radiusY: 'missing' }, { rotation: 'O' }])(
    'rejects malformed maps, unsupported properties and invalid slider targets: %j', bindings => {
      expect(() => parseProjectFile(file(bindings))).toThrow();
    });

  it('rejects a binding map attached to a different shape type', () => {
    expect(() => parseProjectFile({ objects: [p('O'), ...sliders, { ...p('P'), sliderBindings: { radiusX: 'rx' } }] })).toThrow();
  });

  it('includes map values when detecting dependency cycles', () => {
    const input = file({ radiusX: 'rx' });
    const objects = input.objects.map(o => o.id === 'rx' ? { ...o, dependsOn: ['ellipse'] } : o);
    expect(() => parseProjectFile({ objects })).toThrow(/döngü/);
  });
});

describe('measurement label anchors', () => {
  const anchor = { pointIds: ['A', 'B', 'C'], offset: { x: 6, y: 2 }, alignment: 'left' };

  it('round trips shared-centre anchors and keeps legacy offsets', () => {
    const labelAnchors = {
      edge0: anchor,
      edge1: { ...anchor, alignment: 'right', offset: { x: 6, y: 1 } },
      area: { ...anchor, alignment: 'center', offset: { x: 6, y: 0 } },
    };
    const polygon = { ...base, labelAnchors, labelOffsets: { edge0: { x: 4, y: 1 } } };
    const input = { objects: [p('A'), p('B', 3), p('C', 0, 4), polygon] };
    const before = JSON.stringify(input);
    const loaded = parseProjectFile(input);
    expect(loaded.objects[3]).toMatchObject(polygon);
    expect(parseProjectFile(JSON.parse(JSON.stringify(loaded)))).toEqual(loaded);
    expect(JSON.stringify(input)).toBe(before);
  });

  it('does not turn a decorative point anchor into a self dependency', () => {
    const loaded = parseProjectFile({ objects: [{ ...p('A'), labelAnchors: { pointLabel: anchor } }, p('B'), p('C')] });
    expect(loaded.objects[0].labelAnchors?.pointLabel).toEqual(anchor);
  });

  it('drops stale or non-point anchor groups without rejecting the drawing', () => {
    const labelAnchors = {
      edge0: { ...anchor, pointIds: ['A', 'missing'] },
      edge1: { ...anchor, pointIds: ['A', 'triangle'] },
      edge2: anchor,
    };
    const input = { objects: [p('A'), p('B'), p('C'), { ...base, labelAnchors, labelOffsets: { edge0: { x: 5, y: 1 } } }] };
    const before = JSON.stringify(input);
    const loaded = parseProjectFile(input).objects[3];
    expect(loaded.labelAnchors).toEqual({ edge2: anchor });
    expect(loaded.labelOffsets).toEqual({ edge0: { x: 5, y: 1 } });
    expect(JSON.stringify(input)).toBe(before);
    const withoutValid = parseProjectFile({ objects: [p('A'), { ...p('B'), labelAnchors: { measure: labelAnchors.edge0 } }] });
    expect(withoutValid.objects[1]).not.toHaveProperty('labelAnchors');
  });

  it.each([
    { pointIds: [] },
    { pointIds: ['A', 'A'] },
    { pointIds: ['A', 3] },
    { offset: { x: '6', y: 2 } },
    { offset: { x: Infinity, y: 2 } },
    { offset: null },
    { alignment: 'start' },
  ])('rejects malformed anchor coordinates or schema: %j', patch => {
    expect(() => parseProjectFile({ objects: [p('A'), p('B'), p('C'), { ...base, labelAnchors: { edge0: { ...anchor, ...patch } } }] })).toThrow();
  });
});

describe('project file validation', () => {
  it('opens legacy projects without changing or duplicating IDs', () => {
    const file = { version: '1.0', objects: [p('A'), p('B', 3), p('C', 0, 4), base] };
    const loaded = parseProjectFile(file);
    expect(loaded.objects.map(o => o.id)).toEqual(['A', 'B', 'C', 'triangle']);
    expect(loaded.objects[0].visible).toBe(true);
    expect(file.objects[0]).not.toHaveProperty('visible');
  });
  it.each([
    { objects: [{ id: 'bad', type: 'polygon' }] },
    { objects: [p('A'), p('A')] },
    { objects: [p('A'), { id: 'c', type: 'circle', centerPointId: 'missing', fixedRadius: 2 }] },
    { objects: [p('A', NaN)] },
    { objects: [], viewport: { zoom: 0 } },
    { objects: [], viewport: { panX: 'wrong' } },
    { objects: [], version: '99.0' },
    { objects: [{ ...p('A'), onObjectId: 'c' }, { id: 'c', type: 'circle', centerPointId: 'A', fixedRadius: 2 }] },
    { objects: [{ ...p('A'), construction: { kind: 'midpoint' } }] },
    { objects: [p('A'), { id: 'l', type: 'line', point1Id: 'A', point2Id: 'l' }] },
    { objects: [{ id: 's', type: 'slider', variableName: 'a', min: 2, max: 1, step: 1, value: 1 }] },
    { objects: [p('A'), p('B'), p('C'), { ...base, edgeLabels: {} }] },
    { objects: [{ ...p('A'), animSpeed: 'wrong' }] },
    { objects: [{ id: 'f', type: 'function', expression: 'x', domain: [1, 'wrong'] }] },
    { objects: [{ ...p('A'), dependsOn: ['missing'] }] },
    { objects: [], viewport: { gridStyle: 'kutupsal' } },
    { objects: [], viewport: { gridOpacity: 0 } },
    { objects: [], viewport: { gridOpacity: 1.5 } },
    { objects: [], viewport: { gridOpacity: '0.5' } },
  ])('rejects a malformed document before it can be applied: %j', file => expect(() => parseProjectFile(file)).toThrow());
  it.each(['kareli', 'noktali', 'izometrik'] as const)('keeps the %s grid style chosen from the canvas menu', gridStyle => {
    const loaded = parseProjectFile({ objects: [], viewport: { showGrid: true, gridStyle } });
    expect(loaded.viewport).toEqual({ showGrid: true, gridStyle });
  });
  it('keeps the grid spacing and opacity chosen in settings', () => {
    const loaded = parseProjectFile({ objects: [], viewport: { gridStep: 0.5, gridStepAuto: false, gridOpacity: 0.4 } });
    expect(loaded.viewport).toEqual({ gridStep: 0.5, gridStepAuto: false, gridOpacity: 0.4 });
  });
  it('preserves 3D scene, camera, styles and plane settings in a JSON round trip', () => {
    const file = { version: '2.0', objects: [], solids: [{ id: 'cube', type: 'cube', name: 'Küp', position: { x: 1, y: 2, z: 3 }, rotation: { x: 0, y: 30, z: 0 }, dimensions: { width: 3, height: 3, depth: 3 }, color: '#123456', opacity: 0.8, unfoldProgress: 0.5, showFaces: true, showWireframe: true, showVertices: false, selectedFaceIndex: null }],
      camera3D: { rotX: 25, rotY: -40, zoom: 55, panX: 0, panY: 30, perspective: 700, showAxes: true, showGrid: false, showCoordinates: false },
      styleSettings: { strokeScale: 2, fontScale: 1, pointRadius: 8, pointLabelScale: 1, measurementScale: 1, axisScale: 1, hideLabelBoxes: true, hideFills: false, olcuYazimi: 'kisa', aciYazimi: 'isaret' },
      layoutMode: '3d_only', viewport: { zoom: 88, panX: 42, panY: 0, showCoordinates: false } };
    expect(parseProjectFile(JSON.parse(JSON.stringify(file)))).toEqual(file);
  });
  it('opens a 1.0/2.0 file without the notation settings and fills them from the defaults', () => {
    const eski = { strokeScale: 2, fontScale: 1, pointRadius: 8, pointLabelScale: 1, measurementScale: 1, axisScale: 1, hideLabelBoxes: true, hideFills: false };
    expect(parseProjectFile({ objects: [], styleSettings: eski }).styleSettings)
      .toEqual({ ...eski, olcuYazimi: 'tam', aciYazimi: 'sapka' });
  });
  it('drops unknown style keys instead of copying them into the document', () => {
    const s = { strokeScale: 1, fontScale: 1, pointRadius: 6, pointLabelScale: 1, measurementScale: 1, axisScale: 1, hideLabelBoxes: false, hideFills: false, birSey: 'x' };
    expect(parseProjectFile({ objects: [], styleSettings: s }).styleSettings).not.toHaveProperty('birSey');
  });
  it.each([
    { olcuYazimi: 'uzun' },
    { aciYazimi: 'ok' },
    { hideFills: 'evet' },
  ])('rejects invalid style settings: %j', patch => {
    const s = { strokeScale: 1, fontScale: 1, pointRadius: 6, pointLabelScale: 1, measurementScale: 1, axisScale: 1, hideLabelBoxes: false, hideFills: false, ...patch };
    expect(() => parseProjectFile({ objects: [], styleSettings: s })).toThrow('stil ayarları geçersiz');
  });
  it('accepts saved live constructions produced by the command system', () => {
    let objects: any[] = [];
    for (const input of ['3 4 5 üçgeni çiz', 'B noktasından dik indir', 'üçgen uzunluklarını kaydırıcıya bağla']) {
      const result = executeTurkishCommand(input, objects, []);
      expect(result.ok).toBe(true);
      if (result.ok) objects = result.objects;
    }
    expect(parseProjectFile({ objects }).objects).toEqual(objects);
  });
});

describe('arc measurement (two points on a circle, circle not split)', () => {
  const sahne = () => [p('M'), p('B', 3), p('C', 0, 3), p('D', 0, -3), { id: 'k', type: 'circle', centerPointId: 'M', radiusPointId: 'B' }];
  const olcum = (extra: Record<string, unknown> = {}) => ({ id: 'y', type: 'measurement', kind: 'arc', pointIds: ['B', 'D'], circleId: 'k', showValue: true, ...extra });
  it.each([{}, { throughPointId: 'C' }, { major: true }, { startPointId: 'D' }, { startPointId: 'B', throughPointId: 'C' }])('round trips an arc measurement %j', extra => {
    const file = { objects: [...sahne(), olcum(extra)] };
    const loaded = parseProjectFile(JSON.parse(JSON.stringify(file)));
    expect(loaded.objects[5]).toMatchObject(olcum(extra));
    expect(parseProjectFile(JSON.parse(JSON.stringify(loaded))).objects).toEqual(loaded.objects);
  });
  it.each([
    ['missing circleId', { circleId: undefined }],
    ['circleId pointing at a point', { circleId: 'C' }],
    ['unknown circle', { circleId: 'yok' }],
    ['throughPointId pointing at a circle', { throughPointId: 'k' }],
    ['non-boolean major', { major: 'evet' }],
    ['startPointId that is not an endpoint', { startPointId: 'C' }],
    ['startPointId pointing at a circle', { startPointId: 'k' }],
    ['unknown startPointId', { startPointId: 'yok' }],
    ['identical endpoints', { pointIds: ['B', 'B'] }],
    ['three endpoints', { pointIds: ['B', 'C', 'D'] }],
  ])('rejects an arc measurement with %s', (_name, extra) => {
    expect(() => parseProjectFile({ objects: [...sahne(), olcum(extra)] })).toThrow();
  });
  it('still opens documents without arc measurements', () => {
    expect(parseProjectFile({ objects: [...sahne(), { id: 's', type: 'measurement', kind: 'slope', pointIds: ['B', 'D'] }] }).objects).toHaveLength(6);
  });
});

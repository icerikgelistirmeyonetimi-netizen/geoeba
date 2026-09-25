import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { aci, olcuDugumleri, uzunluk, VARSAYILAN_YAZIM } from '@/math/matematikYazimi';
import { CanvasLayers, splitSvgTextLayers } from '../CanvasLayers';
import { MatematikEtiketi } from '../MatematikEtiketi';
import { CanvasButton, CanvasCheckbox, CanvasInputBox } from '../CanvasWidgets';

const markup = (nodes: React.ReactNode) => renderToStaticMarkup(<svg>{nodes}</svg>);
const pointName = (label: string) => ({ label, showLabel: true, visible: true });

describe('CanvasLayers', () => {
  it('nesne sırasından bağımsız olarak kalem ve görselleri bütün yazıların altına yerleştirir', () => {
    const scene = (
      <>
        <g transform="translate(10 20)">
          <text data-test="early-label">A</text>
          <path data-test="edge" d="M0 0L40 20" />
          <g transform="rotate(30)"><rect width={8} height={5} /><text>20 br</text></g>
        </g>
        <path data-test="late-pen" d="M0 4L80 4" />
        <image data-test="late-image" href="data:image/png;base64,AA==" width={80} height={80} />
      </>
    );
    const html = markup(<CanvasLayers>{scene}</CanvasLayers>);
    const geometryStart = html.indexOf('data-canvas-layer="geometry"');
    const labelStart = html.indexOf('data-canvas-layer="labels"');
    const firstText = html.indexOf('<text');
    expect(geometryStart).toBeGreaterThan(0);
    expect(labelStart).toBeGreaterThan(geometryStart);
    expect(firstText).toBeGreaterThan(labelStart);
    for (const marker of ['edge', 'late-pen', 'late-image']) {
      const position = html.indexOf(`data-test="${marker}"`);
      expect(position).toBeGreaterThan(geometryStart);
      expect(position).toBeLessThan(labelStart);
    }
    expect(html.match(/<text\b/g)).toHaveLength(2);
  });

  it('text ve tspan içeriğini, konumunu ve anahtarını tek parça korur', () => {
    const text = <text key="point-name" x={15} y={25} textAnchor="middle">A<tspan dx={4} dy={2}>(2, 3)</tspan></text>;
    const result = splitSvgTextLayers(text);
    expect(result.geometry).toEqual([]);
    expect(result.labels).toHaveLength(1);
    expect((result.labels[0] as React.ReactElement).type).toBe('text');
    expect((result.labels[0] as React.ReactElement).props).toBe(text.props);
    expect(markup(result.labels)).toBe(markup(text));
  });

  it('etiket kartının arka planını ve süslerini yazısıyla birlikte üst katmanda tutar', () => {
    const card = (
      <g key="card" data-canvas-label="" transform="translate(30 40)">
        <rect data-test="card-background" x={-40} y={-12} width={80} height={24} />
        <path data-test="card-underline" d="M-20 8H20" />
        <text>Alan = 6 br²</text>
      </g>
    );
    const result = splitSvgTextLayers([card, <path key="edge" d="M0 0L100 50" />]);
    expect(result.labels).toHaveLength(1);
    expect((result.labels[0] as React.ReactElement).props).toBe(card.props);
    expect(markup(result.geometry)).not.toContain('card-background');
    expect(markup(result.labels)).toContain('card-background');
    expect(markup(result.labels)).toContain('card-underline');
    expect(markup(result.labels)).toContain('Alan = 6 br²');
  });

  it('memo matematik etiketini bölmeden kutusu, açı şapkası ve uzunluk çubuklarıyla taşır', () => {
    const [A, B, C] = ['A', 'B', 'C'].map(pointName);
    const label = <MatematikEtiketi
      key="measure"
      x={20} y={35} px={12} renk="on" sesli="uzunluk ve açı"
      satirlar={[olcuDugumleri(uzunluk(A, B, 20), VARSAYILAN_YAZIM), olcuDugumleri(aci(A, B, C, 60), VARSAYILAN_YAZIM)]}
      kutu={{ sinif: 'fill-background' }}
    />;
    const result = splitSvgTextLayers(label);
    expect(result.geometry).toEqual([]);
    expect((result.labels[0] as React.ReactElement).type).toBe(MatematikEtiketi);
    expect((result.labels[0] as React.ReactElement).props).toBe(label.props);
    const html = markup(result.labels);
    expect(html).toBe(markup(label));
    expect(html).toContain('data-yazim-kutu');
    expect(html.match(/<path\b/g)?.length).toBeGreaterThanOrEqual(3);
    expect(html).toContain('20 br');
    expect(html).toContain('60°');
  });

  const base = { id: 'widget', label: 'Göster', showLabel: true, visible: true, color: '#123456', createdAt: 0, x: 1, y: 2 };
  const widgetProps = { ekran: { x: 44, y: 88 }, secili: false, onMouseDown: () => {}, onContextMenu: () => {} };
  const widgets = [
    ['onay kutusu', <CanvasCheckbox key="checkbox" {...widgetProps} obj={{ ...base, type: 'checkbox', checked: true, targetIds: [] }} onToggle={() => {}} />],
    ['düğme', <CanvasButton key="button" {...widgetProps} obj={{ ...base, type: 'button', action: { kind: 'clearTraces' } }} onRun={() => {}} />],
    ['girdi kutusu', <CanvasInputBox key="input" {...widgetProps} obj={{ ...base, type: 'input_box', targetId: 'slider', field: 'value' }} deger="5" onCommit={() => null} />],
  ] as const;

  it.each(widgets)('%s yazısı ve etkileşim yüzeyleri aynı üst katmanda kalır', (_, widget) => {
    const result = splitSvgTextLayers(widget);
    expect(result.geometry).toEqual([]);
    expect((result.labels[0] as React.ReactElement).type).toBe(widget.type);
    expect((result.labels[0] as React.ReactElement).props).toBe(widget.props);
    expect(markup(result.labels)).toBe(markup(widget));
    expect(markup(result.labels)).toContain('data-object-id="widget"');
  });

  it('karma grupların dönüşüm ve olaylarını korurken hizalama hedefini ve DOM kimliğini çoğaltmaz', () => {
    const onPointerDown = vi.fn();
    const onContextMenu = vi.fn();
    const ref = React.createRef<SVGGElement>();
    const style = { opacity: 0.75, cursor: 'move' };
    const text = <text key="name" x={10} y={-8}>A</text>;
    const dot = <circle key="dot" data-point-id="A" cx={0} cy={0} r={3} />;
    const children = <React.Fragment key="content">{dot}{text}</React.Fragment>;
    const source = (
      <g key="point-A" id="point-A-group" ref={ref} data-object-id="A"
        data-label-object="A" data-label-kind="pointLabel" data-label-width={20} data-label-x={10}
        transform="translate(10 20) rotate(15)" style={style} pointerEvents="all"
        onPointerDown={onPointerDown} onContextMenu={onContextMenu}>
        {children}
      </g>
    );
    const original = markup(source);
    const result = splitSvgTextLayers(source);
    const geometry = result.geometry[0] as React.ReactElement<React.SVGProps<SVGGElement> & Record<string, unknown>>;
    const labels = result.labels[0] as typeof geometry;
    for (const layer of [geometry, labels]) {
      expect(layer.key).toBe(geometry.key);
      expect(layer.key).toContain('point-A');
      expect(layer.props.transform).toBe(source.props.transform);
      expect(layer.props.style).toBe(style);
      expect(layer.props.pointerEvents).toBe('all');
      expect(layer.props.onPointerDown).toBe(onPointerDown);
      expect(layer.props.onContextMenu).toBe(onContextMenu);
      expect(layer.props['data-object-id']).toBe('A');
    }
    expect(geometry.props.id).toBe('point-A-group');
    expect((geometry as unknown as { ref: unknown }).ref).toBe(ref);
    expect(labels.props.id).toBeUndefined();
    expect((labels as unknown as { ref: unknown }).ref).toBeFalsy();
    const geometryHtml = markup(result.geometry), labelHtml = markup(result.labels);
    expect(geometryHtml).not.toContain('data-label-');
    expect(labelHtml).toContain('data-label-object="A"');
    expect(labelHtml).toContain('data-label-width="20"');
    expect(geometryHtml.match(/<circle\b/g)).toHaveLength(1);
    expect(labelHtml).not.toContain('<circle');
    expect(labelHtml).not.toContain('data-point-id');
    for (const layer of [geometry, labels]) {
      const fragment = Array.isArray(layer.props.children) ? layer.props.children[0] : layer.props.children;
      expect((fragment as React.ReactElement).key).toContain('content');
    }
    expect(source.props.children).toBe(children);
    expect(source.props['data-label-object']).toBe('A');
    expect(markup(source)).toBe(original);
  });

  it('yalnız geometri içeren grubun özelliklerini ve kaynak çocuklarını değiştirmez', () => {
    const rect = <rect key="face" width={20} height={10} />;
    const path = <path key="edge" d="M0 0L20 10" />;
    const group = <g key="solid" transform="translate(4 8)">{rect}{path}</g>;
    const result = splitSvgTextLayers([null, false, group]);
    expect(result.labels).toEqual([]);
    expect(result.geometry).toHaveLength(1);
    expect((result.geometry[0] as React.ReactElement).props).toBe(group.props);
    expect((result.geometry[0] as React.ReactElement).props.children).toBe(group.props.children);
    expect(markup(result.geometry)).toBe(markup(group));
    expect(group.props.children).toEqual([rect, path]);
  });

  it('ayrı map dizilerindeki aynı anahtarları ayırır; katmanlarda React key uyarısı üretmez', () => {
    const scene = [
      [<g key="0"><path d="M0 0L10 10" /><text>A</text></g>],
      [<g key="0"><path d="M20 0L30 10" /><text>B</text></g>],
    ];
    const result = splitSvgTextLayers(scene);
    for (const layer of [result.geometry, result.labels]) {
      const keys = layer.map(node => (node as React.ReactElement).key);
      expect(new Set(keys).size).toBe(2);
    }
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const html = markup(<CanvasLayers>{scene}</CanvasLayers>);
      expect(html).toContain('>A</text>');
      expect(html).toContain('>B</text>');
      expect(error).not.toHaveBeenCalled();
    } finally {
      error.mockRestore();
    }
  });
});

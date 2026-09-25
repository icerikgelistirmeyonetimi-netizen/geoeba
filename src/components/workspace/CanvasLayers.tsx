import React from 'react';
import { MatematikEtiketi } from './MatematikEtiketi';
import { CanvasButton, CanvasCheckbox, CanvasInputBox } from './CanvasWidgets';
import { RotateGizmo } from './RotateGizmo';

interface Layers {
  geometry: React.ReactNode[];
  labels: React.ReactNode[];
}

type NodeProps = { children?: React.ReactNode; [key: string]: unknown };

/**
 * SVG paint sırasını ayırır: bütün şekiller önce, yazı ve kartları sonra.
 * Aynı hesabı iki kez çalıştırmaz; hazır JSX ağacındaki g/Fragment yollarını korur.
 * Bileşenleri çağırmaz, DOM taşımaz; React olayları ve dışa aktarım aynı ağaçta kalır.
 * data-canvas-label, arka planı/ikonu da yazıyla birlikte taşınan bir kartı işaretler.
 */
export function splitSvgTextLayers(children: React.ReactNode): Layers {
  const geometry: React.ReactNode[] = [];
  const labels: React.ReactNode[] = [];

  // Ayrı map dizileri aynı key'leri kullanabilir. React'in kendi anahtar yolları
  // bu diziler düzleştirilirken bile etiketlerin sürükleme sırasında yeniden kurulmasını önler.
  React.Children.toArray(children).forEach(child => {
    if (child === null || child === undefined || typeof child === 'boolean') return;
    if (!React.isValidElement<NodeProps>(child)) {
      geometry.push(child);
      return;
    }

    const { type, props } = child;
    if (type === 'text' || type === MatematikEtiketi
      || type === CanvasCheckbox || type === CanvasButton || type === CanvasInputBox || type === RotateGizmo
      || (props['data-canvas-label'] !== undefined && props['data-canvas-label'] !== false)) {
      labels.push(child);
      return;
    }

    // defs, sembol/mask tanımları ve kapalı bileşenlerin içine girilmez.
    if (type !== 'g' && type !== React.Fragment) {
      geometry.push(child);
      return;
    }

    const nested = splitSvgTextLayers(props.children);
    if (nested.labels.length === 0) {
      geometry.push(child);
      return;
    }
    if (nested.geometry.length === 0) {
      labels.push(child);
      return;
    }

    const geometryProps: Record<string, unknown> = {};
    const labelProps: Record<string, unknown> = {};
    if (type === 'g') {
      // Hizalama/etiket sürükleme sorguları yalnız gerçek yazı grubunu bulmalı.
      for (const key of Object.keys(props)) {
        if (key.startsWith('data-label-')) geometryProps[key] = undefined;
      }
      // Aynı DOM kimliği veya ref iki ayrı gruba verilmez. Nesne kimliği, transform,
      // renk, pointer-events ve olaylar iki dalda da korunur.
      labelProps.id = undefined;
      labelProps.ref = null;
    }
    geometry.push(React.cloneElement(child, geometryProps, ...nested.geometry));
    labels.push(React.cloneElement(child, labelProps, ...nested.labels));
  });

  return { geometry, labels };
}

export function CanvasLayers({ children }: { children: React.ReactNode }) {
  const { geometry, labels } = splitSvgTextLayers(children);
  return (
    <>
      <g data-canvas-layer="geometry">{geometry}</g>
      <g data-canvas-layer="labels">{labels}</g>
    </>
  );
}

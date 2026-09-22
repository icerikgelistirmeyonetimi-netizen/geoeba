import { ToolMode } from '@/types/workspace';
import { isAnyModalOpen } from '@/components/ui/modalState';

// Ctrl/Cmd ve Alt tarayıcıya/metin düzenlemeye ayrılır. Shift ayrı araçları seçer.
export const TOOL_SHORTCUTS: Record<ToolMode, string> = {
  select: 'V', point: 'N', segment: 'L', line: 'D', ray: 'I',
  circle: 'C', circle_radius: 'Shift+C', circle_3points: 'Shift+O',
  ellipse: 'E', arc: 'Y', sector: 'Shift+Y', angle: 'A',
  polygon: 'P', square: 'K', rectangle: 'Shift+D', regular_polygon: 'Shift+P',
  midpoint: 'O', divide_ratio: 'Shift+B', perp_bisector: 'Shift+M',
  angle_bisector: 'Shift+A', perpendicular: 'Shift+H', parallel: 'Shift+J',
  segment_length: 'Shift+L', compass: 'G', intersect: 'X', translate: 'Shift+V',
  measure_slope: 'Shift+E', trig_ratios: 'Shift+T', measure_arc: 'Shift+K', checkbox: 'Q',
  button: 'B', input_box: 'Shift+I', pen: 'F', measure_distance: 'U',
  measure_angle: 'Shift+G', measure_area: 'M', measure_perimeter: 'Shift+U',
  unit_measure: 'J', area_model: 'Shift+Q', ruler: 'Z', setsquare: 'Shift+Z',
  rotate: 'R', reflect: 'Shift+R', symmetry: 'Shift+X', fraction: 'H',
  image: 'Shift+F', text: 'T', slider: 'S', function: 'W', delete: 'Shift+S', pan: 'Shift+N',
};

export function toolForShortcut(event: Pick<KeyboardEvent, 'code' | 'shiftKey' | 'ctrlKey' | 'metaKey' | 'altKey' | 'isComposing' | 'repeat'>): ToolMode | undefined {
  if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing || event.repeat) return;
  if (!/^Key[A-Z]$/.test(event.code)) return;
  const key = `${event.shiftKey ? 'Shift+' : ''}${event.code.slice(3)}`;
  return (Object.entries(TOOL_SHORTCUTS) as [ToolMode, string][]).find(([, shortcut]) => shortcut === key)?.[0];
}

export function isEditingOrInDialog(target: EventTarget | null): boolean {
  return target instanceof Element && (
    (target instanceof HTMLElement && target.isContentEditable) || !!target.closest('input, textarea, select, [role="textbox"], [role="dialog"]:not([data-pencere]), [role="menu"]')
  );
}

/** Kısayol yalnız görünür, öndeki çizim penceresine aittir; uygulama penceresi modal değildir. */
export function workspaceOwnsKeyboard(event: KeyboardEvent, surface: Element | null): boolean {
  if (!surface || event.defaultPrevented || event.isComposing || isAnyModalOpen() || isEditingOrInDialog(event.target)) return false;
  const windowElement = surface.closest('[data-pencere]');
  if (windowElement) {
    if (windowElement.getAttribute('data-pencere') !== 'acik' || windowElement.getAttribute('data-pencere-onde') !== '1') return false;
    const targetWindow = event.target instanceof Element ? event.target.closest('[data-pencere]') : null;
    if (targetWindow && targetWindow !== windowElement) return false;
  }
  return surface.getClientRects().length > 0;
}

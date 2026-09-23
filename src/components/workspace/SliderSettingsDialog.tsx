'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Check, Sliders, Trash2, X } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { createId, useWorkspace } from '@/state/WorkspaceContext';
import { resolveCommandBindings } from '@/math/commandBindings';
import {
  rebindSliderProperty, sliderBindingTargets, sliderIsBound, snapSliderValue, validateSliderSettings,
} from '@/math/sliderBindings';
import type { MathObject } from '@/types/math';

interface SliderSettingsDialogProps {
  sliderId: string | null;
  onClose: () => void;
}

type NumberField = 'min' | 'max' | 'step' | 'value';
const NUMBER_FIELDS: { key: NumberField; label: string }[] = [
  { key: 'min', label: 'Başlangıç' },
  { key: 'max', label: 'Bitiş' },
  { key: 'step', label: 'Adım' },
  { key: 'value', label: 'Mevcut değer' },
];
const INPUT_CLASS = 'w-full px-3 py-2 rounded-lg bg-input border border-border text-foreground outline-none focus:ring-1 focus:ring-primary';

/** Ondalık virgülü kabul eder; boş metni, kısmi sayıyı ve sonsuz değerleri reddeder. */
function parseNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (!/^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:[eE][+-]?\d+)?$/.test(trimmed)) return null;
  const number = Number(trimmed.replace(',', '.'));
  return Number.isFinite(number) ? number : null;
}

export function SliderSettingsDialog({ sliderId, onClose }: SliderSettingsDialogProps) {
  const { objects, commit, deleteObject } = useWorkspace();
  const [numbers, setNumbers] = useState<Record<NumberField, string>>({ min: '', max: '', step: '', value: '' });
  const [position, setPosition] = useState({ x: '', y: '' });
  const [targetId, setTargetId] = useState('');
  const [propertyKey, setPropertyKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const loadedIdRef = useRef<string | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const objectsRef = useRef(objects);
  objectsRef.current = objects;
  const minInputRef = useRef<HTMLInputElement>(null);

  const slider = objects.find(object => object.id === sliderId && object.type === 'slider');
  const targets = useMemo(() => sliderBindingTargets(objects, sliderId ?? undefined), [objects, sliderId]);
  const target = targets.find(item => item.id === targetId);
  const bound = sliderId ? sliderIsBound(objects, sliderId) : false;

  useEffect(() => {
    if (!sliderId) {
      loadedIdRef.current = null;
      return;
    }
    if (!slider || slider.type !== 'slider') {
      loadedIdRef.current = null;
      onCloseRef.current();
      return;
    }
    // Canlandırma veya başka bir nesnedeki değişiklik yazılan form değerlerini ezmez.
    if (loadedIdRef.current === sliderId) return;
    loadedIdRef.current = sliderId;
    setNumbers({
      min: String(slider.min).replace('.', ','),
      max: String(slider.max).replace('.', ','),
      step: String(slider.step).replace('.', ','),
      value: String(slider.value).replace('.', ','),
    });
    setPosition({
      x: slider.x === undefined ? '' : String(slider.x).replace('.', ','),
      y: slider.y === undefined ? '' : String(slider.y).replace('.', ','),
    });
    setTargetId('');
    setPropertyKey('');
    setError(null);
  }, [sliderId, slider]);

  if (!sliderId || !slider || slider.type !== 'slider') return null;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = {} as Record<NumberField, number>;
    for (const { key, label } of NUMBER_FIELDS) {
      const value = parseNumber(numbers[key]);
      if (value === null) {
        setError(numbers[key].trim()
          ? `${label} için geçerli bir sayı girin. Ondalık ayırıcı olarak virgül veya nokta kullanabilirsiniz.`
          : `${label} alanını doldurun.`);
        return;
      }
      parsed[key] = value;
    }
    const validation = validateSliderSettings(parsed.min, parsed.max, parsed.step, parsed.value);
    if (validation) {
      setError(validation);
      return;
    }
    const hasX = position.x.trim() !== '';
    const hasY = position.y.trim() !== '';
    if (hasX !== hasY) {
      setError('Konum için X ve Y alanlarını birlikte doldurun.');
      return;
    }
    let coordinates: { x: number; y: number } | Record<string, never> = {};
    if (hasX && hasY) {
      const x = parseNumber(position.x);
      const y = parseNumber(position.y);
      if (x === null || y === null) {
        setError('X ve Y konumları için geçerli sayılar girin. Ondalık ayırıcı olarak virgül veya nokta kullanabilirsiniz.');
        return;
      }
      coordinates = { x, y };
    }
    if (targetId && (!target || !target.properties.some(property => property.key === propertyKey && !property.disabled))) {
      setError(target ? 'Kaydırıcıyla değiştirilecek özelliği seçin.' : 'Seçilen şekil artık bağlanabilir değil. Başka bir şekil seçin.');
      return;
    }

    const settings = { ...parsed, ...coordinates, value: snapSliderValue(parsed.value, parsed.min, parsed.max, parsed.step) };
    // Ön doğrulama ve reducer aynı yeni nokta kimliklerini kullanır; React tekrar
    // değerlendirse de tek bağlama işlemi farklı noktalar üretmez.
    const newPointIds: string[] = [];
    const update = (previous: MathObject[]): MathObject[] => {
      if (!previous.some(object => object.id === sliderId && object.type === 'slider')) {
        throw new Error('Kaydırıcı artık bulunamadı.');
      }
      if (targetId) {
        let index = 0;
        return rebindSliderProperty(previous, sliderId, targetId, propertyKey, settings, () => {
          const slot = index++;
          return newPointIds[slot] ?? (newPointIds[slot] = createId('point'));
        });
      }
      const next = previous.map(object => object.id === sliderId ? { ...object, ...settings } as MathObject : object);
      return resolveCommandBindings(next);
    };

    try {
      update(objectsRef.current);
      commit(update, `${slider.variableName} kaydırıcısı ayarlandı`);
      setError(null);
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Kaydırıcı ayarları uygulanamadı. Değerleri kontrol edin.');
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      labelledBy="slider-settings-title"
      initialFocusRef={minInputRef}
      overlayClassName="bg-ada-murekkep/60 backdrop-blur-sm"
      className="bg-card border border-border w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150"
    >
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-primary" aria-hidden="true" />
          <h2 id="slider-settings-title" className="text-base font-bold text-foreground">Kaydırıcı Ayarları</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Kapat" title="Kapat (Esc)" className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted">
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 text-xs" noValidate>
        <p className="font-semibold text-foreground">{slider.variableName}</p>
        <div className="grid grid-cols-2 gap-3">
          {NUMBER_FIELDS.map(({ key, label }) => (
            <div key={key} className="space-y-1">
              <label htmlFor={`slider-settings-${key}`} className="font-semibold text-muted-foreground">{label}</label>
              <input
                id={`slider-settings-${key}`}
                ref={key === 'min' ? minInputRef : undefined}
                type="text"
                inputMode="decimal"
                value={numbers[key]}
                onChange={event => {
                  setNumbers(previous => ({ ...previous, [key]: event.target.value }));
                  setError(null);
                }}
                className={`${INPUT_CLASS} font-mono`}
              />
            </div>
          ))}
        </div>

        <div className="space-y-2 border-t border-border pt-3">
          <h3 className="font-semibold text-foreground">Konum</h3>
          <div className="grid grid-cols-2 gap-3">
            {(['x', 'y'] as const).map(axis => (
              <div key={axis} className="space-y-1">
                <label htmlFor={`slider-settings-position-${axis}`} className="font-semibold text-muted-foreground">{axis.toUpperCase()}</label>
                <input
                  id={`slider-settings-position-${axis}`}
                  type="text"
                  inputMode="decimal"
                  value={position[axis]}
                  onChange={event => {
                    const raw = event.target.value;
                    setPosition(previous => ({ ...previous, [axis]: raw }));
                    setError(null);
                  }}
                  className={`${INPUT_CLASS} font-mono`}
                />
              </div>
            ))}
          </div>
          <p className="text-muted-foreground leading-relaxed">X ve Y girerek kaydırıcıyı tuvalde konumlandırabilirsiniz.</p>
        </div>

        <div className="space-y-3 border-t border-border pt-3">
          <p id="slider-settings-hint" className="text-muted-foreground leading-relaxed">{bound ? 'Şekil bağlantısını değiştirmek için şekli ve özelliği seçin.' : 'Önce şekli, sonra değiştirmek istediğiniz kenar, açı veya diğer özelliği seçin.'}</p>
          <div className="space-y-1">
            <label htmlFor="slider-settings-target" className="font-semibold text-foreground">Şekil</label>
            <select
              id="slider-settings-target"
              value={targetId}
              aria-describedby="slider-settings-hint"
              onChange={event => {
                setTargetId(event.target.value);
                setPropertyKey('');
                setError(null);
              }}
              className={INPUT_CLASS}
            >
              <option value="">{bound ? 'Mevcut bağlantıyı koru' : 'Şekil seçin'}</option>
              {targets.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </div>
          {target && (
            <div className="space-y-1">
              <label htmlFor="slider-settings-property" className="font-semibold text-foreground">Özellik</label>
              <select
                id="slider-settings-property"
                value={propertyKey}
                onChange={event => { setPropertyKey(event.target.value); setError(null); }}
                className={INPUT_CLASS}
              >
                <option value="">Özellik seçin</option>
                {[
                  { label: 'Kenarlar', properties: target.properties.filter(property => property.key.startsWith('edge:')) },
                  { label: 'Açılar', properties: target.properties.filter(property => property.key.startsWith('angle:') || property.key === 'centralAngle' || property.key === 'rotation') },
                  { label: 'Diğer özellikler', properties: target.properties.filter(property => !property.key.startsWith('edge:') && !property.key.startsWith('angle:') && property.key !== 'centralAngle' && property.key !== 'rotation') },
                ].filter(group => group.properties.length > 0).map(group => (
                  <optgroup key={group.label} label={group.label}>
                    {group.properties.map(property => <option key={property.key} value={property.key} disabled={property.disabled}>{property.label}{property.disabled ? ' — düzenlenemiyor' : ''}</option>)}
                  </optgroup>
                ))}
              </select>
              {target.properties.some(property => property.disabled) && <p className="text-muted-foreground leading-relaxed">Kilitli veya başka ilişkilerle kısıtlanan özellikler değiştirilemez.</p>}
            </div>
          )}
          {targets.length === 0 && <p className="text-muted-foreground leading-relaxed">Şu anda bağlanabilecek bir şekil yok. Kaydırıcının aralığını ve adımını yine de düzenleyebilirsiniz.</p>}
        </div>

        {error && <p role="alert" className="flex items-start gap-1.5 text-destructive leading-relaxed"><AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" /><span>{error}</span></p>}

        <div className="pt-3 space-y-3 border-t border-border">
          {bound && <p className="text-muted-foreground leading-relaxed">Kaydırıcı silindiğinde şekiller son değerlerinde kalır.</p>}
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => { deleteObject(sliderId); onClose(); }}
              className="mr-auto inline-flex items-center gap-1.5 px-2 py-2 rounded-xl font-semibold text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />Kaydırıcıyı sil
            </button>
            <button type="button" onClick={onClose} className="px-3 py-2 rounded-xl font-semibold text-muted-foreground hover:text-foreground hover:bg-muted">Vazgeç</button>
            <button type="submit" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-colors"><Check className="w-3.5 h-3.5" aria-hidden="true" />Kaydet</button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

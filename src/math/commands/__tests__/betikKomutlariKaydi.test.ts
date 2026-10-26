import { describe, expect, it } from 'vitest';
import type { MathObject } from '@/types/math';
import { runCommand } from '../engine';

/*
 * Betik komutları (CanlandırmayıBaşlat / DeğerAta / İzBırak ve doğal dil karşılıkları) çıktı kaydı: sonuç, ileti,
 * arayüz işlemleri ve değişen alanlar. scripting.ts yeniden yazılırken değişmemesi için önceki koda göre alındı.
 */

const temel = { showLabel: true, color: '#2563eb', visible: true, createdAt: 0 };
const o = (id: string, type: string, alanlar: Record<string, unknown> = {}) => ({ id, type, label: id, ...temel, ...alanlar }) as unknown as MathObject;

const sahne = (): MathObject[] => [
  o('A', 'point', { x: 0, y: 0, onObjectId: 's1', isIndependent: false }),
  o('B', 'point', { x: 2, y: 1, isIndependent: true }),
  o('C', 'point', { x: 4, y: 0, isIndependent: true }),
  o('s1', 'segment', { label: '[BC]', startPointId: 'B', endPointId: 'C' }),
  o('a', 'slider', { variableName: 'a', min: -5, max: 5, step: 0.5, value: 1 }),
  o('sb', 'slider', { label: 'b', variableName: 'b', min: 0, max: 10, step: 1, value: 4 }),
  o('sr', 'slider', { label: 'α', variableName: 'α', min: 0, max: 360, step: 1, value: 30 }),
  o('K', 'point', { x: -3, y: 0, isIndependent: true }),
  o('L', 'point', { x: -1, y: 0, isIndependent: true }),
  o('L2', 'point', { x: -1.27, y: 1, isIndependent: false, construction: { kind: 'rotate', sourceId: 'L', centerId: 'K', degrees: 30, sliderId: 'sr' } }),
  o('aci', 'angle', { label: 'LKL2', point1Id: 'L', vertexPointId: 'K', point3Id: 'L2' }),
  o('aci2', 'angle', { label: 'BCK', point1Id: 'B', vertexPointId: 'C', point3Id: 'K' }),
  o('c1', 'circle', { label: 'Ç1', centerPointId: 'B', radiusPointId: 'C' }),
];

const KOMUTLAR = [
  // Canlandırma: köşeli / yuvarlak ayraç, doğru / yanlış yazımları
  'CanlandırmayıBaşlat[]', 'CanlandırmayıBaşlat[true]', 'CanlandırmayıBaşlat[1]', 'CanlandırmayıBaşlat[doğru]', 'CanlandırmayıBaşlat[TRUE]',
  'StartAnimation[false]', 'StartAnimation[0]', 'StartAnimation(yanlış)', 'startanimation (true)', 'CANLANDIRMAYIBAŞLAT[a]',
  'CanlandırmayıBaşlat[A, true]', 'CanlandırmayıBaşlat[A, false]', 'CanlandırmayıBaşlat[A]', 'CanlandırmayıBaşlat[A, 0]', 'CanlandırmayıBaşlat[A, doğru]',
  'CanlandırmayıBaşlat[B, true]', 'CanlandırmayıBaşlat[a, true]', 'CanlandırmayıBaşlat[a, false]', 'CanlandırmayıBaşlat[ b ]', 'StartAnimation[α, 1]',
  'CanlandırmayıBaşlat[LKL2, true]', 'CanlandırmayıBaşlat[aci, false]', 'CanlandırmayıBaşlat[BCK, true]', 'CanlandırmayıBaşlat[Ç1]', 'CanlandırmayıBaşlat[ç1, true]',
  'CanlandırmayıBaşlat[X, true]', 'CanlandırmayıBaşlat[s1]', 'CanlandırmayıBaşlat[sb]', 'CanlandırmayıBaşlat[A, true, 3]', 'StartAnimation[a b]',
  // Canlandırma: doğal dil
  'A noktasının animasyonunu başlat', 'A noktasını canlandır', 'A noktasının animasyonunu durdur', 'A noktasının animasyonunu kapat',
  'B noktasını canlandır', 'noktayı canlandır', 'a sürgüsünü canlandır', 'a animasyonunu bitir', 'Q noktasını canlandır', 'Ç1 çemberini canlandır',
  // Değer atama
  'DeğerAta[a, 5]', 'SetValue[a, 2*3]', 'DeğerAta[a, 1,5]', 'DeğerAta[a, -1.5]', 'SetValue(b, 7)', 'DeğerAta[α, 90]', 'DeğerAta[sb, b+1]',
  'DeğerAta[a]', 'DeğerAta[]', 'DeğerAta[A, 3]', 'DeğerAta[a, x+]', 'DeğerAta[Z, 2]', 'degerata[A1, 2]', 'SetValue a 3',
  // İz
  'İzBırak[A, true]', 'İzBırak[A, false]', 'İzBırak[A]', 'İzBırak[A, 1]', 'İziGöster[B]', 'ShowTrace[c1, true]', 'ShowTrace[ç1, yanlış]',
  'İzBırak[a, true]', 'İzBırak[]', 'İzBırak[Q]', 'İzleriTemizle[]', 'ClearTrace[]', 'cleartraces', 'ClearTraces()', 'izleri temizle',
  'izi sil', 'izleri sil', 'A noktasının izini aç', 'A noktasının izini kapat', 'B noktasının izini gizle', 'B noktasının iz bırak', 'iz bırak',
  'C noktasının izini sil',
];

/** Sonucun karşılaştırılabilir özeti: değişen alanlar (canlandırma, iz, değer), ileti ve arayüz işlemleri */
function ozet(komut: string) {
  const once = sahne();
  const r = runCommand(komut, once);
  if (!r.ok) return { ok: false, ileti: r.message, tanınmadı: r.unrecognized ?? false };
  const degisen: Record<string, unknown> = {};
  for (const n of r.objects) {
    const eski = once.find((x) => x.id === n.id) as unknown as Record<string, unknown> | undefined;
    const yeni = n as unknown as Record<string, unknown>;
    if (!eski) {
      degisen[n.id] = 'yeni nesne';
      continue;
    }
    for (const alan of ['animating', 'showTrace', 'value']) if (eski[alan] !== yeni[alan]) degisen[`${n.id}.${alan}`] = yeni[alan];
  }
  return { ok: true, ileti: r.message, islemler: r.actions, degisen, sahneDegisti: r.sceneChanged, sayi: r.objects.length };
}

describe('betik komutları çıktı kaydı', () => {
  it.each(KOMUTLAR)('%s', (komut) => {
    expect(ozet(komut)).toMatchSnapshot();
  });
});

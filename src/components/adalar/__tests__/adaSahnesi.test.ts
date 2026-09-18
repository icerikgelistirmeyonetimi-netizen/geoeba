import { beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';

/*
 * Motor modülü dinamik olarak yüklenir: özgün parça, modül içe aktarılmadan önce
 * kaydedilir; böylece içe aktarmanın global ShaderChunk'ı değiştirmediği sınanabilir.
 */
const ORIJINAL_PARCA = THREE.ShaderChunk.lights_fragment_begin;
const YONLU_CAGRI_MALZEME =
  'RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );';
const YONLU_CAGRI_DOLGU =
  'RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, dolguMalzeme, reflectedLight );';

let modul: typeof import('../adaSahnesi');

beforeAll(async () => {
  modul = await import('../adaSahnesi');
});

/** Yönlü ışık döngüsü: getDirectionalLightInfo çağrısından döngü sonuna kadar. */
function yonluBolum(parca: string): string {
  const bas = parca.indexOf('getDirectionalLightInfo( directionalLight, directLight );');
  expect(bas).toBeGreaterThan(-1);
  const son = parca.indexOf('#pragma unroll_loop_end', bas);
  expect(son).toBeGreaterThan(bas);
  return parca.slice(bas, son);
}

describe('dolguIsigiYamasi', () => {
  it('yönlü dolgu ışıklarını yalnız dağınık aydınlatmaya indirir', () => {
    const yamali = modul.dolguIsigiYamasi(ORIJINAL_PARCA);
    expect(yamali).not.toBe(ORIJINAL_PARCA);
    expect(yamali).toContain('dolguMalzeme');
    expect(yamali).toContain('UNROLLED_LOOP_INDEX > 0');

    // Yönlü ışık RE_Direct çağrısı dolguMalzeme ile yapılır
    const yonlu = yonluBolum(yamali);
    expect(yonlu).toContain('PhysicalMaterial dolguMalzeme = material;');
    expect(yonlu).toContain(YONLU_CAGRI_DOLGU);
    expect(yonlu).not.toContain(YONLU_CAGRI_MALZEME);

    // Nokta ve spot ışıkları özgün malzemeyle kalır
    const yonluOncesi = yamali.slice(0, yamali.indexOf('getDirectionalLightInfo( directionalLight, directLight );'));
    expect(yonluOncesi).toContain(YONLU_CAGRI_MALZEME);
    expect(yonluOncesi).not.toContain('dolguMalzeme');
  });

  it('idempotent: ikinci uygulama sonucu değiştirmez', () => {
    const bir = modul.dolguIsigiYamasi(ORIJINAL_PARCA);
    const iki = modul.dolguIsigiYamasi(bir);
    expect(iki).toBe(bir);
    expect(iki.split('PhysicalMaterial dolguMalzeme').length - 1).toBe(1);
  });

  it('desen eşleşmezse parçayı değiştirmeden döner', () => {
    const parca = 'void main() { gl_FragColor = vec4( 1.0 ); }';
    expect(modul.dolguIsigiYamasi(parca)).toBe(parca);
  });

  it('modülü içe aktarmak global ShaderChunk.lights_fragment_begin parçasını değiştirmez', () => {
    // Modül gerçekten yüklendi (motor sınıfı ve yama fonksiyonu erişilebilir)
    expect(modul.AdaSahnesi).toBeTypeOf('function');
    expect(THREE.ShaderChunk.lights_fragment_begin).toBe(ORIJINAL_PARCA);
    expect(THREE.ShaderChunk.lights_fragment_begin).not.toContain('dolguMalzeme');
  });
});

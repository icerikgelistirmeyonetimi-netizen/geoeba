import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/*
 * Kademe bir GÖRÜNÜM tercihidir (9 Ekim 2026): WorkspaceContext ilkokulken tüketicilere `objects` olarak
 * ilkokulGorunumu ile TÜRETİLMİŞ diziyi (adlar / ölçüler gizli), `kaynakNesneler` olarak gerçek diziyi verir.
 * Türetilmiş diziyi bütün hâliyle state'e geri yazan bir yol (komut motoru, sürükleme anlık görüntüsü, pano)
 * ilkokul bayraklarını gerçek veriye sızdırır ve kademe değişince adlar bir daha gelmez. Bu test o yolları kilitler.
 */

const KOK = path.resolve(__dirname, '..');
const oku = (gorece: string) => readFileSync(path.join(KOK, gorece), 'utf8');

describe('ilkokul görünümü gerçek veriye sızmaz', () => {
  it('WorkspaceContext görünümü yalnız value.objects\'e verir; gerçek dizi kaynakNesneler olarak da sunulur', () => {
    const kaynak = oku(path.join('..', '..', 'state', 'WorkspaceContext.tsx'));
    expect(kaynak).toContain('objects: gorunenNesneler,');
    expect(kaynak).toContain('kaynakNesneler: objects,');
    expect(kaynak).toMatch(/const gorunenNesneler = useMemo\(\(\) => \(ilkokul \? ilkokulGorunumu\(objects\) : objects\)/);
    // Oluşturma anında nesneye bayrak yazan eski sarmalayıcı geri gelmesin
    expect(kaynak).not.toContain('ilkokulYeniNesneleri');
    // Komut yolu testi: context kademe deposunu doğrudan değil, ilkokulKipi kancasıyla dinler
    expect(kaynak).toContain('useIlkokulKipindeMi()');
    expect(kaynak).not.toMatch(/useKademeDuzeyi/);
  });

  it('bütün diziyi geri yazan yollar gerçek nesneleri (kaynakNesneler) kullanır', () => {
    expect(oku('CommandPanel.tsx')).toMatch(/executeTurkishCommand\(raw, kaynakNesneler,/);
    expect(oku('AlgebraView.tsx')).toMatch(/executeTurkishCommand\(raw, kaynakNesneler,/);
    expect(oku('Canvas3D.tsx')).not.toMatch(/baslangicNesneleri: workspace\.objects\b/);
    expect(oku('Canvas3D.tsx')).toMatch(/baslangicNesneleri: workspace\.kaynakNesneler/);
    expect(oku('Canvas.tsx')).toMatch(/copyObjects\(kaynakNesneler,/);
    expect(oku('Canvas.tsx')).not.toMatch(/copyObjects\(objects,/);
  });

  it('ilkokulda görünümün gizlediği ölçüleri açan menü maddeleri sunulmaz (hayalet bayrak yok)', () => {
    const canvas = oku('Canvas.tsx');
    // Çember: alan / çevre / yarıçap maddeleri ilkokul dışında
    expect(canvas).toMatch(/if \(!ilkokul\) \{\s*\n\s*maddeler\.push\(\{ id: 'olc-alan', label: 'Alanını ölç', onSelect: \(\) => measureArea\(circ\.id\)/);
    // Çokgen: alan maddesi ilkokul dışında, çevre kalır
    expect(canvas).toMatch(/if \(!ilkokul\) maddeler\.push\(\{ id: 'olc-alan', label: 'Alanını ölç', separatorBefore: true, onSelect: \(\) => measureArea\(hedef\.id\)/);
  });
});

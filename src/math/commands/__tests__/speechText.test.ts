import { afterEach, describe, expect, it } from 'vitest';
import type { MathObject } from '@/types/math';
import { runCommand } from '../engine';
import { normalizeSpokenCommand } from '../speechText';
import { setUserFunctions } from '../../parser';

describe('normalizeSpokenCommand', () => {
  it.each([
    // harf adları ve etiketler
    ['a be ce üçgeninin alanını hesapla', 'ABC üçgeninin alanını hesapla'],
    ['A B C üçgeni çiz.', 'ABC üçgeni çiz'],
    ['be noktasından dik indir', 'B noktasından dik indir'],
    ["a be'nin orta noktasını bul", "AB'nin orta noktasını bul"],
    ['a be ce de karesini çiz', 'ABCD karesini çiz'],
    ['a ve be noktalarını birleştir', 'A ve B noktalarını birleştir'],
    ['a, be ve ce noktalarını sil', 'A, B ve C noktalarını sil'],
    ['a b c noktalarını oluştur', 'ABC noktalarını oluştur'],
    ['de noktası oluştur', 'D noktası oluştur'],
    ['orijine o noktası koy', 'orijine O noktası koy'],
    ['be açısının sin cos tan değerlerini hesapla', 'B açısının sin cos tan değerlerini hesapla'],
    ['a be eğimini ölç', 'AB eğimini ölç'],
    ['a ile be arasındaki mesafe kaç', 'A ile B arasındaki mesafe kaç'],
    ['a be ve ce de doğrularını çiz', 'AB ve CD doğrularını çiz'],
    // ekler
    ['a be nin uzunluğu ne kadar', "AB'nin uzunluğu ne kadar"],
    ['a be ce nin alanı kaç', "ABC'nin alanı kaç"],
    ['a be yi kalın yap', "AB'yi kalın yap"],
    ['a be cenin alanını hesapla', "ABC'nin alanını hesapla"],
    ['a benin orta noktasını bul', "AB'nin orta noktasını bul"],
    ['a dan be ye doğru parçası çiz', "A'dan B'ye doğru parçası çiz"],
    ['be den a ce ye dikme indir', "B'den AC'ye dikme indir"],
    // yeniden adlandırma ve kaydırıcı adları
    ['be noktasının adını pe yap', 'B noktasının adını P yap'],
    ['a noktasını pe olarak adlandır', 'A noktasını P olarak adlandır'],
    ['be kaydırıcısı oluştur', 'b kaydırıcısı oluştur'],
    // sayılar
    ['yarıçapı iki virgül beş olan çember çiz', 'yarıçapı 2,5 olan çember çiz'],
    ['yarıçapı 2 virgül 5 olan çember çiz', 'yarıçapı 2,5 olan çember çiz'],
    ['yarıçapı on iki virgül beş olan çember çiz', 'yarıçapı 12,5 olan çember çiz'],
    ['kenarları üç virgül dört ve beş olan üçgen çiz', 'kenarları 3, 4 ve 5 olan üçgen çiz'],
    ['a be doğru parçasını ikiye bir oranında böl', 'AB doğru parçasını 2:1 oranında böl'],
    // koordinatlar
    ['a iki üç noktasını oluştur', 'A(2; 3) noktasını oluştur'],
    ['a noktasını iki üç koordinatına koy', 'A noktasını (2; 3) koordinatına koy'],
    ['a sıfır sıfır be dört sıfır ce sıfır üç noktalarını oluştur', 'A(0; 0), B(4; 0) ve C(0; 3) noktalarını oluştur'],
    ['a noktası iki noktalı virgül üç', 'A noktası (2; 3)'],
    ['de noktası eksi iki virgül üç', 'D noktası (-2; 3)'],
    // eşittir ve fonksiyonlar
    ['f x eşittir x kare', 'f(x) = x kare'],
    ['f of x eşittir x küp', 'f(x) = x küp'],
    ['ge x eşittir sinüs x', 'g(x) = sinüs x'],
    ['y eşittir 2x artı 1', 'y = 2x artı 1'],
    ['a eşittir üç', 'a = 3'],
    ['ka eşittir iki', 'k = 2'],
    ['x eşittir üç doğrusunu çiz', 'x = 3 doğrusunu çiz'],
    ['x kare artı y kare eşittir on altı çemberini çiz', 'x kare artı y kare eşittir 16 çemberini çiz'],
    ['iks kare fonksiyonunu çiz', 'x kare fonksiyonunu çiz'],
    // dolgu sözcükleri, bitişik yazımlar, takılmalar
    ['ee şey üçgen çiz', 'üçgen çiz'],
    ['evet üçgen çiz', 'üçgen çiz'],
    ['hımm yarıçapı üç olan çember çiz', 'yarıçapı üç olan çember çiz'],
    ['yarıçapı 3 olan çemberçiz', 'yarıçapı 3 olan çember çiz'],
    ['AB doğruparçası çiz', 'AB doğru parçası çiz'],
    ['çem ber çiz', 'çember çiz'],
    ['dikdört gen çiz', 'dikdörtgen çiz'],
    ['a a noktası oluştur', 'A noktası oluştur'],
    // dokunulmaması gerekenler
    ['üçgen çiz', 'üçgen çiz'],
    ['o noktayı sil', 'o noktayı sil'],
    ['x kare fonksiyonu çiz', 'x kare fonksiyonu çiz'],
    ['ne kadar', 'ne kadar'],
    ['üçgeni de sil', 'üçgeni de sil'],
    ['bir üçgen çiz', 'bir üçgen çiz'],
    ['geri al geri al', 'geri al geri al'],
    // çap ve yarıçap harf dizisinden sonra gelir
    ['a be çaplı çember çiz', 'AB çaplı çember çiz'],
    ['a be yarıçaplı çember', 'AB yarıçaplı çember'],
    ['a merkezli a be yarıçaplı çember çiz', 'A merkezli AB yarıçaplı çember çiz'],
    ['merkezi a yarıçapı üç olan çember çiz', 'merkezi a yarıçapı üç olan çember çiz'],
    // "de", "e" köşe dizisinin başında: köşe sayısı çokgenle tutarsa
    ['de e fe üçgenini oluştur', 'DEF üçgenini oluştur'],
    ['de e fe ge dörtgeni çiz', 'DEFG dörtgeni çiz'],
    ['e fe ge üçgeni çiz', 'EFG üçgeni çiz'],
    ['a be ce üçgenini de e fe ge üçgenine taşı', 'ABC üçgenini de EFG üçgenine taşı'],
    ['üçgeni de a be ce üçgenini de sil', 'üçgeni de ABC üçgenini de sil'],
    ['çemberi de a doğrusunu sil', 'çemberi de a doğrusunu sil'],
    ['be de sil', "B'de sil"],
    ['üçgen çizme', 'üçgen çizme'],
    // eşittirden sonra ondalık sayı
    ['te eşittir sıfır virgül beş', 't = 0,5'],
    ['a eşittir iki virgül yirmi beş', 'a = 2,25'],
    ['a eşittir eksi sıfır virgül beş', 'a = -0,5'],
    ['x eşittir iki virgül beş doğrusunu çiz', 'x = 2,5 doğrusunu çiz'],
    // fonksiyon adı okunuşları
    ['ef x eşittir x kare', 'f(x) = x kare'],
    ['ge x eşittir x kare', 'g(x) = x kare'],
    ['ha x eşittir x kare', 'h(x) = x kare'],
    ['ref x eşittir x kare', 'ref x = x kare'],
    // fonksiyon değeri soruları
    ['f parantez beş kaç', 'f(5) kaç'],
    ['ef parantez aç eksi iki parantez kapat kaç', 'f(-2) kaç'],
    ['ge parantez içinde on iki nedir', 'g(12) nedir'],
    ['f(5) kaç', 'f(5) kaç'],
    ['ef in üçteki değeri nedir', "f'nin 3'teki değeri nedir"],
    ['genin ikideki değeri kaç', "g'nin 2'deki değeri kaç"],
    ["f'nin 3'teki değeri nedir", "f'nin 3'teki değeri nedir"],
    ['f nin beş için değeri nedir', "f'nin 5 için değeri nedir"],
    ['x eşittir iki iken f kaç', 'x = 2 iken f kaç'],
    ['x eşittir iki iken fe kaç', 'x = 2 iken f kaç'],
    ['x eşittir iki virgül beş iken ef x kaç', 'x = 2,5 iken f(x) kaç'],
    ['fe beş üç noktasını oluştur', 'F(5; 3) noktasını oluştur'],
    ['fe parantez beş üç', 'fe parantez beş üç'],
    ['hain üçteki değeri nedir', 'hain üçteki değeri nedir'],
    ['gün üçteki değeri nedir', 'gün üçteki değeri nedir'],
    ['hanın beşteki değeri kaç', "h'nin 5'teki değeri kaç"],
    ['fe noktasının adını ge yap', 'F noktasının adını G yap'],
    // teoremler ve klasik şekiller
    ['a be kirişini çiz', 'AB kirişini çiz'],
    ['de e fe öklid üçgeni çiz', 'DEF öklid üçgeni çiz'],
    ['a be ce üçgeninde öklid teoremini uygula', 'ABC üçgeninde öklid teoremini uygula'],
    ['pe noktasından çembere kesen çiz', 'P noktasından çembere kesen çiz'],
    ['pe noktasının çembere göre kuvvetini hesapla', 'P noktasının çembere göre kuvvetini hesapla'],
    ['a be çaplı tales çemberi çiz', 'AB çaplı tales çemberi çiz'],
    ['a be ce çevre açısını çiz', 'ABC çevre açısını çiz'],
    ['a daki teğet kiriş açısını çiz', "A'daki teğet kiriş açısını çiz"],
  ])('%s', (spoken, expected) => {
    expect(normalizeSpokenCommand(spoken)).toBe(expected);
  });
});

describe('konuşma metni komut motorunda uygulanır', () => {
  afterEach(() => setUserFunctions([]));
  const chain = (...texts: string[]) => texts.reduce<MathObject[]>((scene, text) => {
    const result = runCommand(text, scene);
    if (!result.ok) throw new Error(`${text}: ${result.message}`);
    return result.objects;
  }, []);
  const say = (spoken: string, scene: MathObject[] = []) => {
    const result = runCommand(normalizeSpokenCommand(spoken), scene);
    if (!result.ok) throw new Error(`${spoken}: ${result.message}`);
    return result;
  };

  it('a be çaplı / yarıçaplı çember', () => {
    const scene = chain('A(0,0)', 'B(4,0)');
    expect(say('a be çaplı çember çiz', scene).message).toContain('Çapı [AB] olan çember');
    expect(say('a be yarıçaplı çember', scene).message).toContain('yarıçapı |AB| = 4');
  });

  it('de e fe üçgeni ve de e fe ge dörtgeni', () => {
    expect(say('de e fe üçgenini oluştur').message).toContain('DEF üçgeni çizildi');
    expect(say('de e fe ge dörtgeni çiz').message).toContain('DEFG dörtgeni çizildi');
  });

  it('te eşittir sıfır virgül beş kaydırıcıya 0,5 atar', () => {
    expect(say('te eşittir sıfır virgül beş').objects.find(o => o.type === 'slider')).toMatchObject({ variableName: 't', value: 0.5 });
  });

  it('ef / ge / ha x eşittir … fonksiyon tanımlar', () => {
    expect(say('ef x eşittir x kare').message).toContain('f(x) = x^2');
    expect(say('ge x eşittir x kare').message).toContain('g(x) = x^2');
    expect(say('ha x eşittir x kare').message).toContain('h(x) = x^2');
  });

  it('fonksiyon değeri sözle sorulur', () => {
    const scene = chain('f(x) = x^2 + 1');
    expect(say('f parantez beş kaç', scene).message).toBe('f(5) = 26.');
    expect(say('ef in üçteki değeri nedir', scene).message).toBe('f(3) = 10.');
    expect(say('x eşittir iki iken f kaç', scene).message).toBe('f(2) = 5.');
    expect(say('x eşittir iki iken fe kaç', scene).message).toBe('f(2) = 5.');
    expect(say('f parantez beş kaç', scene).sceneChanged).toBe(false);
  });

  it('merkezi be de yarıçapı / çapı: "de" bulunma ekidir', () => {
    const scene = chain('A(0,0)', 'B(4,0)', 'C(0,3)', 'D(4,3)');
    expect(say('merkezi be de yarıçapı iki olan çember çiz', scene).message).toContain('Merkezi B, yarıçapı 2');
    expect(say('merkezi ce de çapı dört olan çember çiz', scene).message).toContain('Merkezi C, yarıçapı 2');
    expect(say('merkezi be de yarıçapı iki birim olan çember çiz', scene).message).toContain('Merkezi B, yarıçapı 2');
    expect(say('be de yarıçaplı çember çiz', scene).message).toContain('|BD| = 3');
  });

  it('fe/ge/ha parantez aç iki virgül üç: adlı nokta oluşturur', () => {
    expect(say('fe parantez aç iki virgül üç parantez kapat noktasını oluştur').message).toBe('F(2; 3) noktası oluşturuldu.');
    expect(say('ha parantez aç sıfır virgül beş parantez kapat noktasını koy').message).toBe('H(0; 5) noktası oluşturuldu.');
    expect(say('fe parantez aç iki virgül üç parantez kapat').message).toBe('F(2; 3) noktası oluşturuldu.');
    expect(say('F(2,3) noktasını oluştur').message).toBe('F(2; 3) noktası oluşturuldu.');
    expect(say('ge parantez aç iki virgül üç parantez kapat noktası', chain('f(x) = x^2 + 1')).message).toBe('G(2; 3) noktası oluşturuldu.');
  });

  it('yamuk ve sıfatlı üçgen adları', () => {
    expect(say('de e fe ge yamuğunu çiz').message).toContain('DEFG yamuğu çizildi');
    expect(say('de e fe ikizkenar üçgenini çiz').message).toContain('DEF ikizkenar üçgeni çizildi');
    expect(say('de e fe dik üçgenini çiz').message).toContain('DEF dik üçgeni çizildi');
    const points = chain('D(0,0)', 'E(4,0)', 'F(0,3)', 'G(4,3)');
    expect(say('de e fe noktalarını birleştir', points).message).toContain('[DE], [EF]');
    expect(runCommand(normalizeSpokenCommand('e a be ce karesini çiz'), []).ok).toBe(false);
  });

  it('fonksiyon değeri: "fonksiyonunun", "x eşittir … için", "ef x in", "x iki iken"', () => {
    const scene = chain('f(x) = x^2 + 1');
    expect(say('ef fonksiyonunun üçteki değeri nedir', scene).message).toBe('f(3) = 10.');
    expect(say('ef fonksiyonunun x eşittir üç için değeri nedir', scene).message).toBe('f(3) = 10.');
    expect(say('ef in x eşittir üç için değeri nedir', scene).message).toBe('f(3) = 10.');
    expect(say('ef x in üçteki değeri nedir', scene).message).toBe('f(3) = 10.');
    expect(say('x iki iken ef kaç', scene).message).toBe('f(2) = 5.');
  });

  it('tanım gövdesinde ondalık, fonksiyon çağrısı, ikinci tanım ve olumsuzluk', () => {
    expect(say('ef x eşittir sıfır virgül beş x kare').message).toContain('f(x) = 0,5 x^2');
    const composed = say('ge x eşittir ef x artı bir', chain('f(x) = x^2 + 1')).objects;
    expect(composed.some(o => o.type === 'slider')).toBe(false);
    expect(runCommand('g(2) kaç', composed)).toMatchObject({ ok: true, message: 'g(2) = 6.' });
    expect(say('ef x eşittir x kare ge x eşittir iki x').objects.filter(o => o.type === 'function')).toHaveLength(2);
    const negated = runCommand(normalizeSpokenCommand('ef x eşittir x kare çizme'), []);
    expect(negated.ok).toBe(false);
    expect(negated.message).toContain('Olumsuz');
  });

  it('çapı a be olan, te değeri, sıfır nokta beş, fe fonksiyonunu', () => {
    expect(say('çapı a be olan çember çiz', chain('A(0,0)', 'B(4,0)')).message).toContain('Çapı [AB] olan çember');
    expect(say('te değeri sıfır virgül beş olsun', chain('t = 1')).objects.find(o => o.type === 'slider')).toMatchObject({ variableName: 't', value: 0.5 });
    expect(say('te eşittir sıfır nokta beş').objects.find(o => o.type === 'slider')).toMatchObject({ variableName: 't', value: 0.5 });
    const colored = say('fe fonksiyonunu kırmızı yap', chain('f(x) = x^2', 'g(x) = sin(x)')).objects;
    expect(colored.find(o => o.type === 'function' && o.label.startsWith('f(x)'))).toMatchObject({ color: '#ef4444' });
  });
});

describe('normalizeSpokenCommand: onarım', () => {
  it.each([
    ['merkezi be de yarıçapı iki olan çember çiz', "merkezi B'de yarıçapı iki olan çember çiz"],
    ['merkezi ce de çapı dört olan çember çiz', "merkezi C'de çapı dört olan çember çiz"],
    ['be de yarıçaplı çember çiz', 'BD yarıçaplı çember çiz'],
    ['fe parantez aç iki virgül üç parantez kapat noktasını oluştur', 'F(2,3) noktasını oluştur'],
    ['fe parantez aç eksi iki virgül üç parantez kapat noktasını oluştur', 'F(-2,3) noktasını oluştur'],
    ['fe parantez aç bir virgül iki parantez kapat ve ge parantez aç üç virgül dört parantez kapat noktalarını oluştur', 'F(1,2) ve G(3,4) noktalarını oluştur'],
    ['fe parantez aç iki virgül üç parantez kapat', 'F(2,3)'],
    ['F(2,3) noktasını oluştur', 'F(2,3) noktasını oluştur'],
    ['G(1,5)', 'G(1,5)'],
    ['f parantez iki virgül beş kaç', 'f(2,5) kaç'],
    ['de e fe ge yamuğunu çiz', 'DEFG yamuğunu çiz'],
    ['de e fe ge yamuğu çiz', 'DEFG yamuğu çiz'],
    ['de e fe ikizkenar üçgenini çiz', 'DEF ikizkenar üçgenini çiz'],
    ['de e fe dik üçgenini çiz', 'DEF dik üçgenini çiz'],
    ['a be ce ikizkenar üçgeni çiz', 'ABC ikizkenar üçgeni çiz'],
    ['ef fonksiyonunun üçteki değeri nedir', "f'nin 3'teki değeri nedir"],
    ['ef fonksiyonunun x eşittir üç için değeri nedir', "f'nin 3 için değeri nedir"],
    ['ef in x eşittir üç için değeri nedir', "f'nin 3 için değeri nedir"],
    ['ef x in üçteki değeri nedir', "f'nin 3'teki değeri nedir"],
    ['x iki iken ef kaç', 'x = 2 iken f kaç'],
    ['ef x eşittir sıfır virgül beş x kare', 'f(x) = 0,5 x kare'],
    ['ef x eşittir iki virgül beş x kare', 'f(x) = 2,5 x kare'],
    ['ge x eşittir ef x artı bir', 'g(x) = f(x) artı bir'],
    ['ef x eşittir x kare ge x eşittir iki x', 'f(x) = x kare ve g(x) = iki x'],
    ['çapı a be olan çember çiz', 'çapı AB olan çember çiz'],
    ['yarıçapı a be olan çember çiz', 'yarıçapı AB olan çember çiz'],
    // duraksama "e" köşe sayılmaz; O (orijin) dizinin başında kalabilir
    ['e a be ce karesini çiz', 'e ABC karesini çiz'],
    ['e a be ce dörtgenini çiz', 'e ABC dörtgenini çiz'],
    ['o a be ce dörtgenini sil', 'OABC dörtgenini sil'],
    ['de e fe noktalarını birleştir', 'DEF noktalarını birleştir'],
    ['de e fe ge noktalarından dörtgen oluştur', 'DEFG noktalarından dörtgen oluştur'],
    ['te değeri sıfır virgül beş olsun', 't değeri 0,5 olsun'],
    ['te eşittir sıfır nokta beş', 't = 0,5'],
    ['fe fonksiyonunu kırmızı yap', 'f fonksiyonunu kırmızı yap'],
  ])('%s', (spoken, expected) => {
    expect(normalizeSpokenCommand(spoken)).toBe(expected);
  });
});

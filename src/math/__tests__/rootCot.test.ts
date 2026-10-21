import { afterEach, describe, expect, it } from 'vitest';
import { compileMathExpression, extractVariableNames, getUserFunctions, isUserFunctionNameAllowed, setUserFunctions, validateMathExpression } from '../parser';
import { functionDefinitionCycle, undefinedFunctionCalls } from '../functionNames';

const savedFunctions = getUserFunctions();
afterEach(() => setUserFunctions(savedFunctions));

function value(expression: string, x = 0, scope: Record<string, number> = {}) {
  const fn = compileMathExpression(expression);
  expect(fn, expression).not.toBeNull();
  return fn!(x, scope);
}

describe('İstenen dereceden gerçek kök', () => {
  it.each([
    ['root(16,2)', 4], ['root(81,4)', 3], ['root(32,5)', 2],
    ['root(-8,3)', -2], ['root(-32,5)', -2], ['root(-17,1)', -17],
    ['root(0,9)', 0], ['root(0.125,3)', 0.5], ['root(0,125;3)', 0.5],
    ['root(root(4096,3),2)', 4], ['2root(27,3) + 1', 7], ['1e3root(8,3)', 2000],
  ])('%s = %s', (expression, expected) => {
    expect(value(expression)).toBeCloseTo(expected, 12);
  });

  it.each(['root(-16,2)', 'root(-16,4)', 'root(16,0)', 'root(16,-2)', 'root(16,1.5)', 'root(16,1/0)', 'root(16,exp(1000))'])('%s gerçek sayı sonucu üretmez', expression => {
    expect(value(expression)).toBeNaN();
  });

  it('derece ve kök içindeki kaydırıcıları belirler ve değerleri yeniden hesaplar', () => {
    expect(extractVariableNames('a*root(x,n)')).toEqual(['a', 'n']);
    expect(value('a*root(x,n)', -32, { a: 3, n: 5 })).toBeCloseTo(-6, 12);
    expect(value('root(x,n)', -32, { n: 4 })).toBeNaN();
  });

  it.each(['root(x)', 'root(x,2,3)', 'root(,3)', 'root(x,)'])('%s eksik ya da fazla argümanla kabul edilmez', expression => {
    expect(validateMathExpression(expression).ok).toBe(false);
  });
});

describe('Kotanjant', () => {
  it.each([
    ['cot(pi/4)', 1], ['cot(-pi/4)', -1], ['cot(pi/2)', 0],
    ['cotd(45)', 1], ['cotd(-45)', -1], ['cotd(90)', 0],
    ['2cot(pi/4)', 2],
  ])('%s = %s', (expression, expected) => {
    expect(value(expression)).toBeCloseTo(expected, 12);
  });

  it.each(['cot(0)', 'cot(pi)', 'cot(-pi)', 'cot(3*pi)', 'cot(11*pi)', 'cotd(0)', 'cotd(180)', 'cotd(-360)'])('%s kutup noktasında tanımsızdır', expression => {
    expect(value(expression)).toBeNaN();
  });

  it('kutuplara yakın ama tanımlı noktaları kaldırmaz', () => {
    const fn = compileMathExpression('cot(x)')!;
    expect(fn(1e-10)).toBeGreaterThan(1e9);
    expect(fn(-1e-10)).toBeLessThan(-1e9);
  });

  it('kullanıcı fonksiyonları içinde kök ve kotanjant birlikte çalışır', () => {
    setUserFunctions([['f', 'root(x,3)'], ['g', 'cot(x)'], ['h', 'f(x)+g(pi/4)']]);
    expect(value('h(x)', -8)).toBeCloseTo(-1, 12);
    expect(extractVariableNames('a*root(x,n)+cot(b*x)+cotd(x)')).toEqual(['a', 'n', 'b']);
    expect(undefinedFunctionCalls([], 'root(x,3)+cot(x)+cotd(x)')).toEqual([]);
    expect(functionDefinitionCycle([], 'f', 'root(x,3)+cot(x)')).toBeNull();
    for (const name of ['root', 'cot', 'cotd']) expect(isUserFunctionNameAllowed(name)).toBe(false);
  });
});

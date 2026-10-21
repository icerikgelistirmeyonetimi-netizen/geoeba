import { describe, expect, it } from 'vitest';
import { compileMathExpression } from '@/math/parser';
import { handlers } from '../handlers/algebra';
import { byType, expectOk } from './helpers';

describe('Kök ve kotanjant komut uyumu', () => {
  it.each([
    ['f(x) = root(x,3)', -8, -2],
    ['f(x) = 2root(x,4)', 81, 6],
    ['f(x) = cot(x)', Math.PI / 4, 1],
    ['f(x) = cotd(x)', 45, 1],
  ])('%s', (command, x, expected) => {
    const { objects } = expectOk(handlers, command);
    const fn = byType(objects, 'function')[0];
    expect(fn).toBeDefined();
    expect(compileMathExpression(fn.expression)!(x)).toBeCloseTo(expected, 10);
    expect(byType(objects, 'slider')).toHaveLength(0);
  });

  it.each([['a = root(81,4)', 3], ['a = cotd(45)', 1]])('%s', (command, expected) => {
    const { objects } = expectOk(handlers, command);
    expect(byType(objects, 'slider')[0]?.value).toBeCloseTo(expected, 10);
  });
});

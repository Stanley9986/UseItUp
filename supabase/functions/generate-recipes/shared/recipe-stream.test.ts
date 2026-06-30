import { describe, expect, it } from 'vitest';

import { createRecipeStreamParser } from './recipe-stream';

describe('createRecipeStreamParser', () => {
  it('emits each recipe object as its closing brace arrives', () => {
    const parser = createRecipeStreamParser();

    expect(parser.push('{"recipes":[')).toEqual([]);
    expect(parser.push('{"title":"A","ingredients":[{"name":"x"}]}')).toEqual([
      { title: 'A', ingredients: [{ name: 'x' }] },
    ]);
    expect(parser.push(',{"title":"B"}')).toEqual([{ title: 'B' }]);
    expect(parser.push(']}')).toEqual([]);
    expect(parser.isComplete()).toBe(true);
  });

  it('waits for an object split across chunks', () => {
    const parser = createRecipeStreamParser();

    expect(parser.push('{"recipes":[{"title":"Hel')).toEqual([]);
    expect(parser.push('lo"}')).toEqual([{ title: 'Hello' }]);
  });

  it('ignores braces and commas inside strings and escaped quotes', () => {
    const parser = createRecipeStreamParser();

    parser.push('{"recipes":[');

    expect(parser.push('{"title":"a, b } c","note":"say \\"hi\\""}')).toEqual([
      { title: 'a, b } c', note: 'say "hi"' },
    ]);
  });

  it('emits multiple completed objects from a single chunk', () => {
    const parser = createRecipeStreamParser();

    expect(parser.push('{"recipes":[{"title":"A"},{"title":"B"},{"title":"C"}]}')).toEqual([
      { title: 'A' },
      { title: 'B' },
      { title: 'C' },
    ]);
    expect(parser.isComplete()).toBe(true);
  });
});

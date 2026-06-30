import { describe, expect, it } from 'vitest';

import { createLineBuffer } from '@/lib/recipes/ndjson';

describe('createLineBuffer', () => {
  it('splits complete newline-delimited lines', () => {
    const buffer = createLineBuffer();

    expect(buffer.push('{"a":1}\n{"b":2}\n')).toEqual(['{"a":1}', '{"b":2}']);
  });

  it('holds a partial line until its newline arrives', () => {
    const buffer = createLineBuffer();

    expect(buffer.push('{"c":')).toEqual([]);
    expect(buffer.push('3}\n')).toEqual(['{"c":3}']);
  });

  it('returns a trailing line without a newline on flush', () => {
    const buffer = createLineBuffer();

    expect(buffer.push('{"x":1}')).toEqual([]);
    expect(buffer.flush()).toEqual(['{"x":1}']);
    expect(buffer.flush()).toEqual([]);
  });

  it('skips blank lines', () => {
    const buffer = createLineBuffer();

    expect(buffer.push('\n\n{"a":1}\n\n')).toEqual(['{"a":1}']);
  });
});

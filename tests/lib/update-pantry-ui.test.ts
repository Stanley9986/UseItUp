import { describe, expect, it } from 'vitest';

import { choiceToKey, keyToChoice } from '@/lib/pantry/update-pantry-ui';

describe('update pantry choice helpers', () => {
  it('maps update choice objects to chip keys', () => {
    expect(choiceToKey({ type: 'suggested' })).toBe('suggested');
    expect(choiceToKey({ level: 'low', type: 'setLevel' })).toBe('low');
  });

  it('maps chip keys back to update choices', () => {
    expect(keyToChoice('skip')).toEqual({ type: 'skip' });
    expect(keyToChoice('less')).toEqual({ amount: 0.5, type: 'less' });
    expect(keyToChoice('empty')).toEqual({ level: 'empty', type: 'setLevel' });
  });
});

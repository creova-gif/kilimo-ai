import { normalizePhone } from '../lib/phone';

describe('normalizePhone (Tanzania-first E.164)', () => {
  it.each([
    ['712345678', '+255712345678'],
    ['0712345678', '+255712345678'],
    ['0712 345 678', '+255712345678'],
    ['712-345-678', '+255712345678'],
    ['255712345678', '+255712345678'],
    ['+255 712 345 678', '+255712345678'],
    ['(0)712345678', '+255712345678'],
    ['0255712345678'.slice(1), '+255712345678'],
    ['700000001', '+255700000001'],
    ['0655123456', '+255655123456'],
  ])('%s -> %s', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it('keeps an already-international number from another country', () => {
    expect(normalizePhone('+254712345678')).toBe('+254712345678');
    expect(normalizePhone('00254712345678')).toBe('+254712345678');
  });

  it.each(['', '   ', 'abc', '12', '71234567', '07123456789', '+', '++255712345678'])(
    'rejects invalid input %p',
    (input) => {
      expect(normalizePhone(input)).toBeNull();
    }
  );

  it('never returns a number without a leading +', () => {
    for (const n of ['712345678', '0712345678', '255712345678']) {
      expect(normalizePhone(n)!.startsWith('+')).toBe(true);
    }
  });
});

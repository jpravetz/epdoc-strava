import { isString } from "epdoc-util";

describe('auth', () => {
  describe('auth', () => {
    const obj = {
      a: 'b',
      c: 'd',
      e: 4,
    };

    it('isString', () => {
      expect(isString('string')).toBe(true);
      expect(t({ a: 'string' }).property('a').isString()).toBe(true);
      expect(
        t({ a: { b: 'string' } })
          .prop('a.b')
          .isString()
      ).toBe(true);
      expect(
        t({ a: { b: 'string' } })
          .property('a.c')
          .isString()
      ).toBe(false);
      expect(isString(4)).toBe(false);
    });
  });
});

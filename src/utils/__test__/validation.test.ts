import { safeGet } from '../validation';

describe('safeGet', () => {
  it('returns the value if defined', () => {
    expect(safeGet(42, 'answer')).toBe(42);
    expect(safeGet('hello', 'greeting')).toBe('hello');
    expect(safeGet(false, 'flag')).toBe(false);
  });

  it('throws an error if value is undefined', () => {
    expect(() => safeGet(undefined, 'missingField')).toThrow(
      'Missing required field: "missingField"'
    );
  });

  it('throws an error if value is null', () => {
    expect(() => safeGet(null, 'missingField')).toThrow(
      'Missing required field: "missingField"'
    );
  });
});
import { describe, it, expect } from 'vitest';

describe('Basic Utility Tests', () => {
  it('performs basic math operations', () => {
    expect(2 + 2).toBe(4);
    expect(10 - 5).toBe(5);
    expect(3 * 4).toBe(12);
    expect(10 / 2).toBe(5);
  });

  it('handles string operations', () => {
    const str = 'hello world';
    expect(str.toUpperCase()).toBe('HELLO WORLD');
    expect(str.length).toBe(11);
  });

  it('handles array operations', () => {
    const arr = [1, 2, 3, 4, 5];
    expect(arr.length).toBe(5);
    expect(arr[0]).toBe(1);
    expect(arr.includes(3)).toBe(true);
  });

  it('handles object operations', () => {
    const obj = { name: 'Test', value: 42 };
    expect(obj.name).toBe('Test');
    expect(obj.value).toBe(42);
    expect(Object.keys(obj).length).toBe(2);
  });
});

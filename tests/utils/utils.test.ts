import { describe, it, expect } from 'vitest';
import { cn } from '../../src/components/ui/utils';

describe('cn utility function', () => {
  it('merges class names', () => {
    const result = cn('px-2', 'py-1');
    expect(result).toContain('px-2');
    expect(result).toContain('py-1');
  });

  it('handles conditional classes', () => {
    const result = cn('px-2', false && 'py-1', true && 'mx-1');
    expect(result).toContain('px-2');
    expect(result).toContain('mx-1');
    expect(result).not.toContain('py-1');
  });

  it('merges tailwind utilities correctly', () => {
    const result = cn('px-2 py-1', 'px-4');
    expect(result).toContain('px-4');
    expect(result).toContain('py-1');
  });

  it('handles empty inputs', () => {
    const result = cn('');
    expect(typeof result).toBe('string');
  });

  it('combines multiple inputs', () => {
    const result = cn('text-lg', 'font-bold', 'text-red-500');
    expect(result).toContain('text-lg');
    expect(result).toContain('font-bold');
    expect(result).toContain('text-red-500');
  });
});

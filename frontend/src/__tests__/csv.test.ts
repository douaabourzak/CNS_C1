import { describe, it, expect } from 'vitest';
import { toCSV } from '@/lib/csv';

describe('toCSV', () => {
  it('produces a header row followed by data rows in column order', () => {
    const result = toCSV(
      [{ name: 'Alice', score: 95 }, { name: 'Bob', score: 80 }],
      [
        { key: 'name', header: 'Name' },
        { key: 'score', header: 'Score' },
      ],
    );
    const lines = result.split('\n');
    expect(lines[0]).toBe('Name,Score');
    expect(lines[1]).toBe('Alice,95');
    expect(lines[2]).toBe('Bob,80');
  });

  it('wraps values containing commas in double quotes', () => {
    const result = toCSV(
      [{ label: 'Maths, Physics' }],
      [{ key: 'label', header: 'Subject' }],
    );
    expect(result).toContain('"Maths, Physics"');
  });

  it('escapes embedded double-quotes by doubling them', () => {
    const result = toCSV(
      [{ note: 'He said "hello"' }],
      [{ key: 'note', header: 'Note' }],
    );
    expect(result).toContain('"He said ""hello"""');
  });

  it('renders null / undefined cells as empty strings', () => {
    const result = toCSV(
      [{ val: null as unknown as string }],
      [{ key: 'val', header: 'Val' }],
    );
    const lines = result.split('\n');
    expect(lines[1]).toBe('');
  });

  it('returns only the header line when rows array is empty', () => {
    const result = toCSV([], [{ key: 'x' as never, header: 'X' }]);
    expect(result).toBe('X\n');
  });
});

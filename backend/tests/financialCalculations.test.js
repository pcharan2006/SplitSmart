const { allocate, computeSplits, percentToBasisPoints } = require('../src/utils/financialCalculations');

const sum = (arr) => arr.reduce((a, b) => a + b, 0);
const shares = (r) => r.map((s) => s.share_amount);

describe('allocate (largest remainder)', () => {
  test('₹100 across 3 -> 33.34 / 33.33 / 33.33', () => {
    expect(allocate(10000, [1, 1, 1])).toEqual([3334, 3333, 3333]);
  });
  test('always sums exactly to the total, for many totals and weights', () => {
    for (let total = 1; total <= 500; total++) {
      for (const w of [[1, 1], [1, 1, 1], [1, 2, 3], [7, 11, 13, 17], [3333, 3333, 3334]]) {
        expect(sum(allocate(total, w))).toBe(total);
      }
    }
  });
  test('1 paisa among 3 people goes to the first', () => {
    expect(allocate(1, [1, 1, 1])).toEqual([1, 0, 0]);
  });
  test('huge amounts do not lose precision', () => {
    const r = allocate(99999999999, [1, 1, 1]);
    expect(sum(r)).toBe(99999999999);
  });
});

describe('computeSplits', () => {
  const p = (...vals) => vals.map((value, i) => ({ user_id: i + 1, value }));

  test('equal split', () => {
    const r = computeSplits({ splitType: 'equal', amount: 10000, participants: p(null, null, null) });
    expect(shares(r)).toEqual([3334, 3333, 3333]);
  });

  test('exact split must match total', () => {
    const ok = computeSplits({ splitType: 'exact', amount: 10000, participants: p(2500, 7500) });
    expect(shares(ok)).toEqual([2500, 7500]);
    expect(() => computeSplits({ splitType: 'exact', amount: 10000, participants: p(2500, 7400) })).toThrow(/add up/);
    expect(() => computeSplits({ splitType: 'exact', amount: 10000, participants: p(10000.5, 0) })).toThrow();
  });

  test('percentage split: 50/30/20 and 33.33/33.33/33.34', () => {
    expect(shares(computeSplits({ splitType: 'percentage', amount: 20000, participants: p(50, 30, 20) }))).toEqual([10000, 6000, 4000]);
    const r = computeSplits({ splitType: 'percentage', amount: 10000, participants: p(33.33, 33.33, 33.34) });
    expect(sum(shares(r))).toBe(10000);
    expect(shares(r)).toEqual([3333, 3333, 3334]);
  });

  test('percentage must total exactly 100 and have <= 2 decimals', () => {
    expect(() => computeSplits({ splitType: 'percentage', amount: 10000, participants: p(50, 40) })).toThrow(/100%/);
    expect(() => computeSplits({ splitType: 'percentage', amount: 10000, participants: p(33.333, 66.667) })).toThrow(/decimal/);
    expect(percentToBasisPoints('12.5')).toBe(1250);
  });

  test('share-based split: 1:2:3 of ₹600', () => {
    expect(shares(computeSplits({ splitType: 'shares', amount: 60000, participants: p(1, 2, 3) }))).toEqual([10000, 20000, 30000]);
    expect(() => computeSplits({ splitType: 'shares', amount: 100, participants: p(1, 0) })).toThrow();
    expect(() => computeSplits({ splitType: 'shares', amount: 100, participants: p(1, 1.5) })).toThrow();
  });

  test('rejects bad input', () => {
    expect(() => computeSplits({ splitType: 'equal', amount: 0, participants: p(null) })).toThrow();
    expect(() => computeSplits({ splitType: 'equal', amount: 100.5, participants: p(null) })).toThrow();
    expect(() => computeSplits({ splitType: 'equal', amount: 100, participants: [] })).toThrow();
    expect(() => computeSplits({ splitType: 'equal', amount: 100, participants: [{ user_id: 1 }, { user_id: 1 }] })).toThrow(/once/);
    expect(() => computeSplits({ splitType: 'weird', amount: 100, participants: p(null) })).toThrow();
  });
});

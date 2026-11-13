import { describe, expect, it } from 'vitest';
import { DwellTracker } from '../../src/ar/dwell';

/** n Schritte à dtMs mit demselben Ziel; liefert den letzten Zustand und alle completedIds */
function run(tracker: DwellTracker, id: string | null, steps: number, dt = 100) {
  const completed: string[] = [];
  let last = { targetId: null as string | null, progress: 0, completedId: null as string | null };
  for (let i = 0; i < steps; i++) {
    last = tracker.update(id, dt);
    if (last.completedId) completed.push(last.completedId);
  }
  return { last, completed };
}

describe('DwellTracker', () => {
  it('läuft mit dem Anvisieren und löst nach der Dauer aus', () => {
    const tracker = new DwellTracker(1500, 150);
    const half = run(tracker, 'a', 7);
    expect(half.last.targetId).toBe('a');
    expect(half.last.progress).toBeCloseTo(700 / 1500);
    expect(half.completed).toEqual([]);
    const rest = run(tracker, 'a', 8);
    expect(rest.completed).toEqual(['a']);
    expect(rest.last.progress).toBe(0);
  });

  it('pausiert bei kurzem Verlassen (bis graceMs) ohne Reset', () => {
    const tracker = new DwellTracker(1500, 150);
    run(tracker, 'a', 5); // 500 ms
    const away = tracker.update(null, 100);
    expect(away.targetId).toBe('a');
    expect(away.progress).toBeCloseTo(500 / 1500);
    const back = tracker.update('a', 100);
    expect(back.progress).toBeCloseTo(600 / 1500);
  });

  it('setzt zurück, wenn das Ziel länger als graceMs verlassen wird', () => {
    const tracker = new DwellTracker(1500, 150);
    run(tracker, 'a', 5);
    tracker.update(null, 100);
    const gone = tracker.update(null, 100); // 200 ms > 150 ms
    expect(gone.targetId).toBeNull();
    expect(gone.progress).toBe(0);
    expect(tracker.update('a', 100).progress).toBeCloseTo(100 / 1500);
  });

  it('startet bei einem anderen Ziel sofort neu', () => {
    const tracker = new DwellTracker(1500, 150);
    run(tracker, 'a', 5);
    const next = tracker.update('b', 100);
    expect(next.targetId).toBe('b');
    expect(next.progress).toBeCloseTo(100 / 1500);
  });

  it('löst genau einmal aus und sperrt das Ziel bis zum Verlassen', () => {
    const tracker = new DwellTracker(1500, 150);
    const first = run(tracker, 'a', 40);
    expect(first.completed).toEqual(['a']);
    expect(first.last.progress).toBe(0);
    expect(first.last.targetId).toBeNull();

    // kurzes Verlassen (≤ graceMs) entsperrt noch nicht
    tracker.update(null, 100);
    expect(run(tracker, 'a', 40).completed).toEqual([]);

    // längeres Verlassen entsperrt
    run(tracker, null, 3);
    expect(run(tracker, 'a', 16).completed).toEqual(['a']);
  });

  it('entsperrt auch, wenn zwischendurch ein anderes Ziel anvisiert wird', () => {
    const tracker = new DwellTracker(1500, 150);
    run(tracker, 'a', 16);
    run(tracker, 'b', 3);
    expect(run(tracker, 'a', 16).completed).toEqual(['a']);
  });

  it('kappt dtMs auf 100', () => {
    const tracker = new DwellTracker(1500, 150);
    const s = tracker.update('a', 5000);
    expect(s.completedId).toBeNull();
    expect(s.progress).toBeCloseTo(100 / 1500);
  });

  it('reset() setzt Fortschritt und Sperre zurück', () => {
    const tracker = new DwellTracker(1500, 150);
    run(tracker, 'a', 16);
    tracker.reset();
    expect(run(tracker, 'a', 16).completed).toEqual(['a']);
  });
});

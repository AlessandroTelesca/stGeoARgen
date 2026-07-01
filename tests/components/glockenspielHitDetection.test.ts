import { describe, expect, it } from 'vitest';
import { findNearestBellHit, findNearestVisibleBellHit, getBellColliderRadius } from '../../src/components/ARComponents/glockenspiel/hitDetection';

describe('findNearestBellHit', () => {
  it('prefers the closest bell hit even when other geometry is closer', () => {
    const intersections = [
      { object: { name: 'tower' }, distance: 0.3 },
      { object: { name: 'bell_3' }, distance: 0.8 },
      { object: { name: 'bell_12' }, distance: 1.1 },
    ];

    const hit = findNearestBellHit(intersections, (object) => {
      const match = object.name?.match(/bell_(\d+)/);
      return match ? Number(match[1]) : null;
    });

    expect(hit).toMatchObject({ bellIndex: 3, distance: 0.8 });
  });

  it('returns null when no bell hits are present', () => {
    const intersections = [{ object: { name: 'tower' }, distance: 0.3 }];

    const hit = findNearestBellHit(intersections, () => null);

    expect(hit).toBeNull();
  });

  it('uses a tighter collider radius for bell meshes', () => {
    const radius = getBellColliderRadius({ x: 0.8, y: 0.4, z: 0.3 });

    expect(radius).toBeLessThan(0.8);
    expect(radius).toBeGreaterThan(0.1);
  });

  it('ignores bell hits when a closer non-bell mesh blocks the view', () => {
    const intersections = [
      { object: { name: 'column' }, distance: 0.2 },
      { object: { name: 'bell_4' }, distance: 0.5 },
    ];

    const hit = findNearestVisibleBellHit(intersections, (object) => {
      const match = object.name?.match(/bell_(\d+)/);
      return match ? Number(match[1]) : null;
    });

    expect(hit).toBeNull();
  });
});

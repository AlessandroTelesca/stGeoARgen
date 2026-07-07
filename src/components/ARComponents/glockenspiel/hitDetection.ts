export interface RaycastHitLike<T = unknown> {
  distance: number;
  object: T;
}

export interface BellRayHit<T = unknown> extends RaycastHitLike<T> {
  bellIndex: number;
}

export interface BellColliderSize {
  x: number;
  y: number;
  z: number;
}

export function getBellColliderRadius(size: BellColliderSize): number {
  const maxDimension = Math.max(size.x, size.y, size.z);
  const minDimension = Math.min(size.x, size.y, size.z);
  const averageDimension = (maxDimension + minDimension) / 2;

  return Math.max(0.06, Math.min(maxDimension * 0.3, averageDimension * 0.6));
}

export function findNearestBellHit<T>(
  intersections: RaycastHitLike<T>[],
  getBellIndex: (object: T) => number | null,
): BellRayHit<T> | null {
  const bellHits = intersections
    .map((intersection) => ({
      ...intersection,
      bellIndex: getBellIndex(intersection.object),
    }))
    .filter((intersection): intersection is BellRayHit<T> => intersection.bellIndex !== null)
    .sort((a, b) => a.distance - b.distance);

  return bellHits[0] ?? null;
}

export function findNearestVisibleBellHit<T>(
  intersections: RaycastHitLike<T>[],
  getBellIndex: (object: T) => number | null,
): BellRayHit<T> | null {
  for (const intersection of intersections) {
    const bellIndex = getBellIndex(intersection.object);
    if (bellIndex !== null) {
      return {
        ...intersection,
        bellIndex,
      };
    }

    return null;
  }

  return null;
}

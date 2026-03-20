export interface Point {
  x: number;
  y: number;
}

/**
 * Convert an array of points into an SVG path string using Catmull-Rom spline
 * interpolation (converted to cubic beziers). The curve passes through every point.
 *
 * With fewer than 2 points, returns an empty string.
 * With exactly 2 points, returns a straight line.
 */
export function catmullRomToSvgPath(points: Point[], tension: number = 1): string {
  if (points.length < 2) return '';
  if (points.length === 2) {
    return `M ${points[0].x},${points[0].y} L ${points[1].x},${points[1].y}`;
  }

  const alpha = 1 / (6 * tension);
  let d = `M ${points[0].x},${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : points.length - 1];

    const cp1x = p1.x + (p2.x - p0.x) * alpha;
    const cp1y = p1.y + (p2.y - p0.y) * alpha;
    const cp2x = p2.x - (p3.x - p1.x) * alpha;
    const cp2y = p2.y - (p3.y - p1.y) * alpha;

    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }

  return d;
}

/**
 * Evaluate a point on the Catmull-Rom spline at parameter t in [0, 1].
 */
export function pointOnSpline(points: Point[], t: number): Point {
  if (points.length < 2) return points[0] ?? { x: 0, y: 0 };
  if (points.length === 2) {
    return {
      x: points[0].x + (points[1].x - points[0].x) * t,
      y: points[0].y + (points[1].y - points[0].y) * t,
    };
  }

  const totalSegments = points.length - 1;
  const scaledT = t * totalSegments;
  const segIdx = Math.min(Math.floor(scaledT), totalSegments - 1);
  const localT = scaledT - segIdx;

  return evaluateCubicBezierOnSegment(points, segIdx, localT);
}

function evaluateCubicBezierOnSegment(points: Point[], segIdx: number, t: number): Point {
  const alpha = 1 / 6; // tension = 1
  const p0 = points[segIdx === 0 ? 0 : segIdx - 1];
  const p1 = points[segIdx];
  const p2 = points[segIdx + 1];
  const p3 = points[segIdx + 2 < points.length ? segIdx + 2 : points.length - 1];

  const cp1 = { x: p1.x + (p2.x - p0.x) * alpha, y: p1.y + (p2.y - p0.y) * alpha };
  const cp2 = { x: p2.x - (p3.x - p1.x) * alpha, y: p2.y - (p3.y - p1.y) * alpha };

  // de Casteljau evaluation of cubic bezier (p1, cp1, cp2, p2)
  const omt = 1 - t;
  return {
    x: omt * omt * omt * p1.x + 3 * omt * omt * t * cp1.x + 3 * omt * t * t * cp2.x + t * t * t * p2.x,
    y: omt * omt * omt * p1.y + 3 * omt * omt * t * cp1.y + 3 * omt * t * t * cp2.y + t * t * t * p2.y,
  };
}

/**
 * Find the segment of the spline closest to a given point.
 * Returns the segment index (in the allPoints array) and the closest point on the curve.
 * segment index i means the segment between allPoints[i] and allPoints[i+1].
 */
export function findNearestSegment(
  points: Point[],
  px: number,
  py: number,
): { segmentIndex: number; point: Point; distance: number } {
  if (points.length < 2) {
    return { segmentIndex: 0, point: points[0] ?? { x: px, y: py }, distance: Infinity };
  }

  const samplesPerSegment = 30;
  let bestDist = Infinity;
  let bestSegment = 0;
  let bestPoint: Point = points[0];

  for (let seg = 0; seg < points.length - 1; seg++) {
    for (let s = 0; s <= samplesPerSegment; s++) {
      const t = s / samplesPerSegment;
      const pt = points.length === 2
        ? { x: points[0].x + (points[1].x - points[0].x) * t, y: points[0].y + (points[1].y - points[0].y) * t }
        : evaluateCubicBezierOnSegment(points, seg, t);
      const dx = pt.x - px;
      const dy = pt.y - py;
      const dist = dx * dx + dy * dy;
      if (dist < bestDist) {
        bestDist = dist;
        bestSegment = seg;
        bestPoint = pt;
      }
    }
  }

  return { segmentIndex: bestSegment, point: bestPoint, distance: Math.sqrt(bestDist) };
}

import type { Node } from '@xyflow/react';
import type { NeuronNodeData } from '../types';

/**
 * Arrow polygon vertices relative to node center (0,0).
 * Indent depth = halfW / 4 = nodeWidth / 8.
 */
export function arrowVertices(halfW: number, halfH: number): { x: number; y: number }[] {
  const indent = halfW / 4;
  return [
    { x: -halfW, y: -halfH },
    { x: halfW, y: -halfH },
    { x: halfW + indent, y: 0 },
    { x: halfW, y: halfH },
    { x: -halfW, y: halfH },
    { x: -halfW + indent, y: 0 },
  ];
}

/**
 * Offset (inset/outset) a clockwise polygon.
 * Positive offset = inset (shrink), negative = outset (expand).
 * Caps vertex movement to 3x |offset| to prevent extreme expansion at acute angles.
 */
export function offsetPolygon(
  verts: { x: number; y: number }[],
  offset: number,
): { x: number; y: number }[] {
  const n = verts.length;
  const edges: { px: number; py: number; dx: number; dy: number }[] = [];
  for (let i = 0; i < n; i++) {
    const a = verts[i];
    const b = verts[(i + 1) % n];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    const nx = -dy / len;
    const ny = dx / len;
    edges.push({ px: a.x + offset * nx, py: a.y + offset * ny, dx, dy });
  }
  const result: { x: number; y: number }[] = [];
  const maxMove = Math.abs(offset) * 3;
  for (let i = 0; i < n; i++) {
    const e1 = edges[(i - 1 + n) % n];
    const e2 = edges[i];
    const det = e1.dx * e2.dy - e1.dy * e2.dx;
    let px: number, py: number;
    if (Math.abs(det) < 1e-9) {
      px = (e1.px + e2.px) / 2;
      py = (e1.py + e2.py) / 2;
    } else {
      const t = ((e2.px - e1.px) * e2.dy - (e2.py - e1.py) * e2.dx) / det;
      px = e1.px + t * e1.dx;
      py = e1.py + t * e1.dy;
    }
    const orig = verts[i];
    const dist = Math.hypot(px - orig.x, py - orig.y);
    if (dist > maxMove) {
      const s = maxMove / dist;
      result.push({ x: orig.x + (px - orig.x) * s, y: orig.y + (py - orig.y) * s });
    } else {
      result.push({ x: px, y: py });
    }
  }
  return result;
}

function raySegmentIntersect(
  cosA: number, sinA: number,
  ax: number, ay: number, bx: number, by: number,
): number | null {
  const dx = bx - ax;
  const dy = by - ay;
  const det = dx * sinA - dy * cosA;
  if (Math.abs(det) < 1e-9) return null;
  const t = (dx * ay - dy * ax) / det;
  const s = (cosA * ay - sinA * ax) / det;
  if (t > 0 && s >= 0 && s <= 1) return t;
  return null;
}

/**
 * Given a node's geometry and an attachment angle (degrees, 0=right, 90=down),
 * return the point on the node border in flow coordinates.
 */
export function borderPoint(
  node: Node,
  angleDeg: number,
): { x: number; y: number } {
  const nodeData = node.data as NeuronNodeData;
  const shape = nodeData.shape ?? 'circle';

  const measuredWidth = (node as any).measured?.width as number | undefined;
  const measuredHeight = (node as any).measured?.height as number | undefined;

  const radius = nodeData.radius ?? 35;
  const rectWidth = nodeData.width ?? 90;
  const rectHeight = nodeData.height ?? 44;

  const nodeWidth = measuredWidth ?? (shape === 'circle' ? radius * 2 : rectWidth);
  const nodeHeight = measuredHeight ?? (shape === 'circle' ? radius * 2 : rectHeight);

  // node.position is the node center (ReactFlow nodeOrigin=[0.5, 0.5]).
  const cx = node.position.x;
  const cy = node.position.y;

  if (shape === 'circle') {
    const r = nodeWidth / 2;
    const rad = angleDeg * (Math.PI / 180);
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  const nodeRotation = nodeData.rotation ?? 0;
  const halfW = nodeWidth / 2;
  const halfH = nodeHeight / 2;

  if (shape === 'arrow') {
    const verts = arrowVertices(halfW, halfH);
    const localRad = (angleDeg - nodeRotation) * (Math.PI / 180);
    const cosA = Math.cos(localRad);
    const sinA = Math.sin(localRad);
    let minT = Infinity;
    for (let i = 0; i < verts.length; i++) {
      const a = verts[i];
      const b = verts[(i + 1) % verts.length];
      const t = raySegmentIntersect(cosA, sinA, a.x, a.y, b.x, b.y);
      if (t !== null && t < minT) minT = t;
    }
    if (minT === Infinity) minT = halfW;
    const localDx = minT * cosA;
    const localDy = minT * sinA;
    const rotRad = nodeRotation * (Math.PI / 180);
    const cosR = Math.cos(rotRad);
    const sinR = Math.sin(rotRad);
    return { x: cx + localDx * cosR - localDy * sinR, y: cy + localDx * sinR + localDy * cosR };
  }

  const localAngleDeg = angleDeg - nodeRotation;
  const localRad = localAngleDeg * (Math.PI / 180);
  const cosA = Math.cos(localRad);
  const sinA = Math.sin(localRad);

  const eps = 1e-9;
  const tx = Math.abs(cosA) > eps ? halfW / Math.abs(cosA) : Infinity;
  const ty = Math.abs(sinA) > eps ? halfH / Math.abs(sinA) : Infinity;
  const t = Math.min(tx, ty);

  const localDx = t * cosA;
  const localDy = t * sinA;

  const rotRad = nodeRotation * (Math.PI / 180);
  const cosR = Math.cos(rotRad);
  const sinR = Math.sin(rotRad);
  const dx = localDx * cosR - localDy * sinR;
  const dy = localDx * sinR + localDy * cosR;

  return { x: cx + dx, y: cy + dy };
}

/**
 * Compute the angle (degrees) from the node center to a given flow position.
 */
export function angleToNode(node: Node, pos: { x: number; y: number }): number {
  return Math.atan2(pos.y - node.position.y, pos.x - node.position.x) * (180 / Math.PI);
}

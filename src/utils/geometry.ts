import type { Node } from '@xyflow/react';
import type { NeuronNodeData } from '../types';

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

  const cx = node.position.x + nodeWidth / 2;
  const cy = node.position.y + nodeHeight / 2;

  if (shape === 'circle') {
    const r = nodeWidth / 2;
    const rad = angleDeg * (Math.PI / 180);
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  const nodeRotation = nodeData.rotation ?? 0;
  const halfW = nodeWidth / 2;
  const halfH = nodeHeight / 2;

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
  const nodeData = node.data as NeuronNodeData;
  const shape = nodeData.shape ?? 'circle';
  const radius = nodeData.radius ?? 35;
  const rectW = nodeData.width ?? 90;
  const rectH = nodeData.height ?? 44;
  const nw = (node as any).measured?.width ?? (shape === 'circle' ? radius * 2 : rectW);
  const nh = (node as any).measured?.height ?? (shape === 'circle' ? radius * 2 : rectH);
  const cx = node.position.x + nw / 2;
  const cy = node.position.y + nh / 2;
  return Math.atan2(pos.y - cy, pos.x - cx) * (180 / Math.PI);
}

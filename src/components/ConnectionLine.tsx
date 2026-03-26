import type { ConnectionLineComponentProps } from '@xyflow/react';
import { pendingAngles } from '../nodes/NeuronNode';
import { borderPoint, angleToNode } from '../utils/geometry';

export default function ConnectionLine({
  fromNode,
  fromX,
  fromY,
  toX,
  toY,
  toNode,
}: ConnectionLineComponentProps) {
  // Compute the actual border point on the source node using the recorded click angle.
  let startX = fromX;
  let startY = fromY;
  if (fromNode) {
    const angle = pendingAngles.get(fromNode.id) ?? 0;
    const pt = borderPoint(fromNode, angle);
    startX = pt.x;
    startY = pt.y;
  }

  // When hovering a target node, snap to its border in the direction of the source.
  let endX = toX;
  let endY = toY;
  if (toNode) {
    const angle = angleToNode(toNode, { x: startX, y: startY });
    const pt = borderPoint(toNode, angle);
    endX = pt.x;
    endY = pt.y;
  }

  return (
    <line
      x1={startX}
      y1={startY}
      x2={endX}
      y2={endY}
      stroke="#94a3b8"
      strokeWidth={1.5}
      strokeDasharray="6 4"
    />
  );
}

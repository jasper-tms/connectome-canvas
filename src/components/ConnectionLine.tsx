import { useEffect, useState } from 'react';
import type { ConnectionLineComponentProps } from '@xyflow/react';
import { useReactFlow } from '@xyflow/react';
import { pendingAngles } from '../nodes/NeuronNode';
import { borderPoint } from '../utils/geometry';

// Module-level ref to store the final connection end position in flow coordinates
export const lastConnectionEndPos = { x: 0, y: 0 };

export default function ConnectionLine({
  fromNode,
  fromX,
  fromY,
  toX,
  toY,
}: ConnectionLineComponentProps) {
  const { screenToFlowPosition } = useReactFlow();
  const [cursorPos, setCursorPos] = useState({ x: toX, y: toY });

  // Track the real cursor position so the endpoint always follows the mouse,
  // even when XYFlow snaps toX/toY to a handle center.
  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      setCursorPos(pos);
      lastConnectionEndPos.x = pos.x;
      lastConnectionEndPos.y = pos.y;
    }
    window.addEventListener('mousemove', onMouseMove);
    return () => window.removeEventListener('mousemove', onMouseMove);
  }, [screenToFlowPosition]);

  // Compute the actual border point on the source node using the recorded click angle.
  let startX = fromX;
  let startY = fromY;
  if (fromNode) {
    const angle = pendingAngles.get(fromNode.id) ?? 0;
    const pt = borderPoint(fromNode, angle);
    startX = pt.x;
    startY = pt.y;
  }

  return (
    <line
      x1={startX}
      y1={startY}
      x2={cursorPos.x}
      y2={cursorPos.y}
      stroke="#94a3b8"
      strokeWidth={1.5}
      strokeDasharray="6 4"
    />
  );
}

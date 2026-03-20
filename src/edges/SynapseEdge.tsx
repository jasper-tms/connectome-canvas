import { useCallback, useState } from 'react';
import { EdgeLabelRenderer, EdgeProps, useReactFlow, useStore } from '@xyflow/react';
import type { SynapseEdgeData, ControlPoint } from '../types';
import { catmullRomToSvgPath, pointOnSpline, findNearestSegment } from '../utils/catmullRom';

const CP_RADIUS_NORMAL = 5;
const CP_RADIUS_SELECTED = 6;
const CP_HIT_RADIUS = 12;

export default function SynapseEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  selected,
  markerEnd,
}: EdgeProps) {
  const edgeData = data as SynapseEdgeData | undefined;
  const controlPoints = edgeData?.controlPoints ?? [];
  const synapseCount = edgeData?.synapseCount ?? 0;
  const onControlPointsChange = edgeData?.onControlPointsChange;

  const { screenToFlowPosition } = useReactFlow();
  const isInteractive = useStore((s) => s.nodesDraggable);
  const [selectedCp, setSelectedCp] = useState<number | null>(null);
  const [dragState, setDragState] = useState<{ index: number; points: ControlPoint[] } | null>(null);

  const displayPoints = dragState ? dragState.points : controlPoints;

  const allPoints = [
    { x: sourceX, y: sourceY },
    ...displayPoints,
    { x: targetX, y: targetY },
  ];

  const pathD = catmullRomToSvgPath(allPoints);
  const labelPos = pointOnSpline(allPoints, 0.5);

  // --- Control point pointer handlers ---
  const handlePointerDown = useCallback((e: React.PointerEvent, cpIndex: number) => {
    // Alt+click to delete
    if (e.altKey) {
      e.stopPropagation();
      e.preventDefault();
      const newPoints = controlPoints.filter((_, i) => i !== cpIndex);
      onControlPointsChange?.(id, newPoints);
      return;
    }

    e.stopPropagation();
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
    setSelectedCp(cpIndex);
    setDragState({ index: cpIndex, points: [...controlPoints] });
  }, [controlPoints, id, onControlPointsChange]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragState) return;
    e.stopPropagation();
    e.preventDefault();
    const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    setDragState((prev) => {
      if (!prev) return prev;
      const newPoints = [...prev.points];
      newPoints[prev.index] = { x: pos.x, y: pos.y };
      return { index: prev.index, points: newPoints };
    });
  }, [dragState, screenToFlowPosition]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragState) return;
    e.stopPropagation();
    (e.target as Element).releasePointerCapture(e.pointerId);
    onControlPointsChange?.(id, dragState.points);
    setDragState(null);
  }, [dragState, id, onControlPointsChange]);

  // --- Double-click to add a control point ---
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const { segmentIndex } = findNearestSegment(allPoints, pos.x, pos.y);
      const newPoints = [...controlPoints];
      newPoints.splice(segmentIndex, 0, { x: pos.x, y: pos.y });
      onControlPointsChange?.(id, newPoints);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [controlPoints, id, onControlPointsChange, screenToFlowPosition, sourceX, sourceY, targetX, targetY],
  );

  return (
    <g>
      {/* Invisible wide hit area for double-click to add control points */}
      <path
        d={pathD}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        onDoubleClick={isInteractive ? handleDoubleClick : undefined}
        style={{ pointerEvents: isInteractive ? 'stroke' : 'none' }}
      />

      {/* Visible edge path */}
      <path
        d={pathD}
        fill="none"
        stroke={selected ? '#6366f1' : '#94a3b8'}
        strokeWidth={selected ? 2.5 : 1.5}
        markerEnd={markerEnd as string}
        style={{ pointerEvents: 'none' }}
      />

      {/* Control point circles (hidden when view is locked) */}
      {isInteractive && displayPoints.map((cp, i) => {
        const isSel = selectedCp === i;
        return (
          <g key={i}>
            {/* Hit area */}
            <circle
              cx={cp.x}
              cy={cp.y}
              r={CP_HIT_RADIUS}
              fill="transparent"
              className="nodrag nopan"
              style={{
                cursor: dragState?.index === i ? 'grabbing' : 'grab',
                pointerEvents: 'all',
              }}
              onPointerDown={(e) => handlePointerDown(e, i)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            />
            {/* Visible dot */}
            <circle
              cx={cp.x}
              cy={cp.y}
              r={isSel ? CP_RADIUS_SELECTED : CP_RADIUS_NORMAL}
              fill={isSel ? '#818cf8' : '#c7d2fe'}
              fillOpacity={isSel ? 0.7 : 0.4}
              stroke={isSel ? '#4f46e5' : '#a5b4fc'}
              strokeWidth={isSel ? 2 : 1}
              style={{ pointerEvents: 'none' }}
            />
          </g>
        );
      })}

      {/* Synapse count label */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelPos.x}px,${labelPos.y}px)`,
            pointerEvents: 'all',
            background: selected ? '#eef2ff' : '#f8fafc',
            border: `1px solid ${selected ? '#6366f1' : '#e2e8f0'}`,
            borderRadius: 4,
            padding: '2px 6px',
            fontSize: 11,
            fontWeight: 600,
            color: synapseCount > 0 ? '#6366f1' : '#94a3b8',
            cursor: 'default',
            userSelect: 'none',
            minWidth: 24,
            textAlign: 'center',
          }}
          className="nodrag nopan"
        >
          {synapseCount > 0 ? synapseCount : '—'}
        </div>
      </EdgeLabelRenderer>
    </g>
  );
}

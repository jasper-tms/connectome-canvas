import { useCallback, useEffect, useRef, useState } from 'react';
import { EdgeLabelRenderer, EdgeProps, useNodes, useReactFlow, useStore } from '@xyflow/react';
import type { SynapseEdgeData, ControlPoint, GlobalSettings, Neurotransmitter } from '../types';
import { ntColor } from '../types';
import { catmullRomToSvgPath, pointOnSpline, findNearestSegment, buildArcLengthTable, arcLengthToT, type Point } from '../utils/catmullRom';
import { borderPoint, angleToNode } from '../utils/geometry';

const CP_RADIUS_NORMAL = 5;
const CP_RADIUS_SELECTED = 6;
const CP_HIT_RADIUS = 12;

/**
 * Sample the spline at evenly-spaced arc-length positions and return the
 * arc-length fraction (0–1) whose point is closest to (px, py).
 */
function findNearestArcFraction(points: Point[], px: number, py: number): number {
  const table = buildArcLengthTable(points);
  const samples = 100;
  let bestU = 0;
  let bestDist = Infinity;
  for (let i = 0; i <= samples; i++) {
    const u = i / samples;
    const t = arcLengthToT(table, u);
    const pt = pointOnSpline(points, t);
    const d = (pt.x - px) ** 2 + (pt.y - py) ** 2;
    if (d < bestDist) { bestDist = d; bestU = u; }
  }
  return bestU;
}

// Default attachment angle (degrees) when no angle is stored.
const DEFAULT_SOURCE_ANGLE = 0;   // exit to the right
const DEFAULT_TARGET_ANGLE = 180; // arrive from the left

export default function SynapseEdge({
  id,
  source,
  target,
  data,
  selected,
}: EdgeProps) {
  const edgeData = data as (SynapseEdgeData & { globalSettings?: GlobalSettings; sourceNeurotransmitter?: Neurotransmitter }) | undefined;
  const controlPoints = edgeData?.controlPoints ?? [];
  const synapseCount = edgeData?.synapseCount ?? 0;
  const gs = edgeData?.globalSettings;
  const edgeWidth = gs?.edgeWidthMode === 'weighted'
    ? Math.max(0.5, (gs?.weightedEdgeWidth ?? 1.5) * synapseCount / 10)
    : (gs?.fixedEdgeWidth ?? 1.5);
  const edgeWidthSelected = edgeWidth + 1;
  const edgeColorMode = gs?.edgeColorMode ?? 'grey';
  const sourceNt = edgeData?.sourceNeurotransmitter ?? 'Other';
  const baseEdgeColor = edgeColorMode === 'grey'
    ? '#94a3b8'
    : ntColor(sourceNt, edgeColorMode);
  const onControlPointsChange = edgeData?.onControlPointsChange;
  const onAngleChange = edgeData?.onAngleChange;

  const { screenToFlowPosition } = useReactFlow();
  const isInteractive = useStore((s) => s.nodesDraggable);
  const [selectedCp, setSelectedCp] = useState<number | null>(null);
  const [dragState, setDragState] = useState<{ index: number; points: ControlPoint[] } | null>(null);
  const [labelDragging, setLabelDragging] = useState(false);
  const labelMovedRef = useRef(false);
  const [endpointDrag, setEndpointDrag] = useState<{ end: 'source' | 'target'; liveAngle: number } | null>(null);

  const onLabelPositionChange = edgeData?.onLabelPositionChange;

  // Look up source and target nodes to get their positions and geometry.
  const nodes = useNodes();
  const sourceNode = nodes.find((n) => n.id === source);
  const targetNode = nodes.find((n) => n.id === target);

  // Resolve attachment angles, falling back to sensible defaults.
  // Override with live drag angle for immediate visual feedback.
  const effectiveSourceAngle = endpointDrag?.end === 'source' ? endpointDrag.liveAngle : (edgeData?.sourceAngle ?? DEFAULT_SOURCE_ANGLE);
  const effectiveTargetAngle = endpointDrag?.end === 'target' ? endpointDrag.liveAngle : (edgeData?.targetAngle ?? DEFAULT_TARGET_ANGLE);

  // Compute border attachment points in flow coordinates.
  const sourcePt = sourceNode
    ? borderPoint(sourceNode, effectiveSourceAngle)
    : { x: 0, y: 0 };
  const targetPt = targetNode
    ? borderPoint(targetNode, effectiveTargetAngle)
    : { x: 0, y: 0 };

  const sourceX = sourcePt.x;
  const sourceY = sourcePt.y;
  const targetX = targetPt.x;
  const targetY = targetPt.y;

  // Deselect control point on click-without-drag (≤1 px movement), matching
  // ReactFlow's node/edge deselection behaviour.
  useEffect(() => {
    let downPos: { x: number; y: number } | null = null;
    const onPointerDown = (e: PointerEvent) => {
      downPos = { x: e.clientX, y: e.clientY };
    };
    const onClick = (e: MouseEvent) => {
      if (downPos && Math.abs(e.clientX - downPos.x) <= 1 && Math.abs(e.clientY - downPos.y) <= 1) {
        setSelectedCp(null);
      }
      downPos = null;
    };
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('click', onClick);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('click', onClick);
    };
  }, []);

  // Delete selected control point when Delete/Backspace is pressed.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedCp !== null) {
        e.preventDefault();
        e.stopImmediatePropagation();
        const newPoints = controlPoints.filter((_, i) => i !== selectedCp);
        onControlPointsChange?.(id, newPoints);
        setSelectedCp(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [selectedCp, controlPoints, id, onControlPointsChange]);

  const displayPoints = dragState ? dragState.points : controlPoints;

  const allPoints = [
    { x: sourceX, y: sourceY },
    ...displayPoints,
    { x: targetX, y: targetY },
  ];

  // Compute arrowhead geometry first so we can truncate the path at the base.
  // Using t≈1 gives the mathematical tangent at the tip, but because Catmull-Rom
  // endpoint clamping forces that tangent toward the last-control-point→target
  // direction, it can diverge from the visual approach direction of the curve.
  // Sampling at a point ~arrowLen back aligns the arrowhead with the visible
  // curve leading into it.
  const activeWidth = selected ? edgeWidthSelected : edgeWidth;
  const arrowLen = Math.max(9, activeWidth * 3);
  const arrowBasePoint = (() => {
    if (allPoints.length < 2) return { x: targetX - 1, y: targetY };
    // Binary-search for the t value whose spline point is ~arrowLen from target.
    let lo = 0, hi = 1;
    for (let i = 0; i < 20; i++) {
      const mid = (lo + hi) / 2;
      const p = pointOnSpline(allPoints, mid);
      const dist = Math.hypot(p.x - targetX, p.y - targetY);
      if (dist > arrowLen) lo = mid; else hi = mid;
      if (Math.abs(dist - arrowLen) < 0.5) break;
    }
    return pointOnSpline(allPoints, (lo + hi) / 2);
  })();
  const arrowAngle = Math.atan2(targetY - arrowBasePoint.y, targetX - arrowBasePoint.x);
  const arrowHalf = Math.max(4.5, activeWidth * 1.5);
  const arrowColor = selected ? '#6366f1' : baseEdgeColor;
  const baseCX = targetX - arrowLen * Math.cos(arrowAngle);
  const baseCY = targetY - arrowLen * Math.sin(arrowAngle);

  const arrowTipExtension = 1.5;
  // Stop the path just before the arrowhead tip so the stroke doesn't poke out
  // the sides. The minimum cutoff is where the arrowhead becomes wide enough to
  // contain the full stroke width: derived from arrowHalf*2*(d/arrowLen) =
  // activeWidth, which simplifies to d = activeWidth - arrowTipExtension.
  const pathCutoff = Math.max(0, activeWidth - arrowTipExtension);
  const pathEndX = targetX - pathCutoff * Math.cos(arrowAngle);
  const pathEndY = targetY - pathCutoff * Math.sin(arrowAngle);
  const pathPoints = allPoints.length > 1 && pathCutoff > 0
    ? [...allPoints.slice(0, -1), { x: pathEndX, y: pathEndY }]
    : allPoints;
  const pathD = catmullRomToSvgPath(pathPoints);
  const labelU = edgeData?.labelPosition ?? 0.5;
  const arcTable = buildArcLengthTable(allPoints);
  const labelPos = pointOnSpline(allPoints, arcLengthToT(arcTable, labelU));
  const perpX = -Math.sin(arrowAngle);
  const perpY = Math.cos(arrowAngle);
  const arrowTipX = targetX + arrowTipExtension * Math.cos(arrowAngle);
  const arrowTipY = targetY + arrowTipExtension * Math.sin(arrowAngle);
  const arrowPoints = [
    `${arrowTipX},${arrowTipY}`,
    `${baseCX + arrowHalf * perpX},${baseCY + arrowHalf * perpY}`,
    `${baseCX - arrowHalf * perpX},${baseCY - arrowHalf * perpY}`,
  ].join(' ');

  // --- Control point pointer handlers ---
  const handlePointerDown = useCallback((e: React.PointerEvent, cpIndex: number) => {
    e.nativeEvent.stopImmediatePropagation();

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
    setSelectedCp(dragState.index);
    setDragState(null);
  }, [dragState, id, onControlPointsChange]);

  // --- Label drag handlers ---
  const handleLabelPointerDown = useCallback((e: React.PointerEvent) => {
    if (!isInteractive) return;
    e.stopPropagation();
    e.preventDefault();
    e.nativeEvent.stopImmediatePropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    labelMovedRef.current = false;
    setLabelDragging(true);
  }, [isInteractive]);

  const handleLabelPointerMove = useCallback((e: React.PointerEvent) => {
    if (!labelDragging) return;
    e.stopPropagation();
    e.preventDefault();
    labelMovedRef.current = true;
    const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    const newU = findNearestArcFraction(allPoints, pos.x, pos.y);
    onLabelPositionChange?.(id, newU);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [labelDragging, screenToFlowPosition, id, onLabelPositionChange, sourceX, sourceY, targetX, targetY, displayPoints]);

  const handleLabelPointerUp = useCallback((e: React.PointerEvent) => {
    if (!labelDragging) return;
    e.stopPropagation();
    (e.target as Element).releasePointerCapture(e.pointerId);
    setLabelDragging(false);
  }, [labelDragging]);

  const handleLabelClick = useCallback((e: React.MouseEvent) => {
    if (labelMovedRef.current) {
      e.stopPropagation();
      e.preventDefault();
    }
  }, []);

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

  // --- Endpoint drag handlers ---
  const handleEndpointPointerDown = useCallback((e: React.PointerEvent, end: 'source' | 'target') => {
    e.stopPropagation();
    e.preventDefault();
    e.nativeEvent.stopImmediatePropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    const initAngle = end === 'source' ? (edgeData?.sourceAngle ?? DEFAULT_SOURCE_ANGLE) : (edgeData?.targetAngle ?? DEFAULT_TARGET_ANGLE);
    setEndpointDrag({ end, liveAngle: initAngle });
  }, [edgeData?.sourceAngle, edgeData?.targetAngle]);

  const handleEndpointPointerMove = useCallback((e: React.PointerEvent) => {
    if (!endpointDrag) return;
    e.stopPropagation();
    const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    const node = endpointDrag.end === 'source' ? sourceNode : targetNode;
    if (!node) return;
    const angle = angleToNode(node, pos);
    setEndpointDrag((prev) => prev ? { ...prev, liveAngle: angle } : prev);
  }, [endpointDrag, screenToFlowPosition, sourceNode, targetNode]);

  const handleEndpointPointerUp = useCallback((e: React.PointerEvent) => {
    if (!endpointDrag) return;
    e.stopPropagation();
    (e.target as Element).releasePointerCapture(e.pointerId);
    onAngleChange?.(id, endpointDrag.end, endpointDrag.liveAngle);
    setEndpointDrag(null);
  }, [endpointDrag, id, onAngleChange]);

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
        stroke={selected ? '#6366f1' : baseEdgeColor}
        strokeWidth={activeWidth}
        style={{ pointerEvents: 'none' }}
      />

      {/* Arrowhead — manually drawn so it follows the true spline tangent */}
      <polygon
        points={arrowPoints}
        fill={arrowColor}
        style={{ pointerEvents: 'none' }}
      />

      {/* Control point circles (visible only when edge is selected and view is interactive) */}
      {isInteractive && selected && displayPoints.map((cp, i) => {
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

      {/* Endpoint attachment handles rendered in EdgeLabelRenderer (HTML layer above nodes) */}
      {isInteractive && selected && (
        <EdgeLabelRenderer>
          {(['source', 'target'] as const).map((end) => {
            const x = end === 'source' ? sourceX : targetX;
            const y = end === 'source' ? sourceY : targetY;
            return (
              <div
                key={end}
                className="nodrag nopan"
                style={{
                  position: 'absolute',
                  transform: `translate(-50%, -50%) translate(${x}px,${y}px)`,
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  background: endpointDrag?.end === end ? '#818cf8' : '#c7d2fe',
                  border: '1.5px solid #4f46e5',
                  boxSizing: 'border-box',
                  cursor: endpointDrag?.end === end ? 'grabbing' : 'grab',
                  pointerEvents: 'all',
                  zIndex: 1000,
                }}
                onPointerDown={(e) => handleEndpointPointerDown(e, end)}
                onPointerMove={handleEndpointPointerMove}
                onPointerUp={handleEndpointPointerUp}
              />
            );
          })}
        </EdgeLabelRenderer>
      )}

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
            cursor: isInteractive ? (labelDragging ? 'grabbing' : 'grab') : 'default',
            userSelect: 'none',
            minWidth: 24,
            textAlign: 'center',
          }}
          className="nodrag nopan"
          onPointerDown={isInteractive ? handleLabelPointerDown : undefined}
          onPointerMove={isInteractive ? handleLabelPointerMove : undefined}
          onPointerUp={isInteractive ? handleLabelPointerUp : undefined}
          onClick={isInteractive ? handleLabelClick : undefined}
        >
          {synapseCount > 0 ? synapseCount : '—'}
        </div>
      </EdgeLabelRenderer>
    </g>
  );
}

import { Handle, Position, NodeProps, useConnection, useEdges } from '@xyflow/react';
import type { NeuronNodeData, GlobalSettings } from '../types';
import { ntColor } from '../types';
import { arrowVertices, offsetPolygon } from '../utils/geometry';

/**
 * Module-level map that stores the most recent connection-start angle (in degrees)
 * for each node. Keyed by nodeId. Populated by onMouseDown on the node container;
 * read by App.tsx's onConnect callback to attach the angle to new edges.
 *
 * Convention: 0° = right, 90° = down (standard canvas/atan2 orientation).
 */
export const pendingAngles = new Map<string, number>();

const BORDER_ZONE = 4;
const ARROW_CORNER_RADIUS = 6;

/**
 * Build an arrow path whose rendered (rounded) bounding box is exactly
 * [0,0]-[W,H], matching a same-size rectangle. The bbox-touching vertices
 * (top-left, right point, bottom-left) are pushed outward in x so that the
 * inward bulge of the quadratic Bezier corner reaches the bbox edge instead
 * of the vertex. dxL and dxR depend on the corner geometry, which depends
 * on the outset itself, so a few Newton iterations are needed for an exact
 * match (a non-iterative formula has H-dependent sub-pixel error that
 * causes visible jumps as the node is resized).
 */
function solveDxL(indent: number, halfH: number, er: number): number {
  // Solve: dxL * (indent + dxL + L) - er * (indent + dxL) = 0,
  // where L = sqrt((indent + dxL)^2 + halfH^2).
  let dxL = (er * indent) / (indent + Math.hypot(indent, halfH));
  for (let i = 0; i < 6; i++) {
    const L = Math.hypot(indent + dxL, halfH);
    const g = dxL * (indent + dxL + L) - er * (indent + dxL);
    const dL = (indent + dxL) / L;
    const dg = (indent + dxL + L) + dxL * (1 + dL) - er;
    if (Math.abs(dg) < 1e-12) break;
    const step = g / dg;
    dxL -= step;
    if (Math.abs(step) < 1e-9) break;
  }
  return dxL;
}

function solveDxR(indent: number, halfH: number, er: number): number {
  // Solve: dxR * (2L - er) - er * indent = 0,
  // where L = sqrt((indent + dxR)^2 + halfH^2).
  let dxR = (er * indent) / (2 * Math.hypot(indent, halfH) - er);
  for (let i = 0; i < 6; i++) {
    const L = Math.hypot(indent + dxR, halfH);
    const h = dxR * (2 * L - er) - er * indent;
    const dL = (indent + dxR) / L;
    const dh = (2 * L - er) + dxR * 2 * dL;
    if (Math.abs(dh) < 1e-12) break;
    const step = h / dh;
    dxR -= step;
    if (Math.abs(step) < 1e-9) break;
  }
  return dxR;
}

function arrowSvgPath(W: number, H: number, r: number = ARROW_CORNER_RADIUS): {
  d: string;
  outerLeft: number;
  outerRight: number;
} {
  const indent = W / 8;
  const halfH = H / 2;
  const diagLen = Math.hypot(indent, halfH);
  const horizLen = Math.max(0, W - indent);
  const erObtuse = Math.min(r, diagLen / 3, horizLen / 3);
  const erPoint = Math.min(r, diagLen / 3);
  const dxL = solveDxL(indent, halfH, erObtuse);
  const dxR = solveDxR(indent, halfH, erPoint);
  const verts = [
    { x: -dxL, y: 0 },
    { x: W - indent, y: 0 },
    { x: W + dxR, y: H / 2 },
    { x: W - indent, y: H },
    { x: -dxL, y: H },
    { x: indent, y: H / 2 },
  ];
  const n = verts.length;
  let d = '';
  for (let i = 0; i < n; i++) {
    const prev = verts[(i - 1 + n) % n];
    const curr = verts[i];
    const next = verts[(i + 1) % n];
    const toPrevLen = Math.hypot(prev.x - curr.x, prev.y - curr.y);
    const toNextLen = Math.hypot(next.x - curr.x, next.y - curr.y);
    const er = Math.min(r, toPrevLen / 3, toNextLen / 3);
    const sx = curr.x + ((prev.x - curr.x) / toPrevLen) * er;
    const sy = curr.y + ((prev.y - curr.y) / toPrevLen) * er;
    const ex = curr.x + ((next.x - curr.x) / toNextLen) * er;
    const ey = curr.y + ((next.y - curr.y) / toNextLen) * er;
    d += i === 0 ? `M ${sx} ${sy}` : ` L ${sx} ${sy}`;
    d += ` Q ${curr.x} ${curr.y} ${ex} ${ey}`;
  }
  return { d: d + ' Z', outerLeft: -dxL, outerRight: W + dxR };
}

function arrowClipData(
  nodeWidth: number,
  nodeHeight: number,
  offset: number,
): { clipPath: string; width: number; height: number } {
  const halfW = nodeWidth / 2;
  const halfH = nodeHeight / 2;
  const verts = arrowVertices(halfW, halfH);
  const poly = offset !== 0 ? offsetPolygon(verts, offset) : verts;
  let maxAbsX = 0, maxAbsY = 0;
  for (const v of poly) {
    maxAbsX = Math.max(maxAbsX, Math.abs(v.x));
    maxAbsY = Math.max(maxAbsY, Math.abs(v.y));
  }
  const elemW = maxAbsX * 2 + 2;
  const elemH = maxAbsY * 2 + 2;
  const pts = poly.map(v =>
    `${((v.x + elemW / 2) / elemW * 100).toFixed(2)}% ${((v.y + elemH / 2) / elemH * 100).toFixed(2)}%`
  );
  return { clipPath: `polygon(${pts.join(', ')})`, width: elemW, height: elemH };
}

export default function NeuronNode({ id, data, selected }: NodeProps) {
  const nodeData = data as NeuronNodeData & { globalSettings?: GlobalSettings };
  const { label, color: manualColor, shape, rotation, rotateLabel, locked, fontSize, neurotransmitter, globalSettings: gs } = nodeData;
  const nodeColorMode = gs?.nodeColorMode ?? 'manual';
  const color = nodeColorMode === 'manual'
    ? manualColor
    : ntColor(neurotransmitter ?? 'Other', nodeColorMode);
  const connection = useConnection();
  const isConnecting = connection.inProgress;
  const edges = useEdges();

  // Determine if this node is a valid target for the in-progress connection.
  // Invalid if: this is the source node, or an edge from source→this already exists.
  const sourceId = isConnecting ? (connection as any).fromNode?.id as string | undefined : undefined;
  const isValidTarget = isConnecting && sourceId !== id &&
    !edges.some((e) => e.source === sourceId && e.target === id);
  const isConnectionTarget = isValidTarget && (connection as any).toNode?.id === id;

  const outlineColor = selected ? '#7c8cff' : color;
  const outlineWidth = selected ? 3 : 2;

  const radius = nodeData.radius ?? 35;
  const rectWidth = nodeData.width ?? 90;
  const rectHeight = nodeData.height ?? 44;
  const labelFontSize = fontSize ?? 12;

  const nodeWidth = shape === 'circle' ? radius * 2 : rectWidth;
  const nodeHeight = shape === 'circle' ? radius * 2 : rectHeight;

  const arrowHandle = shape === 'arrow' ? arrowClipData(nodeWidth, nodeHeight, -8) : null;
  const arrowInterior = shape === 'arrow' ? arrowClipData(nodeWidth, nodeHeight, BORDER_ZONE) : null;

  const shapeStyle: React.CSSProperties =
    shape === 'circle'
      ? {
          width: nodeWidth,
          height: nodeHeight,
          borderRadius: '50%',
          background: color + '30',
          border: `${outlineWidth}px solid ${outlineColor}`,
          display: 'flex',
          flexDirection: 'column' as const,
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }
      : shape === 'arrow'
      ? {
          width: nodeWidth,
          height: nodeHeight,
          display: 'flex',
          flexDirection: 'column' as const,
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          transform: `rotate(${rotation ?? 0}deg)`,
        }
      : {
          width: nodeWidth,
          height: nodeHeight,
          borderRadius: 6,
          background: color + '30',
          border: `${outlineWidth}px solid ${outlineColor}`,
          display: 'flex',
          flexDirection: 'column' as const,
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          transform: `rotate(${rotation ?? 0}deg)`,
        };

  // When the user presses the mouse button anywhere on this node, record the angle
  // from the node center to the click point. This is read by App.tsx's onConnect.
  function handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI); // -180..180
    pendingAngles.set(id, angle);
  }

  return (
    <div
      style={{ position: 'relative', pointerEvents: locked ? 'none' : undefined, opacity: locked ? 0.55 : undefined }}
      onMouseDown={handleMouseDown}
    >
      {/*
        Single invisible Handle that covers the entire node area.
        This replaces the 4 cardinal handles and lets users start a connection
        from anywhere on the node boundary.
        connectionMode="Loose" (set in App.tsx) means this source handle also
        accepts incoming connections as a target.
      */}
      {!locked && <Handle
        type="source"
        position={Position.Top}
        id="border"
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: (shape === 'rectangle' || shape === 'arrow')
            ? `translate(-50%, -50%) rotate(${rotation ?? 0}deg)`
            : 'translate(-50%, -50%)',
          width: arrowHandle ? arrowHandle.width : nodeWidth + 16,
          height: arrowHandle ? arrowHandle.height : nodeHeight + 16,
          borderRadius: shape === 'circle' ? '50%' : shape === 'arrow' ? 0 : 6,
          clipPath: arrowHandle?.clipPath,
          background: 'transparent',
          border: isConnecting && isValidTarget
            ? `2px dashed ${isConnectionTarget ? color : color + '88'}`
            : 'none',
          opacity: 1,
          cursor: 'crosshair',
          zIndex: 10,
        }}
      />}

      {/* Interior hit-zone: sits above the Handle (z‑index 20) so interior pointer
          events bubble through to XYFlow's drag handler instead of starting a connection. */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: (shape === 'rectangle' || shape === 'arrow')
            ? `translate(-50%, -50%) rotate(${rotation ?? 0}deg)`
            : 'translate(-50%, -50%)',
          width: arrowInterior ? arrowInterior.width : Math.max(0, nodeWidth - 2 * BORDER_ZONE),
          height: arrowInterior ? arrowInterior.height : Math.max(0, nodeHeight - 2 * BORDER_ZONE),
          borderRadius: shape === 'circle' ? '50%' : shape === 'arrow' ? 0 : 4,
          clipPath: arrowInterior?.clipPath,
          background: 'transparent',
          zIndex: 20,
        }}
      />

      <div style={shapeStyle}>
        {shape === 'arrow' && (() => {
          // Path is generated for a bbox inset by outlineWidth/2 on all sides,
          // then translated by (outlineWidth/2, outlineWidth/2). The stroke,
          // centered on the path, then occupies the outermost outlineWidth/2
          // of the bbox — matching `box-sizing: border-box` rectangles, where
          // the selected (3px) stroke stays inside the same outer bounds as
          // the unselected (2px) stroke.
          const arrow = arrowSvgPath(nodeWidth - outlineWidth, nodeHeight - outlineWidth);
          return (
            <svg
              width={nodeWidth}
              height={nodeHeight}
              viewBox={`0 0 ${nodeWidth} ${nodeHeight}`}
              overflow="visible"
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                pointerEvents: 'none',
              }}
            >
              <path
                d={arrow.d}
                transform={`translate(${outlineWidth / 2}, ${outlineWidth / 2})`}
                fill={color + '30'}
                stroke={outlineColor}
                strokeWidth={outlineWidth}
              />
            </svg>
          );
        })()}
        <span
          style={{
            fontSize: labelFontSize,
            fontWeight: 600,
            color: '#1e293b',
            textAlign: 'center',
            lineHeight: 1.2,
            maxWidth: nodeWidth - 10,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            transform: (shape === 'rectangle' || shape === 'arrow') && rotateLabel === false ? `rotate(${-(rotation ?? 0)}deg)` : undefined,
            userSelect: 'none',
            zIndex: 10,
            position: 'relative',
          }}
        >
          {label}
        </span>
        {locked && (
          <svg
            width="12" height="12" viewBox="0 0 14 14" fill="none"
            style={{
              zIndex: 30,
              filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))',
              pointerEvents: 'none',
              transform: (shape === 'rectangle' || shape === 'arrow') && rotateLabel === false ? `rotate(${-(rotation ?? 0)}deg)` : undefined,
              marginTop: -1,
            }}
          >
            <rect x="2" y="6" width="10" height="7" rx="1.5" fill="#64748b" />
            <path d="M4.5 6V4.5a2.5 2.5 0 015 0V6" stroke="#64748b" strokeWidth="1.5" fill="none" />
          </svg>
        )}
      </div>
    </div>
  );
}

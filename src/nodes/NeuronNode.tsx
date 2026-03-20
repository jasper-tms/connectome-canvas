import { Handle, Position, NodeProps, useConnection } from '@xyflow/react';
import type { NeuronNodeData } from '../types';

const HANDLE_STYLE = {
  width: 10,
  height: 10,
  background: '#7c8cff',
  border: '2px solid #ffffff',
};

export default function NeuronNode({ data, selected }: NodeProps) {
  const nodeData = data as NeuronNodeData;
  const { label, color, shape, rotation } = nodeData;
  const connection = useConnection();
  const isConnecting = connection.inProgress;

  const outlineColor = selected ? '#7c8cff' : color;
  const outlineWidth = selected ? 3 : 2;

  const shapeStyle: React.CSSProperties =
    shape === 'circle'
      ? {
          width: 70,
          height: 70,
          borderRadius: '50%',
          background: color + '30',
          border: `${outlineWidth}px solid ${outlineColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }
      : {
          width: 90,
          height: 44,
          borderRadius: 6,
          background: color + '30',
          border: `${outlineWidth}px solid ${outlineColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          transform: `rotate(${rotation ?? 0}deg)`,
        };

  return (
    <div style={{ position: 'relative' }}>
      {/* Source-only handles — connectionMode="loose" on the canvas lets these also receive connections */}
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        style={{ ...HANDLE_STYLE, top: -5, opacity: isConnecting ? 1 : undefined }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        style={{ ...HANDLE_STYLE, right: -5, opacity: isConnecting ? 1 : undefined }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={{ ...HANDLE_STYLE, bottom: -5, opacity: isConnecting ? 1 : undefined }}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        style={{ ...HANDLE_STYLE, left: -5, opacity: isConnecting ? 1 : undefined }}
      />

      <div style={shapeStyle}>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: '#1e293b',
            textAlign: 'center',
            lineHeight: 1.2,
            maxWidth: 80,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            transform: shape === 'rectangle' ? `rotate(${-(rotation ?? 0)}deg)` : undefined,
            userSelect: 'none',
          }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}

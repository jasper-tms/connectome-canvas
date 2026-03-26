import type { Node, Edge } from '@xyflow/react';
import type { NeuronNodeData, SynapseEdgeData } from '../types';

interface Props {
  selectedNode: Node | null;
  selectedEdge: Edge | null;
  onUpdateNode: (id: string, data: Partial<NeuronNodeData>) => void;
  onUpdateNodePosition: (id: string, pos: { x?: number; y?: number }) => void;
  onUpdateEdge: (id: string, data: Partial<SynapseEdgeData>) => void;
  lockedNodes: Node[];
  onUnlockNode: (id: string) => void;
}

export default function PropertiesPanel({ selectedNode, selectedEdge, onUpdateNode, onUpdateNodePosition, onUpdateEdge, lockedNodes, onUnlockNode }: Props) {
  if (!selectedNode && !selectedEdge) {
    return (
      <div style={panelStyle}>
        {lockedNodes.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', marginTop: 24 }}>
            Select a node or edge to edit its properties.
          </p>
        ) : (
          <LockedNodesList lockedNodes={lockedNodes} onUnlockNode={onUnlockNode} />
        )}
      </div>
    );
  }

  if (selectedNode) {
    const d = selectedNode.data as NeuronNodeData;
    return (
      <div style={panelStyle}>
        <h3 style={headingStyle}>Node</h3>

        <Field label="Shape">
          <div style={{ display: 'flex', gap: 0, borderRadius: 6, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            {(['circle', 'rectangle'] as const).map((s) => (
              <button
                key={s}
                onClick={() => onUpdateNode(selectedNode.id, { shape: s })}
                style={{
                  flex: 1,
                  padding: '4px 0',
                  fontSize: 11,
                  fontWeight: d.shape === s ? 700 : 400,
                  background: d.shape === s ? '#6366f1' : '#f8fafc',
                  color: d.shape === s ? '#fff' : '#64748b',
                  border: 'none',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Label">
          <input
            id="node-label-input"
            type="text"
            value={d.label}
            onChange={(e) => onUpdateNode(selectedNode.id, { label: e.target.value })}
          />
        </Field>

        <Field label="Color">
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="color"
              value={d.color}
              style={{ width: 40, flexShrink: 0, padding: '2px' }}
              onChange={(e) => onUpdateNode(selectedNode.id, { color: e.target.value })}
            />
            <input
              type="text"
              value={d.color}
              style={{ fontFamily: 'monospace' }}
              onChange={(e) => {
                if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) {
                  onUpdateNode(selectedNode.id, { color: e.target.value });
                }
              }}
            />
          </div>
        </Field>

        <Field label="Position">
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <label style={{ fontSize: 10, color: '#94a3b8', width: 12 }}>X</label>
            <input
              type="number"
              value={Math.round(selectedNode.position.x)}
              style={{ flex: 1 }}
              onChange={(e) => onUpdateNodePosition(selectedNode.id, { x: Number(e.target.value) })}
            />
            <label style={{ fontSize: 10, color: '#94a3b8', width: 12 }}>Y</label>
            <input
              type="number"
              value={Math.round(selectedNode.position.y)}
              style={{ flex: 1 }}
              onChange={(e) => onUpdateNodePosition(selectedNode.id, { y: Number(e.target.value) })}
            />
          </div>
        </Field>

        {d.shape === 'circle' && (
          <Field label="Radius">
            <input
              type="number"
              min={10}
              max={200}
              value={d.radius ?? 35}
              onChange={(e) => onUpdateNode(selectedNode.id, { radius: Math.min(200, Math.max(10, Number(e.target.value))) })}
            />
          </Field>
        )}

        {d.shape === 'rectangle' && (
          <>
            <Field label="Width">
              <input
                type="number"
                min={20}
                max={400}
                value={d.width ?? 90}
                onChange={(e) => onUpdateNode(selectedNode.id, { width: Math.min(400, Math.max(20, Number(e.target.value))) })}
              />
            </Field>

            <Field label="Height">
              <input
                type="number"
                min={20}
                max={200}
                value={d.height ?? 44}
                onChange={(e) => onUpdateNode(selectedNode.id, { height: Math.min(200, Math.max(20, Number(e.target.value))) })}
              />
            </Field>

            <Field label={`Rotation: ${d.rotation ?? 0}°`}>
              <input
                type="range"
                min={-180}
                max={180}
                step={1}
                value={d.rotation ?? 0}
                onChange={(e) => onUpdateNode(selectedNode.id, { rotation: Number(e.target.value) })}
              />
            </Field>
          </>
        )}

        <Field label="ID">
          <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>{selectedNode.id}</span>
        </Field>

        <button
          onClick={() => onUpdateNode(selectedNode.id, { locked: true })}
          style={{
            width: '100%',
            padding: '5px 0',
            background: '#f8fafc',
            color: '#64748b',
            border: '1px solid #e2e8f0',
            borderRadius: 6,
            fontSize: 11,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
          }}
        >
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
            <rect x="2" y="6" width="10" height="7" rx="1.5" fill="#64748b" />
            <path d="M4.5 6V4.5a2.5 2.5 0 015 0V6" stroke="#64748b" strokeWidth="1.5" fill="none" />
          </svg>
          Lock
        </button>

        {lockedNodes.length > 0 && (
          <>
            <div style={{ width: '100%', height: 1, background: '#e2e8f0', margin: '14px 0' }} />
            <LockedNodesList lockedNodes={lockedNodes} onUnlockNode={onUnlockNode} />
          </>
        )}
      </div>
    );
  }

  if (selectedEdge) {
    const d = selectedEdge.data as SynapseEdgeData | undefined;
    const synapseCount = d?.synapseCount ?? 0;
    const controlPointCount = d?.controlPoints?.length ?? 0;

    return (
      <div style={panelStyle}>
        <h3 style={headingStyle}>Edge</h3>

        <Field label="Synapse Count">
          <input
            type="number"
            min={0}
            value={synapseCount}
            onChange={(e) => onUpdateEdge(selectedEdge.id, { synapseCount: Math.max(0, Number(e.target.value)) })}
          />
        </Field>

        <Field label={`Label Position: ${((d?.labelPosition ?? 0.5) * 100).toFixed(0)}%`}>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={d?.labelPosition ?? 0.5}
            onChange={(e) => onUpdateEdge(selectedEdge.id, { labelPosition: Number(e.target.value) })}
          />
        </Field>

        <Field label="Control Points">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#64748b' }}>
              {controlPointCount} point{controlPointCount !== 1 ? 's' : ''}
            </span>
            {controlPointCount > 0 && (
              <button
                onClick={() => onUpdateEdge(selectedEdge.id, { controlPoints: [] })}
                style={{
                  background: '#fff5f5',
                  color: '#ef4444',
                  padding: '2px 8px',
                  border: '1px solid #fecaca',
                  fontSize: 11,
                }}
              >
                Clear
              </button>
            )}
          </div>
          <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>
            Double-click edge to add. Alt+click a point to remove.
          </p>
        </Field>

        <Field label="Connection">
          <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>
            {selectedEdge.source} → {selectedEdge.target}
          </span>
        </Field>

        {lockedNodes.length > 0 && (
          <>
            <div style={{ width: '100%', height: 1, background: '#e2e8f0', margin: '14px 0' }} />
            <LockedNodesList lockedNodes={lockedNodes} onUnlockNode={onUnlockNode} />
          </>
        )}
      </div>
    );
  }

  return null;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label>{label}</label>
      {children}
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  width: 220,
  position: 'absolute',
  top: 16,
  right: 16,
  zIndex: 10,
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: 10,
  padding: 16,
  boxShadow: '0 2px 12px #00000018',
};

const headingStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: '#6366f1',
  marginBottom: 16,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

function LockedNodesList({ lockedNodes, onUnlockNode }: { lockedNodes: Node[]; onUnlockNode: (id: string) => void }) {
  return (
    <div>
      <h3 style={{ ...headingStyle, marginBottom: 10, color: '#64748b' }}>
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" style={{ verticalAlign: 'middle', marginRight: 4 }}>
          <rect x="2" y="6" width="10" height="7" rx="1.5" fill="#64748b" />
          <path d="M4.5 6V4.5a2.5 2.5 0 015 0V6" stroke="#64748b" strokeWidth="1.5" fill="none" />
        </svg>
        Locked ({lockedNodes.length})
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {lockedNodes.map((n) => {
          const d = n.data as NeuronNodeData;
          return (
            <div
              key={n.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '3px 6px',
                borderRadius: 4,
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: d.shape === 'circle' ? '50%' : 2,
                  background: d.color,
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 11, color: '#334155', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {d.label}
              </span>
              <button
                onClick={() => onUnlockNode(n.id)}
                title="Unlock"
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '1px 4px',
                  cursor: 'pointer',
                  fontSize: 11,
                  color: '#6366f1',
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                Unlock
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

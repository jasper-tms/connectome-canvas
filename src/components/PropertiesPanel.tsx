import type { Node, Edge } from '@xyflow/react';
import type { NeuronNodeData, SynapseEdgeData } from '../types';

interface Props {
  selectedNode: Node | null;
  selectedEdge: Edge | null;
  onUpdateNode: (id: string, data: Partial<NeuronNodeData>) => void;
  onUpdateEdge: (id: string, data: Partial<SynapseEdgeData>) => void;
}

export default function PropertiesPanel({ selectedNode, selectedEdge, onUpdateNode, onUpdateEdge }: Props) {
  if (!selectedNode && !selectedEdge) {
    return (
      <div style={panelStyle}>
        <p style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', marginTop: 24 }}>
          Select a node or edge to edit its properties.
        </p>
      </div>
    );
  }

  if (selectedNode) {
    const d = selectedNode.data as NeuronNodeData;
    return (
      <div style={panelStyle}>
        <h3 style={headingStyle}>Node — {d.shape}</h3>

        <Field label="Label">
          <input
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

        {d.shape === 'rectangle' && (
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
        )}

        <Field label="ID">
          <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>{selectedNode.id}</span>
        </Field>
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

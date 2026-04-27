import { useState, useRef, useLayoutEffect, useEffect } from 'react';
import type { Node, Edge } from '@xyflow/react';
import type { NeuronNodeData, SynapseEdgeData, GlobalSettings, Neurotransmitter, NodeColorMode, EdgeColorMode, CustomPropertyType, CustomProperty } from '../types';

interface Props {
  selectedNode: Node | null;
  selectedEdge: Edge | null;
  onUpdateNode: (id: string, data: Partial<NeuronNodeData>) => void;
  onUpdateNodePosition: (id: string, pos: { x?: number; y?: number }) => void;
  onUpdateEdge: (id: string, data: Partial<SynapseEdgeData>) => void;
  lockedNodes: Node[];
  onUnlockNode: (id: string) => void;
  globalSettings: GlobalSettings;
  onUpdateGlobalSettings: (settings: GlobalSettings) => void;
}

export default function PropertiesPanel({ selectedNode, selectedEdge, onUpdateNode, onUpdateNodePosition, onUpdateEdge, lockedNodes, onUnlockNode, globalSettings, onUpdateGlobalSettings }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [caretHover, setCaretHover] = useState(false);

  if (!selectedNode && !selectedEdge) {
    return (
      <div style={{ ...panelStyle, width: collapsed ? 120 : 260, paddingBottom: collapsed ? 16 : 2, transition: 'width 0.2s ease, padding-bottom 0.2s ease' }}>
        <PanelHeader title="Settings" collapsed={collapsed} caretHover={caretHover} onToggle={() => setCollapsed(!collapsed)} onCaretHover={setCaretHover} />

        <CollapsibleContent collapsed={collapsed}>
          <Field label="Edge Width Mode">
            <div style={{ display: 'flex', gap: 0, borderRadius: 6, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
              {(['fixed', 'weighted'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => onUpdateGlobalSettings({ ...globalSettings, edgeWidthMode: mode })}
                  style={{
                    flex: 1,
                    padding: '4px 0',
                    fontSize: 11,
                    fontWeight: globalSettings.edgeWidthMode === mode ? 700 : 400,
                    background: globalSettings.edgeWidthMode === mode ? '#e2e8f0' : '#f8fafc',
                    color: '#64748b',
                    border: 'none',
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                  }}
                >
                  {mode}
                </button>
              ))}
            </div>
          </Field>

          {globalSettings.edgeWidthMode === 'fixed' && (
            <Field label="Edge Width: Fixed">
              <NumberInput
                min={0.1}
                max={100}
                step={0.1}
                value={globalSettings.fixedEdgeWidth}
                onCommit={(v) => onUpdateGlobalSettings({ ...globalSettings, fixedEdgeWidth: v })}
              />
            </Field>
          )}

          {globalSettings.edgeWidthMode === 'weighted' && (
            <Field label="Edge Width: Weighted">
              <NumberInput
                min={0.1}
                max={100}
                step={0.1}
                value={globalSettings.weightedEdgeWidth}
                onCommit={(v) => onUpdateGlobalSettings({ ...globalSettings, weightedEdgeWidth: v })}
              />
            </Field>
          )}

          <Field label="Node Color">
            <ColorModeButtons
              modes={COLOR_MODE_OPTIONS}
              active={globalSettings.nodeColorMode}
              onChange={(mode) => onUpdateGlobalSettings({ ...globalSettings, nodeColorMode: mode as NodeColorMode })}
            />
          </Field>

          <Field label="Edge Color">
            <ColorModeButtons
              modes={EDGE_COLOR_MODE_OPTIONS}
              active={globalSettings.edgeColorMode}
              onChange={(mode) => onUpdateGlobalSettings({ ...globalSettings, edgeColorMode: mode as EdgeColorMode })}
            />
          </Field>

          {lockedNodes.length > 0 && (
            <LockedNodesList lockedNodes={lockedNodes} onUnlockNode={onUnlockNode} />
          )}
        </CollapsibleContent>
      </div>
    );
  }

  if (selectedNode) {
    const d = selectedNode.data as NeuronNodeData;
    return (
      <div style={{ ...panelStyle, width: collapsed ? 120 : 260, paddingBottom: collapsed ? 16 : 2, transition: 'width 0.2s ease, padding-bottom 0.2s ease' }}>
        <PanelHeader title={`Node ${selectedNode.id}`} collapsed={collapsed} caretHover={caretHover} onToggle={() => setCollapsed(!collapsed)} onCaretHover={setCaretHover} />

        <CollapsibleContent collapsed={collapsed}>
          <Field label="Shape">
            <div style={{ display: 'flex', gap: 0, borderRadius: 6, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
              {(['circle', 'rectangle', 'arrow'] as const).map((s) => (
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

          <Field label="Font Size">
            <NumberInput
              min={8}
              max={48}
              value={d.fontSize ?? 12}
              onCommit={(v) => onUpdateNode(selectedNode.id, { fontSize: v })}
            />
          </Field>

          <Field label="Neurotransmitter">
            <select
              value={d.neurotransmitter ?? 'Other'}
              onChange={(e) => onUpdateNode(selectedNode.id, { neurotransmitter: e.target.value as Neurotransmitter })}
              style={{
                width: '100%',
                padding: '4px 6px',
                fontSize: 12,
                borderRadius: 6,
                border: '1px solid #e2e8f0',
                background: '#f8fafc',
                color: '#334155',
              }}
            >
              {(['ACh', 'GABA', 'Glut', 'Other'] as const).map((nt) => (
                <option key={nt} value={nt}>{nt}</option>
              ))}
            </select>
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
              <NumberInput
                value={Math.round(selectedNode.position.x)}
                style={{ flex: 1 }}
                onCommit={(v) => onUpdateNodePosition(selectedNode.id, { x: v })}
              />
              <label style={{ fontSize: 10, color: '#94a3b8', width: 12 }}>Y</label>
              <NumberInput
                value={Math.round(selectedNode.position.y)}
                style={{ flex: 1 }}
                onCommit={(v) => onUpdateNodePosition(selectedNode.id, { y: v })}
              />
            </div>
          </Field>

          {d.shape === 'circle' && (
            <Field label="Radius">
              <NumberInput
                min={10}
                max={200}
                value={d.radius ?? 35}
                onCommit={(v) => onUpdateNode(selectedNode.id, { radius: v })}
              />
            </Field>
          )}

          {(d.shape === 'rectangle' || d.shape === 'arrow') && (
            <>
              <Field label="Width">
                <NumberInput
                  min={20}
                  max={400}
                  value={d.width ?? 90}
                  onCommit={(v) => onUpdateNode(selectedNode.id, { width: v })}
                />
              </Field>

              <Field label="Height">
                <NumberInput
                  min={20}
                  max={200}
                  value={d.height ?? 44}
                  onCommit={(v) => onUpdateNode(selectedNode.id, { height: v })}
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

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={d.rotateLabel ?? true}
                    onChange={(e) => onUpdateNode(selectedNode.id, { rotateLabel: e.target.checked })}
                  />
                  <span style={{ fontSize: 11, color: '#64748b' }}>Rotate label</span>
                </label>
              </div>
            </>
          )}

          <CustomProperties
            properties={d.customProperties ?? {}}
            onChange={(props) => onUpdateNode(selectedNode.id, { customProperties: props })}
          />

          <div style={{ marginBottom: 14 }}>
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
          </div>

        </CollapsibleContent>
      </div>
    );
  }

  if (selectedEdge) {
    const d = selectedEdge.data as SynapseEdgeData | undefined;
    const synapseCount = d?.synapseCount ?? 0;
    const controlPointCount = d?.controlPoints?.length ?? 0;

    return (
      <div style={{ ...panelStyle, width: collapsed ? 120 : 260, paddingBottom: collapsed ? 16 : 2, transition: 'width 0.2s ease, padding-bottom 0.2s ease' }}>
        <PanelHeader title="Edge" collapsed={collapsed} caretHover={caretHover} onToggle={() => setCollapsed(!collapsed)} onCaretHover={setCaretHover} />

        <CollapsibleContent collapsed={collapsed}>
          <Field label="Synapse Count">
            <NumberInput
              min={0}
              value={synapseCount}
              onCommit={(v) => onUpdateEdge(selectedEdge.id, { synapseCount: v })}
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

        </CollapsibleContent>
      </div>
    );
  }

  return null;
}

interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'min' | 'max' | 'type'> {
  value: number;
  onCommit: (value: number) => void;
  min?: number;
  max?: number;
}

function NumberInput({ value, onCommit, min, max, onBlur, onKeyDown, onMouseDown, ...rest }: NumberInputProps) {
  const [draft, setDraft] = useState(String(value));
  const [editing, setEditing] = useState(false);
  // Tracks whether the next onChange came from typing (defer commit) or from a
  // spinner click / arrow key (commit immediately). Set by onKeyDown/onMouseDown
  // before onChange fires.
  const isTypingChange = useRef(false);

  useEffect(() => {
    if (!editing) setDraft(String(value));
  }, [value, editing]);

  function clamp(raw: string): number {
    let n = Number(raw);
    if (isNaN(n)) n = value;
    if (min !== undefined) n = Math.max(min, n);
    if (max !== undefined) n = Math.min(max, n);
    return n;
  }

  return (
    <input
      {...rest}
      type="number"
      min={min}
      max={max}
      value={draft}
      onChange={(e) => {
        const raw = e.target.value;
        setDraft(raw);
        setEditing(true);
        if (!isTypingChange.current) {
          const n = clamp(raw);
          if (n !== value) onCommit(n);
          setDraft(String(n));
        }
      }}
      onFocus={() => setEditing(true)}
      onBlur={(e) => {
        const n = clamp(draft);
        if (n !== value) onCommit(n);
        setDraft(String(n));
        setEditing(false);
        onBlur?.(e);
      }}
      onMouseDown={(e) => {
        // Default to "non-typing" — covers spinner clicks. Subsequent typing
        // sets it back to true via onKeyDown before onChange fires.
        isTypingChange.current = false;
        onMouseDown?.(e);
      }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          isTypingChange.current = false;
        } else if (e.key === 'Enter') {
          // Stop the global Enter handler from seeing this — we blur the input
          // synchronously below, which would otherwise let the global handler
          // deselect the node/edge.
          e.stopPropagation();
          (e.target as HTMLInputElement).blur();
        } else if (e.key === 'Escape') {
          e.stopPropagation();
          setDraft(String(value));
          setEditing(false);
          (e.target as HTMLInputElement).blur();
        } else {
          isTypingChange.current = true;
        }
        onKeyDown?.(e);
      }}
    />
  );
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
  width: 260,
  position: 'absolute',
  top: 16,
  right: 16,
  zIndex: 10,
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: 10,
  padding: '16px 16px 2px',
  boxShadow: '0 2px 12px #00000018',
};

const headingStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: '#6366f1',
  margin: 0,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

function PanelHeader({ title, collapsed, caretHover, onToggle, onCaretHover }: {
  title: string;
  collapsed: boolean;
  caretHover: boolean;
  onToggle: () => void;
  onCaretHover: (hover: boolean) => void;
}) {
  // Up when expanded, down when collapsed, right on hover (always)
  const rotation = caretHover ? (collapsed ? -90 : 270) : (collapsed ? 0 : 180);

  // Suppress transition for one frame when collapsed toggles while hovered,
  // so the -90 ↔ 270 swap (same visual angle) doesn't animate a 360° spin.
  const [suppressTransition, setSuppressTransition] = useState(false);
  const prevCollapsedRef = useRef(collapsed);
  useLayoutEffect(() => {
    if (prevCollapsedRef.current !== collapsed && caretHover) {
      setSuppressTransition(true);
      requestAnimationFrame(() => setSuppressTransition(false));
    }
    prevCollapsedRef.current = collapsed;
  }, [collapsed, caretHover]);
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: collapsed ? 0 : 16 }}>
      <h3 style={headingStyle}>{title}</h3>
      <button
        onClick={onToggle}
        onMouseEnter={() => onCaretHover(true)}
        onMouseLeave={() => onCaretHover(false)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        title={collapsed ? 'Expand' : 'Collapse'}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: suppressTransition ? 'none' : 'transform 0.2s ease',
          }}
        >
          <path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}

function CollapsibleContent({ collapsed, children }: { collapsed: boolean; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateRows: collapsed ? '0fr' : '1fr',
        opacity: collapsed ? 0 : 1,
        transition: 'grid-template-rows 0.2s ease, opacity 0.2s ease',
      }}
    >
      <div style={{ overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );
}

function colorModeLabel(mode: string): React.ReactNode {
  switch (mode) {
    case 'excit/inhib':
      return <><span style={{ color: '#ef4444' }}>Excit</span>/<span style={{ color: '#3b82f6' }}>Inhib</span></>;
    case 'neurotransmitter':
      return <><span style={{ color: '#ef4444' }}>ACh</span>/<span style={{ color: '#3b82f6' }}>GABA</span>/<span style={{ color: '#22c55e' }}>Glu</span></>;
    default:
      return mode.charAt(0).toUpperCase() + mode.slice(1);
  }
}

const COLOR_MODE_OPTIONS = ['manual', 'excit/inhib', 'neurotransmitter'] as const;
const EDGE_COLOR_MODE_OPTIONS = ['grey', 'excit/inhib', 'neurotransmitter'] as const;

function ColorModeButtons({ modes, active, onChange }: { modes: readonly string[]; active: string; onChange: (mode: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: 0, borderRadius: 6, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
      {modes.map((mode) => {
        const isActive = active === mode;
        return (
          <button
            key={mode}
            onClick={() => onChange(mode)}
            style={{
              flex: 1,
              padding: '4px 0',
              fontSize: 10,
              fontWeight: isActive ? 700 : 400,
              background: isActive ? '#e2e8f0' : '#f8fafc',
              color: '#64748b',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {colorModeLabel(mode)}
          </button>
        );
      })}
    </div>
  );
}

function CustomProperties({ properties, onChange }: { properties: Record<string, CustomProperty>; onChange: (props: Record<string, CustomProperty>) => void }) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<CustomPropertyType>('string');
  const [newValue, setNewValue] = useState('');

  const entries = Object.entries(properties);

  function handleAdd() {
    const name = newName.trim();
    if (!name || name in properties) return;
    let value: string | number;
    if (newType === 'int') {
      value = parseInt(newValue, 10);
      if (isNaN(value)) value = 0;
    } else if (newType === 'float') {
      value = parseFloat(newValue);
      if (isNaN(value)) value = 0;
    } else {
      value = newValue;
    }
    onChange({ ...properties, [name]: { type: newType, value } });
    setNewName('');
    setNewType('string');
    setNewValue('');
    setAdding(false);
  }

  function handleValueChange(key: string, raw: string) {
    const prop = properties[key];
    let value: string | number;
    if (prop.type === 'int') {
      value = parseInt(raw, 10);
      if (isNaN(value)) value = 0;
    } else if (prop.type === 'float') {
      value = parseFloat(raw);
      if (isNaN(value)) value = 0;
    } else {
      value = raw;
    }
    onChange({ ...properties, [key]: { ...prop, value } });
  }

  function handleRemove(key: string) {
    const next = { ...properties };
    delete next[key];
    onChange(next);
  }

  return (
    <div style={{ marginBottom: 14 }}>
      {entries.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          {entries.map(([key, prop]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: '#334155', flex: '0 0 auto', maxWidth: 70, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={key}>
                {key}
              </span>
              <span style={{ fontSize: 9, color: '#94a3b8', flex: '0 0 auto' }}>
                {prop.type}
              </span>
              {prop.type === 'string' ? (
                <input
                  type="text"
                  value={prop.value}
                  onChange={(e) => handleValueChange(key, e.target.value)}
                  style={{ flex: 1, minWidth: 0 }}
                />
              ) : (
                <NumberInput
                  step={prop.type === 'float' ? 'any' : undefined}
                  value={Number(prop.value)}
                  onCommit={(v) => handleValueChange(key, String(v))}
                  style={{ flex: 1, minWidth: 0 }}
                />
              )}
              <button
                onClick={() => handleRemove(key)}
                title="Remove property"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  fontSize: 14,
                  padding: '0 2px',
                  lineHeight: 1,
                  flexShrink: 0,
                }}
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      {adding ? (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <input
            type="text"
            placeholder="Property name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAdding(false); }}
          />
          <div style={{ display: 'flex', gap: 0, borderRadius: 4, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            {(['string', 'int', 'float'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setNewType(t)}
                style={{
                  flex: 1,
                  padding: '3px 0',
                  fontSize: 11,
                  fontWeight: newType === t ? 700 : 400,
                  background: newType === t ? '#6366f1' : '#fff',
                  color: newType === t ? '#fff' : '#64748b',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {t}
              </button>
            ))}
          </div>
          <input
            type={newType === 'string' ? 'text' : 'number'}
            step={newType === 'float' ? 'any' : undefined}
            placeholder="Value"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAdding(false); }}
          />
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              onClick={handleAdd}
              disabled={!newName.trim() || newName.trim() in properties}
              style={{
                flex: 1,
                padding: '4px 0',
                fontSize: 11,
                background: '#6366f1',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                opacity: !newName.trim() || newName.trim() in properties ? 0.5 : 1,
              }}
            >
              Add
            </button>
            <button
              onClick={() => { setAdding(false); setNewName(''); setNewValue(''); }}
              style={{
                flex: 1,
                padding: '4px 0',
                fontSize: 11,
                background: '#f8fafc',
                color: '#64748b',
                border: '1px solid #e2e8f0',
                borderRadius: 4,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          style={{
            width: '100%',
            padding: '5px 0',
            background: '#f8fafc',
            color: '#6366f1',
            border: '1px dashed #c7d2fe',
            borderRadius: 6,
            fontSize: 11,
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          + Add Property
        </button>
      )}
    </div>
  );
}

function LockedNodesList({ lockedNodes, onUnlockNode }: { lockedNodes: Node[]; onUnlockNode: (id: string) => void }) {
  return (
    <Field label={`Locked Nodes (${lockedNodes.length})`}>
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
    </Field>
  );
}

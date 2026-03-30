import { useState } from 'react';
import type { NeuronShape } from '../types';

interface ToolbarProps {
  projectName: string;
  onProjectNameChange: (name: string) => void;
  onAddNode: (shape: NeuronShape) => void;
  onDeleteSelected: () => void;
  hasSelection: boolean;
  onExport: () => void;
  onImport: () => void;
  onUndo: () => void;
  canUndo: boolean;
}

export default function Toolbar({
  projectName,
  onProjectNameChange,
  onAddNode,
  onDeleteSelected,
  hasSelection,
  onExport,
  onImport,
  onUndo,
  canUndo,
}: ToolbarProps) {
  const [labelHover, setLabelHover] = useState(false);
  const [iconHover, setIconHover] = useState<NeuronShape | null>(null);

  return (
    <div style={{
      position: 'absolute',
      top: 16,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 10,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 0,
    }}>
      {/* Main toolbar bar */}
      <div style={{
        display: 'flex',
        gap: 8,
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 10,
        padding: '8px 12px',
        alignItems: 'center',
        boxShadow: '0 2px 12px #00000018',
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#6366f1', marginRight: 4, letterSpacing: '-0.01em' }}>
          Connectome Canvas
        </span>

        <div style={{ width: 1, height: 20, background: '#e2e8f0', margin: '0 4px' }} />

        {/* New Node label + shape icons */}
        <div
          style={{ display: 'inline-flex', alignItems: 'stretch', gap: 0, borderRadius: 4 }}
          onMouseLeave={() => { setLabelHover(false); setIconHover(null); }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
              color: '#334155',
              cursor: 'default',
              userSelect: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              paddingRight: 2,
            }}
            onMouseEnter={() => { setLabelHover(true); setIconHover(null); }}
          >
            New Node:
          </span>
          {([
            { shape: 'circle' as NeuronShape, title: 'Add circle neuron', icon: (highlighted: boolean) => (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle cx="9" cy="9" r="6" stroke={highlighted ? '#4338ca' : '#94a3b8'} strokeWidth={highlighted ? 2.5 : 1.5} />
              </svg>
            )},
            { shape: 'rectangle' as NeuronShape, title: 'Add rectangle neuron', icon: (highlighted: boolean) => (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <rect x="2.5" y="5" width="13" height="8" rx="1.5" stroke={highlighted ? '#4338ca' : '#94a3b8'} strokeWidth={highlighted ? 2.5 : 1.5} />
              </svg>
            )},
            { shape: 'arrow' as NeuronShape, title: 'Add arrow neuron', icon: (highlighted: boolean) => (
              <svg width="20" height="18" viewBox="0 0 20 18" fill="none">
                <path d="M2 3 L13 3 L17 9 L13 15 L2 15 L6 9 Z" stroke={highlighted ? '#4338ca' : '#94a3b8'} strokeWidth={highlighted ? 2.5 : 1.5} strokeLinejoin="round" fill="none" />
              </svg>
            )},
          ]).map(({ shape, title, icon }) => {
            const highlighted = labelHover || iconHover === shape;
            return (
              <button
                key={shape}
                onClick={() => onAddNode(shape)}
                title={title}
                onMouseEnter={() => { setIconHover(shape); setLabelHover(false); }}
                style={{
                  background: highlighted ? '#eef2ff' : 'transparent',
                  border: 'none',
                  padding: '4px 3px',
                  margin: 0,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  borderRadius: 4,
                  transition: 'background 0.1s',
                }}
              >
                {icon(highlighted)}
              </button>
            );
          })}
        </div>

        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          style={btnStyle('#f8fafc')}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ verticalAlign: 'middle', marginRight: 5 }}>
            <path d="M2.5 5.5L5 3M2.5 5.5L5 8M2.5 5.5H9a2.5 2.5 0 110 5H7" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Undo
        </button>

        <button
          onClick={onDeleteSelected}
          disabled={!hasSelection}
          title="Delete selected (Del)"
          style={btnStyle('#fff5f5')}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ verticalAlign: 'middle', marginRight: 5 }}>
            <path d="M2 4h10M5 4V2.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5V4m1.5 0l-.7 7.3A.5.5 0 019.3 12H4.7a.5.5 0 01-.5-.47L3.5 4" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Delete
        </button>

        <div style={{ width: 1, height: 20, background: '#e2e8f0', margin: '0 4px' }} />

        <button onClick={onImport} style={btnStyle('#f0fdf4')} title="Import YAML (or JSON)">
          Import
        </button>
        <button onClick={onExport} style={btnStyle('#f0fdf4')} title="Export as YAML">
          Export
        </button>
      </div>

      {/* Project name below toolbar */}
      <input
        type="text"
        value={projectName}
        onChange={(e) => onProjectNameChange(e.target.value)}
        placeholder="Project name"
        style={{
          marginTop: 6,
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 6,
          padding: '4px 12px',
          fontSize: 13,
          color: '#334155',
          textAlign: 'center',
          width: 220,
          boxShadow: '0 2px 12px #00000018',
          outline: 'none',
        }}
      />
    </div>
  );
}

function btnStyle(bg: string): React.CSSProperties {
  return {
    background: bg,
    color: '#334155',
    padding: '5px 10px',
    border: '1px solid #e2e8f0',
    display: 'inline-flex',
    alignItems: 'center',
  };
}

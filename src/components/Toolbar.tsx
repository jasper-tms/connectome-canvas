interface ToolbarProps {
  projectName: string;
  onProjectNameChange: (name: string) => void;
  onAddCircle: () => void;
  onAddRect: () => void;
  onDeleteSelected: () => void;
  hasSelection: boolean;
  onExport: () => void;
  onImport: () => void;
}

export default function Toolbar({
  projectName,
  onProjectNameChange,
  onAddCircle,
  onAddRect,
  onDeleteSelected,
  hasSelection,
  onExport,
  onImport,
}: ToolbarProps) {
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

        <button onClick={onAddCircle} title="Add circle neuron" style={btnStyle('#f0f4ff')}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ verticalAlign: 'middle', marginRight: 5 }}>
            <circle cx="8" cy="8" r="6" stroke="#6366f1" strokeWidth="2" />
          </svg>
          Circle
        </button>

        <button onClick={onAddRect} title="Add rectangle neuron" style={btnStyle('#f0f4ff')}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ verticalAlign: 'middle', marginRight: 5 }}>
            <rect x="2" y="5" width="12" height="7" rx="1.5" stroke="#6366f1" strokeWidth="2" />
          </svg>
          Rect
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

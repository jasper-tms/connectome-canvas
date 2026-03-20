import { useState } from 'react';

interface Props {
  onImport: (text: string) => void;
  onClose: () => void;
}

export default function ImportModal({ onImport, onClose }: Props) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  function handleImport() {
    try {
      onImport(text);
      onClose();
    } catch (e) {
      setError(String(e));
    }
  }

  function handleFileLoad(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setText(ev.target?.result as string);
      setError('');
    };
    reader.readAsText(file);
  }

  return (
    <div style={overlayStyle} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={modalStyle}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: '#6366f1', marginBottom: 12 }}>
          Import Canvas
        </h2>

        <label style={{ marginBottom: 8, display: 'block' }}>
          Load from file
          <input
            type="file"
            accept=".json,.yaml,.yml"
            onChange={handleFileLoad}
            style={{ marginTop: 4, color: '#334155', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 4, padding: 4, width: '100%', fontSize: 12 }}
          />
        </label>

        <label style={{ marginBottom: 4 }}>Or paste YAML / JSON</label>
        <textarea
          value={text}
          onChange={(e) => { setText(e.target.value); setError(''); }}
          rows={12}
          style={{
            width: '100%',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 6,
            color: '#1e293b',
            fontFamily: 'monospace',
            fontSize: 12,
            padding: 8,
            resize: 'vertical',
            outline: 'none',
            marginBottom: 8,
          }}
          placeholder='nodes: []&#10;edges: []'
        />

        {error && (
          <p style={{ color: '#ef4444', fontSize: 12, marginBottom: 8, fontFamily: 'monospace' }}>
            {error}
          </p>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ background: '#f1f5f9', color: '#64748b', padding: '6px 14px', border: '1px solid #e2e8f0' }}>
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!text.trim()}
            style={{ background: '#6366f1', color: '#ffffff', padding: '6px 14px', border: 'none' }}
          >
            Import
          </button>
        </div>
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: '#00000040',
  zIndex: 100,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const modalStyle: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: 12,
  padding: 24,
  width: 480,
  maxWidth: '90vw',
  boxShadow: '0 8px 40px #00000020',
};

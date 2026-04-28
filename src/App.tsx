import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  type OnConnect,
  type ReactFlowInstance,
  type Viewport,
  MarkerType,
  BackgroundVariant,
  ConnectionMode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import NeuronNode, { pendingAngles } from './nodes/NeuronNode';
import SynapseEdge from './edges/SynapseEdge';
import ConnectionLine, { lastConnectionEndPos } from './components/ConnectionLine';
import Toolbar from './components/Toolbar';
import PropertiesPanel from './components/PropertiesPanel';
import ImportModal from './components/ImportModal';
import type { NeuronNodeData, SynapseEdgeData, ControlPoint, GlobalSettings, Neurotransmitter } from './types';
import { ntColor } from './types';
import {
  serializeCanvas,
  deserializeCanvas,
  exportAsYaml,
  importFromText,
  downloadFile,
} from './utils/serialize';
import { encodeState, decodeState, getStateFromUrl, setUrlState } from './utils/urlState';

const nodeTypes = { neuron: NeuronNode };
const edgeTypes = { synapse: SynapseEdge };

let idCounter = 1;
function nextId() { return String(idCounter++); }

const COLORS = ['#6ee7b7', '#7c8cff', '#f9a8d4', '#fcd34d', '#6dd6fa', '#f87171', '#a78bfa'];
function nextColor() { return COLORS[(idCounter - 1) % COLORS.length]; }

const DEFAULT_EDGE_OPTIONS = {
  type: 'synapse',
  markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
};

// Check synchronously so we can skip generating defaults when a URL state exists
const INITIAL_URL_STATE = getStateFromUrl();

const INITIAL_NODES: Node[] = [
  {
    id: nextId(),
    type: 'neuron',
    position: { x: 200, y: 200 },
    data: { label: 'AVAL', color: '#6ee7b7', shape: 'circle', neurotransmitter: 'Other', rotation: 0 } satisfies NeuronNodeData,
  },
  {
    id: nextId(),
    type: 'neuron',
    position: { x: 420, y: 200 },
    data: { label: 'AVAR', color: '#7c8cff', shape: 'circle', neurotransmitter: 'Other', rotation: 0 } satisfies NeuronNodeData,
  },
  {
    id: nextId(),
    type: 'neuron',
    position: { x: 310, y: 340 },
    data: { label: 'DB01', color: '#f9a8d4', shape: 'rectangle', neurotransmitter: 'Other', rotation: 15 } satisfies NeuronNodeData,
  },
];

const INITIAL_EDGES: Edge[] = [
  {
    id: 'e1',
    source: '1',
    target: '2',
    type: 'synapse',
    markerEnd: { type: MarkerType.ArrowClosed },
    data: { synapseCount: 22, controlPoints: [] } satisfies SynapseEdgeData,
  },
  {
    id: 'e2',
    source: '1',
    target: '3',
    type: 'synapse',
    markerEnd: { type: MarkerType.ArrowClosed },
    data: { synapseCount: 8, controlPoints: [] } satisfies SynapseEdgeData,
  },
];

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_URL_STATE ? [] : INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_URL_STATE ? [] : INITIAL_EDGES);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [projectName, setProjectName] = useState('untitled');
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>({
    edgeWidthMode: 'fixed',
    fixedEdgeWidth: 1.5,
    weightedEdgeWidth: 1.5,
    nodeColorMode: 'manual',
    edgeColorMode: 'grey',
  });
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstanceRef = useRef<ReactFlowInstance | null>(null);

  // Latest viewport. Tracked in a ref (not state) so viewport changes do not
  // re-run the state-save effect — viewport is persisted to the URL but is
  // intentionally NOT pushed to undo history (undo should only revert content).
  const viewportRef = useRef<Viewport | null>(null);
  // Latest selection. Mirrors selectedNodeId/selectedEdgeId for use by async
  // serializers — selection is persisted to the URL but selection-only changes
  // are intentionally not pushed to undo history.
  const selectionRef = useRef<{ id: string; type: 'node' | 'edge' } | null>(null);
  // Initial-view coordination. We do NOT use ReactFlow's `fitView` prop because
  // it defers its first fit until nodes have measurements, which races with our
  // async load and clobbers a setViewport from saved state. Instead, we drive
  // the initial view ourselves once both the URL state has loaded and the
  // ReactFlow instance is ready.
  const initialViewAppliedRef = useRef(false);
  const loadedInitialViewRef = useRef<Viewport | 'fit' | null>(null);

  // ── History / undo ──
  const [history, setHistory] = useState<string[]>([]);
  const isRestoringRef = useRef(false);
  const debounceRef = useRef<number>(0);
  const initializedRef = useRef(false);
  const MAX_HISTORY = 100;

  // Load state from URL on mount, or snapshot the initial state
  useEffect(() => {
    (async () => {
      const encoded = INITIAL_URL_STATE;
      if (encoded) {
        try {
          const state = await decodeState(encoded);
          const { nodes: newNodes, edges: newEdges } = deserializeCanvas(state);
          isRestoringRef.current = true;
          setNodes(newNodes);
          setEdges(newEdges);
          if (state.projectName) setProjectName(state.projectName);
          if (state.globalSettings) setGlobalSettings(state.globalSettings);
          if (state.viewport) {
            viewportRef.current = state.viewport;
            loadedInitialViewRef.current = state.viewport;
          } else {
            // Legacy URL state without viewport — fit to nodes.
            loadedInitialViewRef.current = 'fit';
          }
          const sel = state.selection ?? null;
          selectionRef.current = sel;
          setSelectedNodeId(sel?.type === 'node' ? sel.id : null);
          setSelectedEdgeId(sel?.type === 'edge' ? sel.id : null);
          const allIds = [...newNodes.map((n) => Number(n.id)), ...newEdges.map((e) => Number(e.id.replace(/\D/g, '')) || 0)];
          idCounter = Math.max(idCounter, ...allIds) + 1;
          setHistory([encoded]);
        } catch {
          const state = serializeCanvas(INITIAL_NODES, INITIAL_EDGES, 'untitled');
          const enc = await encodeState(state);
          setHistory([enc]);
          setUrlState(enc);
          loadedInitialViewRef.current = 'fit';
        }
      } else {
        const state = serializeCanvas(INITIAL_NODES, INITIAL_EDGES, 'untitled');
        const enc = await encodeState(state);
        setHistory([enc]);
        setUrlState(enc);
        loadedInitialViewRef.current = 'fit';
      }
      initializedRef.current = true;
      applyInitialView();
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced: encode current state → push to history + update URL
  useEffect(() => {
    if (!initializedRef.current) return;
    if (isRestoringRef.current) {
      isRestoringRef.current = false;
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      const state = serializeCanvas(nodes, edges, projectName, globalSettings, viewportRef.current ?? undefined, selectionRef.current);
      const encoded = await encodeState(state);
      setUrlState(encoded);
      setHistory((prev) => {
        // Skip if identical to latest entry (e.g. after undo restore)
        if (prev.length > 0 && prev[prev.length - 1] === encoded) return prev;
        const next = [...prev, encoded];
        return next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next;
      });
    }, 500);
    return () => clearTimeout(debounceRef.current);
  }, [nodes, edges, projectName, globalSettings]); // eslint-disable-line react-hooks/exhaustive-deps

  const canUndo = history.length > 1;

  async function handleUndo() {
    if (history.length <= 1) return;
    clearTimeout(debounceRef.current);
    const newHistory = history.slice(0, -1);
    const encoded = newHistory[newHistory.length - 1];
    try {
      const state = await decodeState(encoded);
      const { nodes: newNodes, edges: newEdges } = deserializeCanvas(state);
      isRestoringRef.current = true;
      setNodes(newNodes);
      setEdges(newEdges);
      if (state.projectName) setProjectName(state.projectName);
      if (state.globalSettings) setGlobalSettings(state.globalSettings);
      setHistory(newHistory);
      setUrlState(encoded);
      const sel = state.selection ?? null;
      selectionRef.current = sel;
      setSelectedNodeId(sel?.type === 'node' ? sel.id : null);
      setSelectedEdgeId(sel?.type === 'edge' ? sel.id : null);
      const allIds = [...newNodes.map((n) => Number(n.id)), ...newEdges.map((e) => Number(e.id.replace(/\D/g, '')) || 0)];
      idCounter = Math.max(idCounter, ...allIds) + 1;
    } catch {
      setHistory(newHistory);
    }
  }

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null;
  const selectedEdge = edges.find((e) => e.id === selectedEdgeId) ?? null;
  const hasSelection = !!(selectedNodeId || selectedEdgeId);

  // Set selectable/draggable/connectable to false for locked nodes
  const interactiveNodes = useMemo(
    () => nodes.map((n) => {
      const data = n.data as NeuronNodeData;
      const locked = !!data.locked;
      // Clip the .react-flow__node wrapper to a circle so drag/hit detection
      // follows the visible circle, not its bounding rectangle. Radius is
      // (visible radius + 8) to preserve the 8px border zone where clicks
      // start a connection (matches the Handle size in NeuronNode.tsx).
      const style = data.shape === 'circle'
        ? { clipPath: `circle(${(data.radius ?? 35) + 8}px)` }
        : undefined;
      const withSettings = { ...n, data: { ...n.data, globalSettings }, style };
      return locked
        ? { ...withSettings, selectable: false, draggable: false, connectable: false }
        : withSettings;
    }),
    [nodes, globalSettings],
  );

  const lockedNodes = useMemo(
    () => nodes.filter((n) => !!(n.data as NeuronNodeData).locked),
    [nodes],
  );

  // Callback for edge components to update their control points
  const onControlPointsChange = useCallback(
    (edgeId: string, points: ControlPoint[]) => {
      setEdges((eds) =>
        eds.map((e) =>
          e.id === edgeId ? { ...e, data: { ...e.data, controlPoints: points } } : e,
        ),
      );
    },
    [setEdges],
  );

  // Callback for edge components to update the label position
  const onLabelPositionChange = useCallback(
    (edgeId: string, t: number) => {
      setEdges((eds) =>
        eds.map((e) =>
          e.id === edgeId ? { ...e, data: { ...e.data, labelPosition: t } } : e,
        ),
      );
    },
    [setEdges],
  );

  // Callback for edge components to update source/target attachment angles
  const onAngleChange = useCallback(
    (edgeId: string, end: 'source' | 'target', angle: number) => {
      setEdges((eds) =>
        eds.map((e) =>
          e.id === edgeId
            ? { ...e, data: { ...e.data, [end === 'source' ? 'sourceAngle' : 'targetAngle']: angle } }
            : e,
        ),
      );
    },
    [setEdges],
  );

  // Inject the callbacks into every edge's data
  const enrichedEdges = useMemo(
    () =>
      edges.map((e) => {
        const srcNode = nodes.find((n) => n.id === e.source);
        const sourceNeurotransmitter: Neurotransmitter = (srcNode?.data as NeuronNodeData)?.neurotransmitter ?? 'Other';
        return {
          ...e,
          data: { ...e.data, onControlPointsChange, onLabelPositionChange, onAngleChange, globalSettings, sourceNeurotransmitter },
        };
      }),
    [edges, nodes, onControlPointsChange, onLabelPositionChange, onAngleChange, globalSettings],
  );

  const onSelectionChange = useCallback(({ nodes: sNodes, edges: sEdges }: { nodes: Node[]; edges: Edge[] }) => {
    setSelectedNodeId(sNodes.length === 1 ? sNodes[0].id : null);
    setSelectedEdgeId(sEdges.length === 1 ? sEdges[0].id : null);
  }, []);

  // Selection changes are persisted to the URL but do NOT push to history —
  // selection-only changes shouldn't be undoable. The debounced state-save
  // effect picks up selectionRef on the next content/setting change.
  useEffect(() => {
    const sel: { id: string; type: 'node' | 'edge' } | null = selectedNodeId
      ? { id: selectedNodeId, type: 'node' }
      : selectedEdgeId
      ? { id: selectedEdgeId, type: 'edge' }
      : null;
    selectionRef.current = sel;
    if (!initializedRef.current) return;
    let cancelled = false;
    (async () => {
      const state = serializeCanvas(
        nodes,
        edges,
        projectName,
        globalSettings,
        viewportRef.current ?? undefined,
        sel,
      );
      const encoded = await encodeState(state);
      if (!cancelled) setUrlState(encoded);
    })();
    return () => { cancelled = true; };
  }, [selectedNodeId, selectedEdgeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const onNodeDoubleClick = useCallback((_event: React.MouseEvent, _node: Node) => {
    // Focus the label input in the properties panel and select all text
    requestAnimationFrame(() => {
      const input = document.getElementById('node-label-input') as HTMLInputElement | null;
      if (input) {
        input.focus();
        input.select();
      }
    });
  }, []);

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      // Read the angle captured by the source node's onMouseDown handler.
      // Default: source exits to the right (0°).
      const sourceAngle = pendingAngles.get(connection.source) ?? 0;
      pendingAngles.delete(connection.source);
      pendingAngles.delete(connection.target);

      // Calculate target angle from the target node center to the connection end position.
      // This matches how ConnectionLine calculates the angle during the drag preview.
      let targetAngle = 180;
      const targetNode = nodes.find((n) => n.id === connection.target);
      if (targetNode) {
        const dx = lastConnectionEndPos.x - targetNode.position.x;
        const dy = lastConnectionEndPos.y - targetNode.position.y;
        targetAngle = Math.atan2(dy, dx) * (180 / Math.PI);
      }

      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            ...DEFAULT_EDGE_OPTIONS,
            id: `e${nextId()}`,
            data: {
              synapseCount: 0,
              controlPoints: [],
              sourceAngle,
              targetAngle,
            } satisfies SynapseEdgeData,
          },
          eds,
        ),
      );
    },
    [setEdges, nodes],
  );

  function addNode(shape: 'circle' | 'rectangle' | 'arrow') {
    const id = nextId();
    const color = nextColor();
    // Spawn at the center of the current viewport, with a small random jitter
    // so consecutive new nodes don't fully stack on top of each other.
    const wrapper = reactFlowWrapper.current;
    const instance = reactFlowInstanceRef.current;
    let position: { x: number; y: number };
    if (wrapper && instance) {
      const rect = wrapper.getBoundingClientRect();
      const center = instance.screenToFlowPosition({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      });
      position = {
        x: center.x + (Math.random() - 0.5) * 40,
        y: center.y + (Math.random() - 0.5) * 40,
      };
    } else {
      position = { x: 200 + Math.random() * 200, y: 200 + Math.random() * 200 };
    }
    const node: Node = {
      id,
      type: 'neuron',
      position,
      data: { label: `N${id}`, color, shape, neurotransmitter: 'Other', rotation: 0 } satisfies NeuronNodeData,
    };
    setNodes((nds) => [...nds, node]);
  }

  function deleteSelected() {
    if (selectedNodeId) {
      setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));
      setEdges((eds) => eds.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId));
      setSelectedNodeId(null);
    }
    if (selectedEdgeId) {
      setEdges((eds) => eds.filter((e) => e.id !== selectedEdgeId));
      setSelectedEdgeId(null);
    }
  }

  function updateNodeData(id: string, patch: Partial<NeuronNodeData>) {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id !== id) return n;
        const updated = { ...n, data: { ...n.data, ...patch } };
        // When locking, also clear XYFlow's internal selected state
        if (patch.locked) updated.selected = false;
        return updated;
      }),
    );
    if (patch.locked) {
      setSelectedNodeId(null);
    }
  }

  function updateNodePosition(id: string, pos: { x?: number; y?: number }) {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id
          ? { ...n, position: { x: pos.x ?? n.position.x, y: pos.y ?? n.position.y } }
          : n,
      ),
    );
  }

  function updateEdgeData(id: string, patch: Partial<SynapseEdgeData>) {
    setEdges((eds) =>
      eds.map((e) => (e.id === id ? { ...e, data: { ...e.data, ...patch } } : e)),
    );
  }

  function handleExport() {
    const slug = projectName.trim().replace(/\s+/g, '_') || 'untitled';
    downloadFile(
      exportAsYaml(serializeCanvas(nodes, edges, projectName, globalSettings, undefined, selectionRef.current)),
      `connectome-canvas_${slug}.yaml`,
    );
  }

  function handleImport(text: string) {
    const state = importFromText(text);
    const { nodes: newNodes, edges: newEdges } = deserializeCanvas(state);
    setNodes(newNodes);
    setEdges(newEdges);
    const sel = state.selection ?? null;
    selectionRef.current = sel;
    setSelectedNodeId(sel?.type === 'node' ? sel.id : null);
    setSelectedEdgeId(sel?.type === 'edge' ? sel.id : null);
    if (state.projectName) setProjectName(state.projectName);
    if (state.globalSettings) setGlobalSettings(state.globalSettings);
    if (state.viewport && reactFlowInstanceRef.current) {
      viewportRef.current = state.viewport;
      reactFlowInstanceRef.current.setViewport(state.viewport);
    }
    const allIds = [...newNodes.map((n) => Number(n.id)), ...newEdges.map((e) => Number(e.id.replace(/\D/g, '')) || 0)];
    idCounter = Math.max(idCounter, ...allIds) + 1;
  }

  // Global key handlers
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey && !isInputActive()) {
        e.preventDefault();
        handleUndo();
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isInputActive()) {
        deleteSelected();
      }
      if (e.key === 'Enter') {
        // If an input is focused, just blur it (commits its value) and stop —
        // don't also deselect the node/edge being edited.
        if (isInputActive()) {
          (document.activeElement as HTMLElement).blur();
          return;
        }
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
        // Also clear XYFlow's internal selection
        setNodes((nds) => nds.map((n) => ({ ...n, selected: false })));
        setEdges((eds) => eds.map((e) => ({ ...e, selected: false })));
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  // Apply the initial view (saved viewport or fit-to-nodes) once both the
  // ReactFlow instance and the loaded URL state are ready. Idempotent.
  const applyInitialView = useCallback(() => {
    if (initialViewAppliedRef.current) return;
    const instance = reactFlowInstanceRef.current;
    const target = loadedInitialViewRef.current;
    if (!instance || target === null) return;
    initialViewAppliedRef.current = true;
    if (target === 'fit') {
      // Wait for node measurements before fitting.
      requestAnimationFrame(() => {
        const inst = reactFlowInstanceRef.current;
        if (!inst) return;
        inst.fitView();
        viewportRef.current = inst.getViewport();
      });
    } else {
      instance.setViewport(target);
      viewportRef.current = target;
    }
  }, []);

  // ReactFlow infers a stricter Node generic from `interactiveNodes`; widen here.
  const onInit = useCallback((rawInstance: unknown) => {
    const instance = rawInstance as ReactFlowInstance;
    reactFlowInstanceRef.current = instance;
    applyInitialView();
  }, [applyInitialView]);

  // Fires when the user finishes a pan/zoom gesture. Persist viewport to the URL
  // (and viewportRef) but do NOT push to history — viewport is not undoable.
  const onMoveEnd = useCallback(
    async (_event: MouseEvent | TouchEvent | null, vp: Viewport) => {
      viewportRef.current = vp;
      if (!initializedRef.current) return;
      const state = serializeCanvas(nodes, edges, projectName, globalSettings, vp, selectionRef.current);
      const encoded = await encodeState(state);
      setUrlState(encoded);
    },
    [nodes, edges, projectName, globalSettings],
  );

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <div ref={reactFlowWrapper} style={{ width: '100%', height: '100%' }}>
        <ReactFlow
          nodes={interactiveNodes}
          edges={enrichedEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={onInit as any}
          onMoveEnd={onMoveEnd}
          onSelectionChange={onSelectionChange}
          onNodeDoubleClick={onNodeDoubleClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
          minZoom={0.25}
          maxZoom={20}
          connectionMode={ConnectionMode.Loose}
          connectionLineComponent={ConnectionLine}
          nodeOrigin={[0.5, 0.5]}
          snapToGrid
          snapGrid={[1, 1]}
          proOptions={{ hideAttribution: false }}
          style={{ background: '#ffffff' }}
          deleteKeyCode={null}
          onDoubleClick={(e) => e.preventDefault()}
          zoomOnDoubleClick={false}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={24}
            size={1}
            color="#cbd5e1"
          />
          <Controls
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
            }}
          />
          <MiniMap
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
            }}
            nodeColor={(n) => {
              const d = n.data as NeuronNodeData;
              if (globalSettings.nodeColorMode === 'manual') return d.color ?? '#94a3b8';
              return ntColor(d.neurotransmitter ?? 'Other', globalSettings.nodeColorMode);
            }}
            maskColor="#ffffff80"
          />
        </ReactFlow>
      </div>

      <Toolbar
        projectName={projectName}
        onProjectNameChange={setProjectName}
        onAddNode={addNode}
        onDeleteSelected={deleteSelected}
        hasSelection={hasSelection}
        onExport={handleExport}
        onImport={() => setShowImport(true)}
        onUndo={handleUndo}
        canUndo={canUndo}
      />

      <PropertiesPanel
        selectedNode={selectedNode}
        selectedEdge={selectedEdge}
        onUpdateNode={updateNodeData}
        onUpdateNodePosition={updateNodePosition}
        onUpdateEdge={updateEdgeData}
        lockedNodes={lockedNodes}
        onUnlockNode={(id) => updateNodeData(id, { locked: false })}
        globalSettings={globalSettings}
        onUpdateGlobalSettings={setGlobalSettings}
      />

      {showImport && (
        <ImportModal
          onImport={handleImport}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}

function isInputActive(): boolean {
  const el = document.activeElement;
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
}

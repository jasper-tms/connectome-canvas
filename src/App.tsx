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
  const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES);
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

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null;
  const selectedEdge = edges.find((e) => e.id === selectedEdgeId) ?? null;
  const hasSelection = !!(selectedNodeId || selectedEdgeId);

  // Set selectable/draggable/connectable to false for locked nodes
  const interactiveNodes = useMemo(
    () => nodes.map((n) => {
      const locked = !!(n.data as NeuronNodeData).locked;
      const withSettings = { ...n, data: { ...n.data, globalSettings } };
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
        const nodeWidth = (targetNode as any).measured?.width ?? 90;
        const nodeHeight = (targetNode as any).measured?.height ?? 44;
        const cx = targetNode.position.x + nodeWidth / 2;
        const cy = targetNode.position.y + nodeHeight / 2;
        const dx = lastConnectionEndPos.x - cx;
        const dy = lastConnectionEndPos.y - cy;
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
    const node: Node = {
      id,
      type: 'neuron',
      position: { x: 200 + Math.random() * 200, y: 200 + Math.random() * 200 },
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
      exportAsYaml(serializeCanvas(nodes, edges, projectName, globalSettings)),
      `connectome-canvas_${slug}.yaml`,
    );
  }

  function handleImport(text: string) {
    const state = importFromText(text);
    const { nodes: newNodes, edges: newEdges } = deserializeCanvas(state);
    setNodes(newNodes);
    setEdges(newEdges);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    if (state.projectName) setProjectName(state.projectName);
    if (state.globalSettings) setGlobalSettings(state.globalSettings);
    const allIds = [...newNodes.map((n) => Number(n.id)), ...newEdges.map((e) => Number(e.id.replace(/\D/g, '')) || 0)];
    idCounter = Math.max(idCounter, ...allIds) + 1;
  }

  // Global key handlers
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isInputActive()) {
        deleteSelected();
      }
      if (e.key === 'Enter') {
        // Blur any focused input, then deselect all nodes/edges
        if (isInputActive()) {
          (document.activeElement as HTMLElement).blur();
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

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <div ref={reactFlowWrapper} style={{ width: '100%', height: '100%' }}>
        <ReactFlow
          nodes={interactiveNodes}
          edges={enrichedEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onSelectionChange={onSelectionChange}
          onNodeDoubleClick={onNodeDoubleClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
          fitView
          minZoom={0.25}
          maxZoom={20}
          connectionMode={ConnectionMode.Loose}
          connectionLineComponent={ConnectionLine}
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

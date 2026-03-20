import type { Node, Edge } from '@xyflow/react';
import yaml from 'js-yaml';
import type { NeuronNodeData, SynapseEdgeData, CanvasState, SerializedNode, SerializedEdge } from '../types';

export function serializeCanvas(nodes: Node[], edges: Edge[], projectName?: string): CanvasState {
  const serializedNodes: SerializedNode[] = nodes.map((n) => {
    const d = n.data as NeuronNodeData;
    return {
      id: n.id,
      shape: d.shape,
      position: { x: Math.round(n.position.x), y: Math.round(n.position.y) },
      label: d.label,
      color: d.color,
      rotation: d.rotation ?? 0,
    };
  });

  const serializedEdges: SerializedEdge[] = edges.map((e) => {
    const d = e.data as SynapseEdgeData | undefined;
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle ?? null,
      targetHandle: e.targetHandle ?? null,
      synapseCount: d?.synapseCount ?? 0,
      controlPoints: (d?.controlPoints ?? []).map((p) => ({
        x: Math.round(p.x),
        y: Math.round(p.y),
      })),
    };
  });

  return { projectName: projectName || 'untitled', nodes: serializedNodes, edges: serializedEdges };
}

export function deserializeCanvas(state: CanvasState): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = state.nodes.map((n) => ({
    id: n.id,
    type: 'neuron',
    position: n.position,
    data: {
      label: n.label,
      color: n.color,
      shape: n.shape,
      rotation: n.rotation ?? 0,
    } satisfies NeuronNodeData,
  }));

  const edges: Edge[] = state.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle ?? undefined,
    targetHandle: e.targetHandle ?? undefined,
    type: 'synapse',
    markerEnd: { type: 'arrowclosed' } as any,
    data: {
      synapseCount: e.synapseCount,
      controlPoints: e.controlPoints ?? [],
    } satisfies SynapseEdgeData,
  }));

  return { nodes, edges };
}

export function exportAsYaml(state: CanvasState): string {
  return yaml.dump(state, { lineWidth: 120 });
}

export function importFromText(text: string): CanvasState {
  const trimmed = text.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return JSON.parse(trimmed) as CanvasState;
  }
  return yaml.load(trimmed) as CanvasState;
}

export function downloadFile(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

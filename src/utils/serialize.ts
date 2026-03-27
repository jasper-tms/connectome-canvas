import type { Node, Edge } from '@xyflow/react';
import yaml from 'js-yaml';
import type { NeuronNodeData, SynapseEdgeData, CanvasState, SerializedNode, SerializedEdge, GlobalSettings } from '../types';

export function serializeCanvas(nodes: Node[], edges: Edge[], projectName?: string, globalSettings?: GlobalSettings): CanvasState {
  const serializedNodes: SerializedNode[] = nodes.map((n) => {
    const d = n.data as NeuronNodeData;
    const node: SerializedNode = {
      id: n.id,
      shape: d.shape,
      position: { x: Math.round(n.position.x), y: Math.round(n.position.y) },
      label: d.label,
      color: d.color,
      rotation: d.rotation ?? 0,
    };
    if (d.shape === 'circle' && d.radius !== undefined) node.radius = d.radius;
    if (d.shape === 'rectangle' && d.width !== undefined) node.width = d.width;
    if (d.shape === 'rectangle' && d.height !== undefined) node.height = d.height;
    if (d.fontSize !== undefined) node.fontSize = d.fontSize;
    if (d.locked) node.locked = true;
    return node;
  });

  const serializedEdges: SerializedEdge[] = edges.map((e) => {
    const d = e.data as SynapseEdgeData | undefined;
    const serialized: SerializedEdge = {
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
    if (d?.labelPosition !== undefined) serialized.labelPosition = d.labelPosition;
    if (d?.sourceAngle !== undefined) serialized.sourceAngle = d.sourceAngle;
    if (d?.targetAngle !== undefined) serialized.targetAngle = d.targetAngle;
    return serialized;
  });

  const result: CanvasState = { projectName: projectName || 'untitled', nodes: serializedNodes, edges: serializedEdges };
  if (globalSettings) result.globalSettings = globalSettings;
  return result;
}

export function deserializeCanvas(state: CanvasState): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = state.nodes.map((n) => {
    const data: NeuronNodeData = {
      label: n.label,
      color: n.color,
      shape: n.shape,
      rotation: n.rotation ?? 0,
    };
    if (n.radius !== undefined) data.radius = n.radius;
    if (n.width !== undefined) data.width = n.width;
    if (n.height !== undefined) data.height = n.height;
    if (n.fontSize !== undefined) data.fontSize = n.fontSize;
    if (n.locked) data.locked = true;
    return {
      id: n.id,
      type: 'neuron',
      position: n.position,
      data,
    };
  });

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
      ...(e.labelPosition !== undefined ? { labelPosition: e.labelPosition } : {}),
      ...(e.sourceAngle !== undefined ? { sourceAngle: e.sourceAngle } : {}),
      ...(e.targetAngle !== undefined ? { targetAngle: e.targetAngle } : {}),
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

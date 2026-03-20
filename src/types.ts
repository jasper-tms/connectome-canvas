export type NeuronShape = 'circle' | 'rectangle';

export interface ControlPoint {
  x: number;
  y: number;
}

export interface NeuronNodeData {
  label: string;
  color: string;
  shape: NeuronShape;
  rotation: number; // degrees, used for rectangle orientation
  [key: string]: unknown;
}

export interface SynapseEdgeData {
  synapseCount: number;
  controlPoints: ControlPoint[];
  onControlPointsChange?: (edgeId: string, points: ControlPoint[]) => void;
  [key: string]: unknown;
}

// Plain serializable canvas state
export interface SerializedNode {
  id: string;
  shape: NeuronShape;
  position: { x: number; y: number };
  label: string;
  color: string;
  rotation: number;
}

export interface SerializedEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  synapseCount: number;
  controlPoints: ControlPoint[];
}

export interface CanvasState {
  projectName?: string;
  nodes: SerializedNode[];
  edges: SerializedEdge[];
}

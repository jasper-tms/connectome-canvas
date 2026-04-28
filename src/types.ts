export type NeuronShape = 'circle' | 'rectangle' | 'arrow';
export type CustomPropertyType = 'string' | 'int' | 'float';
export interface CustomProperty {
  type: CustomPropertyType;
  value: string | number;
}
export type Neurotransmitter = 'ACh' | 'GABA' | 'Glut' | 'Other';
export type NodeColorMode = 'manual' | 'excit/inhib' | 'neurotransmitter';
export type EdgeColorMode = 'grey' | 'excit/inhib' | 'neurotransmitter';

export function ntColor(nt: Neurotransmitter, mode: 'excit/inhib' | 'neurotransmitter'): string {
  if (mode === 'excit/inhib') {
    return nt === 'ACh' ? '#ef4444' : nt === 'Other' ? '#94a3b8' : '#3b82f6';
  }
  switch (nt) {
    case 'ACh': return '#ef4444';
    case 'GABA': return '#3b82f6';
    case 'Glut': return '#22c55e';
    default: return '#94a3b8';
  }
}

export interface ControlPoint {
  x: number;
  y: number;
}

export interface NeuronNodeData {
  label: string;
  color: string;
  shape: NeuronShape;
  neurotransmitter: Neurotransmitter;
  rotation: number; // degrees, used for rectangle orientation
  rotateLabel?: boolean; // when true, rotate the text label along with the shape
  radius?: number;  // for circle nodes, default 35
  width?: number;   // for rectangle nodes, default 90
  height?: number;  // for rectangle nodes, default 44
  fontSize?: number; // label text size, default 12
  locked?: boolean;
  customProperties?: Record<string, CustomProperty>;
  [key: string]: unknown;
}

export interface SynapseEdgeData {
  synapseCount: number;
  controlPoints: ControlPoint[];
  labelPosition?: number; // 0–1 along the spline from source to target, default 0.5
  onControlPointsChange?: (edgeId: string, points: ControlPoint[]) => void;
  onLabelPositionChange?: (edgeId: string, t: number) => void;
  onAngleChange?: (edgeId: string, end: 'source' | 'target', angle: number) => void;
  sourceAngle?: number; // degrees from node center, 0=right, 90=down (standard math angle)
  targetAngle?: number; // degrees from node center, 0=right, 90=down
  [key: string]: unknown;
}

export interface GlobalSettings {
  edgeWidthMode: 'fixed' | 'weighted';
  fixedEdgeWidth: number; // stroke width in fixed mode (default 1.5)
  weightedEdgeWidth: number; // multiplier in weighted mode: width = value * synapseCount / 10
  nodeColorMode: NodeColorMode;
  edgeColorMode: EdgeColorMode;
}

// Plain serializable canvas state
export interface SerializedNode {
  id: string;
  shape: NeuronShape;
  position: { x: number; y: number };
  label: string;
  color: string;
  neurotransmitter?: Neurotransmitter;
  rotation: number;
  rotateLabel?: boolean;
  radius?: number;
  width?: number;
  height?: number;
  fontSize?: number;
  locked?: boolean;
  customProperties?: Record<string, CustomProperty>;
}

export interface SerializedEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  synapseCount: number;
  controlPoints: ControlPoint[];
  labelPosition?: number;
  sourceAngle?: number;
  targetAngle?: number;
}

export interface CanvasState {
  projectName?: string;
  nodes: SerializedNode[];
  edges: SerializedEdge[];
  globalSettings?: GlobalSettings;
  viewport?: { x: number; y: number; zoom: number };
  selection?: { id: string; type: 'node' | 'edge' };
}

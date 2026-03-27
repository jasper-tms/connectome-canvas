export type NeuronShape = 'circle' | 'rectangle' | 'arrow';

export interface ControlPoint {
  x: number;
  y: number;
}

export interface NeuronNodeData {
  label: string;
  color: string;
  shape: NeuronShape;
  rotation: number; // degrees, used for rectangle orientation
  radius?: number;  // for circle nodes, default 35
  width?: number;   // for rectangle nodes, default 90
  height?: number;  // for rectangle nodes, default 44
  fontSize?: number; // label text size, default 12
  locked?: boolean;
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
  edgeWidthMode: 'fixed' | 'proportional';
  fixedEdgeWidth: number; // stroke width in fixed mode (default 1.5)
}

// Plain serializable canvas state
export interface SerializedNode {
  id: string;
  shape: NeuronShape;
  position: { x: number; y: number };
  label: string;
  color: string;
  rotation: number;
  radius?: number;
  width?: number;
  height?: number;
  fontSize?: number;
  locked?: boolean;
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
}

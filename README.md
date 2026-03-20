# Connectome Canvas

A browser-based canvas for building connectome diagrams. Place neurons, draw synaptic connections between them, annotate connection weights, and save/load your work as YAML.

## Running

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

## Usage

### Adding neurons
Click **Circle** or **Rect** in the toolbar to add a neuron to the canvas. Drag nodes to reposition them.

### Editing properties
Click any node or edge to open the properties panel on the right:
- **Node**: edit label, color, and rotation (rectangles only)
- **Edge**: edit synapse count and curvature

### Drawing connections
Hover a node to reveal blue handles on its four sides. Drag from a handle to another node to draw a directed synapse arrow.

### Deleting
Select a node or edge and press `Delete`/`Backspace`, or use the **Delete** button in the toolbar.

### Import / Export
- **Export** — downloads the full canvas state as `connectome.yaml`
- **Import** — loads a canvas from a `.yaml` or `.json` file (or paste text directly)

## File format

```yaml
nodes:
  - id: "1"
    shape: circle        # or rectangle
    position: {x: 200, y: 200}
    label: AVAL
    color: "#6ee7b7"
    rotation: 0          # degrees; used for rectangle orientation

edges:
  - id: e1
    source: "1"
    target: "2"
    synapseCount: 22
    curvature: 0.25      # negative curves the edge the other way
```

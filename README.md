# Connectome Canvas

A browser-based canvas for building connectome diagrams. Place neurons, draw synaptic connections between them, set connection weights, and save/load your work via state-encoding URLs.

Preview (currently on EPFL network only): https://upramdyapc1.epfl.ch/canvas

## Running

### Dev version
```bash
npm install
npm run dev
```

Then open http://localhost:5173.

### Production version
While logged into phelps@upramdyapc1.epfl.ch, run:
```bash
npm install
npm run build
```

This creates a `dist/` folder with static files, and nginx is configured to serve them at https://upramdyapc1.epfl.ch/canvas without any further steps.


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

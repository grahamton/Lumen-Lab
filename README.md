# Lumen Lab ⚡

**Lumen Lab** is a real-time visual synthesizer in your browser. It transforms math and images into psychedelic tapestries, organic flows, and intricate mandalas—perfect for VJs, textile artists, and screen printers.

## 🚀 Quick Start

1.  **Install & Run**:
    ```bash
    npm install
    npm run dev
    ```
    Then open `http://localhost:5173`.
2.  **Projection Mode**: Press **F11** for fullscreen. The canvas adapts to your target ratio (16:9, 1:1, etc) regardless of window size.

---

## 🎛️ The Toolkit

### 1. Source (Input)
Choose your signal.
*   **Image**: Upload any photo.
*   **Math (Gen)**: Procedural generators.
    *   **Fibonacci**: Sunflower spiral (Tunable Density/Zoom).
    *   **Voronoi**: Cellular noise (Tunable Cells/Size).
    *   **Grid**: Classic test pattern.

### 2. Geometry
Mirror and repeat.
*   **Kaleidoscope**: Slice the world into 2-32 way symmetry.
*   **Tiling**: Create infinite wallpaper.
    *   **Grid**: Standard repeat.
    *   **Spin**: Rotated tiling.
    *   **Mirror**: Seamless geometric carpet.

### 3. Effects Rack
Twist and colorize.
*   **Distortion**: **Tunnel** (Polar) and **Vortex** (Log-Polar) warping.
*   **Liquify**: Fluid displacement.
*   **Alchemy**: Post-process sliders (0-100% Intensity).
    *   **Invert**: Negative film look.
    *   **Neon Edge**: Glowing contours (Blacklight style).
    *   **Solarize**: Trippy threshold inversions.
    *   **Shift**: RGB aberration.

### 4. Visualizer (Snapshots)
Perform your art.
*   **Snapshot**: Save the current look.
*   **Play**: Morph seamlessly between snapshots. Great for live performance.

### 5. Canvas (Output)
*   **Portal Mode**: Toggle between **Rect** and **Circle** clipping.
*   **High-Res Export**: Download 4K (3840px) PNGs for print, regardless of screen size.

---

## 🛠️ Technology
*   **React & Vite**: Fast UI.
*   **HTML5 Canvas**: High-performance 2D rendering.
*   **Zustand**: State management.
*   **Lucide React**: Iconography.

## 📜 License
MIT

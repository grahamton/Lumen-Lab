# Lumen Lab

**Lumen Lab** is a digital design station built for textile artists, pattern makers, and visual explorers. It allows you to transform simple images into intricate, endless, and psychedelic tapestries perfect for fabric printing.

Think of it as a "digital chemistry set" for your art. You start with a single seed image—a photo of a flower, a texture, or a drawing—and using mathematical lenses, you evolve it into complex, seamless patterns that are ready for dye-sublimation or screen printing.

## 🧵 Why use this for Fabric Design?

Creating psychedelic or "trippy" fabrics often involves complex mirroring and geometry (mandalas) combined with organic, fluid distortions. Doing this manually in Photoshop can be slow and technical. Lumen Lab makes this process real-time and playful:

1.  **Instant Mandalas**: Turn any photo into a perfect kaleidoscope instantly.
2.  **Seamless Repeats**: The "Pattern" feature automatically tiles your design, ensuring it wraps perfectly around the edges for infinite printing.
3.  **Organic Flow**: Add "melt" and "warp" effects that mimic hydro-dipping or tie-dye aesthetics.
4.  **Print Ready**: Use "Posterize" to reduce colors for screen printing, or "Neon Edges" for high-contrast rave wear.

---

## 🎨 The Toolkit

### 1. Mandala (Symmetry)
This is your digital kaleidoscope. You can slice your image into wedges and mirror them.
*   **Use case**: Create the central star or flower of your design.
*   **Controls**: Adjust the "Points" to go from a simple 4-way mirror to a complex 32-point starburst.

### 2. The Warper (Distortion)
This tool bends space itself. It takes your straight lines and twists them into spirals or fluid shapes.
*   **Log-Polar**: Creates a "tunnel" look where the image seems to spiral into itself forever.
*   **Displacement**: Adds a "liquid" quality, pushing pixels around like wet paint.

### 3. Pattern (Wallpaper Groups)
**This is the most important tool for textiles.** Once you have a cool design in the center, this feature turns it into an endless wallpaper.
*   **Grid**: Simple repeat. Good for checking basic spacing.
*   **Mirror**: Mirrors your design on all four sides. This creates a seamless "carpet" effect where you can't tell where one tile ends and the next begins.
*   **Spin**: Rotates every other tile, adding variety to the pattern.

### 4. Masks & Edges
*   **Edge Softness**: Fade the edges of your image or tiles to create a seamless blend.
*   **Freeze**: Lock the center of your image while the rest moves or distorts.

### 5. Alchemy (Post-Processing)
Give your design a final stylistic polish.
*   **Posterize**: Reduce the number of colors. Essential for creating that "vintage screen print" look or simplifying palettes for actual printing.
*   **Neon Edges**: Turns your image into a glowing outline drawing. Perfect for black-light reactive designs.

### 6. The Time Studio (Animation)
While fabrics are static, seeing your design move helps you find the perfect "frame" to freeze.
*   **Video Echo**: Creates trails behind moving parts, adding a sense of motion to still images.
*   **Loop Recording**: Capture a 3-second seamless video. Great for projecting onto your white fabrics at events!

---

## 🚀 How to Start Designing

1.  **Install & Run**:
    ```bash
    npm install
    npm run dev
    ```
    Then open `http://localhost:5173`.

2.  **Workflow**:
    *   **Upload**: Click the upload button to choose your base image. High-contrast textures work best.
    *   **Mandala**: Turn on "Mandala" to find a central motif.
    *   **Warp**: Add some "Warping" or "Displacement" to make it look organic.
    *   **Pattern**: Go to the **Pattern** section and select **Mirror**. Adjust the **Tile Scale** and **Overlap**.
    *   **Alchemy**: Use **Neon Edges** or **Posterize** to stylize the final look.
    *   **Capture**: When you see a pattern you love, you can screenshot it for high-res printing or record a loop.

## 🛠️ Technology
Built with modern web tech to run fast in your browser.
*   **React & Vite**: For a snappy interface.
*   **HTML5 Canvas**: For high-performance pixel manipulation.
*   **Zustand**: For managing all the knobs and dials.

## 📜 License
MIT

/**
 * Math Seeds: Procedural Generation Algorithms
 */

// 1. Fibonacci Spiral (Sunflower Pattern)
// params: { param1: count (density), param2: zoom (spread) }
export function drawFibonacciSpiral(ctx, width, height, params) {
  const p1 = params.param1 // 0-100
  const p2 = params.param2 // 0-100

  // Map params
  const count = Math.floor(100 + (p1 / 100) * 4000) // 100 to 4100
  const zoom = 0.5 + (p2 / 100) * 1.5 // 0.5 to 2.0

  const centerX = width / 2
  const centerY = height / 2
  const goldenAngle = Math.PI * (3 - Math.sqrt(5)) // ~137.5 degrees
  const maxRadius = Math.min(width, height) / 2 * 0.9 * zoom
  const scale = maxRadius / Math.sqrt(count)

  ctx.fillStyle = '#171717'
  ctx.fillRect(0, 0, width, height)

  for (let i = 0; i < count; i++) {
    const r = scale * Math.sqrt(i)
    const theta = i * goldenAngle

    const x = centerX + r * Math.cos(theta)
    const y = centerY + r * Math.sin(theta)

    // Dot size grows slightly with radius
    const dotSize = (2 + (r / maxRadius) * 4) * (zoom * 0.8)

    // Color gradient from center
    const hue = (i / count) * 360
    ctx.fillStyle = `hsl(${hue}, 80%, 60%)`

    ctx.beginPath()
    ctx.arc(x, y, dotSize, 0, Math.PI * 2)
    ctx.fill()
  }
}

// 2. Voronoi Noise (Cellular)
// params: { param1: cellCount, param2: bubbleSize }
export function drawVoronoi(ctx, width, height, params) {
  const p1 = params.param1
  const p2 = params.param2

  const cellCount = Math.floor(5 + (p1 / 100) * 150) // 5 to 155
  const sizeMult = 0.5 + (p2 / 100) * 2.0 // 0.5 to 2.5

  // Pseudo-random seeded by loop to be deterministic-ish per frame if needed,
  // but for now strict random is okay as it re-runs only on param change?
  // Wait, render runs every frame. We need deterministic 'random' or it will strobe.
  // We'll use a simple mulberry32 or similar if we want stability,
  // OR we just generate points once?
  // RENDER is called every frame. 'drawVoronoi' is called every frame.
  // WE MUST SEED THE RANDOMNESS or it will flash like crazy.

  // Simple LCG Seeding
  let seed = 12345;
  const random = () => {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  }

  const points = []
  for (let i = 0; i < cellCount; i++) {
    points.push({
      x: random() * width,
      y: random() * height,
      color: `hsl(${random() * 360}, 70%, 50%)`
    })
  }

  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, width, height)

  // Composite lighter to create cellular boundaries
  ctx.globalCompositeOperation = 'screen'

  points.forEach(p => {
    const r = (Math.min(width, height) / Math.sqrt(cellCount)) * sizeMult
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r)
    g.addColorStop(0, p.color)
    g.addColorStop(1, 'rgba(0,0,0,0)')

    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(p.x, p.y, r * 2, 0, Math.PI * 2)
    ctx.fill()
  })

  ctx.globalCompositeOperation = 'source-over'
}

// 3. Grid (Classic)
// params: { param1: spacing, param2: thickness }
export function drawGrid(ctx, width, height, params) {
  const p1 = params.param1
  const p2 = params.param2

  const spacing = Math.max(10, 10 + (p1 / 100) * 190) // 10 to 200
  const weight = 1 + (p2 / 100) * 9 // 1 to 10

  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, width, height)
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = weight

  // Centering offset
  const offsetX = (width % spacing) / 2
  const offsetY = (height % spacing) / 2

  for (let x = offsetX; x <= width; x += spacing) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }

  for (let y = offsetY; y <= height; y += spacing) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }
}

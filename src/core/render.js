/**
 * Core Rendering Logic for Lumen Lab
 * Handles all pixel manipulation, symmetry, and effects.
 */

import { drawFibonacciSpiral, drawVoronoi, drawGrid } from './generators'

export function renderCanvas(ctx, backBuffer, width, height, state) {
  const {
    image,
    transforms,
    symmetry,
    warp,
    displacement,
    masking,
    feedback,
    tiling,
    color,
    effects,
  } = state

  // 1. Fill Background
  ctx.fillStyle = '#171717'
  ctx.fillRect(0, 0, width, height)

  // 2. Feedback Removed (Phase 4 Deprecated)
  // if (feedback.amount > 0) ...

  if (!image || !image.complete || image.width === 0) {
    ctx.font = '20px Inter, sans-serif'
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.fillText('Upload an image to begin', width / 2, height / 2)
    return
  }

  const centerX = width / 2
  const centerY = height / 2
  // Helper: Draw Base Image
  const drawSimpleImage = (targetCtx) => {
    targetCtx.save()

    // 1. Math Seeds Override
    if (state.generator && state.generator.type !== 'none') {
      const { type } = state.generator
      // Pass the whole generator object as params
      if (type === 'fibonacci') drawFibonacciSpiral(targetCtx, width, height, state.generator)
      if (type === 'voronoi') drawVoronoi(targetCtx, width, height, state.generator)
      if (type === 'grid') drawGrid(targetCtx, width, height, state.generator)
    } else if (image) {
      // 2. Standard Image Draw
      targetCtx.translate(centerX, centerY)
      targetCtx.translate(transforms.x, transforms.y)
      targetCtx.scale(transforms.scale, transforms.scale)
      targetCtx.rotate(transforms.rotation)
      targetCtx.drawImage(image, -image.width / 2, -image.height / 2)
    }

    targetCtx.restore()
  }

  // ... (Lines 66-212 Same as original until pixel loop) ...
  // Helper to get an offscreen canvas
  const getOffscreen = (w, h) => {
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    return c
  }

  // --- OFFSCREEN BUFFERS ---
  const offCanvas = getOffscreen(width, height)
  const offCtx = offCanvas.getContext('2d')

  const origCanvas = getOffscreen(width, height)
  const origCtx = origCanvas.getContext('2d')

  // Draw Frozen Layer
  drawSimpleImage(origCtx)

  // Helper: Draw Active Geometry
  const drawActiveGeometry = (targetCtx) => {
    if (symmetry.enabled) {
      const slices = symmetry.slices
      const angle = (2 * Math.PI) / slices

      for (let i = 0; i < slices; i++) {
        targetCtx.save()
        targetCtx.translate(centerX, centerY)
        targetCtx.rotate(i * angle)

        targetCtx.beginPath()
        targetCtx.moveTo(0, 0)
        targetCtx.arc(0, 0, Math.max(width, height), -0.5 * angle - 0.01, 0.5 * angle + 0.01)
        targetCtx.lineTo(0, 0)
        targetCtx.clip()

        if (i % 2 !== 0) {
          targetCtx.scale(1, -1)
        }

        targetCtx.translate(transforms.x, transforms.y)
        targetCtx.scale(transforms.scale, transforms.scale)
        targetCtx.rotate(transforms.rotation)
        targetCtx.drawImage(image, -image.width / 2, -image.height / 2)

        targetCtx.restore()
      }
    } else {
      drawSimpleImage(targetCtx)
    }
  }

  // --- FEATHERING & TILING ---
  let unitCellCanvas = null
  const hasFeather = masking.feather > 0

  if (hasFeather) {
    unitCellCanvas = getOffscreen(width, height)
    const ucCtx = unitCellCanvas.getContext('2d')

    drawActiveGeometry(ucCtx)

    let featherSize = Math.min(width, height)
    if (tiling.type !== 'none') {
      featherSize = Math.min(width, height) * tiling.scale
    }

    ucCtx.globalCompositeOperation = 'destination-in'
    const grad = ucCtx.createRadialGradient(
      centerX, centerY,
      featherSize * 0.5 * (1 - masking.feather),
      centerX, centerY,
      featherSize * 0.5
    )
    grad.addColorStop(0, 'rgba(0,0,0,1)')
    grad.addColorStop(1, 'rgba(0,0,0,0)')

    ucCtx.fillStyle = grad
    ucCtx.fillRect(0, 0, width, height)
    ucCtx.globalCompositeOperation = 'source-over'
  }

  // Draw into offCanvas (Geometry Pass)
  if (tiling.type !== 'none') {
    const tileSize = Math.min(width, height) * tiling.scale
    const cols = Math.ceil(width / tileSize) + 2
    const rows = Math.ceil(height / tileSize) + 2

    for (let row = -1; row < rows; row++) {
      for (let col = -1; col < cols; col++) {
        offCtx.save()
        const tx = col * tileSize
        const ty = row * tileSize
        const halfTile = tileSize / 2

        offCtx.translate(tx + halfTile, ty + halfTile)

        if (tiling.type === 'p2') {
          if ((row + col) % 2 !== 0) offCtx.rotate(Math.PI)
        } else if (tiling.type === 'p4m') {
          offCtx.translate(-halfTile, -halfTile)
          if (col % 2 !== 0) {
            offCtx.translate(tileSize, 0)
            offCtx.scale(-1, 1)
          }
          if (row % 2 !== 0) {
            offCtx.translate(0, tileSize)
            offCtx.scale(1, -1)
          }
          offCtx.translate(halfTile, halfTile)
        }

        const scaleMult = 1.0 + tiling.overlap
        offCtx.scale(scaleMult, scaleMult)

        const baseScale = tileSize / Math.min(width, height)
        offCtx.scale(baseScale, baseScale)
        offCtx.translate(-centerX, -centerY)

        if (hasFeather && unitCellCanvas) {
          offCtx.drawImage(unitCellCanvas, 0, 0)
        } else {
          drawActiveGeometry(offCtx)
        }
        offCtx.restore()
      }
    }
  } else {
    if (hasFeather && unitCellCanvas) {
      offCtx.drawImage(unitCellCanvas, 0, 0)
    } else {
      drawActiveGeometry(offCtx)
    }
  }

  // --- PIXEL OPS (Context 2D CPU Loop) ---
  const hasWarp = warp.type !== 'none'
  const hasDisplacement = displacement.amp > 0
  const hasMasking = masking.lumaThreshold > 0 || masking.centerRadius > 0

  // Alchemy: Check for intensity > 0
  const hasAlchemy =
    color.posterize < 256 ||
    effects.edgeDetect > 0 ||
    effects.invert > 0 ||
    effects.solarize > 0 ||
    effects.shift > 0

  // REMOVED EARLY RETURN OPTIMIZATION to ensure final clip (Portal Mode) is always applied.

  // We need to process pixels
  const fxCanvas = getOffscreen(width, height)
  const fxCtx = fxCanvas.getContext('2d')

  const srcData = offCtx.getImageData(0, 0, width, height)
  const origData = origCtx.getImageData(0, 0, width, height)
  const dstData = fxCtx.createImageData(width, height)

  const srcW = width
  const srcH = height

  const dispAmp = displacement.amp
  const dispFreq = displacement.freq * 0.01
  const radiusSq = (masking.centerRadius / 100 * Math.min(width, height) / 2) ** 2
  const lumaThresh = masking.lumaThreshold * 2.55

  // Lerp Helper
  const lerp = (a, b, t) => a + (b - a) * t

  // Loop
  for (let y = 0; y < srcH; y++) {
    for (let x = 0; x < srcW; x++) {
      let isFrozen = false
      const dx = x - centerX
      const dy = y - centerY

      // Distance Mask
      if (masking.centerRadius > 0) {
        if (dx * dx + dy * dy < radiusSq) isFrozen = true
      }

      // Luma Mask
      if (!isFrozen && masking.lumaThreshold > 0) {
        const idx = (y * srcW + x) * 4
        const r = origData.data[idx]
        const g = origData.data[idx + 1]
        const b = origData.data[idx + 2]
        const luma = 0.299 * r + 0.587 * g + 0.114 * b

        if (masking.invertLuma) {
          if (luma < lumaThresh) isFrozen = true
        } else {
          if (luma > lumaThresh) isFrozen = true
        }
      }

      const dstIdx = (y * srcW + x) * 4

      if (isFrozen) {
        dstData.data[dstIdx] = origData.data[dstIdx]
        dstData.data[dstIdx + 1] = origData.data[dstIdx + 1]
        dstData.data[dstIdx + 2] = origData.data[dstIdx + 2]
        dstData.data[dstIdx + 3] = 255
        continue
      }

      // Warp Coords
      let u = x
      let v = y

      if (hasWarp) {
        let nx = (x - centerX) / centerX
        let ny = (y - centerY) / centerY

        if (warp.type === 'polar') {
          const r = Math.sqrt(nx * nx + ny * ny)
          const theta = Math.atan2(ny, nx)
          u = (theta + Math.PI) / (2 * Math.PI) * srcW
          v = r * srcH
        } else if (warp.type === 'log-polar') {
          const r = Math.sqrt(nx * nx + ny * ny)
          const theta = Math.atan2(ny, nx)
          if (r > 0) {
            const logR = Math.log(r)
            u = ((theta / Math.PI) * 0.5 + 0.5) * srcW
            v = (logR * 0.5 % 1.0) * srcH
            if (v < 0) v += srcH
          }
        }
      }

      if (hasDisplacement) {
        u += Math.sin(v * dispFreq) * dispAmp
        v += Math.cos(u * dispFreq) * dispAmp
      }

      const srcX = Math.floor(u) % srcW
      let srcY = Math.floor(v) % srcH
      let safeSrcX = srcX < 0 ? srcX + srcW : srcX
      let safeSrcY = srcY < 0 ? srcY + srcH : srcY

      if (safeSrcX >= 0 && safeSrcX < srcW && safeSrcY >= 0 && safeSrcY < srcH) {
        const srcIdx = (safeSrcY * srcW + safeSrcX) * 4

        // Base Pixel
        let r = srcData.data[srcIdx]
        let g = srcData.data[srcIdx + 1]
        let b = srcData.data[srcIdx + 2]
        let a = srcData.data[srcIdx + 3]

        // --- ALCHEMY (Per Pixel with Intensity) ---

        // 1. RGB Shift (Aberration)
        if (effects.shift > 0) {
          const shiftAmt = Math.round((effects.shift / 100) * 50) // 0-50px
          const leftIdx = (safeSrcY * srcW + Math.max(0, safeSrcX - shiftAmt)) * 4
          const rightIdx = (safeSrcY * srcW + Math.min(srcW - 1, safeSrcX + shiftAmt)) * 4

          const rShift = srcData.data[leftIdx]
          const bShift = srcData.data[rightIdx + 2]

          // Blend dependent on intensity? No, shift distance determines look.
          // But maybe we blend between original R and Shifted R?
          // Nah, standard aberration "is" the shift.
          r = rShift
          b = bShift
        }

        // 2. Invert (Negative)
        if (effects.invert > 0) {
          const amt = effects.invert / 100
          r = lerp(r, 255 - r, amt)
          g = lerp(g, 255 - g, amt)
          b = lerp(b, 255 - b, amt)
        }

        // 3. Solarize (Threshold Inversion)
        if (effects.solarize > 0) {
          const amt = effects.solarize / 100
          const luma = 0.299 * r + 0.587 * g + 0.114 * b
          // Solarize Effect: Invert if below threshold?
          // Classic Solarize: Curves.
          // Simple: Abs(Sin) wave on channels.
          // Or: If luma > thresh, invert.

          // We will use a soft solarize blend.
          let rSol = r, gSol = g, bSol = b
          if (luma > 100) {
            rSol = 255 - r
            gSol = 255 - g
            bSol = 255 - b
          }

          r = lerp(r, rSol, amt)
          g = lerp(g, gSol, amt)
          b = lerp(b, bSol, amt)
        }

        dstData.data[dstIdx] = r
        dstData.data[dstIdx + 1] = g
        dstData.data[dstIdx + 2] = b
        dstData.data[dstIdx + 3] = a
      }
    }
  }

  // --- POST PROCESS OPS (Whole Buffer) ---

  // Edge Detect (Convolution) - Mix based on intensity
  if (effects.edgeDetect > 0) {
    const intensity = effects.edgeDetect / 100
    const copy = new Uint8ClampedArray(dstData.data)

    // We modify dstData in place, but we need source pixels (copy)
    // Only proceed if intensity > 0

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4

        let gx = 0, gy = 0
        const getVal = (ox, oy) => copy[((y + oy) * width + (x + ox)) * 4 + 1] // Green channel

        gx = -getVal(-1, -1) + getVal(1, -1)
          - 2 * getVal(-1, 0) + 2 * getVal(1, 0)
          - getVal(-1, 1) + getVal(1, 1)

        gy = -getVal(-1, -1) - 2 * getVal(0, -1) - getVal(1, -1)
          + getVal(-1, 1) + 2 * getVal(0, 1) + getVal(1, 1)

        const mag = Math.min(255, Math.sqrt(gx * gx + gy * gy))

        // Neon Glow Style (Black bg, Colored Edges)
        // vs
        // Edge Overlay (Edges on top of original)
        // Let's do a blend: Original Image <-> Neon Edges

        const rOrig = dstData.data[idx]
        const gOrig = dstData.data[idx + 1]
        const bOrig = dstData.data[idx + 2]

        // Neon edge color
        const rEdge = mag
        const gEdge = mag * 0.8
        const bEdge = mag * 1.5 // Purple/Blue tint

        // If intensity is 100%, show pure edges (black background).
        // If intensity is 50%, blend?
        // User probably wants "Glow over original" or "Comic Book".
        // Let's replace: Lerp(Original, EdgeOnly, intensity)

        // Threshold check for cleanliness
        if (mag > 40) {
          dstData.data[idx] = lerp(rOrig, rEdge, intensity)
          dstData.data[idx + 1] = lerp(gOrig, gEdge, intensity)
          dstData.data[idx + 2] = lerp(bOrig, bEdge, intensity)
          // Alpha stays
        } else {
          // Background of edge image is black (0,0,0)
          dstData.data[idx] = lerp(rOrig, 0, intensity)
          dstData.data[idx + 1] = lerp(gOrig, 0, intensity)
          dstData.data[idx + 2] = lerp(bOrig, 0, intensity)
        }
      }
    }
  }

  // Posterize
  if (color.posterize < 256) {
    const levels = Math.floor(color.posterize)
    const step = 255 / (levels - 1)
    for (let i = 0; i < dstData.data.length; i += 4) {
      dstData.data[i] = Math.floor(dstData.data[i] / step) * step
      dstData.data[i + 1] = Math.floor(dstData.data[i + 1] / step) * step
      dstData.data[i + 2] = Math.floor(dstData.data[i + 2] / step) * step
    }
  }

  fxCtx.putImageData(dstData, 0, 0)

  // Final Clip (Portal Mode)
  if (state.canvas && state.canvas.shape === 'circle') {
    ctx.save()
    ctx.beginPath()
    // Draw circle in screen center
    const centerX = width / 2
    const centerY = height / 2
    const radius = Math.min(width, height) / 2
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
    ctx.closePath()
    ctx.clip()

    // Draw the result
    ctx.drawImage(fxCanvas, 0, 0)
    ctx.restore()
  } else {
    ctx.drawImage(fxCanvas, 0, 0)
  }
}

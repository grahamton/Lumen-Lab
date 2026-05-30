const EPSILON = 1e-8

export function clamp01(value) {
  return Math.min(1, Math.max(0, value))
}

export function getOutputRect(viewportWidth, viewportHeight, canvasWidth, canvasHeight, canvasAspect) {
  if (!viewportWidth || !viewportHeight) {
    return { width: 0, height: 0, left: 0, top: 0 }
  }

  if (canvasAspect === 'free') {
    return { width: viewportWidth, height: viewportHeight, left: 0, top: 0 }
  }

  const targetAspect = canvasWidth / canvasHeight
  const windowAspect = viewportWidth / viewportHeight

  if (windowAspect > targetAspect) {
    const width = viewportHeight * targetAspect
    return {
      width,
      height: viewportHeight,
      left: (viewportWidth - width) / 2,
      top: 0,
    }
  }

  const height = viewportWidth / targetAspect
  return {
    width: viewportWidth,
    height,
    left: 0,
    top: (viewportHeight - height) / 2,
  }
}

export function getRectPoints(rect) {
  return [
    { x: rect.left, y: rect.top },
    { x: rect.left + rect.width, y: rect.top },
    { x: rect.left + rect.width, y: rect.top + rect.height },
    { x: rect.left, y: rect.top + rect.height },
  ]
}

export function normalizeViewportPoint(point, viewportWidth, viewportHeight) {
  return {
    x: clamp01(point.x / Math.max(1, viewportWidth)),
    y: clamp01(point.y / Math.max(1, viewportHeight)),
  }
}

export function denormalizeViewportPoint(point, viewportWidth, viewportHeight) {
  return {
    x: clamp01(point.x) * viewportWidth,
    y: clamp01(point.y) * viewportHeight,
  }
}

export function getProjectionTargetPoints(points, rect, viewportWidth, viewportHeight) {
  if (!Array.isArray(points) || points.length !== 4) {
    return getRectPoints(rect)
  }

  return points.map((point) => denormalizeViewportPoint(point, viewportWidth, viewportHeight))
}

function solveLinearSystem(matrix, vector) {
  const size = vector.length
  const rows = matrix.map((row, index) => [...row, vector[index]])

  for (let col = 0; col < size; col += 1) {
    let pivotRow = col
    for (let row = col + 1; row < size; row += 1) {
      if (Math.abs(rows[row][col]) > Math.abs(rows[pivotRow][col])) {
        pivotRow = row
      }
    }

    if (Math.abs(rows[pivotRow][col]) < EPSILON) {
      return null
    }

    if (pivotRow !== col) {
      const temp = rows[col]
      rows[col] = rows[pivotRow]
      rows[pivotRow] = temp
    }

    const pivot = rows[col][col]
    for (let idx = col; idx <= size; idx += 1) {
      rows[col][idx] /= pivot
    }

    for (let row = 0; row < size; row += 1) {
      if (row === col) continue
      const factor = rows[row][col]
      if (Math.abs(factor) < EPSILON) continue
      for (let idx = col; idx <= size; idx += 1) {
        rows[row][idx] -= factor * rows[col][idx]
      }
    }
  }

  return rows.map((row) => row[size])
}

export function computeProjectiveMatrix(sourcePoints, targetPoints) {
  const matrix = []
  const vector = []

  for (let index = 0; index < 4; index += 1) {
    const { x, y } = sourcePoints[index]
    const target = targetPoints[index]
    const X = target.x
    const Y = target.y

    matrix.push([x, y, 1, 0, 0, 0, -X * x, -X * y])
    vector.push(X)
    matrix.push([0, 0, 0, x, y, 1, -Y * x, -Y * y])
    vector.push(Y)
  }

  const solution = solveLinearSystem(matrix, vector)
  if (!solution) {
    return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]
  }

  const [a, b, c, d, e, f, g, h] = solution
  return [
    a, d, 0, g,
    b, e, 0, h,
    0, 0, 1, 0,
    c, f, 0, 1,
  ]
}

export function applyProjectiveMatrix(matrix, x, y) {
  const w = (matrix[3] * x) + (matrix[7] * y) + matrix[15]
  if (Math.abs(w) < EPSILON) {
    return { x: 0, y: 0 }
  }

  return {
    x: ((matrix[0] * x) + (matrix[4] * y) + matrix[12]) / w,
    y: ((matrix[1] * x) + (matrix[5] * y) + matrix[13]) / w,
  }
}

export function matrix3dToCss(matrix) {
  return `matrix3d(${matrix.map((value) => Number(value.toFixed(10))).join(',')})`
}

export function getProjectionTransform(rect, targetPoints) {
  const sourcePoints = [
    { x: 0, y: 0 },
    { x: rect.width, y: 0 },
    { x: rect.width, y: rect.height },
    { x: 0, y: rect.height },
  ]

  return matrix3dToCss(computeProjectiveMatrix(sourcePoints, targetPoints))
}

export function bilinearPoint(corners, u, v) {
  const [topLeft, topRight, bottomRight, bottomLeft] = corners
  return {
    x:
      topLeft.x * (1 - u) * (1 - v) +
      topRight.x * u * (1 - v) +
      bottomRight.x * u * v +
      bottomLeft.x * (1 - u) * v,
    y:
      topLeft.y * (1 - u) * (1 - v) +
      topRight.y * u * (1 - v) +
      bottomRight.y * u * v +
      bottomLeft.y * (1 - u) * v,
  }
}

export function buildWarpGuidePath(corners, axis, progress, segments = 24) {
  const points = []

  for (let step = 0; step <= segments; step += 1) {
    const t = step / segments
    points.push(axis === 'vertical'
      ? bilinearPoint(corners, progress, t)
      : bilinearPoint(corners, t, progress))
  }

  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ')
}

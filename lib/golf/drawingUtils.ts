import type { Annotation, Point, AnnotationStyle } from './annotationTypes'

function denorm(p: Point, w: number, h: number): [number, number] {
  return [p.x * w, p.y * h]
}

function applyStyle(ctx: CanvasRenderingContext2D, style: AnnotationStyle) {
  ctx.strokeStyle = style.color
  ctx.lineWidth = style.strokeWidth
  ctx.globalAlpha = style.opacity
  // Sharp technical/CAD line ends rather than the rounded marker/pencil look
  ctx.lineCap = 'butt'
  ctx.lineJoin = 'miter'
  ctx.miterLimit = 4
}

function drawArrowHead(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  size = 12
) {
  const angle = Math.atan2(y2 - y1, x2 - x1)
  ctx.beginPath()
  ctx.moveTo(x2, y2)
  ctx.lineTo(x2 - size * Math.cos(angle - Math.PI / 6), y2 - size * Math.sin(angle - Math.PI / 6))
  ctx.moveTo(x2, y2)
  ctx.lineTo(x2 - size * Math.cos(angle + Math.PI / 6), y2 - size * Math.sin(angle + Math.PI / 6))
  ctx.stroke()
}

export function drawAnnotation(
  ctx: CanvasRenderingContext2D,
  ann: Annotation,
  canvasW: number,
  canvasH: number
) {
  if (ann.points.length === 0) return
  ctx.save()
  applyStyle(ctx, ann.style)

  const pts = ann.points.map(p => denorm(p, canvasW, canvasH))

  switch (ann.tool) {
    case 'plane':
      ctx.setLineDash([10, 6])
    // falls through
    case 'line': {
      if (pts.length < 2) break
      ctx.beginPath()
      ctx.moveTo(pts[0][0], pts[0][1])
      ctx.lineTo(pts[1][0], pts[1][1])
      ctx.stroke()
      ctx.setLineDash([])
      break
    }
    case 'arrow': {
      if (pts.length < 2) break
      ctx.beginPath()
      ctx.moveTo(pts[0][0], pts[0][1])
      ctx.lineTo(pts[1][0], pts[1][1])
      ctx.stroke()
      drawArrowHead(ctx, pts[0][0], pts[0][1], pts[1][0], pts[1][1])
      break
    }
    case 'circle': {
      if (pts.length < 2) break
      const dx = pts[1][0] - pts[0][0]
      const dy = pts[1][1] - pts[0][1]
      const r = Math.hypot(dx, dy)
      ctx.beginPath()
      ctx.arc(pts[0][0], pts[0][1], r, 0, Math.PI * 2)
      ctx.stroke()
      break
    }
    case 'rect': {
      if (pts.length < 2) break
      ctx.beginPath()
      ctx.strokeRect(
        pts[0][0],
        pts[0][1],
        pts[1][0] - pts[0][0],
        pts[1][1] - pts[0][1]
      )
      break
    }
    case 'freehand': {
      if (pts.length < 2) break
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(pts[0][0], pts[0][1])
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1])
      ctx.stroke()
      break
    }
    case 'angle': {
      // Click order: point 1 → vertex (corner where angle is measured) → point 3
      if (pts.length === 0) break

      if (pts.length < 2) break
      const [p1, vertex, p3] = pts

      // Clean arm 1: point 1 → vertex
      ctx.beginPath()
      ctx.moveTo(p1[0], p1[1])
      ctx.lineTo(vertex[0], vertex[1])
      ctx.stroke()

      if (!p3) break

      // Clean arm 2: vertex → point 3
      ctx.beginPath()
      ctx.moveTo(vertex[0], vertex[1])
      ctx.lineTo(p3[0], p3[1])
      ctx.stroke()

      // Compute interior angle at vertex
      const a1 = Math.atan2(p1[1] - vertex[1], p1[0] - vertex[0])
      const a2 = Math.atan2(p3[1] - vertex[1], p3[0] - vertex[0])
      const arm1Len = Math.hypot(p1[0] - vertex[0], p1[1] - vertex[1])
      const arm2Len = Math.hypot(p3[0] - vertex[0], p3[1] - vertex[1])
      const arcR = Math.min(28, Math.min(arm1Len, arm2Len) * 0.28)

      const diff = ((a2 - a1) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2)
      const ccw = diff > Math.PI

      // Thin arc at the vertex
      ctx.save()
      ctx.lineWidth = Math.max(1, ann.style.strokeWidth * 0.7)
      ctx.beginPath()
      ctx.arc(vertex[0], vertex[1], arcR, a1, a2, ccw)
      ctx.stroke()
      ctx.restore()

      // Degree label inside a small dark pill (matches Swing Profile style).
      // Place it on the *opposite* side of the angle from the arc — that way
      // the label never overlaps the arms and always sits in a predictable spot
      // (just outside the V, beyond the vertex).
      const deg = ccw ? 360 - (diff * 180) / Math.PI : (diff * 180) / Math.PI
      const label = ann.label || `${deg.toFixed(0)}°`

      const arcMidA = ccw ? a1 - diff / 2 : a1 + diff / 2
      const labelA = arcMidA + Math.PI // 180° opposite the arc midpoint
      const labelDist = 28
      const lx = vertex[0] + labelDist * Math.cos(labelA)
      const ly = vertex[1] + labelDist * Math.sin(labelA)

      ctx.save()
      ctx.font = '600 13px ui-sans-serif, system-ui, -apple-system, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const tw = ctx.measureText(label).width
      const pillH = 19
      const pillW = tw + 11
      const px = lx - pillW / 2
      const py = ly - pillH / 2
      const rr = 4
      ctx.globalAlpha = 0.88
      ctx.fillStyle = '#1a1a1a'
      ctx.beginPath()
      ctx.moveTo(px + rr, py)
      ctx.lineTo(px + pillW - rr, py)
      ctx.quadraticCurveTo(px + pillW, py, px + pillW, py + rr)
      ctx.lineTo(px + pillW, py + pillH - rr)
      ctx.quadraticCurveTo(px + pillW, py + pillH, px + pillW - rr, py + pillH)
      ctx.lineTo(px + rr, py + pillH)
      ctx.quadraticCurveTo(px, py + pillH, px, py + pillH - rr)
      ctx.lineTo(px, py + rr)
      ctx.quadraticCurveTo(px, py, px + rr, py)
      ctx.closePath()
      ctx.fill()
      ctx.globalAlpha = 1
      ctx.fillStyle = '#ffffff'
      ctx.fillText(label, lx, ly)
      ctx.restore()
      break
    }
    default:
      break
  }

  // Label for non-angle tools
  if (ann.label && ann.tool !== 'angle') {
    const [px, py] = pts[0]
    ctx.font = 'bold 13px sans-serif'
    ctx.fillStyle = ann.style.color
    ctx.globalAlpha = ann.style.opacity
    ctx.fillText(ann.label, px + 4, py - 6)
  }

  ctx.restore()
}

export function drawInProgress(
  ctx: CanvasRenderingContext2D,
  tool: string,
  points: Point[],
  style: AnnotationStyle,
  canvasW: number,
  canvasH: number
) {
  if (points.length === 0) return
  const ann: Annotation = {
    id: 'preview',
    tool: tool as Annotation['tool'],
    points,
    style,
    source: 'user',
  }
  drawAnnotation(ctx, ann, canvasW, canvasH)
}

// Compact hollow-ring handles drawn over each control point of a selected
// annotation. Matches the Swing Profile visual — small, transparent center,
// crisp colored ring with subtle shadow.
export function drawHandles(
  ctx: CanvasRenderingContext2D,
  ann: Annotation,
  canvasW: number,
  canvasH: number,
) {
  const handleR = 5
  for (const p of ann.points) {
    const x = p.x * canvasW
    const y = p.y * canvasH
    ctx.save()
    ctx.shadowBlur = 4
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
    ctx.strokeStyle = ann.style.color
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(x, y, handleR, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()
  }
}

// Hit-test geometry helpers for selection / drag in the canvas.
// All inputs in normalized (0..1) coordinates.
function distToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y)
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

export function hitTestHandle(p: Point, ann: Annotation, threshold: number): number | null {
  let bestIdx: number | null = null
  let bestD = threshold
  for (let i = 0; i < ann.points.length; i++) {
    const pt = ann.points[i]
    const d = Math.hypot(p.x - pt.x, p.y - pt.y)
    if (d < bestD) { bestD = d; bestIdx = i }
  }
  return bestIdx
}

export function hitTestAnnotation(p: Point, ann: Annotation, threshold: number): boolean {
  const pts = ann.points
  if (pts.length === 0) return false

  switch (ann.tool) {
    case 'line':
    case 'arrow':
    case 'plane':
      return pts.length >= 2 && distToSegment(p, pts[0], pts[1]) < threshold
    case 'circle': {
      if (pts.length < 2) return false
      const r = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y)
      const d = Math.hypot(p.x - pts[0].x, p.y - pts[0].y)
      return Math.abs(d - r) < threshold
    }
    case 'rect': {
      if (pts.length < 2) return false
      const x = Math.min(pts[0].x, pts[1].x)
      const y = Math.min(pts[0].y, pts[1].y)
      const w = Math.abs(pts[1].x - pts[0].x)
      const h = Math.abs(pts[1].y - pts[0].y)
      const onLeft = Math.abs(p.x - x) < threshold && p.y >= y - threshold && p.y <= y + h + threshold
      const onRight = Math.abs(p.x - (x + w)) < threshold && p.y >= y - threshold && p.y <= y + h + threshold
      const onTop = Math.abs(p.y - y) < threshold && p.x >= x - threshold && p.x <= x + w + threshold
      const onBot = Math.abs(p.y - (y + h)) < threshold && p.x >= x - threshold && p.x <= x + w + threshold
      return onLeft || onRight || onTop || onBot
    }
    case 'freehand':
      for (let i = 0; i < pts.length - 1; i++) {
        if (distToSegment(p, pts[i], pts[i + 1]) < threshold) return true
      }
      return false
    case 'angle':
      if (pts.length < 3) return pts.length >= 2 && distToSegment(p, pts[0], pts[1]) < threshold
      return distToSegment(p, pts[0], pts[1]) < threshold || distToSegment(p, pts[1], pts[2]) < threshold
    default:
      return false
  }
}

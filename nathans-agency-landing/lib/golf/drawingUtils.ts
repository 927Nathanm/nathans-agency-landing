import type { Annotation, Point, AnnotationStyle } from './annotationTypes'

function denorm(p: Point, w: number, h: number): [number, number] {
  return [p.x * w, p.y * h]
}

function applyStyle(ctx: CanvasRenderingContext2D, style: AnnotationStyle) {
  ctx.strokeStyle = style.color
  ctx.lineWidth = style.strokeWidth
  ctx.globalAlpha = style.opacity
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
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
      ctx.beginPath()
      ctx.moveTo(pts[0][0], pts[0][1])
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1])
      ctx.stroke()
      break
    }
    case 'angle':
    case 'protractor': {
      // Click order: arm1End → vertex (corner) → arm2End
      if (pts.length < 2) break
      const [arm1End, vertex, arm2End] = pts

      // Draw first arm: arm1End → vertex
      ctx.beginPath()
      ctx.moveTo(arm1End[0], arm1End[1])
      ctx.lineTo(vertex[0], vertex[1])
      ctx.stroke()

      if (!arm2End) break // preview: only first arm so far

      // Draw second arm: vertex → arm2End
      ctx.beginPath()
      ctx.moveTo(vertex[0], vertex[1])
      ctx.lineTo(arm2End[0], arm2End[1])
      ctx.stroke()

      // Arc at vertex — always shows interior (smaller) angle
      const a1 = Math.atan2(arm1End[1] - vertex[1], arm1End[0] - vertex[0])
      const a2 = Math.atan2(arm2End[1] - vertex[1], arm2End[0] - vertex[0])
      const arm1Len = Math.hypot(arm1End[0] - vertex[0], arm1End[1] - vertex[1])
      const arm2Len = Math.hypot(arm2End[0] - vertex[0], arm2End[1] - vertex[1])
      const arcR = Math.min(28, Math.min(arm1Len, arm2Len) * 0.35)

      // Normalise angle difference to [0, 2π) so we can choose shorter sweep
      let diff = ((a2 - a1) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2)
      const ccw = diff > Math.PI // if diff > 180° the short way is counter-clockwise
      ctx.beginPath()
      ctx.arc(vertex[0], vertex[1], arcR, a1, a2, ccw)
      ctx.stroke()

      // Degree label — use the shorter angle
      const deg = ccw ? 360 - (diff * 180) / Math.PI : (diff * 180) / Math.PI
      const label = ann.label || `${deg.toFixed(1)}°`
      // Place label halfway around the arc on the interior side
      const midA = ccw ? a1 - diff / 2 : a1 + diff / 2
      const lx = vertex[0] + (arcR + 14) * Math.cos(midA)
      const ly = vertex[1] + (arcR + 14) * Math.sin(midA)
      ctx.font = `bold ${11 + ann.style.strokeWidth}px sans-serif`
      ctx.fillStyle = ann.style.color
      ctx.globalAlpha = ann.style.opacity
      ctx.fillText(label, lx, ly)
      break
    }
    default:
      break
  }

  // Label for non-angle tools
  if (ann.label && ann.tool !== 'angle' && ann.tool !== 'protractor') {
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

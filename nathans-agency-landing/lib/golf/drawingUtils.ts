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
      if (pts.length < 3) break
      const [vertex, arm1, arm2] = pts
      // Draw two arms
      ctx.beginPath()
      ctx.moveTo(vertex[0], vertex[1])
      ctx.lineTo(arm1[0], arm1[1])
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(vertex[0], vertex[1])
      ctx.lineTo(arm2[0], arm2[1])
      ctx.stroke()
      // Draw arc
      const a1 = Math.atan2(arm1[1] - vertex[1], arm1[0] - vertex[0])
      const a2 = Math.atan2(arm2[1] - vertex[1], arm2[0] - vertex[0])
      const arcR = 30
      ctx.beginPath()
      ctx.arc(vertex[0], vertex[1], arcR, a1, a2, false)
      ctx.stroke()
      // Label the angle in degrees
      const deg = Math.abs(((a2 - a1) * 180) / Math.PI)
      const label = ann.label || `${deg.toFixed(1)}°`
      const midAngle = (a1 + a2) / 2
      const lx = vertex[0] + (arcR + 14) * Math.cos(midAngle)
      const ly = vertex[1] + (arcR + 14) * Math.sin(midAngle)
      ctx.font = `bold ${12 + ann.style.strokeWidth}px sans-serif`
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

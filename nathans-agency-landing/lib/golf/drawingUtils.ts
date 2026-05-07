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
    case 'angle': {
      // Click order: point 1 → vertex (corner where angle is measured) → point 3
      if (pts.length === 0) break
      const isPreview = ann.id === 'preview'

      // Small dots at clicked points — only during in-progress preview, hidden once committed
      if (isPreview) {
        for (const p of pts) {
          ctx.save()
          ctx.fillStyle = ann.style.color
          ctx.globalAlpha = ann.style.opacity
          ctx.beginPath()
          ctx.arc(p[0], p[1], 3, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
        }
      }

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

      // Thin arc — slightly thinner than the arms for an elegant measurement look
      ctx.save()
      ctx.lineWidth = Math.max(1, ann.style.strokeWidth * 0.65)
      ctx.beginPath()
      ctx.arc(vertex[0], vertex[1], arcR, a1, a2, ccw)
      ctx.stroke()
      ctx.restore()

      // Degree label — clean text with subtle dark outline (no pill)
      const deg = ccw ? 360 - (diff * 180) / Math.PI : (diff * 180) / Math.PI
      const label = ann.label || `${deg.toFixed(0)}°`

      const midA = ccw ? a1 - diff / 2 : a1 + diff / 2
      const labelDist = arcR + 14
      const lx = vertex[0] + labelDist * Math.cos(midA)
      const ly = vertex[1] + labelDist * Math.sin(midA)

      ctx.save()
      ctx.font = '600 14px ui-sans-serif, system-ui, -apple-system, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.lineWidth = 3.5
      ctx.lineJoin = 'round'
      ctx.miterLimit = 2
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)'
      ctx.strokeText(label, lx, ly)
      ctx.globalAlpha = ann.style.opacity
      ctx.fillStyle = ann.style.color
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

// Deterministic annotation builders. The LLM picks WHICH annotation to draw;
// this module computes the actual geometry from pose + club-path data.
//
// LLM outputs must NEVER include pixel coordinates. If you find yourself
// adding a builder that takes coords from a model, stop — the architectural
// point of this layer is that the model selects intent, code does the math.

import type { Annotation, Point } from '@/lib/golf/annotationTypes'
import type { Keypoint } from '@/hooks/golf/usePoseDetection'
import type { FrameMeasurements } from '@/lib/golf/poseMeasurements'

// BlazePose landmark indices (mirrors the table in poseMeasurements.ts).
const LM_LEFT_WRIST = 15
const LM_RIGHT_WRIST = 16
const LM_LEFT_ANKLE = 27
const LM_RIGHT_ANKLE = 28

export type Handedness = 'right' | 'left'

const MIN_HAND_SCORE = 0.25
const SWING_PLANE_COLOR = '#FFD400'
const HAND_PATH_COLOR = '#00E5FF'

export interface BuildSwingPlaneArgs {
  /** Pose keypoints at the address (P1) frame */
  poseFrame: Keypoint[]
  /** First tracked club-position point (proxy for the ball at address). Normalized 0..1. Optional — if absent we infer "ball" from foot midpoint. */
  clubPathFirstPoint?: Point
  /** Pixel dimensions of the source video. Not strictly needed for normalized output but kept for future builders. */
  videoDims: { width: number; height: number }
  handedness?: Handedness
}

/**
 * Build the user's swing-plane line.
 *
 * Geometry: a line from the ball position through the midpoint of lead-hand
 * and trail-hand at address, extrapolated up to the top edge of the video
 * frame (y=0 in normalized coordinates). When a traced club path is supplied,
 * its first point is the ball; otherwise we fall back to the midpoint between
 * the user's feet (ankles), which sits very close to the ball at address.
 *
 * Returns null if any input is missing or fails confidence checks.
 */
export function buildSwingPlaneAnnotation(args: BuildSwingPlaneArgs): Annotation | null {
  const { poseFrame, clubPathFirstPoint, handedness = 'right' } = args
  if (!poseFrame || poseFrame.length === 0) return null

  const leadIsLeft = handedness === 'right'
  const leadHand = poseFrame[leadIsLeft ? LM_LEFT_WRIST : LM_RIGHT_WRIST]
  const trailHand = poseFrame[leadIsLeft ? LM_RIGHT_WRIST : LM_LEFT_WRIST]

  if (!leadHand || !trailHand) return null
  if (leadHand.score < MIN_HAND_SCORE || trailHand.score < MIN_HAND_SCORE) return null

  const handsMid: Point = {
    x: (leadHand.x + trailHand.x) / 2,
    y: (leadHand.y + trailHand.y) / 2,
  }

  // Pick the ball position: traced club start if available, else foot midpoint.
  let ball: Point | null = clubPathFirstPoint ?? null
  if (!ball) {
    const leftAnkle = poseFrame[LM_LEFT_ANKLE]
    const rightAnkle = poseFrame[LM_RIGHT_ANKLE]
    if (leftAnkle && rightAnkle && leftAnkle.score >= MIN_HAND_SCORE && rightAnkle.score >= MIN_HAND_SCORE) {
      ball = {
        x: (leftAnkle.x + rightAnkle.x) / 2,
        y: (leftAnkle.y + rightAnkle.y) / 2,
      }
    }
  }
  if (!ball) return null

  const dx = handsMid.x - ball.x
  const dy = handsMid.y - ball.y

  // Hands should be above the ball — i.e. smaller y. If not, the data is
  // unreliable (mistaken P1, occluded hands, weird camera angle).
  if (dy >= -0.02) return null

  // Extrapolate to the top of the frame (y=0).
  const tTop = -ball.y / dy
  let topX = ball.x + tTop * dx
  let topY = 0
  // If the line would exit the side of the frame before reaching the top,
  // clamp to the side wall so we don't render an off-canvas line.
  if (topX < 0 || topX > 1) {
    const clampedX = topX < 0 ? 0 : 1
    const tSide = (clampedX - ball.x) / dx
    topX = clampedX
    topY = ball.y + tSide * dy
  }

  return {
    id: crypto.randomUUID(),
    tool: 'line',
    points: [
      { x: ball.x, y: ball.y },
      { x: topX, y: topY },
    ],
    style: {
      color: SWING_PLANE_COLOR,
      strokeWidth: 3,
      opacity: 0.9,
    },
    label: 'Swing plane (AI)',
    source: 'ai',
  }
}

export interface BuildHandPathArgs {
  /** Full measurement time series for the video. */
  series: FrameMeasurements[]
  /** Which hand to trace. Defaults to lead hand (most useful for path analysis). */
  hand?: 'lead' | 'trail'
}

/**
 * Build a freehand trace of the hand's path across the entire swing.
 *
 * Pulls lead (or trail) hand image-space coords from each frame's
 * measurements, filters out frames where the hand wasn't measurable, and
 * returns a polyline. Returns null if too few points to be meaningful.
 */
export function buildHandPathAnnotation(args: BuildHandPathArgs): Annotation | null {
  const { series, hand = 'lead' } = args
  if (!series || series.length === 0) return null

  const points: Point[] = []
  for (const m of series) {
    const x = hand === 'lead' ? m.leadHandX : m.trailHandX
    const y = hand === 'lead' ? m.leadHandY : m.trailHandY
    if (x == null || y == null) continue
    points.push({ x, y })
  }

  if (points.length < 5) return null

  return {
    id: crypto.randomUUID(),
    tool: 'freehand',
    points,
    style: {
      color: HAND_PATH_COLOR,
      strokeWidth: 2,
      opacity: 0.85,
    },
    label: `${hand === 'lead' ? 'Lead' : 'Trail'} hand path (AI)`,
    source: 'ai',
  }
}

// Deterministic annotation builders. The LLM picks WHICH annotation to draw;
// this module computes the actual geometry from pose + club-path data.
//
// LLM outputs must NEVER include pixel coordinates. If you find yourself
// adding a builder that takes coords from a model, stop — the architectural
// point of this layer is that the model selects intent, code does the math.

import type { Annotation, Point } from '@/lib/golf/annotationTypes'
import type { Keypoint } from '@/hooks/golf/usePoseDetection'

// BlazePose landmark indices (mirrors the table in poseMeasurements.ts).
const LM_LEFT_WRIST = 15
const LM_RIGHT_WRIST = 16

export type Handedness = 'right' | 'left'

const MIN_HAND_SCORE = 0.4
const SWING_PLANE_COLOR = '#FFD400'

export interface BuildSwingPlaneArgs {
  /** Pose keypoints at the address (P1) frame */
  poseFrame: Keypoint[]
  /** First tracked club-position point (proxy for the ball at address). Normalized 0..1. */
  clubPathFirstPoint: Point
  /** Pixel dimensions of the source video. Not strictly needed for normalized output but kept for future builders. */
  videoDims: { width: number; height: number }
  handedness?: Handedness
}

/**
 * Build the user's swing-plane line.
 *
 * Geometry: a line from the ball position (clubPathFirstPoint) through the
 * midpoint of lead-hand and trail-hand at address, extrapolated up to the
 * top edge of the video frame (y=0 in normalized coordinates).
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

  const ball = clubPathFirstPoint
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

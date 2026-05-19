// Derived measurements from a single BlazePose 33-landmark frame.
// Coordinates are normalized 0..1 in the video frame.
// Defaults assume a right-handed golfer (lead = left side of body, trail = right).
//
// Confidence: each metric is `null` when the landmarks it needs are below the
// score threshold — better to omit than to feed garbage to the LLM.

import type { Keypoint } from '@/hooks/golf/usePoseDetection'

// BlazePose landmark indices
const LM = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
} as const

export type Handedness = 'right' | 'left'

export interface FrameMeasurements {
  /** Video time when this frame was sampled (seconds) */
  t: number
  /** Spine tilt from vertical in degrees. Positive = leans toward lead (target) side. Null if low confidence. */
  spineTiltDeg: number | null
  /** Horizontal head position relative to hip-midpoint, normalized by shoulder width. Negative = toward target. */
  headDriftX: number | null
  /** Vertical head position relative to hip-midpoint, normalized by shoulder width. More negative = head higher. */
  headDriftY: number | null
  /** Lead-arm elbow angle in degrees (180 = straight). */
  leadArmAngleDeg: number | null
  /** Trail-arm elbow angle in degrees (180 = straight). */
  trailArmAngleDeg: number | null
  /** Lead wrist x relative to spine center (hip-midpoint x), normalized by shoulder width. */
  leadWristX: number | null
  /** Trail wrist x relative to spine center, normalized by shoulder width. */
  trailWristX: number | null
  /** Lead wrist y relative to spine center, normalized by shoulder width. (Negative = above the hip line) */
  leadWristY: number | null
  /** Trail wrist y relative to spine center, normalized by shoulder width. */
  trailWristY: number | null

  // Image-space (0..1, raw video frame coords) — used by phase detection and
  // geometry builders that need the actual pixel location of body parts.
  /** Lead-hand x in image space (0..1). */
  leadHandX: number | null
  /** Lead-hand y in image space (0..1). */
  leadHandY: number | null
  /** Trail-hand x in image space (0..1). */
  trailHandX: number | null
  /** Trail-hand y in image space (0..1). */
  trailHandY: number | null
  /** Head (nose) x in image space (0..1). */
  headX: number | null
  /** Head (nose) y in image space (0..1). */
  headY: number | null
}

const MIN_SCORE = 0.4

function ok(k: Keypoint | undefined): k is Keypoint {
  return !!k && k.score >= MIN_SCORE
}

function midpoint(a: Keypoint, b: Keypoint) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function angleAt(vertex: Keypoint, a: Keypoint, b: Keypoint): number {
  const v1x = a.x - vertex.x
  const v1y = a.y - vertex.y
  const v2x = b.x - vertex.x
  const v2y = b.y - vertex.y
  const dot = v1x * v2x + v1y * v2y
  const m1 = Math.hypot(v1x, v1y)
  const m2 = Math.hypot(v2x, v2y)
  if (m1 === 0 || m2 === 0) return NaN
  const cos = Math.max(-1, Math.min(1, dot / (m1 * m2)))
  return (Math.acos(cos) * 180) / Math.PI
}

/**
 * Compute one frame of measurements from BlazePose landmarks.
 * Returns nulls per-field for landmarks that didn't meet the confidence threshold.
 */
export function computeMeasurements(
  keypoints: Keypoint[],
  videoTime: number,
  handedness: Handedness = 'right',
): FrameMeasurements {
  const k = keypoints
  const ls = k[LM.LEFT_SHOULDER]
  const rs = k[LM.RIGHT_SHOULDER]
  const lh = k[LM.LEFT_HIP]
  const rh = k[LM.RIGHT_HIP]
  const nose = k[LM.NOSE]

  // Lead/trail mapping
  const leadIsLeft = handedness === 'right'
  const leadShoulder = leadIsLeft ? ls : rs
  const trailShoulder = leadIsLeft ? rs : ls
  const leadElbow = k[leadIsLeft ? LM.LEFT_ELBOW : LM.RIGHT_ELBOW]
  const trailElbow = k[leadIsLeft ? LM.RIGHT_ELBOW : LM.LEFT_ELBOW]
  const leadWrist = k[leadIsLeft ? LM.LEFT_WRIST : LM.RIGHT_WRIST]
  const trailWrist = k[leadIsLeft ? LM.RIGHT_WRIST : LM.LEFT_WRIST]

  let spineTiltDeg: number | null = null
  let headDriftX: number | null = null
  let headDriftY: number | null = null
  let leadArmAngleDeg: number | null = null
  let trailArmAngleDeg: number | null = null
  let leadWristX: number | null = null
  let trailWristX: number | null = null
  let leadWristY: number | null = null
  let trailWristY: number | null = null
  let leadHandX: number | null = null
  let leadHandY: number | null = null
  let trailHandX: number | null = null
  let trailHandY: number | null = null
  let headX: number | null = null
  let headY: number | null = null

  if (ok(leadWrist)) {
    leadHandX = leadWrist.x
    leadHandY = leadWrist.y
  }
  if (ok(trailWrist)) {
    trailHandX = trailWrist.x
    trailHandY = trailWrist.y
  }
  if (ok(nose)) {
    headX = nose.x
    headY = nose.y
  }

  if (ok(ls) && ok(rs) && ok(lh) && ok(rh)) {
    const shoulderMid = midpoint(ls, rs)
    const hipMid = midpoint(lh, rh)
    const shoulderWidth = distance(ls, rs) || 1e-6

    // Spine tilt: angle of (hip → shoulder) vector from vertical.
    // Vertical-up vector is (0, -1) since y grows downward.
    const dx = shoulderMid.x - hipMid.x
    const dy = shoulderMid.y - hipMid.y
    // Angle from vertical (positive x means leaning to image-right).
    // Then convert image-right → lead/trail based on handedness.
    const rawDeg = (Math.atan2(dx, -dy) * 180) / Math.PI
    spineTiltDeg = leadIsLeft ? -rawDeg : rawDeg // positive = lean to lead

    if (ok(nose)) {
      headDriftX = (nose.x - hipMid.x) / shoulderWidth
      if (leadIsLeft) headDriftX = -headDriftX // negative = toward target
      headDriftY = (nose.y - hipMid.y) / shoulderWidth
    }

    if (ok(leadShoulder) && ok(leadElbow) && ok(leadWrist)) {
      leadArmAngleDeg = angleAt(leadElbow, leadShoulder, leadWrist)
      leadWristX = (leadWrist.x - hipMid.x) / shoulderWidth
      if (leadIsLeft) leadWristX = -leadWristX
      leadWristY = (leadWrist.y - hipMid.y) / shoulderWidth
    }
    if (ok(trailShoulder) && ok(trailElbow) && ok(trailWrist)) {
      trailArmAngleDeg = angleAt(trailElbow, trailShoulder, trailWrist)
      trailWristX = (trailWrist.x - hipMid.x) / shoulderWidth
      if (leadIsLeft) trailWristX = -trailWristX
      trailWristY = (trailWrist.y - hipMid.y) / shoulderWidth
    }
  }

  return {
    t: videoTime,
    spineTiltDeg: roundOrNull(spineTiltDeg, 1),
    headDriftX: roundOrNull(headDriftX, 3),
    headDriftY: roundOrNull(headDriftY, 3),
    leadArmAngleDeg: roundOrNull(leadArmAngleDeg, 1),
    trailArmAngleDeg: roundOrNull(trailArmAngleDeg, 1),
    leadWristX: roundOrNull(leadWristX, 3),
    trailWristX: roundOrNull(trailWristX, 3),
    leadWristY: roundOrNull(leadWristY, 3),
    trailWristY: roundOrNull(trailWristY, 3),
    leadHandX: roundOrNull(leadHandX, 3),
    leadHandY: roundOrNull(leadHandY, 3),
    trailHandX: roundOrNull(trailHandX, 3),
    trailHandY: roundOrNull(trailHandY, 3),
    headX: roundOrNull(headX, 3),
    headY: roundOrNull(headY, 3),
  }
}

function roundOrNull(n: number | null, decimals: number): number | null {
  if (n === null || Number.isNaN(n)) return null
  const f = Math.pow(10, decimals)
  return Math.round(n * f) / f
}

/**
 * Downsample a time series to roughly `target` samples by even spacing,
 * preserving the first and last samples. Used to keep LLM payloads small.
 */
export function downsampleSeries(
  series: FrameMeasurements[],
  target = 60,
): FrameMeasurements[] {
  if (series.length <= target) return series
  const step = series.length / target
  const out: FrameMeasurements[] = []
  for (let i = 0; i < target; i++) {
    const idx = Math.min(series.length - 1, Math.floor(i * step))
    out.push(series[idx])
  }
  if (out[out.length - 1] !== series[series.length - 1]) {
    out.push(series[series.length - 1])
  }
  return out
}

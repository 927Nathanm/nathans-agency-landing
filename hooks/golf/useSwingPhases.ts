'use client'

// Swing-phase (P-position) detection from pose-derived measurements.
// Heuristic and intentionally simple — we'd rather be approximately right
// than confidently wrong.
//
// Currently implements only P1 (address). The phases hook is structured to
// add more phases (P4, P7) without an API change.

import { useCallback } from 'react'
import type { FrameMeasurements } from '@/lib/golf/measurementTypes'

export interface SwingPhases {
  /** Index into the measurements series of the detected P1 frame, or null. */
  p1Frame: number | null
  // TODO: P4 detection — find the hand-y velocity zero-crossing after P1
  // (the moment lead hand stops rising and starts coming back down).
  p4Frame: null
}

const P1_WINDOW = 8
const P1_Y_VARIANCE_MAX = 0.0009 // ~3% of frame height stddev
const P1_LOWER_THIRD = 0.55 // hand must be below this y to count as "address"

function variance(arr: number[]): number {
  if (arr.length === 0) return Number.POSITIVE_INFINITY
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length
  let s = 0
  for (const v of arr) s += (v - mean) ** 2
  return s / arr.length
}

function median(arr: number[]): number {
  const sorted = arr.slice().sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/**
 * Find P1 (address) — the first sustained period where lead hand is settled
 * and low in the frame. Returns the median index of that window.
 */
export function detectP1(series: FrameMeasurements[]): number | null {
  if (series.length < P1_WINDOW) return null
  for (let start = 0; start <= series.length - P1_WINDOW; start++) {
    const window = series.slice(start, start + P1_WINDOW)
    const ys = window
      .map(m => m.leadHandY)
      .filter((y): y is number => y !== null)
    if (ys.length < P1_WINDOW) continue
    if (variance(ys) > P1_Y_VARIANCE_MAX) continue
    if (median(ys) < P1_LOWER_THIRD) continue
    // Match — return the median frame's index relative to the full series.
    const indices = window
      .map((m, i) => (m.leadHandY !== null ? start + i : -1))
      .filter(i => i >= 0)
    return indices[Math.floor(indices.length / 2)]
  }
  return null
}

interface PhaseSource {
  getSeries: () => FrameMeasurements[]
}

export function useSwingPhases(source: PhaseSource) {
  // Phases are detected on-demand rather than tracked in state. The series
  // grows continuously as the user plays through the video; recomputing on a
  // few measurements is cheap and avoids stale-state races.
  const detect = useCallback((): SwingPhases => {
    const series = source.getSeries()
    return {
      p1Frame: detectP1(series),
      p4Frame: null,
    }
  }, [source])

  return { detect }
}

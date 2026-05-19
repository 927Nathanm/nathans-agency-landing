'use client'

// Thin adapter over the measurement time series that usePoseDetection already
// records. Provides a stable surface for components that want pose-derived
// measurements without depending on the pose hook directly.

import { useCallback } from 'react'
import type { FrameMeasurements } from '@/lib/golf/measurementTypes'
import type { Keypoint } from '@/hooks/golf/usePoseDetection'

interface MeasurementSource {
  getMeasurements: () => FrameMeasurements[]
  getKeypointsAt: (index: number) => Keypoint[] | null
  clearMeasurements: () => void
}

export interface SwingMeasurements {
  getSeries: () => FrameMeasurements[]
  getKeypointsAt: (index: number) => Keypoint[] | null
  clear: () => void
}

export function useSwingMeasurements(source: MeasurementSource): SwingMeasurements {
  const getSeries = useCallback(() => source.getMeasurements(), [source])
  const getKeypointsAt = useCallback(
    (index: number) => source.getKeypointsAt(index),
    [source],
  )
  const clear = useCallback(() => source.clearMeasurements(), [source])
  return { getSeries, getKeypointsAt, clear }
}

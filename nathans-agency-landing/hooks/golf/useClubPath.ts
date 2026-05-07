'use client'

import { useState, useCallback } from 'react'
import type { Point } from '@/lib/golf/annotationTypes'

export interface ClubPathPoint {
  time: number
  x: number
  y: number
}

export interface ClubPathData {
  points: ClubPathPoint[]
  color: string
  strokeWidth: number
  visible: boolean
}

const DEFAULT_PATH: ClubPathData = {
  points: [],
  color: '#ff6600',
  strokeWidth: 3,
  visible: true,
}

export function useClubPath() {
  const [isTracking, setIsTracking] = useState(false)
  const [path1, setPath1] = useState<ClubPathData>({ ...DEFAULT_PATH })
  const [path2, setPath2] = useState<ClubPathData>({ ...DEFAULT_PATH })
  const [pathColor, setPathColor] = useState('#ff6600')
  const [strokeWidth, setStrokeWidth] = useState(3)

  const toggleTracking = useCallback(() => {
    setIsTracking(v => !v)
  }, [])

  const addPoint = useCallback(
    (p: Point, time: number, slot: 1 | 2) => {
      const newPoint: ClubPathPoint = { time, x: p.x, y: p.y }
      const setter = slot === 1 ? setPath1 : setPath2
      setter(prev => ({
        ...prev,
        points: [...prev.points, newPoint].sort((a, b) => a.time - b.time),
        color: pathColor,
        strokeWidth,
      }))
    },
    [pathColor, strokeWidth]
  )

  const clearPath = useCallback((slot: 1 | 2 | 'both') => {
    const empty: ClubPathData = { ...DEFAULT_PATH, points: [] }
    if (slot === 1 || slot === 'both') setPath1(empty)
    if (slot === 2 || slot === 'both') setPath2(empty)
  }, [])

  const toggleVisible = useCallback((slot: 1 | 2 | 'both') => {
    if (slot === 1 || slot === 'both') setPath1(p => ({ ...p, visible: !p.visible }))
    if (slot === 2 || slot === 'both') setPath2(p => ({ ...p, visible: !p.visible }))
  }, [])

  const updateColor = useCallback((color: string) => {
    setPathColor(color)
    setPath1(p => ({ ...p, color }))
    setPath2(p => ({ ...p, color }))
  }, [])

  const updateStrokeWidth = useCallback((w: number) => {
    setStrokeWidth(w)
    setPath1(p => ({ ...p, strokeWidth: w }))
    setPath2(p => ({ ...p, strokeWidth: w }))
  }, [])

  return {
    isTracking,
    path1,
    path2,
    pathColor,
    strokeWidth,
    toggleTracking,
    addPoint,
    clearPath,
    toggleVisible,
    updateColor,
    updateStrokeWidth,
  }
}

'use client'

import { useState, useCallback } from 'react'
import type { DrawingTool, Point, DrawingState } from '@/lib/golf/annotationTypes'

const DEFAULT_COLORS = [
  '#ff0000', '#00ff00', '#0099ff', '#ffff00', '#ff6600',
  '#ff00ff', '#ffffff', '#00ffff',
]

export function useDrawing() {
  const [drawingState, setDrawingState] = useState<DrawingState>({
    activeTool: 'line',
    color: '#ff0000',
    strokeWidth: 2,
    isDrawing: false,
    currentPoints: [],
    targetVideo: 1,
    isPersistent: true,
  })

  const setTool = useCallback((tool: DrawingTool) => {
    setDrawingState(s => ({ ...s, activeTool: tool, isDrawing: false, currentPoints: [] }))
  }, [])

  const setColor = useCallback((color: string) => {
    setDrawingState(s => ({ ...s, color }))
  }, [])

  const setStrokeWidth = useCallback((strokeWidth: number) => {
    setDrawingState(s => ({ ...s, strokeWidth }))
  }, [])

  const setTargetVideo = useCallback((targetVideo: 1 | 2 | 'both') => {
    setDrawingState(s => ({ ...s, targetVideo }))
  }, [])

  const setIsPersistent = useCallback((isPersistent: boolean) => {
    setDrawingState(s => ({ ...s, isPersistent }))
  }, [])

  const startDrawing = useCallback((point: Point) => {
    setDrawingState(s => ({ ...s, isDrawing: true, currentPoints: [point] }))
  }, [])

  const continueDrawing = useCallback((point: Point) => {
    setDrawingState(s => {
      if (!s.isDrawing) return s
      const isFreehand = s.activeTool === 'freehand'
      const isAngleOrProtractor = s.activeTool === 'angle' || s.activeTool === 'protractor'
      if (isFreehand) {
        return { ...s, currentPoints: [...s.currentPoints, point] }
      }
      if (isAngleOrProtractor && s.currentPoints.length >= 2) {
        return { ...s, currentPoints: [s.currentPoints[0], s.currentPoints[1], point] }
      }
      return { ...s, currentPoints: [s.currentPoints[0] ?? point, point] }
    })
  }, [])

  const finishDrawing = useCallback((): Point[] | null => {
    let result: Point[] | null = null
    setDrawingState(s => {
      result = s.currentPoints.length > 0 ? s.currentPoints : null
      return { ...s, isDrawing: false, currentPoints: [] }
    })
    return result
  }, [])

  const cancelDrawing = useCallback(() => {
    setDrawingState(s => ({ ...s, isDrawing: false, currentPoints: [] }))
  }, [])

  const needsSecondClick = useCallback((tool: DrawingTool, pointCount: number) => {
    if (tool === 'angle' || tool === 'protractor') return pointCount === 1
    return false
  }, [])

  const handleCanvasClick = useCallback(
    (point: Point): 'start' | 'continue' | 'finish' => {
      let action: 'start' | 'continue' | 'finish' = 'finish'
      setDrawingState(s => {
        if (!s.isDrawing) {
          action = 'start'
          return { ...s, isDrawing: true, currentPoints: [point] }
        }
        if ((s.activeTool === 'angle' || s.activeTool === 'protractor') && s.currentPoints.length === 1) {
          action = 'continue'
          return { ...s, currentPoints: [...s.currentPoints, point] }
        }
        action = 'finish'
        return { ...s, isDrawing: false, currentPoints: [] }
      })
      return action
    },
    []
  )

  return {
    drawingState,
    setTool,
    setColor,
    setStrokeWidth,
    setTargetVideo,
    setIsPersistent,
    startDrawing,
    continueDrawing,
    finishDrawing,
    cancelDrawing,
    needsSecondClick,
    handleCanvasClick,
    DEFAULT_COLORS,
  }
}

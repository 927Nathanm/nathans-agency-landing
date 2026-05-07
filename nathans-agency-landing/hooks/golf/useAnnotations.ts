'use client'

import { useState, useCallback } from 'react'
import type { Annotation } from '@/lib/golf/annotationTypes'

export function useAnnotations() {
  const [annotations1, setAnnotations1] = useState<Annotation[]>([])
  const [annotations2, setAnnotations2] = useState<Annotation[]>([])
  const [undoStack, setUndoStack] = useState<{ a1: Annotation[]; a2: Annotation[] }[]>([])
  const [redoStack, setRedoStack] = useState<{ a1: Annotation[]; a2: Annotation[] }[]>([])

  const pushHistory = useCallback((a1: Annotation[], a2: Annotation[]) => {
    setUndoStack(s => [...s.slice(-49), { a1, a2 }])
    setRedoStack([])
  }, [])

  const addAnnotation = useCallback(
    (ann: Annotation, videoSlot: 1 | 2 | 'both') => {
      setAnnotations1(prev => {
        const next1 = videoSlot === 1 || videoSlot === 'both' ? [...prev, ann] : prev
        setAnnotations2(prev2 => {
          const next2 = videoSlot === 2 || videoSlot === 'both' ? [...prev2, ann] : prev2
          pushHistory(
            videoSlot === 1 || videoSlot === 'both' ? prev : prev,
            videoSlot === 2 || videoSlot === 'both' ? prev2 : prev2
          )
          return next2
        })
        return next1
      })
    },
    [pushHistory]
  )

  const addAnnotationToSlot = useCallback(
    (ann: Annotation, slot: 1 | 2) => {
      if (slot === 1) {
        setAnnotations1(prev => {
          pushHistory(prev, annotations2)
          return [...prev, ann]
        })
      } else {
        setAnnotations2(prev => {
          pushHistory(annotations1, prev)
          return [...prev, ann]
        })
      }
    },
    [annotations1, annotations2, pushHistory]
  )

  const undo = useCallback(() => {
    setUndoStack(prev => {
      if (prev.length === 0) return prev
      const last = prev[prev.length - 1]
      setRedoStack(r => [...r, { a1: annotations1, a2: annotations2 }])
      setAnnotations1(last.a1)
      setAnnotations2(last.a2)
      return prev.slice(0, -1)
    })
  }, [annotations1, annotations2])

  const redo = useCallback(() => {
    setRedoStack(prev => {
      if (prev.length === 0) return prev
      const last = prev[prev.length - 1]
      setUndoStack(u => [...u, { a1: annotations1, a2: annotations2 }])
      setAnnotations1(last.a1)
      setAnnotations2(last.a2)
      return prev.slice(0, -1)
    })
  }, [annotations1, annotations2])

  const clearSlot = useCallback(
    (slot: 1 | 2 | 'both') => {
      pushHistory(annotations1, annotations2)
      if (slot === 1 || slot === 'both') setAnnotations1([])
      if (slot === 2 || slot === 'both') setAnnotations2([])
    },
    [annotations1, annotations2, pushHistory]
  )

  const addAIAnnotations = useCallback(
    (anns: Annotation[], slot: 1 | 2) => {
      if (slot === 1) {
        setAnnotations1(prev => {
          pushHistory(prev, annotations2)
          return [...prev, ...anns]
        })
      } else {
        setAnnotations2(prev => {
          pushHistory(annotations1, prev)
          return [...prev, ...anns]
        })
      }
    },
    [annotations1, annotations2, pushHistory]
  )

  const removeAnnotationFromSlot = useCallback(
    (id: string, slot: 1 | 2) => {
      if (slot === 1) {
        setAnnotations1(prev => {
          pushHistory(prev, annotations2)
          return prev.filter(a => a.id !== id)
        })
      } else {
        setAnnotations2(prev => {
          pushHistory(annotations1, prev)
          return prev.filter(a => a.id !== id)
        })
      }
    },
    [annotations1, annotations2, pushHistory]
  )

  return {
    annotations1,
    annotations2,
    addAnnotation,
    addAnnotationToSlot,
    addAIAnnotations,
    removeAnnotationFromSlot,
    undo,
    redo,
    clearSlot,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
  }
}

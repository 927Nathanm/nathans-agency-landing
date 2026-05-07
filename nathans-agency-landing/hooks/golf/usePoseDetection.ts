'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export type Keypoint = {
  x: number       // normalized 0..1 (relative to video frame)
  y: number
  score: number
  name?: string
}

export const POSE_EDGES: [number, number][] = [
  [0, 1], [0, 2], [1, 3], [2, 4],
  [5, 6], [5, 7], [7, 9], [6, 8], [8, 10],
  [5, 11], [6, 12], [11, 12],
  [11, 13], [13, 15], [12, 14], [14, 16],
]

type Detector = {
  estimatePoses: (input: HTMLVideoElement) => Promise<Array<{
    keypoints: Array<{ x: number; y: number; score?: number; name?: string }>
  }>>
}

export function usePoseDetection() {
  const [enabled, setEnabled] = useState(false)
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [keypoints, setKeypoints] = useState<Keypoint[]>([])

  const detectorRef = useRef<Detector | null>(null)
  const inflightRef = useRef(false)

  useEffect(() => {
    if (!enabled || detectorRef.current || loading) return
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        // Import the full tfjs bundle (includes backends)
        const tf = await import('@tensorflow/tfjs')
        await tf.setBackend('webgl').catch(() => tf.setBackend('cpu'))
        await tf.ready()

        // Import pose-detection using namespace import to avoid named-export issues
        const pd = await import('@tensorflow-models/pose-detection')

        const detector = await pd.createDetector(
          pd.SupportedModels.MoveNet,
          { modelType: (pd as any).movenet.modelType.SINGLEPOSE_LIGHTNING },
        )

        if (!cancelled) {
          detectorRef.current = detector as unknown as Detector
          setReady(true)
        }
      } catch (err) {
        console.error('[pose] load failed', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [enabled, loading])

  const detect = useCallback(async (video: HTMLVideoElement | null) => {
    if (!enabled || !ready || !video || inflightRef.current) return
    if (video.videoWidth === 0 || video.videoHeight === 0) return
    const det = detectorRef.current
    if (!det) return
    inflightRef.current = true
    try {
      const poses = await det.estimatePoses(video)
      const first = poses[0]
      if (first) {
        const w = video.videoWidth
        const h = video.videoHeight
        setKeypoints(
          first.keypoints.map(k => ({
            x: k.x / w,
            y: k.y / h,
            score: k.score ?? 0,
            name: k.name,
          })),
        )
      } else {
        setKeypoints([])
      }
    } catch (err) {
      console.error('[pose] detect error', err)
    } finally {
      inflightRef.current = false
    }
  }, [enabled, ready])

  const toggle = useCallback(() => {
    setEnabled(e => {
      if (e) setKeypoints([])
      return !e
    })
  }, [])

  return { enabled, ready, loading, keypoints, detect, toggle }
}

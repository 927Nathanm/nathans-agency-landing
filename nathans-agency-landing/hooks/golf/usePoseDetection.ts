'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// MoveNet keypoint names — order matches the model output
export type Keypoint = {
  x: number       // normalized 0..1 (relative to video frame)
  y: number
  score: number
  name?: string
}

// 17 keypoints: nose, eyes, ears, shoulders, elbows, wrists, hips, knees, ankles
// Skeleton edges connecting joints for the stick-figure overlay
export const POSE_EDGES: [number, number][] = [
  // Face
  [0, 1], [0, 2], [1, 3], [2, 4],
  // Shoulders & arms
  [5, 6], [5, 7], [7, 9], [6, 8], [8, 10],
  // Torso
  [5, 11], [6, 12], [11, 12],
  // Legs
  [11, 13], [13, 15], [12, 14], [14, 16],
]

/**
 * Runs MoveNet pose detection in the browser via TensorFlow.js.
 * Model + tfjs core are dynamically imported only when the feature is enabled,
 * so the main bundle isn't bloated by ~7MB of weights for users who never
 * turn it on.
 */
export function usePoseDetection() {
  const [enabled, setEnabled] = useState(false)
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [keypoints, setKeypoints] = useState<Keypoint[]>([])

  // Hold the loaded detector across renders without triggering re-renders
  const detectorRef = useRef<{ estimatePoses: (v: HTMLVideoElement) => Promise<{ keypoints: Keypoint[] }[]> } | null>(null)
  const inflightRef = useRef(false)

  // Lazy-load tfjs + MoveNet on first enable
  useEffect(() => {
    if (!enabled || detectorRef.current || loading) return
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const tf = await import('@tensorflow/tfjs')
        const poseDetection = await import('@tensorflow-models/pose-detection')
        await tf.setBackend('webgl').catch(() => tf.setBackend('cpu'))
        await tf.ready()
        const detector = await poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet,
          { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING },
        )
        if (!cancelled) {
          detectorRef.current = detector as unknown as typeof detectorRef.current
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

  // Detect pose on a single video frame, normalize keypoints to 0..1
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

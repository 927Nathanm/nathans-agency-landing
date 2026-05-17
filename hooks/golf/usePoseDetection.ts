'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { computeMeasurements, type FrameMeasurements } from '@/lib/golf/poseMeasurements'

export type Keypoint = {
  x: number       // normalized 0..1
  y: number
  score: number
  name?: string
}

// BlazePose 33-landmark skeleton — golf-relevant connections
export const POSE_EDGES: [number, number][] = [
  // Torso
  [11, 12], [11, 23], [12, 24], [23, 24],
  // Left arm
  [11, 13], [13, 15], [15, 17], [15, 19],
  // Right arm
  [12, 14], [14, 16], [16, 18], [16, 20],
  // Left leg
  [23, 25], [25, 27], [27, 29], [27, 31],
  // Right leg
  [24, 26], [26, 28], [28, 30], [28, 32],
]

type PoseLandmark = { x: number; y: number; z: number; visibility?: number }
type PoseResults = { poseLandmarks?: PoseLandmark[] }
type PoseInstance = {
  setOptions: (opts: object) => void
  onResults: (cb: (results: PoseResults) => void) => void
  initialize: () => Promise<void>
  send: (inputs: { image: HTMLVideoElement }) => Promise<void>
  close: () => void
}
type PoseConstructor = new (config: { locateFile: (file: string) => string }) => PoseInstance

declare global {
  interface Window {
    Pose?: PoseConstructor
  }
}

const MEDIAPIPE_VERSION = '0.5.1675469404'
const MEDIAPIPE_CDN = `https://cdn.jsdelivr.net/npm/@mediapipe/pose@${MEDIAPIPE_VERSION}`

let scriptPromise: Promise<void> | null = null

function loadMediaPipeScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR'))
  if (window.Pose) return Promise.resolve()
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `${MEDIAPIPE_CDN}/pose.js`
    script.crossOrigin = 'anonymous'
    script.onload = () => resolve()
    script.onerror = () => {
      scriptPromise = null
      reject(new Error('Failed to load MediaPipe Pose script from CDN'))
    }
    document.head.appendChild(script)
  })
  return scriptPromise
}

export function usePoseDetection() {
  const [enabled, setEnabled] = useState(false)
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [keypoints, setKeypoints] = useState<Keypoint[]>([])

  const poseRef = useRef<PoseInstance | null>(null)
  const inflightRef = useRef(false)
  // Time series of derived measurements — kept in a ref so per-frame samples
  // don't trigger React re-renders. Drained via getMeasurements().
  const seriesRef = useRef<FrameMeasurements[]>([])
  const lastSampledTimeRef = useRef<number>(-1)
  const lastVideoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    if (!enabled || poseRef.current) return
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        await loadMediaPipeScript()
        if (cancelled) return
        const PoseCtor = window.Pose
        if (!PoseCtor) throw new Error('MediaPipe Pose constructor not available')

        const pose = new PoseCtor({
          locateFile: (file: string) => `${MEDIAPIPE_CDN}/${file}`,
        })

        pose.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        })

        pose.onResults((results) => {
          if (cancelled) return
          const lms = results.poseLandmarks
          if (lms) {
            const kps: Keypoint[] = lms.map(lm => ({
              x: lm.x,
              y: lm.y,
              score: lm.visibility ?? 1,
            }))
            setKeypoints(kps)

            // Record a measurement sample tied to the current video time,
            // de-duplicating on time so paused video doesn't pile up samples.
            const v = lastVideoRef.current
            if (v && v.currentTime !== lastSampledTimeRef.current) {
              const m = computeMeasurements(kps, v.currentTime)
              seriesRef.current.push(m)
              lastSampledTimeRef.current = v.currentTime
              // Cap memory at ~10s of dense sampling
              if (seriesRef.current.length > 1200) {
                seriesRef.current.splice(0, seriesRef.current.length - 1200)
              }
            }
          } else {
            setKeypoints([])
          }
        })

        await pose.initialize()

        if (!cancelled) {
          poseRef.current = pose
          setReady(true)
        }
      } catch (err) {
        console.error('[pose] load failed', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [enabled])

  const detect = useCallback(async (video: HTMLVideoElement | null) => {
    if (!enabled || !ready || !video || inflightRef.current) return
    if (video.videoWidth === 0 || video.videoHeight === 0) return
    const p = poseRef.current
    if (!p) return
    inflightRef.current = true
    // onResults reads video.currentTime via this ref to tag samples
    lastVideoRef.current = video
    try {
      await p.send({ image: video })
    } catch (err) {
      console.error('[pose] detect error', err)
    } finally {
      inflightRef.current = false
    }
  }, [enabled, ready])

  const getMeasurements = useCallback((): FrameMeasurements[] => {
    return seriesRef.current.slice()
  }, [])

  const clearMeasurements = useCallback(() => {
    seriesRef.current = []
    lastSampledTimeRef.current = -1
  }, [])

  const toggle = useCallback(() => {
    setEnabled(e => {
      if (e) {
        setKeypoints([])
        setReady(false)
        poseRef.current?.close()
        poseRef.current = null
        // Keep measurements when toggling off — user may still want to analyze
        // what was already captured. Explicit clear via clearMeasurements().
      }
      return !e
    })
  }, [])

  return { enabled, ready, loading, keypoints, detect, toggle, getMeasurements, clearMeasurements }
}

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

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

type PoseInstance = {
  setOptions: (opts: object) => void
  onResults: (cb: (results: { poseLandmarks?: Array<{ x: number; y: number; z: number; visibility?: number }> }) => void) => void
  initialize: () => Promise<void>
  send: (inputs: { image: HTMLVideoElement }) => Promise<void>
  close: () => void
}

export function usePoseDetection() {
  const [enabled, setEnabled] = useState(false)
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [keypoints, setKeypoints] = useState<Keypoint[]>([])

  const poseRef = useRef<PoseInstance | null>(null)
  const inflightRef = useRef(false)

  useEffect(() => {
    if (!enabled || poseRef.current) return
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const { Pose } = await import('@mediapipe/pose')

        const pose = new Pose({
          locateFile: (file: string) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${file}`,
        }) as unknown as PoseInstance

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
            setKeypoints(
              lms.map(lm => ({
                x: lm.x,
                y: lm.y,
                score: lm.visibility ?? 1,
              }))
            )
          } else {
            setKeypoints([])
          }
        })

        await pose.initialize()

        if (!cancelled) {
          poseRef.current = pose as unknown as PoseInstance
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
    try {
      await p.send({ image: video })
    } catch (err) {
      console.error('[pose] detect error', err)
    } finally {
      inflightRef.current = false
    }
  }, [enabled, ready])

  const toggle = useCallback(() => {
    setEnabled(e => {
      if (e) {
        setKeypoints([])
        setReady(false)
        poseRef.current?.close()
        poseRef.current = null
      }
      return !e
    })
  }, [])

  return { enabled, ready, loading, keypoints, detect, toggle }
}

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
    console.log('[pose] useEffect triggered: enabled=', enabled, 'detectorRef=', !!detectorRef.current, 'loading=', loading)
    if (!enabled || detectorRef.current) {
      console.log('[pose] useEffect bailed out: !enabled=' + !enabled + ' || detectorRef.current=' + !!detectorRef.current)
      return
    }
    if (loading) {
      console.debug('[pose] Already loading, skipping duplicate initialization')
      return
    }

    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    setLoading(true)

    ;(async () => {
      try {
        // Set absolute timeout - after 30s, force stop
        timeoutId = setTimeout(() => {
          if (!cancelled) {
            console.error('[pose] Initialization timeout after 30s')
            if (!cancelled) setLoading(false)
          }
        }, 30000)

        console.log('[pose] Step 1: Importing TensorFlow...')
        const tf = await import('@tensorflow/tfjs')
        if (cancelled) return
        console.log('[pose] Step 2: TensorFlow imported successfully')

        console.log('[pose] Step 3: Setting up backend...')
        try {
          await tf.setBackend('webgl')
          console.log('[pose] Step 4a: WebGL backend ready')
        } catch (webglErr) {
          console.warn('[pose] Step 4a: WebGL failed, using CPU:', webglErr)
          await tf.setBackend('cpu')
          console.log('[pose] Step 4b: CPU backend ready')
        }

        if (cancelled) return
        console.log('[pose] Step 5: Waiting for TensorFlow to be ready...')
        await tf.ready()
        if (cancelled) return
        console.log('[pose] Step 6: TensorFlow is ready')

        console.log('[pose] Step 7: Importing pose-detection...')
        const pd = await import('@tensorflow-models/pose-detection')
        if (cancelled) return
        console.log('[pose] Step 8: Pose-detection imported')

        console.log('[pose] Step 9: Creating MoveNet detector...')
        const detector = await pd.createDetector(
          pd.SupportedModels.MoveNet,
          { modelType: (pd as any).movenet?.modelType?.SINGLEPOSE_LIGHTNING }
        )
        if (cancelled) return
        console.log('[pose] Step 10: Detector created successfully!')

        detectorRef.current = detector as unknown as Detector
        setReady(true)
        setLoading(false)
      } catch (err) {
        console.error('[pose] FAILED at step:', err)
        if (err instanceof Error) {
          console.error('[pose] Error:', err.message)
          console.error('[pose] Stack:', err.stack)
        }
        if (!cancelled) setLoading(false)
      } finally {
        if (timeoutId) clearTimeout(timeoutId)
      }
    })()

    return () => {
      cancelled = true
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [enabled])

  const detect = useCallback(async (video: HTMLVideoElement | null) => {
    if (!enabled || !ready || !video || inflightRef.current) return
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.debug('[pose] Video not ready: width or height is 0')
      return
    }
    const det = detectorRef.current
    if (!det) {
      console.debug('[pose] Detector not ready')
      return
    }
    inflightRef.current = true
    try {
      const poses = await det.estimatePoses(video)
      const first = poses[0]
      if (first) {
        const w = video.videoWidth
        const h = video.videoHeight
        const kpts = first.keypoints.map(k => ({
          x: k.x / w,
          y: k.y / h,
          score: k.score ?? 0,
          name: k.name,
        }))
        setKeypoints(kpts)
      } else {
        setKeypoints([])
      }
    } catch (err) {
      console.error('[pose] Detection error', err)
    } finally {
      inflightRef.current = false
    }
  }, [enabled, ready])

  const toggle = useCallback(() => {
    console.log('[pose] Toggle called, current enabled state:', enabled)
    setEnabled(e => {
      console.log('[pose] Setting enabled from', e, 'to', !e)
      if (e) setKeypoints([])
      return !e
    })
  }, [enabled])

  return { enabled, ready, loading, keypoints, detect, toggle }
}

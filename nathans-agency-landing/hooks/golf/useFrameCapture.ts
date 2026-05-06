'use client'

import { useCallback } from 'react'
import { captureVideoFrame, stripDataUrlPrefix } from '@/lib/golf/videoUtils'

export function useFrameCapture(
  videoRef1: React.RefObject<HTMLVideoElement | null>,
  videoRef2: React.RefObject<HTMLVideoElement | null>,
  annotationCanvasRef1: React.RefObject<HTMLCanvasElement | null>,
  annotationCanvasRef2: React.RefObject<HTMLCanvasElement | null>
) {
  const captureFrames = useCallback(
    (slots: (1 | 2)[] = [1, 2]): { frame1?: string; frame2?: string } => {
      const result: { frame1?: string; frame2?: string } = {}
      if (slots.includes(1) && videoRef1.current) {
        const dataUrl = captureVideoFrame(
          videoRef1.current,
          annotationCanvasRef1.current
        )
        result.frame1 = stripDataUrlPrefix(dataUrl)
      }
      if (slots.includes(2) && videoRef2.current) {
        const dataUrl = captureVideoFrame(
          videoRef2.current,
          annotationCanvasRef2.current
        )
        result.frame2 = stripDataUrlPrefix(dataUrl)
      }
      return result
    },
    [videoRef1, videoRef2, annotationCanvasRef1, annotationCanvasRef2]
  )

  return { captureFrames }
}

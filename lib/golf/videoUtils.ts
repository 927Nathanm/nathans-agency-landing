export function captureVideoFrame(
  video: HTMLVideoElement,
  annotationCanvas?: HTMLCanvasElement | null,
  quality = 0.85
): string {
  const w = video.videoWidth || 1280
  const h = video.videoHeight || 720
  const offscreen = document.createElement('canvas')
  offscreen.width = w
  offscreen.height = h
  const ctx = offscreen.getContext('2d')!
  ctx.drawImage(video, 0, 0, w, h)
  if (annotationCanvas) {
    ctx.drawImage(annotationCanvas, 0, 0, w, h)
  }
  return offscreen.toDataURL('image/jpeg', quality)
}

export function stripDataUrlPrefix(dataUrl: string): string {
  const idx = dataUrl.indexOf(',')
  return idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl
}

export async function detectFps(video: HTMLVideoElement): Promise<number> {
  if (!('requestVideoFrameCallback' in HTMLVideoElement.prototype)) return 60
  return new Promise(resolve => {
    const times: number[] = []
    const cb = (_: number, meta: VideoFrameCallbackMetadata) => {
      times.push(meta.mediaTime)
      if (times.length < 6) {
        ;(video as any).requestVideoFrameCallback(cb)
      } else {
        const deltas: number[] = []
        for (let i = 1; i < times.length; i++) deltas.push(times[i] - times[i - 1])
        const avg = deltas.reduce((a, b) => a + b, 0) / deltas.length
        resolve(avg > 0 ? Math.round(1 / avg) : 30)
      }
    }
    ;(video as any).requestVideoFrameCallback(cb)
  })
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toFixed(2).padStart(5, '0')}`
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

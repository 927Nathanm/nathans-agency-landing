'use client'

import dynamic from 'next/dynamic'

const GolfAnalyzer = dynamic(
  () => import('@/components/golf/GolfAnalyzer').then(m => ({ default: m.GolfAnalyzer })),
  { ssr: false },
)

export function GolfAnalyzerClient() {
  return <GolfAnalyzer />
}

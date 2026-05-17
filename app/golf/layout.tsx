import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'SwingIQ — AI Golf Analyzer',
  description: 'Frame-by-frame golf swing analysis with AI coaching',
}

export default function GolfLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen overflow-hidden bg-zinc-950">
      {children}
    </div>
  )
}

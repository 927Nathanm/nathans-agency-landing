'use client'

import { useRef, useState, useCallback } from 'react'
import { Upload, Film } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  label: string
  onFileSelected: (file: File) => void
}

export function VideoUploader({ label, onFileSelected }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('video/')) return
      onFileSelected(file)
    },
    [onFileSelected]
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 h-full min-h-[240px] rounded-lg border-2 border-dashed transition-colors cursor-pointer',
        isDragging
          ? 'border-green-400 bg-green-400/10'
          : 'border-zinc-600 bg-zinc-900/50 hover:border-zinc-400 hover:bg-zinc-800/50'
      )}
      onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
    >
      <div className="rounded-full bg-zinc-800 p-4">
        {isDragging ? (
          <Film className="h-8 w-8 text-green-400" />
        ) : (
          <Upload className="h-8 w-8 text-zinc-400" />
        )}
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-zinc-300">{label}</p>
        <p className="mt-1 text-xs text-zinc-500">Drop video here or click to browse</p>
        <p className="mt-1 text-xs text-zinc-600">MP4, MOV, WebM</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}

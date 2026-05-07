export type DrawingTool =
  | 'select'
  | 'line'
  | 'arrow'
  | 'circle'
  | 'rect'
  | 'freehand'
  | 'angle'
  | 'plane'
  | 'eraser'

export interface Point {
  x: number // normalized 0-1
  y: number // normalized 0-1
}

export interface AnnotationStyle {
  color: string
  strokeWidth: number
  opacity: number
}

export interface Annotation {
  id: string
  tool: DrawingTool
  points: Point[]
  style: AnnotationStyle
  label?: string
  frameTime?: number
  source: 'user' | 'ai'
}

export interface AIAnnotationSuggestion {
  tool: DrawingTool
  points: number[][] // raw [[x,y], ...] from AI JSON
  color: string
  strokeWidth: number
  label?: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  hasFrames?: boolean
}

export interface StructuredAnalysis {
  phase?: string
  observations: string[]
  primaryIssue?: string
  recommendedFix?: string
  positives?: string[]
  annotationSuggestions?: Annotation[]
}

export interface VideoState {
  file: File | null
  objectUrl: string | null
  isLoaded: boolean
  duration: number
  videoWidth: number
  videoHeight: number
  fps: number
}

export interface PlaybackState {
  isPlaying: boolean
  currentTime: number
  playbackRate: number
  isMirrored: [boolean, boolean]
  overlayOpacity: number
  abLoop: { a: number | null; b: number | null }
  mode: 'dual' | 'single'
}

export interface DrawingState {
  activeTool: DrawingTool
  color: string
  strokeWidth: number
  isDrawing: boolean
  currentPoints: Point[]
  targetVideo: 1 | 2 | 'both'
  isPersistent: boolean
}

export interface AIState {
  messages: ChatMessage[]
  isLoading: boolean
  error: string | null
  pendingAnnotations: Annotation[]
}

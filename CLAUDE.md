# Nathan's Agency Landing — Golf Swing Analyzer

A Next.js 16 app with a golf swing analysis tool at `/golf` that uses MediaPipe pose detection + Claude Sonnet 4.6 for coaching feedback.

## Stack
- Next.js 16.2.6 with Turbopack
- MediaPipe BlazePose (loaded from CDN, not bundled — see `usePoseDetection.ts`)
- Claude Sonnet 4.6 via Anthropic API with SSE streaming + tool use
- TypeScript, Tailwind

## Key files

### LLM integration
- `app/api/golf-analysis/route.ts` — API proxy to Anthropic. Translates Anthropic's SSE stream into a simpler client protocol (`text` deltas + `tool_call` events). Has fallback to `builtInAnalysis` when no `ANTHROPIC_API_KEY`. Defines the `TOOLS` array (markSwingPlane, markHandPath).
- `lib/golf/golfSystemPrompt.ts` — The system prompt. Includes:
  - Golf swing blueprint by P-position
  - Common faults & fixes
  - **ANALYSIS STYLE & REASONING** — pushes AI toward explaining WHY, not reciting numbers
  - **INTELLECTUAL HONESTY** — forbids flip-flopping when user reframes videos; AI must hold position or explicitly explain what changed its mind
  - **ANNOTATION TOOLS** — only call tools on explicit draw/mark requests, not general analysis
- `hooks/golf/useAIAnalysis.ts` — Chat state machine. Dispatches `tool_call` events to client-side handlers. Strips annotation code blocks from text.

### Pose & measurements
- `hooks/golf/usePoseDetection.ts` — MediaPipe loader (via CDN `<script>` tag). Tracks `seriesRef` (FrameMeasurements[]) and `keypointsHistoryRef` (Keypoint[][]) in lock-step. Ring-buffer at ~1200 samples.
- `lib/golf/poseMeasurements.ts` — Computes per-frame measurements (spine tilt, head drift, arm angles, hand positions). Confidence-gated (null for low-score landmarks).
- `hooks/golf/useSwingPhases.ts` — P1 (address) detection via hand-stillness heuristic.

### Annotations (geometry builders)
- `lib/golf/aiAnnotations.ts` — Deterministic builders. LLM picks WHICH annotation to draw; this module computes coords from pose data. **LLM outputs must NEVER include pixel coordinates.**
  - `buildSwingPlaneAnnotation()` — cascades through club path → feet → shoulders fallback
  - `buildHandPathAnnotation()` — polyline trace
- `components/golf/AnnotationLayer.tsx` — renders annotations on the video

### UI
- `components/golf/GolfAnalyzer.tsx` — top-level component. Owns the tool handlers map. Uses `findBestAddressFrame()` to scan first 60 frames for highest landmark confidence.
- `components/golf/AIChatPanel.tsx` — chat UI. Shows green Apply banner when `pendingAnnotations.length > 0`; user must click Apply to render.

## Recent changes (May 2026)

**Commit 243a05c — Tool-use restriction:** AI was calling annotation tools on every question (e.g., asking "how's my swing" triggered hand-path drawing). System prompt + tool descriptions updated to only call tools on explicit draw/mark/visualize requests.

**Commit 4883551 — Analysis style:** AI was producing data tables without explaining mechanics. New section guides AI to: explain WHY (mechanical consequence), separate data observation from coaching insight, be constructively critical not a sidekick, use multi-factor analysis.

**Commit 5b64b28 — Anti-flip-flop:** AI was reversing its assessment when the user reframed videos ("actually V1 is my good swing"), even fabricating different numbers for the same data. New INTELLECTUAL HONESTY section forbids: citing different numbers across turns, silently reversing assessment, accepting user claims about which swing is good/bad without checking data.

## Dev workflow

```bash
npm run dev          # start dev server at localhost:3000
npm run lint         # eslint
npm run build        # production build
```

Set `ANTHROPIC_API_KEY` in `.env.local` for live LLM. Without it, falls back to a built-in canned response generator.

## Branch convention
Active development on `claude/setup-nextjs-dev-z1qBt`. Pushes go through OAuth proxy in container which sometimes 403s — workaround is to generate patches in container and apply locally on Mac.

## Architectural rules
- LLM never emits pixel coordinates. It picks tool intent; code computes geometry from pose landmarks.
- Measurements are confidence-gated. Don't fabricate values for low-score landmarks.
- 2D from a single camera. Cannot reliably measure shoulder rotation, depth-axis motion, club face angle. Don't have the AI claim it can.

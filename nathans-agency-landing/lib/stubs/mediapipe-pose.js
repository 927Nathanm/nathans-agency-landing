// Stub for @mediapipe/pose — only needed by the BlazePose backend in
// @tensorflow-models/pose-detection. We only use MoveNet which does NOT
// require MediaPipe, so we export an empty Pose class to satisfy the
// static import without pulling in the Closure-compiled bundle.
export class Pose {}
export const VERSION = '0.0.0'
export const POSE_CONNECTIONS = []
export const POSE_LANDMARKS = {}
export const POSE_LANDMARKS_LEFT = {}
export const POSE_LANDMARKS_RIGHT = {}
export const POSE_LANDMARKS_NEUTRAL = {}
export const InputImage = {}
export const NormalizedLandmarkList = {}
export const Results = {}

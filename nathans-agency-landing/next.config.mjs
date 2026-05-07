/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  transpilePackages: [
    '@tensorflow/tfjs',
    '@tensorflow-models/pose-detection',
  ],
  turbopack: {
    resolveAlias: {
      // @mediapipe/pose ships as a Closure bundle with no named ESM exports.
      // pose-detection statically imports {Pose} from it even for MoveNet,
      // so we redirect to a stub that satisfies the import at build time.
      '@mediapipe/pose': './lib/stubs/mediapipe-pose.js',
    },
  },
}

export default nextConfig

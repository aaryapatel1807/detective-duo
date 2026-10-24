/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Album ML runs on the server only: sharp and onnxruntime-web stay as
  // runtime requires (native/wasm files) instead of being bundled.
  experimental: {
    serverComponentsExternalPackages: ['sharp', 'onnxruntime-web'],
  },
};

module.exports = nextConfig;

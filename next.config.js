/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Album ML runs on the server only: sharp and onnxruntime-web stay as
  // runtime requires (native/wasm files) instead of being bundled.
  experimental: {
    serverComponentsExternalPackages: ['sharp', 'onnxruntime-web'],
    // onnxruntime-web loads its wasm backend by importing the
    // Emscripten .mjs wrapper next to the .wasm binary at runtime —
    // a dynamic load the file tracer cannot see, so the lambda
    // shipped without them and every classify call failed with "no
    // available backend", leaving photos stuck at Classifying…
    // forever (Nov 2026). Trace both files into the process route's
    // function so classify.ts can point wasmPaths at them.
    outputFileTracingIncludes: {
      '/api/albums/process': [
        './node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.mjs',
        './node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm',
      ],
      // Temporary diagnostic route (Nov 2026): same wasm pair, so it
      // tests exactly what the process route runs. Remove with it.
      '/api/albums/diag': [
        './node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.mjs',
        './node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm',
      ],
    },
  },
};

module.exports = nextConfig;

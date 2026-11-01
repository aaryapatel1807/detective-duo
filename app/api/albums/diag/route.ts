import { NextResponse } from 'next/server';
import * as ort from 'onnxruntime-web';
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { resolveWasmDir, wasmDirCandidates, WASM_FILES } from '@/lib/albums/wasmPaths';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * TEMPORARY diagnostic (Nov 2026, to be deleted once albums classify
 * reliably). No album key, no user photos, no secrets: it runs the
 * exact classify pipeline steps against generated/zero data and
 * reports which step fails inside the live function, because the
 * function's logs are unreachable from this setup and guessing
 * cost three failed ships. Each step is attempted independently so
 * one failure does not hide the next step's result.
 */
export async function GET(request: Request) {
  const out: Record<string, unknown> = {};
  const cwd = process.cwd();
  out.cwd = cwd;
  out.candidates = wasmDirCandidates(cwd).map((dir) => ({
    dir,
    files: WASM_FILES.map((f) => ({ file: f, exists: fs.existsSync(path.join(dir, f)) })),
  }));
  const wasmDir = resolveWasmDir();
  out.wasmDir = wasmDir;
  if (wasmDir) ort.env.wasm.wasmPaths = wasmDir;
  ort.env.wasm.numThreads = 1;

  // sharp (used for every resize in classify.ts)
  try {
    const png = await sharp({
      create: { width: 64, height: 64, channels: 3, background: { r: 200, g: 30, b: 30 } },
    })
      .png()
      .toBuffer();
    const { info } = await sharp(png).resize(224, 224, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true });
    out.sharp = { ok: true, width: info.width, height: info.height };
  } catch (e) {
    out.sharp = { ok: false, error: (e instanceof Error ? e.message : String(e)).slice(0, 300) };
  }

  // Model bytes, exactly the way classify.ts loads them in prod
  // (disk first, then the site's own public URL).
  const origin = new URL(request.url).origin;
  const loadModel = async (relative: string): Promise<Buffer> => {
    const diskPath = path.join(cwd, 'public', relative);
    try {
      return await fs.promises.readFile(diskPath);
    } catch {
      const res = await fetch(`${origin}/${relative}`);
      if (!res.ok) throw new Error(`could not load model asset ${relative}: ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    }
  };

  // Face + scene sessions, then a dummy inference on each.
  for (const [key, model, dims] of [
    ['face', 'models/face_detection_yunet_2023mar.onnx', 640],
    ['scene', 'models/mobilenetv2-12.onnx', 224],
  ] as const) {
    try {
      const bytes = await loadModel(model);
      const t0 = Date.now();
      const session = await ort.InferenceSession.create(bytes);
      const input = new ort.Tensor('float32', new Float32Array(3 * dims * dims), [1, 3, dims, dims]);
      const result = await session.run({ input });
      out[key] = {
        ok: true,
        sessionMs: Date.now() - t0,
        outputs: session.outputNames,
        firstOutputLength: (result[session.outputNames[0]!]?.data as ArrayLike<unknown>)?.length ?? null,
      };
    } catch (e) {
      out[key] = { ok: false, error: (e instanceof Error ? e.message : String(e)).slice(0, 500) };
    }
  }
  return NextResponse.json(out);
}

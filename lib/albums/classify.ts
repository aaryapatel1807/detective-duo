import * as ort from 'onnxruntime-web';
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { countFaces } from './decode';
import { mapLabelsToTags } from './sceneTags';
import type { ClassifyResult } from './types';

/**
 * Server-only photo classification. Two tiny ONNX models, both free,
 * both running inside this app (no photo ever leaves the stack):
 *  - YuNet (232KB) counts faces -> solo vs together.
 *  - MobileNetV2 (14MB) reads the scene -> nature, food, city, ...
 * Models live in public/models (public weights, not user data) and
 * are read from disk in local dev, or fetched from the site's own
 * public URL on a deployed function (public/ is not on the function's
 * filesystem). Sessions are cached per function instance.
 */
const FACE_MODEL = 'models/face_detection_yunet_2023mar.onnx';
const SCENE_MODEL = 'models/mobilenetv2-12.onnx';
const LABELS_FILE = 'models/imagenet_classes.txt';

interface Sessions {
  face: ort.InferenceSession;
  scene: ort.InferenceSession;
  labels: string[];
}

let cached: Sessions | null = null;

async function assetBytes(relative: string, assetBase?: string): Promise<Buffer> {
  const diskPath = path.join(process.cwd(), 'public', relative);
  try {
    return await fs.promises.readFile(diskPath);
  } catch {
    const base = (assetBase ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
    const res = await fetch(`${base}/${relative}`);
    if (!res.ok) throw new Error(`could not load model asset ${relative}: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
}

async function getSessions(assetBase?: string): Promise<Sessions> {
  if (cached) return cached;
  const [faceBytes, sceneBytes, labelsBytes] = await Promise.all([
    assetBytes(FACE_MODEL, assetBase),
    assetBytes(SCENE_MODEL, assetBase),
    assetBytes(LABELS_FILE, assetBase),
  ]);
  const face = await ort.InferenceSession.create(faceBytes);
  const scene = await ort.InferenceSession.create(sceneBytes);
  const labels = labelsBytes.toString('utf8').split('\n').filter(Boolean);
  cached = { face, scene, labels };
  return cached;
}

async function rgbBuffer(buffer: Buffer, width: number, height: number): Promise<{ data: Buffer; w: number; h: number }> {
  const { data, info } = await sharp(buffer)
    .resize(width, height, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

export async function countFacesInPhoto(buffer: Buffer, assetBase?: string): Promise<number> {
  const { face } = await getSessions(assetBase);
  const { data, w, h } = await rgbBuffer(buffer, 640, 640);
  // YuNet input: RGB, values 0-255 (OpenCV blobFromImage defaults).
  const chw = new Float32Array(3 * w * h);
  for (let i = 0; i < w * h; i++) {
    chw[i] = data[i * 3];
    chw[w * h + i] = data[i * 3 + 1];
    chw[2 * w * h + i] = data[i * 3 + 2];
  }
  const out = await face.run({ input: new ort.Tensor('float32', chw, [1, 3, h, w]) });
  const outputs: Record<string, Float32Array | number[]> = {};
  for (const name of face.outputNames) outputs[name] = out[name].data as Float32Array;
  // OpenCV's score threshold for YuNet is 0.9 by default; 0.6 keeps
  // real faces while the NMS below removes duplicate boxes.
  return countFaces(outputs, w, h, 0.6).count;
}

export async function sceneTagsForPhoto(buffer: Buffer, assetBase?: string): Promise<{ tags: string[]; topLabels: string[] }> {
  const { scene, labels } = await getSessions(assetBase);
  const { data } = await rgbBuffer(buffer, 224, 224);
  const mean = [0.485, 0.456, 0.406];
  const std = [0.229, 0.224, 0.225];
  const chw = new Float32Array(3 * 224 * 224);
  for (let i = 0; i < 224 * 224; i++) {
    for (let c = 0; c < 3; c++) {
      chw[c * 224 * 224 + i] = (data[i * 3 + c] / 255 - mean[c]) / std[c];
    }
  }
  const out = await scene.run({ input: new ort.Tensor('float32', chw, [1, 3, 224, 224]) });
  const logits = Array.from(out[scene.outputNames[0]].data as Float32Array);
  const top = logits
    .map((v, i) => ({ v, i }))
    .sort((a, b) => b.v - a.v)
    .slice(0, 3)
    .map((t) => labels[t.i] ?? 'unknown');
  return { tags: mapLabelsToTags(top), topLabels: top };
}

export async function classifyPhoto(buffer: Buffer, assetBase?: string): Promise<ClassifyResult> {
  const [faceCount, scene] = await Promise.all([
    countFacesInPhoto(buffer, assetBase),
    sceneTagsForPhoto(buffer, assetBase),
  ]);
  return { faceCount, sceneTags: scene.tags, topLabels: scene.topLabels };
}

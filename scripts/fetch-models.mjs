/**
 * Fetch the album ML model weights into public/models/.
 * Runs automatically as a postinstall step, and skips files that are
 * already present and valid. The weights are public artifacts (OpenCV
 * Zoo YuNet, ONNX Model Zoo MobileNetV2, PyTorch ImageNet labels) —
 * they live outside git so pushes stay small, and a deploy fetches
 * them at install time. If a download fails, this warns and exits 0:
 * uploads still work and photos wait as 'pending' until the models
 * arrive (see /api/albums/process).
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIR = path.join(ROOT, 'public', 'models');

const FILES = [
  {
    name: 'face_detection_yunet_2023mar.onnx',
    url: 'https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx',
    minBytes: 100_000,
  },
  {
    name: 'mobilenetv2-12.onnx',
    url: 'https://github.com/onnx/models/raw/main/validated/vision/classification/mobilenet/model/mobilenetv2-12.onnx',
    minBytes: 10_000_000,
  },
  {
    name: 'imagenet_classes.txt',
    url: 'https://raw.githubusercontent.com/pytorch/hub/master/imagenet_classes.txt',
    minBytes: 5_000,
  },
];

function looksValid(file, buffer) {
  if (buffer.length < file.minBytes) return false;
  // A GitHub 404 page is HTML — never a valid model or label file.
  if (buffer.subarray(0, 15).toString('utf8').includes('<!DOCTYPE html')) return false;
  return true;
}

fs.mkdirSync(DIR, { recursive: true });
let failed = 0;
for (const file of FILES) {
  const dest = path.join(DIR, file.name);
  try {
    if (fs.existsSync(dest) && looksValid(file, fs.readFileSync(dest))) {
      console.log(`models: ${file.name} already present, skipping`);
      continue;
    }
    console.log(`models: downloading ${file.name}...`);
    const res = await fetch(file.url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    if (!looksValid(file, buffer)) throw new Error('downloaded file failed validation');
    fs.writeFileSync(dest, buffer);
    console.log(`models: ${file.name} (${buffer.length} bytes)`);
  } catch (e) {
    failed++;
    console.warn(`models: WARNING could not fetch ${file.name}: ${e instanceof Error ? e.message : e}`);
  }
}
if (failed > 0) {
  console.warn(
    `models: ${failed} file(s) missing — album classification will stay pending until they are fetched (run: node scripts/fetch-models.mjs)`,
  );
}

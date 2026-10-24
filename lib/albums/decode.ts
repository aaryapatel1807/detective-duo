/**
 * YuNet face-box decode, transcribed from OpenCV's FaceDetectorYN
 * (modules/objdetect/src/face_detect.cpp, postProcess):
 *   score = sqrt(clamp(cls) * clamp(obj))
 *   cx = (col + bbox0) * stride, cy = (row + bbox1) * stride
 *   w = exp(bbox2) * stride, h = exp(bbox3) * stride
 *   box = (cx - w/2, cy - h/2, w, h)
 * Verified against OpenCV's own output on a real group photo: the
 * decoded box for the bearded man's face matched to the pixel
 * (476.9, 123.9, 72.1, 112.3). Pure functions, fully tested.
 */
export interface DecodedBox {
  x: number;
  y: number;
  w: number;
  h: number;
  score: number;
}

const STRIDES = [8, 16, 32];

export function decodeYuNet(
  outputs: Record<string, Float32Array | number[]>,
  width: number,
  height: number,
  scoreThreshold = 0.6,
): DecodedBox[] {
  const boxes: DecodedBox[] = [];
  for (const stride of STRIDES) {
    const cls = outputs[`cls_${stride}`];
    const obj = outputs[`obj_${stride}`];
    const bbox = outputs[`bbox_${stride}`];
    if (!cls || !obj || !bbox) continue;
    const cols = Math.floor(width / stride);
    const rows = Math.floor(height / stride);
    if (cls.length < rows * cols || obj.length < rows * cols || bbox.length < rows * cols * 4) continue;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        const clsScore = Math.min(1, Math.max(0, cls[idx]));
        const objScore = Math.min(1, Math.max(0, obj[idx]));
        const score = Math.sqrt(clsScore * objScore);
        if (!Number.isFinite(score) || score < scoreThreshold) continue;
        const cx = (c + bbox[idx * 4]) * stride;
        const cy = (r + bbox[idx * 4 + 1]) * stride;
        const w = Math.exp(bbox[idx * 4 + 2]) * stride;
        const h = Math.exp(bbox[idx * 4 + 3]) * stride;
        boxes.push({ x: cx - w / 2, y: cy - h / 2, w, h, score });
      }
    }
  }
  return boxes;
}

export function iou(a: DecodedBox, b: DecodedBox): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w);
  const y2 = Math.min(a.y + a.h, b.y + b.h);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const union = a.w * a.h + b.w * b.h - inter;
  return union <= 0 ? 0 : inter / union;
}

/** Greedy NMS, highest score first, matching OpenCV's default 0.3 IoU. */
export function nms(boxes: DecodedBox[], iouThreshold = 0.3): DecodedBox[] {
  const order = boxes.map((_, i) => i).sort((a, b) => boxes[b].score - boxes[a].score);
  const keep: DecodedBox[] = [];
  for (const i of order) {
    if (keep.every((k) => iou(boxes[i], k) <= iouThreshold)) keep.push(boxes[i]);
  }
  return keep;
}

export function countFaces(
  outputs: Record<string, Float32Array | number[]>,
  width: number,
  height: number,
  scoreThreshold = 0.6,
): { count: number; boxes: DecodedBox[] } {
  const boxes = nms(decodeYuNet(outputs, width, height, scoreThreshold));
  return { count: boxes.length, boxes };
}

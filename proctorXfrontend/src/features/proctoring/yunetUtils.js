/**
 * ==============================================================================
 * YUNET FACE DETECTION & 5-POINT AFFINE LANDMARK ALIGNMENT UTILS
 * ==============================================================================
 * Optimized for OpenCV Zoo YuNet ONNX Face Detector (640x640 / 320x320 input)
 * and SFace Face Recognition Canonical Alignment (112x112 target).
 */

export const YUNET_INPUT_SIZE = 640;

// Canonical 5-landmark target anchors on 112x112 face chip (OpenCV Zoo Standard)
export const CANONICAL_LANDMARKS_112 = [
  [38.2946, 51.6963], // Right eye
  [73.5318, 51.5014], // Left eye
  [56.0252, 71.7366], // Nose tip
  [41.5493, 92.3655], // Right mouth corner
  [70.7299, 92.2041]  // Left mouth corner
];

/**
 * Prepares Float32Array tensor [1, 3, 640, 640] in BGR format with letterbox padding.
 */
export function prepareYuNetInputTensor(rgbaData, width, height, targetSize = YUNET_INPUT_SIZE) {
  const tensorData = new Float32Array(3 * targetSize * targetSize);
  const scale = Math.min(targetSize / width, targetSize / height);
  const padX = Math.floor((targetSize - width * scale) / 2);
  const padY = Math.floor((targetSize - height * scale) / 2);

  const channelArea = targetSize * targetSize;

  for (let ty = 0; ty < targetSize; ty++) {
    const srcY = Math.min(height - 1, Math.max(0, Math.floor((ty - padY) / scale)));
    for (let tx = 0; tx < targetSize; tx++) {
      const srcX = Math.min(width - 1, Math.max(0, Math.floor((tx - padX) / scale)));
      const destIdx = ty * targetSize + tx;

      if (tx < padX || tx >= padX + width * scale || ty < padY || ty >= padY + height * scale) {
        // Pad border pixels with 0 (black)
        tensorData[destIdx] = 0;
        tensorData[channelArea + destIdx] = 0;
        tensorData[channelArea * 2 + destIdx] = 0;
      } else {
        const srcIdx = (srcY * width + srcX) * 4;
        const r = rgbaData[srcIdx];
        const g = rgbaData[srcIdx + 1];
        const b = rgbaData[srcIdx + 2];

        // YuNet expects BGR channel order with 0-255 float range
        tensorData[destIdx] = b;
        tensorData[channelArea + destIdx] = g;
        tensorData[channelArea * 2 + destIdx] = r;
      }
    }
  }

  return { tensorData, scale, padX, padY };
}

function iou(boxA, boxB) {
  const x1 = Math.max(boxA.x, boxB.x);
  const y1 = Math.max(boxA.y, boxB.y);
  const x2 = Math.min(boxA.x + boxA.width, boxB.x + boxB.width);
  const y2 = Math.min(boxA.y + boxA.height, boxB.y + boxB.height);

  const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  const areaA = boxA.width * boxA.height;
  const areaB = boxB.width * boxB.height;
  const union = areaA + areaB - intersection;

  return union > 0 ? intersection / union : 0;
}

function nms(detections, iouThreshold = 0.35, topK = 50) {
  const sorted = [...detections].sort((a, b) => b.score - a.score);
  const result = [];

  while (sorted.length > 0 && result.length < topK) {
    const current = sorted.shift();
    result.push(current);

    for (let i = sorted.length - 1; i >= 0; i--) {
      if (iou(current.box, sorted[i].box) > iouThreshold) {
        sorted.splice(i, 1);
      }
    }
  }

  return result;
}

/**
 * Decodes the 12 output tensors of YuNet into face detections with 5 landmarks.
 * In OpenCV YuNet, cls and obj outputs are already normalized probabilities [0, 1].
 */
export function decodeYuNetOutputs(results, scale, padX, padY, confThreshold = 0.55) {
  const strides = [8, 16, 32];
  const detections = [];

  for (const s of strides) {
    const clsTensor = results[`cls_${s}`];
    const objTensor = results[`obj_${s}`];
    const bboxTensor = results[`bbox_${s}`];
    const kpsTensor = results[`kps_${s}`];

    if (!clsTensor || !objTensor || !bboxTensor || !kpsTensor) continue;

    const cls = clsTensor.data;
    const obj = objTensor.data;
    const bbox = bboxTensor.data;
    const kps = kpsTensor.data;

    const cols = YUNET_INPUT_SIZE / s;
    const rows = YUNET_INPUT_SIZE / s;
    const numAnchors = rows * cols;

    for (let i = 0; i < numAnchors; i++) {
      // Clamping probabilities to [0, 1] as in OpenCV FaceDetectorYNImpl
      const clsScore = Math.min(1.0, Math.max(0.0, cls[i]));
      const objScore = Math.min(1.0, Math.max(0.0, obj[i]));
      const score = Math.sqrt(clsScore * objScore);

      if (score < confThreshold) continue;

      const r = Math.floor(i / cols);
      const c = i % cols;

      // Bounding box decoding
      const dx = bbox[i * 4 + 0];
      const dy = bbox[i * 4 + 1];
      const dw = bbox[i * 4 + 2];
      const dh = bbox[i * 4 + 3];

      const cx_padded = (c + dx) * s;
      const cy_padded = (r + dy) * s;
      const w_padded = Math.exp(dw) * s;
      const h_padded = Math.exp(dh) * s;

      // Map back from letterbox padded space to original image coordinates
      const cx = (cx_padded - padX) / scale;
      const cy = (cy_padded - padY) / scale;
      const width = w_padded / scale;
      const height = h_padded / scale;
      const x = cx - width / 2;
      const y = cy - height / 2;

      // 5-Point Landmarks decoding: [re_x, re_y, le_x, le_y, nt_x, nt_y, rmc_x, rmc_y, lmc_x, lmc_y]
      const rawLandmarks = [];
      for (let k = 0; k < 5; k++) {
        const kx_padded = (c + kps[i * 10 + k * 2 + 0]) * s;
        const ky_padded = (r + kps[i * 10 + k * 2 + 1]) * s;

        const kx = (kx_padded - padX) / scale;
        const ky = (ky_padded - padY) / scale;
        rawLandmarks.push([kx, ky]);
      }

      detections.push({
        box: { x, y, width, height },
        score: parseFloat(score.toFixed(4)),
        landmarks: {
          rightEye: rawLandmarks[0],
          leftEye: rawLandmarks[1],
          noseTip: rawLandmarks[2],
          rightMouth: rawLandmarks[3],
          leftMouth: rawLandmarks[4]
        },
        rawPoints: rawLandmarks
      });
    }
  }

  return nms(detections, 0.35);
}

/**
 * Computes optimal 2D affine transformation matrix [a, b, c, d, e, f]
 * mapping detected 5 landmarks to canonical 112x112 anchor coordinates.
 */
export function estimateAffineTransform(sourcePoints, targetPoints = CANONICAL_LANDMARKS_112) {
  let srcMeanX = 0, srcMeanY = 0;
  let dstMeanX = 0, dstMeanY = 0;
  const n = sourcePoints.length;

  for (let i = 0; i < n; i++) {
    srcMeanX += sourcePoints[i][0];
    srcMeanY += sourcePoints[i][1];
    dstMeanX += targetPoints[i][0];
    dstMeanY += targetPoints[i][1];
  }
  srcMeanX /= n;
  srcMeanY /= n;
  dstMeanX /= n;
  dstMeanY /= n;

  let srcVar = 0;
  let covXX = 0, covXY = 0, covYX = 0, covYY = 0;

  for (let i = 0; i < n; i++) {
    const rx = sourcePoints[i][0] - srcMeanX;
    const ry = sourcePoints[i][1] - srcMeanY;
    const dx = targetPoints[i][0] - dstMeanX;
    const dy = targetPoints[i][1] - dstMeanY;

    srcVar += rx * rx + ry * ry;
    covXX += rx * dx;
    covXY += rx * dy;
    covYX += ry * dx;
    covYY += ry * dy;
  }

  if (srcVar < 1e-6) {
    return [1, 0, 0, 0, 1, 0];
  }

  // Similarity transform: scale * rotation
  const a = (covXX + covYY) / srcVar;
  const b = (covYX - covXY) / srcVar;

  const tx = dstMeanX - (a * srcMeanX - b * srcMeanY);
  const ty = dstMeanY - (b * srcMeanX + a * srcMeanY);

  // Return Affine Matrix in standard 2D canvas context format: [a, b, c, d, e, f]
  // where: x' = a*x + c*y + e,  y' = b*x + d*y + f
  return [a, b, -b, a, tx, ty];
}

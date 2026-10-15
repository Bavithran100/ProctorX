import * as ort from "onnxruntime-web/wasm";
import {
  CANONICAL_LANDMARKS_112,
  decodeYuNetOutputs,
  estimateAffineTransform,
  prepareYuNetInputTensor,
  YUNET_INPUT_SIZE
} from "./yunetUtils";

/**
 * ==============================================================================
 * PROCTORX HYBRID BIOMETRIC AI WORKER (YUNET + SFACE)
 * ==============================================================================
 * - Stage 1: YuNet CNN detects face bounding box + 5 facial landmarks in 10-15ms.
 * - Stage 2: 5-Point Affine Bilinear Warping normalizes face to canonical 112x112 chip.
 * - Stage 3: SFace Deep CNN extracts 128-D L2-normalized unit biometric embedding.
 * - Stage 4: Cosine distance matching on hypersphere with calibrated thresholds.
 */

let yunetSession = null;
let sfaceSession = null;
let isInitializing = false;

async function initSessions() {
  if (yunetSession && sfaceSession) return { yunetSession, sfaceSession };
  if (isInitializing) {
    while (isInitializing) {
      await new Promise((r) => setTimeout(r, 50));
      if (yunetSession && sfaceSession) return { yunetSession, sfaceSession };
    }
  }

  isInitializing = true;
  try {
    ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.27.0/dist/";
    ort.env.wasm.proxy = false;
    ort.env.wasm.numThreads = 1;
    ort.env.logLevel = "error";

    // 1. Load YuNet Face Detector (232 KB)
    if (!yunetSession) {
      yunetSession = await ort.InferenceSession.create("/models/yunet.onnx", {
        executionProviders: ["wasm"],
        logSeverityLevel: 3
      });
    }

    // 2. Load SFace Biometric Feature Extractor (9.8 MB)
    if (!sfaceSession) {
      sfaceSession = await ort.InferenceSession.create("/models/sface_int8.onnx", {
        executionProviders: ["wasm"],
        logSeverityLevel: 3
      });
    }

    isInitializing = false;
    return { yunetSession, sfaceSession };
  } catch (err) {
    isInitializing = false;
    console.error("Biometric ONNX model initialization error:", err);
    throw err;
  }
}

/**
 * Warps source RGBA pixels to 112x112 canonical aligned face chip using inverse 2D affine transform.
 */
function warpAffine112(srcRgba, srcW, srcH, affineMatrix) {
  const [a, b, c, d, e, f] = affineMatrix;
  const det = a * d - b * c;
  if (Math.abs(det) < 1e-7) return null;

  // Inverse affine matrix
  const invA = d / det;
  const invB = -b / det;
  const invC = -c / det;
  const invD = a / det;
  const invE = (c * f - d * e) / det;
  const invF = (b * e - a * f) / det;

  const targetSize = 112;
  const alignedBgrTensor = new Float32Array(3 * targetSize * targetSize);
  const channelArea = targetSize * targetSize;

  for (let ty = 0; ty < targetSize; ty++) {
    for (let tx = 0; tx < targetSize; tx++) {
      const sx = invA * tx + invC * ty + invE;
      const sy = invB * tx + invD * ty + invF;

      let r = 0, g = 0, bVal = 0;

      if (sx >= 0 && sx < srcW - 1 && sy >= 0 && sy < srcH - 1) {
        const x0 = Math.floor(sx);
        const y0 = Math.floor(sy);
        const x1 = x0 + 1;
        const y1 = y0 + 1;

        const fx = sx - x0;
        const fy = sy - y0;

        const idx00 = (y0 * srcW + x0) * 4;
        const idx10 = (y0 * srcW + x1) * 4;
        const idx01 = ((y0 + 1) * srcW + x0) * 4;
        const idx11 = ((y0 + 1) * srcW + x1) * 4;

        const w00 = (1 - fx) * (1 - fy);
        const w10 = fx * (1 - fy);
        const w01 = (1 - fx) * fy;
        const w11 = fx * fy;

        r = w00 * srcRgba[idx00] + w10 * srcRgba[idx10] + w01 * srcRgba[idx01] + w11 * srcRgba[idx11];
        g = w00 * srcRgba[idx00 + 1] + w10 * srcRgba[idx10 + 1] + w01 * srcRgba[idx01 + 1] + w11 * srcRgba[idx11 + 1];
        bVal = w00 * srcRgba[idx00 + 2] + w10 * srcRgba[idx10 + 2] + w01 * srcRgba[idx01 + 2] + w11 * srcRgba[idx11 + 2];
      }

      const destIdx = ty * targetSize + tx;
      // SFace expects BGR format
      alignedBgrTensor[destIdx] = bVal;
      alignedBgrTensor[channelArea + destIdx] = g;
      alignedBgrTensor[channelArea * 2 + destIdx] = r;
    }
  }

  return alignedBgrTensor;
}

/**
 * Validates frame environmental quality & clarity:
 * - Rejects dark rooms
 * - Rejects extreme glare
 * - Rejects covered/blank lenses
 */
function validateFrameQuality(rgbaData, width, height) {
  const totalPixels = width * height;
  let lumSum = 0;
  let lumSqSum = 0;

  for (let i = 0; i < rgbaData.length; i += 4) {
    const y = 0.299 * rgbaData[i] + 0.587 * rgbaData[i + 1] + 0.114 * rgbaData[i + 2];
    lumSum += y;
    lumSqSum += y * y;
  }

  const meanLum = lumSum / totalPixels;
  const varianceLum = lumSqSum / totalPixels - meanLum * meanLum;
  const stdDevLum = Math.sqrt(Math.max(0, varianceLum));

  if (meanLum < 20) {
    return { valid: false, reason: "VIDEO_TOO_DARK", message: "Webcam lighting is too dark. Increase room lighting." };
  }
  if (meanLum > 248) {
    return { valid: false, reason: "VIDEO_GLARE", message: "Excessive glare detected on camera lens. Adjust position." };
  }
  if (stdDevLum < 10) {
    return { valid: false, reason: "FACE_COVERED_OR_BLANK", message: "No face visible. Camera lens appears covered." };
  }

  return { valid: true, meanLum, stdDevLum };
}

/**
 * Runs YuNet face detection on raw RGBA frame.
 */
async function detectFacesInternal(rgbaData, width, height, confThreshold = 0.55) {
  const { yunetSession: sess } = await initSessions();
  const { tensorData, scale, padX, padY } = prepareYuNetInputTensor(rgbaData, width, height, YUNET_INPUT_SIZE);

  const inputTensor = new ort.Tensor("float32", tensorData, [1, 3, YUNET_INPUT_SIZE, YUNET_INPUT_SIZE]);
  const results = await sess.run({ input: inputTensor });

  return decodeYuNetOutputs(results, scale, padX, padY, confThreshold);
}

/**
 * Extracts Deep SFace Embedding from landmark-aligned face chip.
 */
async function extractEmbeddingFromAlignedTensor(alignedTensor) {
  const { sfaceSession: sess } = await initSessions();
  const inputTensor = new ort.Tensor("float32", alignedTensor, [1, 3, 112, 112]);
  const inputName = sess.inputNames[0] || "data";
  const outputName = sess.outputNames[0] || "fc1";

  const results = await sess.run({ [inputName]: inputTensor });
  const rawEmb = results[outputName].data; // Float32Array(128)

  // L2 unit normalization
  let norm = 0;
  for (let i = 0; i < 128; i++) norm += rawEmb[i] * rawEmb[i];
  norm = Math.sqrt(norm);

  const normalized = new Float32Array(128);
  if (norm > 0) {
    for (let i = 0; i < 128; i++) normalized[i] = rawEmb[i] / norm;
  }

  return Array.from(normalized);
}

function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dot = 0.0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
  }
  return dot;
}

self.onmessage = async (e) => {
  const { type, requestId, payload } = e.data || {};

  try {
    if (type === "init") {
      await initSessions();
      self.postMessage({ type: "ready", requestId });
      return;
    }

    // 1. Detect faces in frame
    if (type === "detect_faces") {
      const { rgbaData, width, height, threshold = 0.55 } = payload;
      const detections = await detectFacesInternal(rgbaData, width, height, threshold);
      self.postMessage({
        type: "faces_detected",
        requestId,
        detections
      });
      return;
    }

    // 2. Extract Biometric Embedding (with YuNet detection & 5-point affine alignment)
    if (type === "extract_embedding") {
      const { rgbaData, width, height } = payload;
      const quality = validateFrameQuality(rgbaData, width, height);
      if (!quality.valid) {
        self.postMessage({
          type: "embedding_error",
          requestId,
          error: quality.message,
          reason: quality.reason
        });
        return;
      }

      const detections = await detectFacesInternal(rgbaData, width, height, 0.55);
      if (detections.length === 0) {
        self.postMessage({
          type: "embedding_error",
          requestId,
          error: "No face detected in photo. Please ensure your face is clearly visible and centered.",
          reason: "NO_FACE_DETECTED"
        });
        return;
      }

      // If multiple faces detected, check if there are multiple prominent faces
      if (detections.length > 1) {
        const prominent = detections.filter(d => d.score >= 0.70);
        if (prominent.length > 1) {
          self.postMessage({
            type: "embedding_error",
            requestId,
            error: "Multiple individuals detected. Please ensure only 1 person is present in the photo.",
            reason: "MULTIPLE_FACES"
          });
          return;
        }
      }

      const primaryFace = detections[0];
      const affineMatrix = estimateAffineTransform(primaryFace.rawPoints, CANONICAL_LANDMARKS_112);
      const alignedTensor = warpAffine112(rgbaData, width, height, affineMatrix);

      if (!alignedTensor) {
        self.postMessage({
          type: "embedding_error",
          requestId,
          error: "Could not align facial landmarks.",
          reason: "ALIGNMENT_FAILED"
        });
        return;
      }

      const embedding = await extractEmbeddingFromAlignedTensor(alignedTensor);

      self.postMessage({
        type: "embedding_extracted",
        requestId,
        embedding,
        box: primaryFace.box,
        landmarks: primaryFace.landmarks,
        score: primaryFace.score
      });
      return;
    }

    // 3. Verify Live Face against Enrolled Reference Embedding
    if (type === "verify_face") {
      const { liveRgba, width, height, refEmbedding, threshold = 0.38 } = payload;

      const quality = validateFrameQuality(liveRgba, width, height);
      if (!quality.valid) {
        self.postMessage({
          type: "verification_result",
          requestId,
          isMatch: false,
          similarity: 0.0,
          confidencePercent: 0,
          reason: quality.reason,
          message: quality.message
        });
        return;
      }

      const detections = await detectFacesInternal(liveRgba, width, height, 0.55);

      if (detections.length === 0) {
        self.postMessage({
          type: "verification_result",
          requestId,
          isMatch: false,
          similarity: 0.0,
          confidencePercent: 0,
          reason: "NO_FACE_DETECTED",
          message: "No candidate detected in frame"
        });
        return;
      }

      if (detections.length > 1) {
        const prominent = detections.filter(d => d.score >= 0.70);
        if (prominent.length > 1) {
          self.postMessage({
            type: "verification_result",
            requestId,
            isMatch: false,
            similarity: 0.0,
            confidencePercent: 0,
            reason: "MULTIPLE_FACES",
            message: "Multiple individuals detected"
          });
          return;
        }
      }

      const primaryFace = detections[0];
      const affineMatrix = estimateAffineTransform(primaryFace.rawPoints, CANONICAL_LANDMARKS_112);
      const alignedTensor = warpAffine112(liveRgba, width, height, affineMatrix);

      if (!alignedTensor) {
        self.postMessage({
          type: "verification_result",
          requestId,
          isMatch: false,
          similarity: 0.0,
          confidencePercent: 0,
          reason: "ALIGNMENT_FAILED",
          message: "Facial alignment could not be computed"
        });
        return;
      }

      const liveEmbedding = await extractEmbeddingFromAlignedTensor(alignedTensor);
      const similarity = cosineSimilarity(refEmbedding, liveEmbedding);

      // OpenCV SFace Calibrated Industry Proctoring Curve:
      // Verified Match (threshold >= 0.363): 85% - 99%
      // Uncertain / Boundary (0.25 <= similarity < 0.363): 30% - 84%
      // Impostor / Different face (0.10 <= similarity < 0.25): 5% - 24%
      // Obstructed / Not a face: 0%
      let confidencePercent = 0;
      if (similarity >= 0.363) {
        confidencePercent = Math.min(99, Math.round(85 + ((similarity - 0.363) / (0.65 - 0.363)) * 14));
      } else if (similarity >= 0.25) {
        confidencePercent = Math.round(30 + ((similarity - 0.25) / (0.363 - 0.25)) * 54);
      } else if (similarity >= 0.10) {
        confidencePercent = Math.round(5 + ((similarity - 0.10) / (0.25 - 0.10)) * 24);
      } else {
        confidencePercent = 0;
      }

      const isMatch = similarity >= threshold;

      self.postMessage({
        type: "verification_result",
        requestId,
        isMatch,
        similarity: parseFloat(similarity.toFixed(4)),
        confidencePercent,
        box: primaryFace.box,
        landmarks: primaryFace.landmarks
      });
      return;
    }
  } catch (err) {
    self.postMessage({
      type: "error",
      requestId,
      error: String(err?.message || err)
    });
  }
};

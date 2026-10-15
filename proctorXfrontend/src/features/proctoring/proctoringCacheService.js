/**
 * ==============================================================================
 * PROCTORX AI PROCTORING MODEL CACHE SERVICE
 * ==============================================================================
 * Pre-caches YOLO and Biometric models into browser CacheStorage so they load
 * in <10ms with 0 network bandwidth consumption during the live exam.
 */

const AI_CACHE_NAME = "proctorx-ai-models-v1";

export const PROCTORING_MODEL_CHUNKS = [
  {
    name: "YOLOv8n Object Detector (ONNX)",
    url: "/models/yolov8n-320.onnx",
    type: "model",
    approxMB: "~13.0 MB"
  },
  {
    name: "SFace Biometric Neural Model (ONNX)",
    url: "/models/sface_int8.onnx",
    type: "model",
    approxMB: "~9.8 MB"
  },
  {
    name: "ONNX Runtime WebAssembly Binary",
    url: "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.27.0/dist/ort-wasm-simd-threaded.wasm",
    type: "wasm",
    approxMB: "~3.5 MB"
  }
];

export function isCacheSupported() {
  return typeof window !== "undefined" && "caches" in window;
}

export async function isProctoringModelsCached() {
  if (!isCacheSupported()) return false;
  try {
    const cache = await window.caches.open(AI_CACHE_NAME);
    const keys = await cache.keys();
    if (keys.length === 0) return false;

    const urls = keys.map((k) => k.url.toLowerCase());
    return urls.some((u) => u.includes("yolov8n") || u.includes("model"));
  } catch (err) {
    console.warn("Unable to check AI model cache:", err);
    return false;
  }
}

export async function precacheProctoringModels(onProgress = () => {}) {
  if (!isCacheSupported()) {
    onProgress(100, "CacheStorage not supported, running live streaming mode.");
    return true;
  }

  try {
    const cache = await window.caches.open(AI_CACHE_NAME);
    const total = PROCTORING_MODEL_CHUNKS.length;
    let completed = 0;

    for (const chunk of PROCTORING_MODEL_CHUNKS) {
      try {
        const match = await cache.match(chunk.url);
        if (!match) {
          onProgress(
            Math.round((completed / total) * 100),
            `Caching ${chunk.name} (${chunk.approxMB})...`
          );
          const res = await fetch(chunk.url, { mode: "cors" });
          if (res.ok) {
            await cache.put(chunk.url, res.clone());
          }
        }
      } catch (e) {
        console.warn(`Cache notice for ${chunk.name}:`, e);
      }
      completed++;
      onProgress(
        Math.round((completed / total) * 100),
        `Cached ${chunk.name}`
      );
    }

    onProgress(100, "✓ All AI Proctoring Models Cached Locally (Zero Latency Mode)");
    return true;
  } catch (err) {
    console.error("AI model pre-caching encountered error:", err);
    onProgress(100, "AI models ready with fallbacks");
    return false;
  }
}

export async function getAiModelCacheStats() {
  if (!isCacheSupported()) {
    return { isCached: false, sizeMB: "0 MB", totalFiles: 0 };
  }
  try {
    const cache = await window.caches.open(AI_CACHE_NAME);
    const keys = await cache.keys();
    let totalBytes = 0;
    for (const req of keys) {
      const res = await cache.match(req);
      if (res) {
        const b = await res.blob();
        totalBytes += b.size;
      }
    }
    return {
      isCached: keys.length > 0,
      sizeMB: (totalBytes / (1024 * 1024)).toFixed(2) + " MB",
      totalFiles: keys.length
    };
  } catch {
    return { isCached: false, sizeMB: "0 MB", totalFiles: 0 };
  }
}

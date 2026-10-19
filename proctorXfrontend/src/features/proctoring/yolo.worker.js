import * as ort from "onnxruntime-web/wasm";
import { parseYoloOutput, YOLO_INPUT_SIZE } from "./yoloUtils";

let session = null;

function sendError(requestId, error) {
  self.postMessage({
    type: "error",
    requestId,
    message: error instanceof Error ? error.message : String(error)
  });
}

const AI_CACHE_NAME = "proctorx-ai-models-v1";
const YOLO_PRIMARY_URL = "/models/yolov8n-320.onnx";
const YOLO_FALLBACK_URLS = [
  "https://huggingface.co/Bavithran100/ProctorX-Models/resolve/main/yolov8n-320.onnx",
  "https://github.com/Bavithran100/ProctorX/releases/download/v1.0.0/yolov8n-320.onnx"
];

async function fetchModelBinaryWithCache(primaryUrl, fallbackUrls = []) {
  // 1. Try Browser CacheStorage first (0ms latency, zero bandwidth)
  if (typeof self !== "undefined" && "caches" in self) {
    try {
      const cache = await self.caches.open(AI_CACHE_NAME);
      const cached = await cache.match(primaryUrl);
      if (cached) {
        const buffer = await cached.arrayBuffer();
        if (buffer.byteLength > 100000) {
          return new Uint8Array(buffer);
        }
      }
    } catch (e) {
      console.warn("[YOLO Worker] CacheStorage read notice:", e);
    }
  }

  // 2. Cascade through Primary (Vercel) and Remote CDN Fallbacks
  const candidateUrls = [primaryUrl, ...fallbackUrls];
  let lastError = null;

  for (const url of candidateUrls) {
    try {
      const response = await fetch(url, { mode: "cors" });
      if (!response.ok) continue;

      const buffer = await response.arrayBuffer();

      // Check if file is a Git LFS pointer (133 bytes) or an HTML 404/SPA rewrite
      if (buffer.byteLength < 5000) {
        const text = new TextDecoder().decode(buffer.slice(0, 100));
        if (text.includes("git-lfs") || text.includes("<!DOCTYPE") || text.includes("<html")) {
          console.warn(`[YOLO Worker] ${url} is an LFS pointer or HTML rewrite (${buffer.byteLength} bytes). Checking fallback...`);
          continue;
        }
      }

      // Valid binary model found! Cache it locally in browser disk storage
      if (typeof self !== "undefined" && "caches" in self) {
        try {
          const cache = await self.caches.open(AI_CACHE_NAME);
          await cache.put(primaryUrl, new Response(buffer.slice(0), {
            headers: { "Content-Type": "application/octet-stream" }
          }));
        } catch (cacheErr) {
          console.warn("[YOLO Worker] Failed to persist model to CacheStorage:", cacheErr);
        }
      }

      return new Uint8Array(buffer);
    } catch (err) {
      lastError = err;
    }
  }

  throw new Error(`Failed to download YOLO model from local and fallback sources: ${lastError?.message || "Unknown error"}`);
}

self.onmessage = async ({ data }) => {
  const { type, requestId } = data;
  try {
    if (type === "load") {
      if (!session) {
        // Use official ONNX Runtime Web CDN to fetch wasm binary directly
        ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.27.0/dist/";
        ort.env.wasm.proxy = false;
        ort.env.wasm.numThreads = 1;
        const modelBuffer = await fetchModelBinaryWithCache(YOLO_PRIMARY_URL, YOLO_FALLBACK_URLS);
        session = await ort.InferenceSession.create(modelBuffer, {
          executionProviders: ["wasm"]
        });
      }
      self.postMessage({ type: "loaded", requestId });
      return;
    }

    if (type === "detect") {
      if (!session) throw new Error("YOLO model has not been loaded.");
      const input = new ort.Tensor("float32", data.tensor, [1, 3, YOLO_INPUT_SIZE, YOLO_INPUT_SIZE]);
      const results = await session.run({ [session.inputNames[0]]: input });
      const detections = parseYoloOutput(results[session.outputNames[0]]);
      self.postMessage({ type: "detections", requestId, detections });
    }
  } catch (error) {
    sendError(requestId, error);
  }
};

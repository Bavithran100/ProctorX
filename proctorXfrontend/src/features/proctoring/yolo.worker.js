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

self.onmessage = async ({ data }) => {
  const { type, requestId } = data;
  try {
    if (type === "load") {
      if (!session) {
        // Use official ONNX Runtime Web CDN to fetch wasm binary directly
        ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.27.0/dist/";
        ort.env.wasm.proxy = false;
        ort.env.wasm.numThreads = 1;
        session = await ort.InferenceSession.create("/models/yolov8n-320.onnx", {
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

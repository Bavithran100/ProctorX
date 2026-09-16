import { useCallback, useEffect, useRef, useState } from "react";
import { createFrameBuffer, videoToTensor } from "./yoloUtils";

export default function useYoloDetector() {
  const workerRef = useRef(null);
  const frameBufferRef = useRef(null);
  const requestIdRef = useRef(0);
  const pendingRequestsRef = useRef(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const requestWorker = useCallback((type, payload = {}) => new Promise((resolve, reject) => {
    const worker = workerRef.current;
    if (!worker) {
      reject(new Error("YOLO worker is unavailable."));
      return;
    }
    const requestId = ++requestIdRef.current;
    pendingRequestsRef.current.set(requestId, { resolve, reject });
    worker.postMessage({ type, requestId, ...payload });
  }), []);

  const getWorker = useCallback(() => {
    if (workerRef.current) return workerRef.current;
    const worker = new Worker(new URL("./yolo.worker.js", import.meta.url), { type: "module" });
    worker.onmessage = ({ data }) => {
      const pending = pendingRequestsRef.current.get(data.requestId);
      if (!pending) return;
      pendingRequestsRef.current.delete(data.requestId);
      if (data.type === "error") {
        pending.reject(new Error(data.message));
      } else {
        pending.resolve(data.detections ?? true);
      }
    };
    worker.onerror = (event) => {
      const workerError = new Error(event.message || "YOLO worker failed to start.");
      pendingRequestsRef.current.forEach(({ reject }) => reject(workerError));
      pendingRequestsRef.current.clear();
    };
    workerRef.current = worker;
    return worker;
  }, []);

  useEffect(() => () => {
    workerRef.current?.terminate();
    workerRef.current = null;
    pendingRequestsRef.current.forEach(({ reject }) => reject(new Error("YOLO worker stopped.")));
    pendingRequestsRef.current.clear();
  }, []);

  const loadModel = useCallback(async () => {
    if (frameBufferRef.current) return true;
    setLoading(true);
    setError("");
    try {
      getWorker();
      await requestWorker("load");
      frameBufferRef.current = createFrameBuffer();
      return true;
    } catch (loadError) {
      console.error("YOLO model loading failed", loadError);
      setError(loadError?.message || "Could not load the local YOLOv8n model.");
      return false;
    } finally {
      setLoading(false);
    }
  }, [getWorker, requestWorker]);

  const detect = useCallback(async (video) => {
    if (!frameBufferRef.current || !video || video.readyState < 2) return [];
    // Do not transfer this buffer: keeping it in the UI thread lets the next
    // two-second frame reuse the same allocation while inference stays in Worker.
    return requestWorker("detect", { tensor: videoToTensor(video, frameBufferRef.current) });
  }, [requestWorker]);

  return { detect, error, loadModel, loading };
}

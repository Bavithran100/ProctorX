import { useCallback, useEffect, useRef, useState } from "react";

const FACE_CROP_SIZE = 112;

export default function useFaceVerifier() {
  const workerRef = useRef(null);
  const canvasRef = useRef(null);
  const requestIdRef = useRef(0);
  const pendingRef = useRef(new Map());
  const [loading, setLoading] = useState(false);

  const getWorker = useCallback(() => {
    if (workerRef.current) return workerRef.current;
    const worker = new Worker(new URL("./face.worker.js", import.meta.url), { type: "module" });
    worker.onmessage = (e) => {
      const { requestId, type, ...rest } = e.data || {};
      const pending = pendingRef.current.get(requestId);
      if (pending) {
        pendingRef.current.delete(requestId);
        if (type === "error") {
          pending.reject(new Error(rest.error || "Face worker error"));
        } else {
          pending.resolve(rest);
        }
      }
    };
    worker.onerror = (err) => {
      pendingRef.current.forEach(({ reject }) => reject(err));
      pendingRef.current.clear();
    };
    workerRef.current = worker;
    // Pre-warm ONNX SFace model
    worker.postMessage({ type: "init", requestId: ++requestIdRef.current });
    return worker;
  }, []);

  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
      pendingRef.current.clear();
    };
  }, []);

  const sendWorkerRequest = useCallback(
    (type, payload) =>
      new Promise((resolve, reject) => {
        const worker = getWorker();
        const requestId = ++requestIdRef.current;
        pendingRef.current.set(requestId, { resolve, reject });
        worker.postMessage({ type, requestId, payload });
      }),
    [getWorker]
  );

  /**
   * Crops the central face bounding box (112x112) from a live video element.
   */
  const captureFacePixels = useCallback((videoElement) => {
    if (!videoElement || videoElement.readyState < 2) return null;

    if (!canvasRef.current) {
      canvasRef.current = document.createElement("canvas");
      canvasRef.current.width = FACE_CROP_SIZE;
      canvasRef.current.height = FACE_CROP_SIZE;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;

    const vWidth = videoElement.videoWidth || 640;
    const vHeight = videoElement.videoHeight || 480;

    // Crop center 55% of video where student face is positioned
    const cropSize = Math.min(vWidth, vHeight) * 0.55;
    const cropX = (vWidth - cropSize) / 2;
    const cropY = (vHeight - cropSize) / 2 * 0.85; // Slightly higher for head position

    ctx.drawImage(
      videoElement,
      cropX,
      cropY,
      cropSize,
      cropSize,
      0,
      0,
      FACE_CROP_SIZE,
      FACE_CROP_SIZE
    );

    const imgData = ctx.getImageData(0, 0, FACE_CROP_SIZE, FACE_CROP_SIZE);
    return imgData.data;
  }, []);

  /**
   * Enrolls candidate's reference face during Pre-Exam Security Gate.
   * Captures multiple frames, averages embeddings, and stores in sessionStorage.
   */
  const enrollReferenceFace = useCallback(
    async (videoElement, examId) => {
      setLoading(true);
      try {
        const embeddings = [];
        for (let i = 0; i < 3; i++) {
          const rgba = captureFacePixels(videoElement);
          if (!rgba) throw new Error("Could not capture clear video frame");

          const res = await sendWorkerRequest("extract_embedding", {
            rgbaData: rgba,
            width: FACE_CROP_SIZE,
            height: FACE_CROP_SIZE
          });

          if (res.embedding) embeddings.push(res.embedding);
          await new Promise((r) => setTimeout(r, 150));
        }

        if (embeddings.length === 0) {
          throw new Error("Failed to extract facial landmark embeddings");
        }

        // Average embeddings to reduce lighting / blink noise
        const avgEmbedding = new Float32Array(128);
        for (let i = 0; i < 128; i++) {
          let sum = 0;
          for (let e of embeddings) sum += e[i];
          avgEmbedding[i] = sum / embeddings.length;
        }

        // L2 normalize
        let norm = 0;
        for (let i = 0; i < 128; i++) norm += avgEmbedding[i] * avgEmbedding[i];
        norm = Math.sqrt(norm);
        if (norm > 0) {
          for (let i = 0; i < 128; i++) avgEmbedding[i] /= norm;
        }

        const finalVector = Array.from(avgEmbedding);
        sessionStorage.setItem(`proctorx_face_ref_${examId}`, JSON.stringify(finalVector));
        return { success: true, embedding: finalVector };
      } catch (err) {
        console.error("Biometric face enrollment failed:", err);
        return { success: false, error: err.message };
      } finally {
        setLoading(false);
      }
    },
    [captureFacePixels, sendWorkerRequest]
  );

  /**
   * Retrieves enrolled reference embedding for this exam session.
   */
  const getEnrolledEmbedding = useCallback((examId) => {
    try {
      const raw = sessionStorage.getItem(`proctorx_face_ref_${examId}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  /**
   * Verifies live webcam frame against enrolled reference face embedding.
   */
  const verifyLiveFace = useCallback(
    async (videoElement, examId, threshold = 0.40) => {
      const refEmbedding = getEnrolledEmbedding(examId);
      if (!refEmbedding) {
        return { isMatch: true, note: "No reference embedding enrolled", confidencePercent: 100 };
      }

      const liveRgba = captureFacePixels(videoElement);
      if (!liveRgba) {
        return { isMatch: false, similarity: 0, confidencePercent: 0, reason: "No face detected in frame" };
      }

      const res = await sendWorkerRequest("verify_face", {
        liveRgba,
        refEmbedding,
        width: FACE_CROP_SIZE,
        height: FACE_CROP_SIZE,
        threshold
      });

      return res;
    },
    [captureFacePixels, getEnrolledEmbedding, sendWorkerRequest]
  );

  return {
    enrollReferenceFace,
    verifyLiveFace,
    getEnrolledEmbedding,
    loading
  };
}

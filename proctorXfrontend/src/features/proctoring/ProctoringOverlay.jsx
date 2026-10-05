import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Client from "../../shared/api/Client";
import useYoloDetector from "./useYoloDetector";
import useFaceVerifier from "./useFaceVerifier";
import { COCO_CELL_PHONE, COCO_PERSON } from "./yoloUtils";
import "./proctoring.css";

export default function ProctoringOverlay({ examId, onTerminate, onViolation }) {
  const navigate = useNavigate();
  const auth = useSelector((state) => state.auth);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const multiplePersonCount = useRef(0);
  const phoneCount = useRef(0);
  const fullscreenExitCount = useRef(0);
  const noPersonCount = useRef(0);
  const faceMismatchCount = useRef(0);
  const consecutiveMismatches = useRef(0);
  const sent = useRef({ camera: false });
  const terminatedRef = useRef(false);

  const [status, setStatus] = useState("Initializing camera stream...");
  const [fullscreenViolation, setFullscreenViolation] = useState(false);
  const [fullscreenSecondsLeft, setFullscreenSecondsLeft] = useState(60);
  const [noPersonViolation, setNoPersonViolation] = useState(false);
  const [noPersonSecondsLeft, setNoPersonSecondsLeft] = useState(60);
  const [faceMismatchViolation, setFaceMismatchViolation] = useState(false);
  const [faceMismatchSecondsLeft, setFaceMismatchSecondsLeft] = useState(15);
  const [biometricScore, setBiometricScore] = useState(null);
  const [yoloTelemetry, setYoloTelemetry] = useState({ message: "Initializing...", isWarning: false });
  const [faceTelemetry, setFaceTelemetry] = useState({ message: "Calibrating...", score: null, isMismatch: false, isWarning: false });

  // Draggable floating window coordinates
  const [position, setPosition] = useState({
    x: Math.max(16, (typeof window !== "undefined" ? window.innerWidth : 1200) - 220),
    y: Math.max(16, (typeof window !== "undefined" ? window.innerHeight : 800) - 190)
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, posX: 0, posY: 0 });

  const handleDragStart = (e) => {
    const clientX = e.clientX ?? (e.touches && e.touches[0].clientX);
    const clientY = e.clientY ?? (e.touches && e.touches[0].clientY);
    if (clientX == null || clientY == null) return;

    setIsDragging(true);
    dragStartRef.current = {
      mouseX: clientX,
      mouseY: clientY,
      posX: position.x,
      posY: position.y
    };
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleDragMove = (e) => {
      const clientX = e.clientX ?? (e.touches && e.touches[0].clientX);
      const clientY = e.clientY ?? (e.touches && e.touches[0].clientY);
      if (clientX == null || clientY == null) return;

      const deltaX = clientX - dragStartRef.current.mouseX;
      const deltaY = clientY - dragStartRef.current.mouseY;

      const newX = Math.max(10, Math.min(window.innerWidth - 210, dragStartRef.current.posX + deltaX));
      const newY = Math.max(10, Math.min(window.innerHeight - 180, dragStartRef.current.posY + deltaY));

      setPosition({ x: newX, y: newY });
    };

    const handleDragEnd = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleDragMove);
    window.addEventListener("mouseup", handleDragEnd);
    window.addEventListener("touchmove", handleDragMove);
    window.addEventListener("touchend", handleDragEnd);

    return () => {
      window.removeEventListener("mousemove", handleDragMove);
      window.removeEventListener("mouseup", handleDragEnd);
      window.removeEventListener("touchmove", handleDragMove);
      window.removeEventListener("touchend", handleDragEnd);
    };
  }, [isDragging]);

  const { detect, loadModel, loading, error } = useYoloDetector();
  const { verifyLiveFace, getEnrolledEmbedding } = useFaceVerifier();
  const authoritativeEmbeddingRef = useRef(null);

  const logEvent = useCallback(
    (event, count = 1) => {
      if (onViolation) onViolation(event, count);
      Client.post(`/student/exams/${examId}/malpractice`, null, {
        params: { event, count }
      }).catch(() => {});
    },
    [examId, onViolation]
  );

  const terminateExam = useCallback(
    (reason) => {
      if (terminatedRef.current) return;
      terminatedRef.current = true;

      // Stop media tracks
      streamRef.current?.getTracks().forEach((track) => track.stop());

      // Notify backend that session was interrupted by proctoring
      Client.post(`/student/exams/${examId}/halt`, null, {
        params: { reason }
      }).catch(() => {});

      alert(`⚠️ ${reason}\nYour examination attempt has been halted. Contact your coordinator if you require a reopen.`);
      if (onTerminate) {
        onTerminate(reason);
      } else {
        navigate("/dashboard");
      }
    },
    [examId, navigate, onTerminate]
  );

  const noPersonViolationRef = useRef(false);
  const faceMismatchViolationRef = useRef(false);
  const biometricScoreRef = useRef(98);

  // Fullscreen Violation Countdown (60s)
  useEffect(() => {
    let interval;
    if (fullscreenViolation) {
      interval = setInterval(() => {
        setFullscreenSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            terminateExam("Exam Terminated: Fullscreen mode was not re-entered within 60 seconds.");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setFullscreenSecondsLeft(60);
    }
    return () => clearInterval(interval);
  }, [fullscreenViolation, terminateExam]);

  // No Person Detected Countdown (60s)
  useEffect(() => {
    let interval;
    if (noPersonViolation) {
      interval = setInterval(() => {
        setNoPersonSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            logEvent("NO_PERSON", 60);
            terminateExam("Exam Terminated: No candidate was detected in front of the webcam for over 1 minute.");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setNoPersonSecondsLeft(60);
    }
    return () => clearInterval(interval);
  }, [noPersonViolation, logEvent, terminateExam]);

  // Face Mismatch Violation Countdown (15s)
  useEffect(() => {
    let interval;
    if (faceMismatchViolation) {
      interval = setInterval(() => {
        setFaceMismatchSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            faceMismatchCount.current += 1;
            logEvent("FACE_MISMATCH", faceMismatchCount.current);
            terminateExam("Exam Terminated: Continuous face biometric mismatch or obstruction detected. Proxy candidate identified.");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setFaceMismatchSecondsLeft(15);
    }
    return () => clearInterval(interval);
  }, [faceMismatchViolation, logEvent, terminateExam]);

  // Pre-load Authoritative Biometric Identity Reference for this exam session
  useEffect(() => {
    async function loadBiometricRef() {
      try {
        const res = await Client.get(`/student/exams/${examId}/biometric-reference`);
        if (res.data?.faceEmbedding) {
          const vec = typeof res.data.faceEmbedding === "string" ? JSON.parse(res.data.faceEmbedding) : res.data.faceEmbedding;
          authoritativeEmbeddingRef.current = vec;
          sessionStorage.setItem(`proctorx_face_ref_${examId}`, JSON.stringify(vec));
          return;
        }
      } catch {}

      if (auth?.faceEmbedding) {
        try {
          const vec = typeof auth.faceEmbedding === "string" ? JSON.parse(auth.faceEmbedding) : auth.faceEmbedding;
          authoritativeEmbeddingRef.current = vec;
          sessionStorage.setItem(`proctorx_face_ref_${examId}`, JSON.stringify(vec));
          return;
        } catch {}
      }

      const sessionRef = sessionStorage.getItem(`proctorx_face_ref_${examId}`) || sessionStorage.getItem("proctorx_user_face_ref");
      if (sessionRef) {
        try {
          authoritativeEmbeddingRef.current = JSON.parse(sessionRef);
        } catch {}
      }
    }
    loadBiometricRef();
  }, [examId, auth]);

  // Camera, YOLO & Biometric Face Inference Loop (Runs ONCE on mount)
  useEffect(() => {
    let cancelled = false;
    let yoloTimer;
    let faceTimer;

    async function startCameraAndModel() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 320 }, height: { ideal: 240 } },
          audio: false
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        const modelReady = await loadModel();
        if (!modelReady || cancelled) return;
        setStatus("AI Proctor Active · Verified");
        setYoloTelemetry({ message: "● 1 Candidate Active", isWarning: false });

        // 1. YOLO Object Inference Loop (~every 1.8s)
        const processYoloFrame = async () => {
          if (cancelled || terminatedRef.current) return;
          try {
            const detections = await detect(videoRef.current);
            const people = detections.filter((item) => item.classId === COCO_PERSON).length;
            const hasPhone = detections.some((item) => item.classId === COCO_CELL_PHONE);

            // Person Count Check
            if (people === 0) {
              noPersonCount.current += 1;
              noPersonViolationRef.current = true;
              setNoPersonViolation(true);
              setYoloTelemetry({ message: "⚠️ No person in frame", isWarning: true });
              if (noPersonCount.current % 5 === 0) {
                logEvent("NO_PERSON", noPersonCount.current);
              }
            } else {
              noPersonCount.current = 0;
              noPersonViolationRef.current = false;
              setNoPersonViolation(false);

              if (people > 1) {
                multiplePersonCount.current += 1;
                setYoloTelemetry({ message: "⚠️ Multiple people detected", isWarning: true });
                if (multiplePersonCount.current % 5 === 0) {
                  logEvent("MULTIPLE_PERSON", multiplePersonCount.current);
                }
              } else if (hasPhone) {
                phoneCount.current += 1;
                setYoloTelemetry({ message: "⚠️ Mobile phone detected", isWarning: true });
                if (phoneCount.current % 3 === 0) {
                  logEvent("MOBILE_PHONE", phoneCount.current);
                }
              } else {
                setYoloTelemetry({ message: "● 1 Candidate Active", isWarning: false });
              }
            }
          } catch {
            setYoloTelemetry({ message: "Retrying YOLO scan...", isWarning: false });
          }

          if (!cancelled && !terminatedRef.current) {
            yoloTimer = setTimeout(processYoloFrame, 1800);
          }
        };

        // 2. Biometric Face Verification Loop (Sampling every ~2.0s)
        const processFaceVerification = async () => {
          if (cancelled || terminatedRef.current) return;
          try {
            if (videoRef.current && !noPersonViolationRef.current) {
              // Resolve baseline reference vector
              let refEmbedding = authoritativeEmbeddingRef.current;
              if (!refEmbedding && typeof getEnrolledEmbedding === "function") {
                refEmbedding = getEnrolledEmbedding(examId);
              }
              if (!refEmbedding && auth?.faceEmbedding) {
                try {
                  refEmbedding = typeof auth.faceEmbedding === "string" ? JSON.parse(auth.faceEmbedding) : auth.faceEmbedding;
                } catch {}
              }
              if (!refEmbedding) {
                const raw = sessionStorage.getItem(`proctorx_face_ref_${examId}`) || sessionStorage.getItem("proctorx_user_face_ref");
                if (raw) {
                  try { refEmbedding = JSON.parse(raw); } catch {}
                }
              }

              const res = await verifyLiveFace(videoRef.current, refEmbedding, 0.363);

              if (res && res.confidencePercent !== undefined) {
                biometricScoreRef.current = res.confidencePercent;
                setBiometricScore(res.confidencePercent);
              }

              if (res && res.isMatch === false) {
                consecutiveMismatches.current += 1;
                
                let failLabel = "⚠️ Mismatch";
                if (res.reason === "FACE_COVERED_OR_BLANK" || res.reason === "NO_FACE_DETECTED" || res.reason === "ALIGNMENT_FAILED") {
                  failLabel = "⚠️ Face Obstructed";
                } else if (res.reason === "VIDEO_TOO_DARK") {
                  failLabel = "⚠️ Room Too Dark";
                } else if (res.reason === "MULTIPLE_FACES") {
                  failLabel = "⚠️ Multiple Faces";
                }

                setFaceTelemetry({
                  message: failLabel,
                  score: res.confidencePercent ?? 0,
                  isMismatch: true,
                  isWarning: true
                });

                // Enforce 2 consecutive mismatches (~4-6s) before activating countdown banner
                if (consecutiveMismatches.current >= 2) {
                  faceMismatchViolationRef.current = true;
                  setFaceMismatchViolation(true);
                }
              } else if (res && res.isMatch === true) {
                consecutiveMismatches.current = 0;
                faceMismatchViolationRef.current = false;
                setFaceMismatchViolation(false);
                setFaceTelemetry({
                  message: "● Verified",
                  score: res.confidencePercent ?? 95,
                  isMismatch: false,
                  isWarning: false
                });
              }
            }
          } catch (faceErr) {
            console.warn("Face verification sample notice:", faceErr);
          }

          if (!cancelled && !terminatedRef.current) {
            faceTimer = setTimeout(processFaceVerification, 2000);
          }
        };

        processYoloFrame();
        faceTimer = setTimeout(processFaceVerification, 2000);
      } catch (err) {
        console.error("Camera access failed in exam", err);
        if (!sent.current.camera) {
          sent.current.camera = true;
          logEvent("CAMERA_UNAVAILABLE");
        }
        setStatus("Camera stream unavailable");
      }
    }

    const mountedAt = Date.now();

    const onFullscreenChange = () => {
      // 3-second grace period on route navigation
      if (Date.now() - mountedAt < 3000) return;

      const isFullscreen = Boolean(document.fullscreenElement);
      if (!isFullscreen) {
        fullscreenExitCount.current += 1;
        logEvent("FULLSCREEN_EXIT", fullscreenExitCount.current);
        setFullscreenViolation(true);
      } else {
        setFullscreenViolation(false);
      }
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    startCameraAndModel();

    return () => {
      cancelled = true;
      clearTimeout(yoloTimer);
      clearTimeout(faceTimer);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [examId]);

  async function handleReenterFullscreen() {
    try {
      await document.documentElement.requestFullscreen();
      setFullscreenViolation(false);
    } catch {
      alert("Could not restore fullscreen automatically. Please press F11 or allow fullscreen permissions.");
    }
  }

  return (
    <>
      {/* Fullscreen Warning Banner (Non-blocking / No screen blackout) */}
      {fullscreenViolation && (
        <div className="proctor-warning-banner" style={{ background: "rgba(220, 38, 38, 0.98)", zIndex: 9999 }}>
          <span>⚠️ FULLSCREEN EXITED: Return to fullscreen immediately!</span>
          <span style={{ fontWeight: 800 }}>Terminating in {fullscreenSecondsLeft}s</span>
          <button
            type="button"
            onClick={handleReenterFullscreen}
            style={{
              background: "#FFFFFF",
              color: "#DC2626",
              border: "none",
              borderRadius: "4px",
              padding: "4px 12px",
              fontWeight: 800,
              fontSize: "12px",
              cursor: "pointer",
              marginLeft: "6px"
            }}
          >
            Re-enter Fullscreen
          </button>
        </div>
      )}

      {/* No Person Detected Floating Alert Banner */}
      {noPersonViolation && !fullscreenViolation && (
        <div className="proctor-warning-banner" style={{ zIndex: 9999 }}>
          <span>⚠️ WARNING: Sit directly in front of the webcam. No candidate detected!</span>
          <span style={{ fontWeight: 800 }}>Auto-Terminating in {noPersonSecondsLeft}s</span>
        </div>
      )}

      {/* Biometric Face Mismatch / Obstructed Alert Banner */}
      {faceMismatchViolation && !fullscreenViolation && !noPersonViolation && (
        <div className="proctor-warning-banner" style={{ background: "rgba(220, 38, 38, 0.95)", zIndex: 9999 }}>
          <span>⚠️ WARNING: Biometric Face Mismatch or Face Obstructed! Ensure your face is clearly visible.</span>
          <span style={{ fontWeight: 800 }}>Auto-Terminating in {faceMismatchSecondsLeft}s</span>
        </div>
      )}

      {/* Floating Draggable Picture-in-Picture Proctor View */}
      <aside
        className="proctor-overlay"
        aria-label="Proctoring Camera Feed"
        style={{
          position: "fixed",
          left: `${position.x}px`,
          top: `${position.y}px`,
          bottom: "auto",
          right: "auto",
          cursor: isDragging ? "grabbing" : "default",
          boxShadow: isDragging ? "0 12px 36px rgba(0, 0, 0, 0.8), 0 0 20px var(--primary)" : undefined,
          userSelect: "none",
          zIndex: 1000
        }}
      >
        <div
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "4px 8px",
            background: "linear-gradient(90deg, #1E293B, #0F172A)",
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
            fontSize: "10px",
            fontWeight: 700,
            color: isDragging ? "#38BDF8" : "#94A3B8",
            cursor: "grab",
            userSelect: "none"
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span>⠿</span> YOLO AI Cam
          </span>
          <span style={{ fontSize: "9px", color: isDragging ? "#FFFFFF" : "#38BDF8" }}>
            {isDragging ? "Moving..." : "Drag Anywhere"}
          </span>
        </div>
        <video
          ref={videoRef}
          muted
          playsInline
          autoPlay
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
          style={{ cursor: "grab" }}
        />
        
        {/* Dedicated Dual Telemetry Panel */}
        <div className="proctor-telemetry-box">
          <div className="proctor-metric-row">
            <span className="proctor-metric-icon">🤖</span>
            <span className="proctor-metric-label">YOLO:</span>
            <span className={`proctor-metric-val ${yoloTelemetry.isWarning ? "warn" : "ok"}`}>
              {error || (loading ? "Loading AI..." : yoloTelemetry.message)}
            </span>
          </div>
          <div className="proctor-metric-row">
            <span className="proctor-metric-icon">👤</span>
            <span className="proctor-metric-label">Face ID:</span>
            <span className={`proctor-metric-val ${faceTelemetry.isMismatch ? "danger" : (faceTelemetry.isWarning ? "warn" : "ok")}`}>
              {faceTelemetry.message} {faceTelemetry.score != null ? `(${faceTelemetry.score}%)` : ""}{faceMismatchViolation ? ` · ${faceMismatchSecondsLeft}s` : ""}
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}

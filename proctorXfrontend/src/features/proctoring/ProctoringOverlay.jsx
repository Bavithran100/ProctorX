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
  const tabSwitchCount = useRef(0);
  const noPersonCount = useRef(0);
  const faceMismatchCount = useRef(0);
  const consecutiveMismatches = useRef(0);
  const sent = useRef({ camera: false });
  const terminatedRef = useRef(false);

  const examIdRef = useRef(examId);
  examIdRef.current = examId;
  const onViolationRef = useRef(onViolation);
  onViolationRef.current = onViolation;
  const onTerminateRef = useRef(onTerminate);
  onTerminateRef.current = onTerminate;

  const [status, setStatus] = useState("Initializing camera stream...");
  
  // Violation & Countdown States
  const [fullscreenViolation, setFullscreenViolation] = useState(false);
  const [fullscreenSecondsLeft, setFullscreenSecondsLeft] = useState(60);

  const [tabSwitchViolation, setTabSwitchViolation] = useState(false);
  const [tabSwitchSecondsLeft, setTabSwitchSecondsLeft] = useState(30);

  const [multiplePersonViolation, setMultiplePersonViolation] = useState(false);
  const [multiplePersonSecondsLeft, setMultiplePersonSecondsLeft] = useState(15);

  const [phoneViolation, setPhoneViolation] = useState(false);
  const [phoneSecondsLeft, setPhoneSecondsLeft] = useState(10);

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

  // Stable logEvent function using refs
  const logEvent = useCallback((event, count = 1) => {
    if (onViolationRef.current) onViolationRef.current(event, count);
    const currentId = examIdRef.current;
    if (currentId && !currentId.startsWith("adaptive_")) {
      Client.post(`/student/exams/${currentId}/malpractice`, null, {
        params: { event, count }
      }).catch(() => {});
    }
  }, []);

  const lastTabEventRef = useRef(0);

  // Stable terminateExam function using refs
  const terminateExam = useCallback((reason) => {
    if (terminatedRef.current) return;
    terminatedRef.current = true;

    // Stop media tracks
    streamRef.current?.getTracks().forEach((track) => track.stop());

    const currentId = examIdRef.current;
    if (currentId && !currentId.startsWith("adaptive_")) {
      Client.post(`/student/exams/${currentId}/halt`, null, {
        params: { reason }
      }).catch(() => {});
    }

    if (onTerminateRef.current) {
      onTerminateRef.current(reason);
    } else {
      navigate(currentId?.startsWith("adaptive_") ? "/adaptive-coach" : "/dashboard");
    }
  }, [navigate]);

  const noPersonViolationRef = useRef(false);
  const multiplePersonViolationRef = useRef(false);
  const phoneViolationRef = useRef(false);
  const faceMismatchViolationRef = useRef(false);
  const biometricScoreRef = useRef(98);

  // 1. Fullscreen Violation Countdown (60s)
  useEffect(() => {
    if (!fullscreenViolation) {
      setFullscreenSecondsLeft(60);
      return;
    }
    setFullscreenSecondsLeft(60);
    const interval = setInterval(() => {
      setFullscreenSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          terminateExam("Exam Terminated: Fullscreen mode was not re-entered within 60 seconds.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [fullscreenViolation, terminateExam]);

  // 2. Tab Switch / Window Blur Countdown (30s)
  useEffect(() => {
    if (!tabSwitchViolation) {
      setTabSwitchSecondsLeft(30);
      return;
    }
    setTabSwitchSecondsLeft(30);
    const interval = setInterval(() => {
      setTabSwitchSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          terminateExam("Exam Terminated: Tab switch / browser window defocus active for over 30 seconds.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [tabSwitchViolation, terminateExam]);

  // 3. Multi-Person Detected Countdown (15s)
  useEffect(() => {
    if (!multiplePersonViolation) {
      setMultiplePersonSecondsLeft(15);
      return;
    }
    setMultiplePersonSecondsLeft(15);
    const interval = setInterval(() => {
      setMultiplePersonSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          logEvent("MULTIPLE_PERSON", 15);
          terminateExam("Exam Terminated: Multiple people detected in front of the webcam for over 15 seconds. Unauthorized collaboration violation.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [multiplePersonViolation, logEvent, terminateExam]);

  // 4. Mobile Phone Detected Countdown (10s)
  useEffect(() => {
    if (!phoneViolation) {
      setPhoneSecondsLeft(10);
      return;
    }
    setPhoneSecondsLeft(10);
    const interval = setInterval(() => {
      setPhoneSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          logEvent("MOBILE_PHONE", 10);
          terminateExam("Exam Terminated: Mobile phone detected in camera view for over 10 seconds. Electronic device prohibited.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phoneViolation, logEvent, terminateExam]);

  // 5. No Person Detected Countdown (60s)
  useEffect(() => {
    if (!noPersonViolation) {
      setNoPersonSecondsLeft(60);
      return;
    }
    setNoPersonSecondsLeft(60);
    const interval = setInterval(() => {
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
    return () => clearInterval(interval);
  }, [noPersonViolation, logEvent, terminateExam]);

  // 6. Face Mismatch / Unrecognized Countdown (15s)
  useEffect(() => {
    if (!faceMismatchViolation) {
      setFaceMismatchSecondsLeft(15);
      return;
    }
    setFaceMismatchSecondsLeft(15);
    const interval = setInterval(() => {
      setFaceMismatchSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          faceMismatchCount.current += 1;
          logEvent("FACE_MISMATCH", faceMismatchCount.current);
          terminateExam("Exam Terminated: Continuous face biometric mismatch or unrecognized face detected for over 15 seconds. Proxy candidate identified.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [faceMismatchViolation, logEvent, terminateExam]);

  // Pre-load Authoritative Biometric Identity Reference for this exam session
  useEffect(() => {
    async function loadBiometricRef() {
      const currentExamId = examIdRef.current;
      if (currentExamId && !currentExamId.startsWith("adaptive_")) {
        try {
          const res = await Client.get(`/student/exams/${currentExamId}/biometric-reference`);
          if (res.data?.faceEmbedding) {
            const vec = typeof res.data.faceEmbedding === "string" ? JSON.parse(res.data.faceEmbedding) : res.data.faceEmbedding;
            authoritativeEmbeddingRef.current = vec;
            sessionStorage.setItem(`proctorx_face_ref_${currentExamId}`, JSON.stringify(vec));
            return;
          }
        } catch {}
      }

      if (auth?.faceEmbedding) {
        try {
          const vec = typeof auth.faceEmbedding === "string" ? JSON.parse(auth.faceEmbedding) : auth.faceEmbedding;
          authoritativeEmbeddingRef.current = vec;
          if (currentExamId) {
            sessionStorage.setItem(`proctorx_face_ref_${currentExamId}`, JSON.stringify(vec));
          }
          return;
        } catch {}
      }

      const sessionRef = sessionStorage.getItem(`proctorx_face_ref_${currentExamId}`) || sessionStorage.getItem("proctorx_user_face_ref");
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

            if (people === 0) {
              noPersonCount.current += 1;
              noPersonViolationRef.current = true;
              setNoPersonViolation(true);
              multiplePersonViolationRef.current = false;
              setMultiplePersonViolation(false);
              phoneViolationRef.current = false;
              setPhoneViolation(false);
              setYoloTelemetry({ message: "⚠️ No person in frame", isWarning: true });
              if (noPersonCount.current % 5 === 0) {
                logEvent("NO_PERSON", noPersonCount.current);
              }
            } else if (people > 1) {
              noPersonCount.current = 0;
              noPersonViolationRef.current = false;
              setNoPersonViolation(false);
              multiplePersonCount.current += 1;
              multiplePersonViolationRef.current = true;
              setMultiplePersonViolation(true);
              phoneViolationRef.current = hasPhone;
              setPhoneViolation(hasPhone);
              setYoloTelemetry({ message: `⚠️ ${people} People Detected`, isWarning: true });
              if (multiplePersonCount.current % 3 === 0) {
                logEvent("MULTIPLE_PERSON", multiplePersonCount.current);
              }
            } else {
              // Exactly 1 candidate
              noPersonCount.current = 0;
              noPersonViolationRef.current = false;
              setNoPersonViolation(false);
              multiplePersonCount.current = 0;
              multiplePersonViolationRef.current = false;
              setMultiplePersonViolation(false);

              if (hasPhone) {
                phoneCount.current += 1;
                phoneViolationRef.current = true;
                setPhoneViolation(true);
                setYoloTelemetry({ message: "⚠️ Mobile phone detected", isWarning: true });
                if (phoneCount.current % 3 === 0) {
                  logEvent("MOBILE_PHONE", phoneCount.current);
                }
              } else {
                phoneCount.current = 0;
                phoneViolationRef.current = false;
                setPhoneViolation(false);
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
              const currentId = examIdRef.current;
              let refEmbedding = authoritativeEmbeddingRef.current;
              if (!refEmbedding && typeof getEnrolledEmbedding === "function") {
                refEmbedding = getEnrolledEmbedding(currentId);
              }
              if (!refEmbedding && auth?.faceEmbedding) {
                try {
                  refEmbedding = typeof auth.faceEmbedding === "string" ? JSON.parse(auth.faceEmbedding) : auth.faceEmbedding;
                } catch {}
              }
              if (!refEmbedding) {
                const raw = sessionStorage.getItem(`proctorx_face_ref_${currentId}`) || sessionStorage.getItem("proctorx_user_face_ref");
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

    const onVisibilityChange = () => {
      if (Date.now() - mountedAt < 3000) return;
      if (document.hidden) {
        const now = Date.now();
        if (now - lastTabEventRef.current < 1500) return;
        lastTabEventRef.current = now;

        tabSwitchCount.current += 1;
        logEvent("TAB_SWITCH", tabSwitchCount.current);
        setTabSwitchViolation(true);
        if (tabSwitchCount.current >= 3) {
          terminateExam("Exam Terminated: Security violations limit reached (3 strikes recorded for tab switches / window defocus).");
        }
      } else {
        setTabSwitchViolation(false);
      }
    };

    const onWindowBlur = () => {
      if (Date.now() - mountedAt < 3000) return;
      const now = Date.now();
      if (now - lastTabEventRef.current < 1500) return;
      lastTabEventRef.current = now;

      tabSwitchCount.current += 1;
      logEvent("WINDOW_DEFOCUS", tabSwitchCount.current);
      setTabSwitchViolation(true);
      if (tabSwitchCount.current >= 3) {
        terminateExam("Exam Terminated: Security violations limit reached (3 strikes recorded for tab switches / window defocus).");
      }
    };

    const onWindowFocus = () => {
      if (!document.hidden) {
        setTabSwitchViolation(false);
      }
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onWindowBlur);
    window.addEventListener("focus", onWindowFocus);
    startCameraAndModel();

    return () => {
      cancelled = true;
      clearTimeout(yoloTimer);
      clearTimeout(faceTimer);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onWindowBlur);
      window.removeEventListener("focus", onWindowFocus);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [loadModel, detect, verifyLiveFace, getEnrolledEmbedding, auth, logEvent, terminateExam]);

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
      {/* 1. Tab Switch / Defocus Warning Banner */}
      {tabSwitchViolation && (
        <div className="proctor-warning-banner" style={{ background: "rgba(239, 68, 68, 0.98)", zIndex: 10000, boxShadow: "0 0 25px rgba(239, 68, 68, 0.8)" }}>
          <span>⚠️ TAB SWITCH / WINDOW DEFOCUS DETECTED! (Warning {Math.min(3, tabSwitchCount.current)}/3)</span>
          <span style={{ fontWeight: 800 }}>Terminating in {tabSwitchSecondsLeft}s</span>
          <button
            type="button"
            onClick={() => setTabSwitchViolation(false)}
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
            I am back
          </button>
        </div>
      )}

      {/* 2. Fullscreen Warning Banner (Non-blocking / No screen blackout) */}
      {fullscreenViolation && !tabSwitchViolation && (
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

      {/* 3. Multi-Person Detected Warning Banner (YOLO Model) */}
      {multiplePersonViolation && !fullscreenViolation && !tabSwitchViolation && (
        <div className="proctor-warning-banner" style={{ background: "rgba(220, 38, 38, 0.98)", zIndex: 9999, boxShadow: "0 0 25px rgba(220, 38, 38, 0.8)" }}>
          <span>⚠️ WARNING: MULTIPLE PEOPLE DETECTED IN CAMERA! Only 1 candidate is permitted in frame.</span>
          <span style={{ fontWeight: 800 }}>Auto-Terminating in {multiplePersonSecondsLeft}s</span>
        </div>
      )}

      {/* 4. Mobile Phone Detected Warning Banner */}
      {phoneViolation && !multiplePersonViolation && !fullscreenViolation && !tabSwitchViolation && (
        <div className="proctor-warning-banner" style={{ background: "rgba(220, 38, 38, 0.98)", zIndex: 9999, boxShadow: "0 0 25px rgba(220, 38, 38, 0.8)" }}>
          <span>⚠️ WARNING: MOBILE PHONE DETECTED! Unauthorized electronic devices are strictly prohibited.</span>
          <span style={{ fontWeight: 800 }}>Auto-Terminating in {phoneSecondsLeft}s</span>
        </div>
      )}

      {/* 5. No Person Detected Floating Alert Banner */}
      {noPersonViolation && !multiplePersonViolation && !fullscreenViolation && !tabSwitchViolation && (
        <div className="proctor-warning-banner" style={{ zIndex: 9999 }}>
          <span>⚠️ WARNING: Sit directly in front of the webcam. No candidate detected!</span>
          <span style={{ fontWeight: 800 }}>Auto-Terminating in {noPersonSecondsLeft}s</span>
        </div>
      )}

      {/* 6. Biometric Face Mismatch / Unrecognized Alert Banner */}
      {faceMismatchViolation && !noPersonViolation && !multiplePersonViolation && !fullscreenViolation && !tabSwitchViolation && (
        <div className="proctor-warning-banner" style={{ background: "rgba(220, 38, 38, 0.95)", zIndex: 9999 }}>
          <span>⚠️ WARNING: Biometric Face Mismatch or Face Unrecognized! Ensure your face is clearly visible.</span>
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
              {multiplePersonViolation ? ` (${multiplePersonSecondsLeft}s)` : ""}
              {phoneViolation && !multiplePersonViolation ? ` (${phoneSecondsLeft}s)` : ""}
              {noPersonViolation ? ` (${noPersonSecondsLeft}s)` : ""}
            </span>
          </div>
          <div className="proctor-metric-row">
            <span className="proctor-metric-icon">👤</span>
            <span className="proctor-metric-label">Face ID:</span>
            <span className={`proctor-metric-val ${faceTelemetry.isMismatch ? "danger" : (faceTelemetry.isWarning ? "warn" : "ok")}`}>
              {faceTelemetry.message} {faceTelemetry.score != null ? `(${faceTelemetry.score}%)` : ""}
              {faceMismatchViolation ? ` · ${faceMismatchSecondsLeft}s` : ""}
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}

import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import Client from "../../shared/api/Client";
import useYoloDetector from "./useYoloDetector";
import useFaceVerifier from "./useFaceVerifier";
import { COCO_PERSON } from "./yoloUtils";
import { isWasmCached, precacheLanguage, getDetailedCacheStats } from "../exam/wasm/wasmCacheService";
import { precacheProctoringModels, isProctoringModelsCached, getAiModelCacheStats } from "./proctoringCacheService";
import Logo from "../../shared/components/Logo";
import "./proctoring.css";
import "../../App.css";

export default function ExamSecurityGate() {
  const { examId } = useParams();
  const [searchParams] = useSearchParams();
  const isVirtual = searchParams.get("virtual") === "true";

  const navigate = useNavigate();
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const [accepted, setAccepted] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [fullscreen, setFullscreen] = useState(Boolean(document.fullscreenElement));
  const [personVerified, setPersonVerified] = useState(false);
  const [faceEnrolled, setFaceEnrolled] = useState(false);
  const [enrollingFace, setEnrollingFace] = useState(false);
  const [examType, setExamType] = useState(null);
  const [examTitle, setExamTitle] = useState("");
  const [wasmReady, setWasmReady] = useState(false);
  const [wasmProgress, setWasmProgress] = useState(0);
  const [wasmStats, setWasmStats] = useState(null);
  const [wasmMessage, setWasmMessage] = useState("Checking local compiler cache...");
  const [aiModelsReady, setAiModelsReady] = useState(false);
  const [aiModelsProgress, setAiModelsProgress] = useState(0);
  const [aiModelStats, setAiModelStats] = useState(null);
  const [message, setMessage] = useState(
    isVirtual
      ? "Review the virtual contest simulation rules and begin your verification."
      : "Review the examination security protocol and begin your biometric verification."
  );

  const { detect, error: modelError, loadModel, loading } = useYoloDetector();
  const { enrollReferenceFace, loading: faceLoading } = useFaceVerifier();

  useEffect(() => {
    // Check & Pre-cache Compiler Pack and AI Proctoring Models in background
    async function initPreCaches() {
      // 1. WASM Compilers Cache
      const cached = await isWasmCached("all");
      const stats = await getDetailedCacheStats();
      setWasmStats(stats);

      if (cached && stats.python.isCached && stats.java.isCached && stats.cpp.isCached) {
        setWasmReady(true);
        setWasmProgress(100);
        setWasmMessage(`✓ Compilers Ready (Total: ${stats.total.sizeMB} Cached)`);
      } else {
        setWasmMessage("⚡ Pre-caching In-Browser Compilers (Python, Java, C++)...");
        precacheLanguage("all", (percent, msg) => {
          setWasmProgress(percent);
          setWasmMessage(msg);
          if (percent === 100) setWasmReady(true);
        }).then(async () => {
          const finalStats = await getDetailedCacheStats();
          setWasmStats(finalStats);
        });
      }

      // 2. AI Proctoring Models Cache (YOLO + Biometrics)
      const aiCached = await isProctoringModelsCached();
      const aiStats = await getAiModelCacheStats();
      setAiModelStats(aiStats);
      if (aiCached) {
        setAiModelsReady(true);
        setAiModelsProgress(100);
      } else {
        precacheProctoringModels((percent) => {
          setAiModelsProgress(percent);
          if (percent === 100) setAiModelsReady(true);
        }).then(async () => {
          const finalAiStats = await getAiModelCacheStats();
          setAiModelStats(finalAiStats);
        });
      }
    }
    initPreCaches();

    // Check if face was previously enrolled for this exam in this session
    const existingRef = sessionStorage.getItem(`proctorx_face_ref_${examId}`);
    if (existingRef) setFaceEnrolled(true);

    if (isVirtual) {
      Client.get(`/student/exams/${examId}/virtual-start`)
        .then((response) => {
          const exam = response.data.exam;
          setExamType(exam.examType);
          setExamTitle(exam.title || "Virtual Contest Simulation");
        })
        .catch((error) => {
          console.error(error);
          alert("Unable to load virtual contest details.");
          navigate("/exams/today");
        });
    } else {
      Client.get(`/student/exams/${examId}/eligibility`)
        .then((response) => {
          setExamType(response.data.examType);
          setExamTitle(response.data.title || "Examination");
        })
        .catch((error) => {
          const state = error.response?.data;
          alert(
            state === "SESSION_WAITING"
              ? "You are currently placed on the coordinator waiting list."
              : "This examination is not available for entry at this time."
          );
          navigate("/dashboard");
        });
    }

    const onFullscreen = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullscreen);

    return () => {
      document.removeEventListener("fullscreenchange", onFullscreen);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [examId, navigate, isVirtual]);

  async function beginSecurityCheck() {
    if (!accepted) {
      setMessage("Please accept the examination rules checkbox before starting the camera check.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraReady(true);
      setMessage("Camera active. Next, lock fullscreen mode.");
      await loadModel();
    } catch (cameraError) {
      console.error(cameraError);
      setMessage("Camera permission is strictly required to launch this proctored examination.");
    }
  }

  async function enterFullscreen() {
    try {
      await document.documentElement.requestFullscreen();
      setMessage("Fullscreen enabled! Now click 'Verify Identity Presence' to run AI check.");
    } catch {
      setMessage("Fullscreen request was blocked by the browser. Please allow fullscreen.");
    }
  }

  async function verifyPerson() {
    try {
      const detections = await detect(videoRef.current);
      const people = detections.filter((item) => item.classId === COCO_PERSON).length;
      if (people === 1) {
        setPersonVerified(true);
        setMessage("Identity presence verified! Exactly 1 student in frame. Next: Enroll Face Biometrics.");
      } else if (people === 0) {
        setPersonVerified(false);
        setMessage("⚠️ No person detected in frame. Please sit directly in front of the camera.");
      } else {
        setPersonVerified(false);
        setMessage("⚠️ Multiple individuals detected. Only one candidate may be visible during the exam.");
      }
    } catch (detectionError) {
      console.error(detectionError);
      setMessage("Camera frame could not be analyzed. Please ensure good lighting and retry.");
    }
  }

  async function handleEnrollFace() {
    if (!videoRef.current || !cameraReady) {
      setMessage("Please enable camera before enrolling facial biometrics.");
      return;
    }
    setEnrollingFace(true);
    setMessage("Capturing multi-angle biometric descriptor... Stay still in the oval frame.");

    const res = await enrollReferenceFace(videoRef.current, examId);
    setEnrollingFace(false);

    if (res.success) {
      setFaceEnrolled(true);
      setMessage("✓ Face Biometrics Enrolled! Your live face will be matched continuously during the exam.");
    } else {
      setFaceEnrolled(false);
      setMessage(`⚠️ Biometric capture failed: ${res.error || "Please look directly into camera."}`);
    }
  }

  function enterExam() {
    if (!accepted || !cameraReady || !fullscreen || !personVerified || !faceEnrolled || loading || modelError) return;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    const query = isVirtual ? "?virtual=true" : "";
    navigate(examType === "CODING" ? `/exam/${examId}/start-coding${query}` : `/exam/${examId}/start${query}`);
  }

  return (
    <div className="page page--top" style={{ padding: "40px 20px" }}>
      <div className="exam-container proctor-gate">
        {/* Header Branding */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <Logo size="md" />
          <span className="status-chip approved">
            {isVirtual ? "🚀 Virtual Contest Pre-Flight" : "Biometric Pre-Flight Check"}
          </span>
        </div>

        <div className="card">
          <div className="hero-badge">
            {isVirtual ? "Practice Simulation Gate" : "Assessment Entry Gate"}
          </div>
          <h2 style={{ fontSize: "1.6rem", margin: "4px 0 6px" }}>
            {examTitle || "Secure Examination Entry"}
          </h2>
          <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
            {isVirtual
              ? "Complete the readiness protocol to begin your timed, proctored practice session."
              : "Complete the 4-step readiness protocol before your timed session begins."}
          </p>

          {/* Rules & Consent */}
          <div style={{ marginTop: 20 }}>
            <h4 style={{ fontSize: "1rem", color: "var(--text-primary)" }}>
              {isVirtual ? "Virtual Contest Simulation Rules" : "Proctoring & Assessment Rules"}
            </h4>
            <ul className="proctor-rules">
              <li>Keep your webcam enabled and remain in continuous fullscreen mode for the entire exam.</li>
              <li>Only 1 candidate may be present in camera view; secondary persons will be flagged.</li>
              <li>Mobile phones and secondary electronic devices are logged as malpractice events.</li>
              <li>Tab switching, window blurs, copy/paste, and dev tools are automatically restricted and logged.</li>
              <li>Do not stay inactive for more than 10 minutes. A maximum of 3 reconnects are allowed.</li>
              {isVirtual && (
                <li style={{ color: "#34D399", fontWeight: 600 }}>
                  Practice Mode: Real-time score evaluation will be shown upon completion without modifying official grades.
                </li>
              )}
            </ul>

            <label className="proctor-consent">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
              />
              <span>I acknowledge and accept all proctoring rules, AI monitoring, and session integrity policies.</span>
            </label>
          </div>

          {/* Camera Viewfinder with Biometric Oval Guide */}
          <div className="proctor-camera-card">
            <video ref={videoRef} muted playsInline autoPlay className="proctor-camera" />
            
            {/* Biometric Oval Guide Overlay */}
            {cameraReady && (
              <div className="proctor-face-guide-overlay">
                <div className={`proctor-face-oval ${faceEnrolled ? "enrolled" : (enrollingFace ? "pulse" : "")}`} />
                <span className="proctor-face-label">
                  {faceEnrolled ? "✓ Biometric ID Enrolled" : (enrollingFace ? "Aligning Face..." : "Center Face Inside Oval")}
                </span>
              </div>
            )}

            <div className="proctor-status">
              <span className={cameraReady ? "status-good" : "status-pending"}>
                Webcam: {cameraReady ? "Ready" : "Required"}
              </span>
              <span className={fullscreen ? "status-good" : "status-pending"}>
                Fullscreen: {fullscreen ? "Locked" : "Required"}
              </span>
              <span className={personVerified ? "status-good" : "status-pending"}>
                AI Presence: {personVerified ? "Verified (1 Person)" : "Required"}
              </span>
              <span className={faceEnrolled ? "status-good" : "status-pending"}>
                Biometric ID: {faceEnrolled ? "Enrolled (Verified)" : "Required"}
              </span>
              <span className={wasmReady ? "status-good" : "status-pending"}>
                Compilers: {wasmReady ? "Ready (Cached)" : `${wasmProgress}%`}
              </span>
            </div>
          </div>

          {/* Compiler & AI Model Pre-Cache Notification */}
          <div
            className="card"
            style={{
              padding: "10px 16px",
              marginBottom: 12,
              background: wasmReady && aiModelsReady ? "rgba(16, 185, 129, 0.08)" : "rgba(99, 102, 241, 0.08)",
              borderColor: wasmReady && aiModelsReady ? "rgba(16, 185, 129, 0.25)" : "rgba(99, 102, 241, 0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "0.82rem"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span>{wasmReady && aiModelsReady ? "⚡" : "📦"}</span>
              <span style={{ color: wasmReady && aiModelsReady ? "#34D399" : "var(--text-primary)" }}>
                {wasmMessage} {aiModelsReady ? "· 🤖 AI Models Ready" : `· 🤖 AI Models: ${aiModelsProgress}%`}
              </span>
              {wasmStats && (
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "3px", background: wasmStats.python?.isCached ? "rgba(52, 211, 153, 0.18)" : "rgba(251, 191, 36, 0.18)", color: wasmStats.python?.isCached ? "#34D399" : "#FBBF24", fontWeight: 600 }}>
                    🐍 Python {wasmStats.python?.isCached ? `(${wasmStats.python.sizeMB})` : "(~12MB)"}
                  </span>
                  <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "3px", background: wasmStats.java?.isCached ? "rgba(52, 211, 153, 0.18)" : "rgba(251, 191, 36, 0.18)", color: wasmStats.java?.isCached ? "#34D399" : "#FBBF24", fontWeight: 600 }}>
                    ☕ Java {wasmStats.java?.isCached ? `(${wasmStats.java.sizeMB})` : "(~3.2MB)"}
                  </span>
                  <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "3px", background: wasmStats.cpp?.isCached ? "rgba(52, 211, 153, 0.18)" : "rgba(251, 191, 36, 0.18)", color: wasmStats.cpp?.isCached ? "#34D399" : "#FBBF24", fontWeight: 600 }}>
                    ⚡ C++ {wasmStats.cpp?.isCached ? `(${wasmStats.cpp.sizeMB})` : "(~0.5MB)"}
                  </span>
                  <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "3px", background: aiModelsReady ? "rgba(52, 211, 153, 0.18)" : "rgba(99, 102, 241, 0.18)", color: aiModelsReady ? "#34D399" : "#818CF8", fontWeight: 600 }}>
                    🤖 YOLO & Face ID {aiModelStats?.sizeMB ? `(${aiModelStats.sizeMB})` : "(~16MB)"}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Status Feedback Banner */}
          <div
            className="card"
            style={{
              padding: "12px 18px",
              background: modelError ? "var(--danger-bg)" : "var(--bg-surface-1)",
              borderColor: modelError ? "var(--danger-border)" : "var(--border-subtle)",
              color: modelError ? "#FCA5A5" : "var(--text-secondary)",
              fontSize: "0.88rem"
            }}
          >
            {modelError || (loading ? "⚡ Initializing local YOLOv8n neural detector in background worker..." : message)}
          </div>

          {/* Action Step Buttons */}
          <div className="button-row" style={{ marginTop: 24, justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                className="primary-btn"
                onClick={beginSecurityCheck}
                disabled={cameraReady}
              >
                1. Enable Camera
              </button>

              <button
                className="secondary-btn"
                onClick={enterFullscreen}
                disabled={!cameraReady || fullscreen}
              >
                2. Enter Fullscreen
              </button>

              <button
                className="ghost-btn"
                onClick={verifyPerson}
                disabled={!cameraReady || !fullscreen || loading || Boolean(modelError)}
              >
                3. Verify Presence
              </button>

              <button
                className="ghost-btn"
                onClick={handleEnrollFace}
                disabled={!cameraReady || !personVerified || enrollingFace || faceLoading}
                style={{
                  borderColor: faceEnrolled ? "#10B981" : undefined,
                  color: faceEnrolled ? "#34D399" : undefined
                }}
              >
                {faceEnrolled ? "✓ 4. Face ID Enrolled" : (enrollingFace ? "Capturing..." : "4. Enroll Face ID")}
              </button>
            </div>

            <button
              className="submit-btn"
              onClick={enterExam}
              disabled={!accepted || !cameraReady || !fullscreen || !personVerified || !faceEnrolled || loading || Boolean(modelError)}
            >
              {isVirtual ? "Launch Virtual Contest Simulation →" : "Launch Monitored Exam →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import Client from "../../shared/api/Client";
import useYoloDetector from "./useYoloDetector";
import { COCO_PERSON } from "./yoloUtils";
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
  const [examType, setExamType] = useState(null);
  const [examTitle, setExamTitle] = useState("");
  const [message, setMessage] = useState(
    isVirtual
      ? "Review the virtual contest simulation rules and begin your verification."
      : "Review the examination security protocol and begin your biometric verification."
  );

  const { detect, error: modelError, loadModel, loading } = useYoloDetector();

  useEffect(() => {
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
      setMessage("Camera stream active. Next, toggle fullscreen mode.");
      await loadModel();
    } catch (cameraError) {
      console.error(cameraError);
      setMessage("Camera permission is strictly required to launch this proctored examination.");
    }
  }

  async function enterFullscreen() {
    try {
      await document.documentElement.requestFullscreen();
      setMessage("Fullscreen enabled! Now click 'Verify Identity Presence' to run on-device AI check.");
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
        setMessage("Identity presence verified! Exactly 1 student detected in frame. You may now enter the exam.");
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

  function enterExam() {
    if (!accepted || !cameraReady || !fullscreen || !personVerified || loading || modelError) return;
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

          {/* Camera Viewfinder */}
          <div className="proctor-camera-card">
            <video ref={videoRef} muted playsInline autoPlay className="proctor-camera" />
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
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                className="primary-btn"
                onClick={beginSecurityCheck}
                disabled={cameraReady}
              >
                1. Enable Camera & AI Model
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
                3. Verify Identity Presence
              </button>
            </div>

            <button
              className="submit-btn"
              onClick={enterExam}
              disabled={!accepted || !cameraReady || !fullscreen || !personVerified || loading || Boolean(modelError)}
            >
              {isVirtual ? "Launch Virtual Contest Simulation →" : "Launch Monitored Exam →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

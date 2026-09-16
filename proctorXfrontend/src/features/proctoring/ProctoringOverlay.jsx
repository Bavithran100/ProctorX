import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Client from "../../shared/api/Client";
import useYoloDetector from "./useYoloDetector";
import { COCO_CELL_PHONE, COCO_PERSON } from "./yoloUtils";
import "./proctoring.css";

export default function ProctoringOverlay({ examId, onTerminate }) {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const multiplePersonCount = useRef(0);
  const phoneCount = useRef(0);
  const fullscreenExitCount = useRef(0);
  const noPersonCount = useRef(0);
  const sent = useRef({ camera: false });
  const terminatedRef = useRef(false);

  const [status, setStatus] = useState("Initializing camera stream...");
  const [fullscreenViolation, setFullscreenViolation] = useState(false);
  const [fullscreenSecondsLeft, setFullscreenSecondsLeft] = useState(60);
  const [noPersonViolation, setNoPersonViolation] = useState(false);
  const [noPersonSecondsLeft, setNoPersonSecondsLeft] = useState(60);

  const { detect, loadModel, loading, error } = useYoloDetector();

  const logEvent = useCallback(
    (event, count = 1) => {
      Client.post(`/student/exams/${examId}/malpractice`, null, {
        params: { event, count }
      }).catch(() => {});
    },
    [examId]
  );

  const terminateExam = useCallback(
    (reason) => {
      if (terminatedRef.current) return;
      terminatedRef.current = true;

      // Stop media tracks
      streamRef.current?.getTracks().forEach((track) => track.stop());

      alert(`⚠️ ${reason}\nYour examination attempt has been automatically submitted and closed.`);
      if (onTerminate) {
        onTerminate();
      } else {
        navigate("/dashboard");
      }
    },
    [navigate, onTerminate]
  );

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

  // Camera & YOLO Inference
  useEffect(() => {
    let cancelled = false;
    let timer;

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

        const processFrame = async () => {
          if (cancelled || terminatedRef.current) return;
          try {
            const detections = await detect(videoRef.current);
            const people = detections.filter((item) => item.classId === COCO_PERSON).length;
            const hasPhone = detections.some((item) => item.classId === COCO_CELL_PHONE);

            // 1. Person Count Check
            if (people === 0) {
              noPersonCount.current += 1;
              setNoPersonViolation(true);
              setStatus("⚠️ No person in frame!");
              if (noPersonCount.current % 5 === 0) {
                logEvent("NO_PERSON", noPersonCount.current);
              }
            } else {
              noPersonCount.current = 0;
              setNoPersonViolation(false);

              if (people > 1) {
                multiplePersonCount.current += 1;
                setStatus("⚠️ Multiple people detected!");
                if (multiplePersonCount.current % 5 === 0) {
                  logEvent("MULTIPLE_PERSON", multiplePersonCount.current);
                }
              } else if (!hasPhone) {
                setStatus("AI Proctor Active · Verified");
              }
            }

            // 2. Mobile Phone Check
            if (hasPhone) {
              phoneCount.current += 1;
              setStatus("⚠️ Mobile phone detected!");
              if (phoneCount.current % 3 === 0) {
                logEvent("MOBILE_PHONE", phoneCount.current);
              }
            }
          } catch {
            setStatus("AI frame processing retrying...");
          }

          if (!cancelled && !terminatedRef.current) {
            timer = setTimeout(processFrame, 1800);
          }
        };

        processFrame();
      } catch (err) {
        console.error("Camera access failed in exam", err);
        if (!sent.current.camera) {
          sent.current.camera = true;
          logEvent("CAMERA_UNAVAILABLE");
        }
        setStatus("Camera stream unavailable");
      }
    }

    const onFullscreenChange = () => {
      const isFullscreen = Boolean(document.fullscreenElement);
      if (!isFullscreen) {
        fullscreenExitCount.current += 1;
        logEvent("FULLSCREEN_EXIT", fullscreenExitCount.current);
        setFullscreenViolation(true);
        setStatus("⚠️ Fullscreen exited!");
      } else {
        setFullscreenViolation(false);
        setStatus("AI Proctor Active · Verified");
      }
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    startCameraAndModel();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [detect, examId, loadModel, logEvent]);

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
      {/* Fullscreen Violation Modal */}
      {fullscreenViolation && (
        <div className="proctor-violation-modal">
          <div className="proctor-violation-card">
            <div className="proctor-violation-title">
              ⚠️ FULLSCREEN VIOLATION DETECTED
            </div>
            <p className="proctor-violation-msg">
              You have exited fullscreen mode. Leaving the examination window is recorded on the coordinator audit trail.
              Return to fullscreen immediately or your session will be automatically terminated.
            </p>
            <div className="proctor-timer-badge">
              Terminating in: {fullscreenSecondsLeft}s
            </div>
            <div>
              <button
                type="button"
                className="proctor-reenter-btn"
                onClick={handleReenterFullscreen}
              >
                Return to Fullscreen Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* No Person Detected Floating Alert Banner */}
      {noPersonViolation && !fullscreenViolation && (
        <div className="proctor-warning-banner">
          <span>⚠️ WARNING: Sit directly in front of the webcam. No candidate detected!</span>
          <span style={{ fontWeight: 800 }}>Auto-Terminating in {noPersonSecondsLeft}s</span>
        </div>
      )}

      {/* Floating Picture-in-Picture Proctor View */}
      <aside className="proctor-overlay" aria-label="Proctoring Camera Feed">
        <video ref={videoRef} muted playsInline autoPlay />
        <span>{error || (loading ? "Loading AI..." : status)}</span>
      </aside>
    </>
  );
}

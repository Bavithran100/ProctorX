import { useEffect, useRef, useState } from "react";
import "../../App.css";

export default function CountDownTimer({
  durationMinutes,
  remainingSeconds,
  onTimeUp
}) {
  const timeUpHandled = useRef(false);
  const [secondsLeft, setSecondsLeft] = useState(
    Number.isFinite(remainingSeconds) ? remainingSeconds : durationMinutes * 60
  );

  useEffect(() => {
    if (secondsLeft <= 0) {
      if (!timeUpHandled.current) {
        timeUpHandled.current = true;
        onTimeUp();
      }
      return;
    }

    const interval = setInterval(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [secondsLeft, onTimeUp]);

  const minutes = Math.floor(Math.max(0, secondsLeft) / 60);
  const seconds = Math.max(0, secondsLeft) % 60;

  const isLowTime = secondsLeft <= 300; // 5 mins
  const isCritical = secondsLeft <= 60; // 1 min

  const timerStyle = isCritical
    ? { borderColor: "var(--danger-border)", background: "var(--danger-bg)", color: "#F87171", animation: "pulseSlow 1.5s infinite" }
    : isLowTime
    ? { borderColor: "var(--warning-border)", background: "var(--warning-bg)", color: "#FBBF24" }
    : {};

  return (
    <div className="timer" style={timerStyle}>
      <span style={{ fontSize: "1rem" }}>⏱</span>
      <span>Remaining Time:</span>
      <b style={{ color: isCritical ? "#F87171" : isLowTime ? "#FBBF24" : "var(--primary-light)" }}>
        {minutes}:{seconds.toString().padStart(2, "0")}
      </b>
    </div>
  );
}

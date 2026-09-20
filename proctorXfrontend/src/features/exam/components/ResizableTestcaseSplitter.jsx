import React, { useState, useEffect, useRef } from "react";

export default function ResizableTestcaseSplitter({
  height = 240,
  onHeightChange,
  minHeight = 140,
  maxHeight = 620,
  label = "Test Execution Results"
}) {
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(height);

  const startDrag = (clientY) => {
    setIsDragging(true);
    startYRef.current = clientY;
    startHeightRef.current = height;
    document.body.style.userSelect = "none";
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    startDrag(e.clientY);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      startDrag(e.touches[0].clientY);
    }
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      const deltaY = startYRef.current - e.clientY;
      const newHeight = Math.min(maxHeight, Math.max(minHeight, startHeightRef.current + deltaY));
      onHeightChange(newHeight);
    };

    const handleTouchMove = (e) => {
      if (e.touches.length === 1) {
        const deltaY = startYRef.current - e.touches[0].clientY;
        const newHeight = Math.min(maxHeight, Math.max(minHeight, startHeightRef.current + deltaY));
        onHeightChange(newHeight);
      }
    };

    const handleStopDrag = () => {
      setIsDragging(false);
      document.body.style.userSelect = "";
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleStopDrag);
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleStopDrag);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleStopDrag);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleStopDrag);
    };
  }, [isDragging, maxHeight, minHeight, onHeightChange]);

  return (
    <div
      className="resizable-panel-splitter"
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      style={{
        height: 24,
        cursor: "row-resize",
        background: isDragging
          ? "linear-gradient(90deg, #0284C7, #6366F1)"
          : "rgba(30, 41, 59, 0.9)",
        borderTop: "1px solid rgba(255, 255, 255, 0.12)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.12)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 12px",
        userSelect: "none",
        transition: isDragging ? "none" : "background 0.2s ease",
        boxShadow: isDragging ? "0 0 14px rgba(6, 182, 212, 0.5)" : "none",
        zIndex: 10
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: "11px", color: isDragging ? "#FFFFFF" : "#94A3B8", fontWeight: 700, letterSpacing: "0.03em" }}>
          ⬍ {label}
        </span>
        <span style={{ fontSize: "10px", color: isDragging ? "#E0F2FE" : "#64748B" }}>
          (Drag up/down to adjust)
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onHeightChange(160);
          }}
          style={{
            background: height <= 180 ? "rgba(255, 255, 255, 0.15)" : "transparent",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            color: isDragging ? "#FFFFFF" : "#38BDF8",
            borderRadius: 4,
            padding: "2px 8px",
            fontSize: "10px",
            fontWeight: 600,
            cursor: "pointer"
          }}
        >
          Compact ⤡
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onHeightChange(340);
          }}
          style={{
            background: height > 180 && height < 460 ? "rgba(255, 255, 255, 0.15)" : "transparent",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            color: isDragging ? "#FFFFFF" : "#38BDF8",
            borderRadius: 4,
            padding: "2px 8px",
            fontSize: "10px",
            fontWeight: 600,
            cursor: "pointer"
          }}
        >
          50 / 50 ⬍
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onHeightChange(maxHeight);
          }}
          style={{
            background: height >= 460 ? "rgba(255, 255, 255, 0.15)" : "transparent",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            color: isDragging ? "#FFFFFF" : "#38BDF8",
            borderRadius: 4,
            padding: "2px 8px",
            fontSize: "10px",
            fontWeight: 600,
            cursor: "pointer"
          }}
        >
          Stretch Full ⤢
        </button>
      </div>
    </div>
  );
}

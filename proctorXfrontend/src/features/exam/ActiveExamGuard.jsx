import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./ActiveExamGuard.css";

export const GLOBAL_EXAM_LOCK_KEY = "proctorx_global_active_exam";
export const GLOBAL_EXAM_CHANNEL = "proctorx_global_exam_bus";

export function getGlobalActiveExamLock() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(GLOBAL_EXAM_LOCK_KEY);
    if (!raw) return null;
    const lock = JSON.parse(raw);
    if (lock && Date.now() - (lock.lastPing || 0) < 3500) {
      return lock;
    }
  } catch {}
  return null;
}

export function releaseGlobalActiveExamLock(tabId) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(GLOBAL_EXAM_LOCK_KEY);
    if (raw) {
      const lock = JSON.parse(raw);
      if (!tabId || lock.tabId === tabId) {
        localStorage.removeItem(GLOBAL_EXAM_LOCK_KEY);
      }
    }
  } catch {}
}

/**
 * ActiveExamGuard:
 * Strict system-wide single active exam tab enforcement.
 * Guaranteed: If an active exam is already running in another tab,
 * children (questions, code editor, submit button, timers) are NEVER rendered into the DOM.
 */
export default function ActiveExamGuard({
  examId,
  examType = "EXAM",
  title = "Examination",
  children
}) {
  const navigate = useNavigate();
  const tabIdRef = useRef(`tab_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`);

  // Synchronous first-frame check: If an active lock exists in another tab, block immediately!
  const [blockedBy, setBlockedBy] = useState(() => {
    const existing = getGlobalActiveExamLock();
    if (existing && existing.tabId !== tabIdRef.current) {
      return existing;
    }
    return null;
  });

  useEffect(() => {
    const currentTabId = tabIdRef.current;

    // Verify lock status on mount
    const existing = getGlobalActiveExamLock();
    if (existing && existing.tabId !== currentTabId) {
      setBlockedBy(existing);
      return;
    }

    // Claim global lock lease
    const claim = {
      examId: String(examId || "active"),
      examType: String(examType || "EXAM"),
      title: String(title || "Examination"),
      tabId: currentTabId,
      lastPing: Date.now(),
      startedAt: Date.now()
    };

    try {
      localStorage.setItem(GLOBAL_EXAM_LOCK_KEY, JSON.stringify(claim));
    } catch {}

    // Heartbeat every 1000ms to maintain active lease
    const timer = setInterval(() => {
      try {
        const cur = localStorage.getItem(GLOBAL_EXAM_LOCK_KEY);
        if (cur) {
          const parsed = JSON.parse(cur);
          if (parsed.tabId === currentTabId) {
            parsed.lastPing = Date.now();
            localStorage.setItem(GLOBAL_EXAM_LOCK_KEY, JSON.stringify(parsed));
          } else if (Date.now() - (parsed.lastPing || 0) < 3500) {
            // Another tab took precedence or conflicted
            setBlockedBy(parsed);
          }
        } else {
          localStorage.setItem(GLOBAL_EXAM_LOCK_KEY, JSON.stringify({ ...claim, lastPing: Date.now() }));
        }
      } catch {}
    }, 1000);

    // Cross-tab broadcast channel for immediate mutual exclusion
    let channel = null;
    if (typeof BroadcastChannel !== "undefined") {
      try {
        channel = new BroadcastChannel(GLOBAL_EXAM_CHANNEL);
        // Announce presence
        channel.postMessage({ type: "EXAM_CLAIM", tabId: currentTabId, examId, title, startedAt: claim.startedAt });

        channel.onmessage = (event) => {
          const msg = event.data;
          if (!msg || msg.tabId === currentTabId) return;

          if (msg.type === "EXAM_CLAIM") {
            // Another tab is attempting to start an exam! Defend lease:
            channel.postMessage({
              type: "EXAM_ACTIVE_DEFENSE",
              tabId: currentTabId,
              examId,
              title,
              startedAt: claim.startedAt
            });
          } else if (msg.type === "EXAM_ACTIVE_DEFENSE") {
            // The other tab started earlier or has priority
            if (claim.startedAt > (msg.startedAt || 0)) {
              setBlockedBy(msg);
            }
          }
        };
      } catch (e) {
        console.warn("BroadcastChannel notice:", e);
      }
    }

    // Storage event listener for cross-tab updates
    const handleStorage = (e) => {
      if (e.key === GLOBAL_EXAM_LOCK_KEY) {
        if (!e.newValue) {
          // Lock cleared by other tab
        } else {
          try {
            const parsed = JSON.parse(e.newValue);
            if (parsed.tabId !== currentTabId && Date.now() - (parsed.lastPing || 0) < 3500) {
              setBlockedBy(parsed);
            }
          } catch {}
        }
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      clearInterval(timer);
      channel?.close();
      window.removeEventListener("storage", handleStorage);
      releaseGlobalActiveExamLock(currentTabId);
    };
  }, [examId, examType, title]);

  if (blockedBy) {
    return (
      <div className="active-exam-blocked-screen">
        <div className="active-exam-blocked-card">
          <div className="active-exam-blocked-icon">🚫</div>
          <h2 className="active-exam-blocked-title">Multiple Exam Tabs Strictly Prohibited</h2>
          <div className="active-exam-blocked-info">
            <span>You currently have an active examination open in another tab:</span>
            <strong>{blockedBy.title || blockedBy.examType || "Live Assessment"}</strong>
            {blockedBy.examId && <span className="exam-id-badge">ID: {blockedBy.examId}</span>}
          </div>
          <p className="active-exam-blocked-desc">
            To prevent system desynchronization, cheating, and duplicate submission chaos, opening multiple exam tabs simultaneously is <strong>strictly prohibited</strong>.
            Please close this tab and return to your active examination.
          </p>
          <div className="active-exam-blocked-actions">
            <button
              type="button"
              className="btn-primary-gradient"
              onClick={() => navigate("/dashboard")}
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return children;
}

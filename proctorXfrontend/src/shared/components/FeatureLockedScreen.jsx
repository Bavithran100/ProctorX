import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import AppShell from "./AppShell";
import Client, { formatApiError } from "../api/Client";
import { updateUserProfile } from "../state/AuthSlice";
import "../../App.css";

export default function FeatureLockedScreen({
  lockType = "COLLEGE_APPROVAL_PENDING",
  featureTitle = "Platform Feature",
  featureDescription = "This feature requires administrator account approval.",
  role = "STUDENT"
}) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { orgCode, institution, collegeAdminApproved, coordinatorApproved } = useSelector(
    (state) => state.auth
  );

  // States for Coordinator Assignment (Stage 2)
  const [coordinators, setCoordinators] = useState([]);
  const [selectedCoordId, setSelectedCoordId] = useState("");
  const [loadingCoords, setLoadingCoords] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [assignSuccess, setAssignSuccess] = useState(false);
  const [assignError, setAssignError] = useState("");

  const isAssignmentPending = lockType === "COORD_ASSIGNMENT_PENDING" || (role === "STUDENT" && collegeAdminApproved && !assignSuccess && !coordinatorApproved);

  useEffect(() => {
    if (role === "STUDENT" && (lockType === "COORD_ASSIGNMENT_PENDING" || collegeAdminApproved)) {
      fetchCoordinators();
    }
  }, [role, lockType, collegeAdminApproved]);

  async function fetchCoordinators() {
    try {
      setLoadingCoords(true);
      setAssignError("");
      const res = await Client.get("/student/coordinators");
      const list = res.data || [];
      setCoordinators(list);
      if (list.length > 0) {
        setSelectedCoordId(list[0].id);
      }
    } catch (err) {
      setAssignError(formatApiError(err) || "Could not retrieve available faculty coordinators.");
    } finally {
      setLoadingCoords(false);
    }
  }

  async function handleAssignCoordinator(e) {
    e.preventDefault();
    if (!selectedCoordId) {
      setAssignError("Please select a faculty coordinator.");
      return;
    }
    try {
      setAssigning(true);
      setAssignError("");
      const res = await Client.put("/student/assign-coordinator", {
        coordinatorId: selectedCoordId
      });
      if (res.data?.success) {
        setAssignSuccess(true);
        dispatch(
          updateUserProfile({
            coordinatorId: selectedCoordId,
            coordinatorApproved: false
          })
        );
      }
    } catch (err) {
      setAssignError(formatApiError(err) || "Failed to submit coordinator assignment request.");
    } finally {
      setAssigning(false);
    }
  }

  // Visual metadata based on lockType
  const getLockMeta = () => {
    if (lockType === "ORG_LOCKED") {
      return {
        icon: "🚫",
        badge: "Institutional Access Suspended",
        badgeColor: "#EF4444",
        border: "rgba(239, 68, 68, 0.35)",
        title: "Institution Account Locked",
        desc: "Access to this platform is temporarily restricted by platform administration. All member activities under your institution are halted. Your academic data is completely safe.",
        nextStep: "Contact campus administration or platform support."
      };
    }
    if (lockType === "PAYMENT_REQUIRED") {
      return {
        icon: "💳",
        badge: "Institutional Activation Pending",
        badgeColor: "#F59E0B",
        border: "rgba(245, 158, 11, 0.35)",
        title: "Campus Activation Incomplete",
        desc: "Your organization setup is incomplete. Complete institutional terms acceptance and plan activation to unlock member seats.",
        nextStep: "Complete subscription activation in institutional onboarding."
      };
    }
    if (lockType === "COORD_ASSIGNMENT_PENDING" || (isAssignmentPending && !assignSuccess)) {
      return {
        icon: "👨‍🏫",
        badge: "College Verified · Stage 2 Required",
        badgeColor: "#38BDF8",
        border: "rgba(56, 189, 248, 0.35)",
        title: "Select Faculty Coordinator",
        desc: "Your College Administrator has verified your institutional affiliation. To finalize your access, select your assigned Faculty Coordinator below.",
        nextStep: "Select coordinator from dropdown and submit assignment."
      };
    }
    if (lockType === "COORD_APPROVAL_PENDING" || assignSuccess) {
      return {
        icon: "⏳",
        badge: "Stage 2: Faculty Clearance Pending",
        badgeColor: "#818CF8",
        border: "rgba(129, 140, 248, 0.35)",
        title: "Awaiting Coordinator Approval",
        desc: "Your College Administrator has approved your institutional status. Your account is now in your Faculty Coordinator's clearance queue.",
        nextStep: "Awaiting approval from your assigned Faculty Coordinator."
      };
    }
    // Default: COLLEGE_APPROVAL_PENDING
    return {
      icon: "🏛️",
      badge: "Stage 1: Institutional Verification Pending",
      badgeColor: "#FBBF24",
      border: "rgba(251, 191, 36, 0.35)",
      title: `${featureTitle} is Locked`,
      desc: featureDescription || "Your registration is in your College Administrator's verification queue.",
      nextStep: "Awaiting verification from College Administrator."
    };
  };

  const meta = getLockMeta();

  return (
    <AppShell
      title={`Access Locked: ${featureTitle}`}
      subtitle="Institutional verification required for full access."
      activeNav="/dashboard"
    >
      <div
        className="page"
        style={{
          minHeight: "75vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px 16px"
        }}
      >
        <div
          className="card"
          style={{
            maxWidth: 580,
            width: "100%",
            textAlign: "center",
            padding: "40px 32px",
            background: "#0B0E17",
            border: `1px solid ${meta.border}`,
            boxShadow: "0 20px 45px rgba(0, 0, 0, 0.7)",
            borderRadius: "16px",
            position: "relative",
            overflow: "hidden"
          }}
        >
          {/* Top Accent Strip */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 2,
              background: `linear-gradient(90deg, ${meta.badgeColor} 0%, rgba(255,255,255,0.2) 100%)`
            }}
          />

          {/* Icon */}
          <div
            style={{
              width: 76,
              height: 76,
              margin: "0 auto 18px",
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.04)",
              border: `2px solid ${meta.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "2.2rem"
            }}
          >
            {meta.icon}
          </div>

          <div
            className="status-chip"
            style={{
              fontSize: "0.75rem",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 14,
              padding: "4px 12px",
              borderRadius: 20,
              color: meta.badgeColor,
              border: `1px solid ${meta.border}`,
              background: "rgba(255, 255, 255, 0.02)"
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: meta.badgeColor }} />
            {meta.badge}
          </div>

          <h2 style={{ fontSize: "1.45rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 10 }}>
            {meta.title}
          </h2>

          <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", lineHeight: 1.6, margin: "0 auto 24px", maxWidth: 460 }}>
            {meta.desc}
          </p>

          {/* Institutional Context Card */}
          <div
            style={{
              background: "rgba(255, 255, 255, 0.02)",
              border: "1px dashed rgba(255, 255, 255, 0.12)",
              borderRadius: "var(--radius-md)",
              padding: "14px 18px",
              marginBottom: 24,
              textAlign: "left"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: "0.82rem" }}>
              <span style={{ color: "var(--text-muted)" }}>Current Role:</span>
              <strong style={{ color: "var(--text-primary)" }}>{role}</strong>
            </div>
            {institution && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: "0.82rem" }}>
                <span style={{ color: "var(--text-muted)" }}>Campus / Institution:</span>
                <strong style={{ color: "var(--text-primary)" }}>{institution}</strong>
              </div>
            )}
            {orgCode && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: "0.82rem" }}>
                <span style={{ color: "var(--text-muted)" }}>Unique Org Code:</span>
                <span style={{ color: "var(--cyan)", fontFamily: "var(--font-mono)", fontWeight: 600 }}>{orgCode}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem" }}>
              <span style={{ color: "var(--text-muted)" }}>Next Requirement:</span>
              <span style={{ color: meta.badgeColor, fontWeight: 500 }}>{meta.nextStep}</span>
            </div>
          </div>

          {/* Interactive Coordinator Picker when Stage 2 assignment is pending */}
          {isAssignmentPending && !assignSuccess && (
            <div
              style={{
                background: "rgba(56, 189, 248, 0.05)",
                border: "1px solid rgba(56, 189, 248, 0.25)",
                borderRadius: "var(--radius-md)",
                padding: "20px",
                marginBottom: 24,
                textAlign: "left"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: "1.2rem" }}>🎓</span>
                <div>
                  <strong style={{ color: "#F8FAFC", fontSize: "0.95rem" }}>Assign Your Faculty Coordinator</strong>
                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    Coordinators oversee your test rounds, submissions, and attendance.
                  </div>
                </div>
              </div>

              {assignError && (
                <div style={{ color: "#EF4444", fontSize: "0.82rem", marginBottom: 12 }}>{assignError}</div>
              )}

              {loadingCoords ? (
                <div style={{ color: "var(--text-muted)", fontSize: "0.84rem", padding: "10px 0" }}>
                  Loading faculty coordinators in your institution...
                </div>
              ) : coordinators.length === 0 ? (
                <div style={{ color: "#F59E0B", fontSize: "0.84rem", padding: "8px 0" }}>
                  ⚠️ No faculty coordinators have been approved yet by your college dean. Please check back shortly.
                </div>
              ) : (
                <form onSubmit={handleAssignCoordinator}>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                      Select Coordinator:
                    </label>
                    <select
                      value={selectedCoordId}
                      onChange={(e) => setSelectedCoordId(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: 8,
                        background: "#080B11",
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                        color: "#F8FAFC",
                        fontSize: "0.88rem"
                      }}
                    >
                      {coordinators.map((c) => (
                        <option key={c.id} value={c.id}>
                          👨‍🏫 {c.name} ({c.department || "Faculty"}) — {c.email}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="primary-btn"
                    disabled={assigning || !selectedCoordId}
                    style={{
                      width: "100%",
                      padding: "10px 18px",
                      fontSize: "0.88rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8
                    }}
                  >
                    {assigning ? "Submitting Request..." : "Request Coordinator Clearance →"}
                  </button>
                </form>
              )}
            </div>
          )}

          {assignSuccess && (
            <div
              style={{
                background: "rgba(16, 185, 129, 0.08)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                borderRadius: "var(--radius-md)",
                padding: "16px",
                marginBottom: 24,
                color: "#10B981",
                fontSize: "0.88rem"
              }}
            >
              ✓ Faculty Coordinator successfully assigned! Your clearance request has been forwarded to their console.
            </div>
          )}

          {/* Action CTAs */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {lockType === "PAYMENT_REQUIRED" && (
              <button
                className="primary-btn"
                onClick={() => navigate("/institution/activation")}
                style={{
                  width: "100%",
                  padding: "12px 20px",
                  fontSize: "0.92rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8
                }}
              >
                Complete Institutional Activation →
              </button>
            )}

            <button
              className="ghost-btn"
              onClick={() => navigate("/dashboard")}
              style={{
                width: "100%",
                padding: "10px 18px",
                fontSize: "0.88rem"
              }}
            >
              Return to Workspace Dashboard
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

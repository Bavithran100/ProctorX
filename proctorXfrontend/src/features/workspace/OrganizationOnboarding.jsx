import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { loginSuccess } from "../../shared/state/AuthSlice";
import Client, { formatApiError } from "../../shared/api/Client";
import AppShell from "../../shared/components/AppShell";
import "../../App.css";

export default function OrganizationOnboarding() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);

  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("GROWTH");
  const [activating, setActivating] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    loadOrg();
  }, []);

  async function loadOrg() {
    try {
      setLoading(true);
      setError("");
      const res = await Client.get("/organization/my-organization");
      if (res.data) {
        setOrg(res.data);
        if (res.data.termsAccepted) setAcceptedTerms(true);
        if (res.data.subscriptionPlan) setSelectedPlan(res.data.subscriptionPlan);
      }
    } catch (err) {
      setError(formatApiError(err) || "Failed to load institution profile.");
    } finally {
      setLoading(false);
    }
  }

  async function handleMockActivate() {
    if (!acceptedTerms) {
      return setError("Please read and accept the Institutional Terms & Conditions.");
    }

    try {
      setActivating(true);
      setError("");
      setSuccess("");

      const res = await Client.post("/organization/mock-activate", {
        plan: selectedPlan
      });

      if (res.data?.success) {
        setSuccess(`Institution License Activated! Plan: ${res.data.plan}. Unique ID: ${res.data.orgCode}`);

        // Refresh user session state
        try {
          const meRes = await Client.get("/me");
          if (meRes.data) {
            dispatch(loginSuccess({ ...meRes.data, user: meRes.data.email }));
          }
        } catch (ignored) {}

        loadOrg();
      }
    } catch (err) {
      setError(formatApiError(err) || "Mock payment activation failed.");
    } finally {
      setActivating(false);
    }
  }

  function handleCopyOrgCode() {
    if (org?.orgCode) {
      navigator.clipboard.writeText(org.orgCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  }

  const plans = [
    {
      id: "STARTER",
      name: "Campus Starter",
      price: "₹4,999",
      coords: 3,
      students: 150,
      desc: "Perfect for single departments and baseline cohort examinations."
    },
    {
      id: "GROWTH",
      name: "Institutional Growth",
      price: "₹12,499",
      coords: 10,
      students: 600,
      popular: true,
      desc: "Ideal for growing engineering and arts colleges across multiple branches."
    },
    {
      id: "ENTERPRISE",
      name: "University Enterprise",
      price: "₹29,999",
      coords: 35,
      students: 2500,
      desc: "Campus-wide license with maximum faculty quotas and high concurrency."
    }
  ];

  return (
    <AppShell
      title="Institutional Activation & License Portal"
      subtitle="Complete your campus setup, review Terms & Conditions, and activate candidate quotas."
      activeNav="/admin/billing"
    >
      <div className="admin-container" style={{ maxWidth: 1040, margin: "0 auto", paddingBottom: 60 }}>
        {error && (
          <div className="auth-alert error" style={{ marginBottom: 20 }}>
            <span>⚠️</span> {error}
          </div>
        )}

        {success && (
          <div className="auth-alert success" style={{ marginBottom: 20 }}>
            <span>✅</span> {success}
          </div>
        )}

        {loading ? (
          <div className="card" style={{ padding: 48, textAlign: "center" }}>
            <div className="hero-badge">Loading Campus Profile...</div>
          </div>
        ) : org && org.paymentStatus === "ACTIVE" ? (
          /* Active Organization Dashboard View */
          <div className="card" style={{ padding: 32, border: "1px solid rgba(16, 185, 129, 0.3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
              <div>
                <span className="status-chip success">✓ INSTITUTION LICENSED & ACTIVE</span>
                <h2 style={{ margin: "12px 0 6px", fontSize: "1.8rem", color: "#F8FAFC" }}>{org.name}</h2>
                <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.88rem" }}>
                  Managed by College Administrator: <strong style={{ color: "#E2E8F0" }}>{user}</strong>
                </p>
              </div>

              {/* Unique Org Code Badge */}
              <div
                style={{
                  padding: "16px 20px",
                  borderRadius: "var(--radius-md)",
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  textAlign: "center"
                }}
              >
                <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Unique Campus Identifier
                </div>
                <div style={{ fontSize: "1.4rem", fontWeight: 800, fontFamily: "var(--font-mono)", color: "#818CF8", margin: "6px 0" }}>
                  {org.orgCode}
                </div>
                <button
                  type="button"
                  onClick={handleCopyOrgCode}
                  className="btn secondary"
                  style={{ fontSize: "0.78rem", padding: "4px 12px" }}
                >
                  {copiedCode ? "✓ Copied to Clipboard!" : "Copy Code for Students/Coords"}
                </button>
              </div>
            </div>

            <hr className="divider" style={{ margin: "24px 0" }} />

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 28 }}>
              <div style={{ padding: 16, borderRadius: 8, background: "rgba(255, 255, 255, 0.03)", border: "1px solid var(--border-subtle)" }}>
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Faculty Coordinators</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#F8FAFC", marginTop: 4 }}>
                  {org.currentCoordinators} <span style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>/ {org.maxCoordinatorsQuota}</span>
                </div>
              </div>

              <div style={{ padding: 16, borderRadius: 8, background: "rgba(255, 255, 255, 0.03)", border: "1px solid var(--border-subtle)" }}>
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Student Enrolled Seats</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#F8FAFC", marginTop: 4 }}>
                  {org.currentStudents} <span style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>/ {org.maxStudentsQuota}</span>
                </div>
              </div>

              <div style={{ padding: 16, borderRadius: 8, background: "rgba(255, 255, 255, 0.03)", border: "1px solid var(--border-subtle)" }}>
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Active Plan</div>
                <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#10B981", marginTop: 4 }}>
                  {org.subscriptionPlan} Pack
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn"
                onClick={() => navigate("/admin/approve")}
              >
                Manage & Approve Faculty Coordinators →
              </button>
              <button
                type="button"
                className="btn secondary"
                onClick={() => navigate("/dashboard")}
              >
                Go to Mission Control
              </button>
            </div>
          </div>
        ) : (
          /* Onboarding Activation Flow */
          <div>
            {/* Campus Header */}
            <div className="card" style={{ padding: 24, marginBottom: 24, border: "1px solid rgba(245, 158, 11, 0.3)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
                <div>
                  <span className="status-chip pending">⚡ ACTIVATION PENDING</span>
                  <h2 style={{ margin: "10px 0 4px", fontSize: "1.6rem", color: "#F8FAFC" }}>{org?.name}</h2>
                  <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.86rem" }}>
                    Campus ID Assigned: <strong style={{ color: "#818CF8", fontFamily: "var(--font-mono)" }}>{org?.orgCode}</strong>
                  </p>
                </div>

                <div style={{ maxWidth: 380, fontSize: "0.82rem", color: "#CBD5E1" }}>
                  Please review the terms, select your institution seat package, and complete checkout to activate registration for your faculty and candidates.
                </div>
              </div>
            </div>

            {/* Step 1: Terms & Conditions */}
            <div className="card" style={{ padding: 24, marginBottom: 24 }}>
              <h3 style={{ margin: "0 0 12px", fontSize: "1.2rem", color: "#F8FAFC" }}>
                1. Institutional Terms of Service & Privacy SLA
              </h3>
              <div
                style={{
                  maxHeight: 180,
                  overflowY: "auto",
                  padding: 16,
                  borderRadius: 8,
                  background: "rgba(0, 0, 0, 0.4)",
                  border: "1px solid var(--border-subtle)",
                  fontSize: "0.82rem",
                  color: "#94A3B8",
                  lineHeight: 1.6,
                  marginBottom: 16
                }}
              >
                <p style={{ margin: "0 0 8px" }}>
                  <strong>ProctorX Institutional Agreement:</strong> By activating this campus account, you certify that you are authorized by your institution to administer examination monitoring policies and candidate data.
                </p>
                <p style={{ margin: "0 0 8px" }}>
                  <strong>On-Device Privacy Standard:</strong> Biometric facial analysis and eye-gaze tracking are computed locally on candidate devices using browser WebAssembly. No raw video feeds are stored or broadcast to public third parties.
                </p>
                <p style={{ margin: "0 0 8px" }}>
                  <strong>Seat Quota Compliance:</strong> Coordinator and student enrollments are strictly bound by the contracted license ceiling. Expanding beyond contracted capacity requires package upgrading.
                </p>
                <p style={{ margin: 0 }}>
                  <strong>Academic Integrity:</strong> The institution agrees to review automated telemetry flags fairly and verify flagged infractions before formal grading action.
                </p>
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: "0.88rem", color: "#F8FAFC", fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: "var(--primary)" }}
                />
                I agree to the ProctorX Institutional Terms & Conditions and SLA Policies
              </label>
            </div>

            {/* Step 2: Choose Plan */}
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ margin: "0 0 14px", fontSize: "1.2rem", color: "#F8FAFC" }}>
                2. Select Institutional Subscription Tier
              </h3>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>
                {plans.map((p) => {
                  const isSelected = selectedPlan === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPlan(p.id)}
                      className="card"
                      style={{
                        padding: 24,
                        cursor: "pointer",
                        border: isSelected ? "2px solid #818CF8" : "1px solid var(--border-subtle)",
                        background: isSelected ? "rgba(129, 140, 248, 0.08)" : "var(--bg-surface)",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        position: "relative",
                        transition: "all 0.15s ease"
                      }}
                    >
                      {p.popular && (
                        <span
                          style={{
                            position: "absolute",
                            top: 12,
                            right: 12,
                            fontSize: "0.68rem",
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: 12,
                            background: "rgba(255, 255, 255, 0.15)",
                            color: "#FFF"
                          }}
                        >
                          MOST POPULAR
                        </span>
                      )}
                      <div>
                        <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "#F8FAFC" }}>{p.name}</div>
                        <div style={{ margin: "10px 0" }}>
                          <span style={{ fontSize: "1.8rem", fontWeight: 800, color: "#F8FAFC" }}>{p.price}</span>
                          <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}> / month</span>
                        </div>
                        <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: 14 }}>{p.desc}</p>

                        <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "0.84rem", color: "#CBD5E1", display: "flex", flexDirection: "column", gap: 8 }}>
                          <li>✓ <strong>{p.coords}</strong> Faculty Coordinators</li>
                          <li>✓ <strong>{p.students}</strong> Student Candidate Seats</li>
                          <li>✓ On-Device AI Video Proctoring</li>
                          <li>✓ Backend Process Sandbox Compiler</li>
                        </ul>
                      </div>

                      <div style={{ marginTop: 20 }}>
                        <div
                          style={{
                            padding: "8px",
                            borderRadius: 6,
                            textAlign: "center",
                            fontSize: "0.82rem",
                            fontWeight: 600,
                            background: isSelected ? "#818CF8" : "rgba(255, 255, 255, 0.05)",
                            color: isSelected ? "#FFF" : "var(--text-secondary)"
                          }}
                        >
                          {isSelected ? "✓ Selected Tier" : "Select Tier"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Mock Checkout Execution */}
            <div className="card" style={{ padding: 24, textAlign: "center" }}>
              <h3 style={{ margin: "0 0 6px", fontSize: "1.2rem", color: "#F8FAFC" }}>
                3. Complete License Checkout
              </h3>
              <p style={{ margin: "0 0 20px", color: "var(--text-muted)", fontSize: "0.86rem" }}>
                Currently in test mode: Click below to simulate instant gateway verification and enable your campus.
              </p>

              <button
                type="button"
                className="btn"
                disabled={activating || !acceptedTerms}
                onClick={handleMockActivate}
                style={{ padding: "12px 32px", fontSize: "1.05rem" }}
              >
                {activating ? "Processing Activation..." : `Pay ${plans.find((p) => p.id === selectedPlan)?.price} & Activate Campus →`}
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

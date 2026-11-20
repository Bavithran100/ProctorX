import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import Client, { formatApiError } from "../../shared/api/Client";
import AppShell from "../../shared/components/AppShell";
import "../../App.css";

export default function BillingManagement() {
  const role = useSelector((state) => state.auth.role);
  const organizationName = useSelector((state) => state.auth.organizationName) || "Campus Institution";
  const userEmail = useSelector((state) => state.auth.user);

  const [packs, setPacks] = useState([]);
  const [history, setHistory] = useState([]);
  const [coordinators, setCoordinators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [checkoutModal, setCheckoutModal] = useState(null); // active transaction payload
  const [simulatingPayment, setSimulatingPayment] = useState(false);

  // Quota distribution state
  const [selectedCoordId, setSelectedCoordId] = useState("");
  const [coordQuotaInput, setCoordQuotaInput] = useState(50);
  const [allocatingQuota, setAllocatingQuota] = useState(false);

  useEffect(() => {
    loadBillingData();
  }, []);

  async function loadBillingData() {
    try {
      setLoading(true);
      setError("");

      const [packsRes, historyRes, usersRes] = await Promise.allSettled([
        Client.get("/payment/pricing-packs"),
        Client.get("/payment/history"),
        Client.get("/admin/users")
      ]);

      if (packsRes.status === "fulfilled" && packsRes.value.data) {
        const rawPacks = packsRes.value.data;
        const list = Array.isArray(rawPacks)
          ? rawPacks
          : Object.entries(rawPacks).map(([key, val]) => ({ id: key, plan: key, ...val }));
        setPacks(list);
      }
      if (historyRes.status === "fulfilled" && historyRes.value.data) {
        setHistory(Array.isArray(historyRes.value.data) ? historyRes.value.data : []);
      }
      if (usersRes.status === "fulfilled" && usersRes.value.data) {
        const rawUsers = Array.isArray(usersRes.value.data) ? usersRes.value.data : [];
        const coords = rawUsers.filter((u) => u.role === "COORDINATOR");
        setCoordinators(coords);
        if (coords.length > 0 && !selectedCoordId) {
          setSelectedCoordId(coords[0].id || coords[0]._id);
        }
      }
    } catch (err) {
      setError(formatApiError(err) || "Failed to load institution billing data.");
    } finally {
      setLoading(false);
    }
  }

  async function handleInitiateCheckout(packId) {
    setError("");
    setSuccess("");
    try {
      const res = await Client.post("/payment/checkout", {
        plan: packId,
        organizationName
      });

      if (res.data) {
        setCheckoutModal(res.data);
      }
    } catch (err) {
      setError(formatApiError(err) || "Could not generate payment gateway checkout.");
    }
  }

  async function handleVerifyPayment(txnId, status = "COMPLETED") {
    try {
      setSimulatingPayment(true);
      setError("");
      const res = await Client.post("/payment/verify", {
        transactionId: txnId,
        status
      });

      if (res.data?.success || res.data?.status === "COMPLETED") {
        setSuccess(`Payment verified successfully! Plan ${res.data.plan || res.data.planName || "Active"} activated.`);
        setCheckoutModal(null);
        loadBillingData();
      } else {
        setError(res.data?.message || "Payment verification failed.");
      }
    } catch (err) {
      setError(formatApiError(err) || "Payment verification error.");
    } finally {
      setSimulatingPayment(false);
    }
  }

  async function handleAllocateQuota(e) {
    if (e) e.preventDefault();
    if (!selectedCoordId) {
      return setError("Please select a faculty coordinator.");
    }

    try {
      setAllocatingQuota(true);
      setError("");
      setSuccess("");

      const res = await Client.post("/payment/allocate-quota", {
        coordinatorId: selectedCoordId,
        allocatedStudentQuota: Number(coordQuotaInput)
      });

      if (res.data?.success) {
        setSuccess(`Quota of ${coordQuotaInput} students successfully allocated to coordinator.`);
        loadBillingData();
      }
    } catch (err) {
      setError(formatApiError(err) || "Quota allocation failed. Exceeds institutional ceiling.");
    } finally {
      setAllocatingQuota(false);
    }
  }

  return (
    <AppShell
      title="Institutional Quota & Payment Gateway"
      subtitle="Rent and scale institution assessment capacity. Dynamic PhonePe gateway licensing for coordinators and candidates."
      activeNav="/admin/billing"
    >
      <div className="admin-container" style={{ maxWidth: 1180, margin: "0 auto", paddingBottom: 60 }}>
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

        {/* Current Active Plan Banner */}
        <div
          className="card"
          style={{
            marginBottom: 24,
            padding: 24,
            background: "linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%)",
            border: "1px solid rgba(255, 255, 255, 0.12)"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
            <div>
              <span className="status-chip success" style={{ textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "0.74rem" }}>
                Active Institutional License
              </span>
              <h2 style={{ margin: "10px 0 4px", fontSize: "1.6rem", color: "#F8FAFC" }}>
                {organizationName}
              </h2>
              <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.88rem" }}>
                Managed by Admin: <strong style={{ color: "#E2E8F0" }}>{userEmail}</strong> · Role: <strong style={{ color: "#94A3B8" }}>{role}</strong>
              </p>
            </div>

            <div style={{ display: "flex", gap: 14 }}>
              <div
                style={{
                  padding: "12px 18px",
                  borderRadius: "var(--radius-sm)",
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  textAlign: "center"
                }}
              >
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Coordinators</div>
                <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "#F8FAFC", marginTop: 2 }}>{coordinators.length}</div>
              </div>
              <div
                style={{
                  padding: "12px 18px",
                  borderRadius: "var(--radius-sm)",
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  textAlign: "center"
                }}
              >
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Payment Gateway</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#10B981", marginTop: 4 }}>PhonePe Ready</div>
              </div>
            </div>
          </div>
        </div>

        {/* Subscription Packs Grid */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: "1.25rem", color: "#F8FAFC" }}>Select Institutional Subscription Pack</h3>
            <p style={{ margin: "4px 0 0", color: "var(--text-muted)", fontSize: "0.85rem" }}>
              Scale test quotas dynamically with immediate PhonePe payment intent routing.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))", gap: 20 }}>
            {packs.map((p) => {
              const packId = p.id || p.plan || "PRO";
              const isPopular = packId === "PRO" || packId === "GROWTH";
              const priceDisplay = (p.priceInr != null ? p.priceInr : 0).toLocaleString();
              return (
                <div
                  key={packId}
                  className="card"
                  style={{
                    padding: 24,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    border: isPopular ? "1px solid rgba(255, 255, 255, 0.3)" : "1px solid var(--border-subtle)",
                    background: isPopular ? "rgba(255, 255, 255, 0.03)" : "var(--bg-surface)",
                    position: "relative"
                  }}
                >
                  {isPopular && (
                    <span
                      style={{
                        position: "absolute",
                        top: 14,
                        right: 14,
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        padding: "3px 8px",
                        borderRadius: 12,
                        background: "rgba(255, 255, 255, 0.15)",
                        color: "#FFF"
                      }}
                    >
                      POPULAR
                    </span>
                  )}
                  <div>
                    <h4 style={{ margin: 0, fontSize: "1.2rem", color: "#F8FAFC" }}>{p.name || packId}</h4>
                    <div style={{ margin: "14px 0 16px" }}>
                      <span style={{ fontSize: "2rem", fontWeight: 800, color: "#F8FAFC" }}>
                        ₹{priceDisplay}
                      </span>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}> / month</span>
                    </div>

                    <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "0.86rem", color: "#CBD5E1", display: "flex", flexDirection: "column", gap: 10 }}>
                      <li style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ color: "#10B981" }}>✓</span>
                        <strong>{p.maxCoordinators || 5}</strong> Faculty Coordinator accounts
                      </li>
                      <li style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ color: "#10B981" }}>✓</span>
                        <strong>{p.maxStudents || 250}</strong> Student Candidate seats
                      </li>
                      <li style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ color: "#10B981" }}>✓</span>
                        Local Backend Compiler Sandbox
                      </li>
                      <li style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ color: "#10B981" }}>✓</span>
                        Dynamic Question Generator with 5 Ground-Truth Tests
                      </li>
                      <li style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ color: "#10B981" }}>✓</span>
                        On-device YOLO & Face Biometric Proctoring
                      </li>
                    </ul>
                  </div>

                  <button
                    type="button"
                    className="btn full"
                    onClick={() => handleInitiateCheckout(packId)}
                    style={{
                      marginTop: 24,
                      background: isPopular ? "var(--primary)" : "rgba(255, 255, 255, 0.08)",
                      color: "#FFF",
                      borderColor: isPopular ? "var(--primary)" : "rgba(255, 255, 255, 0.18)"
                    }}
                  >
                    Subscribe via PhonePe →
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quota Management & Faculty Sub-Allocation Section */}
        <div
          className="card"
          style={{
            padding: 24,
            marginBottom: 32,
            border: "1px solid var(--border-subtle)"
          }}
        >
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: "1.2rem", color: "#F8FAFC" }}>Faculty Coordinator Quota Allocation</h3>
            <p style={{ margin: "4px 0 0", color: "var(--text-muted)", fontSize: "0.85rem" }}>
              As Institutional Admin, divide your licensed student seats across departmental coordinators. Coordinators cannot enroll more candidates than this ceiling.
            </p>
          </div>

          <form onSubmit={handleAllocateQuota} style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ flex: 2, minWidth: 240 }}>
              <label style={{ display: "block", marginBottom: 6, fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>
                Select Faculty Coordinator
              </label>
              <select
                className="input"
                value={selectedCoordId}
                onChange={(e) => setSelectedCoordId(e.target.value)}
                style={{ width: "100%", padding: "10px 12px" }}
              >
                {coordinators.map((c) => (
                  <option key={c.id || c._id} value={c.id || c._id}>
                    {c.name} ({c.email}) — Dept: {c.department || "General"}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ flex: 1, minWidth: 160 }}>
              <label style={{ display: "block", marginBottom: 6, fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>
                Max Student Quota Ceiling
              </label>
              <input
                type="number"
                min="10"
                max="5000"
                className="input"
                value={coordQuotaInput}
                onChange={(e) => setCoordQuotaInput(e.target.value)}
                style={{ width: "100%", padding: "10px 12px" }}
              />
            </div>

            <button
              type="submit"
              className="btn"
              disabled={allocatingQuota || coordinators.length === 0}
              style={{ minWidth: 160, padding: "10px 20px" }}
            >
              {allocatingQuota ? "Saving Quota..." : "Assign Quota"}
            </button>
          </form>
        </div>

        {/* Transaction History Section */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: "1.2rem", color: "#F8FAFC" }}>Billing & Transaction Audit Trail</h3>
            <p style={{ margin: "4px 0 0", color: "var(--text-muted)", fontSize: "0.85rem" }}>
              Dynamic gateway transaction records and verification status.
            </p>
          </div>

          {history.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: "0.88rem" }}>
              No previous billing transactions recorded. Select a subscription pack to initiate your first gateway payment.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.1)", color: "var(--text-muted)" }}>
                    <th style={{ padding: "10px 14px" }}>Transaction ID</th>
                    <th style={{ padding: "10px 14px" }}>Plan</th>
                    <th style={{ padding: "10px 14px" }}>Amount</th>
                    <th style={{ padding: "10px 14px" }}>Seats (Coords / Students)</th>
                    <th style={{ padding: "10px 14px" }}>Status</th>
                    <th style={{ padding: "10px 14px" }}>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((tx) => (
                    <tr key={tx.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                      <td style={{ padding: "12px 14px", fontFamily: "monospace", color: "#E2E8F0" }}>{tx.transactionId}</td>
                      <td style={{ padding: "12px 14px", fontWeight: 600 }}>{tx.plan}</td>
                      <td style={{ padding: "12px 14px", color: "#10B981" }}>₹{tx.amountInr?.toLocaleString()}</td>
                      <td style={{ padding: "12px 14px" }}>{tx.coordinatorSeats} / {tx.studentSeats}</td>
                      <td style={{ padding: "12px 14px" }}>
                        <span className={`status-chip ${tx.status === "COMPLETED" ? "success" : "pending"}`}>
                          {tx.status}
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px", color: "var(--text-muted)" }}>{new Date(tx.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Dynamic Payment Gateway Modal */}
      {checkoutModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 20
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: 480,
              width: "100%",
              padding: 28,
              border: "1px solid rgba(255, 255, 255, 0.2)",
              background: "#0F172A",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: "1.6rem" }}>💳</span>
                <h3 style={{ margin: 0, fontSize: "1.3rem", color: "#F8FAFC" }}>PhonePe Dynamic Gateway</h3>
              </div>
              <button
                type="button"
                onClick={() => setCheckoutModal(null)}
                style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontSize: "1.2rem", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <div style={{ background: "rgba(255, 255, 255, 0.04)", borderRadius: 8, padding: 16, marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: "0.85rem" }}>
                <span style={{ color: "var(--text-muted)" }}>Selected Plan:</span>
                <strong style={{ color: "#F8FAFC" }}>{checkoutModal.plan}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: "0.85rem" }}>
                <span style={{ color: "var(--text-muted)" }}>Amount Due:</span>
                <strong style={{ color: "#10B981", fontSize: "1.1rem" }}>₹{checkoutModal.amountInr?.toLocaleString()}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: "0.85rem" }}>
                <span style={{ color: "var(--text-muted)" }}>Order Reference:</span>
                <span style={{ color: "#94A3B8", fontFamily: "monospace", fontSize: "0.78rem" }}>{checkoutModal.transactionId}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                <span style={{ color: "var(--text-muted)" }}>Gateway Intent:</span>
                <span style={{ color: "#818CF8", fontSize: "0.78rem" }}>Dynamic URL Checkout</span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <a
                href={checkoutModal.paymentUrl}
                target="_blank"
                rel="noreferrer"
                className="btn full"
                style={{ textAlign: "center", textDecoration: "none", padding: "12px 16px" }}
              >
                Proceed to Payment Gateway URL ↗
              </a>

              <button
                type="button"
                className="btn secondary full"
                disabled={simulatingPayment}
                onClick={() => handleVerifyPayment(checkoutModal.transactionId, "COMPLETED")}
                style={{ padding: "10px 16px", borderColor: "rgba(16, 185, 129, 0.4)", color: "#10B981" }}
              >
                {simulatingPayment ? "Verifying Transaction..." : "✓ Verify & Authorize License (Instant)"}
              </button>

              <button
                type="button"
                className="btn secondary full"
                onClick={() => setCheckoutModal(null)}
                style={{ padding: "8px 16px", opacity: 0.7 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

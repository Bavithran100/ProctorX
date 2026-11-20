import { useState, useEffect } from "react";
import Client, { formatApiError } from "../../shared/api/Client";
import AppShell from "../../shared/components/AppShell";
import "../../App.css";

export default function SuperAdminOrganizations() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [expandedOrgId, setExpandedOrgId] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(false);

  // Modals
  const [deleteModalOrg, setDeleteModalOrg] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [showCleanDbModal, setShowCleanDbModal] = useState(false);

  useEffect(() => {
    fetchOverview();
  }, []);

  async function fetchOverview() {
    try {
      setLoading(true);
      setError("");
      const res = await Client.get("/super-admin/organizations");
      if (res.data) {
        setData(res.data);
      }
    } catch (err) {
      setError(formatApiError(err) || "Failed to load master organizations overview.");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleLock(orgId) {
    try {
      setActionInProgress(true);
      setError("");
      setSuccess("");
      const res = await Client.put(`/super-admin/organizations/${orgId}/toggle-lock`);
      if (res.data?.success) {
        setSuccess(res.data.message);
        fetchOverview();
      }
    } catch (err) {
      setError(formatApiError(err) || "Failed to toggle organization lock.");
    } finally {
      setActionInProgress(false);
    }
  }

  async function handleDeleteOrganization() {
    if (!deleteModalOrg) return;
    if (deleteConfirmText.trim() !== deleteModalOrg.orgCode) {
      return setError(`Please type '${deleteModalOrg.orgCode}' exactly to confirm deletion.`);
    }

    try {
      setActionInProgress(true);
      setError("");
      setSuccess("");
      const res = await Client.delete(`/super-admin/organizations/${deleteModalOrg.id}`);
      if (res.data?.success) {
        setSuccess(res.data.message);
        setDeleteModalOrg(null);
        setDeleteConfirmText("");
        fetchOverview();
      }
    } catch (err) {
      setError(formatApiError(err) || "Failed to delete organization.");
    } finally {
      setActionInProgress(false);
    }
  }

  async function handleCleanDatabase() {
    try {
      setActionInProgress(true);
      setError("");
      setSuccess("");
      const res = await Client.post("/super-admin/clean-database");
      if (res.data?.success) {
        setSuccess(res.data.message);
        setShowCleanDbModal(false);
        fetchOverview();
      }
    } catch (err) {
      setError(formatApiError(err) || "Database reset failed.");
    } finally {
      setActionInProgress(false);
    }
  }

  const summary = data?.summary || {};
  const orgs = data?.organizations || [];

  return (
    <AppShell
      title="Master Organization Governance"
      subtitle="Super Admin global tenant control room. Supervise campus organizations, quotas, member rosters, and tenant kill switches."
      activeNav="/admin/organizations"
    >
      <div className="admin-container" style={{ maxWidth: 1240, margin: "0 auto", paddingBottom: 60 }}>
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

        {/* Top Action Bar & Reset Trigger */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 14 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.4rem", color: "#F8FAFC" }}>Tenant Governance Directory</h2>
            <p style={{ margin: "2px 0 0", fontSize: "0.84rem", color: "var(--text-muted)" }}>
              Inspect and control all registered institutions and their tiered coordinators & student rosters.
            </p>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              className="btn secondary"
              onClick={fetchOverview}
              disabled={loading}
              style={{ fontSize: "0.82rem" }}
            >
              ↻ Refresh
            </button>
            <button
              type="button"
              onClick={() => setShowCleanDbModal(true)}
              style={{
                fontSize: "0.82rem",
                padding: "8px 14px",
                borderRadius: "var(--radius-sm)",
                background: "rgba(239, 68, 68, 0.15)",
                color: "#EF4444",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              ⚠️ Clean Database & Fresh Start
            </button>
          </div>
        </div>

        {/* Global KPI Summary Grid */}
        <div className="monitor-summary-grid" style={{ marginBottom: 24 }}>
          <div className="monitor-stat">
            <span>Total Organizations</span>
            <strong>{summary.totalOrganizations || 0}</strong>
            <small>{summary.activeOrganizations || 0} Active Licenses</small>
          </div>
          <div className="monitor-stat">
            <span>Total Coordinators</span>
            <strong>{summary.totalCoordinators || 0}</strong>
            <small>Across all registered institutions</small>
          </div>
          <div className="monitor-stat">
            <span>Total Students</span>
            <strong>{summary.totalStudents || 0}</strong>
            <small>Active candidate enrollments</small>
          </div>
          <div className="monitor-stat danger">
            <span>Suspended Tenants</span>
            <strong>{summary.lockedOrganizations || 0}</strong>
            <small>Locked by Super Admin</small>
          </div>
        </div>

        {/* Organizations Table */}
        {loading ? (
          <div className="card" style={{ padding: 48, textAlign: "center" }}>
            <div className="hero-badge">Loading Global Tenants...</div>
          </div>
        ) : orgs.length === 0 ? (
          <div className="card" style={{ padding: 48, textAlign: "center" }}>
            <div style={{ fontSize: "2.4rem", marginBottom: 12 }}>🏛️</div>
            <h3 style={{ margin: "0 0 8px", color: "#F8FAFC" }}>No Organizations Registered Yet</h3>
            <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.88rem" }}>
              When a College Administrator registers and activates their campus, it will appear here in the master directory.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {orgs.map((org) => {
              const isExpanded = expandedOrgId === org.id;
              return (
                <div
                  key={org.id}
                  className="card"
                  style={{
                    padding: 22,
                    border: org.isLocked
                      ? "1px solid rgba(239, 68, 68, 0.4)"
                      : org.paymentStatus === "ACTIVE"
                      ? "1px solid rgba(16, 185, 129, 0.3)"
                      : "1px solid var(--border-subtle)",
                    background: org.isLocked ? "rgba(239, 68, 68, 0.03)" : "var(--bg-surface)"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: "0.76rem",
                            fontWeight: 700,
                            padding: "3px 8px",
                            borderRadius: 6,
                            background: "rgba(129, 140, 248, 0.15)",
                            color: "#818CF8",
                            border: "1px solid rgba(129, 140, 248, 0.3)"
                          }}
                        >
                          {org.orgCode}
                        </span>

                        <h3 style={{ margin: 0, fontSize: "1.25rem", color: "#F8FAFC" }}>{org.name}</h3>

                        <span className={`status-chip ${org.isLocked ? "danger" : org.paymentStatus === "ACTIVE" ? "success" : "pending"}`}>
                          {org.isLocked ? "🔒 SUSPENDED" : org.paymentStatus}
                        </span>

                        <span className="status-chip">{org.subscriptionPlan || "STARTER"}</span>
                      </div>

                      <div style={{ marginTop: 8, fontSize: "0.84rem", color: "var(--text-muted)" }}>
                        Admin: <strong style={{ color: "#E2E8F0" }}>{org.admin?.name || "Unassigned"}</strong> ({org.admin?.email || "-"}) ·
                        Registered: <span>{new Date(org.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {/* Quota gauges */}
                      <div style={{ textAlign: "right", marginRight: 8 }}>
                        <div style={{ fontSize: "0.82rem", color: "#CBD5E1" }}>
                          Coords: <strong>{org.coordinatorsCount}</strong> / {org.maxCoordinatorsQuota} · Students: <strong>{org.studentsCount}</strong> / {org.maxStudentsQuota}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleLock(org.id)}
                        disabled={actionInProgress}
                        className="btn secondary"
                        style={{
                          fontSize: "0.78rem",
                          padding: "6px 12px",
                          borderColor: org.isLocked ? "rgba(16, 185, 129, 0.4)" : "rgba(239, 68, 68, 0.4)",
                          color: org.isLocked ? "#10B981" : "#EF4444"
                        }}
                      >
                        {org.isLocked ? "🔓 Unlock Tenant" : "🔒 Suspend Tenant"}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setDeleteModalOrg(org);
                          setDeleteConfirmText("");
                        }}
                        disabled={actionInProgress}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "var(--text-muted)",
                          fontSize: "0.85rem",
                          cursor: "pointer",
                          padding: "6px"
                        }}
                        title="Delete organization"
                      >
                        🗑️
                      </button>

                      <button
                        type="button"
                        onClick={() => setExpandedOrgId(isExpanded ? null : org.id)}
                        className="btn secondary"
                        style={{ fontSize: "0.78rem", padding: "6px 12px" }}
                      >
                        {isExpanded ? "▲ Hide Hierarchy" : "▼ Inspect Roster"}
                      </button>
                    </div>
                  </div>

                  {/* Expandable Hierarchy Tree */}
                  {isExpanded && (
                    <div
                      style={{
                        marginTop: 20,
                        paddingTop: 18,
                        borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                        fontSize: "0.84rem"
                      }}
                    >
                      {/* Coordinators Section */}
                      <div style={{ marginBottom: 18 }}>
                        <div style={{ fontWeight: 700, color: "#818CF8", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                          <span>🏛️</span> Faculty Coordinators ({org.coordinators?.length || 0})
                        </div>

                        {org.coordinators?.length === 0 ? (
                          <div style={{ color: "var(--text-muted)", paddingLeft: 24, fontSize: "0.8rem" }}>
                            No coordinators registered under this organization yet.
                          </div>
                        ) : (
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10, paddingLeft: 12 }}>
                            {org.coordinators.map((c) => (
                              <div
                                key={c.id}
                                style={{
                                  padding: "10px 14px",
                                  borderRadius: 8,
                                  background: "rgba(255, 255, 255, 0.03)",
                                  border: "1px solid var(--border-subtle)"
                                }}
                              >
                                <div style={{ fontWeight: 600, color: "#F8FAFC" }}>{c.name}</div>
                                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{c.email}</div>
                                <div style={{ fontSize: "0.76rem", color: "#94A3B8", marginTop: 4 }}>
                                  Dept: {c.department || "General"} · Students: <strong>{c.studentsCount}</strong>
                                </div>
                                <div style={{ marginTop: 6 }}>
                                  <span className={`status-chip ${c.collegeAdminApproved ? "success" : "pending"}`} style={{ fontSize: "0.68rem" }}>
                                    {c.collegeAdminApproved ? "✓ Verified Faculty" : "Pending Admin Approval"}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Students Section */}
                      <div>
                        <div style={{ fontWeight: 700, color: "#10B981", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                          <span>🎓</span> Enrolled Student Candidates ({org.students?.length || 0})
                        </div>

                        {org.students?.length === 0 ? (
                          <div style={{ color: "var(--text-muted)", paddingLeft: 24, fontSize: "0.8rem" }}>
                            No students registered under this organization yet.
                          </div>
                        ) : (
                          <div style={{ overflowX: "auto" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", textAlign: "left" }}>
                              <thead>
                                <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.08)", color: "var(--text-muted)" }}>
                                  <th style={{ padding: "8px 10px" }}>Student</th>
                                  <th style={{ padding: "8px 10px" }}>Dept / Roll</th>
                                  <th style={{ padding: "8px 10px" }}>College Admin Status</th>
                                  <th style={{ padding: "8px 10px" }}>Coordinator Status</th>
                                  <th style={{ padding: "8px 10px" }}>Full Access</th>
                                </tr>
                              </thead>
                              <tbody>
                                {org.students.map((s) => (
                                  <tr key={s.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}>
                                    <td style={{ padding: "8px 10px" }}>
                                      <strong style={{ color: "#E2E8F0" }}>{s.name}</strong>
                                      <div style={{ fontSize: "0.74rem", color: "var(--text-muted)" }}>{s.email}</div>
                                    </td>
                                    <td style={{ padding: "8px 10px" }}>{s.department || "-"}</td>
                                    <td style={{ padding: "8px 10px" }}>
                                      <span className={`status-chip ${s.collegeAdminApproved ? "success" : "pending"}`} style={{ fontSize: "0.68rem" }}>
                                        {s.collegeAdminApproved ? "✓ Stage 1 Approved" : "Pending Admin"}
                                      </span>
                                    </td>
                                    <td style={{ padding: "8px 10px" }}>
                                      <span className={`status-chip ${s.coordinatorApproved ? "success" : "pending"}`} style={{ fontSize: "0.68rem" }}>
                                        {s.coordinatorApproved ? "✓ Stage 2 Cleared" : s.coordinatorId ? "Pending Faculty" : "No Coordinator Picked"}
                                      </span>
                                    </td>
                                    <td style={{ padding: "8px 10px" }}>
                                      <span style={{ color: s.isFullyApproved ? "#10B981" : "#F59E0B", fontWeight: 700 }}>
                                        {s.isFullyApproved ? "✓ UNLOCKED" : "🔒 LOCKED"}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Organization Confirmation Modal */}
      {deleteModalOrg && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 20 }}>
          <div className="card" style={{ maxWidth: 460, width: "100%", padding: 28, border: "1px solid rgba(239, 68, 68, 0.4)", background: "#0B0E17" }}>
            <h3 style={{ margin: "0 0 10px", color: "#EF4444", fontSize: "1.25rem" }}>
              ⚠️ Cascading Delete Organization
            </h3>
            <p style={{ margin: "0 0 16px", color: "#CBD5E1", fontSize: "0.85rem", lineHeight: 1.5 }}>
              You are about to permanently delete <strong>{deleteModalOrg.name}</strong> along with all coordinators, students, exams, and logs under this tenant.
            </p>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", marginBottom: 6, fontSize: "0.8rem", color: "var(--text-muted)" }}>
                Type <strong style={{ color: "#EF4444", fontFamily: "var(--font-mono)" }}>{deleteModalOrg.orgCode}</strong> to confirm:
              </label>
              <input
                type="text"
                className="input"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={deleteModalOrg.orgCode}
                style={{ width: "100%", padding: "10px" }}
              />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                className="btn"
                disabled={actionInProgress || deleteConfirmText.trim() !== deleteModalOrg.orgCode}
                onClick={handleDeleteOrganization}
                style={{ background: "#EF4444", borderColor: "#EF4444", flex: 1 }}
              >
                {actionInProgress ? "Deleting..." : "Permanently Delete Tenant"}
              </button>
              <button
                type="button"
                className="btn secondary"
                onClick={() => setDeleteModalOrg(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clean Database Fresh Start Modal */}
      {showCleanDbModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 20 }}>
          <div className="card" style={{ maxWidth: 480, width: "100%", padding: 28, border: "1px solid rgba(239, 68, 68, 0.4)", background: "#0B0E17" }}>
            <h3 style={{ margin: "0 0 10px", color: "#EF4444", fontSize: "1.3rem" }}>
              ⚠️ Clean Database & Fresh Start
            </h3>
            <p style={{ margin: "0 0 16px", color: "#CBD5E1", fontSize: "0.86rem", lineHeight: 1.6 }}>
              This will wipe all registered organizations, payment transactions, and non-admin candidate accounts.
              The database will reset to a pristine fresh state, and seed the Super Admin:
              <br />
              <strong style={{ color: "#818CF8" }}>admin@proctorx.com</strong> / <strong style={{ color: "#818CF8" }}>admin123</strong>
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                className="btn"
                disabled={actionInProgress}
                onClick={handleCleanDatabase}
                style={{ background: "#EF4444", borderColor: "#EF4444", flex: 1 }}
              >
                {actionInProgress ? "Resetting Database..." : "Confirm Fresh Start"}
              </button>
              <button
                type="button"
                className="btn secondary"
                onClick={() => setShowCleanDbModal(false)}
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

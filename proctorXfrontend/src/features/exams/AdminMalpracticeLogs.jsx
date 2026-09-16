import { useEffect, useState } from "react";
import Client from "../../shared/api/Client";
import AppShell from "../../shared/components/AppShell";
import "../../AdminMonitoring.css";
import "../../App.css";

export default function AdminMalpracticeHistory() {
  const [logs, setLogs] = useState([]);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("MALPRACTICE");
  const [search, setSearch] = useState("");

  useEffect(() => {
    Promise.all([
      Client.get("/admin/malpractice/logs"),
      Client.get("/admin/malpractice/history")
    ])
      .then(([logRes, actionRes]) => {
        setLogs(logRes.data || []);
        setActions(actionRes.data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load history", err);
        setLoading(false);
      });
  }, []);

  const filteredLogs = logs.filter((l) => {
    const term = search.toLowerCase();
    return (
      (l.session?.student?.name && l.session.student.name.toLowerCase().includes(term)) ||
      (l.session?.exam?.title && l.session.exam.title.toLowerCase().includes(term)) ||
      (l.eventType && l.eventType.toLowerCase().includes(term))
    );
  });

  const filteredActions = actions.filter((a) => {
    const term = search.toLowerCase();
    return (
      (a.admin?.name && a.admin.name.toLowerCase().includes(term)) ||
      (a.session?.student?.name && a.session.student.name.toLowerCase().includes(term)) ||
      (a.session?.exam?.title && a.session.exam.title.toLowerCase().includes(term)) ||
      (a.action && a.action.toLowerCase().includes(term))
    );
  });

  return (
    <AppShell
      title="Malpractice & Audit Log History"
      subtitle="Examine timestamped candidate security infractions alongside historical coordinator intervention actions."
      activeNav="/admin/malpractice"
    >
      <div className="admin-container">
        {/* KPI Audit Strip */}
        <div className="monitor-summary-grid">
          <div className="monitor-stat danger">
            <span>Recorded Infractions</span>
            <strong>{logs.length}</strong>
            <small>Student malpractice events</small>
          </div>
          <div className="monitor-stat">
            <span>Coordinator Interventions</span>
            <strong style={{ color: "var(--primary-light)" }}>{actions.length}</strong>
            <small>Warnings, waiting toggles & terminates</small>
          </div>
          <div className="monitor-stat">
            <span>Total Audit Trail</span>
            <strong>{logs.length + actions.length}</strong>
            <small>Immutable security events</small>
          </div>
        </div>

        {/* Filter and View Toggle */}
        <div className="card" style={{ padding: "18px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
            <div style={{ maxWidth: 360, width: "100%" }}>
              <input
                placeholder="Filter by student, exam, or event..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="toggle-bar">
              <label>
                <input
                  type="radio"
                  name="view"
                  value="MALPRACTICE"
                  checked={view === "MALPRACTICE"}
                  onChange={() => setView("MALPRACTICE")}
                />
                ⚠️ Student Malpractice ({logs.length})
              </label>

              <label>
                <input
                  type="radio"
                  name="view"
                  value="ACTIONS"
                  checked={view === "ACTIONS"}
                  onChange={() => setView("ACTIONS")}
                />
                🛡️ Coordinator Interventions ({actions.length})
              </label>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="card" style={{ padding: 40, textAlign: "center" }}>
            <div className="hero-badge">Loading Audit Records</div>
            <div className="skeleton-card" />
            <div className="skeleton-card" />
          </div>
        ) : view === "MALPRACTICE" ? (
          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Candidate</th>
                  <th>Assessment</th>
                  <th>Infraction Type</th>
                  <th>Severity</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center", padding: 36, color: "var(--text-muted)" }}>
                      No student malpractice events found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((l) => (
                    <tr key={l.id}>
                      <td>
                        <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                          {new Date(l.timestamp).toLocaleString([], { dateStyle: "short", timeStyle: "medium" })}
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: "var(--text-primary)" }}>{l.session?.student?.name || "Student"}</strong>
                      </td>
                      <td>{l.session?.exam?.title || "Exam"}</td>
                      <td>
                        <span className="status-chip status-warn">
                          {l.eventType ? l.eventType.replaceAll("_", " ") : "VIOLATION"}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`status-chip ${
                            l.severity === "HIGH" || l.severity === "CRITICAL"
                              ? "fail"
                              : l.severity === "MEDIUM"
                              ? "status-warn"
                              : "status-ok"
                          }`}
                        >
                          {l.severity || "NORMAL"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Staff / Admin</th>
                  <th>Target Candidate</th>
                  <th>Assessment</th>
                  <th>Action Triggered</th>
                  <th>Coordinator Remark</th>
                </tr>
              </thead>
              <tbody>
                {filteredActions.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: "center", padding: 36, color: "var(--text-muted)" }}>
                      No coordinator actions recorded matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredActions.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                          {new Date(a.timestamp).toLocaleString([], { dateStyle: "short", timeStyle: "medium" })}
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: "var(--text-primary)" }}>{a.admin?.name || "Staff"}</strong>
                      </td>
                      <td>{a.session?.student?.name || "Candidate"}</td>
                      <td>{a.session?.exam?.title || "Exam"}</td>
                      <td>
                        <span
                          className={`status-chip ${
                            a.action === "TERMINATE"
                              ? "fail"
                              : a.action === "WARN"
                              ? "status-warn"
                              : "approved"
                          }`}
                        >
                          {a.action}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: "0.85rem", color: a.remark ? "var(--text-secondary)" : "var(--text-dim)" }}>
                          {a.remark || "—"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}

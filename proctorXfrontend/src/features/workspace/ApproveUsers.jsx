import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import Client, { formatApiError } from "../../shared/api/Client";
import AppShell from "../../shared/components/AppShell";
import "../../App.css";

export default function ApproveUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL"); // ALL, PENDING, COORDINATOR, STUDENT, APPROVED

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      setLoading(true);
      setError("");
      const res = await Client.get("/admin/users");
      setUsers(res.data || []);
    } catch (err) {
      setError(formatApiError(err) || "Failed to fetch registered user list.");
    } finally {
      setLoading(false);
    }
  }

  async function approveUser(id) {
    try {
      await Client.put(`/admin/approve/${id}`);
      setUsers((prev) =>
        prev.map((user) =>
          user.id === id ? { ...user, approved: true } : user
        )
      );
    } catch (err) {
      alert(formatApiError(err) || "Approval operation failed.");
    }
  }

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = search.toLowerCase();
      const matchSearch =
        !search ||
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.role && u.role.toLowerCase().includes(q)) ||
        (u.institution && u.institution.toLowerCase().includes(q)) ||
        (u.department && u.department.toLowerCase().includes(q)) ||
        (u.username && u.username.toLowerCase().includes(q));

      if (filter === "PENDING") return matchSearch && !u.approved;
      if (filter === "APPROVED") return matchSearch && u.approved;
      if (filter === "COORDINATOR") return matchSearch && u.role === "COORDINATOR";
      if (filter === "STUDENT") return matchSearch && u.role === "STUDENT";
      return matchSearch;
    });
  }, [users, search, filter]);

  const pendingCount = users.filter((u) => !u.approved).length;
  const coordinatorCount = users.filter((u) => u.role === "COORDINATOR").length;
  const studentCount = users.filter((u) => u.role === "STUDENT").length;

  return (
    <AppShell
      title="User Verification & Approvals"
      subtitle="Review pending coordinator and student registrations, verify institutional affiliations, and grant platform access."
      activeNav="/admin/approve"
    >
      <div className="admin-container">
        {/* Top KPI Banner */}
        <div className="monitor-summary-grid">
          <div className="monitor-stat">
            <span>Total Registered</span>
            <strong>{users.length}</strong>
            <small>{studentCount} Students · {coordinatorCount} Coordinators</small>
          </div>
          <div className="monitor-stat danger">
            <span>Pending Review</span>
            <strong>{pendingCount}</strong>
            <small>Accounts awaiting verification</small>
          </div>
          <div className="monitor-stat">
            <span>Approved Accounts</span>
            <strong>{users.filter((u) => u.approved).length}</strong>
            <small>Active verified platform users</small>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="card" style={{ padding: "18px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
            <div style={{ maxWidth: 380, width: "100%" }}>
              <input
                placeholder="Search by name, email, institution, or @username..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="toggle-bar">
              <label>
                <input
                  type="radio"
                  name="userFilter"
                  value="ALL"
                  checked={filter === "ALL"}
                  onChange={() => setFilter("ALL")}
                />
                All ({users.length})
              </label>
              <label>
                <input
                  type="radio"
                  name="userFilter"
                  value="PENDING"
                  checked={filter === "PENDING"}
                  onChange={() => setFilter("PENDING")}
                />
                Pending ({pendingCount})
              </label>
              <label>
                <input
                  type="radio"
                  name="userFilter"
                  value="COORDINATOR"
                  checked={filter === "COORDINATOR"}
                  onChange={() => setFilter("COORDINATOR")}
                />
                Coordinators ({coordinatorCount})
              </label>
              <label>
                <input
                  type="radio"
                  name="userFilter"
                  value="STUDENT"
                  checked={filter === "STUDENT"}
                  onChange={() => setFilter("STUDENT")}
                />
                Students ({studentCount})
              </label>
              <label>
                <input
                  type="radio"
                  name="userFilter"
                  value="APPROVED"
                  checked={filter === "APPROVED"}
                  onChange={() => setFilter("APPROVED")}
                />
                Approved ({users.length - pendingCount})
              </label>
            </div>
          </div>
        </div>

        {error && <div className="error">{error}</div>}

        {loading ? (
          <div className="card" style={{ textAlign: "center", padding: 48 }}>
            <div className="hero-badge">Loading Users</div>
            <div className="skeleton-card" />
            <div className="skeleton-card" />
          </div>
        ) : (
          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th>User & Handle</th>
                  <th>Role</th>
                  <th>Institution & Dept</th>
                  <th>Designation / Year</th>
                  <th>Status</th>
                  <th>Portfolio</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: "center", padding: 36, color: "var(--text-muted)" }}>
                      No registered users found matching your filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: "var(--radius-full)",
                              background: "linear-gradient(135deg, var(--primary), var(--cyan))",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "0.85rem",
                              fontWeight: 700,
                              color: "#FFF",
                              flexShrink: 0
                            }}
                          >
                            {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                          </div>
                          <div>
                            <strong style={{ color: "var(--text-primary)", display: "block" }}>{user.name}</strong>
                            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span
                          className="status-chip"
                          style={{
                            fontSize: "0.72rem",
                            color: user.role === "COORDINATOR" ? "#818CF8" : "#06B6D4"
                          }}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td>
                        <div>
                          <strong style={{ fontSize: "0.82rem", color: "var(--text-primary)", display: "block" }}>
                            {user.institution || <span style={{ color: "var(--text-muted)" }}>Not specified</span>}
                          </strong>
                          <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                            {user.department || "-"}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                          {user.designation || "-"}
                        </span>
                      </td>
                      <td>
                        <span className={`status-chip ${user.approved ? "approved" : "pending"}`}>
                          {user.approved ? "Approved" : "Pending Review"}
                        </span>
                      </td>
                      <td>
                        {user.username ? (
                          <Link
                            to={`/u/${user.username}`}
                            target="_blank"
                            style={{
                              fontSize: "0.78rem",
                              color: "var(--cyan)",
                              fontFamily: "var(--font-mono)",
                              textDecoration: "underline"
                            }}
                          >
                            @{user.username} ↗
                          </Link>
                        ) : (
                          <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>-</span>
                        )}
                      </td>
                      <td>
                        {!user.approved ? (
                          <button
                            className="approve-btn"
                            onClick={() => approveUser(user.id)}
                            style={{ fontSize: "0.78rem", padding: "6px 14px" }}
                          >
                            Grant Approval
                          </button>
                        ) : (
                          <span style={{ fontSize: "0.75rem", color: "#34D399", fontWeight: 600 }}>✓ Verified</span>
                        )}
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

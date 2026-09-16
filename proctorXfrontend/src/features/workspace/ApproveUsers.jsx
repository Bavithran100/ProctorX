import { useEffect, useState, useMemo } from "react";
import Client from "../../shared/api/Client";
import AppShell from "../../shared/components/AppShell";
import "../../App.css";

export default function ApproveUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL"); // ALL, PENDING, APPROVED

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      setLoading(true);
      const res = await Client.get("/admin/users");
      setUsers(res.data || []);
    } catch {
      setError("Failed to fetch registered user list.");
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
    } catch {
      alert("Approval operation failed. Please check permissions.");
    }
  }

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        (u.name && u.name.toLowerCase().includes(search.toLowerCase())) ||
        (u.email && u.email.toLowerCase().includes(search.toLowerCase())) ||
        (u.role && u.role.toLowerCase().includes(search.toLowerCase()));

      if (filter === "PENDING") return matchSearch && !u.approved;
      if (filter === "APPROVED") return matchSearch && u.approved;
      return matchSearch;
    });
  }, [users, search, filter]);

  const pendingCount = users.filter((u) => !u.approved).length;

  return (
    <AppShell
      title="Coordinator Access Management"
      subtitle="Review pending coordinator registrations and grant examination authoring privileges."
      activeNav="/admin/approve"
    >
      <div className="admin-container">
        {/* Top KPI Banner */}
        <div className="monitor-summary-grid">
          <div className="monitor-stat">
            <span>Total Users</span>
            <strong>{users.length}</strong>
            <small>Registered platform accounts</small>
          </div>
          <div className="monitor-stat danger">
            <span>Pending Review</span>
            <strong>{pendingCount}</strong>
            <small>Coordinators awaiting approval</small>
          </div>
          <div className="monitor-stat">
            <span>Approved Accounts</span>
            <strong>{users.filter((u) => u.approved).length}</strong>
            <small>Active platform coordinators</small>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="card" style={{ padding: "18px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
            <div style={{ maxWidth: 360, width: "100%" }}>
              <input
                placeholder="Search by name, email, or role..."
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
                  <th>User ID</th>
                  <th>Full Name</th>
                  <th>Email Address</th>
                  <th>Role</th>
                  <th>Auth Provider</th>
                  <th>Status</th>
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
                        <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                          #{user.id}
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: "var(--text-primary)" }}>{user.name}</strong>
                      </td>
                      <td>{user.email}</td>
                      <td>
                        <span className="status-chip" style={{ fontSize: "0.72rem" }}>
                          {user.role}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                          {user.provider || "LOCAL"}
                        </span>
                      </td>
                      <td>
                        <span className={`status-chip ${user.approved ? "approved" : "pending"}`}>
                          {user.approved ? "Approved" : "Pending Review"}
                        </span>
                      </td>
                      <td>
                        {!user.approved ? (
                          <button
                            className="approve-btn"
                            onClick={() => approveUser(user.id)}
                          >
                            Grant Approval
                          </button>
                        ) : (
                          <span style={{ fontSize: "0.75rem", color: "#34D399" }}>Active Access</span>
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

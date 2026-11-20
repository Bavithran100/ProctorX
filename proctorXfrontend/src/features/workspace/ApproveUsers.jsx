import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import Client, { formatApiError } from "../../shared/api/Client";
import AppShell from "../../shared/components/AppShell";
import "../../App.css";

export default function ApproveUsers() {
  const currentRole = useSelector((state) => state.auth.role);
  const organizationName = useSelector((state) => state.auth.organizationName) || "Campus Institution";
  const orgCode = useSelector((state) => state.auth.orgCode);

  // States
  const [users, setUsers] = useState([]);
  const [coordinatorStudents, setCoordinatorStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState(
    currentRole === "COORDINATOR" ? "MY_STUDENTS" : "COORDINATORS"
  ); // COORDINATORS, STUDENTS, MY_STUDENTS, ALL

  useEffect(() => {
    if (currentRole === "COORDINATOR") {
      fetchCoordinatorStudents();
    } else {
      fetchUsers();
    }
  }, [currentRole]);

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

  async function fetchCoordinatorStudents() {
    try {
      setLoading(true);
      setError("");
      const res = await Client.get("/coordinator/my-students");
      setCoordinatorStudents(res.data || []);
    } catch (err) {
      setError(formatApiError(err) || "Failed to fetch assigned students.");
    } finally {
      setLoading(false);
    }
  }

  // College Admin approves coordinator
  async function approveCoordinator(id) {
    try {
      setError("");
      setActionSuccess("");
      await Client.put(`/admin/approve-coordinator/${id}`);
      setActionSuccess("Coordinator successfully verified and granted institutional authoring access.");
      setUsers((prev) =>
        prev.map((u) =>
          u.id === id ? { ...u, collegeAdminApproved: true, approved: true } : u
        )
      );
    } catch (err) {
      setError(formatApiError(err) || "Coordinator approval failed.");
    }
  }

  // College Admin approves student (Stage 1)
  async function approveStudentCollege(id) {
    try {
      setError("");
      setActionSuccess("");
      await Client.put(`/admin/approve-student-college/${id}`);
      setActionSuccess("Student institutional affiliation verified (Stage 1 approved).");
      setUsers((prev) =>
        prev.map((u) =>
          u.id === id ? { ...u, collegeAdminApproved: true } : u
        )
      );
    } catch (err) {
      setError(formatApiError(err) || "Student institutional approval failed.");
    }
  }

  // Coordinator approves assigned student (Stage 2)
  async function approveStudentByCoordinator(id) {
    try {
      setError("");
      setActionSuccess("");
      await Client.put(`/coordinator/approve-student/${id}`);
      setActionSuccess("Student cleared by Faculty Coordinator! Full assessment access unlocked.");
      setCoordinatorStudents((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, coordinatorApproved: true, isFullyApproved: true } : s
        )
      );
    } catch (err) {
      setError(formatApiError(err) || "Faculty clearance operation failed.");
    }
  }

  // Generic admin fallback approval
  async function approveGenericUser(id) {
    try {
      setError("");
      setActionSuccess("");
      await Client.put(`/admin/approve/${id}`);
      setActionSuccess("User approved successfully.");
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, approved: true } : u))
      );
    } catch (err) {
      setError(formatApiError(err) || "Approval failed.");
    }
  }

  // Filtered lists
  const coordinatorsList = useMemo(() => {
    return users.filter((u) => u.role === "COORDINATOR");
  }, [users]);

  const studentsList = useMemo(() => {
    return users.filter((u) => u.role === "STUDENT");
  }, [users]);

  const filteredCoordinators = useMemo(() => {
    const q = search.toLowerCase();
    return coordinatorsList.filter(
      (c) =>
        !search ||
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.department && c.department.toLowerCase().includes(q))
    );
  }, [coordinatorsList, search]);

  const filteredStudents = useMemo(() => {
    const q = search.toLowerCase();
    return studentsList.filter(
      (s) =>
        !search ||
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q)) ||
        (s.department && s.department.toLowerCase().includes(q)) ||
        (s.username && s.username.toLowerCase().includes(q))
    );
  }, [studentsList, search]);

  const filteredCoordinatorStudents = useMemo(() => {
    const q = search.toLowerCase();
    return coordinatorStudents.filter(
      (s) =>
        !search ||
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q)) ||
        (s.department && s.department.toLowerCase().includes(q))
    );
  }, [coordinatorStudents, search]);

  return (
    <AppShell
      title={
        currentRole === "COORDINATOR"
          ? "Faculty Student Clearance Console"
          : "Institutional User Governance"
      }
      subtitle={
        currentRole === "COORDINATOR"
          ? "Review and grant faculty clearance to enrolled students assigned under your coordination."
          : `Manage faculty coordinators and student verification under ${organizationName} (${orgCode || "CAMPUS"}).`
      }
      activeNav="/admin/approve"
    >
      <div className="admin-container">
        {/* Super Admin Notice Banner */}
        {(currentRole === "SUPER_ADMIN" || currentRole === "ADMIN") && (
          <div
            className="card"
            style={{
              padding: "16px 20px",
              marginBottom: 20,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
              background: "rgba(239, 68, 68, 0.05)",
              border: "1px solid rgba(239, 68, 68, 0.25)"
            }}
          >
            <div>
              <strong style={{ color: "#F8FAFC" }}>Master Tenant Governance Available</strong>
              <div style={{ color: "var(--text-muted)", fontSize: "0.84rem" }}>
                Super Admins can monitor multi-tenant trees (Organization → Admin → Coordinators → Students), inspect seat quotas, lock institutions, or purge test data.
              </div>
            </div>
            <Link to="/admin/organizations" className="btn secondary" style={{ fontSize: "0.82rem", padding: "8px 16px" }}>
              Open Master Tenant Governance →
            </Link>
          </div>
        )}

        {/* College Admin Onboarding Banner if not active */}
        {currentRole === "COLLEGE_ADMIN" && (
          <div
            className="card"
            style={{
              padding: "16px 20px",
              marginBottom: 20,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.12)"
            }}
          >
            <div>
              <strong style={{ color: "#F8FAFC" }}>{organizationName} · Institutional Portal</strong>
              <div style={{ color: "var(--text-muted)", fontSize: "0.84rem" }}>
                Unique Organization Identifier: <span style={{ color: "var(--cyan)", fontFamily: "var(--font-mono)" }}>{orgCode || "N/A"}</span>. Share this with students and coordinators during registration.
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Link to="/institution/activation" className="btn secondary" style={{ fontSize: "0.82rem", padding: "8px 14px" }}>
                Plan & Quotas →
              </Link>
            </div>
          </div>
        )}

        {/* Feedback messages */}
        {actionSuccess && (
          <div
            style={{
              padding: "12px 18px",
              borderRadius: 8,
              background: "rgba(16, 185, 129, 0.1)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              color: "#10B981",
              marginBottom: 16,
              fontSize: "0.88rem"
            }}
          >
            ✓ {actionSuccess}
          </div>
        )}
        {error && <div className="error" style={{ marginBottom: 16 }}>{error}</div>}

        {/* COORDINATOR VIEW */}
        {currentRole === "COORDINATOR" ? (
          <div>
            {/* Top KPI Banner */}
            <div className="monitor-summary-grid">
              <div className="monitor-stat">
                <span>Assigned Students</span>
                <strong>{coordinatorStudents.length}</strong>
                <small>Candidates mapped to your faculty ID</small>
              </div>
              <div className="monitor-stat danger">
                <span>Pending Clearance</span>
                <strong>{coordinatorStudents.filter((s) => !s.coordinatorApproved).length}</strong>
                <small>Stage 2 approvals awaiting your clearance</small>
              </div>
              <div className="monitor-stat">
                <span>Fully Cleared</span>
                <strong>{coordinatorStudents.filter((s) => s.isFullyApproved).length}</strong>
                <small>Active in proctored examinations</small>
              </div>
            </div>

            {/* Search Bar */}
            <div className="card" style={{ padding: "16px 20px", marginBottom: 20 }}>
              <input
                placeholder="Search candidates by name, email, department..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: "100%", maxWidth: 400 }}
              />
            </div>

            {/* Coordinator Students Table */}
            {loading ? (
              <div className="card" style={{ textAlign: "center", padding: 48 }}>
                <div className="hero-badge">Loading Candidates</div>
                <div className="skeleton-card" />
              </div>
            ) : (
              <div className="table-shell">
                <table>
                  <thead>
                    <tr>
                      <th>Candidate & Email</th>
                      <th>Department / Year</th>
                      <th>Profile Status</th>
                      <th>Stage 1: College Dean</th>
                      <th>Stage 2: Faculty Clearance</th>
                      <th>Overall Access</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCoordinatorStudents.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ textAlign: "center", padding: 36, color: "var(--text-muted)" }}>
                          No students currently assigned under your coordination. Candidates choose their coordinator after college admin verification.
                        </td>
                      </tr>
                    ) : (
                      filteredCoordinatorStudents.map((s) => (
                        <tr key={s.id}>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: "50%",
                                  background: "linear-gradient(135deg, #4F46E5, #38BDF8)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "0.85rem",
                                  fontWeight: 700,
                                  color: "#FFF"
                                }}
                              >
                                {s.name ? s.name.charAt(0).toUpperCase() : "S"}
                              </div>
                              <div>
                                <strong style={{ color: "var(--text-primary)", display: "block" }}>{s.name}</strong>
                                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{s.email}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <strong style={{ fontSize: "0.82rem", color: "var(--text-primary)" }}>{s.department}</strong>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{s.designation}</div>
                          </td>
                          <td>
                            <span
                              className="status-chip"
                              style={{
                                fontSize: "0.72rem",
                                color: s.profileCompleted ? "#10B981" : "#EF4444",
                                borderColor: s.profileCompleted ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"
                              }}
                            >
                              {s.profileCompleted ? "✓ Profile Complete" : "⚠️ Incomplete"}
                            </span>
                          </td>
                          <td>
                            <span
                              className="status-chip"
                              style={{
                                fontSize: "0.72rem",
                                color: s.collegeAdminApproved ? "#10B981" : "#F59E0B",
                                borderColor: s.collegeAdminApproved ? "rgba(16, 185, 129, 0.3)" : "rgba(245, 158, 11, 0.3)"
                              }}
                            >
                              {s.collegeAdminApproved ? "✓ Verified by Dean" : "⏳ Pending Dean"}
                            </span>
                          </td>
                          <td>
                            <span
                              className="status-chip"
                              style={{
                                fontSize: "0.72rem",
                                color: s.coordinatorApproved ? "#10B981" : "#818CF8",
                                borderColor: s.coordinatorApproved ? "rgba(16, 185, 129, 0.3)" : "rgba(129, 140, 248, 0.3)"
                              }}
                            >
                              {s.coordinatorApproved ? "✓ Cleared by You" : "⏳ Needs Clearance"}
                            </span>
                          </td>
                          <td>
                            <span
                              className="status-chip"
                              style={{
                                fontSize: "0.72rem",
                                color: s.isFullyApproved ? "#10B981" : "#EF4444",
                                borderColor: s.isFullyApproved ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"
                              }}
                            >
                              {s.isFullyApproved ? "Active Member" : "Locked"}
                            </span>
                          </td>
                          <td>
                            {!s.profileCompleted ? (
                              <span style={{ fontSize: "0.74rem", color: "#EF4444" }}>⚠️ Incomplete Profile</span>
                            ) : !s.collegeAdminApproved ? (
                              <span style={{ fontSize: "0.74rem", color: "#F59E0B" }}>⏳ Needs Dean First</span>
                            ) : !s.coordinatorApproved ? (
                              <button
                                className="approve-btn"
                                onClick={() => approveStudentByCoordinator(s.id)}
                                style={{ fontSize: "0.78rem", padding: "6px 14px" }}
                              >
                                Grant Faculty Clearance
                              </button>
                            ) : (
                              <span style={{ fontSize: "0.75rem", color: "#34D399", fontWeight: 600 }}>✓ Cleared</span>
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
        ) : (
          /* COLLEGE ADMIN & SUPER ADMIN VIEW */
          <div>
            {/* Top KPI Banner */}
            <div className="monitor-summary-grid">
              <div className="monitor-stat">
                <span>Total Institution Users</span>
                <strong>{users.length}</strong>
                <small>{coordinatorsList.length} Coordinators · {studentsList.length} Students</small>
              </div>
              <div className="monitor-stat danger">
                <span>Pending Approvals</span>
                <strong>{users.filter((u) => !u.approved && !u.collegeAdminApproved).length}</strong>
                <small>Institutional verification pending</small>
              </div>
              <div className="monitor-stat">
                <span>Approved Faculty</span>
                <strong>{coordinatorsList.filter((c) => c.approved || c.collegeAdminApproved).length}</strong>
                <small>Active exam creators & proctors</small>
              </div>
            </div>

            {/* Tab Navigation & Search */}
            <div className="card" style={{ padding: "18px 24px", marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
                <div style={{ maxWidth: 360, width: "100%" }}>
                  <input
                    placeholder="Search by name, email, department..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                <div className="toggle-bar">
                  <label>
                    <input
                      type="radio"
                      name="adminTab"
                      value="COORDINATORS"
                      checked={activeTab === "COORDINATORS"}
                      onChange={() => setActiveTab("COORDINATORS")}
                    />
                    Faculty Coordinators ({coordinatorsList.length})
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="adminTab"
                      value="STUDENTS"
                      checked={activeTab === "STUDENTS"}
                      onChange={() => setActiveTab("STUDENTS")}
                    />
                    Enrolled Students ({studentsList.length})
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="adminTab"
                      value="ALL"
                      checked={activeTab === "ALL"}
                      onChange={() => setActiveTab("ALL")}
                    />
                    All Users ({users.length})
                  </label>
                </div>
              </div>
            </div>

            {/* TAB CONTENT */}
            {loading ? (
              <div className="card" style={{ textAlign: "center", padding: 48 }}>
                <div className="hero-badge">Loading Users</div>
                <div className="skeleton-card" />
              </div>
            ) : activeTab === "COORDINATORS" ? (
              /* COORDINATORS TAB */
              <div className="table-shell">
                <table>
                  <thead>
                    <tr>
                      <th>Coordinator & Email</th>
                      <th>Department & Title</th>
                      <th>Profile Status</th>
                      <th>Organization ID</th>
                      <th>Verification</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCoordinators.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: "center", padding: 36, color: "var(--text-muted)" }}>
                          No coordinator registrations found matching criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredCoordinators.map((c) => {
                        const isApproved = c.approved || c.collegeAdminApproved;
                        return (
                          <tr key={c.id}>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <div
                                  style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: "50%",
                                    background: "linear-gradient(135deg, #6366F1, #818CF8)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "0.85rem",
                                    fontWeight: 700,
                                    color: "#FFF"
                                  }}
                                >
                                  {c.name ? c.name.charAt(0).toUpperCase() : "C"}
                                </div>
                                <div>
                                  <strong style={{ color: "var(--text-primary)", display: "block" }}>{c.name}</strong>
                                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{c.email}</div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <strong style={{ fontSize: "0.82rem", color: "var(--text-primary)" }}>{c.department || "Faculty"}</strong>
                              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{c.designation || "-"}</div>
                            </td>
                            <td>
                              <span
                                className="status-chip"
                                style={{
                                  fontSize: "0.72rem",
                                  color: c.profileCompleted ? "#10B981" : "#EF4444",
                                  borderColor: c.profileCompleted ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"
                                }}
                              >
                                {c.profileCompleted ? "✓ Complete" : "⚠️ Incomplete"}
                              </span>
                            </td>
                            <td>
                              <span style={{ fontSize: "0.78rem", color: "var(--cyan)", fontFamily: "var(--font-mono)" }}>
                                {c.orgCode || orgCode || "CAMPUS"}
                              </span>
                            </td>
                            <td>
                              <span className={`status-chip ${isApproved ? "approved" : "pending"}`}>
                                {isApproved ? "Verified Coordinator" : "Awaiting Verification"}
                              </span>
                            </td>
                            <td>
                              {!c.profileCompleted ? (
                                <span style={{ fontSize: "0.74rem", color: "#EF4444" }}>⚠️ Incomplete Profile</span>
                              ) : !isApproved ? (
                                <button
                                  className="approve-btn"
                                  onClick={() => approveCoordinator(c.id)}
                                  style={{ fontSize: "0.78rem", padding: "6px 14px" }}
                                >
                                  Verify Faculty
                                </button>
                              ) : (
                                <span style={{ fontSize: "0.75rem", color: "#34D399", fontWeight: 600 }}>✓ Verified</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            ) : activeTab === "STUDENTS" ? (
              /* STUDENTS TAB */
              <div className="table-shell">
                <table>
                  <thead>
                    <tr>
                      <th>Candidate & Email</th>
                      <th>Department & Roll</th>
                      <th>Profile Status</th>
                      <th>Stage 1: College Admin</th>
                      <th>Stage 2: Faculty Clearance</th>
                      <th>Overall Access</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ textAlign: "center", padding: 36, color: "var(--text-muted)" }}>
                          No student registrations found matching criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((s) => {
                        const isStage1Approved = Boolean(s.collegeAdminApproved || s.approved);
                        const isStage2Approved = Boolean(s.coordinatorApproved);
                        const isFullyUnlocked = isStage1Approved && isStage2Approved;
                        return (
                          <tr key={s.id}>
                            <td>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <div
                                  style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: "50%",
                                    background: "linear-gradient(135deg, #10B981, #06B6D4)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "0.85rem",
                                    fontWeight: 700,
                                    color: "#FFF"
                                  }}
                                >
                                  {s.name ? s.name.charAt(0).toUpperCase() : "S"}
                                </div>
                                <div>
                                  <strong style={{ color: "var(--text-primary)", display: "block" }}>{s.name}</strong>
                                  <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{s.email}</div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <strong style={{ fontSize: "0.82rem", color: "var(--text-primary)" }}>{s.department || "-"}</strong>
                              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{s.designation || "-"}</div>
                            </td>
                            <td>
                              <span
                                className="status-chip"
                                style={{
                                  fontSize: "0.72rem",
                                  color: s.profileCompleted ? "#10B981" : "#EF4444",
                                  borderColor: s.profileCompleted ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"
                                }}
                              >
                                {s.profileCompleted ? "✓ Complete" : "⚠️ Incomplete"}
                              </span>
                            </td>
                            <td>
                              <span
                                className="status-chip"
                                style={{
                                  fontSize: "0.72rem",
                                  color: isStage1Approved ? "#10B981" : "#F59E0B",
                                  borderColor: isStage1Approved ? "rgba(16, 185, 129, 0.3)" : "rgba(245, 158, 11, 0.3)"
                                }}
                              >
                                {isStage1Approved ? "✓ Verified by Dean" : "⏳ Pending Verification"}
                              </span>
                            </td>
                            <td>
                              <span
                                className="status-chip"
                                style={{
                                  fontSize: "0.72rem",
                                  color: isStage2Approved ? "#10B981" : "#818CF8",
                                  borderColor: isStage2Approved ? "rgba(16, 185, 129, 0.3)" : "rgba(129, 140, 248, 0.3)"
                                }}
                              >
                                {isStage2Approved ? "✓ Faculty Cleared" : (s.coordinatorId ? "⏳ Coordinator Review" : "⚠️ Needs Faculty Pick")}
                              </span>
                            </td>
                            <td>
                              <span
                                className="status-chip"
                                style={{
                                  fontSize: "0.72rem",
                                  color: isFullyUnlocked ? "#10B981" : "#EF4444",
                                  borderColor: isFullyUnlocked ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"
                                }}
                              >
                                {isFullyUnlocked ? "Active Member" : "Locked"}
                              </span>
                            </td>
                            <td>
                              {!s.profileCompleted ? (
                                <span style={{ fontSize: "0.74rem", color: "#EF4444" }}>⚠️ Incomplete Profile</span>
                              ) : !isStage1Approved ? (
                                <button
                                  className="approve-btn"
                                  onClick={() => approveStudentCollege(s.id)}
                                  style={{ fontSize: "0.78rem", padding: "6px 14px" }}
                                >
                                  Grant College Approval
                                </button>
                              ) : (
                                <span style={{ fontSize: "0.75rem", color: "#34D399", fontWeight: 600 }}>✓ Verified</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              /* ALL USERS TAB */
              <div className="table-shell">
                <table>
                  <thead>
                    <tr>
                      <th>User & Email</th>
                      <th>Role</th>
                      <th>Department</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td>
                          <strong style={{ color: "var(--text-primary)" }}>{u.name}</strong>
                          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{u.email}</div>
                        </td>
                        <td>
                          <span className="status-chip" style={{ fontSize: "0.72rem" }}>{u.role}</span>
                        </td>
                        <td>{u.department || "-"}</td>
                        <td>
                          <span className={`status-chip ${u.approved ? "approved" : "pending"}`}>
                            {u.approved ? "Approved" : "Pending"}
                          </span>
                        </td>
                        <td>
                          {!u.approved ? (
                            <button
                              className="approve-btn"
                              onClick={() => approveGenericUser(u.id)}
                              style={{ fontSize: "0.78rem", padding: "6px 14px" }}
                            >
                              Approve
                            </button>
                          ) : (
                            <span style={{ fontSize: "0.75rem", color: "#34D399", fontWeight: 600 }}>✓ Approved</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

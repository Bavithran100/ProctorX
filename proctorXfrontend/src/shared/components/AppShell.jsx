import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { logout } from "../state/AuthSlice";
import Client from "../api/Client";
import Logo from "./Logo";

export default function AppShell({ children, title, subtitle, activeNav }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, role } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  async function handleLogout() {
    try {
      await Client.post("/auth/logout");
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      localStorage.clear();
      sessionStorage.clear();
      dispatch(logout());
      navigate("/login", { replace: true });
    }
  }

  // Define navigation items strictly based on role and existing routes
  const getNavItems = () => {
    if (role === "STUDENT") {
      return [
        { label: "Dashboard", path: "/dashboard", icon: "dashboard" },
        { label: "Live & Past Exams", path: "/exams/today", icon: "calendar_today", badge: "Live" },
        { label: "Upcoming Schedule", path: "/exams/upcoming", icon: "event" },
        { label: "Exam Results", path: "/results", icon: "analytics" },
        { label: "Rules & Guidelines", path: "/rules", icon: "description" },
        { label: "My Profile", path: "/profile", icon: "profile" }
      ];
    }
    if (role === "COORDINATOR") {
      return [
        { label: "Dashboard", path: "/dashboard", icon: "dashboard" },
        { label: "Create Exam", path: "/admin/create-exam", icon: "add_circle" },
        { label: "Live Control Room", path: "/admin/monitor", icon: "radar", badge: "Live" },
        { label: "Exam History & Submissions", path: "/admin/exam-history", icon: "analytics" },
        { label: "Malpractice Audit", path: "/admin/malpractice", icon: "shield_alert" },
        { label: "Compiler Settings", path: "/admin/compiler-settings", icon: "analytics" },
        { label: "My Profile", path: "/profile", icon: "profile" }
      ];
    }
    if (role === "ADMIN") {
      return [
        { label: "Dashboard", path: "/dashboard", icon: "dashboard" },
        { label: "User Approvals", path: "/admin/approve", icon: "how_to_reg" },
        { label: "Compiler Settings", path: "/admin/compiler-settings", icon: "analytics" },
        { label: "Create Exam", path: "/admin/create-exam", icon: "add_circle" },
        { label: "Live Control Room", path: "/admin/monitor", icon: "radar", badge: "Live" },
        { label: "Exam History & Submissions", path: "/admin/exam-history", icon: "analytics" },
        { label: "Malpractice Audit", path: "/admin/malpractice", icon: "shield_alert" },
        { label: "My Profile", path: "/profile", icon: "profile" }
      ];
    }
    return [
      { label: "Dashboard", path: "/dashboard", icon: "dashboard" },
      { label: "My Profile", path: "/profile", icon: "profile" }
    ];
  };

  const navItems = getNavItems();

  const getRoleBadgeStyle = () => {
    switch (role) {
      case "ADMIN":
        return { label: "Admin", color: "#F43F5E", bg: "rgba(244, 63, 94, 0.12)", border: "rgba(244, 63, 94, 0.25)" };
      case "COORDINATOR":
        return { label: "Coordinator", color: "#818CF8", bg: "rgba(129, 140, 248, 0.12)", border: "rgba(129, 140, 248, 0.25)" };
      default:
        return { label: "Student", color: "#06B6D4", bg: "rgba(6, 182, 212, 0.12)", border: "rgba(6, 182, 212, 0.25)" };
    }
  };

  const roleMeta = getRoleBadgeStyle();

  // Helper icons as clean SVGs
  const renderIcon = (type) => {
    switch (type) {
      case "dashboard":
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="9" rx="1" />
            <rect x="14" y="3" width="7" height="5" rx="1" />
            <rect x="14" y="12" width="7" height="9" rx="1" />
            <rect x="3" y="16" width="7" height="5" rx="1" />
          </svg>
        );
      case "calendar_today":
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
            <circle cx="12" cy="15" r="2" fill="currentColor" />
          </svg>
        );
      case "event":
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        );
      case "analytics":
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
        );
      case "description":
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        );
      case "add_circle":
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
        );
      case "radar":
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2a10 10 0 0 1 10 10" />
            <path d="M12 6a6 6 0 0 1 6 6" />
            <line x1="12" y1="12" x2="16" y2="8" />
          </svg>
        );
      case "shield_alert":
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        );
      case "how_to_reg":
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <polyline points="17 11 19 13 23 9" />
          </svg>
        );
      case "profile":
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        );
      default:
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
          </svg>
        );
    }
  };

  return (
    <div className="proctorx-app-shell">
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div className="proctorx-drawer-backdrop" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar Navigation */}
      <aside className={`proctorx-sidebar ${collapsed ? "collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`}>
        {/* Brand Header */}
        <div className="sidebar-brand-header">
          <Link to="/dashboard" className="sidebar-brand-link">
            <Logo size={collapsed ? "sm" : "md"} showText={!collapsed} />
          </Link>
          <button
            className="sidebar-collapse-toggle desktop-only"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label="Toggle sidebar"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              {collapsed ? <polyline points="9 18 15 12 9 6" /> : <polyline points="15 18 9 12 15 6" />}
            </svg>
          </button>
        </div>

        {/* Role Pill */}
        {!collapsed && (
          <div className="sidebar-role-indicator">
            <span
              className="role-chip"
              style={{
                color: roleMeta.color,
                backgroundColor: roleMeta.bg,
                borderColor: roleMeta.border
              }}
            >
              <span className="role-dot" style={{ backgroundColor: roleMeta.color }} />
              {roleMeta.label} Workspace
            </span>
          </div>
        )}

        {/* Nav Links */}
        <nav className="sidebar-nav">
          <div className="sidebar-nav-section-label">{!collapsed && "NAVIGATION"}</div>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (activeNav && activeNav === item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`sidebar-nav-item ${isActive ? "active" : ""}`}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? item.label : undefined}
              >
                <span className="nav-item-icon">{renderIcon(item.icon)}</span>
                {!collapsed && <span className="nav-item-label">{item.label}</span>}
                {!collapsed && item.badge && <span className="nav-item-badge">{item.badge}</span>}
                {isActive && <span className="nav-active-pill" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer User Info & Logout */}
        <div className="sidebar-footer">
          <div className="sidebar-user-card">
            <div className="user-avatar-circle">
              {user ? user.charAt(0).toUpperCase() : "U"}
            </div>
            {!collapsed && (
              <div className="user-text-info">
                <span className="user-name" title={user}>{user || "User"}</span>
                <span className="user-role-label">{role}</span>
              </div>
            )}
            <button
              className="sidebar-logout-btn"
              onClick={handleLogout}
              title="Sign Out"
              aria-label="Logout"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="proctorx-main-wrapper">
        {/* Contextual Top Header */}
        <header className="proctorx-topbar">
          <div className="topbar-left">
            <button
              className="mobile-nav-toggle mobile-only"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div className="topbar-context">
              <h1 className="topbar-title">{title || "Workspace"}</h1>
              {subtitle && <p className="topbar-subtitle">{subtitle}</p>}
            </div>
          </div>

          <div className="topbar-right">
            {/* System / Proctoring Health Indicator */}
            <div className="system-telemetry-badge" title="AI Proctoring Engine Online">
              <span className="telemetry-pulse-dot" />
              <span className="telemetry-text">Proctor Engine Active</span>
            </div>

            {/* Quick User Pill */}
            <div className="topbar-user-pill">
              <div className="user-avatar-small">
                {user ? user.charAt(0).toUpperCase() : "U"}
              </div>
              <span className="user-email-text">{user}</span>
            </div>
          </div>
        </header>

        {/* Page Content Viewport */}
        <main className="proctorx-content-viewport">
          {children}
        </main>
      </div>
    </div>
  );
}

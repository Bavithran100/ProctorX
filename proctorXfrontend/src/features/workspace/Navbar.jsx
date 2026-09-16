import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logout } from "../../shared/state/AuthSlice";
import Client from "../../shared/api/Client";
import Logo from "../../shared/components/Logo";
import "../../App.css";

export default function Navbar() {
  const { user, role, isAuthenticated } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

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

  if (!isAuthenticated) return null;

  return (
    <nav className="proctorx-topbar" style={{ position: "relative", borderRadius: "var(--radius-lg)", margin: "0 0 24px 0" }}>
      <div className="topbar-left">
        <Logo size="sm" />
      </div>

      <div className="topbar-right">
        <div className="topbar-user-pill">
          <div className="user-avatar-small">
            {user ? user.charAt(0).toUpperCase() : "U"}
          </div>
          <span className="user-email-text">{user}</span>
          <span className="status-chip" style={{ fontSize: "0.68rem", textTransform: "uppercase" }}>{role}</span>
        </div>

        <button
          className="ghost-btn"
          style={{ padding: "6px 12px", fontSize: "0.8rem" }}
          onClick={handleLogout}
        >
          Logout
        </button>
      </div>
    </nav>
  );
}

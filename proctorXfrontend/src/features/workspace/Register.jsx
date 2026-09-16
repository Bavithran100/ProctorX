import { useReducer, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Client from "../../shared/api/Client";
import Logo from "../../shared/components/Logo";
import "../../App.css";

export default function Register() {
  const [state, dispatchForm] = useReducer(
    (state, action) => ({ ...state, [action.name]: action.value }),
    {
      name: "",
      email: "",
      password: "",
      confirmPassword: ""
    }
  );

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  function handleChange(e) {
    dispatchForm({ name: e.target.name, value: e.target.value });
  }

  async function handleRegister(e) {
    if (e) e.preventDefault();
    setError("");

    if (!state.name || !state.email || !state.password) {
      return setError("Please fill in all required fields");
    }

    if (state.password.length < 6) {
      return setError("Password must be at least 6 characters long");
    }

    if (state.password !== state.confirmPassword) {
      return setError("Passwords do not match");
    }

    try {
      setLoading(true);

      await Client.post("/Register", {
        name: state.name,
        email: state.email,
        password: state.password
      });

      navigate("/login");
    } catch (err) {
      setError(
        err?.response?.data?.message || err?.response?.data || "Registration failed. Please verify your details."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="auth-shell">
        {/* Left Information Showcase */}
        <div className="auth-side-panel">
          <div>
            <Link to="/" style={{ display: "inline-block", marginBottom: 20 }}>
              <Logo size="lg" />
            </Link>
            <div className="hero-badge">
              <span className="badge-dot" /> Coordinator Onboarding
            </div>
            <h1 style={{ margin: "12px 0", fontSize: "clamp(2rem, 3.5vw, 3rem)" }}>
              Create an examination coordinator account
            </h1>
            <p className="subtitle">
              Coordinators can create and publish exams, generate AI questions, and supervise live candidate sessions with real-time controls.
            </p>
          </div>

          <div className="feature-list">
            <div className="feature-item">
              <strong>Admin Approval Required</strong>
              New coordinator registrations are securely placed in the administrative review queue.
            </div>
            <div className="feature-item">
              <strong>Question Authoring Suite</strong>
              Compose MCQ and programming tests manually or generate comprehensive blueprints using AI.
            </div>
            <div className="feature-item">
              <strong>Live Control Room</strong>
              Supervise active sessions with real-time heartbeat tracking, warnings, and termination controls.
            </div>
          </div>
        </div>

        {/* Right Form Card */}
        <div className="card auth-card">
          <div style={{ marginBottom: 20 }}>
            <h2>Coordinator Sign Up</h2>
            <p className="subtitle">Submit your access request</p>
          </div>

          {error && <div className="error">{error}</div>}

          <form onSubmit={handleRegister}>
            <div className="field-group">
              <div className="field-stack">
                <label>Full Name</label>
                <input
                  name="name"
                  placeholder="Dr. Alexander Vance"
                  value={state.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="field-stack">
                <label>Academic / Institutional Email</label>
                <input
                  name="email"
                  type="email"
                  placeholder="a.vance@university.edu"
                  value={state.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="field-stack">
                <label>Password (min. 6 characters)</label>
                <input
                  name="password"
                  type="password"
                  placeholder="••••••••••••"
                  value={state.password}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="field-stack">
                <label>Confirm Password</label>
                <input
                  name="confirmPassword"
                  type="password"
                  placeholder="••••••••••••"
                  value={state.confirmPassword}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn full"
              disabled={loading}
            >
              {loading ? "Submitting Registration..." : "Request Coordinator Access"}
            </button>
          </form>

          <div className="switch">
            Already have an account?{" "}
            <span onClick={() => navigate("/login")}>
              Sign In
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

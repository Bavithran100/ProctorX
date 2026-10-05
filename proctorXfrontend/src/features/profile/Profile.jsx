import React, { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import Client, { formatApiError } from "../../shared/api/Client";
import { updateUserProfile, loginSuccess } from "../../shared/state/AuthSlice";
import AppShell from "../../shared/components/AppShell";
import CompetencyRadar from "../adaptive/components/CompetencyRadar";
import useFaceVerifier from "../proctoring/useFaceVerifier";
import "../../App.css";

export default function Profile() {
  const auth = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const { extractEmbeddingFromElement, loading: faceLoading } = useFaceVerifier();

  const [formData, setFormData] = useState({
    name: auth.name || "",
    username: auth.username || "",
    institution: auth.institution || "",
    department: auth.department || "",
    designation: auth.designation || "",
    bio: auth.bio || "",
    skills: auth.skills || ""
  });

  const [adaptiveData, setAdaptiveData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [photoProcessing, setPhotoProcessing] = useState(false);
  const [photoMessage, setPhotoMessage] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);

  // Sync latest user profile & biometrics on mount
  useEffect(() => {
    Client.get("/me")
      .then((res) => {
        if (res.data) {
          dispatch(loginSuccess({ ...res.data, user: res.data.email }));
        }
      })
      .catch(() => {});
  }, [dispatch]);

  // Webcam modal state
  const [showWebcamModal, setShowWebcamModal] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setFormData({
      name: auth.name || "",
      username: auth.username || "",
      institution: auth.institution || "",
      department: auth.department || "",
      designation: auth.designation || "",
      bio: auth.bio || "",
      skills: auth.skills || ""
    });

    // Fetch verified adaptive skill vector
    Client.get("/adaptive/profile")
      .then((res) => setAdaptiveData(res.data))
      .catch((err) => console.debug("Adaptive telemetry not ready:", err));
  }, [auth]);

  // Clean up stream if modal closes
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const calculateCompleteness = () => {
    const fields = [
      formData.name,
      formData.username,
      formData.institution,
      formData.department,
      formData.designation,
      formData.bio,
      formData.skills,
      auth.profileImageUrl ? "photo" : null,
      auth.faceEnrolled ? "face" : null
    ];
    const filled = fields.filter((f) => f && (typeof f === "string" ? f.trim().length > 0 : true)).length;
    return Math.round((filled / fields.length) * 100);
  };

  const completeness = calculateCompleteness();

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");

    if (!formData.name.trim()) {
      setErrorMsg("Full name is required.");
      return;
    }

    try {
      setLoading(true);
      const res = await Client.put("/profile", formData);

      dispatch(
        updateUserProfile({
          name: res.data.name,
          username: res.data.username,
          institution: res.data.institution,
          department: res.data.department,
          designation: res.data.designation,
          bio: res.data.bio,
          skills: res.data.skills,
          profileCompleted: res.data.profileCompleted,
          approved: res.data.approved,
          profileImageUrl: res.data.profileImageUrl,
          faceEnrolled: res.data.faceEnrolled,
          faceEmbedding: res.data.faceEmbedding
        })
      );

      setSuccessMsg("Profile updated successfully! Information synced with verification queue.");
    } catch (err) {
      setErrorMsg(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }

  // 1. Process and save face photo & biometric embedding
  async function processAndSaveFacePhoto(imageElement, dataUrl) {
    setPhotoProcessing(true);
    setPhotoMessage("⚡ Running YuNet Neural Face Detector & 5-point alignment...");
    setErrorMsg("");

    try {
      // Extract YuNet-aligned SFace 128-D embedding
      const res = await extractEmbeddingFromElement(imageElement);
      if (!res.embedding || res.embedding.length !== 128) {
        throw new Error("Could not extract biometric facial landmarks.");
      }

      setPhotoMessage("💾 Syncing biometric identity vector with secure cloud registry...");

      const apiRes = await Client.post("/profile/photo", {
        profileImageUrl: dataUrl,
        faceEmbedding: JSON.stringify(res.embedding)
      });

      dispatch(
        updateUserProfile({
          profileImageUrl: apiRes.data.profileImageUrl,
          faceEnrolled: apiRes.data.faceEnrolled,
          faceEmbedding: apiRes.data.faceEmbedding
        })
      );

      // Also cache in sessionStorage for instant pre-exam recognition
      if (typeof window !== "undefined") {
        sessionStorage.setItem("proctorx_user_face_ref", JSON.stringify(res.embedding));
      }

      setSuccessMsg("✓ Biometric Face ID & Profile Photo Enrolled Successfully! You are now eligible for AI-monitored exams.");
      setPhotoMessage("");
    } catch (err) {
      console.error("Photo enrollment error:", err);
      setErrorMsg(`Biometric Enrollment Failed: ${err.message || "Please upload a clear front-facing passport photo."}`);
      setPhotoMessage("");
    } finally {
      setPhotoProcessing(false);
    }
  }

  // 2. Handle File Upload
  function handleFileSelect(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      const img = new Image();
      img.onload = () => {
        processAndSaveFacePhoto(img, dataUrl);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  // 3. Load Sample Demo Photo (/default_student_photo.jpg)
  async function handleLoadDemoPhoto() {
    setPhotoProcessing(true);
    setPhotoMessage("Loading official candidate photo...");
    setErrorMsg("");

    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        // Convert image to data URL
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
        processAndSaveFacePhoto(img, dataUrl);
      };
      img.onerror = () => {
        setErrorMsg("Failed to load demo photo asset from /default_student_photo.jpg");
        setPhotoProcessing(false);
      };
      img.src = "/default_student_photo.jpg";
    } catch (err) {
      setErrorMsg(err.message);
      setPhotoProcessing(false);
    }
  }

  // 4. Start Webcam for Live Snapshot
  async function startWebcam() {
    setShowWebcamModal(true);
    setErrorMsg("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Camera access denied or unavailable.");
      setShowWebcamModal(false);
    }
  }

  function stopWebcam() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setShowWebcamModal(false);
  }

  async function captureWebcamPhoto() {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);

    const img = new Image();
    img.onload = () => {
      stopWebcam();
      processAndSaveFacePhoto(img, dataUrl);
    };
    img.src = dataUrl;
  }

  const publicUrl = auth.username
    ? `${window.location.origin}/u/${auth.username}`
    : `${window.location.origin}/u/${formData.username || "username"}`;

  function handleCopyUrl() {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <AppShell
      title="User Profile & Verification"
      subtitle="Complete your academic profile and enroll facial biometrics to unlock scheduled examinations."
      activeNav="/profile"
    >
      <div className="profile-container" style={{ maxWidth: 1040, margin: "0 auto" }}>
        {/* Top Profile Summary Card */}
        <div
          className="card"
          style={{
            background: "linear-gradient(135deg, var(--bg-surface-2) 0%, rgba(99, 102, 241, 0.08) 100%)",
            borderColor: "var(--border-medium)",
            marginBottom: 24,
            padding: "28px 32px"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 20 }}>
            <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
              <div
                style={{
                  width: 84,
                  height: 84,
                  borderRadius: "var(--radius-full)",
                  background: "linear-gradient(135deg, var(--primary), var(--cyan))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "2rem",
                  fontWeight: 700,
                  color: "#FFF",
                  boxShadow: "0 0 25px var(--primary-glow)",
                  flexShrink: 0,
                  overflow: "hidden",
                  border: "2px solid rgba(255, 255, 255, 0.2)"
                }}
              >
                {auth.profileImageUrl ? (
                  <img
                    src={auth.profileImageUrl}
                    alt={auth.name || "Profile"}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  formData.name ? formData.name.charAt(0).toUpperCase() : "U"
                )}
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <h2 style={{ fontSize: "1.4rem", margin: 0, color: "var(--text-primary)" }}>
                    {formData.name || auth.user || "User Profile"}
                  </h2>
                  <span className="status-chip" style={{ fontSize: "0.75rem" }}>
                    {auth.role}
                  </span>
                  <span
                    className={`status-chip ${auth.approved ? "approved" : "pending"}`}
                    style={{ fontSize: "0.75rem" }}
                  >
                    {auth.approved ? "✓ Admin Approved" : "⏳ Pending Approval"}
                  </span>
                  <span
                    className={`status-chip ${auth.faceEnrolled ? "approved" : "pending"}`}
                    style={{ fontSize: "0.75rem", background: auth.faceEnrolled ? "rgba(16, 185, 129, 0.2)" : "rgba(245, 158, 11, 0.2)" }}
                  >
                    {auth.faceEnrolled ? "👤 Face ID Enrolled" : "⚠️ Biometrics Required"}
                  </span>
                </div>

                <p style={{ margin: "4px 0 0", color: "var(--text-secondary)", fontSize: "0.88rem" }}>
                  {formData.designation ? `${formData.designation} · ` : ""}
                  {formData.institution || "Institution Not Specified"}
                </p>

                {auth.username && (
                  <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                      Public URL:
                    </span>
                    <Link
                      to={`/u/${auth.username}`}
                      target="_blank"
                      style={{
                        fontSize: "0.82rem",
                        color: "var(--cyan)",
                        textDecoration: "underline",
                        fontFamily: "var(--font-mono)"
                      }}
                    >
                      /u/{auth.username} ↗
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Public Link Action */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
              <button
                type="button"
                className="secondary-btn"
                onClick={handleCopyUrl}
                style={{ display: "flex", alignItems: "center", gap: 6 }}
              >
                <span>{copied ? "✓ Copied!" : "📋 Copy Public Profile Link"}</span>
              </button>
              <Link to={`/u/${auth.username || formData.username}`} target="_blank" className="ghost-btn" style={{ fontSize: "0.8rem" }}>
                Preview Public Portfolio →
              </Link>
            </div>
          </div>

          {/* Profile Completeness Bar */}
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--border-subtle)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: 6 }}>
              <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
                Profile & Biometric Readiness
              </span>
              <span style={{ color: completeness >= 90 ? "#34D399" : "var(--primary-light)", fontWeight: 700 }}>
                {completeness}% {completeness >= 90 ? "(Exam Ready)" : ""}
              </span>
            </div>
            <div
              style={{
                width: "100%",
                height: 6,
                background: "var(--bg-surface-3)",
                borderRadius: "var(--radius-full)",
                overflow: "hidden"
              }}
            >
              <div
                style={{
                  width: `${completeness}%`,
                  height: "100%",
                  background: completeness >= 90 ? "var(--success)" : "linear-gradient(90deg, var(--primary), var(--cyan))",
                  borderRadius: "var(--radius-full)",
                  transition: "width 0.4s ease"
                }}
              />
            </div>
          </div>
        </div>

        {/* Dedicated Biometric ID & Profile Photo Card */}
        <div
          className="card"
          style={{
            marginBottom: 24,
            padding: "26px 32px",
            background: "linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)",
            border: auth.faceEnrolled ? "1px solid rgba(16, 185, 129, 0.35)" : "1px solid rgba(245, 158, 11, 0.35)"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
            <div>
              <h3 style={{ margin: "0 0 6px", fontSize: "1.2rem", display: "flex", alignItems: "center", gap: 8 }}>
                <span>🛡️</span> Official Biometric Face ID & Profile Photo
              </h3>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)", maxWidth: 620, lineHeight: 1.5 }}>
                ProctorX uses <strong>YuNet 5-point landmark alignment</strong> and <strong>SFace Deep CNN</strong> to continuously verify candidate identity during examinations. Upload a clear portrait photo or take a live camera snapshot to calibrate your baseline ID.
              </p>
            </div>

            <span className={`status-chip ${auth.faceEnrolled ? "approved" : "pending"}`} style={{ fontSize: "0.8rem", padding: "6px 14px" }}>
              {auth.faceEnrolled ? "✓ Biometric Baseline Active" : "⚠️ Identity Enrollment Pending"}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 24, marginTop: 20, flexWrap: "wrap" }}>
            {/* Candidate Photo Thumbnail */}
            <div
              style={{
                width: 100,
                height: 120,
                borderRadius: "var(--radius-md)",
                border: "2px solid rgba(255, 255, 255, 0.15)",
                background: "#0F172A",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 14px rgba(0,0,0,0.5)",
                position: "relative"
              }}
            >
              {auth.profileImageUrl ? (
                <img
                  src={auth.profileImageUrl}
                  alt="Official Candidate"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.75rem", padding: 6 }}>
                  <div style={{ fontSize: "1.6rem", marginBottom: 2 }}>👤</div>
                  No Photo
                </div>
              )}
            </div>

            {/* Photo Action Buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, minWidth: 260 }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: "none" }}
                />

                <button
                  type="button"
                  className="primary-btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={photoProcessing || faceLoading}
                  style={{ fontSize: "0.84rem", padding: "8px 16px" }}
                >
                  📁 Upload Portrait Photo
                </button>

                <button
                  type="button"
                  className="secondary-btn"
                  onClick={startWebcam}
                  disabled={photoProcessing || faceLoading}
                  style={{ fontSize: "0.84rem", padding: "8px 16px" }}
                >
                  📸 Take Live Snapshot
                </button>

                <button
                  type="button"
                  className="ghost-btn"
                  onClick={handleLoadDemoPhoto}
                  disabled={photoProcessing || faceLoading}
                  style={{ fontSize: "0.84rem", padding: "8px 16px", borderColor: "rgba(56, 189, 248, 0.4)", color: "#38BDF8" }}
                >
                  ⚡ Use Test Candidate Photo
                </button>
              </div>

              {photoProcessing && (
                <div style={{ color: "var(--cyan)", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: 8 }}>
                  <div className="spinner" style={{ width: 14, height: 14 }} />
                  <span>{photoMessage || "Processing facial biometrics with neural network..."}</span>
                </div>
              )}

              {auth.faceEnrolled && !photoProcessing && (
                <div style={{ color: "#34D399", fontSize: "0.82rem" }}>
                  ✓ 128-D Biometric Deep Embedding successfully synced with server authority.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Live Webcam Snapshot Modal */}
        {showWebcamModal && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0, 0, 0, 0.85)",
              backdropFilter: "blur(8px)",
              zIndex: 9999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 20
            }}
          >
            <div className="card" style={{ maxWidth: 520, width: "100%", padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: "1.2rem" }}>Capture Biometric ID Photo</h3>
                <button type="button" onClick={stopWebcam} className="ghost-btn" style={{ padding: "4px 8px" }}>
                  ✕
                </button>
              </div>

              <div style={{ position: "relative", borderRadius: 8, overflow: "hidden", background: "#000", height: 340 }}>
                <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                
                {/* Visual Facial Oval Guide */}
                <div
                  style={{
                    position: "absolute",
                    top: "15%",
                    left: "25%",
                    width: "50%",
                    height: "70%",
                    border: "2px dashed #38BDF8",
                    borderRadius: "50%",
                    pointerEvents: "none",
                    boxShadow: "0 0 20px rgba(56, 189, 248, 0.3)"
                  }}
                />
              </div>

              <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: "12px 0 16px", textAlign: "center" }}>
                Position your face inside the guide with good lighting and look directly into the camera.
              </p>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button type="button" className="ghost-btn" onClick={stopWebcam}>
                  Cancel
                </button>
                <button type="button" className="primary-btn" onClick={captureWebcamPhoto}>
                  📸 Capture & Calibrate
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Adaptive Coach Competency Radar Showcase */}
        {adaptiveData && adaptiveData.diagnosticCompleted && (
          <div
            className="card"
            style={{
              marginBottom: 24,
              padding: "26px 32px",
              background: "linear-gradient(135deg, rgba(30, 41, 59, 0.75) 0%, rgba(15, 23, 42, 0.9) 100%)",
              border: "1px solid rgba(6, 182, 212, 0.25)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <div>
                <h3 style={{ margin: "0 0 4px", fontSize: "1.2rem", display: "flex", alignItems: "center", gap: 8 }}>
                  <span>🌐</span> Verified Algorithmic Competency Radar
                </h3>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  Continuous 12-Dimension skill vector calibrated via ProctorX Adaptive Engine
                </p>
              </div>
              <Link to="/adaptive-coach" className="secondary-btn" style={{ fontSize: "0.82rem", padding: "6px 14px" }}>
                Open Adaptive Coach →
              </Link>
            </div>

            <div style={{ display: "flex", justifyContent: "center", padding: "10px 0" }}>
              <CompetencyRadar dsaMasteryVector={adaptiveData.dsaMasteryVector} size={360} />
            </div>
          </div>
        )}

        {/* Verification Status Notice Card */}
        {!auth.approved && (
          <div
            className="card"
            style={{
              background: "rgba(245, 158, 11, 0.08)",
              borderColor: "rgba(245, 158, 11, 0.3)",
              marginBottom: 24,
              padding: "18px 24px"
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <span style={{ fontSize: "1.4rem" }}>🛡️</span>
              <div>
                <strong style={{ color: "#FBBF24", fontSize: "0.95rem" }}>
                  Account Awaiting Administrator Verification
                </strong>
                <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  {auth.role === "STUDENT"
                    ? "Today's and upcoming scheduled exams are locked until your academic details are verified by your institution's administrator. Complete your college, department, and year details below to expedite approval."
                    : "Exam authoring and live monitor tools are locked until platform administrators approve your coordinator profile. Please ensure your academic designation and institution details are up to date."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Form Messages */}
        {errorMsg && <div className="error" style={{ marginBottom: 18 }}>{errorMsg}</div>}
        {successMsg && (
          <div
            style={{
              background: "rgba(16, 185, 129, 0.12)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              color: "#34D399",
              padding: "12px 18px",
              borderRadius: "var(--radius-md)",
              fontSize: "0.88rem",
              marginBottom: 18
            }}
          >
            ✓ {successMsg}
          </div>
        )}

        {/* Profile Edit Form */}
        <div className="card" style={{ padding: "32px 36px" }}>
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: "1.25rem", margin: "0 0 6px" }}>Edit Profile Information</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: 0 }}>
              This information is displayed on your public candidate portfolio and reviewed by administrators.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="field-group">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div className="field-stack">
                  <label>Full Name *</label>
                  <input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. Maya Lin"
                    required
                  />
                </div>

                <div className="field-stack">
                  <label>Public Username Slug * (URL Handle)</label>
                  <div style={{ position: "relative" }}>
                    <input
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      placeholder="e.g. maya-lin"
                      required
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div className="field-stack">
                  <label>Institution / College Name</label>
                  <input
                    name="institution"
                    value={formData.institution}
                    onChange={handleChange}
                    placeholder="e.g. Stanford University / MIT"
                  />
                </div>

                <div className="field-stack">
                  <label>Department / Branch</label>
                  <input
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    placeholder="e.g. Computer Science & Engineering"
                  />
                </div>
              </div>

              <div className="field-stack">
                <label>{auth.role === "STUDENT" ? "Year of Study / Degree Program" : "Designation / Academic Title"}</label>
                <input
                  name="designation"
                  value={formData.designation}
                  onChange={handleChange}
                  placeholder={auth.role === "STUDENT" ? "e.g. 3rd Year B.Tech CSE" : "e.g. Assistant Professor"}
                />
              </div>

              <div className="field-stack">
                <label>Professional Bio / Summary</label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Tell examiners or employers about your core focus, academic background, or technical interests..."
                  style={{ resize: "vertical" }}
                />
              </div>

              <div className="field-stack">
                <label>Technical Skills (Comma separated)</label>
                <input
                  name="skills"
                  value={formData.skills}
                  onChange={handleChange}
                  placeholder="e.g. Java, Data Structures, Python, React, SQL, Algorithms"
                />
                <small style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>
                  These will appear as badges on your LeetCode-style public profile.
                </small>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--border-subtle)" }}>
              <button
                type="submit"
                className="btn primary-btn"
                disabled={loading}
                style={{ minWidth: 180 }}
              >
                {loading ? "Saving Changes..." : "Save Profile & Request Verification"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppShell>
  );
}

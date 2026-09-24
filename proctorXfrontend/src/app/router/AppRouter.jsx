import { lazy, Suspense } from "react";
import { Routes, Route, Navigate, BrowserRouter } from "react-router-dom";
import Landing from "../../features/workspace/Landing";
import Login from "../../features/workspace/Login";
import Register from "../../features/workspace/Register";
import ForgotPassword from "../../features/workspace/ForgotPassword";
import ResetPassword from "../../features/workspace/ResetPassword";
import Dashboard from "../../features/workspace/Dashboard";
import Profile from "../../features/profile/Profile";
import PublicProfile from "../../features/profile/PublicProfile";
import { useSelector } from "react-redux";
import CreateExam from "../../features/exam/CreateExam";
import AddQuestions from "../../features/exam/AddQuestions";
import TodayExams from "../../features/exams/TodaysExam";
import StartExam from "../../features/exam/StartExam";
import AdminLiveMonitor from "../../features/exams/AdminLiveMonitor";
import AdminMalpracticeLogs from "../../features/exams/AdminMalpracticeLogs";
import ExamInformation from "../../features/exams/ExamInformation";
import Results from "../../features/exams/Results";
import UpcomingExams from "../../features/exams/UpcommingExam";
import GenerateAIQuestions from "../../features/exam/GenerateAIQuestions";
import ApproveUsers from "../../features/workspace/ApproveUsers";
import AddCodingQuestion from "../../features/exam/AddCodingQuestions";
import GenerateCodingAIQuestions from "../../features/exam/GenerateCodingAiQuestions";
import CodingQuestionPlan from "../../features/exam/CodingQuestionPlan";
import CodingExam from "../../features/exam/CodingExam";
import CoordinatorExamHistory from "../../features/exams/CoordinatorExamHistory";
import CompilerSettings from "../../features/workspace/CompilerSettings";
import AdaptiveCoach from "../../features/adaptive/AdaptiveCoach";
import DiagnosticExam from "../../features/adaptive/DiagnosticExam";
import AdaptiveTrainingExam from "../../features/adaptive/AdaptiveTrainingExam";

import FeatureLockedScreen from "../../shared/components/FeatureLockedScreen";

const ExamSecurityGate = lazy(() => import("../../features/proctoring/ExamSecurityGate"));

function ProtectedRoute({ children, allowedRoles, requireApproval = true, featureTitle, featureDescription }) {
  const { isAuthenticated, role, approved } = useSelector(state => state.auth);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  // Restrict access to action routes if account is awaiting verification (except ADMIN) - show locked UI on this page
  const isApproved = role === "ADMIN" || approved === true;
  if (requireApproval && !isApproved && allowedRoles && allowedRoles.length > 0) {
    return (
      <FeatureLockedScreen
        featureTitle={featureTitle || "Platform Feature"}
        featureDescription={featureDescription || "Access to this feature requires verified administrator account approval."}
        role={role}
      />
    );
  }

  return children;
}

export default function AppRouter() {
  const { authChecked, role } = useSelector(state => state.auth);

  // Wait until auth check completes
  if (!authChecked) {
    return (
      <div className="app-loading-screen">
        <div className="loading-orbit"><span className="brand-symbol">P</span></div>
        <h2>Preparing your secure environment</h2>
        <p>Verifying your session and workspace access</p>
        <div className="loading-progress"><span /></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/u/:username" element={<PublicProfile />} />
        <Route path="/profile/:username" element={<PublicProfile />} />

        {/* General Authenticated Dashboard & Profile */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard role={role} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        {/* Admin & Coordinator Protected Routes */}
        <Route
          path="/admin/create-exam"
          element={
            <ProtectedRoute
              allowedRoles={["ADMIN", "COORDINATOR"]}
              featureTitle="Create New Examination"
              featureDescription="Examination authoring and scheduling requires verified coordinator access."
            >
              <CreateExam />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/exams/:examId/add-questions"
          element={
            <ProtectedRoute
              allowedRoles={["ADMIN", "COORDINATOR"]}
              featureTitle="Question Catalog Authoring"
              featureDescription="Authoring and managing assessment questions requires coordinator approval."
            >
              <AddQuestions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/exams/:examId/generate-ai"
          element={
            <ProtectedRoute
              allowedRoles={["ADMIN", "COORDINATOR"]}
              featureTitle="AI Assessment Generator"
              featureDescription="AI challenge generation requires verified coordinator access."
            >
              <GenerateAIQuestions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/exams/:examId/coding-manual"
          element={
            <ProtectedRoute
              allowedRoles={["ADMIN", "COORDINATOR"]}
              featureTitle="Coding IDE Challenge Authoring"
              featureDescription="Coding challenge creation requires verified coordinator access."
            >
              <AddCodingQuestion />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/exams/:examId/coding-plan"
          element={
            <ProtectedRoute
              allowedRoles={["ADMIN", "COORDINATOR"]}
              featureTitle="Algorithm Blueprint Planning"
              featureDescription="Algorithmic problem planning requires verified coordinator access."
            >
              <CodingQuestionPlan />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/exams/:examId/coding-ai"
          element={
            <ProtectedRoute
              allowedRoles={["ADMIN", "COORDINATOR"]}
              featureTitle="AI Coding Challenge Generator"
              featureDescription="AI algorithm generation requires verified coordinator access."
            >
              <GenerateCodingAIQuestions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/monitor"
          element={
            <ProtectedRoute
              allowedRoles={["ADMIN", "COORDINATOR"]}
              featureTitle="Live Exam Control Room"
              featureDescription="Real-time candidate telemetry, heartbeat monitors, and intervention controls require verified coordinator access."
            >
              <AdminLiveMonitor />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/malpractice"
          element={
            <ProtectedRoute
              allowedRoles={["ADMIN", "COORDINATOR"]}
              featureTitle="Malpractice & Infraction Audit"
              featureDescription="Inspecting candidate telemetry and infraction audit logs requires verified coordinator access."
            >
              <AdminMalpracticeLogs />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/approve"
          element={
            <ProtectedRoute
              allowedRoles={["ADMIN"]}
              featureTitle="User Approval Console"
              featureDescription="Platform account verification and user management requires administrator privileges."
            >
              <ApproveUsers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/exam-history"
          element={
            <ProtectedRoute
              allowedRoles={["ADMIN", "COORDINATOR"]}
              featureTitle="Examination History & Submissions"
              featureDescription="Reviewing authored assessment rounds and student gradebooks requires verified coordinator access."
            >
              <CoordinatorExamHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/compiler-settings"
          element={
            <ProtectedRoute
              allowedRoles={["ADMIN", "COORDINATOR"]}
              featureTitle="Compiler Engine Management"
              featureDescription="Configuring execution compilers and cloud failovers requires verified access."
            >
              <CompilerSettings />
            </ProtectedRoute>
          }
        />

        {/* Student Protected Routes */}
        <Route
          path="/exam/:examId/start"
          element={
            <ProtectedRoute
              allowedRoles={["STUDENT", "ADMIN"]}
              featureTitle="Examination Session"
              featureDescription="Entering secure examinations requires institutional account approval."
            >
              <StartExam />
            </ProtectedRoute>
          }
        />
        <Route
          path="/exam/:examId/start-coding"
          element={
            <ProtectedRoute
              allowedRoles={["STUDENT", "ADMIN"]}
              featureTitle="Coding Examination Session"
              featureDescription="Entering secure coding assessments requires institutional account approval."
            >
              <CodingExam />
            </ProtectedRoute>
          }
        />
        <Route
          path="/exam/:examId/security"
          element={
            <ProtectedRoute
              allowedRoles={["STUDENT", "ADMIN"]}
              featureTitle="Security Pre-Flight Gate"
              featureDescription="Conducting hardware and webcam verification checks requires verified candidate access."
            >
              <Suspense fallback={<div className="app-loading-screen">Loading secure exam check...</div>}>
                <ExamSecurityGate />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/exams/today"
          element={
            <ProtectedRoute
              allowedRoles={["STUDENT", "ADMIN"]}
              featureTitle="Live & Today's Examinations"
              featureDescription="Access to active daily assessments requires verified student enrollment."
            >
              <TodayExams />
            </ProtectedRoute>
          }
        />
        <Route
          path="/exams/upcoming"
          element={
            <ProtectedRoute
              allowedRoles={["STUDENT", "ADMIN"]}
              featureTitle="Upcoming Assessments"
              featureDescription="Reviewing scheduled exam timetables requires verified student enrollment."
            >
              <UpcomingExams />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rules"
          element={
            <ProtectedRoute allowedRoles={["STUDENT", "ADMIN", "COORDINATOR"]} requireApproval={false}>
              <ExamInformation />
            </ProtectedRoute>
          }
        />
        <Route
          path="/results"
          element={
            <ProtectedRoute allowedRoles={["STUDENT", "ADMIN", "COORDINATOR"]} requireApproval={false}>
              <Results />
            </ProtectedRoute>
          }
        />
        <Route
          path="/adaptive-coach"
          element={
            <ProtectedRoute allowedRoles={["STUDENT", "ADMIN", "COORDINATOR"]} requireApproval={false}>
              <AdaptiveCoach />
            </ProtectedRoute>
          }
        />
        <Route
          path="/adaptive-coach/diagnostic"
          element={
            <ProtectedRoute allowedRoles={["STUDENT", "ADMIN", "COORDINATOR"]} requireApproval={false}>
              <DiagnosticExam />
            </ProtectedRoute>
          }
        />
        <Route
          path="/adaptive-coach/training"
          element={
            <ProtectedRoute allowedRoles={["STUDENT", "ADMIN", "COORDINATOR"]} requireApproval={false}>
              <AdaptiveTrainingExam />
            </ProtectedRoute>
          }
        />
        <Route
          path="/adaptive-coach/training/:sessionId"
          element={
            <ProtectedRoute allowedRoles={["STUDENT", "ADMIN", "COORDINATOR"]} requireApproval={false}>
              <AdaptiveTrainingExam />
            </ProtectedRoute>
          }
        />

        {/* Catch-all fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

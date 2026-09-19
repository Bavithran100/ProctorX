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

const ExamSecurityGate = lazy(() => import("../../features/proctoring/ExamSecurityGate"));

function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, role } = useSelector(state => state.auth);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
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
            <ProtectedRoute allowedRoles={["ADMIN", "COORDINATOR"]}>
              <CreateExam />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/exams/:examId/add-questions"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "COORDINATOR"]}>
              <AddQuestions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/exams/:examId/generate-ai"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "COORDINATOR"]}>
              <GenerateAIQuestions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/exams/:examId/coding-manual"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "COORDINATOR"]}>
              <AddCodingQuestion />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/exams/:examId/coding-plan"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "COORDINATOR"]}>
              <CodingQuestionPlan />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/exams/:examId/coding-ai"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "COORDINATOR"]}>
              <GenerateCodingAIQuestions />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/monitor"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "COORDINATOR"]}>
              <AdminLiveMonitor />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/malpractice"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "COORDINATOR"]}>
              <AdminMalpracticeLogs />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/approve"
          element={
            <ProtectedRoute allowedRoles={["ADMIN"]}>
              <ApproveUsers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/exam-history"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "COORDINATOR"]}>
              <CoordinatorExamHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/compiler-settings"
          element={
            <ProtectedRoute allowedRoles={["ADMIN", "COORDINATOR"]}>
              <CompilerSettings />
            </ProtectedRoute>
          }
        />

        {/* Student Protected Routes */}
        <Route
          path="/exam/:examId/start"
          element={
            <ProtectedRoute allowedRoles={["STUDENT", "ADMIN"]}>
              <StartExam />
            </ProtectedRoute>
          }
        />
        <Route
          path="/exam/:examId/start-coding"
          element={
            <ProtectedRoute allowedRoles={["STUDENT", "ADMIN"]}>
              <CodingExam />
            </ProtectedRoute>
          }
        />
        <Route
          path="/exam/:examId/security"
          element={
            <ProtectedRoute allowedRoles={["STUDENT", "ADMIN"]}>
              <Suspense fallback={<div className="app-loading-screen">Loading secure exam check...</div>}>
                <ExamSecurityGate />
              </Suspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/exams/today"
          element={
            <ProtectedRoute allowedRoles={["STUDENT", "ADMIN"]}>
              <TodayExams />
            </ProtectedRoute>
          }
        />
        <Route
          path="/exams/upcoming"
          element={
            <ProtectedRoute allowedRoles={["STUDENT", "ADMIN"]}>
              <UpcomingExams />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rules"
          element={
            <ProtectedRoute allowedRoles={["STUDENT", "ADMIN"]}>
              <ExamInformation />
            </ProtectedRoute>
          }
        />
        <Route
          path="/results"
          element={
            <ProtectedRoute allowedRoles={["STUDENT", "ADMIN"]}>
              <Results />
            </ProtectedRoute>
          }
        />

        {/* Catch-all fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

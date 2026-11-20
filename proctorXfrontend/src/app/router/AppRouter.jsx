import { lazy, Suspense } from "react";
import { Routes, Route, Navigate, BrowserRouter, useLocation } from "react-router-dom";
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
import BillingManagement from "../../features/workspace/BillingManagement";
import OrganizationOnboarding from "../../features/workspace/OrganizationOnboarding";
import SuperAdminOrganizations from "../../features/workspace/SuperAdminOrganizations";
import AdaptiveCoach from "../../features/adaptive/AdaptiveCoach";
import DiagnosticExam from "../../features/adaptive/DiagnosticExam";
import AdaptiveTrainingExam from "../../features/adaptive/AdaptiveTrainingExam";
import AdaptiveTester from "../../features/adaptive/AdaptiveTester";

import FeatureLockedScreen from "../../shared/components/FeatureLockedScreen";

const ExamSecurityGate = lazy(() => import("../../features/proctoring/ExamSecurityGate"));

function ProtectedRoute({ children, allowedRoles, requireApproval = true, featureTitle, featureDescription }) {
  const location = useLocation();
  const {
    isAuthenticated,
    role,
    approved,
    authChecked,
    organizationIsLocked,
    organizationPaymentStatus,
    isFullyApproved,
    collegeAdminApproved,
    coordinatorApproved,
    coordinatorId
  } = useSelector(state => state.auth);

  // If user is directly visiting a protected route, wait for auth check
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

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Super Admin & Admin bypass organization locks
  const isSuperOrAdmin = role === "SUPER_ADMIN" || role === "ADMIN";

  // Check if institution tenant is locked by Super Admin
  if (organizationIsLocked && !isSuperOrAdmin) {
    return (
      <FeatureLockedScreen
        lockType="ORG_LOCKED"
        featureTitle="Institutional Account Suspended"
        featureDescription="Your institution's account has been temporarily locked by platform administration. All member activities are halted. Your academic data is preserved."
        role={role}
      />
    );
  }

  // If College Admin hasn't activated plan, redirect to activation unless already on activation or dashboard
  if (
    role === "COLLEGE_ADMIN" &&
    organizationPaymentStatus !== "ACTIVE" &&
    location.pathname !== "/institution/activation" &&
    location.pathname !== "/dashboard" &&
    location.pathname !== "/profile" &&
    location.pathname !== "/admin/billing"
  ) {
    return <Navigate to="/institution/activation" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  // Check approval status
  let isApproved = isSuperOrAdmin;
  if (!isApproved) {
    if (role === "COLLEGE_ADMIN") {
      isApproved = organizationPaymentStatus === "ACTIVE";
    } else if (role === "COORDINATOR") {
      isApproved = Boolean(collegeAdminApproved);
    } else if (role === "STUDENT") {
      isApproved = Boolean(isFullyApproved);
    } else {
      isApproved = Boolean(approved);
    }
  }

  if (requireApproval && !isApproved && allowedRoles && allowedRoles.length > 0) {
    let computedLockType = "COLLEGE_APPROVAL_PENDING";
    let computedDesc = "Access to this feature requires verified institutional account approval.";

    if (role === "COLLEGE_ADMIN" && organizationPaymentStatus !== "ACTIVE") {
      computedLockType = "PAYMENT_REQUIRED";
      computedDesc = "Institutional activation is pending. Complete plan selection and activation to unlock platform features.";
    } else if (role === "COORDINATOR") {
      computedLockType = "COLLEGE_APPROVAL_PENDING";
      computedDesc = "Your coordinator account is awaiting verification by your College Administrator.";
    } else if (role === "STUDENT") {
      if (!collegeAdminApproved) {
        computedLockType = "COLLEGE_APPROVAL_PENDING";
        computedDesc = "Your institutional enrollment is awaiting verification from your College Administrator.";
      } else if (!coordinatorId) {
        computedLockType = "COORD_ASSIGNMENT_PENDING";
        computedDesc = "Your institution has verified you! Please select your assigned Faculty Coordinator to proceed.";
      } else if (!coordinatorApproved) {
        computedLockType = "COORD_APPROVAL_PENDING";
        computedDesc = "Your assigned Faculty Coordinator has not yet cleared your student account.";
      }
    }

    return (
      <FeatureLockedScreen
        lockType={computedLockType}
        featureTitle={featureTitle || "Platform Feature"}
        featureDescription={featureDescription || computedDesc}
        role={role}
      />
    );
  }

  return children;
}

export default function AppRouter() {
  const { role } = useSelector(state => state.auth);

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
              allowedRoles={["ADMIN", "SUPER_ADMIN", "COORDINATOR"]}
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
              allowedRoles={["ADMIN", "SUPER_ADMIN", "COORDINATOR"]}
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
              allowedRoles={["ADMIN", "SUPER_ADMIN", "COORDINATOR"]}
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
              allowedRoles={["ADMIN", "SUPER_ADMIN", "COORDINATOR"]}
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
              allowedRoles={["ADMIN", "SUPER_ADMIN", "COORDINATOR"]}
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
              allowedRoles={["ADMIN", "SUPER_ADMIN", "COORDINATOR"]}
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
              allowedRoles={["ADMIN", "SUPER_ADMIN", "COLLEGE_ADMIN", "COORDINATOR"]}
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
              allowedRoles={["ADMIN", "SUPER_ADMIN", "COLLEGE_ADMIN", "COORDINATOR"]}
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
              allowedRoles={["ADMIN", "SUPER_ADMIN", "COLLEGE_ADMIN", "COORDINATOR"]}
              featureTitle="User Approval Console"
              featureDescription="Platform account verification and user management requires administrator privileges."
            >
              <ApproveUsers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/organizations"
          element={
            <ProtectedRoute
              allowedRoles={["ADMIN", "SUPER_ADMIN"]}
              featureTitle="Super Admin Tenant Governance"
              featureDescription="Institutional account management, hierarchical multi-tenancy tree, and master kill switches require Super Admin privileges."
            >
              <SuperAdminOrganizations />
            </ProtectedRoute>
          }
        />
        <Route
          path="/institution/activation"
          element={
            <ProtectedRoute
              allowedRoles={["ADMIN", "SUPER_ADMIN", "COLLEGE_ADMIN"]}
              requireApproval={false}
              featureTitle="Institutional Activation & Onboarding"
              featureDescription="Terms of service acceptance, institutional plan selection, and quota enablement."
            >
              <OrganizationOnboarding />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/billing"
          element={
            <ProtectedRoute
              allowedRoles={["ADMIN", "SUPER_ADMIN", "COLLEGE_ADMIN"]}
              requireApproval={false}
              featureTitle="Institutional Billing & Quota"
              featureDescription="Institutional licensing and payment management requires administrator privileges."
            >
              <BillingManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/exam-history"
          element={
            <ProtectedRoute
              allowedRoles={["ADMIN", "SUPER_ADMIN", "COLLEGE_ADMIN", "COORDINATOR"]}
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
              allowedRoles={["ADMIN", "SUPER_ADMIN", "COORDINATOR"]}
              featureTitle="Compiler Engine Management"
              featureDescription="Configuring execution compilers and cloud failovers requires verified access."
            >
              <CompilerSettings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/adaptive-tester"
          element={
            <ProtectedRoute
              allowedRoles={["ADMIN", "SUPER_ADMIN"]}
              featureTitle="Adaptive AI Sandbox & Vector Lab"
              featureDescription="Admin cognitive vector testing laboratory and compiler simulator."
            >
              <AdaptiveTester />
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
            <ProtectedRoute allowedRoles={["STUDENT", "ADMIN", "SUPER_ADMIN", "COORDINATOR"]} requireApproval={false}>
              <AdaptiveCoach />
            </ProtectedRoute>
          }
        />
        <Route
          path="/adaptive-coach/diagnostic"
          element={
            <ProtectedRoute allowedRoles={["STUDENT", "ADMIN", "SUPER_ADMIN", "COORDINATOR"]} requireApproval={false}>
              <DiagnosticExam />
            </ProtectedRoute>
          }
        />
        <Route
          path="/adaptive-coach/training"
          element={
            <ProtectedRoute allowedRoles={["STUDENT", "ADMIN", "SUPER_ADMIN", "COORDINATOR"]} requireApproval={false}>
              <AdaptiveTrainingExam />
            </ProtectedRoute>
          }
        />
        <Route
          path="/adaptive-coach/training/:sessionId"
          element={
            <ProtectedRoute allowedRoles={["STUDENT", "ADMIN", "SUPER_ADMIN", "COORDINATOR"]} requireApproval={false}>
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

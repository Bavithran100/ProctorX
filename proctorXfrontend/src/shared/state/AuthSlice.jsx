import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  user: null,
  name: null,
  username: null,
  role: null,
  approved: null,
  institution: null,
  organizationId: null,
  orgCode: null,
  organizationName: null,
  collegeAdminId: null,
  coordinatorId: null,
  collegeAdminApproved: null,
  coordinatorApproved: null,
  isFullyApproved: null,
  maxCoordinatorsQuota: null,
  maxStudentsQuota: null,
  subscriptionPlan: null,
  paymentStatus: null,
  organizationIsLocked: false,
  organizationPaymentStatus: null,
  organizationTermsAccepted: false,
  department: null,
  designation: null,
  bio: null,
  skills: null,
  profileCompleted: false,
  profileImageUrl: null,
  faceEnrolled: false,
  faceEmbedding: null,
  isAuthenticated: false,
  authChecked: false
};

const AuthSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    loginSuccess: (state, action) => {
      const payload = action.payload || {};
      state.user = payload.user || payload.email || null;
      state.name = payload.name || null;
      state.username = payload.username || null;
      state.role = payload.role || null;
      state.approved = payload.approved ?? false;
      state.institution = payload.institution || null;
      state.organizationId = payload.organizationId || null;
      state.orgCode = payload.orgCode || null;
      state.organizationName = payload.organizationName || null;
      state.collegeAdminId = payload.collegeAdminId || null;
      state.coordinatorId = payload.coordinatorId || null;
      state.collegeAdminApproved = payload.collegeAdminApproved ?? false;
      state.coordinatorApproved = payload.coordinatorApproved ?? false;
      state.isFullyApproved = payload.isFullyApproved ?? (payload.approved ?? false);
      state.maxCoordinatorsQuota = payload.maxCoordinatorsQuota || null;
      state.maxStudentsQuota = payload.maxStudentsQuota || null;
      state.subscriptionPlan = payload.subscriptionPlan || null;
      state.paymentStatus = payload.paymentStatus || null;
      state.organizationIsLocked = Boolean(payload.organizationIsLocked);
      state.organizationPaymentStatus = payload.organizationPaymentStatus || null;
      state.organizationTermsAccepted = Boolean(payload.organizationTermsAccepted);
      state.department = payload.department || null;
      state.designation = payload.designation || null;
      state.bio = payload.bio || null;
      state.skills = payload.skills || null;
      state.profileCompleted = payload.profileCompleted ?? false;
      state.profileImageUrl = payload.profileImageUrl || null;
      state.faceEnrolled = payload.faceEnrolled ?? false;
      state.faceEmbedding = payload.faceEmbedding || null;
      state.isAuthenticated = true;
      state.authChecked = true;
    },
    updateUserProfile: (state, action) => {
      const payload = action.payload || {};
      if (payload.name !== undefined) state.name = payload.name;
      if (payload.username !== undefined) state.username = payload.username;
      if (payload.institution !== undefined) state.institution = payload.institution;
      if (payload.organizationId !== undefined) state.organizationId = payload.organizationId;
      if (payload.orgCode !== undefined) state.orgCode = payload.orgCode;
      if (payload.organizationName !== undefined) state.organizationName = payload.organizationName;
      if (payload.collegeAdminId !== undefined) state.collegeAdminId = payload.collegeAdminId;
      if (payload.coordinatorId !== undefined) state.coordinatorId = payload.coordinatorId;
      if (payload.collegeAdminApproved !== undefined) state.collegeAdminApproved = payload.collegeAdminApproved;
      if (payload.coordinatorApproved !== undefined) state.coordinatorApproved = payload.coordinatorApproved;
      if (payload.isFullyApproved !== undefined) state.isFullyApproved = payload.isFullyApproved;
      if (payload.maxCoordinatorsQuota !== undefined) state.maxCoordinatorsQuota = payload.maxCoordinatorsQuota;
      if (payload.maxStudentsQuota !== undefined) state.maxStudentsQuota = payload.maxStudentsQuota;
      if (payload.subscriptionPlan !== undefined) state.subscriptionPlan = payload.subscriptionPlan;
      if (payload.paymentStatus !== undefined) state.paymentStatus = payload.paymentStatus;
      if (payload.organizationIsLocked !== undefined) state.organizationIsLocked = payload.organizationIsLocked;
      if (payload.organizationPaymentStatus !== undefined) state.organizationPaymentStatus = payload.organizationPaymentStatus;
      if (payload.organizationTermsAccepted !== undefined) state.organizationTermsAccepted = payload.organizationTermsAccepted;
      if (payload.department !== undefined) state.department = payload.department;
      if (payload.designation !== undefined) state.designation = payload.designation;
      if (payload.bio !== undefined) state.bio = payload.bio;
      if (payload.skills !== undefined) state.skills = payload.skills;
      if (payload.profileCompleted !== undefined) state.profileCompleted = payload.profileCompleted;
      if (payload.approved !== undefined) state.approved = payload.approved;
      if (payload.profileImageUrl !== undefined) state.profileImageUrl = payload.profileImageUrl;
      if (payload.faceEnrolled !== undefined) state.faceEnrolled = payload.faceEnrolled;
      if (payload.faceEmbedding !== undefined) state.faceEmbedding = payload.faceEmbedding;
    },
    logout: (state) => {
      state.user = null;
      state.name = null;
      state.username = null;
      state.role = null;
      state.approved = null;
      state.institution = null;
      state.organizationId = null;
      state.orgCode = null;
      state.organizationName = null;
      state.collegeAdminId = null;
      state.coordinatorId = null;
      state.collegeAdminApproved = null;
      state.coordinatorApproved = null;
      state.isFullyApproved = null;
      state.maxCoordinatorsQuota = null;
      state.maxStudentsQuota = null;
      state.subscriptionPlan = null;
      state.paymentStatus = null;
      state.organizationIsLocked = false;
      state.organizationPaymentStatus = null;
      state.organizationTermsAccepted = false;
      state.department = null;
      state.designation = null;
      state.bio = null;
      state.skills = null;
      state.profileCompleted = false;
      state.profileImageUrl = null;
      state.faceEnrolled = false;
      state.faceEmbedding = null;
      state.isAuthenticated = false;
      state.authChecked = true;
    }
  }
});

export const { loginSuccess, updateUserProfile, logout } = AuthSlice.actions;
export default AuthSlice.reducer;

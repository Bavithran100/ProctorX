import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  user: null,
  name: null,
  username: null,
  role: null,
  approved: null,
  institution: null,
  department: null,
  designation: null,
  bio: null,
  skills: null,
  profileCompleted: false,
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
      state.department = payload.department || null;
      state.designation = payload.designation || null;
      state.bio = payload.bio || null;
      state.skills = payload.skills || null;
      state.profileCompleted = payload.profileCompleted ?? false;
      state.isAuthenticated = true;
      state.authChecked = true;
    },
    updateUserProfile: (state, action) => {
      const payload = action.payload || {};
      if (payload.name !== undefined) state.name = payload.name;
      if (payload.username !== undefined) state.username = payload.username;
      if (payload.institution !== undefined) state.institution = payload.institution;
      if (payload.department !== undefined) state.department = payload.department;
      if (payload.designation !== undefined) state.designation = payload.designation;
      if (payload.bio !== undefined) state.bio = payload.bio;
      if (payload.skills !== undefined) state.skills = payload.skills;
      if (payload.profileCompleted !== undefined) state.profileCompleted = payload.profileCompleted;
      if (payload.approved !== undefined) state.approved = payload.approved;
    },
    logout: (state) => {
      state.user = null;
      state.name = null;
      state.username = null;
      state.role = null;
      state.approved = null;
      state.institution = null;
      state.department = null;
      state.designation = null;
      state.bio = null;
      state.skills = null;
      state.profileCompleted = false;
      state.isAuthenticated = false;
      state.authChecked = true;
    }
  }
});

export const { loginSuccess, updateUserProfile, logout } = AuthSlice.actions;
export default AuthSlice.reducer;

import axios from "axios";
import store from "../state/Store";
import { logout } from "../state/AuthSlice";

let memoryCsrfToken = null;

/**
 * Utility to extract cookie value by name.
 */
export function getCookie(name) {
  if (typeof document === "undefined" || !document.cookie) return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    const raw = parts.pop().split(";").shift();
    return raw ? decodeURIComponent(raw) : null;
  }
  return null;
}

/**
 * Formats API errors into actionable user-facing messages.
 */
export function formatApiError(error) {
  if (!error) return "An unexpected error occurred. Please try again.";

  // Offline / Network Error
  if (
    error.code === "ERR_NETWORK" ||
    error.code === "ECONNREFUSED" ||
    error.message === "Network Error" ||
    (!error.response && error.request)
  ) {
    return "Backend API server is currently unreachable (http://localhost:9080). Please ensure the backend service is running.";
  }

  // HTTP Response Errors
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data;

    // Backend custom error object or string
    if (typeof data === "string" && data.trim()) return data;
    if (data?.message) return data.message;
    if (data?.error) return data.error;

    if (status === 400) return "Bad request. Please verify your input data.";
    if (status === 401) return "Authentication required. Please sign in again.";
    if (status === 403) return data?.message || "Access restricted: Your account may be awaiting admin approval or lacks permissions.";
    if (status === 404) return "Requested resource was not found.";
    if (status === 409) return data?.message || "Conflict: An account or resource with these details already exists.";
    if (status === 500) return "Internal server error. Please check backend logs or try again shortly.";
  }

  return error.message || "An unexpected error occurred.";
}

const Client = axios.create({
  // baseURL: "https://proctorxbackend-1.onrender.com/api",
  baseURL: "http://localhost:9080/api",
  headers: {
    "Content-Type": "application/json"
  },
  withCredentials: true,
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
  timeout: 15000
});

/**
 * Proactively fetch a fresh CSRF token from the backend.
 */
export async function fetchCsrfToken() {
  try {
    const response = await Client.get("/auth/csrf");
    if (response.data?.token) {
      memoryCsrfToken = response.data.token;
      return memoryCsrfToken;
    }
  } catch (error) {
    console.warn("Unable to fetch CSRF token proactively:", error);
  }
  const cookieToken = getCookie("XSRF-TOKEN");
  if (cookieToken) memoryCsrfToken = cookieToken;
  return cookieToken;
}

// ==========================================
// REQUEST INTERCEPTOR (CSRF Token Attachment)
// ==========================================
Client.interceptors.request.use(
  (config) => {
    // Attach CSRF token for mutating requests
    const method = config.method ? config.method.toUpperCase() : "GET";
    if (["POST", "PUT", "DELETE", "PATCH"].includes(method)) {
      const xsrfToken = memoryCsrfToken || getCookie("XSRF-TOKEN");
      if (xsrfToken) {
        config.headers["X-XSRF-TOKEN"] = xsrfToken;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ==========================================
// RESPONSE INTERCEPTOR (401, 403 & Error Diagnostics)
// ==========================================
Client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    error.userMessage = formatApiError(error);
    error.isOffline =
      error.code === "ERR_NETWORK" ||
      error.code === "ECONNREFUSED" ||
      error.message === "Network Error" ||
      (!error.response && Boolean(error.request));

    // 401 Unauthorized handling
    if (error.response?.status === 401) {
      const url = originalRequest?.url || "";
      const isPublicAuthCall =
        url.includes("/me") ||
        url.includes("/Login") ||
        url.includes("/Register") ||
        url.includes("/public/") ||
        url.includes("/auth/csrf");

      if (!isPublicAuthCall) {
        try {
          store.dispatch(logout());
          localStorage.clear();
          sessionStorage.clear();
          if (
            typeof window !== "undefined" &&
            window.location.pathname !== "/login" &&
            window.location.pathname !== "/register" &&
            !window.location.pathname.startsWith("/u/") &&
            !window.location.pathname.startsWith("/profile/") &&
            window.location.pathname !== "/"
          ) {
            window.location.href = "/login";
          }
        } catch (e) {
          console.error("Error handling 401 redirect:", e);
        }
      }
      return Promise.reject(error);
    }

    // 403 Forbidden handling (CSRF Token Invalid / Expired retry)
    if (error.response?.status === 403 && originalRequest && !originalRequest._retry) {
      const isCsrfError = error.response?.data?.message?.includes?.("CSRF") ||
                          error.response?.data?.error?.includes?.("CSRF");
      if (isCsrfError) {
        originalRequest._retry = true;
        try {
          const freshXsrfToken = await fetchCsrfToken();
          if (freshXsrfToken) {
            originalRequest.headers["X-XSRF-TOKEN"] = freshXsrfToken;
          }
          return Client(originalRequest);
        } catch (retryError) {
          return Promise.reject(retryError);
        }
      }
    }

    return Promise.reject(error);
  }
);

export default Client;

import axios from "axios";
import store from "../state/Store";
import { logout } from "../state/AuthSlice";

let memoryCsrfToken = null;

/**
 * Single source of truth environment configuration
 */
export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:9080/api"
).replace(/\/+$/, "");

export const BACKEND_URL = API_BASE_URL.replace(/\/api$/, "");

export const GOOGLE_AUTH_URL = `${BACKEND_URL}/oauth2/authorization/google`;

export const FRONTEND_URL = (
  import.meta.env.VITE_FRONTEND_URL ||
  (typeof window !== "undefined" ? window.location.origin : "http://localhost:5173")
).replace(/\/+$/, "");

import { getCookie, formatApiError } from "../utils/apiUtils";
export { getCookie, formatApiError };

const Client = axios.create({
  baseURL: API_BASE_URL,
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

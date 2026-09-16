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

const Client = axios.create({
  // baseURL: "https://proctorxbackend-1.onrender.com/api",
  baseURL: "http://localhost:9080/api",
  headers: {
    "Content-Type": "application/json"
  },
  withCredentials: true,
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN"
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
    // Only attach CSRF token for mutating requests (POST, PUT, DELETE, PATCH)
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
// RESPONSE INTERCEPTOR (401 & 403 Handling)
// ==========================================
Client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 401 Unauthorized handling
    if (error.response?.status === 401) {
      const url = originalRequest?.url || "";
      const isPublicAuthCall =
        url.includes("/me") ||
        url.includes("/Login") ||
        url.includes("/Register") ||
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

    return Promise.reject(error);
  }
);

export default Client;

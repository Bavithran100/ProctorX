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
export function formatApiError(error, baseUrl = "http://localhost:9080/api") {
  if (!error) return "An unexpected error occurred. Please try again.";

  // Offline / Network Error
  if (
    error.code === "ERR_NETWORK" ||
    error.code === "ECONNREFUSED" ||
    error.message === "Network Error" ||
    (!error.response && error.request)
  ) {
    return `Backend API server is currently unreachable (${baseUrl}). Please ensure the service is running and reachable.`;
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

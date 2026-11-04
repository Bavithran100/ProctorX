import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { loginSuccess, logout } from "../../shared/state/AuthSlice";
import Client from "../../shared/api/Client";

export default function AppInitializer({ children }) {
  const dispatch = useDispatch();

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await Client.get("/me", { timeout: 3500 });
        if (res.data) {
          dispatch(
            loginSuccess({
              ...res.data,
              user: res.data.email
            })
          );
        }
      } catch {
        // Fetch CSRF token for unauthenticated visitor (with quick timeout)
        try {
          await Client.get("/auth/csrf", { timeout: 2500 });
        } catch {
          // ignore if backend offline
        }
        dispatch(logout());
      }
    }
    fetchData();
  }, [dispatch]);

  return children;
}

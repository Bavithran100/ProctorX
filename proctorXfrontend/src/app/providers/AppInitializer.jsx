import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { loginSuccess, logout } from "../../shared/state/AuthSlice";
import Client from "../../shared/api/Client";

export default function AppInitializer({ children }) {
  const dispatch = useDispatch();

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await Client.get("/me");
        if (res.data) {
          dispatch(
            loginSuccess({
              ...res.data,
              user: res.data.email
            })
          );
        }
      } catch {
        // Fetch CSRF token for unauthenticated visitor
        try {
          await Client.get("/auth/csrf");
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

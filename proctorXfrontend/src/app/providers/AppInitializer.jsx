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
        dispatch(
          loginSuccess({
            user: res.data.email,
            email: res.data.email,
            name: res.data.name,
            username: res.data.username,
            role: res.data.role,
            approved: res.data.approved,
            institution: res.data.institution,
            department: res.data.department,
            designation: res.data.designation,
            bio: res.data.bio,
            skills: res.data.skills,
            profileCompleted: res.data.profileCompleted
          })
        );
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

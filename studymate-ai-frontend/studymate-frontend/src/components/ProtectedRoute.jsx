import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-accent" style={{ animationDelay: "0ms" }} />
          <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-accent" style={{ animationDelay: "150ms" }} />
          <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-accent" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <div className="animate-fade-in flex-1 flex flex-col overflow-hidden min-h-0">{children}</div>;
}

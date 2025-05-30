import { Navigate } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "./firebase";

function ProtectedRoute({ children }) {
    const [user, loading] = useAuthState(auth);

    if (loading) return null;

    return user?.email === "anjanarajap@gmail.com" ? children : <Navigate to="/" />;
}

export default ProtectedRoute;
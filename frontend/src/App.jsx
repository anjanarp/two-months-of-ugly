import { useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { signInWithPopup } from "firebase/auth";
import { auth, provider } from "./firebase.js";

// importing internal components and styles
import ProtectedRoute from "./ProtectedRoute.jsx";
import Home from "./Home.jsx";
import SprintLog from "./SprintLog.jsx";
import "./App.css";
import uglyLogo from "./assets/tmou-logo.png";

// only this email should have access to edit mode
const my_email = import.meta.env.VITE_OWNER_EMAIL;


function App() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  // handles Google sign-in when button is clicked
  const handleLogin = () => {
    signInWithPopup(auth, provider)
      .then((result) => {
        const loggedInEmail = result.user.email;
        setUser(result.user);

        // only allow navigation if it's me
        if (loggedInEmail === my_email) {
          navigate("/home");
        } else {
          alert("You're not the creator — viewer mode coming soon.");
        }
      })
      .catch((error) => {
        console.error("Google Sign-In Error:", error);
      });
  };

  return (
    <Routes>
      <Route
        path="/"
        element={
          <div className="landing-page">
            {/* left side of landing page with tagline and login */}
            <div className="left-block">
              <p className="tagline">
                Two Months of Ugly is a public 60-day commitment to showing up daily —
                even when the work is unfinished, chaotic, or bad. It’s a sandbox for learning in public,
                building momentum, and embracing the beginner phase.
                <br /><br />
                This is a personal challenge to rewire perfectionism into persistent creation.
              </p>

              {/* triggers Google login */}
              <button className="google-btn" onClick={handleLogin}>
                <img
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                  alt="Google logo"
                  className="icon"
                />
                Continue with Google
              </button>
            </div>

            {/* right side has the logo image */}
            <div className="right-block">
              <img src={uglyLogo} alt="Two Months of Ugly logo" className="login-logo" />
            </div>
          </div>
        }
      />

      {/* this route shows the home dashboard if the logged-in user is authorized */}
      <Route
        path="/home"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />

      {/* this route shows an individual sprint’s log page */}
      <Route
        path="/home/:slug"
        element={
          <ProtectedRoute>
            <SprintLog />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;

import { useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { signInWithPopup } from "firebase/auth";
import { auth, provider } from "./firebase";

// Styling & Assets
import Home from "./Home.jsx";
import "./App.css";
import uglyLogo from "./assets/tmou-logo.png"; 

const my_email = "anjanarajap@gmail.com"; 

function App() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  const handleLogin = () => {
    signInWithPopup(auth, provider)
      .then((result) => {
        const loggedInEmail = result.user.email;
        setUser(result.user);

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
            <div className="left-block">
              <p className="tagline">
                Two Months of Ugly is a public 60-day commitment to showing up daily —
                even when the work is unfinished, chaotic, or bad. It’s a sandbox for learning in public,
                building momentum, and embracing the beginner phase.
                <br /><br />
                This is a personal challenge to rewire perfectionism into persistent creation.
              </p>
              <button className="google-btn" onClick={handleLogin}>
                <img
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                  alt="Google logo"
                  className="icon"
                />
                Continue with Google
              </button>
            </div>
            <div className="right-block">
              <img src={uglyLogo} alt="Two Months of Ugly logo" className="login-logo" />
            </div>
          </div>
        }
      />
      <Route path="/home" element={<Home />} />
    </Routes>
  );
}

export default App;

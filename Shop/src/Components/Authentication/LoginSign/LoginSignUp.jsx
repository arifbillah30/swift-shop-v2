// swift-shop-v2/Frontend/src/Components/Authentication/LoginSign/LoginSignUp.jsx

import React, { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../../../Context/authContext";
import "./LoginSignUp.css";

const API_BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:4000";

const LoginSignUp = () => {
  const [activeTab, setActiveTab] = useState("tabButton1");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [registerUsername, setRegisterUsername] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerError, setRegisterError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const handleTab = (tab) => setActiveTab(tab);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLoginError("");

    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail.trim(), password: loginPassword }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLoginError(data.message || "Login failed");
        return;
      }

      // Handle new response format: { success: true, data: { token, user }, message: "..." }
      const { token, user } = data.success ? data.data : data;
      if (!user || !token) {
        setLoginError("Unexpected response from server.");
        return;
      }

      login(user, token);
      navigate("/");
    } catch (err) {
      console.error("Login error:", err);
      setLoginError("An error occurred during login. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setRegisterError("");

    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: registerUsername.trim(),
          email: registerEmail.trim(),
          password: registerPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRegisterError(data.message || "Registration failed");
        return;
      }

      setActiveTab("tabButton1");
    } catch (err) {
      console.error("Registration error:", err);
      setRegisterError("An error occurred during registration. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="loginSignUpSection">
      <div className="loginSignUpContainer">
        <div className="loginSignUpTabs">
          <p onClick={() => handleTab("tabButton1")} className={activeTab === "tabButton1" ? "active" : ""}>
            Login
          </p>
          <p onClick={() => handleTab("tabButton2")} className={activeTab === "tabButton2" ? "active" : ""}>
            Register
          </p>
        </div>

        <div className="loginSignUpTabsContent">
          {activeTab === "tabButton1" && (
            <div className="loginSignUpTabsContentLogin">
              <form onSubmit={handleLogin}>
                <input
                  type="email"
                  placeholder="Email address *"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
                <input
                  type="password"
                  placeholder="Password *"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />

                <div className="loginSignUpForgetPass">
                  <label>
                    <input type="checkbox" className="brandRadio" />
                    <p>Remember me</p>
                  </label>
                  <p>
                    <Link to="/resetPassword">Lost password?</Link>
                  </p>
                </div>

                <button type="submit" disabled={loading}>
                  {loading ? "Please wait..." : "Log In"}
                </button>
                {loginError && <p className="error">{loginError}</p>}
              </form>

              <div className="loginSignUpTabsContentLoginText">
                <p>
                  No account yet?{" "}
                  <span onClick={() => handleTab("tabButton2")}>Create Account</span>
                </p>
              </div>
            </div>
          )}

          {activeTab === "tabButton2" && (
            <div className="loginSignUpTabsContentRegister">
              <form onSubmit={handleRegister}>
                <input
                  type="text"
                  placeholder="Username *"
                  value={registerUsername}
                  onChange={(e) => setRegisterUsername(e.target.value)}
                  required
                  autoComplete="username"
                />
                <input
                  type="email"
                  placeholder="Email address *"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
                <input
                  type="password"
                  placeholder="Password *"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
                <p>
                  Your personal data will be used to support your experience throughout this website,
                  to manage access to your account, and for other purposes described in our
                  <Link to="/terms" style={{ textDecoration: "none", color: "#c32929" }}>
                    {" "}
                    privacy policy
                  </Link>
                  .
                </p>

                <button type="submit" disabled={loading}>
                  {loading ? "Please wait..." : "Register"}
                </button>
                {registerError && <p className="error">{registerError}</p>}
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginSignUp;

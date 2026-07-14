import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      const res = mode === "login"
        ? await api.login(email, password)
        : await api.register(email, name, password);
      login(res.token, res.user);
      navigate("/");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 w-full max-w-sm">
        <img src="/nimbus-logo.png" alt="Nimbus" className="h-10 w-auto mb-1" />
        <p className="text-sm text-slate-500 mb-6 mt-3">
          {mode === "login" ? "Sign in to continue" : "Create a new account (the first account becomes super admin)"}
        </p>

        {mode === "register" && (
          <div className="mb-3">
            <label className="text-sm text-slate-600">Full name</label>
            <input className="w-full border border-slate-300 rounded-lg px-3 py-2 mt-1" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
        )}
        <div className="mb-3">
          <label className="text-sm text-slate-600">Email</label>
          <input type="email" className="w-full border border-slate-300 rounded-lg px-3 py-2 mt-1" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="mb-4">
          <label className="text-sm text-slate-600">Password</label>
          <input type="password" className="w-full border border-slate-300 rounded-lg px-3 py-2 mt-1" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        <button type="submit" className="w-full bg-slate-900 text-white rounded-lg py-2 font-medium">
          {mode === "login" ? "Sign in" : "Sign up"}
        </button>

        <button
          type="button"
          className="w-full text-sm text-slate-500 mt-3"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
        >
          {mode === "login" ? "No account? Sign up" : "Have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}

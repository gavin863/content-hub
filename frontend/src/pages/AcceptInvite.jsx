import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function AcceptInvite() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  const [invite, setInvite] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.getInvite(token).then(setInvite).catch((err) => setLoadError(err.message));
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await api.acceptInvite(token, name, password);
      login(res.token, res.user);
      navigate("/");
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  const card = "bg-white p-8 rounded-2xl shadow-sm border border-slate-200 w-full max-w-sm";

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className={card}>
          <img src="/nimbus-logo.png" alt="Nimbus" className="h-10 w-auto mb-4" />
          <p className="text-sm text-red-600">{loadError}</p>
          <button onClick={() => navigate("/login")} className="w-full bg-slate-900 text-white rounded-lg py-2 font-medium mt-4">
            Go to sign in
          </button>
        </div>
      </div>
    );
  }

  if (!invite) {
    return <div className="min-h-screen flex items-center justify-center text-slate-400">Loading…</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <form onSubmit={handleSubmit} className={card}>
        <img src="/nimbus-logo.png" alt="Nimbus" className="h-10 w-auto mb-3" />
        <p className="text-sm text-slate-600 mb-1">
          You've been invited to <span className="font-semibold">{invite.brandName}</span> as <span className="font-semibold">{invite.role}</span>.
        </p>
        <p className="text-sm text-slate-400 mb-6">{invite.email}</p>

        {invite.userExists ? (
          <p className="text-xs text-slate-500 mb-3">You already have an account. Enter your password to join this brand.</p>
        ) : (
          <div className="mb-3">
            <label className="text-sm text-slate-600">Full name</label>
            <input className="w-full border border-slate-300 rounded-lg px-3 py-2 mt-1" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
        )}

        <div className="mb-4">
          <label className="text-sm text-slate-600">{invite.userExists ? "Password" : "Choose a password"}</label>
          <input type="password" className="w-full border border-slate-300 rounded-lg px-3 py-2 mt-1" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        <button type="submit" disabled={submitting} className="w-full bg-slate-900 text-white rounded-lg py-2 font-medium disabled:opacity-50">
          {submitting ? "Joining…" : invite.userExists ? "Join brand" : "Create account & join"}
        </button>
      </form>
    </div>
  );
}

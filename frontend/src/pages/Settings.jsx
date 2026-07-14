import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api/client.js";

export default function Settings() {
  const { currentBrand } = useAuth();
  const [channels, setChannels] = useState([]);
  const [team, setTeam] = useState([]);
  const [error, setError] = useState("");

  // new channel form
  const [type, setType] = useState("facebook");
  const [name, setName] = useState("");
  const [pageId, setPageId] = useState("");
  const [pageAccessToken, setPageAccessToken] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [wpUsername, setWpUsername] = useState("");
  const [wpAppPassword, setWpAppPassword] = useState("");

  // new team member form
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState("writer");

  function load() {
    if (!currentBrand) return;
    api.channels(currentBrand.id).then(setChannels);
    api.team(currentBrand.id).then(setTeam).catch(() => setTeam([]));
  }

  useEffect(load, [currentBrand]);

  async function handleAddChannel(e) {
    e.preventDefault();
    setError("");
    const config = type === "facebook" ? { pageId, pageAccessToken } : { siteUrl, username: wpUsername, appPassword: wpAppPassword };
    try {
      await api.createChannel(currentBrand.id, { type, name, config });
      setName(""); setPageId(""); setPageAccessToken(""); setSiteUrl(""); setWpUsername(""); setWpAppPassword("");
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAddMember(e) {
    e.preventDefault();
    setError("");
    try {
      await api.addTeamMember(currentBrand.id, memberEmail, memberRole);
      setMemberEmail("");
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!currentBrand) return null;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-lg font-semibold">Settings — {currentBrand.name}</h1>
      {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}

      <section className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-semibold mb-3">Channels</h2>
        <div className="space-y-2 mb-4">
          {channels.map((c) => (
            <div key={c.id} className="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-3 py-2">
              <span>{c.name} <span className="text-slate-400">({c.type})</span></span>
              <span className={c.active ? "text-green-600" : "text-slate-400"}>{c.active ? "Active" : "Off"}</span>
            </div>
          ))}
          {channels.length === 0 && <p className="text-sm text-slate-400">No channels yet.</p>}
        </div>

        <form onSubmit={handleAddChannel} className="space-y-2 border-t border-slate-100 pt-4">
          <div className="flex gap-2">
            <select className="border border-slate-300 rounded-lg px-3 py-2 text-sm" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="facebook">Facebook</option>
              <option value="wordpress">WordPress</option>
            </select>
            <input placeholder="Friendly name, e.g. Nimbus Fanpage" className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          {type === "facebook" ? (
            <>
              <input placeholder="Page ID" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" value={pageId} onChange={(e) => setPageId(e.target.value)} required />
              <input placeholder="Page Access Token" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" value={pageAccessToken} onChange={(e) => setPageAccessToken(e.target.value)} required />
            </>
          ) : (
            <>
              <input placeholder="https://yourdomain.com" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} required />
              <input placeholder="WordPress username" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" value={wpUsername} onChange={(e) => setWpUsername(e.target.value)} required />
              <input placeholder="Application Password" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" value={wpAppPassword} onChange={(e) => setWpAppPassword(e.target.value)} required />
            </>
          )}
          <button type="submit" className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium">Add channel</button>
        </form>
      </section>

      <section className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-semibold mb-3">Members</h2>
        <div className="space-y-2 mb-4">
          {team.map((m) => (
            <div key={m.id} className="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-3 py-2">
              <span>{m.name} <span className="text-slate-400">({m.email})</span></span>
              <span className="text-slate-500">{m.role}</span>
            </div>
          ))}
          {team.length === 0 && <p className="text-sm text-slate-400">No members yet besides you.</p>}
        </div>

        <form onSubmit={handleAddMember} className="flex gap-2 border-t border-slate-100 pt-4">
          <input placeholder="Email (they must sign up first)" className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm" value={memberEmail} onChange={(e) => setMemberEmail(e.target.value)} required />
          <select className="border border-slate-300 rounded-lg px-3 py-2 text-sm" value={memberRole} onChange={(e) => setMemberRole(e.target.value)}>
            <option value="writer">Writer</option>
            <option value="approver">Approver</option>
            <option value="admin">Admin</option>
          </select>
          <button type="submit" className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium">Add</button>
        </form>
      </section>
    </div>
  );
}

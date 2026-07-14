import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api/client.js";
import { channelTheme, ChannelGlyph } from "../components/BrandMark.jsx";

// Step 1 of creating a post: pick the channel. Each channel opens its own
// dedicated composer page (/content/compose/:channelId) so the writer never
// switches channels mid-draft.
export default function NewPost() {
  const { currentBrand } = useAuth();
  const [channels, setChannels] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (currentBrand) api.channels(currentBrand.id).then(setChannels);
  }, [currentBrand]);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/")} className="text-slate-400 hover:text-slate-700 text-sm">← Back</button>
        <h1 className="text-xl font-semibold">New post</h1>
      </div>
      <p className="text-sm font-medium text-slate-600 mb-3">Choose a channel — each one has its own composer.</p>
      {channels.length === 0 ? (
        <p className="text-sm text-slate-400">No channels yet. Go to <b>Settings</b> to add a Facebook / WordPress channel.</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {channels.map((c) => {
            const t = channelTheme(c.type);
            return (
              <button
                key={c.id}
                onClick={() => navigate(`/content/compose/${c.id}`)}
                className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 text-left hover:shadow-md hover:-translate-y-0.5 transition"
              >
                <span className="inline-flex items-center justify-center rounded-xl text-white w-14 h-14 shrink-0" style={{ background: t.grad }}>
                  <ChannelGlyph type={c.type} className="w-7 h-7" />
                </span>
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900 text-lg truncate">{c.name}</div>
                  <div className="text-sm text-slate-500">{t.label} · compose &amp; publish</div>
                </div>
                <span className="ml-auto text-slate-300 group-hover:text-slate-600 text-xl">→</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

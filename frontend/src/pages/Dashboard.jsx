import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api/client.js";
import StatusBadge from "../components/StatusBadge.jsx";
import { stripHtml } from "../utils/text.js";

const STATUSES = ["", "draft", "pending_review", "changes_requested", "approved", "scheduled", "published", "failed"];
const STATUS_LABELS = {
  "": "All", draft: "Draft", pending_review: "Pending", changes_requested: "Changes",
  approved: "Approved", scheduled: "Scheduled", published: "Published", failed: "Failed"
};

export default function Dashboard() {
  const { currentBrand, user } = useAuth();
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const isApprover = user?.is_super_admin || ["approver", "admin"].includes(currentBrand?.role);

  useEffect(() => {
    if (!currentBrand) return;
    setLoading(true);
    api.content(currentBrand.id, status).then(setItems).finally(() => setLoading(false));
  }, [currentBrand, status]);

  async function handleDelete(e, item) {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm("Delete this post? This cannot be undone.")) return;
    try {
      await api.deleteContent(item.id);
      setItems((its) => its.filter((x) => x.id !== item.id));
    } catch (err) {
      window.alert(err.message || "Delete failed");
    }
  }

  if (!currentBrand) return <p className="text-slate-500">You're not part of any brand yet.</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold">Content — {currentBrand.name}</h1>
        <Link to="/content/new" className="bg-slate-900 text-white text-sm px-4 py-2 rounded-lg font-medium">
          + New post
        </Link>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`px-3 py-1.5 rounded-full text-sm border ${status === s ? "bg-slate-900 text-white border-slate-900" : "border-slate-300 text-slate-600"}`}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-slate-400 text-sm">No content yet.</p>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {items.map((item) => (
            <Link key={item.id} to={`/content/${item.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
              <div className="min-w-0">
                <p className="font-medium text-slate-900 truncate">{item.title || stripHtml(item.body).slice(0, 60)}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {item.channel_name} · {item.channel_type} · by {item.author_name}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <StatusBadge status={item.status} />
                {(item.author_id === user?.id || isApprover) && (
                  <button onClick={(e) => handleDelete(e, item)} title="Delete" className="text-slate-300 hover:text-red-500 text-sm px-1">🗑</button>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

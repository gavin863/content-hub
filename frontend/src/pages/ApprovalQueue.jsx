import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api/client.js";
import StatusBadge from "../components/StatusBadge.jsx";

export default function ApprovalQueue() {
  const { currentBrand } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentBrand) return;
    setLoading(true);
    api.content(currentBrand.id, "pending_review").then(setItems).finally(() => setLoading(false));
  }, [currentBrand]);

  if (!currentBrand) return null;

  return (
    <div>
      <h1 className="text-lg font-semibold mb-4">Chờ duyệt — {currentBrand.name}</h1>
      {loading ? (
        <p className="text-slate-400 text-sm">Đang tải...</p>
      ) : items.length === 0 ? (
        <p className="text-slate-400 text-sm">Không có bài nào đang chờ duyệt 🎉</p>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
          {items.map((item) => (
            <Link key={item.id} to={`/content/${item.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
              <div className="min-w-0">
                <p className="font-medium text-slate-900 truncate">{item.title || item.body.slice(0, 60)}</p>
                <p className="text-xs text-slate-500 mt-0.5">{item.channel_name} · {item.channel_type} · tác giả {item.author_name}</p>
              </div>
              <StatusBadge status={item.status} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

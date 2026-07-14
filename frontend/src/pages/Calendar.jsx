import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api/client.js";
import { channelTheme, ChannelGlyph } from "../components/BrandMark.jsx";
import { stripHtml } from "../utils/text.js";

const WD = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const STATUS_DOT = {
  draft: "bg-gray-400", pending_review: "bg-amber-400", changes_requested: "bg-orange-400",
  approved: "bg-blue-500", scheduled: "bg-indigo-500", published: "bg-green-500", failed: "bg-red-500"
};

const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const mondayOf = (d) => { const x = startOfDay(d); const wd = (x.getDay() + 6) % 7; return addDays(x, -wd); };

export default function Calendar() {
  const { currentBrand } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [channels, setChannels] = useState([]);
  const [hidden, setHidden] = useState(() => new Set());
  const [view, setView] = useState("month");
  const [cursor, setCursor] = useState(() => startOfDay(new Date()));

  useEffect(() => {
    if (!currentBrand) return;
    api.content(currentBrand.id, "").then(setItems);
    api.channels(currentBrand.id).then(setChannels);
  }, [currentBrand]);

  const postDate = (it) => new Date(it.scheduled_at || it.published_at || it.created_at);

  const byDay = useMemo(() => {
    const m = {};
    for (const it of items) {
      if (hidden.has(it.channel_id)) continue;
      const key = ymd(postDate(it));
      (m[key] = m[key] || []).push(it);
    }
    for (const k in m) m[k].sort((a, b) => postDate(a) - postDate(b));
    return m;
  }, [items, hidden]);

  const days = useMemo(() => {
    if (view === "week") { const start = mondayOf(cursor); return Array.from({ length: 7 }, (_, i) => addDays(start, i)); }
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = mondayOf(first);
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [cursor, view]);

  const today = startOfDay(new Date());
  const inMonth = (d) => view === "week" || d.getMonth() === cursor.getMonth();
  const move = (dir) => {
    if (view === "week") setCursor((c) => addDays(c, dir * 7));
    else setCursor((c) => new Date(c.getFullYear(), c.getMonth() + dir, 1));
  };
  const toggleChannel = (id) => setHidden((h) => { const n = new Set(h); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const label = view === "week"
    ? (() => { const s = mondayOf(cursor), e = addDays(s, 6); return `${s.getDate()}/${s.getMonth() + 1} – ${e.getDate()}/${e.getMonth() + 1}/${e.getFullYear()}`; })()
    : `Tháng ${cursor.getMonth() + 1}, ${cursor.getFullYear()}`;

  if (!currentBrand) return <p className="text-slate-500">Bạn chưa được thêm vào brand nào.</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button onClick={() => setCursor(today)} className="px-3 py-1.5 rounded-lg border border-slate-300 text-sm hover:bg-slate-50">Hôm nay</button>
          <button onClick={() => move(-1)} className="w-8 h-8 rounded-lg border border-slate-300 hover:bg-slate-50">‹</button>
          <button onClick={() => move(1)} className="w-8 h-8 rounded-lg border border-slate-300 hover:bg-slate-50">›</button>
          <h1 className="text-lg font-semibold ml-1">{label}</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-300 overflow-hidden text-sm">
            <button onClick={() => setView("month")} className={`px-3 py-1.5 ${view === "month" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"}`}>Tháng</button>
            <button onClick={() => setView("week")} className={`px-3 py-1.5 ${view === "week" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"}`}>Tuần</button>
          </div>
          <button onClick={() => navigate("/content/new")} className="bg-slate-900 text-white text-sm px-4 py-2 rounded-lg font-medium">+ Bài viết mới</button>
        </div>
      </div>

      {channels.length > 0 && (
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-xs text-slate-400 uppercase tracking-wide mr-1">Kênh</span>
          {channels.map((c) => {
            const t = channelTheme(c.type);
            const on = !hidden.has(c.id);
            return (
              <button key={c.id} onClick={() => toggleChannel(c.id)} className={`inline-flex items-center gap-1.5 rounded-full pl-1 pr-2.5 py-0.5 text-xs border transition ${on ? "" : "opacity-40"}`} style={{ borderColor: t.color, color: t.color, background: on ? t.soft : "transparent" }}>
                <span className="inline-flex items-center justify-center rounded-full w-5 h-5 text-white" style={{ background: t.grad }}><ChannelGlyph type={c.type} className="w-3 h-3" /></span>
                {c.name}
              </button>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-xl overflow-hidden border border-slate-200">
        {WD.map((w) => <div key={w} className="bg-slate-50 text-center text-xs font-medium text-slate-500 py-2">{w}</div>)}
        {days.map((d, i) => {
          const key = ymd(d);
          const list = byDay[key] || [];
          const isToday = ymd(d) === ymd(today);
          return (
            <div key={i} className={`group bg-white ${view === "week" ? "min-h-[440px]" : "min-h-[122px]"} p-1.5 flex flex-col gap-1 ${inMonth(d) ? "" : "bg-slate-50/60"}`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs w-6 h-6 flex items-center justify-center rounded-full ${isToday ? "bg-blue-600 text-white font-semibold" : inMonth(d) ? "text-slate-600" : "text-slate-300"}`}>{d.getDate()}</span>
                <button onClick={() => navigate("/content/new")} title="Thêm bài" className="text-slate-400 hover:text-slate-700 text-base leading-none opacity-0 group-hover:opacity-100 transition">+</button>
              </div>
              <div className="flex flex-col gap-1 overflow-y-auto">
                {list.map((it) => {
                  const t = channelTheme(it.channel_type);
                  const pd = postDate(it);
                  const tm = `${String(pd.getHours()).padStart(2, "0")}:${String(pd.getMinutes()).padStart(2, "0")}`;
                  const text = it.title || stripHtml(it.body);
                  return (
                    <button key={it.id} onClick={() => navigate(`/content/${it.id}`)} className="text-left rounded-md bg-slate-50 hover:bg-slate-100 border border-slate-100 px-1.5 py-1" style={{ borderLeft: `3px solid ${t.color}` }}>
                      <div className="flex items-center gap-1">
                        <span className="inline-flex items-center justify-center rounded w-4 h-4 text-white shrink-0" style={{ background: t.grad }}><ChannelGlyph type={it.channel_type} className="w-2.5 h-2.5" /></span>
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[it.status] || "bg-gray-400"}`} />
                        <span className="text-[11px] text-slate-500">{tm}</span>
                      </div>
                      <div className="text-[11px] text-slate-800 leading-snug line-clamp-2 mt-0.5">{text || "(trống)"}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

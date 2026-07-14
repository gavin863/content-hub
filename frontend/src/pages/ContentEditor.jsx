import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api/client.js";
import StatusBadge from "../components/StatusBadge.jsx";

export default function ContentEditor() {
  const { id } = useParams();
  const isNew = id === "new";
  const { currentBrand, user } = useAuth();
  const navigate = useNavigate();

  const [channels, setChannels] = useState([]);
  const [channelId, setChannelId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [item, setItem] = useState(null);
  const [comment, setComment] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!currentBrand) return;
    api.channels(currentBrand.id).then(setChannels);
  }, [currentBrand]);

  useEffect(() => {
    if (isNew) return;
    api.contentItem(id).then((data) => {
      setItem(data);
      setTitle(data.title || "");
      setBody(data.body);
      setChannelId(data.channel_id);
    });
  }, [id, isNew]);

  async function handleSave(andSubmit) {
    setSaving(true);
    setError("");
    try {
      let saved;
      const mediaUrls = mediaUrl ? [mediaUrl] : [];
      if (isNew) {
        saved = await api.createContent({ brandId: currentBrand.id, channelId, title, body, mediaUrls });
      } else {
        saved = await api.updateContent(id, { title, body, mediaUrls });
      }
      if (andSubmit) {
        saved = await api.submitContent(saved.id);
      }
      navigate(`/content/${saved.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleApprove() {
    setError("");
    try {
      const updated = await api.approveContent(id, scheduledAt ? new Date(scheduledAt).toISOString() : null);
      setItem(updated);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRequestChanges() {
    setError("");
    try {
      const updated = await api.requestChanges(id, comment);
      setItem(updated);
      setComment("");
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAddComment() {
    if (!comment.trim()) return;
    await api.addComment(id, comment);
    const refreshed = await api.contentItem(id);
    setItem(refreshed);
    setComment("");
  }

  async function handleRetryPublish() {
    setError("");
    try {
      const updated = await api.publishNow(id);
      setItem(updated);
    } catch (err) {
      setError(err.message);
    }
  }

  const canEdit = isNew || (item && ["draft", "changes_requested"].includes(item.status) && item.author_id === user.id);
  const canSubmit = !isNew && item && ["draft", "changes_requested"].includes(item.status) && item.author_id === user.id;
  const canApprove = !isNew && item && item.status === "pending_review";
  const canRetry = !isNew && item && item.status === "failed";

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold">{isNew ? "Bài viết mới" : "Chi tiết bài viết"}</h1>
        {item && <StatusBadge status={item.status} />}
      </div>

      {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2 mb-4">{error}</div>}

      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        {isNew && (
          <div>
            <label className="text-sm text-slate-600">Kênh đăng</label>
            <select className="w-full border border-slate-300 rounded-lg px-3 py-2 mt-1" value={channelId} onChange={(e) => setChannelId(e.target.value)}>
              <option value="">-- chọn kênh --</option>
              {channels.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="text-sm text-slate-600">Tiêu đề (dùng cho WordPress, không bắt buộc với Facebook)</label>
          <input className="w-full border border-slate-300 rounded-lg px-3 py-2 mt-1" value={title} onChange={(e) => setTitle(e.target.value)} disabled={!canEdit} />
        </div>

        <div>
          <label className="text-sm text-slate-600">Nội dung</label>
          <textarea rows={8} className="w-full border border-slate-300 rounded-lg px-3 py-2 mt-1" value={body} onChange={(e) => setBody(e.target.value)} disabled={!canEdit} />
        </div>

        <div>
          <label className="text-sm text-slate-600">Ảnh (URL, tùy chọn)</label>
          <input className="w-full border border-slate-300 rounded-lg px-3 py-2 mt-1" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} disabled={!canEdit} placeholder="https://..." />
        </div>

        {canEdit && (
          <div className="flex gap-2 pt-2">
            <button onClick={() => handleSave(false)} disabled={saving} className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium">
              Lưu nháp
            </button>
            <button onClick={() => handleSave(true)} disabled={saving} className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium">
              Gửi duyệt
            </button>
          </div>
        )}

        {canApprove && (
          <div className="border-t border-slate-100 pt-4 space-y-3">
            <div>
              <label className="text-sm text-slate-600">Lên lịch đăng (bỏ trống = đăng ngay khi duyệt)</label>
              <input type="datetime-local" className="w-full border border-slate-300 rounded-lg px-3 py-2 mt-1" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <button onClick={handleApprove} className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium">
                Duyệt {scheduledAt ? "& lên lịch" : "& đăng ngay"}
              </button>
              <button onClick={handleRequestChanges} className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium">
                Yêu cầu sửa
              </button>
            </div>
          </div>
        )}

        {canRetry && (
          <div className="border-t border-slate-100 pt-4">
            <button onClick={handleRetryPublish} className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium">
              Thử đăng lại
            </button>
          </div>
        )}

        {item?.external_post_id && item.status === "published" && (
          <p className="text-xs text-slate-500">ID bài đăng: {item.external_post_id}</p>
        )}
      </div>

      {!isNew && item && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mt-4">
          <h2 className="text-sm font-semibold mb-3">Trao đổi / feedback</h2>
          <div className="space-y-2 mb-3">
            {item.comments?.length ? item.comments.map((c) => (
              <div key={c.id} className="text-sm bg-slate-50 rounded-lg px-3 py-2">
                <span className="font-medium">{c.user_name}: </span>{c.comment}
              </div>
            )) : <p className="text-sm text-slate-400">Chưa có bình luận.</p>}
          </div>
          <div className="flex gap-2">
            <input className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Viết bình luận..." />
            <button onClick={handleAddComment} className="px-3 py-2 rounded-lg border border-slate-300 text-sm">Gửi</button>
          </div>
        </div>
      )}
    </div>
  );
}

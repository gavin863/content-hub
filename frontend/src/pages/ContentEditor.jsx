import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api/client.js";
import StatusBadge from "../components/StatusBadge.jsx";
import RichTextEditor from "../components/RichTextEditor.jsx";
import { channelTheme, ChannelGlyph, BrandAvatar } from "../components/BrandMark.jsx";

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
      const mu = Array.isArray(data.media_urls) ? data.media_urls : [];
      setMediaUrl(mu[0] || "");
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
      if (andSubmit) saved = await api.submitContent(saved.id);
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
  const canApprove = !isNew && item && item.status === "pending_review";
  const canRetry = !isNew && item && item.status === "failed";

  const channelType = isNew ? channels.find((c) => c.id === channelId)?.type : item?.channel_type;
  const isWordPress = channelType === "wordpress";
  const theme = channelTheme(channelType);
  const channelName = isNew ? channels.find((c) => c.id === channelId)?.name : item?.channel_name;

  // ---- sub-views -------------------------------------------------------

  const FacebookPreview = () => (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="p-3 flex items-center gap-2.5">
        <BrandAvatar name={currentBrand?.name} size={40} />
        <div className="leading-tight">
          <div className="font-semibold text-[15px] text-slate-900">{currentBrand?.name}</div>
          <div className="text-xs text-slate-500 flex items-center gap-1">Vừa xong · <span>🌐</span> Công khai</div>
        </div>
      </div>
      <div className="px-3 pb-3 whitespace-pre-wrap text-[15px] text-slate-800 min-h-[40px]">
        {body ? body : <span className="text-slate-400">Nội dung bài đăng sẽ hiển thị ở đây…</span>}
      </div>
      {mediaUrl ? (
        <img src={mediaUrl} alt="" className="w-full max-h-[360px] object-cover border-t border-slate-100" onError={(e) => (e.currentTarget.style.display = "none")} />
      ) : null}
      <div className="px-2 py-1 border-t border-slate-100 grid grid-cols-3 text-slate-500 text-sm font-medium">
        <span className="flex items-center justify-center gap-1.5 py-2 hover:bg-slate-50 rounded">👍 Thích</span>
        <span className="flex items-center justify-center gap-1.5 py-2 hover:bg-slate-50 rounded">💬 Bình luận</span>
        <span className="flex items-center justify-center gap-1.5 py-2 hover:bg-slate-50 rounded">↗ Chia sẻ</span>
      </div>
    </div>
  );

  const WordPressPreview = () => (
    <article className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 sm:p-8">
      <h1 className="text-[26px] leading-tight font-bold text-slate-900" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
        {title || <span className="text-slate-400">Tiêu đề bài viết</span>}
      </h1>
      <div className="flex items-center gap-2 text-xs text-slate-500 mt-2 mb-5 pb-4 border-b border-slate-100">
        <BrandAvatar name={user?.name} size={22} grad="linear-gradient(135deg,#64748B,#334155)" />
        bởi {user?.name} · hôm nay · <span className="inline-flex items-center gap-1" style={{ color: theme.color }}><ChannelGlyph type="wordpress" className="w-3.5 h-3.5" /> {channelName}</span>
      </div>
      <div className="richtext" dangerouslySetInnerHTML={{ __html: body || "<p style='color:#94a3b8'>Nội dung bài viết sẽ hiển thị ở đây…</p>" }} />
    </article>
  );

  const Preview = () => (
    <div>
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Xem trước {isWordPress ? "bài viết" : "bài đăng"}</p>
      {isWordPress ? <WordPressPreview /> : <FacebookPreview />}
    </div>
  );

  const FacebookEditor = () => (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 text-white" style={{ background: theme.grad }}>
        <ChannelGlyph type="facebook" className="w-5 h-5" />
        <span className="font-semibold">Soạn bài Facebook</span>
        <span className="ml-auto text-xs opacity-90">{channelName}</span>
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2.5 mb-3">
          <BrandAvatar name={currentBrand?.name} size={40} />
          <div className="leading-tight">
            <div className="font-semibold text-[15px] text-slate-900">{currentBrand?.name}</div>
            <span className="text-xs text-slate-600 bg-slate-100 rounded-full px-2 py-0.5 inline-flex items-center gap-1 mt-0.5">🌐 Công khai</span>
          </div>
        </div>
        <textarea
          rows={9}
          className="w-full text-[17px] placeholder:text-slate-400 border-0 focus:ring-0 focus:outline-none resize-none p-0"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={!canEdit}
          placeholder="Bạn đang nghĩ gì?"
        />
        <div className="mt-3 border-t border-slate-100 pt-3">
          <label className="text-xs font-medium text-slate-500">Ảnh đính kèm (URL)</label>
          <input
            className="w-full border border-slate-300 rounded-lg px-3 py-2 mt-1 text-sm"
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
            disabled={!canEdit}
            placeholder="https://…"
          />
          {mediaUrl ? (
            <img src={mediaUrl} alt="" className="mt-2 rounded-lg max-h-40 object-cover border border-slate-200" onError={(e) => (e.currentTarget.style.display = "none")} />
          ) : null}
        </div>
      </div>
    </div>
  );

  const WordPressEditor = () => (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 text-white" style={{ background: theme.grad }}>
        <ChannelGlyph type="wordpress" className="w-5 h-5" />
        <span className="font-semibold">Soạn bài WordPress</span>
        <span className="ml-auto text-xs opacity-90">{channelName}</span>
      </div>
      <div className="p-4 space-y-3">
        <input
          className="w-full text-2xl font-bold text-slate-900 placeholder:text-slate-300 border-0 focus:ring-0 focus:outline-none p-0"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={!canEdit}
          placeholder="Tiêu đề bài viết…"
        />
        <RichTextEditor value={body} onChange={setBody} editable={canEdit} />
      </div>
    </div>
  );

  // ---- render ----------------------------------------------------------

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="text-slate-400 hover:text-slate-700 text-sm">← Quay lại</button>
          <h1 className="text-xl font-semibold">{isNew ? "Bài viết mới" : "Chi tiết bài viết"}</h1>
        </div>
        {item && <StatusBadge status={item.status} />}
      </div>

      {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2 mb-4 border border-red-100">{error}</div>}

      {isNew && (
        <div className="mb-5">
          <p className="text-sm font-medium text-slate-600 mb-2">Chọn kênh đăng</p>
          {channels.length === 0 ? (
            <p className="text-sm text-slate-400">Chưa có kênh nào. Vào <b>Cài đặt</b> để thêm kênh Facebook / WordPress.</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {channels.map((c) => {
                const t = channelTheme(c.type);
                const active = channelId === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setChannelId(c.id)}
                    className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${active ? "ring-2 shadow-sm" : "hover:border-slate-300"}`}
                    style={active ? { borderColor: t.color, boxShadow: `0 0 0 3px ${t.ring}` } : { borderColor: "#e2e8f0" }}
                  >
                    <span className="inline-flex items-center justify-center rounded-lg text-white w-10 h-10 shrink-0" style={{ background: t.grad }}>
                      <ChannelGlyph type={c.type} className="w-5 h-5" />
                    </span>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 truncate">{c.name}</div>
                      <div className="text-xs text-slate-500">{t.label}</div>
                    </div>
                    {active && <span className="ml-auto text-white text-xs rounded-full px-2 py-0.5" style={{ background: t.color }}>Đã chọn</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {channelType ? (
        canEdit ? (
          <div className="grid lg:grid-cols-2 gap-5 items-start">
            {isWordPress ? <WordPressEditor /> : <FacebookEditor />}
            <div className="lg:sticky lg:top-5"><Preview /></div>
          </div>
        ) : (
          <div className="max-w-2xl"><Preview /></div>
        )
      ) : (
        isNew && channels.length > 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-400">
            Chọn một kênh ở trên để bắt đầu soạn bài.
          </div>
        )
      )}

      {/* actions */}
      {channelType && (
        <div className="mt-5 flex flex-wrap gap-2">
          {canEdit && (
            <>
              <button onClick={() => handleSave(false)} disabled={saving} className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium hover:bg-slate-50">
                Lưu nháp
              </button>
              <button onClick={() => handleSave(true)} disabled={saving} className="px-5 py-2 rounded-lg text-white text-sm font-medium shadow-sm" style={{ background: theme.color }}>
                Gửi duyệt
              </button>
            </>
          )}
          {canRetry && (
            <button onClick={handleRetryPublish} className="px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium">
              Thử đăng lại
            </button>
          )}
        </div>
      )}

      {canApprove && (
        <div className="mt-4 bg-white rounded-xl border border-slate-200 p-5 max-w-2xl">
          <h2 className="text-sm font-semibold mb-3">Duyệt bài</h2>
          <label className="text-sm text-slate-600">Lên lịch đăng (bỏ trống = đăng ngay khi duyệt)</label>
          <input type="datetime-local" className="w-full border border-slate-300 rounded-lg px-3 py-2 mt-1 mb-3" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
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

      {item?.external_post_id && item.status === "published" && (
        <p className="text-xs text-slate-500 mt-3">ID bài đăng: {item.external_post_id}</p>
      )}

      {!isNew && item && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mt-5 max-w-2xl">
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

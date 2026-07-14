import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import EmojiPicker from "emoji-picker-react";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api/client.js";
import StatusBadge from "../components/StatusBadge.jsx";
import RichTextEditor from "../components/RichTextEditor.jsx";
import { channelTheme, ChannelGlyph, BrandAvatar } from "../components/BrandMark.jsx";

// NOTE: all sub-views below are inline JSX (const nodes), NOT nested components.
// Defining components inside the render remounts them every keystroke and drops
// input focus after one character — so everything stays inline here.
export default function ContentEditor() {
  const { id, channelId } = useParams();
  const isNew = !!channelId; // /content/compose/:channelId → new draft on a fixed channel
  const { currentBrand, user } = useAuth();
  const navigate = useNavigate();

  const [channel, setChannel] = useState(null); // resolved channel for a new draft
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [item, setItem] = useState(null);
  const [comment, setComment] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const bodyRef = useRef(null);

  function insertEmoji(emoji) {
    const ta = bodyRef.current;
    if (!ta) { setBody((b) => b + emoji); return; }
    const start = ta.selectionStart ?? body.length;
    const end = ta.selectionEnd ?? body.length;
    setBody((b) => b.slice(0, start) + emoji + b.slice(end));
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + emoji.length;
      ta.setSelectionRange(pos, pos);
    });
  }

  async function handleUploadMedia(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      const url = await api.uploadFile(file);
      setMediaUrl(url);
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  useEffect(() => {
    if (!isNew || !currentBrand) return;
    api.channels(currentBrand.id).then((chs) => setChannel(chs.find((c) => c.id === channelId) || null));
  }, [isNew, channelId, currentBrand]);

  useEffect(() => {
    if (isNew) return;
    api.contentItem(id).then((data) => {
      setItem(data);
      setTitle(data.title || "");
      setBody(data.body);
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
    } catch (err) { setError(err.message); }
  }

  async function handleRequestChanges() {
    setError("");
    try {
      const updated = await api.requestChanges(id, comment);
      setItem(updated);
      setComment("");
    } catch (err) { setError(err.message); }
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
    } catch (err) { setError(err.message); }
  }

  const canEdit = isNew || (item && ["draft", "changes_requested"].includes(item.status) && item.author_id === user.id);
  const canApprove = !isNew && item && item.status === "pending_review";
  const canRetry = !isNew && item && item.status === "failed";

  const channelType = isNew ? channel?.type : item?.channel_type;
  const channelName = isNew ? channel?.name : item?.channel_name;
  const isWordPress = channelType === "wordpress";
  const theme = channelTheme(channelType);

  // ---- inline nodes ----------------------------------------------------

  const facebookEditor = (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 px-4 py-3 text-white rounded-t-xl" style={{ background: theme.grad }}>
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
          ref={bodyRef}
          rows={9}
          className="w-full text-[17px] placeholder:text-slate-400 border-0 focus:ring-0 focus:outline-none resize-none p-0"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={!canEdit}
          placeholder="Bạn đang nghĩ gì?"
        />
        {canEdit && (
          <div className="flex justify-end">
            <div className="relative">
              <button type="button" onClick={() => setShowEmoji((v) => !v)} className="text-xl w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center" title="Chèn emoji">😊</button>
              {showEmoji && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowEmoji(false)} />
                  <div className="absolute right-0 top-full mt-1 z-50">
                    <EmojiPicker
                      onEmojiClick={(e) => insertEmoji(e.emoji)}
                      emojiStyle="native"
                      height={360}
                      width={320}
                      lazyLoadEmojis
                      previewConfig={{ showPreview: false }}
                      searchPlaceholder="Tìm emoji…"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}
        <div className="mt-3 border-t border-slate-100 pt-3">
          {mediaUrl ? (
            <div className="relative inline-block">
              <img src={mediaUrl} alt="" className="rounded-lg max-h-56 object-cover border border-slate-200" onError={(e) => (e.currentTarget.style.display = "none")} />
              {canEdit && (
                <button type="button" onClick={() => setMediaUrl("")} className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full w-7 h-7 flex items-center justify-center text-lg leading-none">×</button>
              )}
            </div>
          ) : (
            <label className={`inline-flex items-center gap-2 text-sm font-medium border border-dashed border-slate-300 rounded-lg px-4 py-3 ${canEdit && !uploading ? "cursor-pointer text-slate-600 hover:bg-slate-50 hover:border-slate-400" : "text-slate-400"}`}>
              <span className="text-base">🖼️</span>
              {uploading ? "Đang tải ảnh…" : "Thêm ảnh / video"}
              <input type="file" accept="image/*" className="hidden" onChange={handleUploadMedia} disabled={!canEdit || uploading} />
            </label>
          )}
          {uploadError && <p className="text-xs text-red-600 mt-1">{uploadError}</p>}
        </div>
      </div>
    </div>
  );

  const wordpressEditor = (
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

  const editorNode = isWordPress ? wordpressEditor : facebookEditor;

  const facebookPreview = (
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
        <span className="flex items-center justify-center gap-1.5 py-2">👍 Thích</span>
        <span className="flex items-center justify-center gap-1.5 py-2">💬 Bình luận</span>
        <span className="flex items-center justify-center gap-1.5 py-2">↗ Chia sẻ</span>
      </div>
    </div>
  );

  const wordpressPreview = (
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

  const previewNode = isWordPress ? wordpressPreview : facebookPreview;

  const channelBadge = channelType ? (
    <span className="inline-flex items-center gap-2 rounded-full pl-1 pr-3 py-1 text-sm font-medium" style={{ background: theme.soft, color: theme.color }}>
      <span className="inline-flex items-center justify-center rounded-full w-6 h-6 text-white" style={{ background: theme.grad }}>
        <ChannelGlyph type={channelType} className="w-3.5 h-3.5" />
      </span>
      {channelName}
    </span>
  ) : null;

  // Feedback / action panel shown on the RIGHT for an existing post.
  const feedbackPanel = (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      {(canEdit || canApprove || canRetry) && (
        <div className="p-4 border-b border-slate-100 space-y-3">
          {canEdit && (
            <div className="flex gap-2">
              <button onClick={() => handleSave(false)} disabled={saving} className="flex-1 px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium hover:bg-slate-50">Lưu nháp</button>
              <button onClick={() => handleSave(true)} disabled={saving} className="flex-1 px-4 py-2 rounded-lg text-white text-sm font-medium shadow-sm" style={{ background: theme.color }}>Gửi duyệt</button>
            </div>
          )}
          {canApprove && (
            <>
              <div>
                <label className="text-xs font-medium text-slate-500">Lên lịch (bỏ trống = đăng ngay)</label>
                <input type="datetime-local" className="w-full border border-slate-300 rounded-lg px-3 py-2 mt-1 text-sm" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <button onClick={handleApprove} className="flex-1 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium">Duyệt {scheduledAt ? "& lên lịch" : "& đăng"}</button>
                <button onClick={handleRequestChanges} className="flex-1 px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium">Yêu cầu sửa</button>
              </div>
            </>
          )}
          {canRetry && (
            <button onClick={handleRetryPublish} className="w-full px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium">Thử đăng lại</button>
          )}
          {item?.external_post_id && item.status === "published" && (
            <p className="text-xs text-slate-500">Đã đăng · ID: {item.external_post_id}</p>
          )}
        </div>
      )}
      <div className="p-4">
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          Feedback
          {item?.comments?.length ? <span className="text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5">{item.comments.length}</span> : null}
        </h2>
        <div className="space-y-3 mb-3 max-h-[50vh] overflow-y-auto">
          {item?.comments?.length ? item.comments.map((c) => (
            <div key={c.id} className="flex gap-2">
              <BrandAvatar name={c.user_name} size={28} grad="linear-gradient(135deg,#7C3AED,#A855F7)" />
              <div className="min-w-0 flex-1">
                <div className="text-xs text-slate-500 mb-0.5">{c.user_name}</div>
                <div className="text-sm bg-slate-50 rounded-lg px-3 py-2 text-slate-800 break-words">{c.comment}</div>
              </div>
            </div>
          )) : <p className="text-sm text-slate-400">Chưa có bình luận nào.</p>}
        </div>
        <div className="flex gap-2">
          <input className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Nói gì đó…" onKeyDown={(e) => { if (e.key === "Enter") handleAddComment(); }} />
          <button onClick={handleAddComment} className="px-3 py-2 rounded-lg bg-slate-900 text-white text-sm">Gửi</button>
        </div>
      </div>
    </div>
  );

  // ---- render ----------------------------------------------------------

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(isNew ? "/content/new" : "/")} className="text-slate-400 hover:text-slate-700 text-sm">← Quay lại</button>
          <h1 className="text-xl font-semibold">{isNew ? "Bài viết mới" : "Chi tiết bài viết"}</h1>
          {channelBadge}
        </div>
        {item && <StatusBadge status={item.status} />}
      </div>

      {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2 mb-4 border border-red-100">{error}</div>}

      {!channelType ? (
        <p className="text-slate-400 text-sm">Đang tải…</p>
      ) : isNew ? (
        <>
          <div className="grid lg:grid-cols-2 gap-5 items-start">
            <div>{editorNode}</div>
            <div className="lg:sticky lg:top-5">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Xem trước {isWordPress ? "bài viết" : "bài đăng"}</p>
              {previewNode}
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button onClick={() => handleSave(false)} disabled={saving} className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium hover:bg-slate-50">Lưu nháp</button>
            <button onClick={() => handleSave(true)} disabled={saving} className="px-5 py-2 rounded-lg text-white text-sm font-medium shadow-sm" style={{ background: theme.color }}>Gửi duyệt</button>
          </div>
        </>
      ) : item ? (
        <div className="grid lg:grid-cols-[1fr_360px] gap-5 items-start">
          <div>
            {canEdit ? editorNode : (
              <>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Xem trước {isWordPress ? "bài viết" : "bài đăng"}</p>
                {previewNode}
              </>
            )}
          </div>
          <aside className="lg:sticky lg:top-5">{feedbackPanel}</aside>
        </div>
      ) : (
        <p className="text-slate-400 text-sm">Đang tải…</p>
      )}
    </div>
  );
}

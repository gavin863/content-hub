import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import EmojiPicker from "emoji-picker-react";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api/client.js";
import StatusBadge from "../components/StatusBadge.jsx";
import RichTextEditor from "../components/RichTextEditor.jsx";
import { channelTheme, ChannelGlyph, BrandAvatar } from "../components/BrandMark.jsx";

// ISO timestamp -> value for <input type="datetime-local"> (local time).
const toLocalInput = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

// NOTE: all sub-views below are inline JSX (const nodes), NOT nested components,
// so inputs keep focus while typing (nested components remount every keystroke).
export default function ContentEditor() {
  const { id, channelId } = useParams();
  const isNew = !!channelId; // /content/compose/:channelId → new draft on a fixed channel
  const { currentBrand, user } = useAuth();
  const navigate = useNavigate();

  const [channel, setChannel] = useState(null);
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

  function insertEmoji(emoji) {
    const ta = bodyRef.current;
    if (!ta) { setBody((b) => b + emoji); return; }
    const start = ta.selectionStart ?? body.length;
    const end = ta.selectionEnd ?? body.length;
    setBody((b) => b.slice(0, start) + emoji + b.slice(end));
    requestAnimationFrame(() => { ta.focus(); const pos = start + emoji.length; ta.setSelectionRange(pos, pos); });
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
      setScheduledAt(toLocalInput(data.scheduled_at));
    });
  }, [id, isNew]);

  async function handleSave(andSubmit) {
    setSaving(true);
    setError("");
    try {
      let saved;
      const mediaUrls = mediaUrl ? [mediaUrl] : [];
      const schedIso = scheduledAt ? new Date(scheduledAt).toISOString() : null;
      if (isNew) {
        saved = await api.createContent({ brandId: currentBrand.id, channelId, title, body, mediaUrls, scheduledAt: schedIso });
      } else {
        saved = await api.updateContent(id, { title, body, mediaUrls, scheduledAt: schedIso });
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
      const updated = await api.approveContent(id);
      setItem(updated);
    } catch (err) { setError(err.message); }
  }

  async function handleSchedule() {
    setError("");
    if (!scheduledAt) { setError("Pick a date & time first"); return; }
    try {
      const updated = await api.scheduleContent(id, new Date(scheduledAt).toISOString());
      setItem(updated);
      setScheduledAt("");
    } catch (err) { setError(err.message); }
  }

  async function handleUnschedule() {
    setError("");
    try {
      const updated = await api.unscheduleContent(id);
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

  async function handleDelete() {
    if (!window.confirm("Delete this post? This cannot be undone.")) return;
    setError("");
    try {
      await api.deleteContent(id);
      navigate("/");
    } catch (err) { setError(err.message); }
  }

  const canEdit = isNew || (item && ["draft", "changes_requested"].includes(item.status) && item.author_id === user.id);
  const isApprover = user?.is_super_admin || ["approver", "admin"].includes(currentBrand?.role);
  const canReview = isApprover && item && item.status === "pending_review";
  const canManagePublish = isApprover && item && ["approved", "scheduled"].includes(item.status);
  const canRetry = isApprover && item && item.status === "failed";
  const canDelete = !isNew && item && (item.author_id === user.id || isApprover);

  const channelType = isNew ? channel?.type : item?.channel_type;
  const channelName = isNew ? channel?.name : item?.channel_name;
  const isWordPress = channelType === "wordpress";
  const theme = channelTheme(channelType);

  // ---- inline nodes ----------------------------------------------------

  const scheduleField = canEdit ? (
    <div className="mt-3 border-t border-slate-100 pt-3">
      <label className="text-xs font-medium text-slate-500">📅 Planned publish date (optional)</label>
      <input type="datetime-local" className="block border border-slate-300 rounded-lg px-3 py-2 mt-1 text-sm" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
      <p className="text-[11px] text-slate-400 mt-1">Auto-publishes at this time <b>once approved</b>. If it isn't approved by then, it won't go out.</p>
    </div>
  ) : null;

  const facebookEditor = (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 px-4 py-3 text-white rounded-t-xl" style={{ background: theme.grad }}>
        <ChannelGlyph type="facebook" className="w-5 h-5" />
        <span className="font-semibold">Compose for Facebook</span>
        <span className="ml-auto text-xs opacity-90">{channelName}</span>
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2.5 mb-3">
          <BrandAvatar name={currentBrand?.name} size={40} />
          <div className="leading-tight">
            <div className="font-semibold text-[15px] text-slate-900">{currentBrand?.name}</div>
            <span className="text-xs text-slate-600 bg-slate-100 rounded-full px-2 py-0.5 inline-flex items-center gap-1 mt-0.5">🌐 Public</span>
          </div>
        </div>
        <textarea
          ref={bodyRef}
          rows={9}
          className="w-full text-[17px] placeholder:text-slate-400 border-0 focus:ring-0 focus:outline-none resize-none p-0"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={!canEdit}
          placeholder="What's on your mind?"
        />
        {canEdit && (
          <div className="flex justify-end">
            <div className="relative">
              <button type="button" onClick={() => setShowEmoji((v) => !v)} className="text-xl w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center" title="Insert emoji">😊</button>
              {showEmoji && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowEmoji(false)} />
                  <div className="absolute right-0 top-full mt-1 z-50">
                    <EmojiPicker onEmojiClick={(e) => insertEmoji(e.emoji)} emojiStyle="native" height={360} width={320} lazyLoadEmojis previewConfig={{ showPreview: false }} />
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
              {uploading ? "Uploading…" : "Add photo / video"}
              <input type="file" accept="image/*" className="hidden" onChange={handleUploadMedia} disabled={!canEdit || uploading} />
            </label>
          )}
          {uploadError && <p className="text-xs text-red-600 mt-1">{uploadError}</p>}
        </div>
        {scheduleField}
      </div>
    </div>
  );

  const wordpressEditor = (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 px-4 py-3 text-white rounded-t-xl" style={{ background: theme.grad }}>
        <ChannelGlyph type="wordpress" className="w-5 h-5" />
        <span className="font-semibold">Compose for WordPress</span>
        <span className="ml-auto text-xs opacity-90">{channelName}</span>
      </div>
      <div className="p-4 space-y-3">
        <input
          className="w-full text-2xl font-bold text-slate-900 placeholder:text-slate-300 border-0 focus:ring-0 focus:outline-none p-0"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={!canEdit}
          placeholder="Post title…"
        />
        <RichTextEditor value={body} onChange={setBody} editable={canEdit} />
        {scheduleField}
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
          <div className="text-xs text-slate-500 flex items-center gap-1">Just now · <span>🌐</span> Public</div>
        </div>
      </div>
      <div className="px-3 pb-3 whitespace-pre-wrap text-[15px] text-slate-800 min-h-[40px]">
        {body ? body : <span className="text-slate-400">Your post will appear here…</span>}
      </div>
      {mediaUrl ? (
        <img src={mediaUrl} alt="" className="w-full max-h-[360px] object-cover border-t border-slate-100" onError={(e) => (e.currentTarget.style.display = "none")} />
      ) : null}
      <div className="px-2 py-1 border-t border-slate-100 grid grid-cols-3 text-slate-500 text-sm font-medium">
        <span className="flex items-center justify-center gap-1.5 py-2">👍 Like</span>
        <span className="flex items-center justify-center gap-1.5 py-2">💬 Comment</span>
        <span className="flex items-center justify-center gap-1.5 py-2">↗ Share</span>
      </div>
    </div>
  );

  // Read-only rendered WordPress article (used when reviewing, not editing).
  const wordpressArticle = (
    <article className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 sm:p-8">
      <h1 className="text-[26px] leading-tight font-bold text-slate-900" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
        {title || <span className="text-slate-400">Untitled</span>}
      </h1>
      <div className="flex items-center gap-2 text-xs text-slate-500 mt-2 mb-5 pb-4 border-b border-slate-100">
        <BrandAvatar name={item?.author_name || user?.name} size={22} grad="linear-gradient(135deg,#64748B,#334155)" />
        by {item?.author_name || user?.name} · <span className="inline-flex items-center gap-1" style={{ color: theme.color }}><ChannelGlyph type="wordpress" className="w-3.5 h-3.5" /> {channelName}</span>
      </div>
      <div className="richtext" dangerouslySetInnerHTML={{ __html: body || "<p style='color:#94a3b8'>(empty)</p>" }} />
    </article>
  );

  const channelBadge = channelType ? (
    <span className="inline-flex items-center gap-2 rounded-full pl-1 pr-3 py-1 text-sm font-medium" style={{ background: theme.soft, color: theme.color }}>
      <span className="inline-flex items-center justify-center rounded-full w-6 h-6 text-white" style={{ background: theme.grad }}>
        <ChannelGlyph type={channelType} className="w-3.5 h-3.5" />
      </span>
      {channelName}
    </span>
  ) : null;

  const feedbackPanel = (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      {(canEdit || canReview || canManagePublish || canRetry) && (
        <div className="p-4 border-b border-slate-100 space-y-3">
          {canEdit && (
            <div className="flex gap-2">
              <button onClick={() => handleSave(false)} disabled={saving} className="flex-1 px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium hover:bg-slate-50">Save draft</button>
              <button onClick={() => handleSave(true)} disabled={saving} className="flex-1 px-4 py-2 rounded-lg text-white text-sm font-medium shadow-sm" style={{ background: theme.color }}>Submit for review</button>
            </div>
          )}

          {/* Step 1: review — approve or send back. No scheduling here. */}
          {canReview && (
            <div className="flex gap-2">
              <button onClick={handleApprove} className="flex-1 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium">Approve</button>
              <button onClick={handleRequestChanges} className="flex-1 px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium">Request changes</button>
            </div>
          )}

          {/* Step 2 (after approved): publish now OR schedule for later. */}
          {canManagePublish && (
            <>
              {item.scheduled_at && (
                <div className="text-xs bg-indigo-50 text-indigo-700 rounded-lg px-3 py-2 flex items-center justify-between">
                  <span>⏰ Auto-publishes {new Date(item.scheduled_at).toLocaleString()}</span>
                  <button onClick={handleUnschedule} className="underline hover:no-underline">Clear</button>
                </div>
              )}
              <button onClick={handleRetryPublish} className="w-full px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ background: theme.color }}>Publish now</button>
              <div>
                <label className="text-xs font-medium text-slate-500">{item.scheduled_at ? "Reschedule" : "Or schedule for later"}</label>
                <div className="flex gap-2 mt-1">
                  <input type="datetime-local" className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
                  <button onClick={handleSchedule} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium">{item.status === "scheduled" ? "Update" : "Schedule"}</button>
                </div>
              </div>
            </>
          )}

          {canRetry && (
            <button onClick={handleRetryPublish} className="w-full px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium">Retry publish</button>
          )}
          {item?.external_post_id && item.status === "published" && (
            <p className="text-xs text-slate-500">Published · ID: {item.external_post_id}</p>
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
          )) : <p className="text-sm text-slate-400">No comments yet.</p>}
        </div>
        <div className="flex gap-2">
          <input className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Say something…" onKeyDown={(e) => { if (e.key === "Enter") handleAddComment(); }} />
          <button onClick={handleAddComment} className="px-3 py-2 rounded-lg bg-slate-900 text-white text-sm">Send</button>
        </div>
        {canDelete && (
          <button onClick={handleDelete} className="mt-4 w-full text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg py-2 border border-transparent hover:border-red-100">🗑 Delete post</button>
        )}
      </div>
    </div>
  );

  const actionsRow = (
    <div className="mt-5 flex flex-wrap gap-2">
      <button onClick={() => handleSave(false)} disabled={saving} className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium hover:bg-slate-50">Save draft</button>
      <button onClick={() => handleSave(true)} disabled={saving} className="px-5 py-2 rounded-lg text-white text-sm font-medium shadow-sm" style={{ background: theme.color }}>Submit for review</button>
    </div>
  );

  // ---- render ----------------------------------------------------------

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(isNew ? "/content/new" : "/")} className="text-slate-400 hover:text-slate-700 text-sm">← Back</button>
          <h1 className="text-xl font-semibold">{isNew ? "New post" : "Post details"}</h1>
          {channelBadge}
        </div>
        {item && <StatusBadge status={item.status} />}
      </div>

      {error && <div className="bg-red-50 text-red-700 text-sm rounded-lg px-3 py-2 mb-4 border border-red-100">{error}</div>}

      {!channelType ? (
        <p className="text-slate-400 text-sm">Loading…</p>
      ) : isNew ? (
        isWordPress ? (
          <>
            {editorNode}
            {actionsRow}
          </>
        ) : (
          <>
            <div className="grid lg:grid-cols-2 gap-5 items-start">
              <div>{editorNode}</div>
              <div className="lg:sticky lg:top-5">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Preview</p>
                {facebookPreview}
              </div>
            </div>
            {actionsRow}
          </>
        )
      ) : item ? (
        <div className="grid lg:grid-cols-[1fr_360px] gap-5 items-start">
          <div>
            {canEdit ? editorNode : isWordPress ? wordpressArticle : (
              <>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Preview</p>
                {facebookPreview}
              </>
            )}
          </div>
          <aside className="lg:sticky lg:top-5">{feedbackPanel}</aside>
        </div>
      ) : (
        <p className="text-slate-400 text-sm">Loading…</p>
      )}
    </div>
  );
}

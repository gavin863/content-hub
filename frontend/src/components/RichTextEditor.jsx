import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { api } from "../api/client.js";

// A channel-aware rich text editor used for WordPress content. Outputs HTML
// (via editor.getHTML()) which the backend sends straight into the WordPress
// post `content`. StarterKit already provides headings, bold/italic, lists,
// blockquote and undo/redo; we add links and inline images on top.
const btn = (active) =>
  `px-2 py-1 rounded text-sm border ${
    active ? "bg-slate-900 text-white border-slate-900" : "border-slate-300 text-slate-700 hover:bg-slate-100"
  }`;

export default function RichTextEditor({ value, onChange, editable = true }) {
  const fileRef = useRef(null);
  const [uploadingImg, setUploadingImg] = useState(false);
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, autolink: true }),
      Image
    ],
    content: value || "",
    editable,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: { class: "richtext min-h-[440px] px-3 py-2 focus:outline-none" }
    }
  });

  // Load server content when it arrives / changes without clobbering typing.
  useEffect(() => {
    if (editor && value !== undefined && value !== editor.getHTML()) {
      editor.commands.setContent(value || "", false);
    }
  }, [value, editor]);

  useEffect(() => {
    if (editor) editor.setEditable(editable);
  }, [editable, editor]);

  if (!editor) return null;

  const setLink = () => {
    const prev = editor.getAttributes("link").href || "";
    const url = window.prompt("Nhập URL liên kết (để trống để xoá link):", prev);
    if (url === null) return;
    if (url === "") return editor.chain().focus().extendMarkRange("link").unsetLink().run();
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const onImageSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImg(true);
    try {
      const url = await api.uploadFile(file);
      editor.chain().focus().setImage({ src: url }).run();
    } catch (err) {
      window.alert(err.message || "Tải ảnh thất bại");
    } finally {
      setUploadingImg(false);
      e.target.value = "";
    }
  };

  return (
    <div className="border border-slate-300 rounded-lg overflow-hidden">
      {editable && (
        <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 px-2 py-1.5">
          <button type="button" className={btn(editor.isActive("heading", { level: 1 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>H1</button>
          <button type="button" className={btn(editor.isActive("heading", { level: 2 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</button>
          <button type="button" className={btn(editor.isActive("heading", { level: 3 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</button>
          <span className="w-px bg-slate-300 mx-1" />
          <button type="button" className={btn(editor.isActive("bold"))} onClick={() => editor.chain().focus().toggleBold().run()}><b>B</b></button>
          <button type="button" className={btn(editor.isActive("italic"))} onClick={() => editor.chain().focus().toggleItalic().run()}><i>I</i></button>
          <button type="button" className={btn(editor.isActive("strike"))} onClick={() => editor.chain().focus().toggleStrike().run()}><s>S</s></button>
          <span className="w-px bg-slate-300 mx-1" />
          <button type="button" className={btn(editor.isActive("bulletList"))} onClick={() => editor.chain().focus().toggleBulletList().run()}>• Danh sách</button>
          <button type="button" className={btn(editor.isActive("orderedList"))} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1. Số</button>
          <button type="button" className={btn(editor.isActive("blockquote"))} onClick={() => editor.chain().focus().toggleBlockquote().run()}>❝ Trích</button>
          <span className="w-px bg-slate-300 mx-1" />
          <button type="button" className={btn(editor.isActive("link"))} onClick={setLink}>🔗 Link</button>
          <button type="button" className={btn(false)} onClick={() => fileRef.current?.click()} disabled={uploadingImg}>{uploadingImg ? "⏳ Đang tải…" : "🖼 Ảnh"}</button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onImageSelected} />
          <span className="w-px bg-slate-300 mx-1" />
          <button type="button" className={btn(false)} onClick={() => editor.chain().focus().undo().run()}>↶</button>
          <button type="button" className={btn(false)} onClick={() => editor.chain().focus().redo().run()}>↷</button>
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}

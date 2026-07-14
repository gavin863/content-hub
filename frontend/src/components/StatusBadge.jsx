const STYLES = {
  draft: "bg-gray-100 text-gray-700",
  pending_review: "bg-amber-100 text-amber-700",
  changes_requested: "bg-orange-100 text-orange-700",
  approved: "bg-blue-100 text-blue-700",
  scheduled: "bg-indigo-100 text-indigo-700",
  published: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700"
};

const LABELS = {
  draft: "Nháp",
  pending_review: "Chờ duyệt",
  changes_requested: "Cần sửa",
  approved: "Đã duyệt",
  scheduled: "Đã lên lịch",
  published: "Đã đăng",
  failed: "Lỗi đăng bài"
};

export default function StatusBadge({ status }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STYLES[status] || "bg-gray-100 text-gray-700"}`}>
      {LABELS[status] || status}
    </span>
  );
}

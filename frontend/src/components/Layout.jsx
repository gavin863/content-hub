import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Layout({ children }) {
  const { user, brands, currentBrand, switchBrand, logout } = useAuth();
  const navigate = useNavigate();

  const linkClass = ({ isActive }) =>
    `px-3 py-2 rounded-lg text-sm font-medium ${isActive ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="font-semibold text-slate-900">Content Hub</span>
            <nav className="flex gap-1">
              <NavLink to="/" end className={linkClass}>Bảng nội dung</NavLink>
              <NavLink to="/calendar" className={linkClass}>Lịch</NavLink>
              <NavLink to="/approvals" className={linkClass}>Duyệt bài</NavLink>
              <NavLink to="/settings" className={linkClass}>Cài đặt</NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {brands.length > 0 && (
              <select
                className="border border-slate-300 rounded-lg text-sm px-2 py-1.5"
                value={currentBrand?.id || ""}
                onChange={(e) => switchBrand(brands.find((b) => b.id === e.target.value))}
              >
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            )}
            <span className="text-sm text-slate-500">{user?.name}</span>
            <button
              className="text-sm text-slate-500 hover:text-slate-900"
              onClick={() => { logout(); navigate("/login"); }}
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}

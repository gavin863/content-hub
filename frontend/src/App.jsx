import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import Layout from "./components/Layout.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import NewPost from "./pages/NewPost.jsx";
import ContentEditor from "./pages/ContentEditor.jsx";
import ApprovalQueue from "./pages/ApprovalQueue.jsx";
import Settings from "./pages/Settings.jsx";

function Private({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400">Đang tải...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Private><Dashboard /></Private>} />
      <Route path="/content/new" element={<Private><NewPost /></Private>} />
      <Route path="/content/compose/:channelId" element={<Private><ContentEditor /></Private>} />
      <Route path="/content/:id" element={<Private><ContentEditor /></Private>} />
      <Route path="/approvals" element={<Private><ApprovalQueue /></Private>} />
      <Route path="/settings" element={<Private><Settings /></Private>} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

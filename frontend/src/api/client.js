const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

function getToken() {
  return localStorage.getItem("token");
}

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      ...options.headers
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

async function uploadFile(file) {
  const res = await fetch(`${API_URL}/uploads`, {
    method: "POST",
    headers: { ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) },
    body: (() => { const fd = new FormData(); fd.append("file", file); return fd; })()
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Tải ảnh thất bại");
  return data.url;
}

export const api = {
  uploadFile,
  login: (email, password) => request("/auth/login", { method: "POST", body: { email, password } }),
  register: (email, name, password) => request("/auth/register", { method: "POST", body: { email, name, password } }),
  me: () => request("/auth/me"),

  brands: () => request("/brands"),
  createBrand: (name, slug) => request("/brands", { method: "POST", body: { name, slug } }),

  channels: (brandId) => request(`/brands/${brandId}/channels?brandId=${brandId}`),
  createChannel: (brandId, payload) => request(`/brands/${brandId}/channels`, { method: "POST", body: { brandId, ...payload } }),
  updateChannel: (brandId, channelId, payload) => request(`/brands/${brandId}/channels/${channelId}`, { method: "PUT", body: { brandId, ...payload } }),

  team: (brandId) => request(`/brands/${brandId}/team?brandId=${brandId}`),
  addTeamMember: (brandId, email, role) => request(`/brands/${brandId}/team`, { method: "POST", body: { brandId, email, role } }),

  content: (brandId, status) => request(`/content?brandId=${brandId}${status ? `&status=${status}` : ""}`),
  contentItem: (id) => request(`/content/${id}`),
  createContent: (payload) => request("/content", { method: "POST", body: payload }),
  updateContent: (id, payload) => request(`/content/${id}`, { method: "PUT", body: payload }),
  submitContent: (id) => request(`/content/${id}/submit`, { method: "POST" }),
  approveContent: (id) => request(`/content/${id}/approve`, { method: "POST" }),
  scheduleContent: (id, scheduledAt) => request(`/content/${id}/schedule`, { method: "POST", body: { scheduledAt } }),
  unscheduleContent: (id) => request(`/content/${id}/unschedule`, { method: "POST" }),
  requestChanges: (id, reason) => request(`/content/${id}/request-changes`, { method: "POST", body: { reason } }),
  addComment: (id, comment) => request(`/content/${id}/comments`, { method: "POST", body: { comment } }),
  publishNow: (id) => request(`/content/${id}/publish-now`, { method: "POST" })
};

export function saveSession(token, user) {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

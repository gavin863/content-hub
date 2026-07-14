import { createContext, useContext, useEffect, useState } from "react";
import { api, saveSession, clearSession } from "../api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [brands, setBrands] = useState([]);
  const [currentBrand, setCurrentBrand] = useState(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const { user, brands } = await api.me();
      setUser(user);
      setBrands(brands);
      const savedBrandId = localStorage.getItem("currentBrandId");
      setCurrentBrand(brands.find((b) => b.id === savedBrandId) || brands[0] || null);
    } catch {
      clearSession();
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function login(token, user) {
    saveSession(token, user);
    refresh();
  }

  function logout() {
    clearSession();
    setUser(null);
    setBrands([]);
    setCurrentBrand(null);
  }

  function switchBrand(brand) {
    setCurrentBrand(brand);
    localStorage.setItem("currentBrandId", brand.id);
  }

  return (
    <AuthContext.Provider value={{ user, brands, currentBrand, loading, login, logout, switchBrand, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

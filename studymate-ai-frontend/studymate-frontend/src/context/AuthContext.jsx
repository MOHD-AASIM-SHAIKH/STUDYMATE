import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getMe, loginUser, performLogout, refreshToken, registerUser } from "../api/auth";

const AuthContext = createContext(null);

const TOKEN_KEY = "studymate_access_token";
const REFRESH_KEY = "studymate_refresh_token";

function getStoredToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function storeTokens(access, refresh) {
  try {
    localStorage.setItem(TOKEN_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  } catch {
    // localStorage may be unavailable
  }
}

function clearTokens() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  } catch {
    // noop
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Try restoring the session from stored tokens on mount
  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setLoading(false);
      return;
    }
    getMe()
      .then((u) => setUser(u))
      .catch(() => {
        // Token invalid — try refresh
        const storedRefresh = localStorage.getItem(REFRESH_KEY);
        if (storedRefresh) {
          refreshToken(storedRefresh)
            .then((res) => {
              storeTokens(res.access_token, res.refresh_token);
              setUser(res.user);
            })
            .catch(() => {
              clearTokens();
            })
            .finally(() => setLoading(false));
        } else {
          clearTokens();
          setLoading(false);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await loginUser({ email, password });
    storeTokens(res.access_token, res.refresh_token);
    setUser(res.user);
    return res.user;
  }, []);

  const register = useCallback(async (email, password, displayName) => {
    const res = await registerUser({ email, password, displayName });
    storeTokens(res.access_token, res.refresh_token);
    setUser(res.user);
    return res.user;
  }, []);

  const logout = useCallback(() => {
    const storedRefresh = localStorage.getItem(REFRESH_KEY);
    if (storedRefresh) {
      performLogout(storedRefresh).catch(() => {});
    }
    clearTokens();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, isAuthenticated: !!user }),
    [user, loading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

export { getStoredToken, storeTokens, clearTokens };

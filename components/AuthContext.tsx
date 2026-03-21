'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface User { id: number; name: string; email: string; }
interface AuthCtx {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  loading: boolean;
}

const Ctx = createContext<AuthCtx>({ user: null, token: null, login: () => {}, logout: () => {}, loading: true });

// Single global provider — keeps auth state alive across page navigations
let globalToken: string | null = null;
let globalUser: User | null = null;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(globalUser);
  const [token, setToken] = useState<string | null>(globalToken);
  const [loading, setLoading] = useState(!globalToken);

  useEffect(() => {
    if (globalToken) { setLoading(false); return; }
    const t = localStorage.getItem('token');
    const u = localStorage.getItem('user');
    if (t && u) {
      const parsed = JSON.parse(u);
      globalToken = t;
      globalUser = parsed;
      setToken(t);
      setUser(parsed);
    }
    setLoading(false);
  }, []);

  const login = (t: string, u: User) => {
    globalToken = t;
    globalUser = u;
    setToken(t);
    setUser(u);
    localStorage.setItem('token', t);
    localStorage.setItem('user', JSON.stringify(u));
  };

  const logout = () => {
    globalToken = null;
    globalUser = null;
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return <Ctx.Provider value={{ user, token, login, logout, loading }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);

"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";

interface AuthContextType {
  user: { name: string; email: string } | null;
  login: (name: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ name: string; email: string } | null>(
    null,
  );
  const router = useRouter();

  // Check local storage on load (so refresh doesn't log you out)
  useEffect(() => {
    const storedUser = localStorage.getItem("rfi_demo_user");
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  const login = (name: string) => {
    const fakeUser = { name, email: `${name.toLowerCase()}@demo.com` };
    setUser(fakeUser);
    localStorage.setItem("rfi_demo_user", JSON.stringify(fakeUser));
    router.push("/dashboard"); // Auto-redirect to dashboard
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("rfi_demo_user");
    router.push("/");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}

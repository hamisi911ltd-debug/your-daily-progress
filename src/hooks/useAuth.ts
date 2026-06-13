import { useEffect, useState } from "react";
import {
  getTokenPayload,
  clearStoredToken,
  jwtToUser,
  type AuthUser,
} from "@/integrations/cloudflare/auth";

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  function sync() {
    const payload = getTokenPayload();
    setUser(payload ? jwtToUser(payload) : null);
    setLoading(false);
  }

  useEffect(() => {
    sync();
    window.addEventListener("cc:auth:change", sync);
    return () => window.removeEventListener("cc:auth:change", sync);
  }, []);

  function signOut() {
    clearStoredToken();
  }

  return { user, loading, signOut };
}

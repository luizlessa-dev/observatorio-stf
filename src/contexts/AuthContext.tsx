import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { getAssinatura } from "../lib/auth";

interface Assinatura { plano: "mensal" | "anual"; status: string; vigente_ate: string }

interface AuthCtx {
  user:       User | null;
  assinante:  boolean;
  assinatura: Assinatura | null;
  loading:    boolean;
}

const Ctx = createContext<AuthCtx>({ user: null, assinante: false, assinatura: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,       setUser]       = useState<User | null>(null);
  const [assinatura, setAssinatura] = useState<Assinatura | null>(null);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      if (data.session?.user?.email) {
        getAssinatura(data.session.user.email).then(setAssinatura);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_ev, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u?.email) getAssinatura(u.email).then(setAssinatura);
      else setAssinatura(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <Ctx.Provider value={{ user, assinante: assinatura?.status === "ativa", assinatura, loading }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);

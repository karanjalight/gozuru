"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export type AuthUser = {
  id: string;
  email: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    email: string,
    password: string,
    profile?: { firstName?: string; lastName?: string },
  ) => Promise<{ needsEmailVerification: boolean }>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const mapAuthUser = (authUser: { id: string; email?: string | null } | null): AuthUser | null =>
      authUser?.email ? { id: authUser.id, email: authUser.email } : null;

    supabase.auth
      .getUser()
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) {
          console.error("Failed to load authenticated user:", error.message);
          setUser(null);
        } else {
          setUser(mapAuthUser(data.user));
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(mapAuthUser(session?.user ?? null));
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value: AuthContextValue = {
    user,
    loading,
    login: async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw new Error(error.message);
    },
    signup: async (email: string, password: string, profile) => {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            first_name: profile?.firstName?.trim() || undefined,
            last_name: profile?.lastName?.trim() || undefined,
          },
        },
      });

      if (error) throw new Error(error.message);

      const hasSession = Boolean(data.session);
      return { needsEmailVerification: !hasSession };
    },
    logout: () => {
      void supabase.auth.signOut().then(({ error }) => {
        if (error) {
          console.error("Failed to sign out:", error.message);
        }
      });
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}


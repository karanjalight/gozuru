"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type SupabaseAuthUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
};

export type AuthUser = {
  id: string;
  email: string;
  metadata: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    location?: string;
    role?: string;
    headline?: string;
    bio?: string;
    professionalTitle?: string;
    yearsOfExperience?: string;
    skills?: string;
    languages?: string;
    website?: string;
    linkedin?: string;
    portfolioUrl?: string;
    avatarUrl?: string;
  };
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    email: string,
    password: string,
    profile?: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      location?: string;
      role?: "client" | "expert";
    },
  ) => Promise<{ needsEmailVerification: boolean }>;
  updateProfile: (profile: AuthUser["metadata"]) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const mapAuthUser = (authUser: SupabaseAuthUser | null): AuthUser | null => {
  if (!authUser?.email) return null;
  const metadata = authUser.user_metadata ?? {};
  return {
    id: authUser.id,
    email: authUser.email,
    metadata: {
      firstName: typeof metadata.first_name === "string" ? metadata.first_name : undefined,
      lastName: typeof metadata.last_name === "string" ? metadata.last_name : undefined,
      phone: typeof metadata.phone === "string" ? metadata.phone : undefined,
      location: typeof metadata.location === "string" ? metadata.location : undefined,
      role: typeof metadata.role === "string" ? metadata.role : undefined,
      headline: typeof metadata.headline === "string" ? metadata.headline : undefined,
      bio: typeof metadata.bio === "string" ? metadata.bio : undefined,
      professionalTitle:
        typeof metadata.professional_title === "string" ? metadata.professional_title : undefined,
      yearsOfExperience:
        typeof metadata.years_of_experience === "string" ? metadata.years_of_experience : undefined,
      skills: typeof metadata.skills === "string" ? metadata.skills : undefined,
      languages: typeof metadata.languages === "string" ? metadata.languages : undefined,
      website: typeof metadata.website === "string" ? metadata.website : undefined,
      linkedin: typeof metadata.linkedin === "string" ? metadata.linkedin : undefined,
      portfolioUrl: typeof metadata.portfolio_url === "string" ? metadata.portfolio_url : undefined,
      avatarUrl: typeof metadata.avatar_url === "string" ? metadata.avatar_url : undefined,
    },
  };
};

function toAvatarStoragePath(avatarUrl?: string | null): string | null {
  const value = avatarUrl?.trim();
  if (!value) return null;
  if (!value.startsWith("http://") && !value.startsWith("https://")) {
    return value;
  }

  const publicMarker = "/storage/v1/object/public/avatars/";
  const renderMarker = "/storage/v1/render/image/public/avatars/";
  const marker = value.includes(publicMarker) ? publicMarker : value.includes(renderMarker) ? renderMarker : null;
  if (!marker) {
    // Keep external URLs as-is so chat/avatar UIs can still render them.
    return value;
  }

  const afterMarker = value.split(marker)[1] ?? "";
  const pathWithoutQuery = afterMarker.split("?")[0] ?? "";
  if (!pathWithoutQuery) return null;
  return decodeURIComponent(pathWithoutQuery);
}

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
            phone: profile?.phone?.trim() || undefined,
            location: profile?.location?.trim() || undefined,
            role: profile?.role ?? "client",
          },
        },
      });

      if (error) throw new Error(error.message);

      const hasSession = Boolean(data.session);
      return { needsEmailVerification: !hasSession };
    },
    updateProfile: async (profile) => {
      if (!user) throw new Error("Authentication required.");

      const { error } = await supabase.auth.updateUser({
        data: {
          first_name: profile.firstName?.trim() || null,
          last_name: profile.lastName?.trim() || null,
          phone: profile.phone?.trim() || null,
          location: profile.location?.trim() || null,
          role: profile.role?.trim() || "client",
          headline: profile.headline?.trim() || null,
          bio: profile.bio?.trim() || null,
          professional_title: profile.professionalTitle?.trim() || null,
          years_of_experience: profile.yearsOfExperience?.trim() || null,
          skills: profile.skills?.trim() || null,
          languages: profile.languages?.trim() || null,
          website: profile.website?.trim() || null,
          linkedin: profile.linkedin?.trim() || null,
          portfolio_url: profile.portfolioUrl?.trim() || null,
          avatar_url: profile.avatarUrl?.trim() || null,
        },
      });

      if (error) throw new Error(error.message);

      const avatarPath = toAvatarStoragePath(profile.avatarUrl);
      const { error: profileSyncError } = await supabase
        .from("profiles")
        .upsert(
          {
            user_id: user.id,
            email: user.email,
            first_name: profile.firstName?.trim() || null,
            last_name: profile.lastName?.trim() || null,
            phone: profile.phone?.trim() || null,
            bio: profile.bio?.trim() || null,
            avatar_path: avatarPath,
          },
          { onConflict: "user_id" },
        );

      if (profileSyncError) throw new Error(profileSyncError.message);

      const { data: refreshed, error: refreshError } = await supabase.auth.getUser();
      if (refreshError) {
        throw new Error(refreshError.message);
      }
      setUser(mapAuthUser(refreshed.user));
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


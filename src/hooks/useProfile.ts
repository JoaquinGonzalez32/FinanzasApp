import { useState, useEffect, useCallback } from "react";
import type { Profile, ProfileUpdate } from "../types/database";
import * as svc from "../services/profileService";
import { supabase } from "../lib/supabase";

interface UseProfileResult {
  profile: Profile | null;
  email: string | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  saveProfile: (updates: ProfileUpdate) => Promise<Profile>;
}

export function useProfile(): UseProfileResult {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setEmail(user?.email ?? null);

      const data = await svc.getProfile();
      setProfile(data);
    } catch (e: any) {
      setError(e.message ?? "Error loading profile");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const saveProfile = useCallback(
    async (updates: ProfileUpdate) => {
      const saved = await svc.upsertProfile(updates);
      setProfile(saved);
      return saved;
    },
    []
  );

  return { profile, email, loading, error, refresh: fetch, saveProfile };
}

import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Profile, ProfileUpdate } from "../types/database";
import * as svc from "../services/profileService";
import { supabase } from "../lib/supabase";
import { qk, queryClient } from "../lib/queryClient";

interface UseProfileResult {
  profile: Profile | null;
  email: string | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  saveProfile: (updates: ProfileUpdate) => Promise<Profile>;
}

export function useProfile(): UseProfileResult {
  const query = useQuery({
    queryKey: qk.profile,
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const profile = await svc.getProfile();
      return { profile, email: user?.email ?? null };
    },
  });

  const refresh = useCallback(async () => {
    await query.refetch();
  }, [query]);

  const saveProfile = useCallback(async (updates: ProfileUpdate) => {
    const saved = await svc.upsertProfile(updates);
    queryClient.setQueryData(qk.profile, (prev: any) => ({
      ...(prev ?? { email: null }),
      profile: saved,
    }));
    return saved;
  }, []);

  return {
    profile: query.data?.profile ?? null,
    email: query.data?.email ?? null,
    loading: query.isPending,
    error: query.error ? (query.error as Error).message : null,
    refresh,
    saveProfile,
  };
}

import { normalizeProfile } from "@/lib/roleMapping";
import { supabase } from "@/lib/supabaseClient";
import type { Profile } from "@/types";

const AVATAR_BUCKET = "avatars";
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export async function uploadProfileAvatar(userId: string, file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please upload an image file.");
  }
  if (file.size > MAX_AVATAR_BYTES) {
    throw new Error("Profile photo must be 2 MB or smaller.");
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/avatar.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
}

export async function updateOwnProfile(input: {
  firstName: string;
  middleInitial: string;
  lastName: string;
  avatarUrl?: string | null;
}): Promise<Profile> {
  const { data, error } = await supabase.rpc("update_own_profile", {
    p_first_name: input.firstName,
    p_middle_initial: input.middleInitial,
    p_last_name: input.lastName,
    p_avatar_url: input.avatarUrl ?? null,
  });

  if (error) throw error;

  const profile = normalizeProfile(data as Profile);

  await supabase.auth.updateUser({
    data: {
      full_name: profile.full_name ?? "",
      avatar_url: profile.avatar_url ?? "",
    },
  });

  return profile;
}

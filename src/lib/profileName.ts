import type { Profile } from "@/types";

export interface ProfileNameParts {
  firstName: string;
  middleInitial: string;
  lastName: string;
}

export function buildFullName(firstName: string, middleInitial: string, lastName: string): string {
  return [firstName.trim(), middleInitial.trim(), lastName.trim()].filter(Boolean).join(" ");
}

export function parseFullName(fullName: string | null | undefined): ProfileNameParts {
  const trimmed = fullName?.trim() ?? "";
  if (!trimmed) {
    return { firstName: "", middleInitial: "", lastName: "" };
  }

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return { firstName: parts[0], middleInitial: "", lastName: "" };
  }
  if (parts.length === 2) {
    return { firstName: parts[0], middleInitial: "", lastName: parts[1] };
  }

  return {
    firstName: parts[0],
    middleInitial: parts.slice(1, -1).join(" "),
    lastName: parts[parts.length - 1],
  };
}

export function getProfileNameParts(profile: Profile | null | undefined): ProfileNameParts {
  if (!profile) {
    return { firstName: "", middleInitial: "", lastName: "" };
  }

  if (profile.first_name || profile.middle_initial || profile.last_name) {
    return {
      firstName: profile.first_name?.trim() ?? "",
      middleInitial: profile.middle_initial?.trim() ?? "",
      lastName: profile.last_name?.trim() ?? "",
    };
  }

  return parseFullName(profile.full_name);
}

export function getProfileFirstName(profile: Profile | null | undefined): string {
  return getProfileNameParts(profile).firstName;
}

export function getProfileShortName(profile: Profile | null | undefined): string {
  const parts = getProfileNameParts(profile);
  const shortName = [parts.firstName, parts.lastName].filter(Boolean).join(" ");
  return shortName || profile?.full_name?.trim() || "";
}

export function getProfileDisplayName(profile: Profile | null | undefined): string {
  if (!profile) return "";

  const built = buildFullName(
    profile.first_name ?? "",
    profile.middle_initial ?? "",
    profile.last_name ?? "",
  );
  return built || profile.full_name?.trim() || "";
}

export function getProfileInitials(profile: Profile | null | undefined, fallback = "U"): string {
  const parts = getProfileNameParts(profile);
  const first = parts.firstName[0]?.toUpperCase() ?? "";
  const last = parts.lastName[0]?.toUpperCase() ?? "";

  if (first && last) return `${first}${last}`;
  if (first) return first;

  const displayName = getProfileDisplayName(profile);
  if (!displayName) return fallback;

  return displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || fallback;
}

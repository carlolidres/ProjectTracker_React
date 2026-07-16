/** Build-time app identity from Vite define + optional env overrides. */

declare const __APP_VERSION__: string | undefined;
declare const __APP_GIT_SHA__: string | undefined;

function readDefine(value: string | undefined, fallback: string): string {
  const text = String(value ?? "").trim();
  return text || fallback;
}

export function getAppVersion(): string {
  const fromEnv = String(import.meta.env.VITE_APP_VERSION ?? "").trim();
  if (fromEnv) return fromEnv;
  return readDefine(typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : undefined, "0.0.0");
}

export function getAppGitSha(): string {
  const fromEnv = String(import.meta.env.VITE_APP_GIT_SHA ?? "").trim();
  if (fromEnv) return fromEnv.slice(0, 7);
  return readDefine(typeof __APP_GIT_SHA__ !== "undefined" ? __APP_GIT_SHA__ : undefined, "local");
}

export function getAppVersionLabel(): string {
  const version = getAppVersion();
  const sha = getAppGitSha();
  return sha && sha !== "local" ? `v${version} (${sha})` : `v${version}`;
}

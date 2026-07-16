import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

function readPackageVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(path.resolve(__dirname, "package.json"), "utf8")) as {
      version?: string;
    };
    return String(pkg.version ?? "0.0.0");
  } catch {
    return "0.0.0";
  }
}

function readGitSha(): string {
  const fromCi = String(process.env.GITHUB_SHA ?? process.env.VITE_APP_GIT_SHA ?? "").trim();
  if (fromCi) return fromCi.slice(0, 7);
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "local";
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const appVersion = env.VITE_APP_VERSION || readPackageVersion();
  const appGitSha = (env.VITE_APP_GIT_SHA || readGitSha()).slice(0, 7);
  return {
    plugins: [react()],
    base: env.VITE_BASE_PATH || "/ProjectTracker_React/",
    define: {
      __APP_VERSION__: JSON.stringify(appVersion),
      __APP_GIT_SHA__: JSON.stringify(appGitSha),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});

declare global {
  interface Window {
    __LULU_API_BASE_URL__?: string;
    __LULU_GITHUB_DATA__?: {
      owner: string;
      repo: string;
    };
  }
}

export function apiUrl(path: string): string {
  const base =
    typeof window === "undefined"
      ? ""
      : (window.__LULU_API_BASE_URL__ || "").replace(/\/$/, "");

  if (!base || !path.startsWith("/")) return path;
  return `${base}${path}`;
}

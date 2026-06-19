// GitHub repo → prompt library import (client-side).
//
// This app is a static-export desktop build (output: "export") with no Node
// server, so import must run in the browser/Tauri webview — there is no
// `/api/*` backend in the packaged app. This helper fetches a repo's zipball
// from the GitHub API and extracts every .md file into prompt-library items.
//
// Call from a client component, e.g.:
//   const { prompts } = await importGithubPrompts(repoUrl, token);
import JSZip from "jszip";

export interface ImportedPrompt {
  id: string;
  title: string;
  category: string;
  subcategory: string;
  body: string;
  tags: string[];
  modes: string[];
  nsfw: boolean;
  mediaType: string;
  createdAt: number;
  updatedAt: number;
}

export interface GithubImportResult {
  prompts: ImportedPrompt[];
}

function titleFromFilename(relativePath: string): string {
  const parts = relativePath.split("/");
  const filename = parts[parts.length - 1];
  const base = filename
    .replace(/\.md$/i, "")
    .replace(/[_-]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim();
  return base
    .split(" ")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/**
 * Import all markdown files from a public (or token-authorized) GitHub repo
 * as prompt-library items. Throws Error with a readable message on failure.
 */
export async function importGithubPrompts(
  repoUrl: string,
  token?: string,
): Promise<GithubImportResult> {
  if (!repoUrl || !repoUrl.trim()) {
    throw new Error("Missing repo. Use a URL or user/repo.");
  }

  // Normalize "https://github.com/user/repo.git" → "user/repo".
  let repoPath = repoUrl.trim();
  repoPath = repoPath.replace(/^https?:\/\/github\.com\//i, "");
  repoPath = repoPath.replace(/\.git$/i, "");
  repoPath = repoPath.replace(/\/$/, "");

  const parts = repoPath.split("/");
  if (parts.length < 2) {
    throw new Error("Invalid GitHub repository format. Use user/repo.");
  }
  const [owner, repo] = parts;

  const zipUrl = `https://api.github.com/repos/${owner}/${repo}/zipball`;
  const headers: Record<string, string> = {
    "User-Agent": "Nexus-AI-Studio-Importer",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(zipUrl, { headers });
  if (!response.ok) {
    throw new Error(`Failed to fetch repository: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  const items: ImportedPrompt[] = [];
  for (const [relativePath, file] of Object.entries(zip.files)) {
    if (file.dir) continue;
    if (!relativePath.toLowerCase().endsWith(".md")) continue;

    const content = await file.async("string");
    if (!content.trim()) continue;

    const now = Date.now();
    items.push({
      id: crypto.randomUUID(),
      title: titleFromFilename(relativePath),
      category: "Imported",
      subcategory: "GitHub Repo",
      body: content,
      tags: [],
      modes: ["T2T"],
      nsfw: false,
      mediaType: "text",
      createdAt: now,
      updatedAt: now,
    });
  }

  return { prompts: items };
}

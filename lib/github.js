// Atomic multi-file commit to GitHub via the Git Data API.
//
// Sequence: read the current ref/commit/tree -> diff candidate files against
// the tree's blob shas (skip anything unchanged) -> create blobs for what
// changed -> create one new tree -> create one commit -> move the branch ref.
// One commit, one push, one Vercel deploy, regardless of how many files
// changed in a save. force:false on the final ref update means a concurrent
// save (branch moved underneath us) fails loudly instead of clobbering.

import { createHash } from "node:crypto";

const API = "https://api.github.com";

function env() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN is not set");
  return {
    token,
    owner: process.env.GITHUB_OWNER || "bismasiddiqi22-boop",
    repo: process.env.GITHUB_REPO || "bismasiddiqi",
    branch: process.env.TARGET_BRANCH || "main",
  };
}

async function gh(path, token, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const err = new Error(`GitHub API ${options.method || "GET"} ${path} -> ${res.status}: ${body}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

// Git's blob sha is sha1("blob " + byteLength + "\0" + content) over the raw bytes.
function gitBlobSha(buf) {
  const header = Buffer.from(`blob ${buf.length}\0`, "utf8");
  return createHash("sha1").update(Buffer.concat([header, buf])).digest("hex");
}

/**
 * @param {Object} params
 * @param {Record<string,string>} params.textFiles - path -> utf8 content
 * @param {Record<string,string>} params.imageFiles - path -> base64 content (no data: prefix)
 * @param {string[]} params.deletePaths - paths to remove from the tree
 * @param {string} params.message - commit message
 * @param {boolean} [params.dryRun] - compute the changed-file plan (via local blob-sha
 *   diffing against the real current tree) but stop before creating any blobs, tree,
 *   commit, or moving the ref. No writes of any kind happen to GitHub in this mode.
 * @returns {Promise<{ok:true, commitSha:string, commitUrl:string, changedFiles:string[]}|{ok:true, noop:true}|{ok:true, dryRun:true, changedFiles:string[]}>}
 */
export async function commitFiles({ textFiles = {}, imageFiles = {}, deletePaths = [], message, dryRun = false }) {
  const { token, owner, repo, branch } = env();

  const ref = await gh(`/repos/${owner}/${repo}/git/ref/heads/${branch}`, token);
  const baseCommitSha = ref.object.sha;
  const baseCommit = await gh(`/repos/${owner}/${repo}/git/commits/${baseCommitSha}`, token);
  const baseTreeSha = baseCommit.tree.sha;

  const fullTree = await gh(`/repos/${owner}/${repo}/git/trees/${baseTreeSha}?recursive=1`, token);
  const shaByPath = new Map(fullTree.tree.filter((e) => e.type === "blob").map((e) => [e.path, e.sha]));

  // First pass, no network: figure out exactly which paths actually changed.
  const toCreate = []; // [path, content, encoding]
  const changedFiles = [];

  for (const [path, content] of Object.entries(textFiles)) {
    const buf = Buffer.from(content, "utf8");
    if (shaByPath.get(path) === gitBlobSha(buf)) continue; // unchanged, skip
    toCreate.push([path, content, "utf-8"]);
    changedFiles.push(path);
  }

  for (const [path, base64] of Object.entries(imageFiles)) {
    const buf = Buffer.from(base64, "base64");
    if (shaByPath.get(path) === gitBlobSha(buf)) continue; // unchanged, skip
    toCreate.push([path, base64, "base64"]);
    changedFiles.push(path);
  }

  const toDelete = deletePaths.filter((path) => shaByPath.has(path));
  changedFiles.push(...toDelete.map((p) => `${p} (deleted)`));

  if (dryRun) {
    return { ok: true, dryRun: true, changedFiles };
  }

  if (toCreate.length === 0 && toDelete.length === 0) {
    return { ok: true, noop: true };
  }

  const treeEntries = [];
  for (const [path, content, encoding] of toCreate) {
    const blob = await gh(`/repos/${owner}/${repo}/git/blobs`, token, {
      method: "POST",
      body: JSON.stringify({ content, encoding }),
    });
    treeEntries.push({ path, mode: "100644", type: "blob", sha: blob.sha });
  }
  for (const path of toDelete) {
    treeEntries.push({ path, mode: "100644", type: "blob", sha: null });
  }

  const newTree = await gh(`/repos/${owner}/${repo}/git/trees`, token, {
    method: "POST",
    body: JSON.stringify({ base_tree: baseTreeSha, tree: treeEntries }),
  });

  const newCommit = await gh(`/repos/${owner}/${repo}/git/commits`, token, {
    method: "POST",
    body: JSON.stringify({ message, tree: newTree.sha, parents: [baseCommitSha] }),
  });

  try {
    await gh(`/repos/${owner}/${repo}/git/refs/heads/${branch}`, token, {
      method: "PATCH",
      body: JSON.stringify({ sha: newCommit.sha, force: false }),
    });
  } catch (e) {
    if (e.status === 422 || e.status === 409) {
      const conflict = new Error("Someone else saved in the meantime — reload and try again.");
      conflict.status = 409;
      throw conflict;
    }
    throw e;
  }

  return {
    ok: true,
    commitSha: newCommit.sha,
    commitUrl: `https://github.com/${owner}/${repo}/commit/${newCommit.sha}`,
    changedFiles,
  };
}

/** Fetch and JSON.parse a text file from the repo at HEAD of the target branch. Returns null if missing. */
export async function readJsonFile(path) {
  const { token, owner, repo, branch } = env();
  try {
    const res = await gh(`/repos/${owner}/${repo}/contents/${path}?ref=${branch}`, token);
    const buf = Buffer.from(res.content, res.encoding || "base64");
    return JSON.parse(buf.toString("utf8"));
  } catch (e) {
    if (e.status === 404) return null;
    throw e;
  }
}

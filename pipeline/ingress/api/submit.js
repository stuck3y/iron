// Iron Sharpens Iron — plan submission ingress (Vercel serverless function).
// Accepts a tracker PDF, commits it to inbox/<year>-<month>.pdf on branch
// plan-inbox/<year>-<month>, which triggers .github/workflows/generate-plan.yml.
//
// Env vars (Vercel project settings):
//   SUBMIT_PASSCODE  shared passcode printed on the submit page handout
//   GITHUB_TOKEN     fine-grained PAT, Contents: read/write on the repo only
//   GITHUB_REPO      optional, default "stuck3y/iron"

const crypto = require("crypto");

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const ALLOWED_ORIGINS = ["https://sharpiron.org", "https://www.sharpiron.org", "https://stuck3y.github.io"];
const MAX_PDF_BYTES = 4 * 1024 * 1024;

function timingSafeEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ab.length !== bb.length) {
    // Compare against self to keep timing uniform, then fail.
    crypto.timingSafeEqual(ab, ab);
    return false;
  }
  return crypto.timingSafeEqual(ab, bb);
}

async function gh(token, repo, method, path, body) {
  const res = await fetch("https://api.github.com/repos/" + repo + path, {
    method,
    headers: {
      Authorization: "Bearer " + token,
      Accept: "application/vnd.github+json",
      "User-Agent": "isi-plan-ingress",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

module.exports = async (req, res) => {
  const origin = req.headers.origin || "";
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const { SUBMIT_PASSCODE, GITHUB_TOKEN } = process.env;
  const repo = process.env.GITHUB_REPO || "stuck3y/iron";
  if (!SUBMIT_PASSCODE || !GITHUB_TOKEN) return res.status(500).json({ error: "Server not configured" });

  const { passcode, month, year, pdf } = req.body || {};
  if (!passcode || !timingSafeEqual(passcode, SUBMIT_PASSCODE)) {
    return res.status(401).json({ error: "Wrong passcode" });
  }

  const m = String(month || "").toLowerCase();
  const y = Number(year);
  if (!MONTHS.includes(m)) return res.status(400).json({ error: "Invalid month" });
  if (!y || y < 2025 || y > 2100) return res.status(400).json({ error: "Invalid year" });
  if (typeof pdf !== "string" || !pdf.startsWith("JVBERi")) {
    return res.status(400).json({ error: "File does not look like a PDF" });
  }
  if (Buffer.byteLength(pdf, "utf8") > MAX_PDF_BYTES * 1.4) {
    return res.status(413).json({ error: "PDF too large (max 4 MB)" });
  }

  const branch = "plan-inbox/" + y + "-" + m;
  const filePath = "inbox/" + y + "-" + m + ".pdf";

  // Branch off main (tolerate already-exists for re-submissions)
  const mainRef = await gh(GITHUB_TOKEN, repo, "GET", "/git/ref/heads/main");
  if (mainRef.status !== 200) return res.status(502).json({ error: "Could not read main branch" });
  const created = await gh(GITHUB_TOKEN, repo, "POST", "/git/refs", {
    ref: "refs/heads/" + branch,
    sha: mainRef.data.object.sha,
  });
  if (created.status !== 201 && created.status !== 422) {
    return res.status(502).json({ error: "Could not create branch (" + created.status + ")" });
  }

  // Commit the PDF (include sha when replacing an earlier upload)
  const existing = await gh(GITHUB_TOKEN, repo, "GET", "/contents/" + filePath + "?ref=" + encodeURIComponent(branch));
  const put = await gh(GITHUB_TOKEN, repo, "PUT", "/contents/" + filePath, {
    message: "Submit " + m + " " + y + " tracker PDF",
    content: pdf,
    branch,
    ...(existing.status === 200 && existing.data.sha ? { sha: existing.data.sha } : {}),
  });
  if (put.status !== 201 && put.status !== 200) {
    return res.status(502).json({ error: "Could not commit PDF (" + put.status + ")" });
  }

  return res.status(200).json({
    ok: true,
    month: m,
    year: y,
    branch,
    actions_url: "https://github.com/" + repo + "/actions",
    preview_url: "https://sharpiron.org/" + m + "/",
  });
};

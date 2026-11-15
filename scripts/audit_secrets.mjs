import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

// Report paths and variable names only. Never echo matching credential values.
const git = process.env.ECOATLAS_GIT || "git";
const files = execFileSync(
  git,
  ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  { encoding: "utf8" },
)
  .split("\0")
  .filter(Boolean);
const failures = [];
const privateNames = [
  "MOENV_API_KEY",
  "CWA_API_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "CRON_SECRET",
  "VERCEL_TOKEN",
  "GH_TOKEN",
  "GITHUB_TOKEN",
];
const secrets = privateNames.flatMap((name) =>
  process.env[name]?.length >= 8 ? [[name, process.env[name]]] : [],
);
function inspect(path, client = false) {
  const data = readFileSync(path);
  for (const [name, value] of secrets) {
    if (data.includes(Buffer.from(value)))
      failures.push(`${path}: contains ${name}`);
  }
  const text = data.toString("utf8");
  if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text))
    failures.push(`${path}: private key material`);
  if (
    /(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|AKIA[A-Z0-9]{16})/.test(
      text,
    )
  )
    failures.push(`${path}: credential pattern`);
  if (
    client &&
    /process\.env\.(?:MOENV_API_KEY|CWA_API_KEY|SUPABASE_SERVICE_ROLE_KEY|CRON_SECRET)\b/.test(
      text,
    )
  )
    failures.push(`${path}: private server variable in client asset`);
}
for (const path of new Set(files)) {
  if (/(^|\/)\.env(?:\.|$)/.test(path) && path !== ".env.example")
    failures.push(`${path}: environment file included in Git`);
  if (/^\.vercel\//.test(path))
    failures.push(`${path}: local deployment configuration included in Git`);
  if (existsSync(path)) inspect(path);
}
let assets = 0;
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path);
    else {
      inspect(path, true);
      assets++;
    }
  }
}
if (existsSync(".next/static")) walk(".next/static");
for (const path of [".env.local", ".vercel/project.json"]) {
  try {
    execFileSync(git, ["check-ignore", "--quiet", path]);
  } catch {
    failures.push(`${path}: missing Git exclusion`);
  }
}
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(
  `Secret audit passed: ${new Set(files).size} repository files, ${assets} client assets; environment/deployment files excluded. ${secrets.length} configured private values checked (values never printed).`,
);
if (!secrets.length)
  console.log(
    "No private values were present in this process; this scan checks patterns and source boundaries, not unknown credential values.",
  );

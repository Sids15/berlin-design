#!/usr/bin/env node
/**
 * safety-scan.mjs — pre-commit secret & sensitive-data scanner
 *
 * Zero dependencies. Runs on Node 18+. Scans the files that are about to
 * be committed (staged) and BLOCKS the commit (exit code 1) if it finds:
 *   - private keys, API keys, tokens, high-entropy secrets, passwords
 *   - absolute local filesystem paths (C:\Users\<name>, /Users/<name>, /home/<name>)
 *   - personal usernames leaked via those paths
 *   - staged .env files
 *
 * Usage:
 *   node scripts/safety-scan.mjs          # scan STAGED files (default; use before a commit)
 *   node scripts/safety-scan.mjs --all    # scan every tracked file in the repo
 *
 * False positives can be allowlisted in .safetyscanignore (one entry per
 * line): either a literal substring or a /regex/ the matched text must
 * satisfy. Lines starting with # are comments.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { extname } from 'node:path';

const SCAN_ALL = process.argv.includes('--all');

// ---------------------------------------------------------------------------
// What NOT to scan: binary/asset files and anything too large to be source.
// ---------------------------------------------------------------------------
const BINARY_EXT = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.ico', '.svg',
  '.woff', '.woff2', '.ttf', '.otf', '.eot',
  '.mp4', '.webm', '.mov', '.mp3', '.wav', '.pdf', '.zip', '.gz',
]);
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

// ---------------------------------------------------------------------------
// Detection rules. Each has a human name and a regex.
// ---------------------------------------------------------------------------
const RULES = [
  { name: 'Private key block',      re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/ },
  { name: 'AWS access key id',      re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'AWS secret access key',  re: /\baws_secret_access_key\s*[:=]\s*['"]?[A-Za-z0-9/+=]{40}['"]?/i },
  { name: 'Google API key',         re: /\bAIza[0-9A-Za-z_\-]{35}\b/ },
  { name: 'Slack token',            re: /\bxox[baprs]-[0-9A-Za-z-]{10,}\b/ },
  { name: 'GitHub token',           re: /\bgh[pousr]_[0-9A-Za-z]{36,}\b/ },
  { name: 'Stripe secret key',      re: /\b(?:sk|rk)_(?:live|test)_[0-9A-Za-z]{16,}\b/ },
  { name: 'JSON Web Token',         re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/ },
  { name: 'Supabase secret key',    re: /\bsb_secret_[A-Za-z0-9_-]{20,}\b/ },
  { name: 'Postgres connection string', re: /\bpostgres(?:ql)?:\/\/[^\s:@/]+:[^\s@/]+@[^\s/]+/ },
  { name: 'Bearer token literal',   re: /\bBearer\s+[A-Za-z0-9_\-.=]{20,}/ },
  { name: 'Generic secret assignment',
    re: /\b(?:api[_-]?key|apikey|secret|client[_-]?secret|access[_-]?token|auth[_-]?token|password|passwd|pwd|private[_-]?key)\b\s*[:=]\s*['"][^'"\s]{8,}['"]/i },
  { name: 'Windows user path',      re: /[A-Za-z]:[\\/]Users[\\/][^\\/\s"'<>:|?*]+/ },
  { name: 'macOS home path',        re: /\/Users\/[^/\s"'<>:|?*]+/ },
  { name: 'Linux home path',        re: /\/home\/[^/\s"'<>:|?*]+/ },
  { name: 'Personal email address', re: /\b[A-Za-z0-9._%+-]+@(?!example\.(?:com|org|net)\b)[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/ },
];

// ---------------------------------------------------------------------------
// Allowlist: literal substrings, or /regex/ entries the match must satisfy.
// ---------------------------------------------------------------------------
function loadAllowlist() {
  const literals = [];
  const regexes = [];
  if (existsSync('.safetyscanignore')) {
    for (const raw of readFileSync('.safetyscanignore', 'utf8').split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      if (line.length > 2 && line.startsWith('/') && line.endsWith('/')) {
        try { regexes.push(new RegExp(line.slice(1, -1))); } catch { /* ignore bad regex */ }
      } else {
        literals.push(line);
      }
    }
  }
  return { literals, regexes };
}

function isAllowlisted(matchText, { literals, regexes }) {
  return literals.some((l) => matchText.includes(l)) ||
    regexes.some((r) => r.test(matchText));
}

// ---------------------------------------------------------------------------
// Which files to scan.
// ---------------------------------------------------------------------------
function targetFiles() {
  // Static, no user input — but pass args as an array (no shell) on principle.
  const args = SCAN_ALL
    ? ['ls-files']
    : ['diff', '--cached', '--name-only', '--diff-filter=ACM'];
  const out = execFileSync('git', args, { encoding: 'utf8' });
  return out.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
}

// ---------------------------------------------------------------------------
// Run.
// ---------------------------------------------------------------------------
const allowlist = loadAllowlist();
const files = targetFiles();
const findings = [];
let scanned = 0;

for (const file of files) {
  // A staged .env of any flavour is itself a finding.
  if (/(^|[\\/])\.env(\.|$)/.test(file) && !/\.env\.example$/.test(file)) {
    findings.push({ file, line: 0, rule: 'Committed .env file', text: file });
    continue;
  }

  if (BINARY_EXT.has(extname(file).toLowerCase())) continue;
  if (!existsSync(file)) continue;
  try { if (statSync(file).size > MAX_BYTES) continue; } catch { continue; }

  let content;
  try { content = readFileSync(file, 'utf8'); } catch { continue; }
  if (content.includes('\u0000')) continue; // binary guard

  scanned++;
  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Respect an inline opt-out for a knowingly-safe line.
    if (line.includes('safety-scan-ignore')) continue;
    for (const rule of RULES) {
      const m = rule.re.exec(line);
      if (m && !isAllowlisted(m[0], allowlist)) {
        findings.push({ file, line: i + 1, rule: rule.name, text: m[0] });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Report.
// ---------------------------------------------------------------------------
const scope = SCAN_ALL ? 'all tracked files' : 'staged files';
console.log(`\n🔎 safety-scan — ${scope} (${scanned} text file(s) scanned)\n`);

if (findings.length === 0) {
  console.log('✅ No secrets, credentials, or local paths detected. Safe to commit.\n');
  process.exit(0);
}

console.error(`❌ ${findings.length} potential secret(s) found — commit blocked:\n`);
for (const f of findings) {
  const preview = f.text.length > 60 ? f.text.slice(0, 57) + '…' : f.text;
  console.error(`  • ${f.rule}`);
  console.error(`      ${f.file}:${f.line}`);
  console.error(`      match: ${preview}\n`);
}
console.error('Remove the secret, move it to an untracked .env, or — if this is a');
console.error('confirmed false positive — allowlist it in .safetyscanignore or add a');
console.error('`safety-scan-ignore` comment on that line.\n');
process.exit(1);

#!/usr/bin/env node
// Checks the plugin against the rules in Google's "Partner Plugin & Skill Best Practices Guide" that can be
// checked offline. Errors are the guide's hard limits and blocking security checks; warnings are its
// authoring standards. Exits 1 on any error.
//
// Usage: node scripts/check-skills.js [plugin-root]
"use strict";
const fs = require("fs");
const path = require("path");

const root = path.resolve(process.argv[2] || path.join(__dirname, ".."));
const errors = [];
const warnings = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);
const warn = (where, msg) => warnings.push(`${where}: ${msg}`);

const GOOGLE_1P = ["bigquery", "gemini", "vertex-ai", "looker", "gdrive"];
const INSTALL = /\b(brew install|npm (i|install)\b|npx |pip3? install|curl [^\n]*\|\s*(ba|z)?sh|wget [^\n]*\|\s*(ba|z)?sh)/i;
const INVISIBLE = /[\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF]/;
const HIDDEN_DIRECTIVE = /<\/?(IMPORTANT|SYSTEM)>/i;

function readJson(rel) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
  } catch (e) {
    err(rel, `cannot read: ${e.message}`);
    return null;
  }
}

// Minimal frontmatter reader for the two keys we check: plain scalars and folded/literal blocks.
function frontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return null;
  const out = {};
  const lines = m[1].split("\n");
  for (let i = 0; i < lines.length; i++) {
    const kv = lines[i].match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!kv) continue;
    let value = kv[2];
    if (/^[>|][-+]?$/.test(value)) {
      const block = [];
      while (i + 1 < lines.length && (/^\s/.test(lines[i + 1]) || lines[i + 1] === "")) block.push(lines[++i].trim());
      value = block.join(value.startsWith(">") ? " " : "\n").trim();
    } else {
      value = value.replace(/^(["'])(.*)\1$/, "$2");
    }
    out[kv[1]] = value;
  }
  return { data: out, body: text.slice(m[0].length) };
}

const manifest = readJson(".gemini-plugin/plugin.json");
const skillsConfig = readJson("skills.json");
const prefix = (skillsConfig && skillsConfig.prefix) || "";

if (manifest) {
  for (const key of ["name", "displayName", "version", "description", "author", "skills", "mcpServers"]) {
    if (manifest[key] === undefined) err("plugin.json", `missing "${key}"`);
  }
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(manifest.name || "")) err("plugin.json", "name must be kebab-case");
  if (prefix && !(manifest.name || "").startsWith(prefix)) err("plugin.json", `name must start with "${prefix}" (CRIT-26a)`);
  if (!/^\d+\.\d+\.\d+$/.test(manifest.version || "")) err("plugin.json", "version must be MAJOR.MINOR.PATCH");
  for (const f of ["README.md", "CHANGELOG.md", "LICENSE"]) {
    if (!fs.existsSync(path.join(root, f))) err(f, "missing");
  }
  const changelog = fs.existsSync(path.join(root, "CHANGELOG.md")) ? fs.readFileSync(path.join(root, "CHANGELOG.md"), "utf8") : "";
  if (manifest.version && !changelog.includes(`## ${manifest.version}`)) err("CHANGELOG.md", `no entry for ${manifest.version}`);

  let authorHost = "";
  try {
    authorHost = new URL(manifest.author.url).hostname.replace(/^www\./, "");
  } catch {
    err("plugin.json", "author.url must be a URL");
  }
  const mcp = readJson(String(manifest.mcpServers || ".mcp.json").replace(/^\.\//, ""));
  for (const [id, server] of Object.entries((mcp && mcp.mcpServers) || {})) {
    let url;
    try {
      url = new URL(server.url);
    } catch {
      err(".mcp.json", `${id}: url is not a URL`);
      continue;
    }
    if (url.protocol !== "https:") err(".mcp.json", `${id}: url must use https (CRIT-23)`);
    if (authorHost && !(url.hostname === authorHost || url.hostname.endsWith(`.${authorHost}`))) {
      err(".mcp.json", `${id}: ${url.hostname} does not match author.url domain ${authorHost} (CRIT-26b)`);
    }
  }

  const listed = new Set();
  for (const rel of manifest.skills || []) {
    const where = rel;
    const file = path.join(root, rel);
    if (!fs.existsSync(file)) {
      err(where, "listed in plugin.json but missing");
      continue;
    }
    const dir = path.basename(path.dirname(file));
    listed.add(dir);
    const text = fs.readFileSync(file, "utf8");
    const fm = frontmatter(text);
    if (!fm) {
      err(where, "no YAML frontmatter");
      continue;
    }
    const { name = "", description = "" } = fm.data;
    if (name !== dir) err(where, `frontmatter name "${name}" does not match folder "${dir}"`);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name) || name.length > 64) err(where, "name must be kebab-case, <= 64 chars");
    if (prefix && !name.startsWith(prefix)) err(where, `name must start with "${prefix}" (CRIT-26a)`);
    if (GOOGLE_1P.includes(name)) err(where, "name is a Google 1P name (CRIT-26a)");
    if (!description) err(where, "description is empty");
    if (description.length > 1024) err(where, `description is ${description.length} chars, max 1024`);
    if (!/"[^"]+"/.test(description)) warn(where, "description has no quoted trigger phrases");
    if (!/\b(don'?t|do not) use\b/i.test(description)) warn(where, `description has no "Don't use for..." boundary`);

    const lines = text.split("\n").length;
    const words = fm.body.split(/\s+/).filter(Boolean).length;
    if (lines > 500) err(where, `${lines} lines, max 500`);
    else if (lines > 300) warn(where, `${lines} lines, target 150-300`);
    if (words >= 3000) err(where, `${words} words in the body, max 3,000`);

    const skillDir = path.dirname(file);
    for (const f of walk(skillDir)) {
      const rel2 = path.relative(root, f);
      const content = fs.readFileSync(f, "utf8");
      if (INSTALL.test(content)) err(rel2, "contains a local install command");
      if (INVISIBLE.test(content)) err(rel2, "contains invisible Unicode characters (CRIT-12-16)");
      if (HIDDEN_DIRECTIVE.test(content)) err(rel2, "contains a hidden <IMPORTANT>/<SYSTEM> directive (CRIT-22)");
    }
  }
  const skillsDir = path.join(root, "skills");
  if (fs.existsSync(skillsDir)) {
    for (const d of fs.readdirSync(skillsDir)) {
      if (!listed.has(d)) err(`skills/${d}`, "not listed in plugin.json skills");
    }
  }
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isSymbolicLink()) {
      err(path.relative(root, p), "symlinks are not allowed (CRIT-01-20)");
      return [];
    }
    return e.isDirectory() ? walk(p) : [p];
  });
}

for (const w of warnings) console.log(`warning  ${w}`);
for (const e of errors) console.log(`error    ${e}`);
console.log(`${errors.length} error(s), ${warnings.length} warning(s)`);
process.exit(errors.length ? 1 : 0);

#!/usr/bin/env bash
# Syncs skills/ from the repo and commit pinned in skills.json, then checks them against Gemini's skill rules.
#
# mondaycom/skills is the single source of truth for skill content. Never edit skills/ by hand:
# change the skill in mondaycom/skills, bump "ref" (and "skills" if needed) in skills.json, run this
# script and commit the result.
#
# Gemini requires every skill name to start with the partner brand, while mondaycom/skills keeps the
# unprefixed names its other consumers install by. So each skill is copied to skills/<prefix><skill>/,
# and its frontmatter name and any mention of another synced skill get the same prefix.
#
# Usage: scripts/sync-skills.sh
# Env overrides (for testing an unmerged skills branch):
#   SKILLS_REPO          git URL or local path to use instead of skills.json "repo"
#   SKILLS_REF           commit or branch to use instead of skills.json "ref"
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

case "${1:-}" in
  -h|--help) sed -n '2,16p' "$0"; exit 0 ;;
  "") ;;
  *) echo "Unknown argument: $1" >&2; exit 1 ;;
esac

for cmd in git node perl; do
  command -v "$cmd" >/dev/null || { echo "Missing required command: $cmd" >&2; exit 1; }
done

config() {
  node -e '
    const c = require(process.argv[1]); const v = c[process.argv[2]];
    if (v === undefined || (Array.isArray(v) && v.length === 0)) { console.error(`skills.json: "${process.argv[2]}" is missing or empty`); process.exit(1); }
    console.log(Array.isArray(v) ? v.join("\n") : v);
  ' "$ROOT/skills.json" "$1"
}
SKILLS_REPO="${SKILLS_REPO:-$(config repo)}"
SKILLS_REF="${SKILLS_REF:-$(config ref)}"
PREFIX="$(config prefix)"
SKILLS="$(config skills)"

[[ "$PREFIX" =~ ^[a-z0-9]+-$ ]] || { echo "Invalid prefix in skills.json: '$PREFIX'" >&2; exit 1; }

WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/monday-skills.XXXXXX")"
trap 'rm -rf "$WORK_DIR"' EXIT

echo "Fetching skills from $SKILLS_REPO @ $SKILLS_REF"
git clone --quiet --no-checkout "$SKILLS_REPO" "$WORK_DIR/src"
git -C "$WORK_DIR/src" checkout --quiet "$SKILLS_REF"

while IFS= read -r skill; do
  [[ "$skill" =~ ^[a-z0-9-]+$ ]] || { echo "Invalid skill name in skills.json: '$skill'" >&2; exit 1; }
  [ -f "$WORK_DIR/src/skills/$skill/SKILL.md" ] || { echo "Skill not found at $SKILLS_REF: $skill" >&2; exit 1; }
done <<< "$SKILLS"

rm -rf "$ROOT/skills"
mkdir -p "$ROOT/skills"
NAMES_ALT="$(echo "$SKILLS" | paste -sd '|' -)"
while IFS= read -r skill; do
  dest="$ROOT/skills/$PREFIX$skill"
  cp -R "$WORK_DIR/src/skills/$skill" "$dest"
  find "$dest" -type f -name '*.md' -print0 | xargs -0 perl -pi -e \
    "s/(?<![A-Za-z0-9\/-])(?<!\Q$PREFIX\E)($NAMES_ALT)(?![A-Za-z0-9-])/$PREFIX\$1/g"
done <<< "$SKILLS"
echo "Synced: $(echo "$SKILLS" | sed "s/^/$PREFIX/" | tr '\n' ' ')"

node "$ROOT/scripts/check-skills.js" "$ROOT"

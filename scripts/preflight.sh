#!/usr/bin/env bash
# Pre-flight check. Run this BEFORE claiming anything about what exists,
# what was removed, or what is deployed.
#
# The failure this exists to prevent: searching a stale local clone,
# finding nothing, and concluding a feature "never existed" when it was
# sitting on an unfetched branch and running in production.
#
#   ./scripts/preflight.sh                      # git checks only
#   ./scripts/preflight.sh https://your.app     # + identify deployed commit
#   CINETRACK_URL=https://your.app ./scripts/preflight.sh
set -uo pipefail

URL="${1:-${CINETRACK_URL:-}}"

echo "── fetching all refs ──────────────────────────────────"
git fetch --all --prune --quiet 2>/dev/null || { echo "  ! fetch failed (offline?) — results below may be STALE"; }

LOCAL=$(git rev-parse --short HEAD)
MAIN=$(git rev-parse --short origin/main 2>/dev/null || echo "?")
BRANCH=$(git rev-parse --abbrev-ref HEAD)
DIRTY=$(git status --porcelain | wc -l | tr -d ' ')

echo
echo "── local state ────────────────────────────────────────"
echo "  branch      : $BRANCH"
echo "  HEAD        : $LOCAL"
echo "  origin/main : $MAIN"
echo "  uncommitted : $DIRTY file(s)"
[ "$LOCAL" != "$MAIN" ] && echo "  ! HEAD differs from origin/main"

echo
echo "── unmerged work (most recent first) ──────────────────"
echo "  Anything listed here can be live in a deployment while"
echo "  being absent from main. Check before saying 'not found'."
echo
echo "  Counts use 'git cherry', so cherry-picked commits are"
echo "  recognised as applied even though their SHAs differ."
echo
# Collected to a file rather than a pipeline: piping the loop into `sort`
# would run it in a subshell, so any flag set inside would not survive.
UNMERGED=$(mktemp) || exit 1
trap 'rm -f "$UNMERGED"' EXIT
for ref in $(git for-each-ref --format='%(refname:short)' refs/remotes/origin | grep -v 'origin/main$\|HEAD'); do
  # Skip refs fully contained in main before doing the (slower) patch compare.
  [ "$(git rev-list --count origin/main.."$ref" 2>/dev/null || echo 0)" = "0" ] && continue
  # '+' means no patch-equivalent commit exists on main; '-' means already applied.
  missing=$(git cherry origin/main "$ref" 2>/dev/null | grep -c '^+' || true)
  [ "${missing:-0}" = "0" ] && continue
  printf "  %s  missing:%-4s %s\n" "$(git log -1 --format='%ad' --date=short "$ref")" "$missing" "$ref" >> "$UNMERGED"
done
if [ -s "$UNMERGED" ]; then
  sort -r "$UNMERGED" | head -12
else
  echo "  (none — every branch is patch-equivalent to main)"
fi

if [ -z "$URL" ]; then
  echo
  echo "── deployed build ─────────────────────────────────────"
  echo "  SKIPPED — no URL given. The deployed build is the source"
  echo "  of truth for what the user sees; git alone cannot tell you."
  echo "  Re-run with the site URL to identify the live commit."
  exit 0
fi

echo
echo "── identifying deployed commit at $URL ────────────────"
TMP=$(mktemp) || exit 1
trap 'rm -f "$TMP"' EXIT
if ! curl -fsSL --max-time 20 "$URL/app.js" -o "$TMP"; then
  echo "  ! could not fetch $URL/app.js"
  exit 1
fi
LIVE_HASH=$(sha256sum "$TMP" | cut -d' ' -f1)
echo "  live app.js sha256: ${LIVE_HASH:0:16}…"

# Walk recent commits across every ref and hash their app.js until one matches.
MATCH=""
for sha in $(git rev-list --all --max-count=400 2>/dev/null); do
  h=$(git show "$sha:app.js" 2>/dev/null | sha256sum | cut -d' ' -f1)
  if [ "$h" = "$LIVE_HASH" ]; then MATCH="$sha"; break; fi
done

if [ -z "$MATCH" ]; then
  echo "  ! no commit in the last 400 matches the live app.js."
  echo "    The deployment may be ahead of, or diverged from, this repo."
  exit 1
fi

echo "  deployed commit : $(git log -1 --format='%h %ad %s' --date=short "$MATCH")"
if git merge-base --is-ancestor "$MATCH" origin/main 2>/dev/null; then
  behind=$(git rev-list --count "$MATCH"..origin/main)
  if [ "$behind" = "0" ]; then
    echo "  status          : UP TO DATE with origin/main"
  else
    echo "  status          : $behind commit(s) BEHIND origin/main"
  fi
else
  echo "  status          : ! NOT an ancestor of origin/main"
  echo "                    The live build contains work that is not on main."
  echo "                    Branches containing it:"
  git branch -a --contains "$MATCH" 2>/dev/null | sed 's/^/                      /'
fi

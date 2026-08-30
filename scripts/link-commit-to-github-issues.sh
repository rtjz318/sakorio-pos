#!/usr/bin/env bash
# Post-commit: comment on GitHub issue(s) linked from agents2 task files in the commit.
# Usage: ./scripts/link-commit-to-github-issues.sh [commit_sha]
# Env: AGENT_GH_REPO (default rtjz318/sakorio-pos), GH_TOKEN or gh auth.
# Compatible with macOS /bin/bash 3.2 (no associative arrays).

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SHA="${1:-HEAD}"
GH_REPO="${AGENT_GH_REPO:-rtjz318/sakorio-pos}"
_ISSUE_LIST=""

if ! command -v gh >/dev/null 2>&1; then
  echo "link-commit-to-github-issues: gh not on PATH — skip issue comments" >&2
  exit 0
fi

cd "$REPO_ROOT"
if ! git rev-parse --verify "${SHA}^{commit}" >/dev/null 2>&1; then
  echo "link-commit-to-github-issues: invalid commit ${SHA}" >&2
  exit 1
fi

_add_issue() {
  local n="$1"
  [[ -z "$n" ]] && return 0
  [[ "$n" =~ ^[0-9]+$ ]] || return 0
  if ((n < 1 || n > 99999)); then
    return 0
  fi
  case $'\n'"${_ISSUE_LIST}"$'\n' in
    *$'\n'"${n}"$'\n'*) return 0 ;;
  esac
  _ISSUE_LIST="${_ISSUE_LIST}${n}"$'\n'
}

_issue_from_task_basename() {
  local bn="$1"
  local seg
  if [[ "$bn" =~ ^(NEW|WIP|FEAT|UNTESTED|TESTING|CLOSED)-([0-9]+)- ]]; then
    seg="${BASH_REMATCH[2]}"
    # YYYYMMDD date segment (e.g. FEAT-20260323-…) is not an issue number.
    if [[ "$seg" =~ ^20[0-9]{6}$ ]]; then
      return 0
    fi
    _add_issue "$seg"
  fi
}

_scan_file_for_issue_refs() {
  local f="$1"
  [[ -f "$f" ]] || return 0
  local n
  while IFS= read -r n; do
    [[ -n "$n" ]] && _add_issue "$n"
  done < <(grep -oiE '(github\.com/[^/]+/[^/]+/issues/|#)([0-9]+)' "$f" 2>/dev/null | grep -oiE '[0-9]+$' || true)
}

while IFS= read -r f; do
  [[ -z "$f" ]] && continue
  case "$f" in
    agents2/tasks/*|agents/tasks/*)
      _issue_from_task_basename "$(basename "$f")"
      _scan_file_for_issue_refs "$REPO_ROOT/$f"
      ;;
  esac
done < <(git diff-tree --no-commit-id --name-only -r "$SHA" 2>/dev/null || true)

# Commit message trailers (Refs #242, Fixes #242; also #N after commas).
while IFS= read -r n; do
  [[ -n "$n" ]] && _add_issue "$n"
done < <(git log -1 --format=%B "$SHA" 2>/dev/null | grep -oiE '#[0-9]+' | tr -d '#' || true)

if [[ -z "${_ISSUE_LIST//[$'\n']/}" ]]; then
  echo "link-commit-to-github-issues: no issue numbers found for ${SHA}"
  exit 0
fi

sha_full=$(git rev-parse "$SHA")
sha_short=$(git rev-parse --short "$SHA")
subject=$(git log -1 --format=%s "$SHA")
body="Committed to \`development\`: [\`${sha_short}\`](https://github.com/${GH_REPO}/commit/${sha_full}) — ${subject}"

count=0
while IFS= read -r n; do
  [[ -z "$n" ]] && continue
  echo "link-commit-to-github-issues: commenting on #${n} …" >&2
  if ! gh issue comment "$n" --repo "$GH_REPO" --body "$body"; then
    echo "link-commit-to-github-issues: failed to comment on #${n}" >&2
  fi
  count=$((count + 1))
done <<EOF
$(printf '%s' "$_ISSUE_LIST" | sort -nu)
EOF

echo "link-commit-to-github-issues: notified ${count} issue(s) for ${sha_short}"

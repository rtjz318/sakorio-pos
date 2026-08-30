#!/usr/bin/env bash
# Trigger production deploy on amvara9 (fetches marketing artifacts + restarts stack).
# Requires gh auth with workflow scope on rtjz318/sakorio-pos.

set -euo pipefail

REPO="${AGENT_GH_REPO:-rtjz318/sakorio-pos}"
REF="${MARKETING_DEPLOY_REF:-master}"
WF="${MARKETING_DEPLOY_WORKFLOW:-Deploy to amvara9}"

echo "[trigger-marketing-deploy] workflow=${WF} repo=${REPO} ref=${REF}"
gh workflow run "$WF" --repo "$REPO" --ref "$REF"
echo "[trigger-marketing-deploy] triggered — check: gh run list --repo ${REPO} --workflow \"${WF}\" --limit 3"

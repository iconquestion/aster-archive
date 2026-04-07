#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
hooks_path="$repo_root/.githooks"

if ! git -C "$repo_root" rev-parse --git-dir >/dev/null 2>&1; then
  echo "Skipping Git hook setup: not inside a Git repository."
  exit 0
fi

git -C "$repo_root" config core.hooksPath "$hooks_path"
echo "Git hooks enabled from $hooks_path"

#!/usr/bin/env bash
set -euo pipefail

valid_messages=(
  "feat: add clock mode"
  "fix(canvas): correct scaling"
  "chore(ci): update actions"
)

for message in "${valid_messages[@]}"; do
  printf '%s\n' "$message" | npx --no -- commitlint
done

if printf '%s\n' "update pipeline" | npx --no -- commitlint; then
  echo "Expected an invalid commit message to be rejected" >&2
  exit 1
fi

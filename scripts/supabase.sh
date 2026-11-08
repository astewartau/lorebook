#!/usr/bin/env bash
# Run the Supabase CLI, using rootless podman when Docker isn't installed.
set -euo pipefail
if [[ -z "${DOCKER_HOST:-}" ]] && ! command -v docker >/dev/null; then
  sock="/run/user/$(id -u)/podman/podman.sock"
  [[ -S "$sock" ]] && export DOCKER_HOST="unix://$sock"
fi
exec npx supabase "$@"

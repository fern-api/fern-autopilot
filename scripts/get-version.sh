#!/usr/bin/env bash
set -euo pipefail

latest_tag="$(git tag -l 'autopilot@*' --sort=-v:refname | head -n1 || true)"
base="${latest_tag#autopilot@}"

if [[ -z "${base}" ]]; then
  base="dev"
fi

short_sha="$(git rev-parse --short HEAD)"

echo "${base}-${short_sha}"
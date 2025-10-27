#!/usr/bin/env bash
set -euo pipefail

TAG="${1:-}"
if [[ -z "$TAG" ]]; then
  echo "ERROR: Missing tag argument" >&2
  exit 1
fi

DOCKER_NAME="autopilot:${TAG}"
ROOT="$(git rev-parse --show-toplevel)"
DOCKERFILE="${ROOT}/servers/autopilot/Dockerfile"
CONTEXT="${ROOT}"
TARBALL="${ROOT}/servers/autopilot/${DOCKER_NAME}.tar"

echo "Building Docker image: ${DOCKER_NAME}"
docker build -f "${DOCKERFILE}" -t "${DOCKER_NAME}" "${CONTEXT}"

echo "Saving Docker image as tarball..."
docker save "${DOCKER_NAME}" -o "${TARBALL}"

echo
echo "Built docker: ${DOCKER_NAME}"
echo "Saved as: ${TARBALL}"
echo "To run image: docker run -p 3001:3001 ${DOCKER_NAME}"
echo
#!/bin/bash
GITHUB_REF="$(git rev-parse --abbrev-ref HEAD)"
export TAG=${GITHUB_REF##*/}
docker-compose -f production.yml pull
docker-compose -f production.yml up

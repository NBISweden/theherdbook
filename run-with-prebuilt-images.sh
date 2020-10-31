#!/bin/bash
GITHUB_REF="$(git rev-parse --abbrev-ref HEAD)" TAG=${GITHUB_REF##*/} docker-compose -f dc-current-branch.yml up

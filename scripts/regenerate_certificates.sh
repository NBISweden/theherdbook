#!/bin/bash

# Script to regenerate all certificates after S3 bucket deletion
# This script should be run from the project root directory

set -e

echo "Starting certificate regeneration process..."

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo "Error: Please run this script from the project root directory"
    exit 1
fi

# Check if the herdbook container is running
if ! docker-compose ps | grep -q "herdbook-main.*Up"; then
    echo "Error: Herdbook container is not running. Please start it first with:"
    echo "docker-compose up -d"
    exit 1
fi

echo "Copying regeneration script to container..."
docker cp regenerate_certificates.py herdbook-main:/app/regenerate_certificates.py

echo "Running certificate regeneration..."
docker exec -it herdbook-main python3 /app/regenerate_certificates.py

echo "Certificate regeneration completed!"
echo "Check the log file 'certificate_regeneration.log' for details." 
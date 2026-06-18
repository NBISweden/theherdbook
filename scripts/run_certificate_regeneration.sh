#!/bin/bash

# Simple script to run certificate regeneration from within the Docker container
# Run this from inside the herdbook-main container

echo "Starting certificate regeneration..."

# Change to the app directory
cd /app

# Run the regeneration script
python3 regenerate_certificates.py

echo "Certificate regeneration completed!" 
#!/bin/bash

# VulnShop Teardown Script
# This script stops and removes all VulnShop services, volumes, and networks

set -e

echo "======================================"
echo "  VulnShop Teardown Script"
echo "======================================"
echo ""

# Check if Docker Compose is installed
if ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not installed."
    exit 1
fi

echo "🛑 Stopping all VulnShop services..."
docker compose down

echo ""
echo "🗑️  Removing volumes..."
docker compose down -v

echo ""
echo "🧹 Cleaning up dangling images..."
docker image prune -f

echo ""
echo "======================================"
echo "  VulnShop has been torn down"
echo "======================================"
echo ""
echo "All services, containers, volumes, and networks have been removed."
echo ""

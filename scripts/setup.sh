#!/bin/bash

# VulnShop Setup Script
# This script builds and starts all VulnShop services

set -e

echo "======================================"
echo "  VulnShop Setup Script"
echo "======================================"
echo ""
echo "⚠️  WARNING: This application is intentionally vulnerable!"
echo "    NEVER deploy this to a public network."
echo "    For local security testing only."
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"
echo ""

# Create .env file from .env.example if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "✅ .env file created"
fi

echo "🏗️  Building and starting VulnShop services..."
echo ""

# Build and start services
docker compose up --build -d

echo ""
echo "⏳ Waiting for services to become healthy..."
echo ""

# Wait for services to be healthy
MAX_WAIT=120
ELAPSED=0
INTERVAL=5

while [ $ELAPSED -lt $MAX_WAIT ]; do
    # Check if all services are healthy
    HEALTHY=$(docker compose ps | grep -c "healthy" || true)
    TOTAL=$(docker compose ps --services | wc -l)
    
    echo "   Services healthy: $HEALTHY"
    
    # Check if postgres is healthy (key dependency)
    if docker compose ps postgres | grep -q "healthy"; then
        echo "✅ Core services are ready!"
        break
    fi
    
    sleep $INTERVAL
    ELAPSED=$((ELAPSED + INTERVAL))
done

echo ""
echo "======================================"
echo "  VulnShop is now running!"
echo "======================================"
echo ""
echo "📊 Service Status:"
docker compose ps
echo ""
echo "🌐 Access Points:"
echo "   Frontend:        http://localhost:3000"
echo "   API Gateway:     http://localhost:8080"
echo "   Nginx Proxy:     http://localhost:80"
echo ""
echo "   Auth Service:    http://localhost:3001"
echo "   User Service:    http://localhost:3002"
echo "   Product Service: http://localhost:3003"
echo "   Order Service:   http://localhost:3004"
echo "   Payment Service: http://localhost:3005"
echo "   Notification:    http://localhost:3006"
echo ""
echo "   PostgreSQL:      localhost:5432"
echo "   MongoDB:         localhost:27017"
echo "   Redis:           localhost:6379"
echo "   RabbitMQ UI:     http://localhost:15672"
echo ""
echo "📚 Documentation:"
echo "   README.md           - Getting started guide"
echo "   VULNERABILITIES.md  - Vulnerability documentation"
echo ""
echo "⚠️  Remember: This is an intentionally vulnerable application!"
echo "    Use it responsibly for security testing and learning only."
echo ""

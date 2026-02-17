#!/bin/bash

# VulnShop Validation Script
# Validates project structure and configuration without running Docker

set -e

echo "======================================"
echo "  VulnShop Validation Script"
echo "======================================"
echo ""

ERRORS=0
WARNINGS=0

# Function to check if file exists
check_file() {
    if [ -f "$1" ]; then
        echo "✅ $1"
    else
        echo "❌ Missing: $1"
        ((ERRORS++))
    fi
}

# Function to check if directory exists
check_dir() {
    if [ -d "$1" ]; then
        echo "✅ $1/"
    else
        echo "❌ Missing directory: $1"
        ((ERRORS++))
    fi
}

echo "📋 Checking project structure..."
echo ""

# Root files
echo "Root Configuration:"
check_file "docker-compose.yml"
check_file ".env.example"
check_file ".gitignore"
check_file "README.md"
check_file "VULNERABILITIES.md"
check_file "LICENSE"

echo ""
echo "Scripts:"
check_file "scripts/setup.sh"
check_file "scripts/teardown.sh"
check_file "scripts/init-db.sql"

echo ""
echo "Nginx:"
check_file "nginx/nginx.conf"

# Gateway
echo ""
echo "API Gateway:"
check_dir "gateway"
check_file "gateway/Dockerfile"
check_file "gateway/package.json"
check_file "gateway/src/index.js"

# Auth Service
echo ""
echo "Auth Service:"
check_dir "auth-service"
check_file "auth-service/Dockerfile"
check_file "auth-service/package.json"
check_file "auth-service/src/index.js"
check_file "auth-service/src/db/connection.js"
check_file "auth-service/src/routes/auth.js"

# User Service
echo ""
echo "User Service:"
check_dir "user-service"
check_file "user-service/Dockerfile"
check_file "user-service/package.json"
check_file "user-service/src/index.js"
check_file "user-service/src/routes/users.js"

# Product Service
echo ""
echo "Product Service:"
check_dir "product-service"
check_file "product-service/Dockerfile"
check_file "product-service/requirements.txt"
check_file "product-service/src/app.py"
check_file "product-service/src/routes/products.py"

# Order Service
echo ""
echo "Order Service:"
check_dir "order-service"
check_file "order-service/Dockerfile"
check_file "order-service/requirements.txt"
check_file "order-service/src/app.py"
check_file "order-service/src/routes/orders.py"

# Payment Service
echo ""
echo "Payment Service:"
check_dir "payment-service"
check_file "payment-service/Dockerfile"
check_file "payment-service/go.mod"
check_file "payment-service/go.sum"
check_file "payment-service/main.go"

# Notification Service
echo ""
echo "Notification Service:"
check_dir "notification-service"
check_file "notification-service/Dockerfile"
check_file "notification-service/requirements.txt"
check_file "notification-service/src/app.py"
check_file "notification-service/src/routes/notifications.py"

# Frontend
echo ""
echo "Frontend:"
check_dir "frontend"
check_file "frontend/Dockerfile"
check_file "frontend/package.json"
check_file "frontend/public/index.html"
check_file "frontend/src/index.js"
check_file "frontend/src/App.js"
check_file "frontend/src/App.css"
check_file "frontend/src/pages/Login.js"
check_file "frontend/src/pages/Register.js"
check_file "frontend/src/pages/Products.js"
check_file "frontend/src/pages/Orders.js"
check_file "frontend/src/pages/Profile.js"

echo ""
echo "======================================"
echo "  Validation Results"
echo "======================================"
echo ""

if [ $ERRORS -eq 0 ]; then
    echo "✅ All checks passed! Project structure is complete."
    echo ""
    echo "📦 Services to be deployed:"
    echo "   - API Gateway (Node.js)"
    echo "   - Auth Service (Node.js + PostgreSQL)"
    echo "   - User Service (Node.js + MongoDB)"
    echo "   - Product Service (Python/Flask + PostgreSQL)"
    echo "   - Order Service (Python/Flask + PostgreSQL)"
    echo "   - Payment Service (Go)"
    echo "   - Notification Service (Python/Flask + Redis)"
    echo "   - Frontend (React)"
    echo ""
    echo "🔍 Vulnerabilities documented: 45+"
    echo ""
    echo "🚀 Ready to deploy with: ./scripts/setup.sh"
else
    echo "❌ Validation failed with $ERRORS error(s)"
    exit 1
fi

echo ""
echo "⚠️  Remember: This is an intentionally vulnerable application!"
echo "    Use only in isolated environments for security testing."
echo ""

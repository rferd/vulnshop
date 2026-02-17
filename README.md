# 🛒 VulnShop - Intentionally Vulnerable E-Commerce Platform

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/docker-compose-blue.svg)](docker-compose.yml)

> ⚠️ **CRITICAL WARNING**: This application is **INTENTIONALLY VULNERABLE** and must **NEVER** be deployed to a public network or production environment. It is designed exclusively for local security testing, education, and penetration testing practice.

## 📖 Overview

VulnShop is a deliberately vulnerable multi-microservice e-commerce platform built to help security professionals, developers, and students learn about web application security vulnerabilities in a safe, controlled environment.

The platform demonstrates real-world vulnerabilities across multiple technologies and architectural patterns, including:
- Authentication & Authorization issues
- Injection attacks (SQL, NoSQL, XXE, Command, Template)
- Broken access controls
- Sensitive data exposure
- Security misconfigurations
- And many more...

## 🏗️ Architecture

VulnShop consists of 8 microservices orchestrated with Docker Compose:

```
                           ┌─────────────┐
                           │   Nginx     │
                           │  (Port 80)  │
                           └──────┬──────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
              ┌─────▼──────┐            ┌──────▼──────┐
              │  Frontend  │            │   Gateway   │
              │ React:3000 │            │ Express:8080│
              └────────────┘            └──────┬──────┘
                                               │
                     ┌─────────────────────────┼─────────────────────────┐
                     │                         │                         │
              ┌──────▼──────┐         ┌────────▼────────┐       ┌───────▼───────┐
              │Auth Service │         │  User Service   │       │Product Service│
              │Express:3001 │         │  Express:3002   │       │ Flask:3003    │
              └──────┬──────┘         └────────┬────────┘       └───────┬───────┘
                     │                         │                        │
              ┌──────▼──────┐         ┌────────▼────────┐       ┌───────▼───────┐
              │ PostgreSQL  │         │    MongoDB      │       │  PostgreSQL   │
              └─────────────┘         └─────────────────┘       └───────────────┘

              ┌──────────────┐       ┌──────────────┐       ┌──────────────┐
              │Order Service │       │Payment Svc   │       │Notification  │
              │ Flask:3004   │       │   Go:3005    │       │Flask:3006    │
              └──────┬───────┘       └──────────────┘       └──────┬───────┘
                     │                                              │
              ┌──────▼───────┐                              ┌───────▼───────┐
              │ PostgreSQL   │                              │    Redis      │
              └──────────────┘                              └───────────────┘
```

### Services

| Service | Technology | Port | Database | Purpose |
|---------|-----------|------|----------|---------|
| **Frontend** | React | 3000 | - | User interface with XSS, CSRF, and client-side vulnerabilities |
| **API Gateway** | Node.js/Express | 8080 | - | Routes requests, CORS issues, no rate limiting |
| **Auth Service** | Node.js/Express | 3001 | PostgreSQL | Authentication with SQL injection, weak JWT |
| **User Service** | Node.js/Express | 3002 | MongoDB | User profiles with NoSQL injection, BOLA |
| **Product Service** | Python/Flask | 3003 | PostgreSQL | Product catalog with SSRF, pickle deserialization |
| **Order Service** | Python/Flask | 3004 | PostgreSQL | Order management with IDOR, XXE, business logic flaws |
| **Payment Service** | Go | 3005 | - | Payment processing with race conditions, data exposure |
| **Notification Service** | Python/Flask | 3006 | Redis | Notifications with SSTI, command injection |

### Infrastructure

- **PostgreSQL** (5432): Shared database for auth, product, and order services
- **MongoDB** (27017): Document store for user service
- **Redis** (6379): Cache and queue for notification service
- **RabbitMQ** (5672, 15672): Message broker for async communication
- **Nginx** (80): Reverse proxy

## 🚀 Quick Start

### Prerequisites

- Docker (version 20.10+)
- Docker Compose (version 2.0+)
- At least 4GB of available RAM
- Ports 80, 3000-3006, 5432, 6379, 15672, 27017 available

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/rferd/vulnshop.git
   cd vulnshop
   ```

2. **Run the setup script:**
   ```bash
   chmod +x scripts/setup.sh
   ./scripts/setup.sh
   ```

   Or manually with Docker Compose:
   ```bash
   cp .env.example .env
   docker compose up --build -d
   ```

3. **Wait for all services to start** (approximately 2-3 minutes)

4. **Access the application:**
   - Frontend: http://localhost:3000
   - API Gateway: http://localhost:8080
   - RabbitMQ Management: http://localhost:15672 (guest/guest)

### Default Test Accounts

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | admin |
| user1 | password123 | user |
| user2 | password123 | user |

## 🎯 Using VulnShop for Security Testing

### 1. Reconnaissance
Start by exploring the application:
- Browse the frontend interface
- Examine API endpoints
- Review HTTP requests/responses in browser DevTools
- Check for exposed information in HTML comments and JavaScript

### 2. Vulnerability Discovery
Use the `VULNERABILITIES.md` file as a guide to:
- Identify vulnerability types
- Understand exploitation techniques
- Practice with real-world attack scenarios

### 3. Exploitation
Try to exploit vulnerabilities using tools like:
- **Burp Suite** - Web application security testing
- **OWASP ZAP** - Automated security scanning
- **SQLMap** - SQL injection exploitation
- **Postman/curl** - API testing
- **Browser DevTools** - Client-side analysis

### 4. Remediation Practice
After exploiting vulnerabilities:
- Review the remediation guidance in `VULNERABILITIES.md`
- Practice fixing vulnerabilities
- Compare vulnerable vs. secure code patterns

## 📚 Endpoints Reference

### Authentication (`/auth`)
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login
- `POST /auth/verify` - Verify JWT token

### Users (`/users`)
- `GET /users/profile/:userId` - Get user profile
- `PUT /users/profile/:userId` - Update profile
- `POST /users/profile` - Create profile
- `GET /users/search?query=...` - Search users
- `DELETE /users/profile/:userId` - Delete user
- `GET /users/list` - List all users

### Products (`/products`)
- `GET /products/list` - List all products
- `GET /products/:id` - Get product by ID
- `POST /products` - Create product
- `PUT /products/:id` - Update product
- `DELETE /products/:id` - Delete product
- `GET /products/search?q=...` - Search products
- `POST /products/fetch-image` - Fetch image from URL (SSRF)
- `POST /products/cache` - Cache product (insecure deserialization)
- `GET /products/cache/:key` - Get cached product

### Orders (`/orders`)
- `GET /orders/list` - List all orders
- `GET /orders/:id` - Get order by ID
- `POST /orders` - Create order
- `PUT /orders/:id` - Update order
- `DELETE /orders/:id` - Delete order
- `POST /orders/import` - Import orders from XML (XXE)
- `GET /orders/user/:userId` - Get user's orders
- `GET /orders/:id/export` - Export order as XML

### Payments (`/payments`)
- `POST /payments` - Process payment
- `GET /payments` - List all payments
- `GET /payments/:id` - Get payment by ID
- `POST /payments/:id/refund` - Refund payment
- `GET /config` - Get service configuration (exposes secrets)

### Notifications (`/notifications`)
- `POST /notifications/send-email` - Send email (command injection)
- `POST /notifications/send-sms` - Send SMS
- `POST /notifications/render-template` - Render template (SSTI)
- `GET /notifications/status/:type/:id` - Get notification status
- `POST /notifications/queue` - Queue notification
- `GET /notifications/track?redirect=...` - Track click (open redirect)
- `POST /notifications/admin/execute` - Execute command
- `GET /notifications/analytics` - Get analytics

## 🛑 Stopping VulnShop

To stop and remove all services:

```bash
./scripts/teardown.sh
```

Or manually:
```bash
docker compose down -v
```

## 🔍 Vulnerability Categories

VulnShop includes vulnerabilities from:
- OWASP Top 10 2021
- CWE Top 25
- SANS Top 25

See `VULNERABILITIES.md` for complete details on:
- ✅ 50+ intentional vulnerabilities
- 📍 Exact code locations
- 🎯 Exploitation techniques
- 🔧 Remediation guidance

## 🤝 Contributing

This is an educational project. If you'd like to contribute:
1. Suggest additional vulnerability scenarios
2. Improve documentation
3. Add security testing guides
4. Report bugs (but remember, vulnerabilities are intentional!)

## ⚖️ Legal Disclaimer

**IMPORTANT**: VulnShop is provided for educational and ethical security testing purposes only. By using this software, you agree to:

1. Use it ONLY in isolated, local environments
2. NEVER deploy to production or public networks
3. NOT use it for illegal activities
4. NOT use it to attack systems you don't own
5. Take full responsibility for any misuse

The authors and contributors are not liable for any damage or legal consequences resulting from the use or misuse of this software.

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

VulnShop was inspired by other deliberately vulnerable applications:
- OWASP WebGoat
- Damn Vulnerable Web Application (DVWA)
- OWASP Juice Shop
- NodeGoat

## 📧 Support

For questions or issues (excluding intentional vulnerabilities):
- Open an issue on GitHub
- Review the documentation in `/docs`

---

**Remember**: With great power comes great responsibility. Use VulnShop to learn, understand, and improve security - never to cause harm.

Happy (ethical) hacking! 🔐 

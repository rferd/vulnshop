-- VulnShop Database Initialization Script
-- This script creates tables and seeds initial data

-- Create users table for auth service
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    -- VULNERABILITY: Passwords stored with weak hashing (MD5)
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    stock_quantity INTEGER DEFAULT 0,
    image_url TEXT,
    category VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id),
    amount DECIMAL(10, 2) NOT NULL,
    -- VULNERABILITY: Storing sensitive payment information
    card_number VARCHAR(20),
    card_holder VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial data

-- VULNERABILITY: Default admin user with weak password (MD5 hash of "admin123")
INSERT INTO users (username, email, password_hash, role) VALUES
    ('admin', 'admin@vulnshop.com', '0192023a7bbd73250516f069df18b500', 'admin'),
    ('user1', 'user1@vulnshop.com', '24c9e15e52afc47c225b757e7bee1f9d', 'user'),
    ('user2', 'user2@vulnshop.com', '7e58d63b60197ceb55a1c487989a3720', 'user')
ON CONFLICT (username) DO NOTHING;

-- Seed products
INSERT INTO products (name, description, price, stock_quantity, category) VALUES
    ('Laptop Pro 15', 'High-performance laptop with 16GB RAM', 1299.99, 50, 'Electronics'),
    ('Wireless Mouse', 'Ergonomic wireless mouse with USB receiver', 29.99, 200, 'Electronics'),
    ('Office Chair', 'Comfortable ergonomic office chair', 249.99, 30, 'Furniture'),
    ('Mechanical Keyboard', 'RGB mechanical keyboard with Cherry MX switches', 149.99, 75, 'Electronics'),
    ('USB-C Hub', '7-in-1 USB-C hub with HDMI and ethernet', 49.99, 150, 'Electronics'),
    ('Monitor 27"', '4K UHD 27-inch monitor with HDR', 399.99, 40, 'Electronics'),
    ('Desk Lamp', 'LED desk lamp with adjustable brightness', 39.99, 100, 'Furniture'),
    ('Webcam HD', '1080p HD webcam with built-in microphone', 79.99, 80, 'Electronics'),
    ('Notebook Set', 'Set of 3 premium notebooks', 19.99, 300, 'Stationery'),
    ('External SSD 1TB', 'Portable external SSD with USB 3.0', 129.99, 60, 'Electronics')
ON CONFLICT DO NOTHING;

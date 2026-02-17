import os
import pickle
import requests
from flask import Blueprint, request, jsonify, send_file
import psycopg2
from psycopg2.extras import RealDictCursor

products_bp = Blueprint('products', __name__)

# Database connection
def get_db():
    return psycopg2.connect(
        host=os.environ.get('POSTGRES_HOST', 'localhost'),
        port=os.environ.get('POSTGRES_PORT', 5432),
        user=os.environ.get('POSTGRES_USER', 'vulnshop'),
        password=os.environ.get('POSTGRES_PASSWORD', 'vulnerable123'),
        database=os.environ.get('POSTGRES_DB', 'vulnshop')
    )

# Get all products
@products_bp.route('/', methods=['GET'])
@products_bp.route('/list', methods=['GET'])
def get_products():
    try:
        conn = get_db()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # VULNERABILITY: No pagination, returns all products
        cur.execute("SELECT * FROM products")
        products = cur.fetchall()
        
        cur.close()
        conn.close()
        
        return jsonify({'products': products, 'count': len(products)})
    except Exception as e:
        # VULNERABILITY: Exposing internal error details
        return jsonify({
            'error': 'Failed to fetch products',
            'message': str(e),
            'type': type(e).__name__
        }), 500

# Get single product
@products_bp.route('/<int:product_id>', methods=['GET'])
def get_product(product_id):
    try:
        conn = get_db()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        cur.execute("SELECT * FROM products WHERE id = %s", (product_id,))
        product = cur.fetchone()
        
        cur.close()
        conn.close()
        
        if not product:
            return jsonify({'error': 'Product not found'}), 404
            
        return jsonify(product)
    except Exception as e:
        return jsonify({
            'error': 'Failed to fetch product',
            'message': str(e)
        }), 500

# Create product
@products_bp.route('/', methods=['POST'])
def create_product():
    try:
        data = request.json
        
        # VULNERABILITY: No authentication or authorization
        # VULNERABILITY: Mass assignment - accept all fields
        conn = get_db()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        cur.execute(
            """INSERT INTO products (name, description, price, stock_quantity, image_url, category) 
               VALUES (%s, %s, %s, %s, %s, %s) RETURNING *""",
            (data.get('name'), data.get('description'), data.get('price'), 
             data.get('stock_quantity', 0), data.get('image_url'), data.get('category'))
        )
        
        product = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({'message': 'Product created', 'product': product}), 201
    except Exception as e:
        return jsonify({
            'error': 'Failed to create product',
            'message': str(e)
        }), 500

# Update product
@products_bp.route('/<int:product_id>', methods=['PUT'])
def update_product(product_id):
    try:
        data = request.json
        
        # VULNERABILITY: No authentication or authorization
        # VULNERABILITY: Mass assignment on product updates
        conn = get_db()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Build dynamic update query - VULNERABILITY: Potential SQL injection
        update_fields = []
        values = []
        for key, value in data.items():
            update_fields.append(f"{key} = %s")
            values.append(value)
        
        if not update_fields:
            return jsonify({'error': 'No fields to update'}), 400
        
        values.append(product_id)
        query = f"UPDATE products SET {', '.join(update_fields)} WHERE id = %s RETURNING *"
        
        cur.execute(query, values)
        product = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()
        
        if not product:
            return jsonify({'error': 'Product not found'}), 404
            
        return jsonify({'message': 'Product updated', 'product': product})
    except Exception as e:
        return jsonify({
            'error': 'Failed to update product',
            'message': str(e)
        }), 500

# Delete product
@products_bp.route('/<int:product_id>', methods=['DELETE'])
def delete_product(product_id):
    try:
        # VULNERABILITY: No authentication or authorization
        conn = get_db()
        cur = conn.cursor()
        
        cur.execute("DELETE FROM products WHERE id = %s", (product_id,))
        conn.commit()
        
        if cur.rowcount == 0:
            return jsonify({'error': 'Product not found'}), 404
        
        cur.close()
        conn.close()
        
        return jsonify({'message': 'Product deleted'})
    except Exception as e:
        return jsonify({
            'error': 'Failed to delete product',
            'message': str(e)
        }), 500

# VULNERABILITY: Server-Side Request Forgery (SSRF)
@products_bp.route('/fetch-image', methods=['POST'])
def fetch_image():
    """
    VULNERABILITY: SSRF - Fetches an image from a URL without validation
    Allows attackers to scan internal networks or access internal resources
    """
    try:
        data = request.json
        url = data.get('url')
        
        if not url:
            return jsonify({'error': 'URL required'}), 400
        
        # VULNERABILITY: No URL validation or whitelist
        # Attacker can access internal services like http://localhost:6379 (Redis)
        # or cloud metadata endpoints like http://169.254.169.254
        response = requests.get(url, timeout=5)
        
        return jsonify({
            'message': 'Image fetched successfully',
            'url': url,
            'status_code': response.status_code,
            'content_type': response.headers.get('Content-Type'),
            'content_length': len(response.content),
            # VULNERABILITY: Exposing response content
            'preview': response.text[:500] if 'text' in response.headers.get('Content-Type', '') else None
        })
    except Exception as e:
        # VULNERABILITY: Exposing internal network errors
        return jsonify({
            'error': 'Failed to fetch image',
            'message': str(e),
            'url': url
        }), 500

# VULNERABILITY: Insecure Deserialization
@products_bp.route('/cache', methods=['POST'])
def cache_product():
    """
    VULNERABILITY: Insecure deserialization using pickle
    Allows arbitrary code execution
    """
    try:
        data = request.json
        product_data = data.get('product')
        
        # VULNERABILITY: Using pickle to serialize data (insecure)
        pickled = pickle.dumps(product_data)
        
        return jsonify({
            'message': 'Product cached',
            'cache_key': pickled.hex()
        })
    except Exception as e:
        return jsonify({
            'error': 'Failed to cache product',
            'message': str(e)
        }), 500

@products_bp.route('/cache/<cache_key>', methods=['GET'])
def get_cached_product(cache_key):
    """
    VULNERABILITY: Insecure deserialization - unpickles user-provided data
    """
    try:
        # VULNERABILITY: Deserializing user-controlled data
        pickled_data = bytes.fromhex(cache_key)
        product = pickle.loads(pickled_data)
        
        return jsonify({
            'message': 'Product retrieved from cache',
            'product': product
        })
    except Exception as e:
        return jsonify({
            'error': 'Failed to retrieve cached product',
            'message': str(e)
        }), 500

# VULNERABILITY: Directory Traversal
@products_bp.route('/download', methods=['GET'])
def download_file():
    """
    VULNERABILITY: Directory traversal in file download
    """
    filename = request.args.get('file')
    
    if not filename:
        return jsonify({'error': 'Filename required'}), 400
    
    try:
        # VULNERABILITY: No path sanitization
        # Attacker can use ../../../etc/passwd
        file_path = f"/app/uploads/{filename}"
        
        return send_file(file_path, as_attachment=True)
    except FileNotFoundError:
        return jsonify({'error': 'File not found'}), 404
    except Exception as e:
        # VULNERABILITY: Exposing file system information
        return jsonify({
            'error': 'Failed to download file',
            'message': str(e),
            'attempted_path': file_path
        }), 500

# Search products
@products_bp.route('/search', methods=['GET'])
def search_products():
    try:
        query = request.args.get('q', '')
        category = request.args.get('category')
        
        conn = get_db()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        sql = "SELECT * FROM products WHERE name ILIKE %s"
        params = [f'%{query}%']
        
        if category:
            sql += " AND category = %s"
            params.append(category)
        
        cur.execute(sql, params)
        products = cur.fetchall()
        
        cur.close()
        conn.close()
        
        return jsonify({'products': products, 'count': len(products)})
    except Exception as e:
        return jsonify({
            'error': 'Search failed',
            'message': str(e)
        }), 500

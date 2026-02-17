import os
from flask import Flask, jsonify
from routes.products import products_bp

app = Flask(__name__)

# VULNERABILITY: Debug mode enabled in production
# Exposes stack traces, allows code execution via debugger
app.config['DEBUG'] = True

# VULNERABILITY: No security headers configured
# Should add X-Frame-Options, X-Content-Type-Options, etc.

# Health check
@app.route('/health')
def health():
    return jsonify({'status': 'healthy', 'service': 'product-service'})

# Register blueprints
app.register_blueprint(products_bp, url_prefix='/api/products')
app.register_blueprint(products_bp, url_prefix='')  # Also without prefix

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'error': 'Not Found',
        'message': str(error)
    }), 404

@app.errorhandler(500)
def internal_error(error):
    # VULNERABILITY: Exposing internal errors
    return jsonify({
        'error': 'Internal Server Error',
        'message': str(error),
        'type': type(error).__name__
    }), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 3003))
    print(f'🛍️  Product Service running on port {port}')
    print(f'⚠️  WARNING: This service is intentionally vulnerable!')
    print(f'⚠️  DEBUG MODE IS ENABLED - DO NOT USE IN PRODUCTION')
    
    # VULNERABILITY: Running with debug=True and host='0.0.0.0'
    # Allows remote code execution via debugger
    app.run(host='0.0.0.0', port=port, debug=True)

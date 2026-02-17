import os
from flask import Flask, jsonify
from routes.notifications import notifications_bp

app = Flask(__name__)

# VULNERABILITY: Debug mode enabled
app.config['DEBUG'] = True

# Health check
@app.route('/health')
def health():
    return jsonify({'status': 'healthy', 'service': 'notification-service'})

# Register blueprints
app.register_blueprint(notifications_bp, url_prefix='/api/notifications')
app.register_blueprint(notifications_bp, url_prefix='')  # Also without prefix

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'error': 'Not Found',
        'message': str(error)
    }), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'error': 'Internal Server Error',
        'message': str(error)
    }), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 3006))
    print(f'📧 Notification Service running on port {port}')
    print(f'⚠️  WARNING: This service is intentionally vulnerable!')
    
    app.run(host='0.0.0.0', port=port, debug=True)

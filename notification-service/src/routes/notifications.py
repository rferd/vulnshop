import os
import subprocess
import redis
from flask import Blueprint, request, jsonify, redirect
from jinja2 import Template

notifications_bp = Blueprint('notifications', __name__)

# Redis connection
redis_client = redis.Redis(
    host=os.environ.get('REDIS_HOST', 'localhost'),
    port=int(os.environ.get('REDIS_PORT', 6379)),
    decode_responses=True
)

# Test Redis connection
try:
    redis_client.ping()
    print('✅ Connected to Redis')
except Exception as e:
    print(f'❌ Redis connection error: {e}')

# Send email notification
@notifications_bp.route('/send-email', methods=['POST'])
def send_email():
    """
    VULNERABILITY: Command injection in email sending
    """
    try:
        data = request.json
        recipient = data.get('email')
        subject = data.get('subject')
        message = data.get('message')
        
        if not recipient or not subject or not message:
            return jsonify({'error': 'email, subject, and message are required'}), 400
        
        # VULNERABILITY: Command injection via subprocess
        # User input is directly passed to shell command
        command = f'echo "To: {recipient}\nSubject: {subject}\n\n{message}" | cat'
        
        # VULNERABILITY: Using shell=True with user input
        result = subprocess.run(command, shell=True, capture_output=True, text=True)
        
        # Store notification in Redis
        notification_id = f"email:{recipient}:{subject}"
        redis_client.setex(notification_id, 3600, message)
        
        # VULNERABILITY: Log injection - unsanitized user input in logs
        print(f"Email sent to {recipient}\nSubject: {subject}\nMessage: {message}")
        
        return jsonify({
            'message': 'Email notification sent',
            'recipient': recipient,
            'command_output': result.stdout,
            'command_error': result.stderr
        })
    except Exception as e:
        return jsonify({
            'error': 'Failed to send email',
            'message': str(e)
        }), 500

# Send SMS notification
@notifications_bp.route('/send-sms', methods=['POST'])
def send_sms():
    """
    Send SMS notification
    """
    try:
        data = request.json
        phone = data.get('phone')
        message = data.get('message')
        
        if not phone or not message:
            return jsonify({'error': 'phone and message are required'}), 400
        
        # Store notification in Redis
        notification_id = f"sms:{phone}"
        redis_client.setex(notification_id, 3600, message)
        
        # VULNERABILITY: Log injection
        print(f"SMS sent to {phone}\nMessage: {message}")
        
        return jsonify({
            'message': 'SMS notification sent',
            'phone': phone
        })
    except Exception as e:
        return jsonify({
            'error': 'Failed to send SMS',
            'message': str(e)
        }), 500

# VULNERABILITY: Server-Side Template Injection (SSTI)
@notifications_bp.route('/render-template', methods=['POST'])
def render_template():
    """
    VULNERABILITY: SSTI via Jinja2
    Allows arbitrary code execution through template injection
    """
    try:
        data = request.json
        template_string = data.get('template')
        context = data.get('context', {})
        
        if not template_string:
            return jsonify({'error': 'template is required'}), 400
        
        # VULNERABILITY: Creating template from user input without sanitization
        # Attacker can inject: {{ config.__class__.__init__.__globals__['os'].popen('whoami').read() }}
        template = Template(template_string)
        rendered = template.render(**context)
        
        return jsonify({
            'message': 'Template rendered',
            'rendered': rendered
        })
    except Exception as e:
        return jsonify({
            'error': 'Failed to render template',
            'message': str(e),
            # VULNERABILITY: Exposing stack trace
            'traceback': str(e.__traceback__)
        }), 500

# Get notification status
@notifications_bp.route('/status/<notification_type>/<identifier>', methods=['GET'])
def get_status(notification_type, identifier):
    try:
        notification_id = f"{notification_type}:{identifier}"
        
        # Check if notification exists in Redis
        exists = redis_client.exists(notification_id)
        message = redis_client.get(notification_id) if exists else None
        
        return jsonify({
            'notification_id': notification_id,
            'exists': bool(exists),
            'message': message
        })
    except Exception as e:
        return jsonify({
            'error': 'Failed to check status',
            'message': str(e)
        }), 500

# Queue notification
@notifications_bp.route('/queue', methods=['POST'])
def queue_notification():
    """
    Queue a notification for later processing
    """
    try:
        data = request.json
        notification_type = data.get('type')
        payload = data.get('payload')
        
        if not notification_type or not payload:
            return jsonify({'error': 'type and payload are required'}), 400
        
        # Add to Redis queue
        queue_key = f"queue:{notification_type}"
        redis_client.lpush(queue_key, str(payload))
        
        return jsonify({
            'message': 'Notification queued',
            'type': notification_type,
            'queue_length': redis_client.llen(queue_key)
        })
    except Exception as e:
        return jsonify({
            'error': 'Failed to queue notification',
            'message': str(e)
        }), 500

# VULNERABILITY: Unvalidated redirect
@notifications_bp.route('/track', methods=['GET'])
def track_notification():
    """
    VULNERABILITY: Unvalidated redirects in notification links
    Allows open redirect attacks for phishing
    """
    redirect_url = request.args.get('redirect')
    notification_id = request.args.get('id')
    
    if notification_id:
        # Track the click
        redis_client.incr(f"clicks:{notification_id}")
        # VULNERABILITY: Log injection via URL parameters
        print(f"Notification clicked: {notification_id}, redirecting to: {redirect_url}")
    
    if redirect_url:
        # VULNERABILITY: No validation of redirect URL
        # Attacker can redirect to malicious sites
        return redirect(redirect_url, code=302)
    
    return jsonify({'message': 'Click tracked', 'notification_id': notification_id})

# List queued notifications
@notifications_bp.route('/queue/<notification_type>', methods=['GET'])
def list_queue(notification_type):
    """
    List queued notifications
    """
    try:
        queue_key = f"queue:{notification_type}"
        
        # Get all items from queue
        items = redis_client.lrange(queue_key, 0, -1)
        
        return jsonify({
            'type': notification_type,
            'count': len(items),
            'notifications': items
        })
    except Exception as e:
        return jsonify({
            'error': 'Failed to list queue',
            'message': str(e)
        }), 500

# Execute system command - VULNERABILITY: Direct command execution endpoint
@notifications_bp.route('/admin/execute', methods=['POST'])
def execute_command():
    """
    VULNERABILITY: Command injection endpoint
    Allows arbitrary command execution
    """
    try:
        data = request.json
        command = data.get('command')
        
        if not command:
            return jsonify({'error': 'command is required'}), 400
        
        # VULNERABILITY: Direct command execution without any validation
        result = subprocess.run(command, shell=True, capture_output=True, text=True)
        
        return jsonify({
            'message': 'Command executed',
            'command': command,
            'stdout': result.stdout,
            'stderr': result.stderr,
            'returncode': result.returncode
        })
    except Exception as e:
        return jsonify({
            'error': 'Command execution failed',
            'message': str(e)
        }), 500

# Get notification analytics
@notifications_bp.route('/analytics', methods=['GET'])
def get_analytics():
    """
    Get notification analytics from Redis
    """
    try:
        # Get all click tracking keys
        click_keys = redis_client.keys('clicks:*')
        
        analytics = {}
        for key in click_keys:
            clicks = redis_client.get(key)
            analytics[key] = int(clicks) if clicks else 0
        
        return jsonify({
            'total_tracked': len(analytics),
            'analytics': analytics
        })
    except Exception as e:
        return jsonify({
            'error': 'Failed to fetch analytics',
            'message': str(e)
        }), 500

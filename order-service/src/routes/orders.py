import os
import xml.etree.ElementTree as ET
from flask import Blueprint, request, jsonify
import psycopg2
from psycopg2.extras import RealDictCursor

orders_bp = Blueprint('orders', __name__)

# Database connection
def get_db():
    return psycopg2.connect(
        host=os.environ.get('POSTGRES_HOST', 'localhost'),
        port=os.environ.get('POSTGRES_PORT', 5432),
        user=os.environ.get('POSTGRES_USER', 'vulnshop'),
        password=os.environ.get('POSTGRES_PASSWORD', 'vulnerable123'),
        database=os.environ.get('POSTGRES_DB', 'vulnshop')
    )

# Get all orders
@orders_bp.route('/', methods=['GET'])
@orders_bp.route('/list', methods=['GET'])
def get_orders():
    try:
        # VULNERABILITY: No authentication check
        # VULNERABILITY: No filtering by user - returns all orders
        conn = get_db()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        cur.execute("SELECT * FROM orders")
        orders = cur.fetchall()
        
        cur.close()
        conn.close()
        
        return jsonify({'orders': orders, 'count': len(orders)})
    except Exception as e:
        return jsonify({
            'error': 'Failed to fetch orders',
            'message': str(e)
        }), 500

# Get single order
@orders_bp.route('/<int:order_id>', methods=['GET'])
def get_order(order_id):
    try:
        # VULNERABILITY: Insecure Direct Object Reference (IDOR)
        # No check if the requesting user owns this order
        conn = get_db()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        cur.execute("SELECT * FROM orders WHERE id = %s", (order_id,))
        order = cur.fetchone()
        
        if not order:
            cur.close()
            conn.close()
            return jsonify({'error': 'Order not found'}), 404
        
        # Get order items
        cur.execute("""
            SELECT oi.*, p.name as product_name 
            FROM order_items oi 
            JOIN products p ON oi.product_id = p.id 
            WHERE oi.order_id = %s
        """, (order_id,))
        items = cur.fetchall()
        
        cur.close()
        conn.close()
        
        order['items'] = items
        return jsonify(order)
    except Exception as e:
        return jsonify({
            'error': 'Failed to fetch order',
            'message': str(e)
        }), 500

# Create order
@orders_bp.route('/', methods=['POST'])
def create_order():
    try:
        data = request.json
        user_id = data.get('user_id')
        items = data.get('items', [])
        
        if not user_id or not items:
            return jsonify({'error': 'user_id and items are required'}), 400
        
        conn = get_db()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Calculate total
        total_amount = 0
        for item in items:
            # VULNERABILITY: Business logic flaw - no validation of negative quantities
            # Allows users to get refunds by ordering negative quantities
            quantity = item.get('quantity', 0)
            price = item.get('price', 0)
            total_amount += quantity * price
        
        # Create order
        cur.execute(
            "INSERT INTO orders (user_id, total_amount, status) VALUES (%s, %s, %s) RETURNING *",
            (user_id, total_amount, 'pending')
        )
        order = cur.fetchone()
        order_id = order['id']
        
        # Create order items
        for item in items:
            cur.execute(
                """INSERT INTO order_items (order_id, product_id, quantity, price) 
                   VALUES (%s, %s, %s, %s)""",
                (order_id, item.get('product_id'), item.get('quantity'), item.get('price'))
            )
        
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({'message': 'Order created', 'order': order}), 201
    except Exception as e:
        return jsonify({
            'error': 'Failed to create order',
            'message': str(e)
        }), 500

# Update order
@orders_bp.route('/<int:order_id>', methods=['PUT'])
def update_order(order_id):
    try:
        # VULNERABILITY: Broken access control - no role check
        # Any user can update any order
        data = request.json
        
        conn = get_db()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # VULNERABILITY: Users can change order status to 'completed' without payment
        status = data.get('status')
        if status:
            cur.execute(
                "UPDATE orders SET status = %s WHERE id = %s RETURNING *",
                (status, order_id)
            )
        
        order = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()
        
        if not order:
            return jsonify({'error': 'Order not found'}), 404
        
        return jsonify({'message': 'Order updated', 'order': order})
    except Exception as e:
        return jsonify({
            'error': 'Failed to update order',
            'message': str(e)
        }), 500

# Delete order
@orders_bp.route('/<int:order_id>', methods=['DELETE'])
def delete_order(order_id):
    try:
        # VULNERABILITY: No authorization check
        conn = get_db()
        cur = conn.cursor()
        
        # Delete order items first
        cur.execute("DELETE FROM order_items WHERE order_id = %s", (order_id,))
        
        # Delete order
        cur.execute("DELETE FROM orders WHERE id = %s", (order_id,))
        conn.commit()
        
        if cur.rowcount == 0:
            return jsonify({'error': 'Order not found'}), 404
        
        cur.close()
        conn.close()
        
        return jsonify({'message': 'Order deleted'})
    except Exception as e:
        return jsonify({
            'error': 'Failed to delete order',
            'message': str(e)
        }), 500

# VULNERABILITY: XML External Entity (XXE) Injection
@orders_bp.route('/import', methods=['POST'])
def import_orders():
    """
    VULNERABILITY: XXE injection in XML parsing
    Allows reading arbitrary files from the server
    """
    try:
        xml_data = request.data.decode('utf-8')
        
        if not xml_data:
            return jsonify({'error': 'XML data required'}), 400
        
        # VULNERABILITY: Using unsafe XML parser that allows external entities
        # This should use defusedxml instead
        parser = ET.XMLParser()
        root = ET.fromstring(xml_data, parser=parser)
        
        imported_orders = []
        
        # Parse orders from XML
        for order_elem in root.findall('order'):
            user_id = order_elem.find('user_id').text
            total = order_elem.find('total').text
            
            conn = get_db()
            cur = conn.cursor(cursor_factory=RealDictCursor)
            
            cur.execute(
                "INSERT INTO orders (user_id, total_amount, status) VALUES (%s, %s, %s) RETURNING *",
                (user_id, total, 'pending')
            )
            order = cur.fetchone()
            imported_orders.append(order)
            
            conn.commit()
            cur.close()
            conn.close()
        
        return jsonify({
            'message': 'Orders imported successfully',
            'count': len(imported_orders),
            'orders': imported_orders
        })
    except ET.ParseError as e:
        return jsonify({
            'error': 'Invalid XML',
            'message': str(e)
        }), 400
    except Exception as e:
        # VULNERABILITY: Exposing file contents via error messages (XXE)
        return jsonify({
            'error': 'Failed to import orders',
            'message': str(e),
            'xml_preview': xml_data[:200]
        }), 500

# Get user's orders
@orders_bp.route('/user/<int:user_id>', methods=['GET'])
def get_user_orders(user_id):
    try:
        # VULNERABILITY: No authentication - anyone can view anyone's orders
        conn = get_db()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        cur.execute("SELECT * FROM orders WHERE user_id = %s", (user_id,))
        orders = cur.fetchall()
        
        cur.close()
        conn.close()
        
        return jsonify({'orders': orders, 'count': len(orders)})
    except Exception as e:
        return jsonify({
            'error': 'Failed to fetch user orders',
            'message': str(e)
        }), 500

# Export order
@orders_bp.route('/<int:order_id>/export', methods=['GET'])
def export_order(order_id):
    """
    Export order as XML
    """
    try:
        conn = get_db()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        cur.execute("SELECT * FROM orders WHERE id = %s", (order_id,))
        order = cur.fetchone()
        
        if not order:
            return jsonify({'error': 'Order not found'}), 404
        
        cur.execute("SELECT * FROM order_items WHERE order_id = %s", (order_id,))
        items = cur.fetchall()
        
        cur.close()
        conn.close()
        
        # Generate XML
        xml_output = f"""<?xml version="1.0"?>
<order>
    <id>{order['id']}</id>
    <user_id>{order['user_id']}</user_id>
    <total_amount>{order['total_amount']}</total_amount>
    <status>{order['status']}</status>
    <items>
"""
        for item in items:
            xml_output += f"""        <item>
            <id>{item['id']}</id>
            <product_id>{item['product_id']}</product_id>
            <quantity>{item['quantity']}</quantity>
            <price>{item['price']}</price>
        </item>
"""
        xml_output += """    </items>
</order>"""
        
        return xml_output, 200, {'Content-Type': 'application/xml'}
    except Exception as e:
        return jsonify({
            'error': 'Failed to export order',
            'message': str(e)
        }), 500

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

function Orders({ user, token }) {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchOrders();
  }, [user]);

  const fetchOrders = async () => {
    try {
      // VULNERABILITY: Using user ID from client-side state (easily manipulated)
      const response = await axios.get(`${API_URL}/orders/user/${user.id}`);
      setOrders(response.data.orders || []);
    } catch (err) {
      setError('Failed to load orders');
    }
  };

  const handleCreateOrder = async () => {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    
    if (cart.length === 0) {
      setError('Cart is empty');
      return;
    }

    try {
      const items = cart.map(product => ({
        product_id: product.id,
        quantity: 1,
        price: product.price
      }));

      // VULNERABILITY: User ID sent from client side (easily modified)
      const response = await axios.post(`${API_URL}/orders`, {
        user_id: user.id,
        items
      });

      setMessage('Order created successfully!');
      localStorage.removeItem('cart');
      fetchOrders();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError('Failed to create order');
    }
  };

  const handleCancelOrder = async (orderId) => {
    try {
      // VULNERABILITY: No authorization check - any user can cancel any order
      await axios.delete(`${API_URL}/orders/${orderId}`);
      setMessage('Order cancelled');
      fetchOrders();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError('Failed to cancel order');
    }
  };

  const handleViewOrder = (orderId) => {
    // VULNERABILITY: Open redirect via URL parameter manipulation
    const redirect = new URLSearchParams(window.location.search).get('redirect');
    if (redirect) {
      window.location.href = redirect;
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>My Orders</h2>
        <button 
          onClick={handleCreateOrder}
          className="btn-primary"
          style={{ width: 'auto', padding: '10px 20px' }}
        >
          Create Order from Cart
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}
      {message && <div className="success-message">{message}</div>}

      <div className="orders-list">
        {orders.map((order) => (
          <div key={order.id} className="order-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div>
                <h3>Order #{order.id}</h3>
                <p><strong>Total:</strong> ${order.total_amount}</p>
                <p><strong>Date:</strong> {new Date(order.created_at).toLocaleDateString()}</p>
                <span className={`order-status ${order.status}`}>
                  {order.status}
                </span>
              </div>
              <div>
                <button 
                  onClick={() => handleViewOrder(order.id)}
                  style={{ marginRight: '10px', padding: '8px 16px', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  View
                </button>
                <button 
                  onClick={() => handleCancelOrder(order.id)}
                  style={{ padding: '8px 16px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {orders.length === 0 && !error && (
        <p style={{ textAlign: 'center', color: '#666', marginTop: '40px' }}>
          You haven't placed any orders yet
        </p>
      )}

      {/* VULNERABILITY: Reflected XSS via URL parameter */}
      {new URLSearchParams(window.location.search).get('message') && (
        <div 
          style={{ marginTop: '20px', padding: '10px', backgroundColor: '#fff3cd', borderRadius: '4px' }}
          dangerouslySetInnerHTML={{ __html: new URLSearchParams(window.location.search).get('message') }}
        />
      )}
    </div>
  );
}

export default Orders;

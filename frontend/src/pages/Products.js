import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

function Products({ user, token }) {
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API_URL}/products/list`);
      setProducts(response.data.products || []);
    } catch (err) {
      setError('Failed to load products');
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      fetchProducts();
      return;
    }

    try {
      // VULNERABILITY: Search query not sanitized
      const response = await axios.get(`${API_URL}/products/search?q=${searchQuery}`);
      setProducts(response.data.products || []);
    } catch (err) {
      setError('Search failed');
    }
  };

  const handleAddToCart = (product) => {
    // VULNERABILITY: No actual cart implementation, just localStorage
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    cart.push(product);
    localStorage.setItem('cart', JSON.stringify(cart));
    setMessage(`Added ${product.name} to cart!`);
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <div>
      <h2>Products</h2>
      
      <div className="search-box">
        <form onSubmit={handleSearch}>
          {/* VULNERABILITY: No input sanitization on search */}
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </form>
      </div>

      {error && <div className="error-message">{error}</div>}
      {message && <div className="success-message">{message}</div>}

      {/* VULNERABILITY: Using dangerouslySetInnerHTML without sanitization */}
      {searchQuery && (
        <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
          <strong>Search results for:</strong>{' '}
          <span dangerouslySetInnerHTML={{ __html: searchQuery }} />
        </div>
      )}

      <div className="products-grid">
        {products.map((product) => (
          <div key={product.id} className="product-card">
            <h3>{product.name}</h3>
            {/* VULNERABILITY: Rendering HTML without sanitization */}
            <div 
              className="description" 
              dangerouslySetInnerHTML={{ __html: product.description }}
            />
            <div className="price">${product.price}</div>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
              Stock: {product.stock_quantity}
            </div>
            <button onClick={() => handleAddToCart(product)}>
              Add to Cart
            </button>
          </div>
        ))}
      </div>

      {products.length === 0 && !error && (
        <p style={{ textAlign: 'center', color: '#666', marginTop: '40px' }}>
          No products found
        </p>
      )}
    </div>
  );
}

export default Products;

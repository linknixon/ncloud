import React from 'react';
import { useApp } from '../context/AppContext';
import { X, Trash2, ArrowRight, ShieldCheck, ShoppingBag } from 'lucide-react';

export default function CartDrawer({ onCheckout }) {
  const { isCartOpen, setIsCartOpen, cart, updateCartQuantity, removeFromCart, clearCart, showToast } = useApp();

  if (!isCartOpen) return null;

  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className="modal-overlay" onClick={() => setIsCartOpen(false)}>
      <div
        className="cart-drawer-box"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          maxWidth: '440px',
          background: 'var(--bg-card)',
          borderLeft: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 2500,
          animation: 'fadeIn 0.3s ease'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: '700', fontSize: '1.1rem' }}>
            <ShoppingBag size={20} color="var(--primary)" />
            Shopping Cart ({cart.length})
          </div>
          <button
            onClick={() => setIsCartOpen(false)}
            style={{ background: 'none', color: 'var(--text-muted)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Cart Items List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              <ShoppingBag size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
              <p style={{ fontWeight: '600', fontSize: '1rem' }}>Your shopping cart is empty</p>
              <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Browse our digital shop to add software licenses and cloud packages.</p>
            </div>
          ) : (
            cart.map(item => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  gap: '0.85rem',
                  alignItems: 'center',
                  background: 'var(--bg-main)',
                  padding: '0.85rem',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)'
                }}
              >
                <img
                  src={item.image_url}
                  alt={item.name}
                  style={{ width: '52px', height: '52px', borderRadius: '8px', objectFit: 'cover' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '700', fontSize: '0.875rem', lineHeight: '1.3' }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: '700', marginTop: '0.2rem' }}>
                    {item.currency} {(item.price * item.quantity).toLocaleString()}
                  </div>

                  {/* Quantity Counter */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.4rem' }}>
                    <button
                      onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '6px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-main)',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.85rem'
                      }}
                    >
                      -
                    </button>
                    <span style={{ fontSize: '0.85rem', fontWeight: '700', minWidth: '20px', textAlign: 'center' }}>
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '6px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-main)',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.85rem'
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => removeFromCart(item.id)}
                  style={{ background: 'none', color: '#ef4444', padding: '0.4rem' }}
                  title="Remove item"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer & Checkout */}
        {cart.length > 0 && (
          <div style={{
            padding: '1.5rem',
            borderTop: '1px solid var(--border-color)',
            background: 'var(--bg-main)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontWeight: '700', fontSize: '1.1rem' }}>
              <span>Total Amount:</span>
              <span style={{ color: 'var(--primary)' }}>UGX {totalAmount.toLocaleString()}</span>
            </div>

            <button
              onClick={() => {
                setIsCartOpen(false);
                onCheckout();
              }}
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '0.85rem' }}
            >
              Proceed to Subscription Payment <ArrowRight size={18} />
            </button>

            <button
              onClick={clearCart}
              style={{
                width: '100%',
                background: 'none',
                color: 'var(--text-muted)',
                fontSize: '0.8rem',
                marginTop: '0.75rem'
              }}
            >
              Clear Cart
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { ChevronUp } from 'lucide-react';

export default function BackToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  if (!isVisible) return null;

  return (
    <button
      onClick={scrollToTop}
      style={{
        position: 'fixed',
        bottom: '2.25rem',
        right: '2.25rem',
        width: '46px',
        height: '46px',
        borderRadius: '12px',
        background: 'var(--gradient-brand)',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 6px 20px rgba(30, 58, 138, 0.45)',
        zIndex: 999,
        transition: 'transform 0.25s ease, opacity 0.25s ease',
        cursor: 'pointer'
      }}
      title="Back to Top"
      aria-label="Back to Top"
    >
      <ChevronUp size={24} />
    </button>
  );
}

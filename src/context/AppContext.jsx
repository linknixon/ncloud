import React, { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();

const getAutoTimeTheme = () => {
  const hour = new Date().getHours();
  // Evening / Night: 6:00 PM (18:00) to 6:00 AM (06:00) -> dark mode
  // Daytime: 6:00 AM (06:00) to 6:00 PM (18:00) -> light mode
  return (hour >= 18 || hour < 6) ? 'dark' : 'light';
};

export function AppProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const manualTheme = localStorage.getItem('user_manual_theme');
    if (manualTheme) {
      return localStorage.getItem('theme') || getAutoTimeTheme();
    }
    return getAutoTimeTheme();
  });
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || null);
  const [cart, setCart] = useState(JSON.parse(localStorage.getItem('cart')) || []);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Periodic check to update auto theme if time crosses 6 PM or 6 AM
  useEffect(() => {
    const checkAutoTheme = () => {
      const manualTheme = localStorage.getItem('user_manual_theme');
      if (!manualTheme) {
        setTheme(getAutoTimeTheme());
      }
    };
    
    checkAutoTheme();
    const interval = setInterval(checkAutoTheme, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  const toggleTheme = () => {
    setTheme(prev => {
      const nextTheme = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('user_manual_theme', 'true');
      return nextTheme;
    });
  };

  const openAuthModal = (mode = 'login') => {
    setAuthMode(mode);
    setIsAuthOpen(true);
  };

  const showToast = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const addToCart = (product, qty = 1) => {
    const addQuantity = Math.max(1, parseInt(qty) || 1);
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + addQuantity } : item
        );
      }
      return [...prev, { ...product, quantity: addQuantity }];
    });
    showToast(`Added ${addQuantity}x "${product.name}" to cart!`, 'success');
  };

  const updateCartQuantity = (id, qty) => {
    const newQty = Math.max(1, parseInt(qty) || 1);
    setCart(prev => prev.map(item =>
      item.id === id ? { ...item, quantity: newQty } : item
    ));
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const clearCart = () => {
    setCart([]);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('token');
    showToast('You have been logged out.', 'info');
  };

  const [siteLogo, setSiteLogo] = useState(localStorage.getItem('site_logo') || '');

  const updateSiteLogo = (newLogoUrl) => {
    setSiteLogo(newLogoUrl);
    if (newLogoUrl) {
      localStorage.setItem('site_logo', newLogoUrl);
    } else {
      localStorage.removeItem('site_logo');
    }
  };

  return (
    <AppContext.Provider
      value={{
        theme,
        toggleTheme,
        user,
        setUser,
        logout,
        cart,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        isAuthOpen,
        setIsAuthOpen,
        authMode,
        setAuthMode,
        openAuthModal,
        isCartOpen,
        setIsCartOpen,
        notification,
        showToast,
        siteLogo,
        updateSiteLogo
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}

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
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isDirectCheckoutOpen, setIsDirectCheckoutOpen] = useState(false);
  const [directCheckoutItems, setDirectCheckoutItems] = useState([]);
  const [selectedSubscriptionItems, setSelectedSubscriptionItems] = useState(null);
  const [notification, setNotification] = useState(null);

  const openDirectCheckout = (items = []) => {
    const targetItems = (items && items.length > 0) ? items : cart;
    setDirectCheckoutItems(targetItems);
    setIsDirectCheckoutOpen(true);
  };

  const closeDirectCheckout = () => {
    setIsDirectCheckoutOpen(false);
    setDirectCheckoutItems([]);
  };

  const openSubscriptionCheckout = (items = []) => {
    setSelectedSubscriptionItems(items && items.length > 0 ? items : null);
  };

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

  // Real-time synchronization of user profile when modified by Admin or Self
  useEffect(() => {
    if (!user?.email) return;

    const syncUserProfile = () => {
      fetch('/api/admin/users')
        .then(r => r.json())
        .then(usersList => {
          if (Array.isArray(usersList)) {
            const updated = usersList.find(u => u.email === user.email || (user.id && u.id == user.id));
            if (updated) {
              if (updated.status === 'Suspended' || updated.status === 'Inactive') {
                showToast(`Your user account status has been set to ${updated.status} by Administrator.`, 'error');
                setUser(null);
                localStorage.removeItem('user');
                return;
              }

              const hasChanged = 
                updated.name !== user.name ||
                updated.email !== user.email ||
                updated.role !== user.role ||
                updated.phone !== user.phone ||
                updated.company !== user.company ||
                updated.department !== user.department ||
                updated.position !== user.position ||
                updated.status !== user.status ||
                updated.avatar_url !== user.avatar_url ||
                updated.supervisor_name !== user.supervisor_name;

              if (hasChanged) {
                const merged = { ...user, ...updated };
                setUser(merged);
                localStorage.setItem('user', JSON.stringify(merged));
              }
            }
          }
        })
        .catch(() => {});
    };

    syncUserProfile();
    const interval = setInterval(syncUserProfile, 3000);
    window.addEventListener('user_profile_updated', syncUserProfile);
    return () => {
      clearInterval(interval);
      window.removeEventListener('user_profile_updated', syncUserProfile);
    };
  }, [user?.email, user?.id, user?.name, user?.role, user?.phone, user?.company, user?.department, user?.position, user?.status, user?.avatar_url, user?.supervisor_name]);

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
    localStorage.removeItem('user');
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('nova_draft_') || key.includes('subscriber') || key.includes('customer')) {
          localStorage.removeItem(key);
        }
      });
    } catch (err) {}
    window.dispatchEvent(new Event('user_logged_out'));
    showToast('You have been logged out.', 'info');
  };

  // 20-Minute Inactivity Auto-Logout
  useEffect(() => {
    if (!user) return;
    
    let inactivityTimer;
    const INACTIVITY_LIMIT = 20 * 60 * 1000; // 20 minutes

    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        logout();
        showToast('You have been logged out due to 20 minutes of inactivity.', 'warning');
      }, INACTIVITY_LIMIT);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(e => document.addEventListener(e, resetTimer, true));
    
    resetTimer();

    return () => {
      clearTimeout(inactivityTimer);
      events.forEach(e => document.removeEventListener(e, resetTimer, true));
    };
  }, [user]);

  const [siteLogo, setSiteLogo] = useState(() => localStorage.getItem('site_logo') || '');
  const [siteFavicon, setSiteFavicon] = useState(() => localStorage.getItem('site_favicon') || '');

  const applyFavicon = (url) => {
    if (!url) return;
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.getElementsByTagName('head')[0].appendChild(link);
    }
    link.href = url;
  };

  useEffect(() => {
    fetch('/api/admin/settings/logo')
      .then(res => res.json())
      .then(data => {
        if (data && data.logoUrl) {
          setSiteLogo(data.logoUrl);
          localStorage.setItem('site_logo', data.logoUrl);
        }
      })
      .catch(() => {});

    fetch('/api/admin/settings/favicon')
      .then(res => res.json())
      .then(data => {
        if (data && data.faviconUrl) {
          setSiteFavicon(data.faviconUrl);
          localStorage.setItem('site_favicon', data.faviconUrl);
          applyFavicon(data.faviconUrl);
        } else if (siteFavicon) {
          applyFavicon(siteFavicon);
        }
      })
      .catch(() => {
        if (siteFavicon) applyFavicon(siteFavicon);
      });
  }, []);

  const updateSiteLogo = async (newLogoUrl) => {
    setSiteLogo(newLogoUrl);
    if (newLogoUrl) {
      localStorage.setItem('site_logo', newLogoUrl);
    } else {
      localStorage.removeItem('site_logo');
    }

    try {
      await fetch('/api/admin/settings/logo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logoUrl: newLogoUrl })
      });
    } catch (err) {
      console.warn('Backend logo sync notice:', err);
    }
  };

  const updateSiteFavicon = async (newFaviconUrl) => {
    setSiteFavicon(newFaviconUrl);
    if (newFaviconUrl) {
      localStorage.setItem('site_favicon', newFaviconUrl);
      applyFavicon(newFaviconUrl);
    } else {
      localStorage.removeItem('site_favicon');
    }

    try {
      await fetch('/api/admin/settings/favicon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ faviconUrl: newFaviconUrl })
      });
    } catch (err) {
      console.warn('Backend favicon sync notice:', err);
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
        isEditProfileOpen,
        setIsEditProfileOpen,
        isDirectCheckoutOpen,
        setIsDirectCheckoutOpen,
        directCheckoutItems,
        setDirectCheckoutItems,
        openDirectCheckout,
        closeDirectCheckout,
        selectedSubscriptionItems,
        setSelectedSubscriptionItems,
        openSubscriptionCheckout,
        notification,
        showToast,
        siteLogo,
        updateSiteLogo,
        siteFavicon,
        updateSiteFavicon
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}

import SEO from "../components/SEO";
import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Info, 
  X, 
  Wifi, 
  Share2, 
  HelpCircle, 
  ChevronDown, 
  CheckCircle2, 
  ShieldCheck, 
  Truck, 
  CreditCard, 
  Server,
  ExternalLink
} from 'lucide-react';

const DEFAULT_CATALOG_PRODUCTS = [
  {
    id: 1,
    name: 'Cloud VPS Server Hosting (Uganda IXP)',
    slug: 'cloud-vps-server-hosting-uganda-ixp',
    category: 'Hosting Services',
    price: 120000,
    currency: 'UGX',
    stock: 50,
    billing_period: 'monthly',
    badge: 'Popular',
    image_url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=600&q=80',
    short_desc: 'High performance SSD VPS directly interconnected with the Uganda Internet Exchange Point (UIXP).',
    description: '2 vCPU, 4GB ECC RAM, 80GB NVMe SSD, 1Gbps unmetered local traffic, sovereign Uganda IP.'
  },
  {
    id: 2,
    name: 'Tier III Data Center Colocation & 1U Rack Hosting',
    slug: 'tier-iii-data-center-colocation-1u-rack-hosting',
    category: 'Hosting Services',
    price: 450000,
    currency: 'UGX',
    stock: 24,
    billing_period: 'monthly',
    badge: 'Enterprise',
    image_url: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=600&q=80',
    short_desc: 'Carrier-neutral rack space colocation with 99.982% uptime SLA and biometric security.',
    description: '1U server space, dual redundant UPS & generator power feeds, 10Gbps cross-connect capability.'
  },
  {
    id: 3,
    name: 'Zimbra Enterprise Mailbox & Server Administration',
    slug: 'zimbra-enterprise-mailbox-server-administration',
    category: 'Hosting Services',
    price: 15000,
    currency: 'UGX',
    stock: 500,
    billing_period: 'monthly',
    badge: 'Corporate',
    image_url: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=600&q=80',
    short_desc: 'Secure corporate email with custom domain, active spam/virus protection, and sync.',
    description: '25GB mailbox storage, collaborative calendars, contacts, webmail, and mobile device sync.'
  },
  {
    id: 4,
    name: 'Intuit QuickBooks Enterprise Solutions v24.0',
    slug: 'intuit-quickbooks-enterprise-solutions-v24',
    category: 'Software & Licenses',
    price: 3500000,
    currency: 'UGX',
    stock: 15,
    billing_period: 'one-time',
    badge: 'Certified',
    image_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80',
    short_desc: 'Complete ERP business accounting license with Uganda tax customization.',
    description: 'Up to 30 simultaneous users, advanced inventory, job costing, and local certified deployment.'
  },
  {
    id: 5,
    name: 'WiFi Hotspot Internet Access Pass (High Speed)',
    slug: 'wifi-hotspot-internet-access-pass-high-speed',
    category: 'WiFi Vouchers',
    price: 1000,
    currency: 'UGX',
    stock: 9999,
    billing_period: 'one-time',
    badge: 'Instant Access',
    image_url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80',
    short_desc: 'Ultra high-speed instant wireless hotspot pass token for laptops and mobile devices.',
    description: 'Instant token delivery upon full payment. Connect to Nova High-Speed WiFi network.'
  }
];

export default function ShopPage({ setActivePage }) {
  const { cart, addToCart, openDirectCheckout, openSubscriptionCheckout, showToast } = useApp();
  const [products, setProducts] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('nova_shop_products_cache');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return DEFAULT_CATALOG_PRODUCTS;
  });
  
  const [category, setCategory] = useState(() => {
    if (typeof window !== 'undefined') {
      const urlCat = new URLSearchParams(window.location.search).get('category');
      if (urlCat) return urlCat;
    }
    return 'Hosting Services';
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [quantities, setQuantities] = useState({});
  const [selectedProductModal, setSelectedProductModal] = useState(null);
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (idx) => setOpenFaq(prev => prev === idx ? null : idx);

  const openProductModal = (prod) => {
    setSelectedProductModal(prod);
    if (typeof window !== 'undefined') {
      const slug = prod.slug || prod.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const url = new URL(window.location.href);
      url.searchParams.set('item', slug);
      window.history.pushState({}, '', url.pathname + url.search);
    }
  };

  const closeProductModal = () => {
    setSelectedProductModal(null);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('item');
      window.history.pushState({}, '', url.pathname + url.search);
    }
  };

  const handleSelectCategory = (cat) => {
    setCategory(cat);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (cat === 'All') {
        url.searchParams.delete('category');
      } else {
        url.searchParams.set('category', cat);
      }
      url.searchParams.delete('item');
      window.history.pushState({}, '', url.pathname + url.search);
    }
  };

  const itemsPerPage = 9;

  const isWifiVoucherItem = (prod) => {
    if (!prod) return false;
    const cat = (prod.category || '').toLowerCase();
    const name = (prod.name || '').toLowerCase();
    return cat.includes('voucher') || cat.includes('wifi') || name.includes('voucher') || name.includes('wifi voucher');
  };

  const isHostingCategoryItem = (prod) => {
    if (!prod) return false;
    if (isWifiVoucherItem(prod)) return false;
    if (prod.category === 'Hosting Services' || prod.category === 'Hosting') return true;
    if (prod.checkout_type === 'hosting' || prod.checkout_flow === 'hosting') return true;

    const categoryStr = (prod.category || '').toLowerCase();
    const nameStr = (prod.name || '').toLowerCase();
    const badgeStr = (prod.badge || '').toLowerCase();
    const keywords = ['hosting', 'cloud', 'vps', 'virtual server', 'cpanel', 'dedicated server', 'unifi controller', 'cloud storage', 'subscription', 'colocation', 'server rack'];
    return keywords.some(kw => categoryStr.includes(kw) || nameStr.includes(kw) || badgeStr.includes(kw));
  };

  const getPriceSuffix = (prod) => {
    if (!prod) return '';
    if (isWifiVoucherItem(prod)) return '/ pass';
    if (isHostingCategoryItem(prod)) return '/ mo';
    return '';
  };

  const getPriceLabel = (prod) => {
    if (!prod) return 'Price:';
    if (isWifiVoucherItem(prod)) return 'Pass Price:';
    if (isHostingCategoryItem(prod)) return 'Monthly Subscription:';
    return 'Price:';
  };

  const handleBuyNow = (prod, qty = 1) => {
    addToCart(prod, qty);
    if (setActivePage) {
      setActivePage('subscription');
    } else if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/subscription');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const [dbCategories, setDbCategories] = useState([]);

  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const loadedProducts = data.filter(p => !p.is_hidden);
          setProducts(loadedProducts);
          try {
            localStorage.setItem('nova_shop_products_cache', JSON.stringify(loadedProducts));
          } catch {}
          if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const itemSlug = params.get('item');
            if (itemSlug) {
              setSearchTerm(itemSlug.replace(/-/g, ' '));
              const matchingProd = loadedProducts.find(p => (p.slug || '').includes(itemSlug) || (p.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-') === itemSlug);
              if (matchingProd) openProductModal(matchingProd);
            }
          }
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });

    fetch('/api/admin/product-categories')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setDbCategories(data);
        }
      })
      .catch(() => {});
  }, []);

  // Sync category or item from URL upon browser history navigation (back/forward)
  useEffect(() => {
    const handleUrlSync = () => {
      const params = new URLSearchParams(window.location.search);
      const urlCat = params.get('category');
      if (urlCat) {
        setCategory(urlCat);
      }
      const itemSlug = params.get('item');
      if (itemSlug && products.length > 0) {
        const matchingProd = products.find(p => (p.slug || '').includes(itemSlug) || (p.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-') === itemSlug);
        if (matchingProd) setSelectedProductModal(matchingProd);
      } else if (!itemSlug) {
        setSelectedProductModal(null);
      }
    };
    window.addEventListener('popstate', handleUrlSync);
    return () => window.removeEventListener('popstate', handleUrlSync);
  }, [products]);

  // Reset page when category or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [category, searchTerm]);

  // Public category tabs dynamically aggregated and prioritized
  const rawCategories = Array.from(new Set([
    ...dbCategories.filter(c => !c.is_hidden && !c.hidden).map(c => c.name),
    ...products.map(p => p.category)
  ].filter(Boolean)));

  const priorityTabs = ['Hosting Services', 'WiFi Vouchers', 'Hardware & Security', 'Software & Licenses', 'Domain Names'];
  const categories = [
    'Hosting Services',
    ...priorityTabs.filter(cat => cat !== 'Hosting Services' && (rawCategories.length === 0 || rawCategories.includes(cat))),
    'All',
    ...rawCategories.filter(cat => !priorityTabs.includes(cat) && cat !== 'Hosting Services' && cat !== 'Hosting').sort()
  ];

  const filteredProducts = products.filter(prod => {
    if (prod.is_hidden || prod.hidden) return false;

    const isHostingSelected = category === 'Hosting Services' || category === 'Hosting';
    const matchesCategory = category === 'All'
      ? true
      : isHostingSelected
        ? (prod.category === 'Hosting Services' || prod.category === 'Hosting' || isHostingCategoryItem(prod))
        : prod.category === category;
    const searchLower = (searchTerm || '').toLowerCase();
    const matchesSearch = (prod.name || '').toLowerCase().includes(searchLower) ||
                          (prod.short_desc || prod.desc || '').toLowerCase().includes(searchLower) ||
                          (prod.description || prod.specs || prod.details || '').toLowerCase().includes(searchLower);
    return matchesCategory && matchesSearch;
  });

  // Pagination calculation
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

  // Dynamic Google Search Schema.org ItemList for Nova Cloud Shop
  const shopSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "OnlineStore",
        "@id": "https://ncloud.co.ug/shop#store",
        "name": "Nova Cloud Store Uganda",
        "alternateName": ["Nova Cloud Shop Kampala", "Nova Cloud Online Shop Uganda", "Nova Cloud IT Store"],
        "url": "https://ncloud.co.ug/shop",
        "logo": "https://ncloud.co.ug/vite.svg",
        "image": "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80",
        "description": "Uganda's official sovereign cloud and IT store in Kampala. Buy Edge Cloud VPS, Tier III Colocation, Zimbra Corporate Email, QuickBooks Enterprise ERP, WiFi Vouchers & IT Hardware.",
        "currenciesAccepted": "UGX, USD",
        "paymentAccepted": "Cash on Delivery, MTN Mobile Money, Airtel Money, Bank Wire Transfer, Visa, Mastercard",
        "priceRange": "UGX 1000 - UGX 15000000",
        "telephone": "+256-790-001631",
        "email": "support@ncloud.co.ug",
        "address": {
          "@type": "PostalAddress",
          "streetAddress": "Lugga Zone, Ndejje, Wakiso",
          "addressLocality": "Kampala",
          "addressRegion": "Central Region",
          "postalCode": "00256",
          "addressCountry": "UG"
        },
        "geo": {
          "@type": "GeoCoordinates",
          "latitude": 0.3156,
          "longitude": 32.5811
        },
        "areaServed": [
          { "@type": "Country", "name": "Uganda" },
          { "@type": "City", "name": "Kampala" },
          { "@type": "AdministrativeArea", "name": "Wakiso" },
          { "@type": "AdministrativeArea", "name": "Entebbe" },
          { "@type": "AdministrativeArea", "name": "Mukono" },
          { "@type": "AdministrativeArea", "name": "Jinja" },
          { "@type": "AdministrativeArea", "name": "Mbarara" },
          { "@type": "AdministrativeArea", "name": "Gulu" }
        ]
      },
      {
        "@type": "BreadcrumbList",
        "@id": "https://ncloud.co.ug/shop#breadcrumbs",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": "https://ncloud.co.ug/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Nova Cloud Shop Uganda",
            "item": "https://ncloud.co.ug/shop"
          },
          ...(category && category !== 'All' ? [{
            "@type": "ListItem",
            "position": 3,
            "name": category,
            "item": `https://ncloud.co.ug/shop?category=${encodeURIComponent(category)}`
          }] : [])
        ]
      },
      {
        "@type": "CollectionPage",
        "@id": "https://ncloud.co.ug/shop#catalog",
        "name": `Nova Cloud Shop Uganda${category !== 'All' ? ` - ${category}` : ''}`,
        "description": "Catalog of Cloud VPS, Server Racks, Zimbra Mail, QuickBooks ERP Licenses, and Enterprise Networking Hardware in Uganda.",
        "url": `https://ncloud.co.ug/shop${category !== 'All' ? `?category=${encodeURIComponent(category)}` : ''}`,
        "mainEntity": {
          "@type": "ItemList",
          "numberOfItems": filteredProducts.length,
          "itemListElement": (filteredProducts.length > 0 ? filteredProducts.slice(0, 20) : products.slice(0, 15)).map((p, idx) => ({
            "@type": "ListItem",
            "position": idx + 1,
            "item": {
              "@type": "Product",
              "name": `${p.name} - Nova Cloud Uganda`,
              "description": p.short_desc || p.description || `${p.name} available at Nova Cloud Edges Kampala Uganda.`,
              "image": p.image_url || "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80",
              "category": p.category || "Cloud & IT Solutions",
              "brand": {
                "@type": "Brand",
                "name": "Nova Cloud"
              },
              "offers": {
                "@type": "Offer",
                "priceCurrency": p.currency || "UGX",
                "price": p.price ? String(p.price) : "50000",
                "priceValidUntil": "2027-12-31",
                "availability": (Number(p.stock) || 0) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
                "itemCondition": "https://schema.org/NewCondition",
                "eligibleRegion": {
                  "@type": "Country",
                  "name": "UG"
                },
                "seller": {
                  "@type": "Organization",
                  "name": "Nova Cloud Edges (U) Limited",
                  "url": "https://ncloud.co.ug"
                }
              }
            }
          }))
        }
      },
      {
        "@type": "FAQPage",
        "@id": "https://ncloud.co.ug/shop#faq",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How can I pay for Nova Cloud servers, vouchers, and IT hardware in Uganda?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Nova Cloud accepts instant automated payments via MTN Mobile Money (*165#) and Airtel Money (*185#), as well as Visa, Mastercard, and direct Ugandan bank wire transfers in UGX and USD."
            }
          },
          {
            "@type": "Question",
            "name": "Where are Nova Cloud Edge VPS servers hosted?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "All Nova Cloud VPS instances and server racks are hosted in sovereign Tier III datacenters located in Kampala, Uganda, directly interconnected with the Uganda Internet Exchange Point (UIXP) for ultra-low single-digit latency."
            }
          },
          {
            "@type": "Question",
            "name": "How fast is delivery of physical IT equipment and server hardware across Uganda?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Physical hardware (routers, server accessories, colocation equipment) is dispatched same-day in Kampala and Wakiso, and delivered within 24 to 48 hours to all districts of Uganda. Digital products like Cloud VPS and WiFi vouchers activate instantly upon payment confirmation."
            }
          },
          {
            "@type": "Question",
            "name": "Are QuickBooks Enterprise software licenses customized for Uganda tax compliance?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes. Our QuickBooks Enterprise solutions are official genuine licenses bundled with local Uganda VAT, withholding tax settings, and URA EFRIS compliance configuration by certified ERP engineers."
            }
          }
        ]
      }
    ]
  };

  const selectedProductSchema = selectedProductModal ? {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": `${selectedProductModal.name} - Nova Cloud Uganda`,
    "description": selectedProductModal.short_desc || selectedProductModal.description || `${selectedProductModal.name} available at Nova Cloud Edges Kampala Uganda.`,
    "image": selectedProductModal.image_url || "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80",
    "category": selectedProductModal.category || "Cloud & IT Solutions",
    "sku": `NC-UG-${selectedProductModal.id}`,
    "brand": {
      "@type": "Brand",
      "name": "Nova Cloud"
    },
    "offers": {
      "@type": "Offer",
      "url": typeof window !== 'undefined' ? window.location.href : `https://ncloud.co.ug/shop?item=${selectedProductModal.slug || selectedProductModal.id}`,
      "priceCurrency": selectedProductModal.currency || "UGX",
      "price": selectedProductModal.price ? String(selectedProductModal.price) : "50000",
      "priceValidUntil": "2027-12-31",
      "itemCondition": "https://schema.org/NewCondition",
      "availability": (Number(selectedProductModal.stock) || 0) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "eligibleRegion": {
        "@type": "Country",
        "name": "UG"
      },
      "seller": {
        "@type": "Organization",
        "name": "Nova Cloud Edges (U) Limited",
        "url": "https://ncloud.co.ug"
      }
    }
  } : null;

  return (
    <div className="animate-fade-in" style={{ paddingTop: '3rem', paddingBottom: '5rem' }}>
      <SEO 
        title={
          selectedProductModal
            ? `${selectedProductModal.name} | Buy in Uganda at Nova Cloud IT Store`
            : category && category !== 'All' && category !== 'Hosting Services'
              ? `${category} Uganda | Buy at Nova Cloud IT Store Kampala`
              : "Nova Cloud Online Shop Uganda | Buy Cloud VPS, Colocation, QuickBooks ERP, WiFi Vouchers & IT Hardware Kampala"
        }
        description={
          selectedProductModal
            ? `${selectedProductModal.short_desc || selectedProductModal.description || selectedProductModal.name} - Available in Uganda at Nova Cloud Edges Kampala with MTN MoMo, Airtel Money, and nationwide delivery.`
            : "Shop official Nova Cloud infrastructure in Uganda. Buy Cloud VPS Hosting, Tier III Colocation, Zimbra Corporate Email, QuickBooks Enterprise ERP, WiFi Hotspot Vouchers, Routers & IT hardware with instant delivery in Kampala."
        }
        keywords="Nova Cloud, Nova Cloud Uganda, Nova Cloud shop, Nova Cloud store, Nova Cloud Edges, buy Nova Cloud, cloud provider Uganda, cloud hosting Kampala, buy VPS Uganda, enterprise server Uganda, MikroTik routers Kampala, Zimbra email Uganda, WiFi vouchers Kampala, IT hardware shop Uganda, QuickBooks ERP Uganda, MTN Mobile Money shop Uganda, Airtel Money shop Uganda"
        canonical={
          selectedProductModal
            ? `https://ncloud.co.ug/shop?item=${selectedProductModal.slug || selectedProductModal.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
            : category && category !== 'All'
              ? `https://ncloud.co.ug/shop?category=${encodeURIComponent(category)}`
              : "https://ncloud.co.ug/shop"
        }
        ogTitle={
          selectedProductModal
            ? `${selectedProductModal.name} | Nova Cloud Uganda Store`
            : "Nova Cloud Online Shop Uganda | Cloud VPS, Enterprise ERP & IT Hardware"
        }
        ogDescription={
          selectedProductModal
            ? `Buy ${selectedProductModal.name} in Uganda. Local UGX pricing, instant checkout via MTN Mobile Money & Airtel Money.`
            : "Uganda's official sovereign cloud and IT store. Instant deployment for Cloud VPS, Corporate Email, QuickBooks ERP, WiFi Passes, and Networking Hardware in Kampala."
        }
        ogImage={selectedProductModal ? selectedProductModal.image_url : undefined}
        geoRegion="UG-C"
        geoPlacename="Kampala, Wakiso, Central Region, Uganda"
        geoPosition="0.3156;32.5811"
        icbm="0.3156, 32.5811"
        targetCountry="UG"
        schemaJson={selectedProductModal ? selectedProductSchema : shopSchema}
      />
      <div className="container">
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-block', padding: '0.25rem 0.85rem', borderRadius: '999px', background: 'rgba(30, 58, 138, 0.12)', color: 'var(--primary)', fontWeight: '800', fontSize: '0.75rem', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.6rem' }}>
            Official Nova Cloud Store • Kampala, Uganda
          </div>
          <h1 style={{ fontSize: '2.1rem', marginTop: '0.2rem', lineHeight: '1.25' }}>Nova Cloud Shop: Sovereign Cloud, Enterprise ERP & IT Hardware</h1>
          <p style={{ color: 'var(--text-muted)', maxWidth: '680px', margin: '0.5rem auto 0', fontSize: '1rem', lineHeight: '1.6' }}>
            Uganda's verified online IT store for high-speed Cloud VPS, carrier-grade colocation racks, QuickBooks ERP licenses, and MikroTik networking hardware with localized delivery across Kampala & nationwide Uganda.
          </p>
        </div>

        {/* Uganda Geo-Location & Trust Highlights Ribbon */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          padding: '1.25rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--accent-cyan)' }}>
              <Server size={22} />
            </div>
            <div>
              <div style={{ fontWeight: '800', fontSize: '0.9rem', color: 'var(--text-main)' }}>Sovereign Uganda Datacenter</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Direct UIXP Peering in Kampala (&lt;5ms latency)</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--accent-emerald)' }}>
              <CreditCard size={22} />
            </div>
            <div>
              <div style={{ fontWeight: '800', fontSize: '0.9rem', color: 'var(--text-main)' }}>MTN MoMo & Airtel Money</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Automated instant checkout in UGX (*165# / *185#)</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#f59e0b' }}>
              <Truck size={22} />
            </div>
            <div>
              <div style={{ fontWeight: '800', fontSize: '0.9rem', color: 'var(--text-main)' }}>Same-Day Dispatch Kampala</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Nationwide delivery across all Uganda districts</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--primary)' }}>
              <ShieldCheck size={22} />
            </div>
            <div>
              <div style={{ fontWeight: '800', fontSize: '0.9rem', color: 'var(--text-main)' }}>Certified IT & Tax Ready</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Uganda URA EFRIS compatible ERP & 24/7 NOC</div>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '2.5rem',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-card)',
          padding: '1rem 1.5rem',
          borderRadius: '16px',
          border: '1px solid var(--border-color)'
        }}>
          {/* Category Tabs with Crawlable Links */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }} aria-label="Shop Categories">
            {categories.map(cat => (
              <a
                key={cat}
                href={`/shop?category=${encodeURIComponent(cat)}`}
                onClick={(e) => {
                  e.preventDefault();
                  handleSelectCategory(cat);
                }}
                style={{
                  textDecoration: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '999px',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  background: category === cat ? 'var(--primary)' : 'var(--bg-main)',
                  color: category === cat ? '#fff' : 'var(--text-main)',
                  border: '1px solid var(--border-color)',
                  display: 'inline-block',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}
              >
                {cat}
              </a>
            ))}
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Search products..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '2.4rem', width: '100%' }}
            />
          </div>
        </div>

        {/* Product Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
            Loading products catalog...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
            No products matching your search query.
          </div>
        ) : (
          <>
            <div className="shop-grid">
              {paginatedProducts.map(prod => {
                const isOutOfStock = (Number(prod.stock) || 0) <= 0;
                const shortDescription = prod.short_desc || prod.desc || 'No short description provided.';
                const fullSpecs = prod.description || prod.specs || prod.details || '';

                return (
                  <div key={prod.id} className="glass-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', opacity: isOutOfStock ? 0.85 : 1 }}>
                    
                    <a 
                      href={`/shop?item=${prod.slug || prod.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                      style={{ position: 'relative', cursor: 'pointer', display: 'block', textDecoration: 'none' }} 
                      onClick={(e) => { e.preventDefault(); openProductModal(prod); }}
                      title={`View specifications for ${prod.name}`}
                    >
                      <img
                        src={prod.image_url}
                        alt={`${prod.name} - Nova Cloud Uganda`}
                        loading="lazy"
                        decoding="async"
                        style={{ width: '100%', height: '200px', objectFit: 'cover', filter: isOutOfStock ? 'grayscale(30%)' : 'none' }}
                      />
                      {isOutOfStock && (
                        <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(239, 68, 68, 0.9)', color: '#ffffff', fontSize: '0.75rem', fontWeight: '800', padding: '0.3rem 0.65rem', borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Out of Stock
                        </div>
                      )}
                    </a>

                    <div style={{ padding: '1.35rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                      
                      <div style={{ marginBottom: '0.65rem', display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span className="badge-tag" style={{ fontSize: '0.7rem' }}>
                          {prod.badge || prod.category}
                        </span>
                        {isOutOfStock ? (
                          <span className="badge-tag" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', fontSize: '0.7rem', fontWeight: '800' }}>
                            Unavailable (0 Units)
                          </span>
                        ) : (
                          <span className="badge-tag" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981', fontSize: '0.7rem', fontWeight: '700' }}>
                            In Stock ({prod.stock} Units)
                          </span>
                        )}
                      </div>

                      <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem', lineHeight: '1.3', fontWeight: '800' }}>
                        <a
                          href={`/shop?item=${prod.slug || prod.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                          onClick={(e) => { e.preventDefault(); openProductModal(prod); }}
                          style={{ color: 'inherit', textDecoration: 'none', cursor: 'pointer' }}
                          title={`${prod.name} in Kampala, Uganda`}
                        >
                          {prod.name}
                        </a>
                      </h3>

                      {isWifiVoucherItem(prod) && (
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          background: 'rgba(99, 102, 241, 0.08)',
                          border: '1px solid rgba(99, 102, 241, 0.25)',
                          borderRadius: '8px',
                          padding: '0.35rem 0.6rem',
                          marginBottom: '0.65rem',
                          fontSize: '0.75rem',
                          color: 'var(--primary)',
                          fontWeight: '700'
                        }}>
                          <Wifi size={13} />
                          <span>Instant Pass Token &bull; 1 Device &bull; High Speed</span>
                        </div>
                      )}

                      {/* Prominent Short Description Section */}
                      <div style={{ marginBottom: '0.65rem' }}>
                        <div style={{ fontSize: '0.725rem', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.2rem' }}>
                          Short Description:
                        </div>
                        <p style={{ color: 'var(--text-main)', fontSize: '0.85rem', margin: 0, lineHeight: '1.5' }}>
                          {shortDescription}
                        </p>
                      </div>

                      {/* Prominent Full Specifications Section */}
                      <div style={{ marginBottom: '0.75rem', padding: '0.65rem 0.75rem', background: 'var(--bg-main)', borderRadius: '8px', border: '1px solid var(--border-color)', flex: 1 }}>
                        <div style={{ fontSize: '0.725rem', fontWeight: '800', color: 'var(--accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.25rem' }}>
                          Full Specifications:
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, lineHeight: '1.5', whiteSpace: 'pre-line', maxHeight: '95px', overflowY: 'auto' }}>
                          {fullSpecs || 'No full specifications provided.'}
                        </p>
                      </div>

                      {/* View Full Product Specifications Modal Trigger */}
                      <button
                        onClick={() => openProductModal(prod)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--primary)',
                          fontSize: '0.8rem',
                          fontWeight: '700',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          padding: 0,
                          marginBottom: '0.85rem',
                          cursor: 'pointer',
                          textAlign: 'left'
                        }}
                      >
                        <Info size={14} /> Expand Specs & Details Modal
                      </button>

                      {/* Dedicated Prominent Price Section */}
                      <div style={{
                        background: 'var(--bg-main)',
                        padding: '0.75rem 1rem',
                        borderRadius: '10px',
                        border: '1px solid var(--border-color)',
                        marginBottom: '1rem',
                        display: 'flex',
                        alignItems: 'baseline',
                        justifyContent: 'space-between'
                      }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{getPriceLabel(prod)}</span>
                        <span style={{ fontSize: '1.15rem', fontWeight: '900', color: 'var(--primary)' }}>
                          {prod.currency || 'UGX'} {Number(prod.price).toLocaleString()} {getPriceSuffix(prod) && <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)' }}>{getPriceSuffix(prod)}</span>}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Qty:</label>
                          <input
                            type="number"
                            min="1"
                            max={prod.stock || 100}
                            disabled={isOutOfStock}
                            value={quantities[prod.id] || 1}
                            onChange={(e) => setQuantities({ ...quantities, [prod.id]: Math.max(1, parseInt(e.target.value) || 1) })}
                            style={{
                              width: '52px',
                              padding: '0.4rem 0.3rem',
                              borderRadius: '8px',
                              border: '1px solid var(--border-color)',
                              background: 'var(--bg-main)',
                              color: 'var(--text-main)',
                              fontWeight: '700',
                              fontSize: '0.85rem',
                              textAlign: 'center',
                              opacity: isOutOfStock ? 0.5 : 1
                            }}
                          />
                        </div>

                        {isOutOfStock ? (
                          <button
                            disabled
                            className="btn-secondary"
                            style={{
                              flex: 1,
                              justifyContent: 'center',
                              padding: '0.65rem 0.85rem',
                              fontSize: '0.85rem',
                              opacity: 0.6,
                              cursor: 'not-allowed',
                              background: 'rgba(239, 68, 68, 0.1)',
                              color: '#ef4444',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              fontWeight: '800'
                            }}
                          >
                            Out of Stock
                          </button>
                        ) : (
                          <div style={{ display: 'flex', gap: '0.4rem', flex: 1 }}>
                            <button
                              onClick={() => addToCart(prod, quantities[prod.id] || 1)}
                              className="btn-secondary"
                              style={{ flex: 1, justifyContent: 'center', padding: '0.6rem 0.5rem', fontSize: '0.8rem', fontWeight: '700' }}
                            >
                              + Cart
                            </button>
                            <button
                              onClick={() => handleBuyNow(prod, quantities[prod.id] || 1)}
                              className="btn-primary"
                              style={{ flex: 1, justifyContent: 'center', padding: '0.6rem 0.5rem', fontSize: '0.8rem', fontWeight: '800' }}
                            >
                              Buy Now
                            </button>
                            <button
                              onClick={() => {
                                const slug = prod.slug || prod.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                                const permalink = `${window.location.origin}/shop?item=${slug}`;
                                navigator.clipboard.writeText(permalink).then(() => {
                                  if (showToast) showToast('Product link copied to clipboard!', 'success');
                                });
                              }}
                              className="btn-secondary"
                              style={{ padding: '0.6rem 0.5rem', flexShrink: 0, title: 'Share Product' }}
                            >
                              <Share2 size={15} />
                            </button>
                          </div>
                        )}
                      </div>

                    </div>

                  </div>
                );
              })}
            </div>

            {/* Pagination Controls (8 items per page) */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '3.5rem' }}>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="btn-secondary"
                  style={{ opacity: currentPage === 1 ? 0.5 : 1, padding: '0.6rem 1.25rem' }}
                >
                  <ChevronLeft size={18} /> Previous
                </button>
                <span style={{ fontWeight: '700', fontSize: '0.95rem' }}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="btn-secondary"
                  style={{ opacity: currentPage === totalPages ? 0.5 : 1, padding: '0.6rem 1.25rem' }}
                >
                  Next <ChevronRight size={18} />
                </button>
              </div>
            )}
          </>
        )}

        {/* Why Buy from Nova Cloud Uganda - SEO Geo Content & Trust Grid */}
        <section style={{ marginTop: '5rem', paddingTop: '3.5rem', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 2.5rem' }}>
            <div style={{ display: 'inline-block', padding: '0.2rem 0.75rem', borderRadius: '999px', background: 'rgba(16, 185, 129, 0.12)', color: 'var(--accent-emerald)', fontWeight: '800', fontSize: '0.75rem', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              Uganda's Sovereign Infrastructure Advantage
            </div>
            <h2 style={{ fontSize: '1.85rem', fontWeight: '800', lineHeight: '1.3' }}>
              Why Ugandan Enterprises & Tech Teams Choose Nova Cloud
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '0.5rem', lineHeight: '1.6' }}>
              Built specifically for Uganda's regulatory compliance, currency stability, and network ecosystem.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem', marginBottom: '4rem' }}>
            <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-cyan)' }}>
                <Server size={20} />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0 }}>Kampala Sovereign Datacenter & UIXP</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: '1.6', margin: 0 }}>
                Data stays strictly within Uganda's sovereign borders. Direct fiber interconnects with the Uganda Internet Exchange Point (UIXP) guarantee single-digit millisecond latency across MTN, Airtel, and local ISPs.
              </p>
            </div>

            <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-emerald)' }}>
                <CreditCard size={20} />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0 }}>UGX Pricing & Instant Mobile Money</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: '1.6', margin: 0 }}>
                Zero foreign currency exchange risk. Settle orders instantly in Ugandan Shillings (UGX) via MTN Mobile Money (*165#), Airtel Money (*185#), Stanbic Bank wire, or local Visa and Mastercard.
              </p>
            </div>

            <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
                <Truck size={20} />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0 }}>Same-Day Dispatch & Delivery</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: '1.6', margin: 0 }}>
                Rapid fulfillment for physical servers, MikroTik routers, SFP modules, and racks within Kampala, Wakiso, and Entebbe. Reliable nationwide courier coverage across all districts of Uganda.
              </p>
            </div>

            <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                <ShieldCheck size={20} />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0 }}>URA EFRIS & Local Enterprise Support</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: '1.6', margin: 0 }}>
                QuickBooks Enterprise and ERP software deployments are configured to support Uganda Revenue Authority (URA) EFRIS fiscalization, withholding tax, and local VAT compliance.
              </p>
            </div>
          </div>
        </section>

        {/* Uganda IT Store & Local Cloud FAQ Section */}
        <section style={{ marginBottom: '4rem' }}>
          <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 2.5rem' }}>
            <div style={{ display: 'inline-block', padding: '0.2rem 0.75rem', borderRadius: '999px', background: 'rgba(99, 102, 241, 0.12)', color: 'var(--primary)', fontWeight: '800', fontSize: '0.75rem', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              Customer Support & Buyer Guide
            </div>
            <h2 style={{ fontSize: '1.85rem', fontWeight: '800', lineHeight: '1.3' }}>
              Frequently Asked Questions (Uganda IT Store & Local Cloud)
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '0.5rem', lineHeight: '1.6' }}>
              Everything you need to know about purchasing, local payments, hardware shipping, and server hosting in Uganda.
            </p>
          </div>

          <div style={{ maxWidth: '840px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {[
              {
                q: "How can I pay for Nova Cloud servers, vouchers, and IT hardware in Uganda?",
                a: "Nova Cloud supports instant automated payments via MTN Mobile Money (*165#) and Airtel Money (*185#), as well as Visa, Mastercard, and direct Ugandan bank wire transfers in UGX and USD. Your invoice and receipts are automatically generated in UGX."
              },
              {
                q: "Where are Nova Cloud Edge VPS servers hosted?",
                a: "All Nova Cloud VPS instances, colocation racks, and email servers are hosted in sovereign Tier III datacenters located in Kampala, Uganda, directly interconnected with the Uganda Internet Exchange Point (UIXP) for ultra-low single-digit latency across all domestic telecom networks."
              },
              {
                q: "How fast is delivery of physical IT equipment and server hardware across Uganda?",
                a: "Physical equipment (MikroTik routers, server accessories, colocation hardware) is dispatched same-day within Kampala and Wakiso, and delivered within 24 to 48 hours to all districts across Uganda. Digital products like Cloud VPS and WiFi vouchers activate immediately upon payment confirmation."
              },
              {
                q: "Are QuickBooks Enterprise software licenses customized for Uganda tax compliance?",
                a: "Yes. Our QuickBooks Enterprise solutions are official genuine licenses bundled with local Uganda VAT, withholding tax settings, and URA EFRIS compliance configuration by certified ERP engineers with on-site or remote support."
              }
            ].map((faq, idx) => (
              <div 
                key={idx}
                className="glass-card"
                style={{ 
                  padding: '1.25rem 1.5rem',
                  cursor: 'pointer',
                  borderRadius: '14px',
                  border: openFaq === idx ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => toggleFaq(idx)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: '700', margin: 0, color: openFaq === idx ? 'var(--primary)' : 'var(--text-main)', lineHeight: '1.4' }}>
                    {faq.q}
                  </h3>
                  <ChevronDown 
                    size={18} 
                    style={{ 
                      transform: openFaq === idx ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                      flexShrink: 0,
                      color: 'var(--text-muted)'
                    }} 
                  />
                </div>
                {openFaq === idx && (
                  <p style={{ marginTop: '0.85rem', marginBottom: 0, color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: '1.7', borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem' }}>
                    {faq.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* FULL PRODUCT SPECIFICATIONS & DETAILS MODAL */}
        {selectedProductModal && (
          <div className="modal-overlay" onClick={closeProductModal}>
            <div
              className="modal-content animate-scale-in"
              onClick={e => e.stopPropagation()}
              style={{ maxWidth: '640px', width: '92%', maxHeight: '90vh', overflowY: 'auto', padding: '1.75rem', borderRadius: '18px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                <div>
                  <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                    <span className="badge-tag" style={{ fontSize: '0.75rem', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--primary)' }}>
                      {selectedProductModal.category}
                    </span>
                    {selectedProductModal.badge && (
                      <span className="badge-tag" style={{ fontSize: '0.75rem', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-emerald)' }}>
                        {selectedProductModal.badge}
                      </span>
                    )}
                  </div>
                  <h2 style={{ fontSize: '1.45rem', fontWeight: '800', margin: 0, lineHeight: '1.3' }}>
                    {selectedProductModal.name}
                  </h2>
                </div>
                <button
                  onClick={closeProductModal}
                  style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '50%', padding: '0.4rem', cursor: 'pointer', color: 'var(--text-main)' }}
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ borderRadius: '12px', overflow: 'hidden', marginBottom: '1.25rem', height: '240px', background: 'var(--bg-main)' }}>
                <img
                  src={selectedProductModal.image_url}
                  alt={selectedProductModal.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>

              {/* Short Description Section */}
              <div style={{ marginBottom: '1.25rem' }}>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
                  Short Description
                </h4>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-main)', lineHeight: '1.6', margin: 0 }}>
                  {selectedProductModal.short_desc || selectedProductModal.desc || 'No short description provided.'}
                </p>
              </div>

              {/* Full Specifications Section */}
              <div style={{ background: 'var(--bg-main)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
                  Full Product Specifications & Licensing Terms
                </h4>
                {selectedProductModal.description || selectedProductModal.specs || selectedProductModal.details ? (
                  <p style={{ fontSize: '0.925rem', color: 'var(--text-main)', lineHeight: '1.75', whiteSpace: 'pre-line', margin: 0 }}>
                    {selectedProductModal.description || selectedProductModal.specs || selectedProductModal.details}
                  </p>
                ) : (
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>
                    No full specifications configured for this product.
                  </p>
                )}
              </div>

              {/* Pricing & Add to Cart Footer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>{getPriceLabel(selectedProductModal)}</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: '900', color: 'var(--primary)' }}>
                    {selectedProductModal.currency || 'UGX'} {Number(selectedProductModal.price).toLocaleString()} {getPriceSuffix(selectedProductModal) && <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{getPriceSuffix(selectedProductModal)}</span>}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  {(Number(selectedProductModal.stock) || 0) <= 0 ? (
                    <button
                      disabled
                      className="btn-secondary"
                      style={{ padding: '0.75rem 1.25rem', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', cursor: 'not-allowed', fontWeight: '800' }}
                    >
                      Out of Stock
                    </button>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => {
                          addToCart(selectedProductModal, quantities[selectedProductModal.id] || 1);
                          closeProductModal();
                        }}
                        className="btn-secondary"
                        style={{ padding: '0.75rem 1.1rem', fontSize: '0.9rem' }}
                      >
                        + Add to Cart
                      </button>
                      <button
                        onClick={() => {
                          const prod = selectedProductModal;
                          const qty = quantities[selectedProductModal.id] || 1;
                          closeProductModal();
                          handleBuyNow(prod, qty);
                        }}
                        className="btn-primary"
                        style={{ padding: '0.75rem 1.35rem', fontSize: '0.95rem', fontWeight: '800' }}
                      >
                        Buy Now & Checkout
                      </button>
                      <button
                        onClick={() => {
                          const slug = selectedProductModal.slug || selectedProductModal.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                          const permalink = `${window.location.origin}/shop?item=${slug}`;
                          navigator.clipboard.writeText(permalink).then(() => {
                            if (showToast) showToast('Product link copied to clipboard!', 'success');
                          });
                        }}
                        className="btn-secondary"
                        style={{ padding: '0.75rem', title: 'Share Product' }}
                      >
                        <Share2 size={18} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}

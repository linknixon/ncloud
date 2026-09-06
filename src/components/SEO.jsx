import { useEffect } from 'react';

export default function SEO({ 
  title, 
  description, 
  keywords, 
  canonical, 
  ogTitle, 
  ogDescription, 
  ogImage, 
  ogType = 'website',
  schemaJson 
}) {
  useEffect(() => {
    // 1. Primary Page Title
    if (title) {
      document.title = title;
    }
    
    // 2. Meta Description
    if (description) {
      let metaDescription = document.querySelector('meta[name="description"]');
      if (!metaDescription) {
        metaDescription = document.createElement('meta');
        metaDescription.name = "description";
        document.head.appendChild(metaDescription);
      }
      metaDescription.setAttribute("content", description);
    }

    // 3. Meta Keywords
    if (keywords) {
      let metaKeywords = document.querySelector('meta[name="keywords"]');
      if (!metaKeywords) {
        metaKeywords = document.createElement('meta');
        metaKeywords.name = "keywords";
        document.head.appendChild(metaKeywords);
      }
      metaKeywords.setAttribute("content", keywords);
    }

    // 4. OpenGraph Tags
    const ogTitleContent = ogTitle || title;
    if (ogTitleContent) {
      let ogTitleTag = document.querySelector('meta[property="og:title"]');
      if (!ogTitleTag) {
        ogTitleTag = document.createElement('meta');
        ogTitleTag.setAttribute('property', 'og:title');
        document.head.appendChild(ogTitleTag);
      }
      ogTitleTag.setAttribute('content', ogTitleContent);
    }

    const ogDescContent = ogDescription || description;
    if (ogDescContent) {
      let ogDescTag = document.querySelector('meta[property="og:description"]');
      if (!ogDescTag) {
        ogDescTag = document.createElement('meta');
        ogDescTag.setAttribute('property', 'og:description');
        document.head.appendChild(ogDescTag);
      }
      ogDescTag.setAttribute('content', ogDescContent);
    }

    if (ogImage) {
      let ogImageTag = document.querySelector('meta[property="og:image"]');
      if (!ogImageTag) {
        ogImageTag = document.createElement('meta');
        ogImageTag.setAttribute('property', 'og:image');
        document.head.appendChild(ogImageTag);
      }
      ogImageTag.setAttribute('content', ogImage);
    }

    let ogTypeTag = document.querySelector('meta[property="og:type"]');
    if (ogTypeTag) {
      ogTypeTag.setAttribute('content', ogType);
    }

    // 5. Twitter Card Tags
    if (ogTitleContent) {
      let twTitle = document.querySelector('meta[name="twitter:title"]');
      if (!twTitle) {
        twTitle = document.createElement('meta');
        twTitle.name = 'twitter:title';
        document.head.appendChild(twTitle);
      }
      twTitle.setAttribute('content', ogTitleContent);
    }

    if (ogDescContent) {
      let twDesc = document.querySelector('meta[name="twitter:description"]');
      if (!twDesc) {
        twDesc = document.createElement('meta');
        twDesc.name = 'twitter:description';
        document.head.appendChild(twDesc);
      }
      twDesc.setAttribute('content', ogDescContent);
    }

    // 6. Canonical Link
    if (canonical) {
      let canonicalLink = document.querySelector('link[rel="canonical"]');
      if (!canonicalLink) {
        canonicalLink = document.createElement('link');
        canonicalLink.rel = 'canonical';
        document.head.appendChild(canonicalLink);
      }
      canonicalLink.setAttribute('href', canonical);
    }

    // 7. Dynamic JSON-LD Structured Data
    if (schemaJson) {
      let scriptTag = document.getElementById('dynamic-page-schema');
      if (!scriptTag) {
        scriptTag = document.createElement('script');
        scriptTag.type = 'application/ld+json';
        scriptTag.id = 'dynamic-page-schema';
        document.head.appendChild(scriptTag);
      }
      scriptTag.text = typeof schemaJson === 'string' ? schemaJson : JSON.stringify(schemaJson);
    }

    return () => {
      const scriptTag = document.getElementById('dynamic-page-schema');
      if (scriptTag) {
        scriptTag.remove();
      }
    };
  }, [title, description, keywords, canonical, ogTitle, ogDescription, ogImage, ogType, schemaJson]);

  return null;
}

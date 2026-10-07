import { useEffect } from 'react';

/**
 * SEO component for dynamically managing page meta tags, OpenGraph, and Twitter tags
 */
export default function SEO({ title, description, canonical, ogImage }) {
  useEffect(() => {
    // 1. Title (must be under 60 characters)
    const formattedTitle = title 
      ? `${title} | khojbeen.ai` 
      : 'khojbeen.ai - Campus Lost & Found Intelligent Matcher';
    document.title = formattedTitle;

    // 2. Meta Description (must be under 160 characters)
    const metaDescription = description || 'Smart AI-powered campus lost and found matcher for Jagran College students and staff.';
    let descTag = document.querySelector('meta[name="description"]');
    if (!descTag) {
      descTag = document.createElement('meta');
      descTag.setAttribute('name', 'description');
      document.head.appendChild(descTag);
    }
    descTag.setAttribute('content', metaDescription);

    // 3. Open Graph Tags
    const ogTags = {
      'og:title': formattedTitle,
      'og:description': metaDescription,
      'og:type': 'website',
      'og:image': ogImage || '/og-image.png',
      'og:url': window.location.href,
      'twitter:card': 'summary_large_image',
      'twitter:title': formattedTitle,
      'twitter:description': metaDescription,
      'twitter:image': ogImage || '/og-image.png',
    };

    Object.entries(ogTags).forEach(([property, content]) => {
      let tag = document.querySelector(`meta[property="${property}"]`) || document.querySelector(`meta[name="${property}"]`);
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(property.startsWith('twitter:') ? 'name' : 'property', property);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    });

    // 4. Canonical Tag
    let linkCanonical = document.querySelector('link[rel="canonical"]');
    if (!linkCanonical) {
      linkCanonical = document.createElement('link');
      linkCanonical.setAttribute('rel', 'canonical');
      document.head.appendChild(linkCanonical);
    }
    linkCanonical.setAttribute('href', canonical || window.location.href);

  }, [title, description, canonical, ogImage]);

  return null;
}

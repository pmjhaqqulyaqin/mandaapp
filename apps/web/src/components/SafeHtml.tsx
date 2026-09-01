import React from 'react';
import DOMPurify from 'dompurify';

/**
 * SEC-03: SafeHtml — wrapper component that sanitizes HTML content
 * before rendering via dangerouslySetInnerHTML.
 *
 * Replaces direct use of dangerouslySetInnerHTML to prevent XSS attacks
 * from stored HTML content (e.g. pages, news articles, layout blocks).
 */

interface SafeHtmlProps {
  content: string;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

// Configure DOMPurify to allow safe tags while blocking scripts
const PURIFY_CONFIG: DOMPurify.Config = {
  ALLOWED_TAGS: [
    // Structure
    'div', 'span', 'p', 'br', 'hr',
    // Headings
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    // Lists
    'ul', 'ol', 'li',
    // Formatting
    'strong', 'em', 'b', 'i', 'u', 's', 'del', 'ins', 'sub', 'sup', 'mark',
    // Links & Media
    'a', 'img', 'video', 'source', 'iframe',
    // Tables
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
    // Semantic
    'article', 'section', 'aside', 'header', 'footer', 'nav', 'main', 'figure', 'figcaption',
    // Other
    'blockquote', 'pre', 'code', 'details', 'summary',
  ],
  ALLOWED_ATTR: [
    'href', 'src', 'alt', 'title', 'class', 'id', 'style',
    'width', 'height', 'target', 'rel',
    'colspan', 'rowspan', 'scope',
    'controls', 'autoplay', 'muted', 'loop', 'poster',
    'frameborder', 'allowfullscreen', 'allow',
    'loading', 'decoding',
  ],
  // Allow YouTube/Vimeo iframes
  ADD_TAGS: ['iframe'],
  ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder'],
  // Force target="_blank" links to have rel="noopener noreferrer"
  FORCE_BODY: true,
};

// Add hook to force rel="noopener noreferrer" on all target="_blank" links
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A' && node.getAttribute('target') === '_blank') {
    node.setAttribute('rel', 'noopener noreferrer');
  }
  // Only allow safe iframe sources (YouTube, Vimeo, Google Maps)
  if (node.tagName === 'IFRAME') {
    const src = node.getAttribute('src') || '';
    const allowedDomains = [
      'youtube.com', 'www.youtube.com', 'youtube-nocookie.com',
      'vimeo.com', 'player.vimeo.com',
      'maps.google.com', 'www.google.com/maps',
    ];
    const isSafe = allowedDomains.some(domain => src.includes(domain));
    if (!isSafe) {
      node.remove();
    }
  }
});

export function sanitizeHtml(html: string): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, PURIFY_CONFIG);
}

const SafeHtml: React.FC<SafeHtmlProps> = ({
  content,
  className,
  as: Tag = 'div',
}) => {
  const cleanHtml = sanitizeHtml(content);

  return (
    <Tag
      className={className}
      dangerouslySetInnerHTML={{ __html: cleanHtml }}
    />
  );
};

export default SafeHtml;

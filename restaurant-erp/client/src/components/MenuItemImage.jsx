import { useState } from 'react';

/**
 * MenuItemImage — Smart image renderer for menu items.
 * - If `src` starts with `/assets/`, `/menu/` or `http` → renders a real <img> tag
 * - If the image fails to load, gracefully falls back to a smart food emoji based on the item name
 * - Otherwise → treats it as an emoji and renders a <span>
 */
const MenuItemImage = ({ src, alt = '', className = '', imgClassName = '', emojiClassName = '' }) => {
  const [hasError, setHasError] = useState(false);
  const isPath = src && (src.startsWith('/assets/') || src.startsWith('/menu/') || src.startsWith('http'));

  // Get a smart fallback emoji based on the item name/alt text
  const getFallbackEmoji = (name = '') => {
    const n = name.toLowerCase();
    if (n.includes('coffee') || n.includes('soda') || n.includes('mojito') || n.includes('lime') || n.includes('drink') || n.includes('shake') || n.includes('juice')) return '🍹';
    if (n.includes('burger')) return '🍔';
    if (n.includes('pizza')) return '🍕';
    if (n.includes('biryani') || n.includes('rice')) return '🍛';
    if (n.includes('naan') || n.includes('roti') || n.includes('paratha') || n.includes('bread')) return '🫓';
    if (n.includes('fries') || n.includes('finger') || n.includes('wings') || n.includes('tikka') || n.includes('starter')) return '🍗';
    if (n.includes('ice cream') || n.includes('jamun') || n.includes('brownie') || n.includes('dessert')) return '🍰';
    if (n.includes('waffle')) return '🧇';
    return '🍽️';
  };

  if (isPath && !hasError) {
    return (
      <img
        src={src}
        alt={alt}
        className={imgClassName || className}
        onError={() => setHasError(true)}
        loading="lazy"
        draggable={false}
      />
    );
  }

  return (
    <span className={emojiClassName || className} role="img" aria-label={alt}>
      {isPath ? getFallbackEmoji(alt || src) : (src || '🍽️')}
    </span>
  );
};

export default MenuItemImage;

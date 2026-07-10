/**
 * MenuItemImage — Smart image renderer for menu items.
 * - If `src` starts with `/assets/` → renders a real <img> tag
 * - Otherwise → treats it as an emoji and renders a <span>
 */
const MenuItemImage = ({ src, alt = '', className = '', imgClassName = '', emojiClassName = '' }) => {
  const isPath = src && src.startsWith('/assets/');

  if (isPath) {
    return (
      <img
        src={src}
        alt={alt}
        className={imgClassName || className}
        onError={(e) => {
          // Fallback to a food emoji if image fails to load
          e.target.style.display = 'none';
          e.target.nextSibling && (e.target.nextSibling.style.display = 'flex');
        }}
        loading="lazy"
        draggable={false}
      />
    );
  }

  return (
    <span className={emojiClassName || className} role="img" aria-label={alt}>
      {src || '🍽️'}
    </span>
  );
};

export default MenuItemImage;

import React, { useLayoutEffect, useRef, useState } from 'react';
import './navigation.css';

const links = [
  { label: 'Shop', category: 'All products' },
  { label: 'Computers', category: 'Computers' },
  { label: 'Accessories', category: 'Accessories' },
  { label: 'Displays', category: 'Displays' },
];

export default function MainNavigation({ page, category, onSelect, categories }) {
  const navRef = useRef(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0, visible: false });
  const [clicked, setClicked] = useState({ category: null, count: 0 });
  const selectedCategory = page === 'shop' ? category : null;

  useLayoutEffect(() => {
    const nav = navRef.current;
    let mounted = true;

    function measure() {
      if (!mounted) return;
      const selected = nav.querySelector('[aria-current="page"]');
      const next = {
        left: selected?.offsetLeft ?? 0,
        width: selected?.offsetWidth ?? 0,
        visible: !!selected?.offsetWidth,
      };
      setIndicator(previous => previous.left === next.left && previous.width === next.width && previous.visible === next.visible ? previous : next);
    }

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(nav);
    nav.querySelectorAll('a').forEach(link => observer.observe(link));
    document.fonts?.ready.then(measure);
    return () => {
      mounted = false;
      observer.disconnect();
    };
  }, [selectedCategory]);

  return (
    <nav ref={navRef} className="main-navigation" aria-label="Main navigation">
      {(categories ? [{ label: 'Shop', category: 'All products' }, ...categories.map(item => ({ label: item.category_name, category: item.category_name }))] : links).map(link => (
        <a
          key={link.category}
          className={selectedCategory === link.category ? 'selected' : ''}
          aria-current={selectedCategory === link.category ? 'page' : undefined}
          href="#shop"
          onClick={() => {
            onSelect(link.category);
            setClicked(previous => ({ category: link.category, count: previous.count + 1 }));
          }}
        >
          <span
            key={clicked.category === link.category ? clicked.count : 'idle'}
            className={`nav-label${clicked.category === link.category ? ' is-clicked' : ''}`}
          >
            {link.label}
          </span>
        </a>
      ))}
      <span
        className="nav-indicator"
        aria-hidden="true"
        style={{ width: indicator.width, transform: `translateX(${indicator.left}px)`, opacity: indicator.visible ? 1 : 0 }}
      />
    </nav>
  );
}

import React, { useState, useEffect } from 'react';

export default function ScrollProgressBar() {
  const [scrollPercent, setScrollPercent] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const windowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      if (windowHeight > 0) {
        const currentScroll = window.scrollY;
        setScrollPercent((currentScroll / windowHeight) * 100);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      className="fixed top-0 left-0 right-0 h-1 z-50 pointer-events-none origin-left"
      style={{
        background: 'linear-gradient(to right, #0F766E, #14B8A6, #F59E0B)',
        width: `${scrollPercent}%`,
        transition: 'width 0.1s ease-out',
      }}
      aria-hidden="true"
    />
  );
}

import React, { useEffect, useState, useRef } from 'react';

export default function AnimatedCounter({ value, duration = 1.2, suffix = '' }) {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const domRef = useRef(null);

  const numericValue = typeof value === 'number' ? value : parseInt(value, 10) || 0;

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setCount(numericValue);
      setHasAnimated(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          observer.unobserve(entry.target);

          let startTime = null;
          let animationFrame;

          const animate = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
            const easeProgress = 1 - Math.pow(1 - progress, 2);
            setCount(Math.floor(easeProgress * numericValue));

            if (progress < 1) {
              animationFrame = requestAnimationFrame(animate);
            } else {
              setCount(numericValue);
            }
          };

          animationFrame = requestAnimationFrame(animate);
        }
      },
      { threshold: 0.2 }
    );

    const target = domRef.current;
    if (target) {
      observer.observe(target);
    }

    return () => {
      if (target) {
        observer.unobserve(target);
      }
    };
  }, [numericValue, duration, hasAnimated]);

  return (
    <span ref={domRef} className="font-mono font-extrabold">
      {count}
      {suffix}
    </span>
  );
}

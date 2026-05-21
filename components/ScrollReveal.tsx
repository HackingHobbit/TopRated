"use client";

import { useEffect, useRef, useState } from 'react';
import styles from './ScrollReveal.module.css';

export default function ScrollReveal({ children }: { children: React.ReactNode }) {
  const [isVisible, setIsVisible] = useState(false);
  const domRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        // Only trigger the animation if it's actually intersecting 
        // and we haven't already made it visible
        if (entry.isIntersecting) {
          // Use a tiny timeout to ensure the browser has painted the initial opacity: 0 state
          // before applying the opacity: 1 state, forcing the CSS transition to run.
          setTimeout(() => {
            setIsVisible(true);
          }, 50);
          
          // Stop observing once it has revealed
          if (domRef.current) observer.unobserve(domRef.current);
        }
      });
    }, { 
      threshold: 0.1,
      rootMargin: "0px 0px -50px 0px" // Trigger slightly before it hits the bottom
    });

    const currentRef = domRef.current;
    if (currentRef) observer.observe(currentRef);

    return () => {
      if (currentRef) observer.unobserve(currentRef);
    };
  }, []);

  return (
    <div
      className={`${styles.revealSection} ${isVisible ? styles.isVisible : ''}`}
      ref={domRef}
    >
      {children}
    </div>
  );
}

'use client';

import { useEffect } from 'react';

/**
 * Tiny client island that adds an `is-visible` class to anything with
 * `.reveal-on-scroll` once it crosses into the viewport. Avoids
 * mounting a Framer Motion observer on every section.
 *
 * `prefers-reduced-motion: reduce` users skip the transition — CSS
 * `@media` in globals.css already neutralizes the animation; this
 * just keeps the class toggle quiet for them too.
 */
export function RevealOnScroll() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const targets = document.querySelectorAll<HTMLElement>('.reveal-on-scroll');
    if (targets.length === 0) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      // Skip the animation entirely — reveal immediately so content is
      // never stuck in the pre-animation state.
      targets.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '-40px 0px -40px 0px', threshold: 0.05 },
    );
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return null;
}

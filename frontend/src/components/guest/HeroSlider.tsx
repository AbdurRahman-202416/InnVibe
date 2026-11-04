'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

/** Photos used by the slideshow. The first one is always shown first (it is the server-rendered, fast-loading one). */
const SLIDES = [
  '/images/hero.jpg',
  '/images/gallery-pool.jpg',
  '/images/gallery-dusk.jpg',
  '/images/room-suite.jpg',
  '/images/gallery-lounge.jpg',
];

const SLIDE_MS = 6000; // time each photo stays on screen

/** Fisher-Yates shuffle: returns a new array in random order. */
function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Decorative hero background: photos cross-fade automatically while each one slowly zooms in
 * (the "Ken Burns" effect, done with a CSS animation). There are no controls on purpose.
 *  - the first photo is fixed, the rest are shuffled after the page loads, so every visit differs
 *    (shuffling during render would make the server HTML and the browser HTML disagree)
 *  - aria-hidden: it is decoration, screen readers skip it
 *  - the global prefers-reduced-motion rule makes the zoom and fade effectively instant
 */
export default function HeroSlider() {
  const [slides, setSlides] = useState(SLIDES);
  const [active, setActive] = useState(0);
  const [previous, setPrevious] = useState<number | null>(null);
  const activeRef = useRef(0);
  // Only the first photo is loaded at first; the other four start loading a moment later so they do not compete with it.
  const [loadOthers, setLoadOthers] = useState(false);

  useEffect(() => {
    setSlides((current) => [current[0], ...shuffle(current.slice(1))]);
  }, []);

  useEffect(() => {
    const id = setTimeout(() => setLoadOthers(true), 2500);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const next = (activeRef.current + 1) % SLIDES.length;
      setPrevious(activeRef.current); // keep the old photo zooming while it fades out
      setActive(next);
      activeRef.current = next;
    }, SLIDE_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden bg-navy">
      {slides.map((src, index) => {
        if (index > 0 && !loadOthers) return null;
        const isActive = index === active;
        const isPrevious = index === previous;
        return (
          <div
            key={src}
            className={`absolute inset-0 transition-opacity duration-[1600ms] ease-in-out ${isActive ? 'opacity-100' : 'opacity-0'}`}
          >
            <Image
              src={src}
              alt=""
              fill
              priority={index === 0}
              sizes="100vw"
              className={`object-cover ${isActive || isPrevious ? 'animate-hero-zoom' : ''}`}
            />
          </div>
        );
      })}
    </div>
  );
}

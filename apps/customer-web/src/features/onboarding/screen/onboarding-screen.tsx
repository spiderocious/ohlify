import { Repeat } from 'meemaw';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ROUTES } from '@ohlify/core';
import { AppButton } from '@ohlify/ui';

import { OnboardingSlide, type OnboardingSlideData } from './parts/onboarding-slide.js';

const SLIDES: OnboardingSlideData[] = [
  {
    title: 'Get Paid for Calls',
    subtitle: 'Set your rate. Share your link. Get paid per minute.',
  },
  {
    title: 'Connect with other experts',
    subtitle:
      'Connect with top-tier professionals across industries. Skip the back and forth emails and book a session',
  },
  {
    title: 'Ready to level up',
    subtitle:
      'Set up your profile in seconds and find the perfect mentor, consultant or specialist to help you reach your goals',
  },
];

const AUTO_SCROLL_MS = 3000;

/**
 * Mirrors mobile/lib/features/onboarding/screen/onboarding_screen.dart.
 * 3-slide auto-scrolling carousel with top progress bars + sticky
 * "Get started" / "Login" CTAs. Auto-scroll pauses while the user is dragging.
 */
export function OnboardingScreen() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const userScrolling = useRef(false);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll
  useEffect(() => {
    const id = setInterval(() => {
      if (userScrolling.current) return;
      const next = (current + 1) % SLIDES.length;
      const node = scrollerRef.current;
      if (!node) return;
      node.scrollTo({ left: next * node.clientWidth, behavior: 'smooth' });
    }, AUTO_SCROLL_MS);
    return () => clearInterval(id);
  }, [current]);

  // Detect which slide is showing while the user (or the auto-scroll) drags.
  const onScroll = () => {
    const node = scrollerRef.current;
    if (!node) return;
    const idx = Math.round(node.scrollLeft / node.clientWidth);
    if (idx !== current) setCurrent(idx);
  };

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <div className="mx-auto w-full max-w-xl px-5 pt-5 lg:max-w-2xl">
        <div className="flex gap-1.5">
          <Repeat times={SLIDES.length}>
            {(_, i) => (
              <div
                key={i}
                className="h-1 flex-1 rounded-full transition-colors duration-300"
                style={{
                  backgroundColor: i === current ? 'var(--ohl-primary)' : 'var(--ohl-secondary)',
                }}
              />
            )}
          </Repeat>
        </div>
      </div>

      <div
        ref={scrollerRef}
        onScroll={onScroll}
        onPointerDown={() => {
          userScrolling.current = true;
        }}
        onPointerUp={() => {
          userScrolling.current = false;
        }}
        onPointerCancel={() => {
          userScrolling.current = false;
        }}
        className="flex flex-1 snap-x snap-mandatory overflow-x-auto scroll-smooth"
        style={{ scrollbarWidth: 'none' }}
      >
        {SLIDES.map((s) => (
          <div key={s.title} className="flex w-full shrink-0 snap-center items-start py-4">
            <OnboardingSlide data={s} />
          </div>
        ))}
      </div>

      <div className="mx-auto w-full max-w-xl px-5 pb-8 pt-2 lg:max-w-2xl">
        <AppButton
          label="Get started"
          expanded
          radius={100}
          onPressed={() => navigate(ROUTES.REGISTER.absPath)}
        />
        <div className="mt-3">
          <AppButton
            label="Login"
            variant="outline"
            expanded
            radius={100}
            onPressed={() => navigate(ROUTES.LOGIN.absPath)}
          />
        </div>
      </div>
    </main>
  );
}

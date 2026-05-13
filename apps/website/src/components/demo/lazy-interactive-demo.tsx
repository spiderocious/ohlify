'use client';

import dynamic from 'next/dynamic';

/**
 * Client-side wrapper. Isolates `dynamic({ ssr: false })` in its own
 * client module so the surrounding `DemoSection` can stay a Server
 * Component (Next 15 forbids `ssr: false` from a Server Component file).
 *
 * Placeholder matches the phone-frame footprint to avoid CLS when the
 * real demo lazy-mounts.
 */
const InteractiveDemo = dynamic(
  () => import('./interactive-demo').then((m) => m.InteractiveDemo),
  {
    ssr: false,
    loading: () => (
      <div className="mx-auto flex h-[560px] w-[272px] items-center justify-center rounded-[40px] bg-paper-elev text-[12px] text-muted">
        Loading demo…
      </div>
    ),
  },
);

export function LazyInteractiveDemo() {
  return <InteractiveDemo />;
}

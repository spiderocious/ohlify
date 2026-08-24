import type { ReactNode } from 'react';

import { HawkHeading, HawkText, cn } from '@ohlify/hawk-ui';

/**
 * The chrome every gallery page sits in.
 *
 * Deliberately plain: the page's job is to show Hawk components, and any
 * decoration here competes with the thing being reviewed. The only styling the
 * shell carries is what separates one specimen from the next.
 */
export function PreviewPage({
  title,
  kicker,
  intro,
  children,
}: {
  title: string;
  kicker?: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <article className="flex flex-col gap-hawk-9 pb-hawk-12">
      <header className="flex flex-col gap-hawk-3 border-b border-hawk-line pb-hawk-6">
        {kicker && (
          <HawkText variant="overline" ink="muted">
            {kicker}
          </HawkText>
        )}
        <HawkHeading level={1} variant="title">
          {title}
        </HawkHeading>
        {intro && (
          <HawkText variant="body" ink="muted" className="max-w-2xl">
            {intro}
          </HawkText>
        )}
      </header>
      {children}
    </article>
  );
}

/**
 * One specimen section.
 *
 * `rule` is for the design rule the section demonstrates — the reason the
 * component is shaped the way it is. Those notes are transcribed from the
 * design system's own `spec-rule` blocks, because a gallery that shows *what* a
 * component looks like without *why* leaves the next person to rediscover the
 * reasoning or, more likely, to break it.
 */
export function PreviewSection({
  title,
  note,
  rule,
  children,
  className,
}: {
  title: string;
  note?: ReactNode;
  rule?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className="flex flex-col gap-hawk-5">
      <div className="flex flex-col gap-hawk-2">
        <HawkHeading level={2} variant="medium">
          {title}
        </HawkHeading>
        {note && (
          <HawkText variant="caption" ink="muted" className="max-w-2xl">
            {note}
          </HawkText>
        )}
      </div>

      {rule && (
        <div className="max-w-2xl rounded-hawk-sm border-l-2 border-l-hawk-acc bg-hawk-acc-soft/40 px-hawk-5 py-hawk-4">
          <HawkText variant="caption" className="text-hawk-acc-on-soft">
            {rule}
          </HawkText>
        </div>
      )}

      <div className={cn('flex flex-col gap-hawk-5', className)}>{children}</div>
    </section>
  );
}

/** A bordered stage for a specimen, so it reads apart from the page. */
export function PreviewStage({
  children,
  label,
  /** Renders on the ground rather than paper — for cards and passes. */
  ground = false,
  /** Renders on the dark call surface. */
  dark = false,
  className,
}: {
  children: ReactNode;
  label?: string;
  ground?: boolean;
  dark?: boolean;
  className?: string;
}) {
  return (
    <div className="flex flex-col gap-hawk-2">
      {label && (
        <HawkText variant="tiny" ink="disabled" className="uppercase tracking-hawk-overline">
          {label}
        </HawkText>
      )}
      <div
        className={cn(
          'rounded-hawk-fixed-md border border-hawk-line p-hawk-6',
          dark ? 'bg-hawk-call-ground' : ground ? 'bg-hawk-ground' : 'bg-hawk-paper',
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

/** A labelled grid of variants — the usual way to show a component's axes. */
export function PreviewGrid({
  children,
  columns = 3,
  className,
}: {
  children: ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'grid gap-hawk-5',
        columns === 2 && 'sm:grid-cols-2',
        columns === 3 && 'sm:grid-cols-2 lg:grid-cols-3',
        columns === 4 && 'sm:grid-cols-2 lg:grid-cols-4',
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * One anchored state tile.
 *
 * The `id` mirrors the design system's `#states-<state>` anchors, so a reviewer
 * can deep-link a specific state exactly as they can in the HTML specimens.
 */
export function PreviewState({
  name,
  children,
  note,
  className,
}: {
  name: string;
  children: ReactNode;
  note?: string;
  className?: string;
}) {
  return (
    <div
      id={`states-${name}`}
      data-hawk-state={name}
      className={cn(
        'flex scroll-mt-24 flex-col gap-hawk-3 rounded-hawk-sm border border-hawk-line bg-hawk-paper p-hawk-5',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-hawk-3">
        <HawkText variant="tiny" ink="disabled" className="uppercase tracking-hawk-overline">
          {name}
        </HawkText>
      </div>
      <div>{children}</div>
      {note && (
        <HawkText variant="tiny" ink="disabled">
          {note}
        </HawkText>
      )}
    </div>
  );
}

/** The row of anchored state tiles a specimen ends with. */
export function PreviewStates({
  children,
  columns = 3,
}: {
  children: ReactNode;
  columns?: 2 | 3 | 4;
}) {
  return (
    <PreviewSection
      title="States"
      rule={
        <>
          Every state below is built <strong>with</strong> this component, not
          assembled afterwards — a skeleton designed later will not match the shape
          it stands in for. Each is anchored <code>#states-&lt;state&gt;</code> so
          the index can deep-link it.
        </>
      }
    >
      <PreviewGrid columns={columns}>{children}</PreviewGrid>
    </PreviewSection>
  );
}

/** A labelled specimen row — a variant beside its name. */
export function PreviewRow({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap items-center gap-hawk-5', className)}>
      <span className="w-32 shrink-0 text-hawk-caption text-hawk-ink-muted">{label}</span>
      <div className="flex flex-wrap items-center gap-hawk-4">{children}</div>
    </div>
  );
}

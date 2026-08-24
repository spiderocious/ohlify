import { Children, isValidElement, useEffect, type ReactNode } from 'react';

import { HawkPerforation } from '../foundation/icon.js';
import { HawkSkeleton, HawkSkeletonLine } from '../foundation/skeleton.js';
import { cn } from '../utils/cn.js';

/**
 * The Pass — the system's signature compound. CONTRACTS §5.
 *
 *     Pass.Root
 *       Pass.Body        — the held thing (avatar, name, meter)
 *       Pass.Perforation — the one decorative device
 *       Pass.Stub        — the entitlement + its record
 *       Pass.Meta        — reference, timestamp
 *
 * ## The evidence rule (§5.1)
 *
 * **`Pass.Stub` is a required slot. A pass without its stub does not render.**
 *
 * A marketplace that sells time by the second must never show an entitlement
 * without showing what it costs and what record backs it. A stub you can forget
 * to pass will eventually ship an unpriced entitlement.
 *
 * How that is enforced here is worth stating plainly, because it is **weaker
 * than the Flutter port's**. In Flutter, `stub` is a required constructor
 * argument and the compiler rejects a Pass without one. React children cannot
 * be constrained that way, so `Pass.Root` inspects its children on mount and
 * throws in development. That catches the mistake on first render rather than
 * at compile time — real enforcement, but one build step later.
 */
export interface HawkPassRootProps {
  children: ReactNode;
  /** Renders as `article` by default; `a` when the pass is a link. */
  as?: 'article' | 'a' | 'div';
  href?: string;
  onClick?: () => void;
  className?: string;
}

function PassRoot({
  children,
  as: Tag = 'article',
  href,
  onClick,
  className,
}: HawkPassRootProps) {
  // The evidence rule, enforced. Dev-only: the check costs a children walk on
  // every render and the failure mode it guards is a build-time authoring
  // mistake, not a runtime condition.
  useEffect(() => {
    if (process.env['NODE_ENV'] === 'production') return;
    const hasStub = Children.toArray(children).some(
      (child) => isValidElement(child) && child.type === PassStub,
    );
    if (!hasStub) {
      throw new Error(
        'HawkPass.Root requires a HawkPass.Stub child. A pass without its stub ' +
          'shows an entitlement with no price and no record behind it — see ' +
          'CONTRACTS §5.1, the evidence rule.',
      );
    }
  }, [children]);

  return (
    <Tag
      href={href}
      onClick={onClick}
      className={cn(
        'hawk-pass relative flex flex-col overflow-hidden rounded-hawk-fixed-lg',
        'border border-hawk-line bg-hawk-paper',
        onClick || href
          ? 'hawk-motion cursor-pointer transition-shadow duration-hawk-fast hover:shadow-hawk-popover'
          : undefined,
        className,
      )}
    >
      {children}
    </Tag>
  );
}

/** The held thing — avatar, name, the figure that matters. */
function PassBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex flex-col gap-hawk-4 p-hawk-pad', className)}>{children}</div>;
}

/**
 * The stub — the entitlement and its record.
 *
 * Sits on the tinted stock so it reads as a physically different part of the
 * card, the way a real boarding pass stub does.
 */
function PassStub({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-hawk-5 bg-hawk-stock px-hawk-pad py-hawk-5',
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Reference number, timestamp — the quietest tier. */
function PassMeta({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-hawk-4 border-t border-hawk-line',
        'px-hawk-pad py-hawk-4 text-hawk-caption text-hawk-ink-muted',
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * The perforation, positioned between body and stub.
 *
 * Its end-notches are painted in the ground colour, so it only reads correctly
 * against the ground — which is the only place a pass ever sits.
 */
function PassPerforation({ className }: { className?: string }) {
  return <HawkPerforation className={cn('my-0', className)} />;
}

/**
 * The pass skeleton — mirroring the pass's own layout. CONTRACTS §6.
 *
 * Note it includes the stub band. A skeleton that omits it would imply a
 * shorter card and then jump when the real content arrives.
 */
function PassSkeleton({ className }: { className?: string }) {
  return (
    <div
      aria-busy="true"
      role="status"
      aria-label="Loading"
      className={cn(
        'hawk-pass flex flex-col overflow-hidden rounded-hawk-fixed-lg border border-hawk-line bg-hawk-paper',
        className,
      )}
    >
      <div className="flex flex-col gap-hawk-5 p-hawk-pad">
        <div className="flex items-center gap-hawk-5">
          <HawkSkeleton circle width={56} height={56} />
          <div className="flex flex-1 flex-col gap-hawk-3">
            <HawkSkeletonLine widthFactor={0.5} height={14} />
            <HawkSkeletonLine widthFactor={0.3} height={10} />
          </div>
        </div>
        <HawkSkeletonLine widthFactor={0.7} height={28} />
      </div>
      <HawkPerforation className="my-0" />
      <div className="flex items-center justify-between gap-hawk-5 bg-hawk-stock px-hawk-pad py-hawk-5">
        <HawkSkeletonLine widthFactor={0.35} height={12} />
        <HawkSkeletonLine widthFactor={0.2} height={12} />
      </div>
    </div>
  );
}

export const HawkPass = {
  Root: PassRoot,
  Body: PassBody,
  Perforation: PassPerforation,
  Stub: PassStub,
  Meta: PassMeta,
  Skeleton: PassSkeleton,
};

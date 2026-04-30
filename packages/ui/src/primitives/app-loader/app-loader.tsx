import { cn } from '../../utils/cn.js';

interface AppLoaderProps {
  size?: number;
  className?: string;
}

/** Mirrors mobile AppLoader: centered primary-colored 2.5px spinner. */
export function AppLoader({ size = 32, className }: AppLoaderProps) {
  return (
    <div className={cn('flex w-full items-center justify-center', className)}>
      <span
        role="status"
        aria-label="Loading"
        className="inline-block animate-spin rounded-full border-[2.5px] border-t-transparent"
        style={{
          width: size,
          height: size,
          borderColor: 'var(--ohl-primary)',
          borderTopColor: 'transparent',
        }}
      />
    </div>
  );
}

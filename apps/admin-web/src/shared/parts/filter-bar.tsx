import type { ReactNode } from 'react';

interface FilterBarProps {
  children: ReactNode;
}

/**
 * Horizontal row of filter controls above each list. On mobile each child
 * stretches to full width; on ≥sm they sit inline. Children that want a
 * specific desktop width set it themselves (e.g. `<div className="sm:w-44">`).
 */
export function FilterBar({ children }: FilterBarProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-border bg-surface px-4 py-3 sm:flex-row sm:flex-wrap sm:items-end sm:px-6 sm:py-4">
      {children}
    </div>
  );
}

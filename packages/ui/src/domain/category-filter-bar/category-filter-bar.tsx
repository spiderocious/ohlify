import { AppButton } from '../../primitives/app-button/app-button.js';
import { cn } from '../../utils/cn.js';

interface CategoryFilterBarProps {
  categories: ReadonlyArray<string>;
  selected: string;
  onSelect: (value: string) => void;
  className?: string;
}

/** Mirrors mobile CategoryFilterBar — horizontally scrollable pill row. */
export function CategoryFilterBar({
  categories,
  selected,
  onSelect,
  className,
}: CategoryFilterBarProps) {
  return (
    <div
      className={cn('flex w-full gap-2 overflow-x-auto', className)}
      style={{ scrollbarWidth: 'none' }}
    >
      {categories.map((cat) => {
        const isSelected = cat === selected;
        return (
          <AppButton
            key={cat}
            label={cat}
            variant={isSelected ? 'solid' : 'outline'}
            onPressed={() => onSelect(cat)}
            radius={100}
            height={40}
            padding="0 16px"
            textStyle={{ fontSize: 13, fontWeight: 600 }}
          />
        );
      })}
    </div>
  );
}

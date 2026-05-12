import { AppText } from '@ohlify/ui';

interface DescriptionSectionProps {
  description: string;
}

/** Mirrors mobile/lib/features/professional_details/screen/parts/description_section.dart. */
export function DescriptionSection({ description }: DescriptionSectionProps) {
  return (
    <div>
      <AppText variant="header" weight={700} align="start" color="var(--ohl-text-jet)">
        About
      </AppText>
      <div className="mt-2.5 rounded-2xl bg-background p-4">
        <AppText variant="body" align="start" color="var(--ohl-text-jet)">
          {description}
        </AppText>
      </div>
    </div>
  );
}

import { AppText } from '@ohlify/ui';

export interface OnboardingSlideData {
  title: string;
  subtitle: string;
}

/** Mirrors mobile/lib/features/onboarding/screen/parts/onboarding_slide.dart. */
export function OnboardingSlide({ data }: { data: OnboardingSlideData }) {
  return (
    <div className="flex w-full shrink-0 flex-col items-center px-6">
      <div className="mt-14 flex h-[280px] w-full max-w-[340px] items-center justify-center rounded-3xl bg-secondary/60">
        <span className="font-sans text-sm text-text-muted">[ Phone illustration ]</span>
      </div>
      <div className="mt-8 px-2">
        <AppText as="h2" variant="header" align="center">
          {data.title}
        </AppText>
      </div>
      <div className="mt-3 px-4">
        <AppText
          as="p"
          variant="body"
          align="center"
          color="var(--ohl-text-muted)"
          className="max-w-md"
        >
          {data.subtitle}
        </AppText>
      </div>
    </div>
  );
}

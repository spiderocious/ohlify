import { IconChevronLeft } from '@icons';

import { AppButton } from '../../primitives/app-button/app-button.js';
import { AppText } from '../../primitives/app-text/app-text.js';
import { RatesListBody, type RatesController } from './rates-list-body.js';

export type { RatesController } from './rates-list-body.js';

interface RatesListScreenProps {
  controller: RatesController;
  /** Called when user taps the back row. Defaults to history.back(). */
  onBack?: () => void;
  submitLabel?: string;
  /** Defaults to onBack. */
  onSubmit?: () => void;
}

/**
 * Reusable Rates list screen.
 * 1:1 with mobile/lib/ui/widgets/rates_list_screen/rates_list_screen.dart.
 */
export function RatesListScreen({
  controller,
  onBack,
  submitLabel = 'Proceed',
  onSubmit,
}: RatesListScreenProps) {
  const hasRates = controller.rates.length > 0;
  const back = onBack ?? (() => window.history.back());
  const submit = onSubmit ?? back;

  return (
    <div className="flex h-full flex-col bg-background font-sans">
      <div className="px-4 pb-1 pt-2">
        <button
          type="button"
          onClick={back}
          className="inline-flex items-center gap-1 text-text-jet"
        >
          <IconChevronLeft size={22} />
          <AppText variant="body" align="start" color="var(--ohl-text-jet)" weight={500}>
            Back
          </AppText>
        </button>
      </div>
      <div className="px-4 pb-1 pt-2">
        <AppText variant="title" align="start" color="var(--ohl-text-jet)" weight={800}>
          Rates
        </AppText>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <RatesListBody controller={controller} />
      </div>
      <div className="px-4 pb-4 pt-2">
        <AppButton
          label={submitLabel}
          expanded
          radius={100}
          isDisabled={!hasRates}
          onPressed={!hasRates ? undefined : submit}
        />
      </div>
    </div>
  );
}

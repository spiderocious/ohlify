import { AppButton } from '../../primitives/app-button/app-button.js';
import { RatesListBody, type RatesController } from './rates-list-body.js';

interface RatesListContentProps {
  controller: RatesController;
  /**
   * Called when the user taps the bottom CTA. The host modal is responsible
   * for dismissing itself in this callback. Optional — when omitted, the CTA
   * is hidden entirely (useful when the modal is purely an editor and saves
   * happen per-rate via the controller).
   */
  onDone?: () => void;
  /** Defaults to "Done". Only used when `onDone` is supplied. */
  submitLabel?: string;
}

/**
 * Modal-friendly variant of `RatesListScreen`. Renders the same body — empty
 * state, audio/video groups, "Add rate" — but without the screen chrome
 * (back button, page title, full-height layout). Drop into
 * `DrawerService.showCustomModal`:
 *
 * ```tsx
 * DrawerService.showCustomModal(
 *   'Rates',
 *   (dismiss) => <RatesListContent controller={controller} onDone={dismiss} />,
 *   { position: 'center' },
 * );
 * ```
 *
 * Each `addRate` / `removeRate` call on the controller fires immediately, so
 * the list updates as the user works. The "Done" button just dismisses.
 */
export function RatesListContent({
  controller,
  onDone,
  submitLabel = 'Done',
}: RatesListContentProps) {
  return (
    <div className="flex flex-col gap-4 font-sans">
      <RatesListBody controller={controller} />
      {onDone ? (
        <AppButton label={submitLabel} expanded radius={100} onPressed={onDone} />
      ) : null}
    </div>
  );
}

import { IconCopy } from '@icons';
import { CopyToClipboard } from 'meemaw';

import { AppText, DrawerService } from '@ohlify/ui';

interface ProfileLinkCardProps {
  profileUrl: string;
  onCopy?: () => void;
}

/** Mirrors mobile/lib/features/profile/screen/parts/profile_link_card.dart. */
export function ProfileLinkCard({ profileUrl, onCopy }: ProfileLinkCardProps) {
  return (
    <div className="rounded-2xl bg-background p-4">
      <AppText variant="bodyNormal" align="start" color="var(--ohl-text-muted)">
        Your shareable profile link
      </AppText>
      <div className="mt-2 flex items-center gap-3">
        <AppText
          variant="body"
          weight={600}
          align="start"
          color="var(--ohl-text-jet)"
          maxLines={1}
          className="min-w-0 flex-1"
        >
          {profileUrl}
        </AppText>
        <CopyToClipboard
          text={profileUrl}
          onSuccess={() => {
            DrawerService.toast('Link copied', { type: 'success' });
            onCopy?.();
          }}
        >
          {(copy) => (
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-1.5 rounded-pill bg-primary px-3.5 py-2 font-sans text-xs font-semibold text-white"
            >
              <IconCopy size={14} />
              Copy
            </button>
          )}
        </CopyToClipboard>
      </div>
    </div>
  );
}

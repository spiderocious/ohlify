import { IconFileText, IconHeart, IconUser, type LucideIcon } from '@icons';

import { DrawerService, InterestsForm, KycItemTile } from '@ohlify/ui';

import {
  CLIENT_KYC_ITEMS,
  CLIENT_KYC_SUBTITLES,
  CLIENT_KYC_TITLES,
  useClientKyc,
  type ClientKycItem,
} from '../../providers/client-kyc-provider.js';
import { useSaveClientKyc } from '../../api/use-save-client-kyc.js';

const ICONS: Record<ClientKycItem, LucideIcon> = {
  fullName: IconUser,
  interests: IconHeart,
  description: IconFileText,
};

/**
 * Client-side KYC item keys are camelCase (`fullName`) but the backend
 * resubmit set uses the canonical KycItemKey strings (`full_name`). This
 * map bridges the two so the parent screen can pass `resubmission.item_keys`
 * straight through without translation.
 */
const SERVER_KEY_BY_LOCAL: Record<ClientKycItem, string> = {
  fullName: 'full_name',
  interests: 'interests',
  description: 'description',
};

interface ClientKycItemsListProps {
  /**
   * Server-side keys (`full_name`, `interests`, `description`) the user
   * may resubmit. When non-empty, every other tile renders as locked.
   */
  resubmitKeys?: readonly string[] | null;
}

const successToast = (message: string) =>
  DrawerService.toast(message, { type: 'success' });

export function ClientKycItemsList({ resubmitKeys = null }: ClientKycItemsListProps = {}) {
  const ctx = useClientKyc();
  const saveKyc = useSaveClientKyc();
  const lockedSet =
    resubmitKeys && resubmitKeys.length > 0 ? new Set<string>(resubmitKeys) : null;

  const summaryFor = (item: ClientKycItem): string | null => {
    switch (item) {
      case 'fullName':
        return ctx.fullName;
      case 'description':
        return ctx.description;
      case 'interests':
        return ctx.interests.length === 0 ? null : ctx.interests.join(', ');
    }
  };

  const open = (item: ClientKycItem) => {
    switch (item) {
      case 'fullName': {
        let pending: string | undefined;
        const handle = DrawerService.showInputModal(
          'Full name',
          'Enter your full legal name as it appears on ID.',
          {
            placeholder: 'e.g. Adedeji Benson Bamidele',
            defaultValue: ctx.fullName ?? '',
            confirmButtonText: 'Save',
            showCancelButton: false,
            onConfirm: (v) => {
              pending = v.trim();
            },
          },
        );
        void handle.onDismissed.then(() => {
          if (pending && pending !== '') {
            ctx.setFullName(pending);
            saveKyc.mutate({ full_name: pending }, {
              onSuccess: () => successToast('Full name saved'),
            });
          }
        });
        return;
      }
      case 'description': {
        let pending: string | undefined;
        const handle = DrawerService.showInputModal(
          'Description',
          'Set your description, let people know what you do and who you are.',
          {
            placeholder: 'Type your description here...',
            multiline: true,
            maxLength: 500,
            defaultValue: ctx.description ?? '',
            confirmButtonText: 'Save',
            showCancelButton: false,
            onConfirm: (v) => {
              pending = v.trim();
            },
          },
        );
        void handle.onDismissed.then(() => {
          if (pending !== undefined) {
            ctx.setDescription(pending);
            saveKyc.mutate({ description: pending }, {
              onSuccess: () => successToast('Description saved'),
            });
          }
        });
        return;
      }
      case 'interests': {
        let pending: string[] | undefined;
        let dismiss: (() => void) | null = null;
        const handle = DrawerService.showCustomModal(
          'Interests',
          (close) => {
            dismiss = close;
            return (
              <InterestsForm
                initialInterests={ctx.interests}
                onSave={(values) => {
                  pending = values;
                  dismiss?.();
                }}
              />
            );
          },
          { position: 'center' },
        );
        void handle.onDismissed.then(() => {
          if (pending) {
            ctx.setInterests(pending);
            saveKyc.mutate({ interests: pending }, {
              onSuccess: () => successToast('Interests saved'),
            });
          }
        });
        return;
      }
    }
  };

  return (
    <div className="space-y-3">
      {CLIENT_KYC_ITEMS.map((item) => {
        const locked = lockedSet !== null && !lockedSet.has(SERVER_KEY_BY_LOCAL[item]);
        return (
          <KycItemTile
            key={item}
            Icon={ICONS[item]}
            title={CLIENT_KYC_TITLES[item]}
            subtitle={summaryFor(item) ?? CLIENT_KYC_SUBTITLES[item]}
            completed={ctx.isComplete(item)}
            locked={locked}
            onTap={() => open(item)}
          />
        );
      })}
    </div>
  );
}

import {
  IconBuilding,
  IconChevronRight,
  IconDelete,
  IconFileText,
  IconHelp,
  IconLock,
  IconLogout,
  IconSettings,
  IconShield,
  IconTag,
  IconUser,
  type LucideIcon,
} from '@icons';
import { Repeat } from 'meemaw';

import { AppText } from '@ohlify/ui';

interface ProfileMenuProps {
  onPersonalInfo: () => void;
  onRates: () => void;
  onBankAccount: () => void;
  onChangePassword: () => void;
  onNotifications: () => void;
  onHelpDesk: () => void;
  onPrivacyPolicy: () => void;
  onEula: () => void;
  onTerms: () => void;
  onDeleteAccount: () => void;
  onLogout: () => void;
}

/** Mirrors mobile/lib/features/profile/screen/parts/profile_menu.dart. */
export function ProfileMenu(props: ProfileMenuProps) {
  const items: Array<{
    Icon: LucideIcon;
    label: string;
    onTap: () => void;
    danger?: boolean;
  }> = [
    { Icon: IconUser, label: 'Personal information', onTap: props.onPersonalInfo },
    { Icon: IconTag, label: 'Rates', onTap: props.onRates },
    { Icon: IconBuilding, label: 'Bank account', onTap: props.onBankAccount },
    { Icon: IconLock, label: 'Change password', onTap: props.onChangePassword },
    { Icon: IconSettings, label: 'Notifications', onTap: props.onNotifications },
    { Icon: IconHelp, label: 'Help desk', onTap: props.onHelpDesk },
    { Icon: IconShield, label: 'Privacy policy', onTap: props.onPrivacyPolicy },
    { Icon: IconFileText, label: 'EULA', onTap: props.onEula },
    { Icon: IconFileText, label: 'Terms of service', onTap: props.onTerms },
    { Icon: IconDelete, label: 'Delete account', onTap: props.onDeleteAccount, danger: true },
    { Icon: IconLogout, label: 'Log out', onTap: props.onLogout, danger: true },
  ];

  return (
    <div className="overflow-hidden rounded-2xl bg-background">
      <Repeat each={items}>
        {(item) => {
          const Icon = item.Icon;
          return (
            <button
              key={item.label}
              type="button"
              onClick={item.onTap}
              className="flex w-full items-center gap-3 border-b border-border px-4 py-3.5 last:border-b-0"
            >
              <span
                className="flex h-9 w-9 items-center justify-center rounded-md bg-surface-dark"
                style={{ color: item.danger ? 'var(--ohl-danger)' : 'var(--ohl-primary)' }}
              >
                <Icon size={18} />
              </span>
              <AppText
                variant="body"
                weight={600}
                align="start"
                color={item.danger ? 'var(--ohl-danger)' : 'var(--ohl-text-jet)'}
                className="flex-1"
              >
                {item.label}
              </AppText>
              <IconChevronRight size={16} color="var(--ohl-text-slate)" />
            </button>
          );
        }}
      </Repeat>
    </div>
  );
}

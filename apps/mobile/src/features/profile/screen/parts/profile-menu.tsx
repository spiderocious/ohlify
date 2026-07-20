import { AppIcon, AppText, colors, useIsProfessional, type AppIconName } from '@ohlify/mobile-ui';
import { Pressable, View } from 'react-native';

export interface ProfileMenuProps {
  onPersonalInfo: () => void;
  onRates: () => void;
  onBankAccount: () => void;
  onBookingBlocks: () => void;
  onChangePassword: () => void;
  onNotifications: () => void;
  onHelpDesk: () => void;
  onPrivacyPolicy: () => void;
  onEula: () => void;
  onTerms: () => void;
  onDeleteAccount: () => void;
  onLogout: () => void;
}

interface MenuRow {
  icon: AppIconName;
  label: string;
  onTap: () => void;
  showChevron?: boolean;
  iconColor?: string;
  labelColor?: string;
}

/** Mirrors mobile/lib/features/profile/screen/parts/profile_menu.dart. */
export function ProfileMenu(props: ProfileMenuProps) {
  const isProfessional = useIsProfessional();
  const personalRows: MenuRow[] = [
    { icon: 'person', label: 'Personal information', onTap: props.onPersonalInfo, showChevron: true },
    ...(isProfessional
      ? [
          { icon: 'star' as const, label: 'Rates', onTap: props.onRates, showChevron: true },
          { icon: 'building' as const, label: 'Bank account', onTap: props.onBankAccount, showChevron: true },
          { icon: 'clock' as const, label: 'Booking blocks', onTap: props.onBookingBlocks, showChevron: true },
        ]
      : []),
  ];
  const otherRows: MenuRow[] = [
    { icon: 'settings', label: 'Change password', onTap: props.onChangePassword, showChevron: true },
    { icon: 'notification', label: 'Notifications', onTap: props.onNotifications, showChevron: true },
  ];
  const appRows: MenuRow[] = [
    { icon: 'info', label: 'Help desk', onTap: props.onHelpDesk },
    { icon: 'info', label: 'Privacy policy', onTap: props.onPrivacyPolicy },
    { icon: 'info', label: 'End user license agreement', onTap: props.onEula },
    { icon: 'info', label: 'Terms & conditions', onTap: props.onTerms },
    { icon: 'logout', label: 'Logout', onTap: props.onLogout, iconColor: colors.danger },
    { icon: 'delete', label: 'Delete account', onTap: props.onDeleteAccount, iconColor: colors.danger, labelColor: colors.danger },
  ];

  return (
    <View>
      <MenuGroup title="Personal" rows={personalRows} />
      <View style={{ height: 24 }} />
      <MenuGroup title="Others" rows={otherRows} />
      <View style={{ height: 24 }} />
      <MenuGroup title="App" rows={appRows} />
    </View>
  );
}

function MenuGroup({ title, rows }: { title: string; rows: MenuRow[] }) {
  return (
    <View>
      <AppText variant="label" color={colors.textMuted} align="left" weight="500">
        {title}
      </AppText>
      <View style={{ height: 8 }} />
      {rows.map((row) => (
        <RowTile key={row.label} row={row} />
      ))}
    </View>
  );
}

function RowTile({ row }: { row: MenuRow }) {
  return (
    <Pressable onPress={row.onTap}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14 }}>
        <AppIcon name={row.icon} size={22} color={row.iconColor ?? colors.textJet} />
        <View style={{ width: 14 }} />
        <View style={{ flex: 1 }}>
          <AppText variant="body" color={row.labelColor ?? colors.textJet} align="left" weight="500">
            {row.label}
          </AppText>
        </View>
        {row.showChevron ? <AppIcon name="chevronRight" size={20} color={colors.textMuted} /> : null}
      </View>
    </Pressable>
  );
}

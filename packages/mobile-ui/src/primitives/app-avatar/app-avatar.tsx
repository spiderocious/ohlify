import { Text, View } from 'react-native';

import { colors } from '../../theme/colors';
import { AppFilePreview } from '../app-file-preview/app-file-preview';
import { AppIcon } from '../../icons/app-icons';

/**
 * Circular avatar backed by the file-service `key` flow. Falls back to
 * colored initials extracted from `name` when fileKey is absent. 1:1 with
 * mobile/lib/ui/widgets/app_avatar/app_avatar.dart. See AppFilePreview's
 * comment on why `resolveUri` is injected rather than read from context.
 */
export interface AppAvatarProps {
  fileKey?: string;
  resolveUri: (key: string) => Promise<string>;
  name?: string;
  size?: number;
  backgroundColor?: string;
  foregroundColor?: string;
}

function initials(name?: string): string {
  const trimmed = name?.trim();
  if (!trimmed) return '';
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0]!.slice(0, 1).toUpperCase();
  return (parts[0]!.slice(0, 1) + parts[parts.length - 1]!.slice(0, 1)).toUpperCase();
}

export function AppAvatar({
  fileKey,
  resolveUri,
  name,
  size = 44,
  backgroundColor = colors.surfaceDark,
  foregroundColor = colors.textJet,
}: AppAvatarProps) {
  const radius = size / 2;
  const hasKey = Boolean(fileKey);
  const initialsText = initials(name);

  const placeholder = (
    <InitialsPlaceholder
      initials={initialsText}
      backgroundColor={backgroundColor}
      foregroundColor={foregroundColor}
      fontSize={radius * 0.8}
    />
  );

  return (
    <View style={{ width: size, height: size, borderRadius: radius, overflow: 'hidden' }}>
      {hasKey ? (
        <AppFilePreview
          fileKey={fileKey}
          resolveUri={resolveUri}
          width={size}
          height={size}
          placeholder={placeholder}
          errorWidget={placeholder}
        />
      ) : (
        placeholder
      )}
    </View>
  );
}

function InitialsPlaceholder({
  initials: text,
  backgroundColor,
  foregroundColor,
  fontSize,
}: {
  initials: string;
  backgroundColor: string;
  foregroundColor: string;
  fontSize: number;
}) {
  return (
    <View style={{ flex: 1, backgroundColor, alignItems: 'center', justifyContent: 'center' }}>
      {text ? (
        <Text
          style={{
            fontFamily: 'MonaSans-SemiBold',
            fontWeight: '600',
            fontSize,
            color: foregroundColor,
          }}
        >
          {text}
        </Text>
      ) : (
        <AppIcon name="person" size={fontSize * 1.3} color={foregroundColor} />
      )}
    </View>
  );
}

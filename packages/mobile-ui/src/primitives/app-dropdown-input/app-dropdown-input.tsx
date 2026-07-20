import { useState, type ReactNode } from 'react';
import { FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native';

import { AppIcon } from '../../icons/app-icons';
import { colors } from '../../theme/colors';

/**
 * 1:1 with mobile/lib/ui/widgets/app_dropdown_input/app_dropdown_input.dart.
 * Flutter positions the option list via CompositedTransformFollower directly
 * below the field; RN has no equivalent overlay-anchoring primitive, so this
 * presents the same option list in a centered Modal sheet instead — same
 * search/select behavior, different (but standard-for-RN) presentation.
 */
export interface DropdownOption<T> {
  label: string;
  value: T;
  icon?: ReactNode;
}

export interface AppDropdownInputProps<T> {
  options: DropdownOption<T>[];
  value?: T;
  onChange?: (value: T) => void;
  placeholder?: string;
  disabled?: boolean;
  bordered?: boolean;
  borderColor?: string;
  errorMessage?: string;
  searchable?: boolean;
  label?: string;
}

export function AppDropdownInput<T>({
  options,
  value,
  onChange,
  placeholder,
  disabled = false,
  bordered = false,
  borderColor = colors.border,
  errorMessage,
  searchable = false,
  label,
}: AppDropdownInputProps<T>) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selected = options.find((o) => o.value === value);
  const filtered =
    search.length === 0
      ? options
      : options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()));

  function close() {
    setOpen(false);
    setSearch('');
  }

  function select(option: DropdownOption<T>) {
    onChange?.(option.value);
    close();
  }

  const showBorder = bordered || Boolean(errorMessage) || open;
  const effectiveBorderColor = errorMessage
    ? colors.error
    : open
      ? colors.primary
      : bordered
        ? borderColor
        : 'transparent';

  return (
    <View>
      {label ? (
        <Text
          style={{
            fontFamily: 'MonaSans-Medium',
            fontSize: 13,
            fontWeight: '500',
            color: colors.textPrimary,
            marginBottom: 6,
          }}
        >
          {label}
        </Text>
      ) : null}

      <Pressable onPress={disabled ? undefined : () => setOpen(true)}>
        <View
          style={{
            height: 52,
            borderRadius: 12,
            backgroundColor: disabled ? colors.surface : colors.background,
            borderWidth: showBorder ? (open ? 1.5 : 1) : 0,
            borderColor: showBorder ? effectiveBorderColor : undefined,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          {selected?.icon ? <View style={{ marginRight: 8 }}>{selected.icon}</View> : null}
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              fontFamily: 'MonaSans-Regular',
              fontSize: 16,
              fontWeight: '400',
              color: selected ? colors.textPrimary : colors.textSlate,
            }}
          >
            {selected?.label ?? placeholder ?? 'Select...'}
          </Text>
          <AppIcon name="chevronDown" size={20} color={colors.textSlate} />
        </View>
      </Pressable>

      {errorMessage ? (
        <Text
          style={{
            fontFamily: 'MonaSans-Regular',
            fontSize: 12,
            color: colors.error,
            marginTop: 6,
          }}
        >
          {errorMessage}
        </Text>
      ) : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <Pressable
          onPress={close}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.4)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxHeight: 360,
              backgroundColor: colors.background,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.border,
              overflow: 'hidden',
            }}
          >
            {searchable ? (
              <View style={{ padding: 8 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 8,
                    paddingHorizontal: 10,
                  }}
                >
                  <AppIcon name="search" size={18} color={colors.textSlate} />
                  <TextInput
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search..."
                    placeholderTextColor={colors.textSlate}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      marginLeft: 8,
                      fontFamily: 'MonaSans-Regular',
                      fontSize: 14,
                    }}
                  />
                </View>
              </View>
            ) : null}

            <FlatList
              data={filtered}
              keyExtractor={(item, index) => `${item.label}-${index}`}
              renderItem={({ item }) => {
                const isSelected = item.value === value;
                return (
                  <Pressable
                    onPress={() => select(item)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      backgroundColor: isSelected ? `${colors.secondary}80` : undefined,
                    }}
                  >
                    {item.icon ? <View style={{ marginRight: 10 }}>{item.icon}</View> : null}
                    <Text
                      style={{
                        flex: 1,
                        fontFamily: isSelected ? 'MonaSans-SemiBold' : 'MonaSans-Regular',
                        fontSize: 15,
                        fontWeight: isSelected ? '600' : '400',
                        color: isSelected ? colors.primary : colors.textPrimary,
                      }}
                    >
                      {item.label}
                    </Text>
                    {isSelected ? <AppIcon name="check" size={16} color={colors.primary} /> : null}
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

import { useState } from 'react';
import { FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native';

import { AppIcon } from '../../icons/app-icons';
import { colors } from '../../theme/colors';
import { AppTag } from '../app-tag/app-tag';
import type { DropdownOption } from '../app-dropdown-input/app-dropdown-input';

/**
 * Multi-select searchable dropdown with an optional "Other" free-text
 * fallback. 1:1 with
 * mobile/lib/ui/widgets/app_multi_select_dropdown/app_multi_select_dropdown.dart
 * — same Modal-sheet presentation choice as AppDropdownInput (see that
 * file's comment on why RN doesn't get Flutter's overlay-anchoring).
 */
export interface AppMultiSelectDropdownProps {
  options: DropdownOption<string>[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  label?: string;
  /** When true, the popup includes a free-text field to add a value not in options. */
  allowOther?: boolean;
  otherPlaceholder?: string;
}

function isSelected(selected: string[], value: string): boolean {
  return selected.some((v) => v.toLowerCase() === value.toLowerCase());
}

export function AppMultiSelectDropdown({
  options,
  selected,
  onChange,
  placeholder = 'Search and select',
  label,
  allowOther = false,
  otherPlaceholder = 'Add a custom option',
}: AppMultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [otherText, setOtherText] = useState('');

  const filtered =
    search.length === 0
      ? options
      : options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()));

  function toggleValue(value: string) {
    const next = isSelected(selected, value)
      ? selected.filter((v) => v.toLowerCase() !== value.toLowerCase())
      : [...selected, value];
    onChange(next);
  }

  function addOther() {
    const trimmed = otherText.trim();
    if (!trimmed || isSelected(selected, trimmed)) return;
    onChange([...selected, trimmed]);
    setOtherText('');
  }

  function close() {
    setOpen(false);
    setSearch('');
  }

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

      <Pressable onPress={() => setOpen(true)}>
        <View
          style={{
            minHeight: 52,
            borderRadius: 12,
            backgroundColor: colors.background,
            borderWidth: open ? 1.5 : 1,
            borderColor: open ? colors.primary : colors.border,
            paddingHorizontal: 12,
            paddingVertical: 10,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          {selected.length === 0 ? (
            <Text style={{ flex: 1, fontFamily: 'Inter', fontSize: 16, color: colors.textSlate }}>
              {placeholder}
            </Text>
          ) : (
            <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {selected.map((value) => (
                <AppTag
                  key={value}
                  label={value.toUpperCase()}
                  variant="outline"
                  size="small"
                  endIcon={<AppIcon name="close" size={12} color={colors.textPrimary} />}
                  onPress={() => toggleValue(value)}
                />
              ))}
            </View>
          )}
          <AppIcon name="chevronDown" size={20} color={colors.textSlate} />
        </View>
      </Pressable>

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
              maxHeight: 420,
              backgroundColor: colors.background,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: colors.border,
              overflow: 'hidden',
            }}
          >
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

            <FlatList
              data={filtered}
              keyExtractor={(item, index) => `${item.value}-${index}`}
              renderItem={({ item }) => {
                const checked = isSelected(selected, item.value);
                return (
                  <Pressable
                    onPress={() => toggleValue(item.value)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      backgroundColor: checked ? `${colors.secondary}66` : undefined,
                    }}
                  >
                    <Checkbox checked={checked} />
                    <Text
                      style={{
                        marginLeft: 12,
                        fontFamily: checked ? 'MonaSans-SemiBold' : 'MonaSans-Regular',
                        fontSize: 15,
                        fontWeight: checked ? '600' : '400',
                        color: checked ? colors.primary : colors.textPrimary,
                      }}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              }}
            />

            {allowOther ? (
              <>
                <View style={{ height: 1, backgroundColor: colors.border }} />
                <View style={{ padding: 8, flexDirection: 'row', alignItems: 'center' }}>
                  <AppIcon name="add" size={18} color={colors.textSlate} />
                  <TextInput
                    value={otherText}
                    onChangeText={setOtherText}
                    placeholder={otherPlaceholder}
                    placeholderTextColor={colors.textSlate}
                    onSubmitEditing={addOther}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      marginLeft: 8,
                      fontFamily: 'MonaSans-Regular',
                      fontSize: 14,
                    }}
                  />
                  <Pressable onPress={addOther}>
                    <AppIcon name="check" size={20} color={colors.primary} />
                  </Pressable>
                </View>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <View
      style={{
        width: 18,
        height: 18,
        borderRadius: 4,
        backgroundColor: checked ? colors.primary : 'transparent',
        borderWidth: 1.5,
        borderColor: checked ? colors.primary : colors.border,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {checked ? <AppIcon name="check" size={14} color={colors.textWhite} /> : null}
    </View>
  );
}

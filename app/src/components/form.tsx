import React, {useState} from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextStyle,
} from 'react-native';
import {useTheme} from '../theme/ThemeContext';
import {fontFamily} from '../theme/theme';
import {t} from '../i18n';
import {Icon} from './Icon';
import {Checkbox, Switch} from './controls';
import {usePrompt} from './Prompt';

export function Label({children}: {children: React.ReactNode}) {
  const {colors} = useTheme();
  return (
    <Text style={[styles.label, {color: colors.textPrimary, fontFamily}]}>
      {children}
    </Text>
  );
}

/** The little "?" that opens the help dialog for an option/setting. */
export function HelpButton({id, type}: {id: string; type: 'option' | 'setting'}) {
  const {colors} = useTheme();
  const {show, hide} = usePrompt();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('help')}
      hitSlop={8}
      onPress={() =>
        show({
          title: t(`${type}_${id}`),
          body: t(`${type}_${id}_description`),
          buttons: [{label: t('prompt_done'), onPress: hide}],
        })
      }>
      <Icon name="help-outline" size={18} color={colors.helpIcons} />
    </Pressable>
  );
}

function RowLabel({label, help}: {label: string; help?: {id: string; type: 'option' | 'setting'}}) {
  return (
    <View style={styles.labelRow}>
      <Label>{label}</Label>
      {help ? <HelpButton id={help.id} type={help.type} /> : null}
    </View>
  );
}

export function SwitchRow({
  label,
  value,
  onValueChange,
  help,
}: {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  help?: {id: string; type: 'option' | 'setting'};
}) {
  return (
    <View style={styles.switchRow}>
      <View style={styles.flex}>
        <RowLabel label={label} help={help} />
      </View>
      <Switch value={value} onValueChange={onValueChange} accessibilityLabel={label} />
    </View>
  );
}

export function CheckboxRow({
  label,
  value,
  onValueChange,
  help,
}: {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  help?: {id: string; type: 'option' | 'setting'};
}) {
  return (
    <Pressable style={styles.checkboxRow} onPress={() => onValueChange(!value)}>
      <Checkbox value={value} onValueChange={onValueChange} accessibilityLabel={label} />
      <View style={styles.checkboxLabel}>
        <RowLabel label={label} help={help} />
      </View>
    </Pressable>
  );
}

export function InputRow({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  help,
  error,
  multiline,
  width,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric';
  help?: {id: string; type: 'option' | 'setting'};
  error?: string | null;
  multiline?: boolean;
  width?: number;
}) {
  const {colors} = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.inputBlock}>
      <RowLabel label={label} help={help} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        keyboardType={keyboardType}
        multiline={multiline}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          {
            color: colors.textPrimary,
            backgroundColor: colors.inputBackground,
            borderColor: focused ? colors.inputOutlineFocus : colors.line,
            fontFamily,
            width,
          },
        ]}
      />
      {error ? (
        <Text style={[styles.error, {color: colors.inputError, fontFamily}]}>{error}</Text>
      ) : null}
    </View>
  );
}

export interface SelectOption {
  value: string;
  label: string;
}

export function SelectRow({
  label,
  value,
  options,
  onChange,
  help,
}: {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (v: string) => void;
  help?: {id: string; type: 'option' | 'setting'};
}) {
  const {colors} = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);
  return (
    <View style={styles.inputBlock}>
      <RowLabel label={label} help={help} />
      <Pressable
        accessibilityRole="combobox"
        accessibilityLabel={label}
        onPress={() => setOpen(true)}
        style={[
          styles.input,
          styles.selectTrigger,
          {backgroundColor: colors.inputBackground, borderColor: colors.line},
        ]}>
        <Text style={{color: colors.textPrimary, fontFamily}}>
          {selected?.label ?? value}
        </Text>
        <Icon name="expand-more" size={20} color={colors.icons} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.selectBackdrop} onPress={() => setOpen(false)}>
          <View style={[styles.selectSheet, {backgroundColor: colors.elevated}]}>
            {options.map(o => (
              <Pressable
                key={o.value}
                style={({pressed}) => [
                  styles.selectItem,
                  pressed && {backgroundColor: colors.hover},
                ]}
                onPress={() => {
                  onChange(o.value);
                  setOpen(false);
                }}>
                <Text style={{color: colors.textPrimary, fontFamily, fontSize: 15}}>
                  {o.label}
                </Text>
                {o.value === value ? (
                  <Icon name="check" size={18} color={colors.button} />
                ) : null}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

/** Small red validation message under an input. */
export function InputError({message}: {message: string}) {
  const {colors} = useTheme();
  return <Text style={[styles.error, {color: colors.inputError, fontFamily}]}>{message}</Text>;
}

const inputStyle: TextStyle = {
  borderWidth: 1,
  borderRadius: 6,
  paddingHorizontal: 10,
  paddingVertical: 8,
  fontSize: 15,
};

const styles = StyleSheet.create({
  flex: {flex: 1},
  label: {fontSize: 15, fontWeight: '500'},
  labelRow: {flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1},
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 12,
  },
  checkboxLabel: {flex: 1},
  inputBlock: {paddingVertical: 8, paddingHorizontal: 14, gap: 6},
  input: {...inputStyle},
  inputMultiline: {minHeight: 90, textAlignVertical: 'top'},
  selectTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  error: {fontSize: 13},
  selectBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  selectSheet: {width: '100%', maxWidth: 320, borderRadius: 12, paddingVertical: 6},
  selectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
});

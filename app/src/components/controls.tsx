import React, {useEffect, useRef} from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import {useTheme} from '../theme/ThemeContext';
import {fontFamily} from '../theme/theme';
import {Icon} from './Icon';

/** iOS/macOS-style sliding switch, colored with the app's brand gold. */
export function Switch({
  value,
  onValueChange,
  accessibilityLabel,
}: {
  value: boolean;
  onValueChange: (v: boolean) => void;
  accessibilityLabel?: string;
}) {
  const {colors} = useTheme();
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: value ? 1 : 0,
      duration: 150,
      useNativeDriver: false,
    }).start();
  }, [value, anim]);

  const trackColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.switchOffBk, colors.switchOnBk],
  });
  const knobColor = value ? colors.switchOnHead : colors.switchOffHead;
  const translateX = anim.interpolate({inputRange: [0, 1], outputRange: [2, 22]});

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{checked: value}}
      accessibilityLabel={accessibilityLabel}
      onPress={() => onValueChange(!value)}
      hitSlop={8}>
      <Animated.View style={[styles.track, {backgroundColor: trackColor}]}>
        <Animated.View
          style={[
            styles.knob,
            {backgroundColor: knobColor, transform: [{translateX}]},
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}

/** Material-style checkbox. */
export function Checkbox({
  value,
  onValueChange,
  accessibilityLabel,
}: {
  value: boolean;
  onValueChange: (v: boolean) => void;
  accessibilityLabel?: string;
}) {
  const {colors} = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{checked: value}}
      accessibilityLabel={accessibilityLabel}
      onPress={() => onValueChange(!value)}
      hitSlop={8}>
      <Icon
        name={value ? 'check-box' : 'check-box-outline-blank'}
        size={24}
        color={value ? colors.button : colors.helpIcons}
      />
    </Pressable>
  );
}

export type ButtonVariant = 'default' | 'primary' | 'destructive';

export function Button({
  title,
  onPress,
  variant = 'default',
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const {colors} = useTheme();

  const bg = (pressed: boolean): string => {
    if (disabled) {
      return 'transparent';
    }
    if (variant === 'primary') {
      return pressed ? colors.buttonPrimaryActive : colors.buttonPrimary;
    }
    if (variant === 'destructive') {
      return pressed ? colors.active : 'transparent';
    }
    return pressed ? colors.buttonActive : 'transparent';
  };

  const textColor = disabled
    ? colors.buttonDisabledText
    : variant === 'primary'
      ? colors.buttonPrimaryText
      : variant === 'destructive'
        ? colors.buttonDestructiveText
        : colors.buttonText;

  const border =
    variant === 'primary'
      ? 'transparent'
      : variant === 'destructive'
        ? colors.buttonDestructive
        : colors.button;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled}
      onPress={onPress}
      style={({pressed}) => [
        styles.button,
        {
          backgroundColor: bg(pressed),
          borderColor: disabled ? colors.buttonDisabled : border,
        },
        style,
      ]}>
      <Text style={[styles.buttonText, {color: textColor, fontFamily}]}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
  },
  knob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 1.5,
    shadowOffset: {width: 0, height: 1},
  },
  button: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});

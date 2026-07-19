import React, {useState} from 'react';
import {LayoutAnimation, Platform, Pressable, StyleSheet, Text, UIManager, View} from 'react-native';
import {useTheme} from '../theme/ThemeContext';
import {fontFamily} from '../theme/theme';
import {Icon} from './Icon';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export function TitleBar({
  title,
  onBack,
  right,
}: {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
}) {
  const {colors} = useTheme();
  return (
    <View style={[styles.titleBar, {borderBottomColor: colors.line}]}>
      <View style={styles.titleSide}>
        {onBack ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} hitSlop={8}>
            <Icon name="arrow-back" size={24} color={colors.icons} />
          </Pressable>
        ) : null}
      </View>
      <Text numberOfLines={1} style={[styles.title, {color: colors.textPrimary, fontFamily}]}>
        {title}
      </Text>
      <View style={[styles.titleSide, styles.titleRight]}>{right}</View>
    </View>
  );
}

export function CollapsibleSection({
  icon,
  title,
  children,
  first,
  defaultOpen,
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
  first?: boolean;
  defaultOpen?: boolean;
}) {
  const {colors} = useTheme();
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{expanded: open}}
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setOpen(o => !o);
        }}
        style={({pressed}) => [
          styles.sectionHeader,
          {borderTopColor: colors.line, borderBottomColor: colors.line},
          !first && styles.sectionHeaderNotFirst,
          pressed && {backgroundColor: colors.hover},
        ]}>
        <Icon name={icon} size={22} color={colors.icons} />
        <Text style={[styles.sectionTitle, {color: colors.textPrimary, fontFamily}]}>{title}</Text>
        <Icon name={open ? 'expand-less' : 'expand-more'} size={22} color={colors.icons} />
      </Pressable>
      {open ? <View style={styles.sectionBody}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  titleBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  titleSide: {width: 40, justifyContent: 'center'},
  titleRight: {alignItems: 'flex-end'},
  title: {flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '600'},
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  sectionHeaderNotFirst: {},
  sectionTitle: {flex: 1, fontSize: 15, fontWeight: '600'},
  sectionBody: {paddingBottom: 6},
});

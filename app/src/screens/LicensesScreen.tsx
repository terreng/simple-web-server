import React from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {useTheme} from '../theme/ThemeContext';
import {TitleBar} from '../components/layout';
import {LICENSE_TEXT, OPEN_SOURCE_LICENSES} from '../assets/licenses';

export function LicensesScreen({onBack}: {onBack: () => void}) {
  const {colors} = useTheme();
  return (
    <View style={styles.flex}>
      <TitleBar title="Open Source Licenses" onBack={onBack} />
      <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
        <Text selectable style={[styles.text, {color: colors.textPrimary}]}>
          {LICENSE_TEXT}
          {'\n\n'}
          {OPEN_SOURCE_LICENSES}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1},
  content: {padding: 12},
  text: {fontSize: 13, fontFamily: 'Menlo', lineHeight: 18},
});

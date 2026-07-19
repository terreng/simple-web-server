import React from 'react';
import {Image, StyleSheet, Text, View} from 'react-native';
import {useTheme} from '../theme/ThemeContext';
import {fontFamily} from '../theme/theme';
import {t} from '../i18n';
import {Button} from '../components/controls';
import {SwitchRow} from '../components/form';
import type {GlobalConfig, InstallSource} from '../native/types';

export function WelcomeScreen({
  config,
  installSource,
  onChange,
  onContinue,
}: {
  config: GlobalConfig;
  installSource: InstallSource;
  onChange: (patch: Partial<GlobalConfig>) => void;
  onContinue: () => void;
}) {
  const {colors} = useTheme();
  return (
    <View style={styles.container}>
      <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />
      <Text style={[styles.appName, {color: colors.textPrimary, fontFamily}]}>
        Simple Web Server
      </Text>

      <View style={styles.options}>
        <SwitchRow
          label={t('setting_background')}
          value={!!config.background}
          onValueChange={v => onChange({background: v})}
          help={{id: 'background', type: 'setting'}}
        />
        {installSource !== 'macappstore' ? (
          <SwitchRow
            label={t('setting_updates')}
            value={config.updates === true}
            onValueChange={v => onChange({updates: v})}
            help={{id: 'updates', type: 'setting'}}
          />
        ) : null}
      </View>

      <Button title={t('get_started')} variant="primary" onPress={onContinue} style={styles.cta} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8},
  logo: {width: 80, height: 80},
  appName: {fontSize: 18, fontWeight: '600', marginBottom: 24},
  options: {alignSelf: 'stretch', maxWidth: 340, width: '100%', marginBottom: 16},
  cta: {marginTop: 8, paddingHorizontal: 32},
});

import React from 'react';
import {Image, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useTheme} from '../theme/ThemeContext';
import {fontFamily} from '../theme/theme';
import {t} from '../i18n';
import {LANGUAGES} from '../i18n';
import {Icon} from '../components/Icon';
import {TitleBar} from '../components/layout';
import {SelectRow, SwitchRow} from '../components/form';
import {Button} from '../components/controls';
import {ServerManager} from '../native/ServerManager';
import type {GlobalConfig, InstallSource, ThemeSetting} from '../native/types';

const DOCS_URL = 'https://simplewebserver.org/docs';
const ISSUES_URL = 'https://github.com/terreng/simple-web-server/issues';

function LinkRow({icon, label, onPress}: {icon: string; label: string; onPress: () => void}) {
  const {colors} = useTheme();
  return (
    <Pressable
      accessibilityRole="link"
      onPress={onPress}
      style={({pressed}) => [styles.linkRow, pressed && {backgroundColor: colors.hover}]}>
      <Icon name={icon} size={24} color={colors.icons} />
      <Text style={[styles.linkText, {color: colors.textPrimary, fontFamily}]}>{label}</Text>
    </Pressable>
  );
}

export function SettingsScreen({
  config,
  platform,
  installSource,
  version,
  updaterAvailable,
  onBack,
  onChange,
  onOpenLicenses,
}: {
  config: GlobalConfig;
  platform: 'darwin' | 'win32';
  installSource: InstallSource;
  version: string;
  updaterAvailable: boolean;
  onBack: () => void;
  onChange: (patch: Partial<GlobalConfig>, reload?: boolean) => void;
  onOpenLicenses: () => void;
}) {
  const {colors} = useTheme();

  const languageOptions = Object.entries(LANGUAGES).map(([value, label]) => ({value, label}));
  const trayLabel =
    platform === 'darwin' ? t('setting_tray_macos') : t('setting_tray_windows');

  return (
    <View style={styles.flex}>
      <TitleBar title={t('settings')} onBack={onBack} />
      <ScrollView style={styles.flex}>
        <SelectRow
          label={t('setting_language')}
          value={config.language ?? 'en'}
          options={languageOptions}
          onChange={v => onChange({language: v}, true)}
        />

        <SwitchRow
          label={t('setting_background')}
          value={!!config.background}
          onValueChange={v => onChange({background: v})}
          help={{id: 'background', type: 'setting'}}
        />

        <SwitchRow
          label={trayLabel}
          value={!!config.tray}
          onValueChange={v => onChange({tray: v})}
          help={{id: 'tray', type: 'setting'}}
        />

        {installSource !== 'macappstore' ? (
          <SwitchRow
            label={t('setting_updates')}
            value={config.updates === true}
            onValueChange={v => onChange({updates: v})}
            help={{id: 'updates', type: 'setting'}}
          />
        ) : null}

        {updaterAvailable ? (
          <View style={styles.checkUpdatesRow}>
            <Button
              title={t('check_for_updates_now')}
              onPress={() => ServerManager.checkForUpdates()}
            />
          </View>
        ) : null}

        <SelectRow
          label={t('setting_theme')}
          value={config.theme ?? 'system'}
          options={[
            {value: 'system', label: t('setting_theme_system')},
            {value: 'light', label: t('setting_theme_light')},
            {value: 'dark', label: t('setting_theme_dark')},
          ]}
          onChange={v => onChange({theme: v as ThemeSetting})}
          help={{id: 'theme', type: 'setting'}}
        />

        <View style={styles.footer}>
          <Image
            source={require('../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={[styles.appName, {color: colors.textPrimary, fontFamily}]}>
            Simple Web Server
          </Text>
          <Text style={[styles.version, {color: colors.textSecondary, fontFamily}]}>
            {t('version')} {version}  •  MIT License
          </Text>

          <View style={styles.links}>
            <LinkRow icon="public" label={t('documentation')} onPress={() => ServerManager.openExternal(DOCS_URL)} />
            <LinkRow icon="code" label={t('issues_and_suggestions')} onPress={() => ServerManager.openExternal(ISSUES_URL)} />
            <LinkRow icon="article" label="Open Source Licenses" onPress={onOpenLicenses} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1},
  checkUpdatesRow: {paddingHorizontal: 14, paddingVertical: 8, alignItems: 'flex-start'},
  footer: {alignItems: 'center', paddingVertical: 24, gap: 6},
  logo: {width: 80, height: 80},
  appName: {fontSize: 18, fontWeight: '600', marginTop: 8},
  version: {fontSize: 14, marginBottom: 16},
  links: {alignSelf: 'stretch'},
  linkRow: {flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 12, paddingHorizontal: 20},
  linkText: {fontSize: 15},
});

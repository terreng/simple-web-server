import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useTheme} from '../theme/ThemeContext';
import {fontFamily} from '../theme/theme';
import {t, format} from '../i18n';
import {ServerManager} from '../native/ServerManager';
import type {IpEntry, RunningServerState, ServerConfig} from '../native/types';
import {buildUrls, getServerStatus} from '../util/config';

/**
 * The running-URL / error panel shown on the edit screen. Ported from the
 * Electron `getServerStatusBox`, minus the removed plugin error case.
 */
export function StatusBox({
  config,
  ip,
  states,
}: {
  config: ServerConfig;
  ip: IpEntry[];
  states: RunningServerState[];
}) {
  const {colors} = useTheme();
  if (!config.enabled) {
    return null;
  }
  const status = getServerStatus(config, states);

  if (status.state === 'running') {
    const urls = buildUrls(config, ip);
    return (
      <View
        style={[
          styles.box,
          {backgroundColor: colors.statusBoxBackground, borderColor: colors.statusBoxBorder},
        ]}>
        <Text style={[styles.heading, {color: colors.textSecondary, fontFamily}]}>
          {t('web_server_url')}
        </Text>
        {urls.map(u => (
          <Pressable key={u} onPress={() => ServerManager.openExternal(u)}>
            <Text style={[styles.url, {color: colors.link, fontFamily}]}>{u}</Text>
          </Pressable>
        ))}
      </View>
    );
  }

  if (status.state === 'error') {
    const msg = status.error_message ?? '';
    let title = t('error_generic');
    let body = msg;
    if (msg.includes('EADDRINUSE')) {
      title = t('error_port_in_use');
      body = format('error_port_in_use_description', {PORT: config.port});
    } else if (msg.startsWith('FILESYSTEMERROR-')) {
      if (msg.includes('bookmarkDataIsStale')) {
        title = t('error_mas_stale_bookmarks_title');
        body = t('error_mas_stale_bookmarks_description');
      } else {
        title = t('error_file_system');
        body = msg.substring('FILESYSTEMERROR-'.length);
      }
    }
    return (
      <View
        style={[
          styles.box,
          {
            backgroundColor: colors.statusBoxErrorBackground,
            borderColor: colors.statusBoxErrorBorder,
          },
        ]}>
        <Text style={[styles.heading, {color: colors.textPrimary, fontFamily}]}>{title}</Text>
        <Text style={[styles.body, {color: colors.textPrimary, fontFamily}]}>{body}</Text>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  box: {
    marginHorizontal: 14,
    marginVertical: 8,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    gap: 6,
  },
  heading: {fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3},
  url: {fontSize: 15, paddingVertical: 3},
  body: {fontSize: 14, lineHeight: 20},
});

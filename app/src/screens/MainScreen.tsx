import React from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useTheme} from '../theme/ThemeContext';
import {fontFamily} from '../theme/theme';
import {t} from '../i18n';
import {Icon} from '../components/Icon';
import {Button} from '../components/controls';
import {TitleBar} from '../components/layout';
import {ServerManager} from '../native/ServerManager';
import type {
  GlobalConfig,
  IpEntry,
  RunningServerState,
  ServerConfig,
  UpdateInfo,
} from '../native/types';
import {getServerStatus} from '../util/config';

const STATE_COLOR = (colors: ReturnType<typeof useTheme>['colors']) =>
  ({
    stopped: colors.statusGray,
    starting: colors.statusGray,
    running: colors.statusGreen,
    error: colors.statusRed,
    unknown: colors.statusGray,
  }) as const;

function ServerRow({
  config,
  index,
  states,
  onToggle,
  onOpen,
}: {
  config: ServerConfig;
  index: number;
  states: RunningServerState[];
  onToggle: (index: number) => void;
  onOpen: (index: number) => void;
}) {
  const {colors} = useTheme();
  const status = getServerStatus(config, states);
  const stateColor = STATE_COLOR(colors)[status.state];
  const meta = [
    `${t('option_port')} ${config.port}`,
    config.ipv6 && t('option_ipv6_abbreviation'),
    config.localnetwork && t('option_localnetwork_abbreviation'),
    config.https && t('option_https_abbreviation'),
  ].filter(Boolean);

  return (
    <View style={[styles.serverRow, {borderBottomColor: colors.line}]}>
      <Pressable
        accessibilityRole="switch"
        accessibilityLabel={t('enabled_switch')}
        accessibilityState={{checked: config.enabled}}
        onPress={() => onToggle(index)}
        style={styles.rowSwitch}>
        {/* reuse the shared Switch look via the toggle glyph */}
        <View
          style={[
            styles.miniTrack,
            {backgroundColor: config.enabled ? colors.switchOnBk : colors.switchOffBk},
          ]}>
          <View
            style={[
              styles.miniKnob,
              {
                backgroundColor: config.enabled ? colors.switchOnHead : colors.switchOffHead,
                alignSelf: config.enabled ? 'flex-end' : 'flex-start',
              },
            ]}
          />
        </View>
      </Pressable>
      <Pressable style={styles.rowBody} onPress={() => onOpen(index)}>
        <Text numberOfLines={1} style={[styles.rowPath, {color: colors.textPrimary, fontFamily}]}>
          {config.path || t('choose_folder')}
        </Text>
        <Text numberOfLines={1} style={[styles.rowMeta, {color: colors.textSecondary, fontFamily}]}>
          <Text style={{color: stateColor}}>{t(`state_${status.state}`)}</Text>
          {meta.length ? `  •  ${meta.join('  •  ')}` : ''}
        </Text>
      </Pressable>
    </View>
  );
}

export function MainScreen({
  config,
  states,
  update,
  onOpenSettings,
  onAddServer,
  onEditServer,
  onToggleServer,
}: {
  config: GlobalConfig;
  ip: IpEntry[];
  states: RunningServerState[];
  update: UpdateInfo | null;
  onOpenSettings: () => void;
  onAddServer: () => void;
  onEditServer: (index: number) => void;
  onToggleServer: (index: number) => void;
}) {
  const {colors} = useTheme();
  const servers = config.servers ?? [];

  return (
    <View style={styles.flex}>
      <TitleBar
        title="Simple Web Server"
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('settings')}
            onPress={onOpenSettings}
            hitSlop={8}>
            <Icon name="settings" size={24} color={colors.icons} />
          </Pressable>
        }
      />

      {update && !update.ignored ? (
        <Pressable
          onPress={() => ServerManager.openExternal(update.url)}
          style={[
            styles.banner,
            {
              backgroundColor: update.attributes.includes('high_priority')
                ? colors.updateBannerHigh
                : colors.updateBanner,
            },
          ]}>
          <Text style={[styles.bannerText, {color: colors.textPrimary, fontFamily}]}>
            {update.text || t('update_available')}
          </Text>
        </Pressable>
      ) : null}

      {servers.length === 0 ? (
        <View style={styles.empty}>
          <Icon name="dns" size={70} color={colors.textSecondary} />
          <Text style={[styles.emptyText, {color: colors.textSecondary, fontFamily}]}>
            {t('no_servers')}
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.flex}>
          {servers.map((s, i) => (
            <ServerRow
              key={i}
              config={s}
              index={i}
              states={states}
              onToggle={onToggleServer}
              onOpen={onEditServer}
            />
          ))}
        </ScrollView>
      )}

      <View style={[styles.actions, {borderTopColor: colors.line}]}>
        {config.background ? (
          <Button title={t('stop_and_quit')} onPress={() => ServerManager.quit()} />
        ) : (
          <View />
        )}
        <Button title={t('new_server')} variant="primary" onPress={onAddServer} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1},
  banner: {paddingVertical: 10, paddingHorizontal: 14},
  bannerText: {fontSize: 14, fontWeight: '500'},
  empty: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16},
  emptyText: {fontSize: 17},
  serverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    height: 72,
  },
  rowSwitch: {justifyContent: 'center'},
  miniTrack: {width: 40, height: 22, borderRadius: 11, justifyContent: 'center', padding: 2},
  miniKnob: {width: 18, height: 18, borderRadius: 9},
  rowBody: {flex: 1, gap: 3},
  rowPath: {fontSize: 15, fontWeight: '500'},
  rowMeta: {fontSize: 13},
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});

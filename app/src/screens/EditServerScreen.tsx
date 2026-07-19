import React, {useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useTheme} from '../theme/ThemeContext';
import {fontFamily} from '../theme/theme';
import {t} from '../i18n';
import {Icon} from '../components/Icon';
import {Button, Switch} from '../components/controls';
import {TitleBar, CollapsibleSection} from '../components/layout';
import {
  CheckboxRow,
  HelpButton,
  InputError,
  InputRow,
  Label,
} from '../components/form';
import {StatusBox} from '../components/StatusBox';
import {usePrompt} from '../components/Prompt';
import {ServerManager} from '../native/ServerManager';
import type {
  GlobalConfig,
  IpEntry,
  RunningServerState,
  ServerConfig,
} from '../native/types';
import {
  defaultServerConfig,
  getServerStatus,
  httpAuthPasswordValid,
  httpAuthUsernameValid,
  isAutoCert,
  portUnique,
  portValid,
  suggestPort,
} from '../util/config';

export function EditServerScreen({
  config,
  editIndex,
  ip,
  states,
  onCancel,
  onSave,
  onToggleEnabled,
  onDelete,
}: {
  config: GlobalConfig;
  editIndex: number | null;
  ip: IpEntry[];
  states: RunningServerState[];
  onCancel: () => void;
  onSave: (server: ServerConfig, editIndex: number | null) => void;
  onToggleEnabled: (index: number) => void;
  onDelete: (index: number) => void;
}) {
  const {colors} = useTheme();
  const {show, hide} = usePrompt();

  const existing = editIndex !== null ? config.servers?.[editIndex] : undefined;

  const [draft, setDraft] = useState<ServerConfig>(() => ({
    ...defaultServerConfig(suggestPort(config)),
    ...existing,
  }));
  const [customCert, setCustomCert] = useState<boolean>(() =>
    existing ? !isAutoCert(existing.httpsCert) : false,
  );
  const [showErrors, setShowErrors] = useState(false);

  const set = <K extends keyof ServerConfig>(key: K, value: ServerConfig[K]) =>
    setDraft(d => ({...d, [key]: value}));

  const portNum = Math.floor(Number(draft.port));
  const portIsValid = portValid(portNum);
  const portIsUnique = portUnique(portNum, config, editIndex);
  const usernameValid = httpAuthUsernameValid(draft.httpAuthUsername);
  const passwordValid = httpAuthPasswordValid(draft.httpAuthPassword);

  const status = existing ? getServerStatus(existing, states) : null;

  const chooseFolder = async () => {
    const chosen = await ServerManager.showFolderPicker(draft.path || null);
    if (chosen) {
      set('path', chosen);
    }
  };

  const onHttpsToggle = async (v: boolean) => {
    set('https', v);
    if (v && !customCert) {
      try {
        const crypto = await ServerManager.generateCrypto();
        setDraft(d => ({...d, https: true, httpsCert: crypto.cert, httpsKey: crypto.privateKey}));
      } catch {
        /* leave cert empty; native will generate a temp one at start */
      }
    }
  };

  const onCustomCertToggle = (v: boolean) => {
    setCustomCert(v);
    if (v) {
      set('httpsCert', '');
      set('httpsKey', '');
    } else if (draft.https) {
      onHttpsToggle(true);
    }
  };

  const submit = () => {
    setShowErrors(true);
    if (!draft.path || !portIsValid || !usernameValid || !passwordValid) {
      return;
    }
    onSave({...draft, port: portNum, enabled: existing ? existing.enabled : true}, editIndex);
  };

  const confirmDelete = () => {
    if (editIndex === null) {
      return;
    }
    show({
      title: t('delete_server_confirm'),
      body: t('delete_server_confirm_description'),
      buttons: [
        {
          label: t('prompt_confirm'),
          variant: 'destructive',
          onPress: () => {
            hide();
            onDelete(editIndex);
          },
        },
        {label: t('cancel'), onPress: hide},
      ],
    });
  };

  const title = editIndex !== null ? t('edit_server') : t('add_server');

  return (
    <View style={styles.flex}>
      <TitleBar title={title} onBack={onCancel} />
      <ScrollView style={styles.flex} keyboardShouldPersistTaps="handled">
        {existing ? (
          <View style={styles.enabledRow}>
            <Switch
              value={existing.enabled}
              onValueChange={() => onToggleEnabled(editIndex as number)}
              accessibilityLabel={t('enabled_switch')}
            />
            <Text
              style={[
                styles.enabledLabel,
                {
                  color:
                    status?.state === 'running'
                      ? colors.statusGreen
                      : status?.state === 'error'
                        ? colors.statusRed
                        : colors.textPrimary,
                  fontFamily,
                },
              ]}>
              {t(`state_${status?.state ?? 'stopped'}`)}
            </Text>
          </View>
        ) : null}

        {existing ? <StatusBox config={existing} ip={ip} states={states} /> : null}

        {/* Folder path */}
        <View style={styles.block}>
          <View style={styles.labelRow}>
            <Label>{t('option_path')}</Label>
            <HelpButton id="path" type="option" />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={draft.path || t('choose_folder')}
            onPress={chooseFolder}
            style={[styles.picker, {borderColor: colors.line, backgroundColor: colors.inputBackground}]}>
            <Text
              numberOfLines={1}
              style={{
                flex: 1,
                color: draft.path ? colors.textPrimary : colors.textSecondary,
                fontFamily,
              }}>
              {draft.path || t('choose_folder')}
            </Text>
            <Icon name="folder-open" size={22} color={colors.icons} />
          </Pressable>
          {showErrors && !draft.path ? <InputError message={t('path_missing')} /> : null}
        </View>

        {/* Port */}
        <InputRow
          label={t('option_port')}
          value={String(draft.port)}
          onChangeText={v => set('port', Number(v.replace(/[^0-9]/g, '')) || 0)}
          placeholder="8080"
          keyboardType="numeric"
          help={{id: 'port', type: 'option'}}
          width={120}
          error={
            showErrors && !portIsValid
              ? t('port_invalid')
              : !portIsUnique
                ? t('port_in_use')
                : null
          }
        />

        <CheckboxRow
          label={t('option_localnetwork')}
          value={draft.localnetwork}
          onValueChange={v => set('localnetwork', v)}
          help={{id: 'localnetwork', type: 'option'}}
        />

        <CollapsibleSection icon="tune" title={t('section_basic_rules')} first defaultOpen>
          <CheckboxRow label={t('option_showIndex')} value={draft.showIndex} onValueChange={v => set('showIndex', v)} help={{id: 'showIndex', type: 'option'}} />
          <CheckboxRow label={t('option_spa')} value={draft.spa} onValueChange={v => set('spa', v)} help={{id: 'spa', type: 'option'}} />
          <InputRow label={t('option_rewriteTo')} value={draft.rewriteTo} onChangeText={v => set('rewriteTo', v)} placeholder="/index.html" help={{id: 'rewriteTo', type: 'option'}} />
          <CheckboxRow label={t('option_directoryListing')} value={draft.directoryListing} onValueChange={v => set('directoryListing', v)} help={{id: 'directoryListing', type: 'option'}} />
          <CheckboxRow label={t('option_excludeDotHtml')} value={draft.excludeDotHtml} onValueChange={v => set('excludeDotHtml', v)} help={{id: 'excludeDotHtml', type: 'option'}} />
        </CollapsibleSection>

        <CollapsibleSection icon="rule" title={t('section_advanced_rules')}>
          <CheckboxRow label={t('option_ipv6')} value={draft.ipv6} onValueChange={v => set('ipv6', v)} help={{id: 'ipv6', type: 'option'}} />
          <CheckboxRow label={t('option_cors')} value={draft.cors} onValueChange={v => set('cors', v)} help={{id: 'cors', type: 'option'}} />
          <CheckboxRow label={t('option_hiddenDotFiles')} value={draft.hiddenDotFiles} onValueChange={v => set('hiddenDotFiles', v)} help={{id: 'hiddenDotFiles', type: 'option'}} />
          <CheckboxRow label={t('option_upload')} value={draft.upload} onValueChange={v => set('upload', v)} help={{id: 'upload', type: 'option'}} />
          <CheckboxRow label={t('option_replace')} value={draft.replace} onValueChange={v => set('replace', v)} help={{id: 'replace', type: 'option'}} />
          <CheckboxRow label={t('option_delete')} value={draft.delete} onValueChange={v => set('delete', v)} help={{id: 'delete', type: 'option'}} />
          <CheckboxRow label={t('option_hiddenDotFilesDirectoryListing')} value={draft.hiddenDotFilesDirectoryListing} onValueChange={v => set('hiddenDotFilesDirectoryListing', v)} help={{id: 'hiddenDotFilesDirectoryListing', type: 'option'}} />
        </CollapsibleSection>

        <CollapsibleSection icon="security" title={t('section_security')}>
          <CheckboxRow label={t('option_https')} value={draft.https} onValueChange={onHttpsToggle} help={{id: 'https', type: 'option'}} />
          {draft.https ? (
            <CheckboxRow label={t('option_https_custom_cert')} value={customCert} onValueChange={onCustomCertToggle} />
          ) : null}
          {draft.https && customCert ? (
            <>
              <InputRow label={t('option_httpsCert')} value={draft.httpsCert} onChangeText={v => set('httpsCert', v)} multiline help={{id: 'httpsCert', type: 'option'}} />
              <InputRow label={t('option_httpsKey')} value={draft.httpsKey} onChangeText={v => set('httpsKey', v)} multiline help={{id: 'httpsKey', type: 'option'}} />
            </>
          ) : null}
          <CheckboxRow label={t('option_httpAuth')} value={draft.httpAuth} onValueChange={v => set('httpAuth', v)} help={{id: 'httpAuth', type: 'option'}} />
          <InputRow
            label={t('option_httpAuthUsername')}
            value={draft.httpAuthUsername}
            onChangeText={v => set('httpAuthUsername', v)}
            help={{id: 'httpAuthUsername', type: 'option'}}
            error={showErrors && !usernameValid ? t('httpAuthUsername_invalid') : null}
          />
          <InputRow
            label={t('option_httpAuthPassword')}
            value={draft.httpAuthPassword}
            onChangeText={v => set('httpAuthPassword', v)}
            help={{id: 'httpAuthPassword', type: 'option'}}
            error={showErrors && !passwordValid ? t('httpAuthPassword_invalid') : null}
          />
        </CollapsibleSection>

        <CollapsibleSection icon="error-outline" title={t('section_error_pages')}>
          <InputRow label={t('option_custom404')} value={draft.custom404} onChangeText={v => set('custom404', v)} placeholder="/404.html" help={{id: 'custom404', type: 'option'}} />
          <InputRow label={t('option_custom403')} value={draft.custom403} onChangeText={v => set('custom403', v)} placeholder="/403.html" help={{id: 'custom403', type: 'option'}} />
          <InputRow label={t('option_custom401')} value={draft.custom401} onChangeText={v => set('custom401', v)} placeholder="/401.html" help={{id: 'custom401', type: 'option'}} />
          <InputRow label={t('option_custom500')} value={draft.custom500} onChangeText={v => set('custom500', v)} placeholder="/500.html" help={{id: 'custom500', type: 'option'}} />
        </CollapsibleSection>

        {editIndex !== null ? (
          <View style={styles.deleteWrap}>
            <Button title={t('delete_server')} variant="destructive" onPress={confirmDelete} />
          </View>
        ) : null}
        <View style={{height: 20}} />
      </ScrollView>

      <View style={[styles.actions, {borderTopColor: colors.line}]}>
        <Button title={t('cancel')} onPress={onCancel} />
        <Button
          title={editIndex !== null ? t('save_changes') : t('create_server')}
          variant="primary"
          onPress={submit}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1},
  enabledRow: {flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14},
  enabledLabel: {fontSize: 15, fontWeight: '600'},
  block: {paddingVertical: 8, paddingHorizontal: 14, gap: 6},
  labelRow: {flexDirection: 'row', alignItems: 'center', gap: 6},
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 8,
  },
  deleteWrap: {padding: 14},
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});

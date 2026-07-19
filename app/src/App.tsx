import React, {useCallback, useContext, useEffect, useRef, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {ThemeProvider, useTheme} from './theme/ThemeContext';
import {PromptProvider} from './components/Prompt';
import {setLanguage, resolveLanguage} from './i18n';
import {ServerManager} from './native/ServerManager';
import type {
  GlobalConfig,
  InitialState,
  IpEntry,
  RunningServerState,
  ServerConfig,
  UpdateInfo,
} from './native/types';
import {MainScreen} from './screens/MainScreen';
import {EditServerScreen} from './screens/EditServerScreen';
import {SettingsScreen} from './screens/SettingsScreen';
import {WelcomeScreen} from './screens/WelcomeScreen';
import {LicensesScreen} from './screens/LicensesScreen';

type Screen = 'loading' | 'welcome' | 'main' | 'edit' | 'settings' | 'licenses';

function Root() {
  const {colors} = useTheme();
  const [init, setInit] = useState<InitialState | null>(null);
  const [config, setConfig] = useState<GlobalConfig>({});
  const [ip, setIp] = useState<IpEntry[]>([]);
  const [states, setStates] = useState<RunningServerState[]>([]);
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [screen, setScreen] = useState<Screen>('loading');
  const [editIndex, setEditIndex] = useState<number | null>(null);
  // Bumped whenever the active language changes so `t()` re-reads take effect.
  const [, setLangVersion] = useState(0);

  // Keep a ref to the freshest config for event handlers / async callbacks.
  const configRef = useRef(config);
  configRef.current = config;

  // Push the user's Appearance choice up to the ThemeProvider.
  const {setThemeSetting} = useContext(ThemeSettingContext);
  useEffect(() => {
    setThemeSetting(config.theme ?? 'system');
  }, [config.theme, setThemeSetting]);

  const applyLanguage = useCallback((cfg: GlobalConfig) => {
    const resolved = setLanguage(cfg.language ?? resolveLanguage(undefined));
    setLangVersion(v => v + 1);
    return resolved;
  }, []);

  useEffect(() => {
    let mounted = true;
    ServerManager.getInitialState()
      .then(state => {
        if (!mounted) {
          return;
        }
        setInit(state);
        setIp(state.ip);
        applyLanguage(state.config);
        setConfig(state.config);
        // First-run detection matches Electron: both flags present => not first run.
        const firstRun =
          state.config.background == null || state.config.updates == null;
        if (firstRun) {
          const seeded: GlobalConfig = {
            ...state.config,
            background: false,
            updates: true,
            theme: 'system',
          };
          setConfig(seeded);
          ServerManager.saveConfig(seeded, false);
          setScreen('welcome');
        } else {
          setScreen('main');
        }
      })
      .catch(() => setScreen('main'));

    const subs = [
      ServerManager.on('serverStates', setStates),
      ServerManager.on('ipChange', setIp),
      ServerManager.on('update', setUpdate),
      ServerManager.on('configReload', cfg => {
        applyLanguage(cfg);
        setConfig(cfg);
      }),
    ];
    ServerManager.getServerStates().then(setStates).catch(() => {});

    return () => {
      mounted = false;
      subs.forEach(off => off());
    };
  }, [applyLanguage]);

  const persist = useCallback(
    (next: GlobalConfig, reload = false) => {
      setConfig(next);
      ServerManager.saveConfig(next, reload);
    },
    [],
  );

  const patchConfig = useCallback(
    (patch: Partial<GlobalConfig>, reload = false) => {
      const next = {...configRef.current, ...patch};
      if (patch.language) {
        applyLanguage(next);
      }
      persist(next, reload);
    },
    [applyLanguage, persist],
  );

  const toggleServer = useCallback(
    (index: number) => {
      const servers = [...(configRef.current.servers ?? [])];
      const target = servers[index];
      if (!target) {
        return;
      }
      servers[index] = {...target, enabled: !target.enabled};
      persist({...configRef.current, servers});
    },
    [persist],
  );

  const saveServer = useCallback(
    (server: ServerConfig, idx: number | null) => {
      const servers = [...(configRef.current.servers ?? [])];
      if (idx !== null) {
        servers[idx] = server;
      } else {
        servers.push(server);
      }
      persist({...configRef.current, servers});
      setScreen('main');
    },
    [persist],
  );

  const deleteServer = useCallback(
    (idx: number) => {
      const servers = [...(configRef.current.servers ?? [])];
      servers.splice(idx, 1);
      persist({...configRef.current, servers});
      setScreen('main');
    },
    [persist],
  );

  const body = () => {
    switch (screen) {
      case 'welcome':
        return (
          <WelcomeScreen
            config={config}
            installSource={init?.installSource ?? 'website'}
            onChange={patch => patchConfig(patch)}
            onContinue={() => setScreen('main')}
          />
        );
      case 'edit':
        return (
          <EditServerScreen
            config={config}
            editIndex={editIndex}
            ip={ip}
            states={states}
            onCancel={() => setScreen('main')}
            onSave={saveServer}
            onToggleEnabled={toggleServer}
            onDelete={deleteServer}
          />
        );
      case 'settings':
        return (
          <SettingsScreen
            config={config}
            platform={init?.platform ?? 'win32'}
            installSource={init?.installSource ?? 'website'}
            version={init?.version ?? ''}
            onBack={() => setScreen('main')}
            onChange={patchConfig}
            onOpenLicenses={() => setScreen('licenses')}
          />
        );
      case 'licenses':
        return <LicensesScreen onBack={() => setScreen('settings')} />;
      case 'main':
        return (
          <MainScreen
            config={config}
            ip={ip}
            states={states}
            update={update}
            onOpenSettings={() => setScreen('settings')}
            onAddServer={() => {
              setEditIndex(null);
              setScreen('edit');
            }}
            onEditServer={idx => {
              setEditIndex(idx);
              setScreen('edit');
            }}
            onToggleServer={toggleServer}
          />
        );
      default:
        return <View />;
    }
  };

  return (
    <View style={[styles.root, {backgroundColor: colors.background}]}>{body()}</View>
  );
}

export default function App() {
  const [themeSetting, setThemeSetting] = useState<GlobalConfig['theme']>('system');

  // The theme must live above Root so the whole tree (incl. prompts) re-themes.
  // Root reports the current setting up through a light context shim.
  return (
    <ThemeSettingContext.Provider value={{themeSetting: themeSetting ?? 'system', setThemeSetting}}>
      <ThemeProvider setting={themeSetting ?? 'system'}>
        <PromptProvider>
          <Root />
        </PromptProvider>
      </ThemeProvider>
    </ThemeSettingContext.Provider>
  );
}

// Lets Root push the user's Appearance choice up to the ThemeProvider.
export const ThemeSettingContext = React.createContext<{
  themeSetting: NonNullable<GlobalConfig['theme']>;
  setThemeSetting: (t: NonNullable<GlobalConfig['theme']>) => void;
}>({themeSetting: 'system', setThemeSetting: () => {}});

const styles = StyleSheet.create({
  root: {flex: 1},
});

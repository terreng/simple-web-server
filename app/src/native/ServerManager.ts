/**
 * Typed wrapper around the native `ServerManager` module.
 *
 * This is the single choke point between the React UI and the native host
 * (macOS ObjC++ / Windows C++). It mirrors, almost 1:1, the Electron preload
 * API (`window.api.*`) plus the `ipcRenderer.on('message', ...)` events — so the
 * UI logic ported from the old renderer stays recognizable.
 *
 * Design notes:
 * - The native module OWNS config.json and the set of running servers. The UI
 *   never starts/stops servers directly; it calls `saveConfig` and the native
 *   side reconciles running servers against the new config, exactly like the
 *   Electron main process did in `startServers()`.
 * - State flows back through events (`serverStates`, `ipChange`, `configReload`,
 *   `update`), never by polling.
 */
import {NativeEventEmitter, NativeModules} from 'react-native';
import type {
  CryptoResult,
  GlobalConfig,
  InitialState,
  IpEntry,
  RunningServerState,
  UpdateInfo,
} from './types';

interface ServerManagerNative {
  /** Snapshot for first render (config, ip, platform, version, i18n, ...). */
  getInitialState(): Promise<InitialState>;
  /** Persist config.json and reconcile running servers to match. */
  saveConfig(config: GlobalConfig, reload: boolean): void;
  /** Current running-server states (also pushed via the `serverStates` event). */
  getServerStates(): Promise<RunningServerState[]>;
  /** Generate a self-signed cert + key (PEM). */
  generateCrypto(): Promise<CryptoResult>;
  /**
   * Open the native folder picker. Returns the chosen absolute path, or null if
   * cancelled. On the Mac App Store build this also stores a security-scoped
   * bookmark for the chosen folder so the server can read it later.
   */
  showFolderPicker(currentPath: string | null): Promise<string | null>;
  /** Open a URL in the user's default browser. */
  openExternal(url: string): void;
  /** Show the native "check for updates" UI (Sparkle / WinSparkle). */
  checkForUpdates(): void;
  /** Fully quit the app (used by "Stop & Quit"). */
  quit(): void;
}

const native = NativeModules.ServerManager as ServerManagerNative | undefined;

if (!native) {
  // Helpful during bring-up on a platform where the module isn't registered yet.
  // eslint-disable-next-line no-console
  console.warn(
    'Native module "ServerManager" is not available. ' +
      'Did you register it in the windows/ or macos/ app project?',
  );
}

const emitter = native ? new NativeEventEmitter(NativeModules.ServerManager) : null;

export type ServerManagerEvents = {
  serverStates: (states: RunningServerState[]) => void;
  ipChange: (ip: IpEntry[]) => void;
  configReload: (config: GlobalConfig) => void;
  update: (info: UpdateInfo) => void;
};

function on<E extends keyof ServerManagerEvents>(
  event: E,
  listener: ServerManagerEvents[E],
): () => void {
  if (!emitter) {
    return () => {};
  }
  const sub = emitter.addListener(event, listener as (...args: unknown[]) => void);
  return () => sub.remove();
}

export const ServerManager = {
  getInitialState: (): Promise<InitialState> =>
    native
      ? native.getInitialState()
      : Promise.reject(new Error('ServerManager native module missing')),

  saveConfig: (config: GlobalConfig, reload = false): void =>
    native?.saveConfig(config, reload),

  getServerStates: (): Promise<RunningServerState[]> =>
    native ? native.getServerStates() : Promise.resolve([]),

  generateCrypto: (): Promise<CryptoResult> =>
    native
      ? native.generateCrypto()
      : Promise.reject(new Error('ServerManager native module missing')),

  showFolderPicker: (currentPath: string | null): Promise<string | null> =>
    native ? native.showFolderPicker(currentPath) : Promise.resolve(null),

  openExternal: (url: string): void => native?.openExternal(url),

  checkForUpdates: (): void => native?.checkForUpdates(),

  quit: (): void => native?.quit(),

  on,
};

export type {InitialState, RunningServerState, GlobalConfig, IpEntry, UpdateInfo};

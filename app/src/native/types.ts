/**
 * Shared types for the app <-> native bridge.
 *
 * The per-server config keys intentionally match the Electron version's
 * config.json so existing config files migrate 1:1 — EXCEPT for the options that
 * were removed in the Rust rewrite (htaccess, plugins, ipThrottling,
 * customErrorReplaceString, staticDirectoryListing, precompression,
 * cacheControl) and the newly added `custom500`.
 *
 * The native side maps these camelCase keys onto the Rust `SwsSettings` struct
 * (see docs/OPTIONS.md for the full mapping table).
 */

export type ServerRunState =
  | 'stopped'
  | 'starting'
  | 'running'
  | 'error'
  | 'unknown';

export interface ServerConfig {
  /** Whether this server should be running. */
  enabled: boolean;
  /** Absolute path to the folder to serve. */
  path: string;
  port: number;
  localnetwork: boolean;

  // Basic rules
  showIndex: boolean; // -> Rust `index`
  spa: boolean;
  rewriteTo: string; // -> `rewrite_to`
  directoryListing: boolean; // -> `directory_listing`
  excludeDotHtml: boolean; // -> `exclude_dot_html`

  // Advanced rules
  ipv6: boolean;
  hiddenDotFiles: boolean; // -> `hidden_dot_files`
  cors: boolean;
  upload: boolean;
  replace: boolean;
  delete: boolean;
  hiddenDotFilesDirectoryListing: boolean; // -> `hidden_dot_files_directory_listing`

  // Error pages
  custom404: string;
  custom403: string;
  custom401: string;
  custom500: string; // NEW in the Rust core

  // Security
  https: boolean;
  httpsCert: string; // -> `https_cert`
  httpsKey: string; // -> `https_key`
  httpAuth: boolean; // -> `http_auth`
  httpAuthUsername: string; // -> `http_auth_username`
  httpAuthPassword: string; // -> `http_auth_password`
}

export type ThemeSetting = 'system' | 'light' | 'dark';

export interface GlobalConfig {
  servers?: ServerConfig[];
  /** Keep running with no window / no dock/taskbar icon. */
  background?: boolean;
  /** Check for updates (always off / hidden on the Mac App Store). */
  updates?: boolean;
  /** Show a menu-bar (macOS) / system-tray (Windows) icon. */
  tray?: boolean;
  theme?: ThemeSetting;
  language?: string;
  ignore_update?: string;
}

export interface RunningServerState {
  config: ServerConfig;
  state: ServerRunState;
  error_message?: string;
}

/** [address, family, isOnLan] — mirrors the Electron `getIPs()` shape. */
export type IpEntry = [string, 'ipv4' | 'ipv6', boolean];

export type InstallSource = 'macappstore' | 'microsoftstore' | 'website';

export interface UpdateInfo {
  url: string;
  text: string;
  attributes: string[];
  version: string;
  ignored: boolean;
}

/** Everything the UI needs on first render. */
export interface InitialState {
  config: GlobalConfig;
  ip: IpEntry[];
  installSource: InstallSource;
  platform: 'darwin' | 'win32';
  version: string;
  /** Whether a self-updater is active (false on MAS / Microsoft Store). */
  updaterAvailable?: boolean;
  /**
   * Optional. i18n is resolved in JS from bundled locale files, so the native
   * side does not need to provide language data. Included only if the native
   * host wants to hint the OS locale(s).
   */
  systemLocales?: string[];
}

export interface CryptoResult {
  cert: string;
  privateKey: string;
}

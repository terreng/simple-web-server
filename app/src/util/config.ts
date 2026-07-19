import type {
  GlobalConfig,
  IpEntry,
  RunningServerState,
  ServerConfig,
  ServerRunState,
} from '../native/types';

/** Defaults for a brand-new server (ported from the Electron `addServer()`). */
export function defaultServerConfig(port: number): ServerConfig {
  return {
    enabled: true,
    path: '',
    port,
    localnetwork: false,
    showIndex: true,
    spa: false,
    rewriteTo: '/index.html',
    directoryListing: true,
    excludeDotHtml: false,
    ipv6: false,
    hiddenDotFiles: false,
    cors: false,
    upload: false,
    replace: false,
    delete: false,
    hiddenDotFilesDirectoryListing: true,
    custom404: '',
    custom403: '',
    custom401: '',
    custom500: '',
    https: false,
    httpsCert: '',
    httpsKey: '',
    httpAuth: false,
    httpAuthUsername: '',
    httpAuthPassword: '',
  };
}

/**
 * Backwards compatibility: normalize a server object loaded from an existing
 * config.json (possibly written by the old Electron app) into the canonical v2
 * shape.
 *
 * Why this matters: the app matches running-server states to config entries by
 * full-config equality (same rule Electron used). The native side reports
 * servers in the clean v2 shape, so if the UI held an old-shape object (with
 * removed keys like `htaccess`, `ipThrottling`, `cacheControl`, `plugins`, …)
 * the two would never compare equal and every server would show "unknown".
 * Normalizing on load — and persisting once — keeps both sides in sync and
 * quietly upgrades the file. Retained keys keep their values; removed keys are
 * dropped; new keys (e.g. `custom500`) get defaults.
 */
export function migrateServer(raw: unknown): ServerConfig {
  const r = (raw ?? {}) as Record<string, unknown>;
  const base = defaultServerConfig(
    typeof r.port === 'number' ? r.port : 8080,
  );
  const str = (k: string, d: string): string =>
    typeof r[k] === 'string' ? (r[k] as string) : d;
  const bool = (k: string, d: boolean): boolean =>
    typeof r[k] === 'boolean' ? (r[k] as boolean) : d;

  return {
    enabled: bool('enabled', base.enabled),
    path: str('path', base.path),
    port: typeof r.port === 'number' ? r.port : base.port,
    localnetwork: bool('localnetwork', base.localnetwork),
    showIndex: bool('showIndex', base.showIndex),
    spa: bool('spa', base.spa),
    rewriteTo: str('rewriteTo', base.rewriteTo),
    directoryListing: bool('directoryListing', base.directoryListing),
    excludeDotHtml: bool('excludeDotHtml', base.excludeDotHtml),
    ipv6: bool('ipv6', base.ipv6),
    hiddenDotFiles: bool('hiddenDotFiles', base.hiddenDotFiles),
    cors: bool('cors', base.cors),
    upload: bool('upload', base.upload),
    replace: bool('replace', base.replace),
    delete: bool('delete', base.delete),
    hiddenDotFilesDirectoryListing: bool(
      'hiddenDotFilesDirectoryListing',
      base.hiddenDotFilesDirectoryListing,
    ),
    custom404: str('custom404', base.custom404),
    custom403: str('custom403', base.custom403),
    custom401: str('custom401', base.custom401),
    custom500: str('custom500', base.custom500),
    https: bool('https', base.https),
    httpsCert: str('httpsCert', base.httpsCert),
    httpsKey: str('httpsKey', base.httpsKey),
    httpAuth: bool('httpAuth', base.httpAuth),
    httpAuthUsername: str('httpAuthUsername', base.httpAuthUsername),
    httpAuthPassword: str('httpAuthPassword', base.httpAuthPassword),
  };
}

/**
 * Normalize a whole config. Global keys are preserved; the servers array is
 * migrated to the canonical shape. Returns whether anything changed so the
 * caller can persist the upgrade exactly once.
 */
export function migrateConfig(config: GlobalConfig): {
  config: GlobalConfig;
  changed: boolean;
} {
  const servers = (config.servers ?? []).map(migrateServer);
  const changed = JSON.stringify(config.servers ?? []) !== JSON.stringify(servers);
  return {config: {...config, servers}, changed};
}

/** First free port starting at 8080 (matches Electron behavior). */
export function suggestPort(config: GlobalConfig): number {
  const used = (config.servers ?? []).map(s => s.port);
  let port = 8080;
  while (used.includes(port) && port < 9000) {
    port++;
  }
  return port;
}

/**
 * Deep-equality on the JSON shape — this is exactly how both the Electron main
 * and renderer decided whether a running server matches a config entry, so the
 * native side reconciles servers the same way.
 */
export function configsEqual(a: object, b: object): boolean {
  return JSON.stringify(a) === JSON.stringify(b) || deepEqualUnordered(a, b);
}

function deepEqualUnordered(a: object, b: object): boolean {
  const ka = Object.keys(a).sort();
  const kb = Object.keys(b).sort();
  if (JSON.stringify(ka) !== JSON.stringify(kb)) {
    return false;
  }
  for (const k of ka) {
    if (
      JSON.stringify((a as Record<string, unknown>)[k]) !==
      JSON.stringify((b as Record<string, unknown>)[k])
    ) {
      return false;
    }
  }
  return true;
}

export function getServerStatus(
  local: ServerConfig,
  states: RunningServerState[],
): {state: ServerRunState; error_message?: string} {
  if (!local.enabled) {
    return {state: 'stopped'};
  }
  for (const s of states) {
    if (configsEqual(s.config, local)) {
      return {state: s.state, error_message: s.error_message};
    }
  }
  return {state: 'unknown'};
}

/**
 * Build the list of reachable URLs for a running server, ported from the
 * Electron `getServerStatusBox` logic.
 */
export function buildUrls(local: ServerConfig, ip: IpEntry[]): string[] {
  const urls: string[] = [];
  for (const [addr, family, isLan] of ip) {
    const include =
      (family === 'ipv4' && isLan === false) ||
      (family === 'ipv6' && local.ipv6 === true && isLan === false) ||
      (local.localnetwork &&
        (family === 'ipv4' || (family === 'ipv6' && local.ipv6 === true)));
    if (include) {
      const host = family === 'ipv6' ? `[${addr}]` : addr;
      urls.push(`${local.https ? 'https' : 'http'}://${host}:${local.port}`);
    }
  }
  return urls;
}

// ---- Validation (ported from main.js) ----

export function portValid(port: number): boolean {
  return Number.isFinite(port) && port >= 1 && port <= 65535;
}

export function portUnique(
  port: number,
  config: GlobalConfig,
  editIndex: number | null,
): boolean {
  const ports = (config.servers ?? []).map(s => s.port);
  const count = ports.filter(p => p === port).length;
  return (
    !ports.includes(port) ||
    (editIndex !== null && ports[editIndex] === port && count === 1)
  );
}

const CONTROL_CHARS = /[\x00-\x1F\x7F]/;

export function httpAuthUsernameValid(v: string): boolean {
  return !v.includes(':') && !CONTROL_CHARS.test(v);
}

export function httpAuthPasswordValid(v: string): boolean {
  return !CONTROL_CHARS.test(v);
}

/** True if a cert was generated by us (auto), false if user-supplied. */
export function isAutoCert(cert: string): boolean {
  if (!cert) {
    return true;
  }
  try {
    const base64 = cert
      .replace(/-----BEGIN CERTIFICATE-----/g, '')
      .replace(/-----END CERTIFICATE-----/g, '')
      .replace(/\s/g, '');
    // React Native provides global.atob in modern versions.
    const bin =
      typeof atob === 'function' ? atob(base64) : Buffer.from(base64, 'base64').toString('binary');
    return bin.includes('Simple Web Server');
  } catch {
    return false;
  }
}

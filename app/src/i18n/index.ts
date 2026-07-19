/**
 * Bundled i18n. All locale JSONs ship with the app (Metro bundles JSON), and any
 * missing key falls back to English — mirroring the Electron `getLang()` merge.
 *
 * Language codes here are the locale file names (`en`, `fr`, `zh`, `zh-Hant`, …),
 * which is simpler than the Electron dual code/filename mapping. `config.language`
 * stores one of these codes.
 */
import ar from './locales/ar.json';
import az from './locales/az.json';
import be from './locales/be.json';
import cs from './locales/cs.json';
import de from './locales/de.json';
import el from './locales/el.json';
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import hu from './locales/hu.json';
import id from './locales/id.json';
import it from './locales/it.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import nl from './locales/nl.json';
import pl from './locales/pl.json';
import pt from './locales/pt.json';
import ro from './locales/ro.json';
import ru from './locales/ru.json';
import sv from './locales/sv.json';
import ta from './locales/ta.json';
import th from './locales/th.json';
import tr from './locales/tr.json';
import uk from './locales/uk.json';
import zh from './locales/zh.json';
import zhHant from './locales/zh-Hant.json';

type Strings = Record<string, string>;

const LOCALES: Record<string, Strings> = {
  en,
  ar,
  az,
  be,
  cs,
  de,
  el,
  es,
  fr,
  hu,
  id,
  it,
  ja,
  ko,
  nl,
  pl,
  pt,
  ro,
  ru,
  sv,
  ta,
  th,
  tr,
  uk,
  zh,
  'zh-Hant': zhHant,
};

/** Display names shown in the language picker (in each language's own script). */
export const LANGUAGES: Record<string, string> = {
  en: 'English',
  ar: 'العربية',
  az: 'Azərbaycanca',
  be: 'Беларуская',
  cs: 'Čeština',
  de: 'Deutsch',
  el: 'Ελληνικά',
  es: 'Español',
  fr: 'Français',
  hu: 'Magyar',
  id: 'Bahasa Indonesia',
  it: 'Italiano',
  ja: '日本語',
  ko: '한국어',
  nl: 'Nederlands',
  pl: 'Polski',
  pt: 'Português',
  ro: 'Română',
  ru: 'Русский',
  sv: 'Svenska',
  ta: 'தமிழ்',
  th: 'ไทย',
  tr: 'Türkçe',
  uk: 'Українська',
  zh: '简体中文',
  'zh-Hant': '繁體中文',
};

let current: Strings = {...en};

/**
 * Pick the best available language for a given code or list of preferred
 * locales (e.g. from the OS). Falls back to English.
 */
export function resolveLanguage(
  preferred: string | string[] | undefined,
): string {
  const list = Array.isArray(preferred) ? preferred : preferred ? [preferred] : [];
  for (const raw of list) {
    if (!raw) {
      continue;
    }
    if (LOCALES[raw]) {
      return raw;
    }
    // Match by primary subtag (e.g. "fr-CA" -> "fr", "zh-Hant-TW" handled first).
    const lower = raw.toLowerCase();
    if (lower.startsWith('zh') && (lower.includes('hant') || lower.includes('tw'))) {
      return 'zh-Hant';
    }
    const primary = raw.split(/[-_]/)[0];
    if (primary && LOCALES[primary]) {
      return primary;
    }
  }
  return 'en';
}

export function setLanguage(code: string): string {
  const resolved = LOCALES[code] ? code : resolveLanguage(code);
  current = {...en, ...LOCALES[resolved]};
  return resolved;
}

/** Translate a key. Unknown keys return the key itself (visible in dev). */
export function t(key: string): string {
  return current[key] ?? key;
}

/**
 * Some strings contain a `[TOKEN]` placeholder (matching the Electron strings).
 * `format('error_port_in_use_description', {PORT: 8080})`.
 */
export function format(key: string, vars: Record<string, string | number>): string {
  let str = t(key);
  for (const [k, v] of Object.entries(vars)) {
    str = str.split(`[${k}]`).join(String(v));
  }
  return str;
}

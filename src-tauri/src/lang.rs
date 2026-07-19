// Language handling, mirroring the logic in the original Electron index.js.
use serde_json::{json, Map, Value};

// The languages offered in the UI dropdown (code -> display name), in order.
// Kept in sync with the `languages` map in the Electron build.
pub const LANGUAGES: &[(&str, &str)] = &[
    ("en", "English"),
    ("ar", "العربية"),
    ("az", "Azərbaycanca"),
    ("de", "Deutsch"),
    ("es", "Español"),
    ("fr_FR", "Français"),
    ("hu", "Magyar"),
    ("it_IT", "Italiano"),
    ("ja", "日本語"),
    ("ko", "한국어"),
    ("nl", "Nederlands"),
    ("pt_PT", "Português"),
    ("ru", "Русский"),
    ("sv", "Svenska"),
    ("ta", "தமிழ்"),
    ("uk", "Українська"),
    ("zh_CN", "简体中文"),
    ("zh_TW", "繁體中文"),
];

// Returns the languages map as a JSON object for the frontend.
pub fn languages_map() -> Value {
    let mut map = Map::new();
    for (code, name) in LANGUAGES {
        map.insert((*code).to_string(), json!(name));
    }
    Value::Object(map)
}

fn is_valid_language(code: &str) -> bool {
    LANGUAGES.iter().any(|(c, _)| *c == code)
}

// The raw JSON contents of each language file, embedded at compile time so we
// don't depend on runtime file paths inside the bundle.
fn raw_lang(code: &str) -> Option<&'static str> {
    Some(match code {
        "en" => include_str!("../../lang/en.json"),
        "ar" => include_str!("../../lang/ar.json"),
        "az" => include_str!("../../lang/az.json"),
        "de" => include_str!("../../lang/de.json"),
        "es" => include_str!("../../lang/es.json"),
        "fr_FR" => include_str!("../../lang/fr.json"),
        "hu" => include_str!("../../lang/hu.json"),
        "it_IT" => include_str!("../../lang/it.json"),
        "ja" => include_str!("../../lang/ja.json"),
        "ko" => include_str!("../../lang/ko.json"),
        "nl" => include_str!("../../lang/nl.json"),
        "pt_PT" => include_str!("../../lang/pt.json"),
        "ru" => include_str!("../../lang/ru.json"),
        "sv" => include_str!("../../lang/sv.json"),
        "ta" => include_str!("../../lang/ta.json"),
        "uk" => include_str!("../../lang/uk.json"),
        "zh_CN" => include_str!("../../lang/zh.json"),
        "zh_TW" => include_str!("../../lang/zh-Hant.json"),
        _ => return None,
    })
}

// Determines the active language: an explicit config.language wins, otherwise
// the first system locale whose prefix matches an offered language, else "en".
pub fn get_language(config: &Value) -> String {
    if let Some(code) = config.get("language").and_then(|v| v.as_str()) {
        if is_valid_language(code) {
            return code.to_string();
        }
    }

    for locale in sys_locale::get_locales() {
        let prefix = locale.split(['-', '_']).next().unwrap_or("");
        if prefix.is_empty() {
            continue;
        }
        for (code, _) in LANGUAGES {
            // Match on the base language, e.g. system "pt-BR" -> offered "pt_PT".
            if code.split('_').next().unwrap_or("") == prefix {
                return (*code).to_string();
            }
        }
    }

    "en".to_string()
}

// Returns the full string table for a language, overlaying it on English so any
// missing keys fall back to the English text.
pub fn get_lang(code: &str) -> Value {
    let en: Value = raw_lang("en")
        .and_then(|s| serde_json::from_str(s).ok())
        .unwrap_or_else(|| json!({}));

    if code == "en" {
        return en;
    }

    let mut merged = en.as_object().cloned().unwrap_or_default();
    if let Some(target) = raw_lang(code).and_then(|s| serde_json::from_str::<Value>(s).ok()) {
        if let Some(obj) = target.as_object() {
            for (k, v) in obj {
                merged.insert(k.clone(), v.clone());
            }
        }
    }
    Value::Object(merged)
}

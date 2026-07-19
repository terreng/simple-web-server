import React from 'react';
import {StyleSheet, Text, type TextStyle} from 'react-native';
import {useTheme} from '../theme/ThemeContext';
import {fontFamily} from '../theme/theme';
import {ServerManager} from '../native/ServerManager';

/**
 * Renders the small HTML subset used by the app's help/description strings:
 * `<br>`, `<code>…</code>`, and `<a href="…">…</a>`. Anything else is treated as
 * plain text. This keeps the translated strings usable verbatim.
 */
type Token =
  | {type: 'text'; text: string}
  | {type: 'code'; text: string}
  | {type: 'link'; text: string; href: string}
  | {type: 'br'};

function tokenize(html: string): Token[] {
  const tokens: Token[] = [];
  const re = /<br\s*\/?>|<code>([\s\S]*?)<\/code>|<a\s+href=['"]([^'"]+)['"]>([\s\S]*?)<\/a>/gi;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    if (m.index > last) {
      tokens.push({type: 'text', text: stripTags(html.slice(last, m.index))});
    }
    if (m[0].toLowerCase().startsWith('<br')) {
      tokens.push({type: 'br'});
    } else if (m[1] !== undefined) {
      tokens.push({type: 'code', text: m[1]});
    } else if (m[2] !== undefined && m[3] !== undefined) {
      tokens.push({type: 'link', href: m[2], text: stripTags(m[3])});
    }
    last = re.lastIndex;
  }
  if (last < html.length) {
    tokens.push({type: 'text', text: stripTags(html.slice(last))});
  }
  return tokens;
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, '');
}

export function RichText({html, style}: {html: string; style?: TextStyle}) {
  const {colors} = useTheme();
  const tokens = tokenize(html);
  return (
    <Text style={[styles.base, {color: colors.textPrimary, fontFamily}, style]}>
      {tokens.map((tok, i) => {
        if (tok.type === 'br') {
          return <Text key={i}>{'\n'}</Text>;
        }
        if (tok.type === 'code') {
          return (
            <Text
              key={i}
              style={[styles.code, {backgroundColor: colors.inlineCodeBackground}]}>
              {tok.text}
            </Text>
          );
        }
        if (tok.type === 'link') {
          return (
            <Text
              key={i}
              style={{color: colors.link}}
              onPress={() => ServerManager.openExternal(tok.href)}>
              {tok.text}
            </Text>
          );
        }
        return <Text key={i}>{tok.text}</Text>;
      })}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {fontSize: 15, lineHeight: 21},
  code: {
    fontFamily: 'Menlo',
    fontSize: 13,
    borderRadius: 3,
    paddingHorizontal: 3,
  },
});

import React, {createContext, useContext, useMemo} from 'react';
import {useColorScheme} from 'react-native';
import type {ThemeSetting} from '../native/types';
import {getTheme, type Theme} from './theme';

const ThemeContext = createContext<Theme>(getTheme(false));

export function ThemeProvider({
  setting,
  children,
}: {
  setting: ThemeSetting;
  children: React.ReactNode;
}) {
  const system = useColorScheme();
  const dark =
    setting === 'dark' || (setting === 'system' && system === 'dark');
  const theme = useMemo(() => getTheme(dark), [dark]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

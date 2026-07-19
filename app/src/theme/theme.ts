/**
 * Theme tokens ported from the Electron app's CSS custom properties, so the RN
 * UI reads as the same product. Light + dark variants; the active one is chosen
 * from the user's "Appearance" setting (system / light / dark).
 *
 * Fonts embrace each platform: San Francisco on macOS, Segoe UI Variable on
 * Windows (both are the OS default when fontFamily is left undefined, but we set
 * them explicitly for weight control).
 */
import {Platform} from 'react-native';

export interface ThemeColors {
  background: string;
  elevated: string;
  inputBackground: string;
  iconHover: string;
  iconActive: string;
  hover: string;
  active: string;
  textPrimary: string;
  textSecondary: string;
  icons: string;
  helpIcons: string;
  line: string;
  button: string;
  buttonText: string;
  buttonHover: string;
  buttonActive: string;
  buttonPrimary: string;
  buttonPrimaryText: string;
  buttonPrimaryHover: string;
  buttonPrimaryActive: string;
  buttonDestructive: string;
  buttonDestructiveText: string;
  buttonDisabled: string;
  buttonDisabledText: string;
  switchOffBk: string;
  switchOffHead: string;
  switchOnBk: string;
  switchOnHead: string;
  inputOutlineFocus: string;
  inputOutlineBlur: string;
  shadow: string;
  link: string;
  linkPrimary: string;
  updateBanner: string;
  updateBannerHigh: string;
  statusBoxBackground: string;
  statusBoxBorder: string;
  statusBoxErrorBackground: string;
  statusBoxErrorBorder: string;
  inputError: string;
  statusGray: string;
  statusGreen: string;
  statusRed: string;
  inlineCodeBackground: string;
}

export const lightColors: ThemeColors = {
  background: '#ffffff',
  elevated: '#ffffff',
  inputBackground: '#ffffff',
  iconHover: '#ebebeb',
  iconActive: '#dedede',
  hover: '#efefef',
  active: '#e6e6e6',
  textPrimary: '#1b1b1b',
  textSecondary: '#808080',
  icons: '#424242',
  helpIcons: '#757575',
  line: '#c3c3c3',
  button: '#d09608',
  buttonText: '#ad7d06',
  buttonHover: '#fff6e2',
  buttonActive: '#ffeabb',
  buttonPrimary: '#d09608',
  buttonPrimaryText: '#ffffff',
  buttonPrimaryHover: '#c18b06',
  buttonPrimaryActive: '#a97904',
  buttonDestructive: '#f44336',
  buttonDestructiveText: '#f44336',
  buttonDisabled: '#a3a3a3',
  buttonDisabledText: '#8d8d8d',
  switchOffBk: '#9E9E9E',
  switchOffHead: '#ececec',
  switchOnBk: '#ffdb83',
  switchOnHead: '#d09608',
  inputOutlineFocus: '#d09608',
  inputOutlineBlur: 'gray',
  shadow: 'rgba(0, 0, 0, 0.3)',
  link: '#0067dc',
  linkPrimary: '#ad7d06',
  updateBanner: '#c5e1a5',
  updateBannerHigh: '#ffe082',
  statusBoxBackground: '#f7f7f7',
  statusBoxBorder: '#d4d4d4',
  statusBoxErrorBackground: '#ffe9e9',
  statusBoxErrorBorder: '#ffafaf',
  inputError: 'red',
  statusGray: 'gray',
  statusGreen: 'green',
  statusRed: 'red',
  inlineCodeBackground: '#e2e2e2',
};

export const darkColors: ThemeColors = {
  background: '#202020',
  elevated: '#2f2f2f',
  inputBackground: '#202020',
  iconHover: 'rgba(255,255,255,0.13)',
  iconActive: 'rgba(255,255,255,0.20)',
  hover: 'rgba(255,255,255,0.07)',
  active: 'rgba(255,255,255,0.12)',
  textPrimary: '#f3f3f3',
  textSecondary: '#9f9f9f',
  icons: '#cdcdcd',
  helpIcons: '#b2b2b2',
  line: '#595959',
  button: '#d09608',
  buttonText: '#e7a70b',
  buttonHover: 'rgba(208,150,8,0.15)',
  buttonActive: 'rgba(208,150,8,0.27)',
  buttonPrimary: '#d09608',
  buttonPrimaryText: '#202020',
  buttonPrimaryHover: '#c18b06',
  buttonPrimaryActive: '#a97904',
  buttonDestructive: '#f44336',
  buttonDestructiveText: '#f44336',
  buttonDisabled: '#8d8d8d',
  buttonDisabledText: '#8d8d8d',
  switchOffBk: '#9E9E9E',
  switchOffHead: '#ececec',
  switchOnBk: '#ffdb83',
  switchOnHead: '#d09608',
  inputOutlineFocus: '#d09608',
  inputOutlineBlur: 'gray',
  shadow: 'rgba(0, 0, 0, 0.3)',
  link: '#3191ff',
  linkPrimary: '#e7a70b',
  updateBanner: '#567137',
  updateBannerHigh: '#95781e',
  statusBoxBackground: '#323232',
  statusBoxBorder: '#606060',
  statusBoxErrorBackground: '#4b2525',
  statusBoxErrorBorder: '#7a3f3f',
  inputError: '#ff6b6b',
  statusGray: '#9f9f9f',
  statusGreen: '#0dcd0d',
  statusRed: '#ff6060',
  inlineCodeBackground: '#3a3a3a',
};

export const fontFamily = Platform.select({
  macos: undefined, // system San Francisco
  windows: 'Segoe UI Variable Text',
  default: undefined,
});

export interface Theme {
  colors: ThemeColors;
  dark: boolean;
}

export function getTheme(dark: boolean): Theme {
  return {colors: dark ? darkColors : lightColors, dark};
}

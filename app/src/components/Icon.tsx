import React from 'react';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import {useTheme} from '../theme/ThemeContext';

/**
 * Thin wrapper over Material Icons (the same icon set the Electron app used via
 * the `material-icons` webfont), defaulting to the theme's icon color.
 */
export function Icon({
  name,
  size = 24,
  color,
}: {
  name: string;
  size?: number;
  color?: string;
}) {
  const {colors} = useTheme();
  return <MaterialIcon name={name} size={size} color={color ?? colors.icons} />;
}

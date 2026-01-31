/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    surface: '#fafafa',
    card: '#fff',
    border: '#eee',
    mutedText: '#666',
    subtleText: '#444',
    chip: '#f7f7f7',
    inputBackground: '#fafafa',
    inputBorder: '#ddd',
    primary: '#111',
    primaryText: '#fff',
    secondary: '#e6e6e6',
    disabled: '#999',
    danger: '#b42318',
    dangerText: '#b42318',
    dangerBorder: '#f2b5b5',
    dangerBackground: '#fff5f5',
    overlay: 'rgba(0, 0, 0, 0.35)',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    surface: '#111113',
    card: '#1c1c1e',
    border: '#2c2c2e',
    mutedText: '#9BA1A6',
    subtleText: '#c7c7cc',
    chip: '#2c2c2e',
    inputBackground: '#1c1c1e',
    inputBorder: '#2c2c2e',
    primary: '#fff',
    primaryText: '#111',
    secondary: '#3a3a3c',
    disabled: '#555',
    danger: '#ff6b6b',
    dangerText: '#ff6b6b',
    dangerBorder: '#6b2b2b',
    dangerBackground: '#3a1f1f',
    overlay: 'rgba(0, 0, 0, 0.6)',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

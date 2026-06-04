import { Platform } from 'react-native';

// Design tokens shared across the UI components.
export const palette = {
  background: '#f8f2e9',
  surface: '#f1e7da',
  card: '#fffdf9',
  ink: '#342a22',
  muted: '#7a6d61',
  line: '#e8ded2',
  green: '#6f7d4d',
  greenSoft: '#ede8d5',
  blue: '#8b6742',
  blueSoft: '#f0dec8',
  gold: '#d5a36f',
  goldSoft: '#f7ead8',
  blush: '#f5dfd1',
  red: '#b45b42',
  graphite: '#5a4632',
};

export const typography = {
  display: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' }),
};

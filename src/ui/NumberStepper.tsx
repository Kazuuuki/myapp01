import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Props = {
  label: string;
  value: number;
  step: number;
  min?: number;
  onChange: (nextValue: number) => void;
};

export function NumberStepper({ label, value, step, min = 0, onChange }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const decrement = () => {
    const next = Math.max(min, value - step);
    onChange(Number(next.toFixed(2)));
  };

  const increment = () => {
    const next = value + step;
    onChange(Number(next.toFixed(2)));
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.mutedText }]}>{label}</Text>
      <View style={styles.controls}>
        <Pressable style={[styles.button, { backgroundColor: colors.secondary }]} onPress={decrement}>
          <Text style={[styles.buttonText, { color: colors.text }]}>-</Text>
        </Pressable>
        <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
        <Pressable style={[styles.button, { backgroundColor: colors.secondary }]} onPress={increment}>
          <Text style={[styles.buttonText, { color: colors.text }]}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    minWidth: 40,
    fontSize: 12,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  button: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  value: {
    minWidth: 42,
    textAlign: 'center',
    fontSize: 14,
  },
});
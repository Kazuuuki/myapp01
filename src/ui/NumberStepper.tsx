import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  label: string;
  value: number;
  step: number;
  min?: number;
  onChange: (nextValue: number) => void;
};

export function NumberStepper({ label, value, step, min = 0, onChange }: Props) {
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
      <Text style={styles.label}>{label}</Text>
      <View style={styles.controls}>
        <Pressable style={styles.button} onPress={decrement}>
          <Text style={styles.buttonText}>-</Text>
        </Pressable>
        <Text style={styles.value}>{value}</Text>
        <Pressable style={styles.button} onPress={increment}>
          <Text style={styles.buttonText}>+</Text>
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
    color: '#666',
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
    backgroundColor: '#e6e6e6',
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

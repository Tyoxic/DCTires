import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

interface Props<T extends string> {
  options: readonly T[];
  value: T | null;
  onChange: (next: T) => void;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function ChipRow<T extends string>({ options, value, onChange, scroll = false, style }: Props<T>) {
  const content = options.map((opt) => {
    const active = value === opt;
    return (
      <TouchableOpacity
        key={opt}
        style={[styles.chip, active && styles.chipActive]}
        onPress={() => onChange(opt)}
        activeOpacity={0.7}
      >
        <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt}</Text>
      </TouchableOpacity>
    );
  });

  if (scroll) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.row, style]}
      >
        {content}
      </ScrollView>
    );
  }
  return <View style={[styles.row, styles.rowWrap, style]}>{content}</View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  rowWrap: { flexWrap: 'wrap' },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, backgroundColor: '#f0f0f0' },
  chipActive: { backgroundColor: '#2196F3' },
  chipText: { fontSize: 13, fontWeight: '500', color: '#555' },
  chipTextActive: { color: '#fff', fontWeight: '700' },
});

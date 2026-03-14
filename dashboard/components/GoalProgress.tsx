import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GOAL } from '../lib/sheets';

const C = {
  card:    '#1A1A1A',
  border:  '#2A2A2A',
  text:    '#FFFFFF',
  muted:   '#9CA3AF',
  green:   '#22C55E',
  track:   '#2A2A2A',
};

interface Props {
  liquidity: number;
}

export function GoalProgress({ liquidity }: Props) {
  const pct       = Math.min((liquidity / GOAL) * 100, 100);
  const remaining = Math.max(GOAL - liquidity, 0);

  return (
    <View style={styles.card}>
      <Text style={styles.label}>2026 Savings Goal</Text>

      <View style={styles.amounts}>
        <Text style={styles.current}>₱{fmt(liquidity)}</Text>
        <Text style={styles.of}>of ₱{fmt(GOAL)}</Text>
      </View>

      {/* Progress track */}
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%` as any }]} />
      </View>

      <View style={styles.footer}>
        <Text style={styles.pct}>{pct.toFixed(1)}% complete</Text>
        <Text style={styles.remaining}>₱{fmt(remaining)} to go</Text>
      </View>
    </View>
  );
}

function fmt(n: number) {
  return n.toLocaleString('en-PH', { maximumFractionDigits: 0 });
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 12,
  },
  label: {
    color: C.muted,
    fontSize: 13,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  amounts: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 14,
  },
  current: {
    color: C.text,
    fontSize: 28,
    fontWeight: '700',
  },
  of: {
    color: C.muted,
    fontSize: 15,
  },
  track: {
    height: 8,
    backgroundColor: C.track,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  fill: {
    height: '100%',
    backgroundColor: C.green,
    borderRadius: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pct: {
    color: C.green,
    fontSize: 13,
    fontWeight: '600',
  },
  remaining: {
    color: C.muted,
    fontSize: 13,
  },
});

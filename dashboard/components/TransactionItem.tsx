import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Transaction } from '../lib/sheets';

const C = {
  border:  '#2A2A2A',
  text:    '#FFFFFF',
  muted:   '#9CA3AF',
  green:   '#22C55E',
  red:     '#EF4444',
  incomeBg:  '#052e16',
  expenseBg: '#2d0a0a',
};

interface Props {
  txn: Transaction;
}

export function TransactionItem({ txn }: Props) {
  const isIncome = txn.type === 'Income';

  return (
    <View style={styles.row}>
      {/* Category badge */}
      <View style={[styles.badge, isIncome ? styles.incomeBadge : styles.expenseBadge]}>
        <Text style={[styles.badgeText, { color: isIncome ? C.green : C.red }]}>
          {txn.category.charAt(0).toUpperCase()}
        </Text>
      </View>

      {/* Details */}
      <View style={styles.details}>
        <Text style={styles.category} numberOfLines={1}>
          {txn.category}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {txn.paymentMethod} · {txn.date}
        </Text>
      </View>

      {/* Amount */}
      <Text style={[styles.amount, { color: isIncome ? C.green : C.red }]}>
        {isIncome ? '+' : '-'}₱{fmt(txn.amount)}
      </Text>
    </View>
  );
}

function fmt(n: number) {
  return n.toLocaleString('en-PH', { maximumFractionDigits: 0 });
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e1e',
    gap: 12,
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  incomeBadge:  { backgroundColor: C.incomeBg },
  expenseBadge: { backgroundColor: C.expenseBg },
  badgeText: {
    fontSize: 16,
    fontWeight: '700',
  },
  details: {
    flex: 1,
  },
  category: {
    color: C.text,
    fontSize: 14,
    fontWeight: '500',
  },
  meta: {
    color: C.muted,
    fontSize: 12,
    marginTop: 2,
  },
  amount: {
    fontSize: 14,
    fontWeight: '600',
  },
});

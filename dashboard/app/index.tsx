/**
 * Summary screen — the only screen in the app.
 *
 * Fetches data from Google Sheets on mount and every time the app comes
 * back to the foreground (AppState 'active'). Pull-to-refresh also works.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
  AppStateStatus,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoalProgress }     from '../components/GoalProgress';
import { TransactionItem }  from '../components/TransactionItem';
import { fetchSummary, FinancialSummary } from '../lib/sheets';

const C = {
  bg:     '#0D0D0D',
  card:   '#1A1A1A',
  border: '#2A2A2A',
  text:   '#FFFFFF',
  muted:  '#9CA3AF',
  green:  '#22C55E',
  red:    '#EF4444',
};

export default function SummaryScreen() {
  const [data, setData]       = useState<FinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const summary = await fetchSummary();
      setData(summary);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => { load(); }, [load]);

  // Refresh whenever the app comes to the foreground
  const appState = useRef<AppStateStatus>(AppState.currentState);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (appState.current.match(/inactive|background/) && next === 'active') {
        load();
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, [load]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={load}
            tintColor={C.green}
          />
        }
      >
        {error && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* ── Goal progress ── */}
        <GoalProgress liquidity={data?.totalLiquidity ?? 0} />

        {/* ── Stats row ── */}
        <View style={styles.statsRow}>
          <StatCard
            label="Liquidity"
            value={data?.totalLiquidity ?? 0}
            color={C.text}
          />
          <StatCard
            label="Income"
            value={data?.totalIncome ?? 0}
            color={C.green}
            prefix="+"
          />
          <StatCard
            label="Expenses"
            value={data?.totalExpenses ?? 0}
            color={C.red}
            prefix="-"
          />
        </View>

        {/* ── Account balances ── */}
        <SectionHeader title="Accounts" />
        <View style={styles.card}>
          {(data?.accounts ?? []).length === 0 ? (
            <Text style={styles.empty}>No accounts yet.</Text>
          ) : (
            data!.accounts.map((a, i) => (
              <View
                key={a.account}
                style={[
                  styles.accountRow,
                  i < data!.accounts.length - 1 && styles.accountBorder,
                ]}
              >
                <Text style={styles.accountName}>{a.account}</Text>
                <Text style={styles.accountBalance}>
                  ₱{fmt(a.balance)}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* ── Recent transactions ── */}
        <SectionHeader title="Recent Transactions" />
        <View style={styles.card}>
          {(data?.recentTransactions ?? []).length === 0 ? (
            <Text style={styles.empty}>No transactions yet.</Text>
          ) : (
            data!.recentTransactions.map((txn, i) => (
              <TransactionItem key={`${txn.date}-${i}`} txn={txn} />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  color,
  prefix = '',
}: {
  label: string;
  value: number;
  color: string;
  prefix?: string;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>
        {prefix}₱{fmt(value)}
      </Text>
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString('en-PH', { maximumFractionDigits: 0 });
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },

  // Error
  errorCard: {
    backgroundColor: '#2d0a0a',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#5c1a1a',
  },
  errorText: {
    color: C.red,
    fontSize: 13,
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  statLabel: {
    color: C.muted,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
  },

  // Section header
  sectionHeader: {
    color: C.muted,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
    marginTop: 8,
  },

  // Generic card
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 12,
  },

  // Account rows
  accountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 13,
  },
  accountBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e1e',
  },
  accountName: {
    color: C.text,
    fontSize: 14,
  },
  accountBalance: {
    color: C.text,
    fontSize: 14,
    fontWeight: '600',
  },

  // Empty state
  empty: {
    color: C.muted,
    fontSize: 13,
    paddingVertical: 16,
    textAlign: 'center',
  },
});

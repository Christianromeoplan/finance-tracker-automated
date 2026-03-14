/**
 * Google Sheets API v4 client.
 *
 * Reads Transactions and Accounts sheets, returning a typed FinancialSummary.
 * All network calls share a single cached access token from lib/auth.ts.
 */

import { getAccessToken } from './auth';
import serviceAccount from '../config/service-account.json';

const SHEET_ID = process.env.EXPO_PUBLIC_GOOGLE_SHEETS_ID!;
const BASE_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values`;
export const GOAL = 3_000_000; // ₱3,000,000 by Dec 31, 2026

export interface Transaction {
  date: string;
  type: 'Income' | 'Expense';
  amount: number;
  category: string;
  paymentMethod: string;
  notes: string;
}

export interface AccountBalance {
  account: string;
  balance: number;
}

export interface FinancialSummary {
  accounts: AccountBalance[];
  totalLiquidity: number;
  totalIncome: number;
  totalExpenses: number;
  recentTransactions: Transaction[];
}

async function fetchRange(range: string, token: string): Promise<string[][]> {
  const url = `${BASE_URL}/${encodeURIComponent(range)}?majorDimension=ROWS`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Sheets API error (${resp.status}): ${body}`);
  }
  const data = await resp.json();
  return (data.values ?? []) as string[][];
}

export async function fetchSummary(): Promise<FinancialSummary> {
  const token = await getAccessToken(serviceAccount);

  // Fetch both sheets in parallel
  const [txnRows, accountRows] = await Promise.all([
    fetchRange('Transactions!A2:F', token),
    fetchRange('Accounts!A2:B', token),
  ]);

  const transactions: Transaction[] = txnRows
    .filter((row) => row.length >= 3 && row[2])
    .map((row) => ({
      date:          row[0] ?? '',
      type:          (row[1] as 'Income' | 'Expense') ?? 'Expense',
      amount:        parseFloat(row[2]) || 0,
      category:      row[3] ?? '',
      paymentMethod: row[4] ?? '',
      notes:         row[5] ?? '',
    }));

  const accounts: AccountBalance[] = accountRows
    .filter((row) => row.length >= 2 && row[1])
    .map((row) => ({
      account: row[0],
      balance: parseFloat(row[1]) || 0,
    }));

  const totalLiquidity = accounts.reduce((sum, a) => sum + a.balance, 0);
  const totalIncome    = transactions
    .filter((t) => t.type === 'Income')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses  = transactions
    .filter((t) => t.type === 'Expense')
    .reduce((sum, t) => sum + t.amount, 0);

  // Most recent 20 transactions, newest first
  const recentTransactions = [...transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 20);

  return { accounts, totalLiquidity, totalIncome, totalExpenses, recentTransactions };
}

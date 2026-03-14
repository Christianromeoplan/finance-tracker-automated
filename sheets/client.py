"""
Google Sheets client — handles all read/write operations.

Sheet layout inside the configured spreadsheet:
  - "Transactions": Date | Type | Amount | Category | Payment Method | Notes
  - "Accounts":     Account | Balance | Last Updated
"""

import os
from datetime import datetime

import gspread
from google.oauth2.service_account import Credentials

_SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]

_TXN_HEADERS     = ["Date", "Type", "Amount", "Category", "Payment Method", "Notes"]
_ACCOUNT_HEADERS = ["Account", "Balance", "Last Updated"]

GOAL = 3_000_000  # ₱3,000,000 savings target by end of 2026


class SheetsClient:
    def __init__(self):
        creds = Credentials.from_service_account_file(
            os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON"), scopes=_SCOPES
        )
        gc = gspread.authorize(creds)
        self.spreadsheet = gc.open_by_key(os.getenv("GOOGLE_SHEETS_ID"))
        self._ensure_sheets()

    # ------------------------------------------------------------------ #
    # Internal helpers
    # ------------------------------------------------------------------ #

    def _get_or_create_sheet(self, name: str, headers: list) -> gspread.Worksheet:
        """Return the named worksheet, creating it with headers if absent."""
        try:
            return self.spreadsheet.worksheet(name)
        except gspread.WorksheetNotFound:
            ws = self.spreadsheet.add_worksheet(title=name, rows=1000, cols=len(headers))
            ws.append_row(headers)
            return ws

    def _ensure_sheets(self):
        self._get_or_create_sheet("Transactions", _TXN_HEADERS)
        self._get_or_create_sheet("Accounts", _ACCOUNT_HEADERS)

    # ------------------------------------------------------------------ #
    # Transactions
    # ------------------------------------------------------------------ #

    def log_transaction(self, txn: dict) -> None:
        """Append one transaction row to the Transactions sheet."""
        ws = self.spreadsheet.worksheet("Transactions")
        ws.append_row([
            txn["date"],
            txn["type"],
            txn["amount"],
            txn["category"],
            txn["payment_method"],
            txn["notes"],
        ])

    def get_income_expense_totals(self) -> tuple[float, float]:
        """Return (total_income, total_expenses) summed from all transaction rows."""
        records = self.spreadsheet.worksheet("Transactions").get_all_records()
        income   = sum(float(r["Amount"]) for r in records if r["Type"] == "Income")
        expenses = sum(float(r["Amount"]) for r in records if r["Type"] == "Expense")
        return income, expenses

    # ------------------------------------------------------------------ #
    # Accounts
    # ------------------------------------------------------------------ #

    def update_account(self, account: str, balance: float) -> None:
        """Upsert an account balance row (match by account name, case-insensitive)."""
        ws = self.spreadsheet.worksheet("Accounts")
        records = ws.get_all_records()
        now = datetime.now().strftime("%Y-%m-%d %H:%M")

        for i, row in enumerate(records):
            if row["Account"].strip().lower() == account.strip().lower():
                sheet_row = i + 2  # +1 for header, +1 for 1-based index
                ws.update(f"B{sheet_row}:C{sheet_row}", [[balance, now]])
                return

        # Account not found — add a new row
        ws.append_row([account.strip(), balance, now])

    def get_account_balances(self) -> list[dict]:
        """Return all rows from the Accounts sheet as a list of dicts."""
        return self.spreadsheet.worksheet("Accounts").get_all_records()

    def get_total_liquidity(self) -> float:
        """Sum all account balances."""
        records = self.get_account_balances()
        return sum(float(r["Balance"]) for r in records if r["Balance"] != "")

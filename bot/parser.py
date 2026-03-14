"""
Transaction parser — converts natural language messages into structured dicts.

Supported formats:
  Expense: spent/paid/bought/expense <amount> [on|for] <category> [via <method>]
  Income:  received/got/earned/income <amount> <category> [via|from <method>]

Examples:
  "spent 500 on groceries via gcash"
  "paid 1,500 for electricity"
  "received 50000 salary via BDO"
  "got 5000 freelance from PayPal"
"""

import re
from datetime import datetime

# Keyword groups
_EXPENSE = r"(?:spent|paid|bought|expense|expensed|purchased|withdrew)"
_INCOME  = r"(?:received|got|earned|income|deposited|added|credited)"
_VIA     = r"(?:via|through|using|with|from)"
_AMOUNT  = r"([\d,]+(?:\.\d{1,2})?)"   # captures "1,500" or "500.50"

# Full patterns (case-insensitive)
_EXPENSE_RE = re.compile(
    rf"^{_EXPENSE}\s+(?:php\s*)?{_AMOUNT}\s+(?:on|for)?\s*(.+?)(?:\s+{_VIA}\s+(.+))?$",
    re.IGNORECASE,
)
_INCOME_RE = re.compile(
    rf"^{_INCOME}\s+(?:php\s*)?{_AMOUNT}\s+(.+?)(?:\s+{_VIA}\s+(.+))?$",
    re.IGNORECASE,
)


def parse_transaction(text: str) -> dict | None:
    """
    Parse a natural language string into a transaction dict.

    Returns a dict with keys: date, type, amount, category, payment_method, notes.
    Returns None if the text doesn't match any known pattern.
    """
    text = text.strip()

    match = _EXPENSE_RE.match(text) or _INCOME_RE.match(text)
    if not match:
        return None

    txn_type = "Expense" if _EXPENSE_RE.match(text) else "Income"
    raw_amount, category, method = match.groups()

    return {
        "date":           datetime.now().strftime("%Y-%m-%d"),
        "type":           txn_type,
        "amount":         float(raw_amount.replace(",", "")),
        "category":       category.strip().title(),
        "payment_method": method.strip().title() if method else "Unspecified",
        "notes":          text,
    }

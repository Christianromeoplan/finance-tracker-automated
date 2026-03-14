"""
Finance Tracker — Telegram Bot

Entry point. Run from the project root:
  python -m bot.main

Handles:
  /start    — welcome message
  /accounts — update account balances (multi-line input)
  /status   — full financial snapshot vs ₱3M goal
  text msg  — log a transaction in natural language
  voice msg — transcribe with Whisper, then log like a text message
"""

import logging
import os

from dotenv import load_dotenv
from telegram import Update
from telegram.ext import (
    Application,
    CommandHandler,
    ConversationHandler,
    MessageHandler,
    ContextTypes,
    filters,
)

from bot.parser import parse_transaction
from bot.transcriber import transcribe
from sheets.client import SheetsClient, GOAL

load_dotenv()

logging.basicConfig(
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)

# Conversation state
AWAITING_BALANCES = 1

# Initialized once at startup (avoids re-authing on every message)
sheets: SheetsClient = None


# ------------------------------------------------------------------ #
# Helpers
# ------------------------------------------------------------------ #

def _liquidity_line(liquidity: float) -> str:
    progress = (liquidity / GOAL) * 100
    return f"💰 Total liquidity: ₱{liquidity:,.2f}  ({progress:.1f}% of ₱3M goal)"


# ------------------------------------------------------------------ #
# Handlers
# ------------------------------------------------------------------ #

async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(
        "Hey Christian! Finance tracker ready.\n\n"
        "Log a transaction:\n"
        "  spent 500 on groceries via gcash\n"
        "  received 50000 salary via BDO\n"
        "  paid 1500 for electricity\n\n"
        "Commands:\n"
        "  /accounts — update account balances\n"
        "  /status   — full financial snapshot\n"
        "  /cancel   — cancel current operation"
    )


async def handle_transaction(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Parse and log a natural language transaction, then confirm with a liquidity snapshot."""
    text = update.message.text
    txn = parse_transaction(text)

    if txn is None:
        await update.message.reply_text(
            "Couldn't parse that. Try:\n"
            "  spent <amount> on <category> via <method>\n"
            "  received <amount> <category> via <method>"
        )
        return

    sheets.log_transaction(txn)
    liquidity = sheets.get_total_liquidity()

    await update.message.reply_text(
        f"✅ Logged {txn['type'].lower()}: ₱{txn['amount']:,.2f} — "
        f"{txn['category']} ({txn['payment_method']})\n"
        f"{_liquidity_line(liquidity)}"
    )


async def handle_voice(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Download a Telegram voice message, transcribe it, then log it like a text transaction."""
    import tempfile, os

    await update.message.reply_text("🎙 Transcribing...")

    # Download the .ogg voice file to a temp path
    voice_file = await context.bot.get_file(update.message.voice.file_id)
    with tempfile.NamedTemporaryFile(suffix=".ogg", delete=False) as tmp:
        tmp_path = tmp.name
    await voice_file.download_to_drive(tmp_path)

    try:
        text = transcribe(tmp_path)
    finally:
        os.unlink(tmp_path)  # always clean up, even if transcription fails

    if not text:
        await update.message.reply_text("Couldn't transcribe the audio. Please try again.")
        return

    txn = parse_transaction(text)

    if txn is None:
        await update.message.reply_text(
            f'Transcribed: "{text}"\n\n'
            "Couldn't parse a transaction from that. Try:\n"
            "  spent <amount> on <category> via <method>\n"
            "  received <amount> <category> via <method>"
        )
        return

    sheets.log_transaction(txn)
    liquidity = sheets.get_total_liquidity()

    await update.message.reply_text(
        f'🎙 Heard: "{text}"\n\n'
        f"✅ Logged {txn['type'].lower()}: ₱{txn['amount']:,.2f} — "
        f"{txn['category']} ({txn['payment_method']})\n"
        f"{_liquidity_line(liquidity)}"
    )


async def cmd_accounts_start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Step 1: prompt the user to send balances in name: amount format."""
    await update.message.reply_text(
        "Send your current account balances, one per line:\n\n"
        "BDO: 50000\n"
        "BPI: 30000\n"
        "GCash: 5000\n"
        "Cash: 2000\n"
        "Investments: 100000\n\n"
        "Any account name works. Send /cancel to abort."
    )
    return AWAITING_BALANCES


async def cmd_accounts_receive(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    """Step 2: parse the multi-line balance input and upsert each account."""
    lines = update.message.text.strip().splitlines()
    saved, errors = [], []

    for line in lines:
        if ":" not in line:
            errors.append(line.strip())
            continue
        account, _, raw = line.partition(":")
        try:
            balance = float(raw.replace(",", "").strip())
            sheets.update_account(account.strip(), balance)
            saved.append(f"  {account.strip()}: ₱{balance:,.2f}")
        except ValueError:
            errors.append(line.strip())

    msg = "✅ Balances saved:\n" + "\n".join(saved) if saved else "No balances were saved."

    if errors:
        msg += f"\n\n⚠️ Couldn't parse: {', '.join(errors)}"

    liquidity = sheets.get_total_liquidity()
    msg += f"\n\n{_liquidity_line(liquidity)}"

    await update.message.reply_text(msg)
    return ConversationHandler.END


async def cmd_cancel(update: Update, context: ContextTypes.DEFAULT_TYPE) -> int:
    await update.message.reply_text("Cancelled.")
    return ConversationHandler.END


async def cmd_status(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Return a full financial snapshot: balances, income/expense totals, goal progress."""
    balances         = sheets.get_account_balances()
    income, expenses = sheets.get_income_expense_totals()
    liquidity        = sheets.get_total_liquidity()
    remaining        = GOAL - liquidity
    progress         = (liquidity / GOAL) * 100

    balance_lines = "\n".join(
        f"  {r['Account']}: ₱{float(r['Balance']):,.2f}"
        for r in balances
        if r["Balance"] != ""
    ) or "  (no accounts on record)"

    await update.message.reply_text(
        f"📊 Financial Snapshot\n"
        f"{'─' * 30}\n"
        f"Accounts:\n{balance_lines}\n\n"
        f"💰 Total liquidity:  ₱{liquidity:,.2f}\n"
        f"📈 Income to date:   ₱{income:,.2f}\n"
        f"📉 Expenses to date: ₱{expenses:,.2f}\n"
        f"📊 Net (txns):       ₱{income - expenses:,.2f}\n\n"
        f"🎯 Goal: ₱{GOAL:,.0f} by Dec 31, 2026\n"
        f"   Progress:      {progress:.1f}%\n"
        f"   Still needed:  ₱{remaining:,.2f}"
    )


# ------------------------------------------------------------------ #
# Main
# ------------------------------------------------------------------ #

def main():
    global sheets
    sheets = SheetsClient()

    app = Application.builder().token(os.getenv("TELEGRAM_BOT_TOKEN")).build()

    # /accounts uses a two-step ConversationHandler
    accounts_conv = ConversationHandler(
        entry_points=[CommandHandler("accounts", cmd_accounts_start)],
        states={
            AWAITING_BALANCES: [
                MessageHandler(filters.TEXT & ~filters.COMMAND, cmd_accounts_receive)
            ],
        },
        fallbacks=[CommandHandler("cancel", cmd_cancel)],
    )

    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CommandHandler("status", cmd_status))
    app.add_handler(accounts_conv)
    app.add_handler(MessageHandler(filters.VOICE, handle_voice))
    # Catch-all text handler — must be registered last
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_transaction))

    logger.info("Bot polling...")
    app.run_polling()


if __name__ == "__main__":
    main()

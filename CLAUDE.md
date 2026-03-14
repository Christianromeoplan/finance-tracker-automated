# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A personal finance tracker with a Telegram bot interface, Google Sheets as the database, and a mobile dashboard for visualizations. The goal is not expense policing — it's financial path-finding. Given Christian's current income, expenses, and investments, the system should always be able to answer: "How do I realistically hit ₱3,000,000 by end of 2026?"

## Financial Goal

**Target: ₱3,000,000 by December 31, 2026.**

This is the north star. Every feature, calculation, and projection should be framed against progress toward this goal.

## Architecture
```
finance-tracker/
├── bot/          # Telegram bot — handles text and voice messages
├── sheets/       # Google Sheets integration — read/write transactions
├── dashboard/    # Mobile app — spending trends, income vs expenses, goal progress
└── config/       # Credentials and environment config
```

### Data Flow
1. User sends text or voice message to Telegram bot
2. Bot transcribes voice (if needed) and parses the entry (amount, category, type)
3. Entry is written to Google Sheets
4. Bot replies with confirmation + updated projection toward ₱3M goal
5. Dashboard reads from Google Sheets to render charts and goal progress

## Stack

| Layer | Technology |
|-------|-----------|
| Bot interface | Python + `python-telegram-bot` |
| Voice transcription | Whisper (OpenAI) |
| Database | Google Sheets via `gspread` |
| Dashboard | Mobile app (TBD — React Native or Flutter) |

## Key Integrations

- **Telegram Bot API** — message handling, voice file downloads
- **Google Sheets API** — service account auth via `gspread` + `google-auth`
- **Voice-to-text** — Whisper to transcribe voice notes into structured entries

## Environment Variables
```
TELEGRAM_BOT_TOKEN=
GOOGLE_SHEETS_ID=
GOOGLE_SERVICE_ACCOUNT_JSON=config/service-account.json
```

## Running the Bot

```bash
source .venv/bin/activate
python -m bot.main
```

## Notes

- Claude API is out of scope for this project — analysis and projections are math-based, not AI-generated
- Christian is a data scientist — keep code clean, well-commented, and logic transparent
- No alerts or policing — surface projections and let Christian make his own calls
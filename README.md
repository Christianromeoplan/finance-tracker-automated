# Finance Tracker

A personal finance system built around one question: **"How do I realistically hit ₱3,000,000 by December 31, 2026?"**

Log income and expenses by texting (or voice-messaging) a Telegram bot. Every entry is stored in Google Sheets and reflected instantly on a mobile dashboard showing spending trends, account balances, and progress toward the ₱3M goal.

---

## How it works

1. Send a text or voice message to the Telegram bot — e.g., *"spent 500 on groceries via GCash"*
2. The bot parses (and transcribes, if voice) the entry and logs it to Google Sheets
3. The bot replies with a confirmation and your updated progress toward ₱3M
4. Open the mobile dashboard any time to see charts, balances, and goal tracking

### Bot commands

| Command | Description |
|---------|-------------|
| `/start` | Welcome message and usage guide |
| `/accounts` | Update account balances (BDO, GCash, investments, etc.) |
| `/status` | Full financial snapshot — balances, income, expenses, goal progress |
| `/cancel` | Cancel an in-progress operation |

### Transaction format

```
spent 500 on groceries via gcash
received 50000 salary via BDO
paid 1500 for electricity
```

---

## Architecture

```
finance-tracker/
├── bot/           # Telegram bot — text and voice message handling
│   ├── main.py        # Entry point, command and message handlers
│   ├── parser.py      # Natural language → structured transaction
│   └── transcriber.py # Whisper voice-to-text
├── sheets/        # Google Sheets integration
│   └── client.py      # Read/write transactions, balances, goal math
├── dashboard/     # React Native (Expo) mobile app
│   ├── app/           # Expo Router screens
│   ├── components/    # GoalProgress, TransactionItem, etc.
│   └── lib/           # Sheets API client for the frontend
└── config/        # Service account credentials (gitignored)
```

| Layer | Technology |
|-------|------------|
| Bot interface | Python + `python-telegram-bot` |
| Voice transcription | `faster-whisper` (runs locally) |
| Database | Google Sheets via `gspread` |
| Dashboard | React Native + Expo (Expo Router) |

---

## Prerequisites

Install these before starting:

- **Python 3.11+** — [python.org](https://www.python.org/downloads/)
- **Node.js 18+** — [nodejs.org](https://nodejs.org/)
- **ffmpeg** — required by Whisper for audio processing
  ```bash
  # macOS
  brew install ffmpeg

  # Ubuntu/Debian
  sudo apt install ffmpeg
  ```
- **Expo CLI**
  ```bash
  npm install -g expo-cli
  ```
- **Expo Go app** on your phone — available on the App Store and Google Play

---

## Setup

### 1. Clone and install dependencies

```bash
git clone <your-repo-url>
cd finance-tracker

# Python (bot + sheets)
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Dashboard
cd dashboard
npm install
cd ..
```

---

### 2. Create a Telegram bot

1. Open Telegram and search for **@BotFather**
2. Send `/newbot` and follow the prompts (choose a name and username)
3. BotFather will give you a token that looks like `123456789:ABCdef...`
4. Copy that token — you'll need it for the `.env` file

---

### 3. Set up Google Cloud

#### Create a project and enable APIs

1. Go to [console.cloud.google.com](https://console.cloud.google.com/)
2. Click the project dropdown at the top → **New Project** → give it a name → **Create**
3. In the left sidebar, go to **APIs & Services → Library**
4. Search for and enable both:
   - **Google Sheets API**
   - **Google Drive API**

#### Create a service account

1. Go to **APIs & Services → Credentials**
2. Click **Create Credentials → Service Account**
3. Fill in a name (e.g., `finance-tracker`) → **Create and Continue** → **Done**
4. Click the service account you just created → **Keys** tab → **Add Key → Create new key → JSON**
5. A `.json` file will download — this is your service account key
6. Move it into the project:
   ```bash
   mv ~/Downloads/your-key-file.json config/service-account.json
   ```
7. Copy the `client_email` field from the JSON — you'll need it in the next step

---

### 4. Create the Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com/) and create a new spreadsheet
2. Name it something like `Finance Tracker`
3. Share the sheet with your service account email (the `client_email` from the JSON):
   - Click **Share** in the top right
   - Paste the service account email
   - Set role to **Editor** → **Send**
4. Copy the Sheet ID from the URL:
   ```
   https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID_HERE/edit
   ```

The sheet needs two tabs (the bot will populate data, but create these tabs manually first):

| Tab name | Purpose |
|----------|---------|
| `Transactions` | Income and expense log |
| `Accounts` | Account balances (BDO, GCash, etc.) |

---

### 5. Configure environment variables

Create a `.env` file in the project root:

```env
TELEGRAM_BOT_TOKEN=your-telegram-bot-token-here
GOOGLE_SHEETS_ID=your-google-sheet-id-here
GOOGLE_SERVICE_ACCOUNT_JSON=config/service-account.json
```

Create a `.env` file inside `dashboard/`:

```env
EXPO_PUBLIC_GOOGLE_SHEETS_ID=your-google-sheet-id-here
```

> Never commit these files. They are already listed in `.gitignore`.

---

## Running the bot

```bash
source .venv/bin/activate
python -m bot.main
```

The bot will start polling for messages. Keep this terminal open while using it. To stop, press `Ctrl+C`.

---

## Running the dashboard

```bash
cd dashboard
npx expo start
```

Scan the QR code with the **Expo Go** app on your phone. The dashboard reads directly from Google Sheets using the same service account.

---

## Project folder structure

```
finance-tracker/
├── bot/
│   ├── __init__.py
│   ├── main.py          # Bot entry point
│   ├── parser.py        # Natural language parser
│   └── transcriber.py   # Whisper transcription
├── sheets/
│   ├── __init__.py
│   └── client.py        # SheetsClient — all read/write logic
├── dashboard/
│   ├── app/
│   │   ├── _layout.tsx  # Root layout
│   │   └── index.tsx    # Main screen
│   ├── components/
│   │   ├── GoalProgress.tsx
│   │   └── TransactionItem.tsx
│   ├── lib/
│   │   ├── auth.ts      # Google auth for frontend
│   │   └── sheets.ts    # Sheets API calls
│   ├── app.json
│   ├── babel.config.js
│   ├── package.json
│   └── tsconfig.json
├── config/
│   └── service-account.json   # gitignored — do not commit
├── .env                        # gitignored — do not commit
├── requirements.txt
└── CLAUDE.md
```

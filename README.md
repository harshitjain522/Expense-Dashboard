# Spent

A personal expense tracker for Android and iOS, built with Expo. Log what you spend and earn, set a monthly budget, see where the money goes, and pull transactions straight out of your bank SMS alerts. Everything stays on your device.

## Features

- **Dashboard.** Spent, income and net for the month, what's left of your budget, a category breakdown, and a six-month spending trend. Step back through previous months.
- **History.** Every transaction, filterable by date range (last 7 / 30 days, this month, all time) and category, with a search over notes. Swipe a row to edit or delete it.
- **Income and expenses.** 12 expense and 7 income categories, with payment methods: Cash, Card, UPI, Bank Transfer, Other.
- **Recurring transactions.** Weekly, monthly or yearly rules (rent, salary, subscriptions) that add their entries on schedule. If the app was closed for a while, missed entries are added the next time it opens.
- **SMS import (Android).** Scans the last 90 days of bank and UPI alerts, suggests transactions, and adds only the ones you pick. OTPs, balance updates, declines, bill reminders and promos are skipped, and a message can't be imported twice.
- **Multi-currency display.** INR, USD, EUR, GBP, JPY, AUD, CAD and AED. Amounts are stored in INR and converted at live rates for display, so switching currency never rewrites your records.
- **Backup and restore.** Export everything to a JSON file and restore from it later, or export transactions as CSV.
- **Biometric lock.** Optional fingerprint / Face ID lock that re-engages whenever the app goes to the background, with the device passcode as a fallback.
- **Light and dark themes.** Follow the system setting or pick one.

## Tech stack

| | |
|---|---|
| Framework | [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/), React Native 0.86, React 19.2 |
| Navigation | Expo Router (file-based), top tabs rendered at the bottom |
| Styling | NativeWind 4 (Tailwind CSS) with themed CSS variables |
| Charts | react-native-gifted-charts |
| Storage | AsyncStorage |
| Native | A local Expo module (`modules/sms-inbox`) in Kotlin for reading the SMS inbox |
| Language | TypeScript |

## Getting started

### Prerequisites

- Node.js LTS
- For Android: Android Studio with an emulator or a USB-connected device, and JDK 17
- For iOS: macOS with Xcode

### Install and run

```bash
git clone https://github.com/harshitjain522/Expense-Dashboard.git
cd Expense-Dashboard
npm install
npm run android   # or: npm run ios
```

`npm run android` generates the native project, builds a development build, and installs it. The first build takes a while; after that, JavaScript changes reload instantly through `npm start`.

SMS import uses a native module, so it needs a development build. It isn't available in Expo Go or on iOS. There the option is simply hidden.

## Scripts

| Command | What it does |
|---|---|
| `npm start` | Start the Metro dev server |
| `npm run android` | Build and run on Android |
| `npm run ios` | Build and run on iOS |
| `npm run test:format` | Currency formatting and conversion checks |
| `npm run test:parser` | SMS parser checks against sample bank alerts |
| `npm run test:backup` | Backup validation checks |

Type-check with `npx tsc --noEmit`.

## Project structure

```
app/                  Screens (Expo Router)
  (tabs)/             Dashboard and History tabs
  transaction/[id]    Add / edit a transaction
  recurring.tsx       Recurring rules
  import-sms.tsx      SMS import
  settings.tsx        Budget, currency, theme, lock, backup
components/           Shared UI (transaction row, chart, pickers)
context/              Finance, theme and lock state
constants/            Categories, currencies, colour palettes
modules/sms-inbox/    Local native module for reading SMS (Android)
utils/                Formatting, SMS parsing, backup, CSV export, storage
types/                Shared TypeScript types
```

## Privacy

- All data lives in the app's local storage on your device. There is no account, server or analytics.
- The only network call fetches exchange rates from [open.er-api.com](https://open.er-api.com) when you use a currency other than INR.
- SMS messages are read and parsed on the device and never leave it. The SMS permission is only asked for from the import screen, when you choose to allow it.

## License

MIT. See [LICENSE](LICENSE).

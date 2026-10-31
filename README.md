# Galaxus price tracker

Watches one product page and emails you when its price drops below a limit you set.

Currently watching: [Kingston NV3 1000 GB](https://www.galaxus.ch/de/s1/product/kingston-nv3-1000-gb-m2-2280-ssd-47484382), limit **CHF 100**.

## How it works

- Every `CHECK_INTERVAL_MINUTES` (default 60) it loads the product page in your installed Chrome (headless) — Galaxus blocks plain HTTP requests from scripts, so a real browser is needed.
- The price is read from the page's schema.org product data, so it does not depend on CSS class names.
- When the price is below your limit, it sends a Gmail message with the old price, the new price and the link.
- You only get **one** email per price level: no new mail while the price stays the same or goes back up, and a new mail only if it drops even further.

Each check is appended to `.data/state.json`, which keeps the price history and remembers what it already emailed you about.

## Setup (once)

1. Requirements: Node 20.6+ and Google Chrome or Microsoft Edge installed.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Create your config:

   ```bash
   cp .env.example .env
   ```

   Then edit `.env` and fill in `GMAIL_USER`, `GMAIL_APP_PASSWORD` and `NOTIFY_TO`.

   `GMAIL_APP_PASSWORD` is **not** your normal Google password. Turn on 2-Step Verification, then create an app password under
   Google Account → Security → App passwords (https://myaccount.google.com/apppasswords) and paste the 16 characters.

4. Check that Gmail sending works:

   ```bash
   npm run test-email
   ```

## Run it

```bash
npm start
```

It checks immediately, then keeps running in the background of that terminal. Stop it with `Ctrl+C`.

A check looks like this:

```
[14:02:11] Checking https://www.galaxus.ch/de/s1/product/kingston-nv3-1000-gb-m2-2280-ssd-47484382
[14:02:19] NV3: CHF 149.00 (limit CHF 100.00) - CHF 149 is not below CHF 100
```

When the price finally drops, the same line says `price dropped below CHF 100` and the email arrives.

To run a single check instead of a loop:

```bash
npm run once
```

## Automatic checking (Task Scheduler)

Two Windows scheduled tasks run a single check per day without any open terminal:

| Task | Time |
| --- | --- |
| `GalaxusPriceTracker_0600` | daily at 06:00 |
| `GalaxusPriceTracker_2045` | daily at 20:45 |

Both wake the PC from sleep if possible and run the missed check when the PC becomes available again.

Handy commands:

```bat
schtasks /query /tn "GalaxusPriceTracker_0600" /fo LIST /v        rem last run time and result
schtasks /run /tn "GalaxusPriceTracker_0600"                      rem trigger a check manually
schtasks /delete /tn "GalaxusPriceTracker_2030" /f                rem remove one
```

They execute `run-check.bat` in this folder. If the folder moves, update the task's action via `taskschd.msc` and re-create them.

## Watch a different product or limit

Everything is set in `.env`:

| Variable | Default |
| --- | --- |
| `PRODUCT_URL` | the Kingston NV3 link above |
| `PRICE_THRESHOLD_CHF` | `100` |
| `CHECK_INTERVAL_MINUTES` | `60` |
| `NOTIFY_TO` | same as `GMAIL_USER` |

Any Galaxus or Digitec product URL works. The tracker uses one product per `.env`; for several products, run several copies.

## Tests

```bash
npm test
```

Covers the "should this send an email" rules only — the email send itself needs your Gmail credentials, which is what `npm run test-email` is for.

## Troubleshooting

- `Could not find price data on the page` — Galaxus changed its markup or served a bot-check page. Open the URL in your browser, and try `BROWSER_CHANNEL=chrome` (or `msedge`) in `.env`.
- `Invalid login` / `535` from Gmail — you are using your account password instead of a 16-character app password, or 2FA is off.
- `npm install` fails with an SSL/cipher error — this project ships an `.npmrc` with `maxsockets=1`, which works around a Node/npm TLS issue on some machines.

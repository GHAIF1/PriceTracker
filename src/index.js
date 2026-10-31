import { config, emailConfigProblem } from './config.js';
import { decideNotification } from './decide.js';
import { sendDropEmail, sendTestEmail } from './notify.js';
import { fetchProductPrice } from './price.js';
import { appendHistory, readState, writeState } from './state.js';

const args = new Set(process.argv.slice(2));
const chf = new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF' });

function log(message) {
  const time = new Date().toLocaleTimeString('de-CH', { timeZone: 'Europe/Zurich' });
  console.log(`[${time}] ${message}`);
}

let running = false;
let lastFailed = false;

async function check() {
  if (running) {
    log('Previous check is still running, skipping this one.');
    return true;
  }
  running = true;

  try {
    log(`Checking ${config.productUrl}`);
    const product = await fetchProductPrice(config.productUrl);
    const state = await readState(config.stateFile);

    const previousPrice = state.lastCheck?.price ?? null;
    const lastNotifiedPrice = state.lastNotified?.price ?? null;
    const decision = decideNotification({
      price: product.price,
      threshold: config.thresholdChf,
      lastNotifiedPrice,
    });

    log(
      `${product.productName ?? 'Product'}: ${chf.format(product.price)} ` +
        `(limit ${chf.format(config.thresholdChf)}) - ${decision.reason}`,
    );

    let notified = state.lastNotified;
    if (decision.notify) {
      if (emailConfigProblem()) {
        log(`Wanted to email but ${emailConfigProblem()}. See .env.example.`);
      } else {
        try {
          const messageId = await sendDropEmail({
            productName: product.productName ?? 'Watched product',
            price: product.price,
            previousPrice,
            threshold: config.thresholdChf,
            url: product.url,
            availability: product.availability,
            at: product.checkedAt,
          });
          notified = { price: product.price, at: product.checkedAt };
          log(`Email sent to ${config.notifyTo} (${messageId}).`);
        } catch (error) {
          log(`Email failed: ${error.message}`);
        }
      }
    }

    await writeState(config.stateFile, {
      productUrl: config.productUrl,
      thresholdChf: config.thresholdChf,
      lastCheck: {
        price: product.price,
        currency: product.currency,
        availability: product.availability,
        at: product.checkedAt,
      },
      lastNotified: notified,
      history: appendHistory(state, { at: product.checkedAt, price: product.price }),
    });

    lastFailed = false;
    return true;
  } catch (error) {
    lastFailed = true;
    log(`Check failed: ${error.message}`);
    return false;
  } finally {
    running = false;
  }
}

async function main() {
  if (args.has('--test-email')) {
    const problem = emailConfigProblem();
    if (problem) {
      console.error(`${problem}. Copy .env.example to .env and fill it in.`);
      process.exit(1);
    }
    try {
      const id = await sendTestEmail();
      console.log(`Test email sent to ${config.notifyTo} (${id}).`);
      return;
    } catch (error) {
      console.error(`Could not send test email: ${error.message}`);
      process.exit(1);
    }
  }

  if (args.has('--once')) {
    const ok = await check();
    process.exit(ok ? 0 : 1);
  }

  const intervalMs = Math.max(1, config.intervalMinutes) * 60_000;
  log(
    `Watching ${config.productUrl} for prices below ${chf.format(config.thresholdChf)}, ` +
      `every ${config.intervalMinutes} minute(s). Press Ctrl+C to stop.`,
  );
  if (emailConfigProblem()) {
    log(`Heads up: ${emailConfigProblem()}, so price drops will only be logged, not emailed.`);
  }

  await check();
  const timer = setInterval(() => {
    void check();
  }, intervalMs);

  const stop = () => {
    clearInterval(timer);
    log('Stopped.');
    process.exit(lastFailed ? 1 : 0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

await main();

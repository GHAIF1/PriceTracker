const DEFAULTS = {
  PRODUCT_URL:
    'https://www.galaxus.ch/de/s1/product/kingston-nv3-1000-gb-m2-2280-ssd-47484382',
  PRICE_THRESHOLD_CHF: '100',
  CHECK_INTERVAL_MINUTES: '60',
};

function num(value, fallback, name) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${name} must be a number, got "${value}"`);
  }
  return parsed;
}

export const config = {
  productUrl: process.env.PRODUCT_URL?.trim() || DEFAULTS.PRODUCT_URL,
  thresholdChf: num(
    process.env.PRICE_THRESHOLD_CHF || DEFAULTS.PRICE_THRESHOLD_CHF,
    DEFAULTS.PRICE_THRESHOLD_CHF,
    'PRICE_THRESHOLD_CHF',
  ),
  intervalMinutes: num(
    process.env.CHECK_INTERVAL_MINUTES || DEFAULTS.CHECK_INTERVAL_MINUTES,
    DEFAULTS.CHECK_INTERVAL_MINUTES,
    'CHECK_INTERVAL_MINUTES',
  ),
  stateFile: process.env.STATE_FILE?.trim() || '.data/state.json',
  gmailUser: process.env.GMAIL_USER?.trim() || '',
  gmailAppPassword: (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, ''),
  notifyTo: process.env.NOTIFY_TO?.trim() || process.env.GMAIL_USER?.trim() || '',
};

export function emailConfigProblem() {
  if (!config.gmailUser) return 'GMAIL_USER is not set';
  if (!config.gmailAppPassword) return 'GMAIL_APP_PASSWORD is not set';
  if (!config.notifyTo) return 'NOTIFY_TO is not set';
  return null;
}

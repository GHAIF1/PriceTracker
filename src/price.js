import { chromium } from 'playwright-core';

const DEFAULT_TIMEOUT_MS = 45_000;

/**
 * Loads a Galaxus/Digitec product page in a real headless browser and reads the
 * price from the page's schema.org JSON-LD block. Plain HTTP requests are
 * rejected by their bot protection, so a browser is required.
 */
export async function fetchProductPrice(url, options = {}) {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const browser = await launchBrowser();

  try {
    const userAgent = buildUserAgent(browser.version());
    const context = await browser.newContext({
      locale: 'de-CH',
      timezoneId: 'Europe/Zurich',
      userAgent,
      viewport: { width: 1366, height: 900 },
      extraHTTPHeaders: { 'accept-language': 'de-CH,de,en;q=0.8' },
    });

    // Make the automated browser look like a normal one.
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    // Images, fonts and video are not needed for the price and only slow the page down.
    await context.route('**/*', (route) => {
      const type = route.request().resourceType();
      return type === 'image' || type === 'font' || type === 'media'
        ? route.abort()
        : route.continue();
    });

    const page = await context.newPage();
    const response = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: timeoutMs,
    });

    if (response && !response.ok()) {
      throw new Error(`Product page returned HTTP ${response.status()}`);
    }

    const product = await readProductJsonLd(page, timeoutMs);
    if (!product) {
      throw new Error(
        'Could not find price data on the page. Galaxus may have changed its markup or served a bot-check page.',
      );
    }

    return {
      productName: product.name,
      price: product.price,
      currency: product.currency,
      availability: product.availability,
      inStock: product.availability
        ? product.availability.endsWith('InStock')
        : null,
      url,
      checkedAt: new Date().toISOString(),
    };
  } finally {
    await browser.close();
  }
}

async function launchBrowser() {
  const channels = process.env.BROWSER_CHANNEL
    ? [process.env.BROWSER_CHANNEL]
    : ['chrome', 'msedge'];

  let lastError;
  for (const channel of channels) {
    try {
      return await chromium.launch({
        channel,
        headless: true,
        args: ['--disable-blink-features=AutomationControlled'],
      });
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    `No usable Chrome or Edge browser found. Install Google Chrome, or set BROWSER_CHANNEL. Last error: ${lastError?.message}`,
  );
}

function buildUserAgent(version) {
  const major = String(version).split('.')[0] || '140';
  return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${major}.0.0.0 Safari/537.36`;
}

async function readProductJsonLd(page, timeoutMs) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const product = await page.evaluate(() => {
      const blocks = [...document.querySelectorAll('script[type="application/ld+json"]')];
      for (const block of blocks) {
        let data;
        try {
          data = JSON.parse(block.textContent);
        } catch {
          continue;
        }
        const candidates = Array.isArray(data) ? data : [data];
        for (const entry of candidates) {
          if (entry?.['@type'] !== 'Product') continue;
          const offers = Array.isArray(entry.offers) ? entry.offers[0] : entry.offers;
          if (!offers) continue;
          const price = Number.parseFloat(offers.price ?? offers.lowPrice);
          return {
            name: entry.name ?? null,
            price: Number.isFinite(price) ? price : null,
            currency: offers.priceCurrency ?? 'CHF',
            availability: offers.availability ?? null,
          };
        }
      }
      return null;
    });

    if (product && product.price !== null) return product;
    await page.waitForTimeout(500);
  }

  return null;
}

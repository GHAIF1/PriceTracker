import nodemailer from 'nodemailer';
import { config } from './config.js';

const chf = new Intl.NumberFormat('de-CH', {
  style: 'currency',
  currency: 'CHF',
});

export function createTransport() {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: config.gmailUser, pass: config.gmailAppPassword },
  });
}

export async function verifyTransport(transport) {
  await transport.verify();
}

/**
 * Sends the price-drop email. Returns the message id reported by Gmail.
 */
export async function sendDropEmail({ productName, price, previousPrice, threshold, url, availability, at }) {
  const transport = createTransport();
  const subject = `Price drop: ${productName} is now ${chf.format(price)} (limit ${chf.format(threshold)})`;
  const checked = new Date(at).toLocaleString('de-CH', { timeZone: 'Europe/Zurich' });

  const lines = [
    `${productName} is now ${chf.format(price)}.`,
    '',
    `Your limit:  ${chf.format(threshold)}`,
    previousPrice != null ? `Was:         ${chf.format(previousPrice)}` : null,
    availability ? `Stock:       ${availability.replace('https://schema.org/', '')}` : null,
    `Checked:     ${checked}`,
    '',
    url,
    '',
    'You get another message only if the price drops below this one and stays under your limit.',
  ].filter((line) => line !== null);

  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f4f5f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:28px;border:1px solid #e6e8ec">
    <p style="margin:0 0 6px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#0a7d33;font-weight:600">Price drop</p>
    <h1 style="margin:0 0 4px;font-size:20px;line-height:1.35">${escapeHtml(productName)}</h1>
    <p style="margin:0 0 18px;font-size:32px;font-weight:700">${chf.format(price)}</p>
    <table style="width:100%;font-size:14px;border-collapse:collapse">
      <tr><td style="padding:6px 0;color:#5b616e">Your limit</td><td style="padding:6px 0;text-align:right;font-weight:600">${chf.format(threshold)}</td></tr>
      ${previousPrice != null ? `<tr><td style="padding:6px 0;color:#5b616e">Previous price</td><td style="padding:6px 0;text-align:right">${chf.format(previousPrice)}</td></tr>` : ''}
      ${availability ? `<tr><td style="padding:6px 0;color:#5b616e">Stock</td><td style="padding:6px 0;text-align:right">${escapeHtml(availability.replace('https://schema.org/', ''))}</td></tr>` : ''}
      <tr><td style="padding:6px 0;color:#5b616e">Checked</td><td style="padding:6px 0;text-align:right">${escapeHtml(checked)}</td></tr>
    </table>
    <p style="margin:24px 0 0">
      <a href="${escapeHtml(url)}" style="display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;font-size:14px">Open product page</a>
    </p>
    <p style="margin:20px 0 0;font-size:12px;color:#8b909b">Sent by your local price tracker. You get another message only if the price drops further.</p>
  </div>
</body></html>`;

  const info = await transport.sendMail({
    from: `Price Tracker <${config.gmailUser}>`,
    to: config.notifyTo,
    subject,
    text: lines.join('\n'),
    html,
  });

  transport.close();
  return info.messageId;
}

export async function sendTestEmail() {
  const transport = createTransport();
  await transport.verify();
  const info = await transport.sendMail({
    from: `Price Tracker <${config.gmailUser}>`,
    to: config.notifyTo,
    subject: 'Price tracker test message',
    text: `Your Gmail setup works.\n\nThis tracker will email ${config.notifyTo} when the watched product drops below CHF ${config.thresholdChf}.`,
    html: `<p>Your Gmail setup works.</p><p>This tracker will email <strong>${escapeHtml(config.notifyTo)}</strong> when the watched product drops below <strong>CHF ${config.thresholdChf}</strong>.</p>`,
  });
  transport.close();
  return info.messageId;
}

function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
  );
}

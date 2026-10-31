/**
 * Pure decision logic: should this check trigger an email?
 *
 * The tracker emails when the price is below the threshold and either it has
 * never emailed before, or the price fell further than the last price it
 * emailed about. That way a price that sits below the threshold does not
 * produce one message per check.
 */
export function decideNotification({ price, threshold, lastNotifiedPrice }) {
  if (price == null || !Number.isFinite(price)) {
    return { notify: false, reason: 'no price found' };
  }
  if (!(price < threshold)) {
    return { notify: false, reason: `CHF ${price} is not below CHF ${threshold}` };
  }
  if (lastNotifiedPrice != null && price >= lastNotifiedPrice) {
    return {
      notify: false,
      reason: `already emailed at CHF ${lastNotifiedPrice}, price has not dropped further`,
    };
  }
  return {
    notify: true,
    reason:
      lastNotifiedPrice == null
        ? `price dropped below CHF ${threshold}`
        : `price dropped further (CHF ${lastNotifiedPrice} -> CHF ${price})`,
  };
}

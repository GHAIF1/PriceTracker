import assert from 'node:assert/strict';
import test from 'node:test';

import { decideNotification } from '../src/decide.js';

const threshold = 100;

test('does not notify while the price is at or above the threshold', () => {
  assert.equal(decideNotification({ price: 149, threshold, lastNotifiedPrice: null }).notify, false);
  assert.equal(decideNotification({ price: 100, threshold, lastNotifiedPrice: null }).notify, false);
});

test('notifies when the price first drops below the threshold', () => {
  const result = decideNotification({ price: 99.9, threshold, lastNotifiedPrice: null });
  assert.equal(result.notify, true);
});

test('does not repeat the email for the same price', () => {
  const result = decideNotification({ price: 89, threshold, lastNotifiedPrice: 89 });
  assert.equal(result.notify, false);
});

test('notifies again when the price drops further', () => {
  const result = decideNotification({ price: 79, threshold, lastNotifiedPrice: 89 });
  assert.equal(result.notify, true);
});

test('does not notify when the price rises but stays under the threshold', () => {
  const result = decideNotification({ price: 95, threshold, lastNotifiedPrice: 89 });
  assert.equal(result.notify, false);
});

test('ignores checks where no price was found', () => {
  assert.equal(decideNotification({ price: null, threshold, lastNotifiedPrice: null }).notify, false);
  assert.equal(decideNotification({ price: NaN, threshold, lastNotifiedPrice: null }).notify, false);
});

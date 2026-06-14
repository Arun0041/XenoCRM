/**
 * Outcome Simulator — realistic per-channel delivery simulation
 *
 * Each channel has different delivery/engagement rates based on industry benchmarks.
 * Returns an ordered array of events that will occur for this message.
 *
 * Event lifecycle: delivered → opened → read → clicked
 * Failed messages get no further events.
 */

const OUTCOMES = {
  whatsapp: { delivered: 0.92, failed: 0.05, opened: 0.78, read: 0.65, clicked: 0.22 },
  sms:      { delivered: 0.88, failed: 0.08, opened: 0.45, read: 0.40, clicked: 0.08 },
  email:    { delivered: 0.85, failed: 0.12, opened: 0.35, read: 0.28, clicked: 0.12 },
  rcs:      { delivered: 0.90, failed: 0.06, opened: 0.60, read: 0.55, clicked: 0.18 },
};

function simulateOutcome(channel) {
  const rates = OUTCOMES[channel] || OUTCOMES.whatsapp;
  const rand = Math.random();

  // Failed messages — no further events
  if (rand < rates.failed) return ['failed'];

  // Successful delivery, then engagement funnel
  const events = ['delivered'];
  if (Math.random() < rates.opened) events.push('opened');
  if (events.includes('opened') && Math.random() < rates.read) events.push('read');
  if (events.includes('read') && Math.random() < rates.clicked) events.push('clicked');

  return events;
}

/**
 * Calculate staggered delay for callbacks
 * First callbacks arrive quickly (0.5-3s), later ones are spaced further
 */
function getDelay(index) {
  const base = Math.random() * 2500 + 500;
  return base + (index % 10) * 200;
}

module.exports = { simulateOutcome, getDelay, OUTCOMES };

/**
 * Channel Stub — Send Route
 * POST /send
 *
 * Accepts a message, responds immediately (simulating async accept),
 * then asynchronously simulates delivery lifecycle and calls back the CRM.
 *
 * This mirrors real-world messaging providers (Twilio, Gupshup, etc.)
 * which accept messages and POST status updates asynchronously.
 */
const express = require('express');
const router = express.Router();
const { simulateOutcome, getDelay } = require('../simulator/outcomeSimulator');
const { callbackWithRetry, sleep } = require('../simulator/callbackEngine');
const callbackQueue = require('../queue/callbackQueue');

router.post('/send', (req, res) => {
  const {
    messageLogId,
    recipientAddress,
    personalizedMessage,
    channel,
    campaignId,
    idempotencyKey,
    callbackUrl,
  } = req.body;

  if (!messageLogId || !callbackUrl || !idempotencyKey) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Acknowledge immediately — simulate async acceptance
  res.json({ accepted: true, messageLogId });

  // Simulate async delivery lifecycle in the background
  setImmediate(async () => {
    const events = simulateOutcome(channel || 'whatsapp');
    let delay = getDelay(Math.floor(Math.random() * 50));

    for (const eventStatus of events) {
      await sleep(delay);

      // Use the callback queue to limit concurrent outbound requests
      await callbackQueue.add(() =>
        callbackWithRetry(callbackUrl, {
          idempotencyKey,
          messageLogId,
          campaignId,
          status: eventStatus,
          channel,
          timestamp: new Date().toISOString(),
        })
      );

      // Subsequent events spaced 1-4s apart
      delay = Math.random() * 3000 + 1000;
    }
  });
});

module.exports = router;

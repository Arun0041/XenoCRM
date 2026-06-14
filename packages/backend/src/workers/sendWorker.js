/**
 * BullMQ Send Worker
 * Processes campaign-sends queue — POSTs each message to the channel stub,
 * updates status to 'sent', and pushes SSE stats.
 *
 * Design decisions:
 * - concurrency: 10 — process 10 messages simultaneously
 * - 3 retries with exponential backoff (2s, 4s, 8s)
 * - After 3 failures, job is dead-lettered and recipient marked 'failed'
 * - Worker receives the final personalized message (personalization happens before enqueue)
 */
const { Worker } = require('bullmq');
const axios = require('axios');
const { updateMessageLogStatus, getCampaignStats } = require('../db/queries/messageLogs');
const { incrementCampaignStat } = require('../db/queries/campaigns');
const sseManager = require('../services/sseManager');
const { checkAndFinalizeCampaign } = require('../services/campaignService');

let worker = null;

function startSendWorker(redisConnection) {
  worker = new Worker('campaign-sends', async (job) => {
    const {
      messageLogId,
      recipientAddress,
      personalizedMessage,
      channel,
      campaignId,
      idempotencyKey,
    } = job.data;

    const channelStubUrl = process.env.CHANNEL_STUB_URL || 'http://localhost:3002';
    const crmApiUrl = process.env.CRM_API_URL || 'http://localhost:3001';

    // POST to channel stub service
    const response = await axios.post(`${channelStubUrl}/send`, {
      messageLogId,
      recipientAddress,
      personalizedMessage,
      channel,
      campaignId,
      idempotencyKey,
      callbackUrl: `${crmApiUrl}/api/webhooks/receipt`,
    }, { timeout: 10000 });

    // Update message log status to 'sent'
    await updateMessageLogStatus(idempotencyKey, 'sent', 'sent_at');

    // Increment campaign aggregate stat
    await incrementCampaignStat(campaignId, 'sent');

    // Push updated stats to SSE clients
    // Push updated stats to SSE clients
    const stats = await getCampaignStats(campaignId);
    sseManager.pushStats(campaignId, stats);

    await checkAndFinalizeCampaign(campaignId);

    return { accepted: response.data.accepted };
  }, {
    connection: redisConnection,
    concurrency: 10,
  });

  // Handle permanent failures (after all retries exhausted)
  worker.on('failed', async (job, err) => {
    if (!job) return;
    const { idempotencyKey, campaignId } = job.data;

    console.error(`❌ Job failed permanently: ${idempotencyKey}`, err.message);

    try {
      await updateMessageLogStatus(idempotencyKey, 'failed', 'failed_at');
      await incrementCampaignStat(campaignId, 'failed');

      const stats = await getCampaignStats(campaignId);
      sseManager.pushStats(campaignId, stats);

      await checkAndFinalizeCampaign(campaignId);
    } catch (updateErr) {
      console.error('Failed to update failed status:', updateErr.message);
    }
  });

  worker.on('error', (err) => {
    console.error('Worker error:', err.message);
  });

  worker.on('completed', (job) => {
    // Job completed successfully — no action needed
  });

  return worker;
}

module.exports = { startSendWorker };

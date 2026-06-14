/**
 * Webhook routes — receives delivery callbacks from channel stub
 * POST /api/webhooks/receipt
 *
 * Idempotency guarantees:
 * 1. Forward-only status transitions (SQL ARRAY_POSITION check)
 * 2. Duplicate event recording (ON CONFLICT DO NOTHING)
 * 3. Same callback with same status = no-op, returns 200
 */
const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const {
  updateMessageLogStatus,
  recordMessageEvent,
  getMessageLogByIdempotencyKey,
  getCampaignStats,
} = require('../db/queries/messageLogs');
const { incrementCampaignStat, updateCampaignStatus } = require('../db/queries/campaigns');
const { checkAndFinalizeCampaign } = require('../services/campaignService');
const sseManager = require('../services/sseManager');

router.post('/receipt', asyncHandler(async (req, res) => {
  const { idempotencyKey, status, messageLogId, campaignId } = req.body;

  if (!idempotencyKey || !status) {
    return res.status(400).json({ error: 'idempotencyKey and status are required' });
  }

  // Map status to timestamp column
  const timestampMap = {
    delivered: 'delivered_at',
    failed: 'failed_at',
    opened: 'opened_at',
    read: 'read_at',
    clicked: 'clicked_at',
  };

  const timestampField = timestampMap[status];

  // Forward-only status update (SQL handles ordering)
  const updated = await updateMessageLogStatus(idempotencyKey, status, timestampField);

  if (updated) {
    // Record event (idempotent — ON CONFLICT DO NOTHING)
    await recordMessageEvent(updated.id, status);

    // Update campaign aggregate stats
    await incrementCampaignStat(updated.campaign_id, status);

    // Push live stats to SSE clients
    const stats = await getCampaignStats(updated.campaign_id);
    sseManager.pushStats(updated.campaign_id, stats);

    // Check if campaign is complete
    await checkAndFinalizeCampaign(updated.campaign_id);
  }

  // Always return 200 — idempotent endpoint
  res.json({ received: true, updated: !!updated });
}));



module.exports = router;

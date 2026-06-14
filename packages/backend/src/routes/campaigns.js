/**
 * Campaign routes
 * GET  /api/campaigns           — List all campaigns
 * POST /api/campaigns           — Create campaign
 * GET  /api/campaigns/:id       — Get campaign with stats
 * POST /api/campaigns/:id/send  — Dispatch campaign (enqueue jobs)
 * GET  /api/campaigns/:id/logs  — Message logs (paginated)
 */
const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const {
  getAllCampaigns,
  getCampaignById,
  createCampaign,
  getRecentCampaigns,
} = require('../db/queries/campaigns');
const { getCampaignLogs, getCampaignStats } = require('../db/queries/messageLogs');
const { dispatchCampaign } = require('../services/campaignService');

// List all campaigns
router.get('/', asyncHandler(async (req, res) => {
  const campaigns = await getAllCampaigns(req.user.id);
  res.json(campaigns);
}));

// Get recent campaigns (for dashboard)
router.get('/recent', asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 5;
  const campaigns = await getRecentCampaigns(req.user.id, limit);
  res.json(campaigns);
}));

// Create campaign
router.post('/', asyncHandler(async (req, res) => {
  const { name, segment_id, channel, message_template, scheduled_at } = req.body;
  if (!name || !segment_id || !channel || !message_template) {
    return res.status(400).json({ error: 'Name, segment_id, channel, and message_template are required' });
  }
  const campaign = await createCampaign(req.body, req.user.id);
  res.status(201).json(campaign);
}));

// Get campaign detail with live stats
router.get('/:id', asyncHandler(async (req, res) => {
  const campaign = await getCampaignById(req.params.id, req.user.id);
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

  // Augment with live stats from message_logs if campaign has been sent
  if (campaign.status !== 'draft') {
    const liveStats = await getCampaignStats(campaign.id);
    campaign.live_stats = liveStats;
  }

  res.json(campaign);
}));

// Dispatch campaign — enqueue all messages
router.post('/:id/send', asyncHandler(async (req, res) => {
  const result = await dispatchCampaign(req.params.id, req.user.id);
  res.json({ message: 'Campaign queued for delivery', ...result });
}));

// Get message logs (paginated)
router.get('/:id/logs', asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const logs = await getCampaignLogs(req.params.id, page, limit);
  res.json(logs);
}));

module.exports = router;

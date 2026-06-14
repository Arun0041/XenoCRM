const express = require('express');
const router = express.Router();
const aiService = require('../services/aiService');

router.post('/draft-message', async (req, res) => {
  const { segmentDescription, segment_description, channel, tone } = req.body;
  // frontend sends segment_description, fix provided uses segmentDescription, support both
  const description = segmentDescription || segment_description;
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');
  res.flushHeaders();
  await aiService.streamDraftMessage(description, channel, tone || 'friendly', res);
});

router.post('/insight', async (req, res) => {
  const { stats, segmentName, segment_name, channel } = req.body;
  const name = segmentName || segment_name;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');
  res.flushHeaders();
  await aiService.streamCampaignInsight(stats, name, channel, res);
});

module.exports = router;

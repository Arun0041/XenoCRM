/**
 * SSE (Server-Sent Events) route
 * GET /api/campaigns/:id/stream
 *
 * Opens a persistent connection for real-time campaign delivery stats.
 * Frontend connects via EventSource — no polling needed.
 */
const express = require('express');
const router = express.Router();
const sseManager = require('../services/sseManager');
const { getCampaignStats } = require('../db/queries/messageLogs');
const jwt = require('jsonwebtoken');

router.get('/campaigns/:id/stream', async (req, res) => {
  const { id } = req.params;
  const token = req.query.token;

  if (!token) return res.status(401).end();
  try {
    jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).end();
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');
  res.setHeader('X-Accel-Buffering', 'no'); // prevent nginx buffering SSE
  res.flushHeaders();


  sseManager.addClient(id, res);

  // Send current stats immediately on connect
  try {
    const stats = await getCampaignStats(id);
    res.write(`data: ${JSON.stringify(stats)}\n\n`);
  } catch (e) {
    console.error('SSE initial stats error:', e.message);
  }

  // Keepalive ping every 25s to prevent proxy timeout
  const keepalive = setInterval(() => {
    res.write(': ping\n\n');
  }, 25000);

  req.on('close', () => {
    clearInterval(keepalive);
    sseManager.removeClient(id, res);
  });
});

module.exports = router;

/**
 * Segment routes
 * GET  /api/segments              — List all segments
 * POST /api/segments              — Create segment
 * GET  /api/segments/:id/customers — Preview customers in segment
 * POST /api/segments/ai-resolve   — AI: natural language → filters + matching customers
 */
const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const { getAllSegments, createSegment, getCustomersInSegment } = require('../db/queries/segments');
const { getCustomersByFilters } = require('../db/queries/customers');
const aiService = require('../services/aiService');

// List all segments
router.get('/', asyncHandler(async (req, res) => {
  const segments = await getAllSegments(req.user.id);
  res.json(segments);
}));

// Create segment
router.post('/', asyncHandler(async (req, res) => {
  const { name, description, filters, ai_prompt } = req.body;
  if (!name || !filters) {
    return res.status(400).json({ error: 'Name and filters are required' });
  }

  // Count customers matching this filter
  const customers = await getCustomersByFilters(filters, req.user.id);
  const segment = await createSegment(name, description, filters, ai_prompt, customers.length, req.user.id);
  res.status(201).json(segment);
}));

// Preview customers in a segment
router.get('/:id/customers', asyncHandler(async (req, res) => {
  const customers = await getCustomersInSegment(req.params.id, req.user.id);
  res.json({ customers, count: customers.length });
}));

// AI segment resolution — NL prompt → filters → matching customers
router.post('/ai-resolve', asyncHandler(async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const filters = await aiService.promptToFilters(prompt);
  const customers = await getCustomersByFilters(filters, req.user.id);

  res.json({
    filters,
    customers: customers.slice(0, 20), // Preview first 20
    count: customers.length,
  });
}));

// Preview filters without saving
router.post('/preview', asyncHandler(async (req, res) => {
  const { filters } = req.body;
  if (!filters) {
    return res.status(400).json({ error: 'Filters are required' });
  }
  const customers = await getCustomersByFilters(filters, req.user.id);
  res.json({ customers: customers.slice(0, 20), count: customers.length });
}));

module.exports = router;
